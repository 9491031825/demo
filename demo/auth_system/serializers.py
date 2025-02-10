from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Customer, Transaction

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone_number']

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'name', 'email', 'phone_number', 'address', 
                 'gst_number', 'company_name', 'created_at']

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
        # Calculate total if not provided
        if 'quantity' in data and 'rate' in data and 'total' not in data:
            data['total'] = data['quantity'] * data['rate']
        return data

    def create(self, validated_data):
        # Ensure customer is properly set
        if 'customer_id' in self.context:
            validated_data['customer_id'] = self.context['customer_id']
        return super().create(validated_data)
