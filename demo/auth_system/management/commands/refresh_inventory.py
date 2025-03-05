from django.core.management.base import BaseCommand
from django.db import transaction
from auth_system.models import Transaction, Inventory, InventoryExpense
from decimal import Decimal

class Command(BaseCommand):
    help = 'Refreshes inventory data from stock transactions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all inventory data before refreshing',
        )
        parser.add_argument(
            '--customer',
            type=int,
            help='Refresh inventory only for a specific customer ID',
        )
        parser.add_argument(
            '--quality-type',
            type=str,
            help='Refresh inventory only for a specific quality type',
        )
        parser.add_argument(
            '--reapply-expenses',
            action='store_true',
            help='Reapply expenses after refreshing inventory',
        )

    def handle(self, *args, **options):
        clear_data = options['clear']
        customer_id = options['customer']
        quality_type = options['quality_type']
        reapply_expenses = options['reapply_expenses']

        with transaction.atomic():
            # Store expenses if we're going to reapply them
            expenses_to_reapply = []
            if reapply_expenses and clear_data:
                expenses_to_reapply = self.backup_expenses(customer_id, quality_type)
            
            # Clear existing inventory data if requested
            if clear_data:
                self.clear_inventory_data(customer_id, quality_type)
            
            # Refresh inventory data from stock transactions
            self.refresh_inventory_data(customer_id, quality_type)
            
            # Reapply expenses if requested
            if reapply_expenses and expenses_to_reapply:
                self.reapply_expenses(expenses_to_reapply)

    def backup_expenses(self, customer_id=None, quality_type=None):
        """
        Backup expenses before clearing inventory data
        """
        # Build query filters
        expense_filters = {}
        
        if customer_id:
            expense_filters['inventory__customer_id'] = customer_id
            
        if quality_type:
            expense_filters['inventory__quality_type'] = quality_type
        
        # Get all expenses matching the filters
        expenses = InventoryExpense.objects.filter(**expense_filters).order_by('created_at')
        
        # Create a list of expense data to reapply later
        expense_data = []
        for expense in expenses:
            expense_data.append({
                'customer_id': expense.inventory.customer_id,
                'quality_type': expense.inventory.quality_type,
                'weight_loss': expense.weight_loss,
                'expenditure': expense.expenditure,
                'notes': expense.notes,
                'is_processing': expense.is_processing,
                'created_by': expense.created_by
            })
        
        self.stdout.write(f"Backed up {len(expense_data)} expenses for reapplication")
        return expense_data

    def clear_inventory_data(self, customer_id=None, quality_type=None):
        """
        Clear inventory data based on filters
        """
        # Build query filters
        expense_filters = {}
        inventory_filters = {}
        
        if customer_id:
            inventory_filters['customer_id'] = customer_id
            expense_filters['inventory__customer_id'] = customer_id
            
        if quality_type:
            inventory_filters['quality_type'] = quality_type
            expense_filters['inventory__quality_type'] = quality_type
        
        # Delete expenses first (due to foreign key constraints)
        expenses_count = InventoryExpense.objects.filter(**expense_filters).count()
        InventoryExpense.objects.filter(**expense_filters).delete()
        
        # Delete inventory items
        inventory_count = Inventory.objects.filter(**inventory_filters).count()
        Inventory.objects.filter(**inventory_filters).delete()
        
        self.stdout.write(self.style.SUCCESS(
            f"Cleared {expenses_count} expense records and {inventory_count} inventory items"
        ))

    def refresh_inventory_data(self, customer_id=None, quality_type=None):
        """
        Refresh inventory data from stock transactions
        """
        # Build query filters for transactions
        transaction_filters = {'transaction_type': 'stock'}
        
        if customer_id:
            transaction_filters['customer_id'] = customer_id
            
        if quality_type:
            transaction_filters['quality_type'] = quality_type
        
        # Get all relevant stock transactions
        stock_transactions = Transaction.objects.filter(**transaction_filters)
        
        self.stdout.write(f"Found {stock_transactions.count()} stock transactions to process")
        
        # Group transactions by customer and quality_type
        inventory_data = {}
        
        for transaction in stock_transactions:
            if not transaction.quality_type or transaction.quantity is None:
                continue
                
            key = (transaction.customer_id, transaction.quality_type)
            
            if key not in inventory_data:
                inventory_data[key] = {
                    'quantity': Decimal('0'),
                    'total_cost': Decimal('0'),
                    'created_by': transaction.created_by or 'system'
                }
            
            # Add transaction quantity and cost to inventory
            inventory_data[key]['quantity'] += Decimal(str(transaction.quantity))
            inventory_data[key]['total_cost'] += Decimal(str(transaction.total))
        
        # Create or update inventory items
        created_count = 0
        updated_count = 0
        
        for (customer_id, quality_type), data in inventory_data.items():
            # Calculate average cost
            avg_cost = Decimal('0')
            if data['quantity'] > Decimal('0'):
                avg_cost = data['total_cost'] / data['quantity']
            
            # Try to get existing inventory item
            inventory_item, created = Inventory.objects.get_or_create(
                customer_id=customer_id,
                quality_type=quality_type,
                defaults={
                    'quantity': data['quantity'],
                    'total_cost': data['total_cost'],
                    'avg_cost': avg_cost,
                    'created_by': data['created_by']
                }
            )
            
            if created:
                created_count += 1
            else:
                # Update existing inventory item
                inventory_item.quantity = data['quantity']
                inventory_item.total_cost = data['total_cost']
                inventory_item.avg_cost = avg_cost
                inventory_item.save()
                updated_count += 1
        
        self.stdout.write(self.style.SUCCESS(
            f"Created {created_count} and updated {updated_count} inventory items from stock transactions"
        ))

    def reapply_expenses(self, expense_data):
        """
        Reapply expenses to inventory items
        """
        applied_count = 0
        skipped_count = 0
        
        for expense in expense_data:
            try:
                # Get the inventory item
                inventory_item = Inventory.objects.get(
                    customer_id=expense['customer_id'],
                    quality_type=expense['quality_type']
                )
                
                # Store old values
                old_quantity = inventory_item.quantity
                old_avg_cost = inventory_item.avg_cost
                old_total_cost = inventory_item.total_cost
                
                # Apply weight loss if any
                if expense['weight_loss'] > Decimal('0'):
                    # If no inventory exists or quantity is 0, we can't apply weight loss
                    if inventory_item.quantity <= Decimal('0'):
                        self.stdout.write(f"Skipping expense: No inventory available for {expense['quality_type']}")
                        skipped_count += 1
                        continue
                    
                    # Calculate new quantity after weight loss
                    new_quantity = inventory_item.quantity - expense['weight_loss']
                    
                    # Ensure we don't have negative quantity
                    if new_quantity < Decimal('0'):
                        self.stdout.write(f"Skipping expense: Weight loss exceeds available quantity")
                        skipped_count += 1
                        continue
                    
                    # When removing weight, adjust total cost proportionally
                    if inventory_item.quantity > Decimal('0'):
                        # Calculate what percentage of quantity is being removed
                        removal_ratio = expense['weight_loss'] / inventory_item.quantity
                        # Remove the same percentage from total cost
                        cost_to_remove = inventory_item.total_cost * removal_ratio
                        inventory_item.total_cost -= cost_to_remove
                    
                    # Update quantity
                    inventory_item.quantity = new_quantity
                
                # If expenditure is being applied and it's NOT a processing operation, update total cost
                if expense['expenditure'] > Decimal('0') and not expense['is_processing']:
                    inventory_item.total_cost += expense['expenditure']
                
                # Save inventory item to recalculate avg_cost
                inventory_item.save()
                
                # Get new values after changes
                new_quantity = inventory_item.quantity
                new_avg_cost = inventory_item.avg_cost
                
                # Create expense record
                InventoryExpense.objects.create(
                    inventory=inventory_item,
                    weight_loss=expense['weight_loss'],
                    expenditure=expense['expenditure'],
                    old_quantity=old_quantity,
                    new_quantity=new_quantity,
                    old_avg_cost=old_avg_cost,
                    new_avg_cost=new_avg_cost,
                    notes=expense['notes'],
                    is_processing=expense['is_processing'],
                    created_by=expense['created_by']
                )
                
                applied_count += 1
                
            except Inventory.DoesNotExist:
                self.stdout.write(f"Skipping expense: No inventory found for customer {expense['customer_id']}, quality type {expense['quality_type']}")
                skipped_count += 1
                continue
        
        self.stdout.write(self.style.SUCCESS(
            f"Reapplied {applied_count} expenses ({skipped_count} skipped)"
        )) 