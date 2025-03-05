from django.db import migrations
from decimal import Decimal

def clear_inventory_data(apps, schema_editor):
    """
    Clear all data from Inventory and InventoryExpense tables
    """
    Inventory = apps.get_model('auth_system', 'Inventory')
    InventoryExpense = apps.get_model('auth_system', 'InventoryExpense')
    
    # Delete all inventory expenses first (due to foreign key constraints)
    InventoryExpense.objects.all().delete()
    
    # Delete all inventory items
    Inventory.objects.all().delete()
    
    print("All inventory data has been cleared.")

def repopulate_inventory_from_transactions(apps, schema_editor):
    """
    Repopulate inventory data from stock transactions
    """
    Transaction = apps.get_model('auth_system', 'Transaction')
    Inventory = apps.get_model('auth_system', 'Inventory')
    
    # Get all stock transactions
    stock_transactions = Transaction.objects.filter(transaction_type='stock')
    
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
                'created_by': transaction.created_by or 'migration'
            }
        
        # Add transaction quantity and cost to inventory
        inventory_data[key]['quantity'] += Decimal(str(transaction.quantity))
        inventory_data[key]['total_cost'] += Decimal(str(transaction.total))
    
    # Create inventory items
    for (customer_id, quality_type), data in inventory_data.items():
        # Calculate average cost
        avg_cost = Decimal('0')
        if data['quantity'] > Decimal('0'):
            avg_cost = data['total_cost'] / data['quantity']
        
        Inventory.objects.create(
            customer_id=customer_id,
            quality_type=quality_type,
            quantity=data['quantity'],
            total_cost=data['total_cost'],
            avg_cost=avg_cost,
            created_by=data['created_by']
        )
    
    print(f"Created {len(inventory_data)} inventory items from stock transactions.")

class Migration(migrations.Migration):

    dependencies = [
        ('auth_system', '0007_inventory_inventoryexpense_delete_processedstock'),
    ]

    operations = [
        migrations.RunPython(clear_inventory_data),
        migrations.RunPython(repopulate_inventory_from_transactions),
    ] 