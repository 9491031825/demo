from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Customer, Transaction, BankAccount

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone_number']

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
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone_number', read_only=True)
    
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
            'transaction_id',
            'notes',
            'payment_status',
            'transaction_date',
            'transaction_time',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'customer_name', 'customer_phone']

    def validate(self, data):
        # Ensure transaction_type is set
        if not data.get('transaction_type'):
            raise serializers.ValidationError("Transaction type must be specified")
            
        # Calculate total if not provided
        if 'quantity' in data and 'rate' in data and 'total' not in data:
            data['total'] = data['quantity'] * data['rate']
        return data

    def create(self, validated_data):
        # Ensure customer is properly set
        if 'customer_id' in self.context:
            validated_data['customer_id'] = self.context['customer_id']
        return super().create(validated_data)

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
