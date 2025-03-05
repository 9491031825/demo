from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Customer, Transaction, BankAccount, Inventory, InventoryExpense
from django.utils import timezone

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone_number']

class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = [
            'id', 
            'account_holder_name', 
            'bank_name', 
            'account_number', 
            'ifsc_code',
            'is_default',
            'is_active'
        ]
        read_only_fields = ['id']
        
class CustomerSerializer(serializers.ModelSerializer):
    bank_accounts = serializers.SerializerMethodField()
    
    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'email', 'phone_number', 'address',
            'gst_number', 'pan_number', 'aadhaar_number',
            'company_name', 'created_at', 'bank_accounts'
        ]
        read_only_fields = ['id', 'created_at']

    def get_bank_accounts(self, obj):
        bank_accounts = BankAccount.objects.filter(customer=obj)
        return BankAccountSerializer(bank_accounts, many=True).data

class TransactionSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.CharField(source='customer.phone_number', read_only=True)
    bank_account = BankAccountSerializer(read_only=True)
    bank_account_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    updated_transactions = serializers.SerializerMethodField()
    
    class Meta:
        model = Transaction
        fields = [
            'id',
            'customer',
            'customer_name',
            'customer_phone',
            'transaction_type',
            'quality_type',
            'quantity',
            'rate',
            'total',
            'amount_paid',
            'balance',
            'payment_type',
            'notes',
            'payment_status',
            'transaction_date',
            'transaction_time',
            'created_at',
            'updated_at',
            'bank_account',
            'bank_account_id',
            'updated_transactions',
            'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'customer_name', 'customer_phone']

    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else None

    def get_updated_transactions(self, obj):
        # This field will be populated manually in the view
        # when creating payment transactions
        return getattr(obj, 'updated_transactions', None)

    def validate(self, data):
        # Ensure transaction_type is set
        if not data.get('transaction_type'):
            raise serializers.ValidationError("Transaction type must be specified")
            
        # Calculate total if not provided
        if 'quantity' in data and 'rate' in data and 'total' not in data:
            data['total'] = data['quantity'] * data['rate']
            
        # Validate bank_account_id based on payment_type
        payment_type = data.get('payment_type')
        bank_account_id = data.get('bank_account_id')
        
        # Handle both bank_account and bank_account_id fields
        if not bank_account_id and 'bank_account' in self.initial_data:
            bank_account = self.initial_data.get('bank_account')
            if bank_account:
                data['bank_account_id'] = bank_account
                bank_account_id = bank_account
        
        if payment_type == 'bank' and not bank_account_id:
            raise serializers.ValidationError({'bank_account_id': 'Bank account is required for bank transfers'})
        elif payment_type in ['cash', 'upi']:
            # For non-bank payments, ensure bank_account_id is None
            data['bank_account_id'] = None
            
        # Ensure transaction_date and transaction_time are set
        if 'transaction_date' not in data or not data['transaction_date']:
            data['transaction_date'] = timezone.now().date()
            
        if 'transaction_time' not in data or not data['transaction_time']:
            data['transaction_time'] = timezone.now().time()
            
        return data

    def create(self, validated_data):
        # Ensure customer is properly set
        if 'customer_id' in self.context:
            validated_data['customer_id'] = self.context['customer_id']
        return super().create(validated_data)

class InventorySerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Inventory
        fields = [
            'id',
            'customer',
            'customer_name',
            'quality_type',
            'quantity',
            'total_cost',
            'avg_cost',
            'created_at',
            'updated_at',
            'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'avg_cost', 'customer_name']
    
    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else None

class InventoryExpenseSerializer(serializers.ModelSerializer):
    inventory_details = serializers.SerializerMethodField()
    
    class Meta:
        model = InventoryExpense
        fields = [
            'id',
            'inventory',
            'inventory_details',
            'weight_loss',
            'expenditure',
            'old_quantity',
            'new_quantity',
            'old_avg_cost',
            'new_avg_cost',
            'notes',
            'created_at',
            'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'inventory_details']
    
    def get_inventory_details(self, obj):
        if not obj.inventory:
            return None
        return {
            'customer_name': obj.inventory.customer.name,
            'quality_type': obj.inventory.quality_type,
            'quantity': obj.inventory.quantity,
            'avg_cost': obj.inventory.avg_cost
        }

