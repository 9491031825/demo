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
    class Meta:
        model = Transaction
        fields = [
            'id', 'customer', 'quality_type', 'quantity', 'rate',
            'discount', 'total', 'payment_type', 'payment_amount',
            'transaction_id', 'notes', 'payment_status', 'created_at'
        ]
