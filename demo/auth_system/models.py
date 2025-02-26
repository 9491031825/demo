from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models
from django.conf import settings
from django.utils import timezone
import os
from auditlog.models import AuditlogHistoryField
from auditlog.registry import auditlog
from django.core.exceptions import ValidationError
from django.db import transaction

ADMIN_PHONE = os.getenv('ADMIN_PHONE')
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL')

class CustomUser(AbstractUser):
    # history = AuditlogHistoryField()
    phone_number = models.CharField(max_length=15, default=ADMIN_PHONE, blank=False, null=False)
    approved_devices = models.JSONField(default=list, blank=True)  # Optional: Store approved device details
    verified_email = models.BooleanField(default=False)
    verified_phone = models.BooleanField(default=False)
    allowed_ips = models.JSONField(default=list, blank=True)  # Optional: Store allowed IPs
    email = models.EmailField(default=ADMIN_EMAIL, blank=False, null=False)

    # Override groups field with a unique related_name
    groups = models.ManyToManyField(
        Group,
        related_name="customuser_set",  # Custom reverse accessor name
        blank=True,
        help_text="The groups this user belongs to.",
        verbose_name="groups",
    )

    # Override user_permissions field with a unique related_name
    user_permissions = models.ManyToManyField(
        Permission,
        related_name="customuser_set",  # Custom reverse accessor name
        blank=True,
        help_text="Specific permissions for this user.",
        verbose_name="user permissions",
    )

class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('stock', 'Stock Transaction'),
        ('payment', 'Payment Transaction')
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('partial', 'Partially Paid'),
        ('paid', 'Fully Paid')
    ]
    
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    payment_status = models.CharField(
        max_length=10, 
        choices=PAYMENT_STATUS_CHOICES,
        default='pending'
    )
    
    # Stock related fields (nullable for payment transactions)
    quality_type = models.CharField(max_length=50, null=True, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Payment related fields
    payment_type = models.CharField(
        max_length=20,
        choices=[
            ('cash', 'Cash'),
            ('bank', 'Bank Transfer'),
            ('upi', 'UPI')
        ],
        null=True,
        blank=True
    )
    
    # Common fields
    total = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    running_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    bank_account = models.ForeignKey(
        'BankAccount',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    notes = models.TextField(blank=True, null=True)
    transaction_date = models.DateField(default=timezone.now)
    transaction_time = models.TimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.transaction_type:
            raise ValidationError("Transaction type must be specified")
            
        if self.transaction_type == 'stock':
            if not self.pk:  # New transaction
                self.balance = self.total
                self.amount_paid = 0
                self.payment_status = 'pending'
        elif self.transaction_type == 'payment':
            self.balance = 0
            self.payment_status = 'paid'
            
            # Update related stock transactions
            if not self.pk:  # Only for new payment transactions
                pending_transactions = Transaction.objects.filter(
                    customer=self.customer,
                    transaction_type='stock',
                    payment_status__in=['pending', 'partial']
                ).order_by('created_at')
                
                remaining_payment = float(self.amount_paid)
                for pending_tx in pending_transactions:
                    if remaining_payment <= 0:
                        break
                        
                    current_balance = float(pending_tx.balance)
                    if current_balance > 0:
                        amount_to_apply = min(remaining_payment, current_balance)
                        pending_tx.amount_paid = float(pending_tx.amount_paid) + amount_to_apply
                        pending_tx.balance = current_balance - amount_to_apply
                        pending_tx.payment_status = 'paid' if pending_tx.balance == 0 else 'partial'
                        pending_tx.save()
                        remaining_payment -= amount_to_apply

        # Calculate running balance
        with transaction.atomic():
            previous_transaction = Transaction.objects.filter(
                customer=self.customer,
                created_at__lt=self.created_at
            ).order_by('-created_at').first()

            if previous_transaction:
                if self.transaction_type == 'stock':
                    self.running_balance = previous_transaction.running_balance + self.total
                else:  # payment
                    self.running_balance = previous_transaction.running_balance - self.amount_paid
            else:
                self.running_balance = self.total if self.transaction_type == 'stock' else -self.amount_paid

            super().save(*args, **kwargs)

    def clean(self):
        if self.payment_type == 'bank' and not self.bank_account:
            raise ValidationError("Bank account is required for bank transfers")

    def __str__(self):
        return f"{self.transaction_type} - {self.customer.name} - {self.total}"

    class Meta:
        ordering = ['-created_at']

class Customer(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=15)
    email = models.EmailField()
    address = models.TextField(blank=True)
    gst_number = models.CharField(max_length=15, blank=True)
    pan_number = models.CharField(max_length=10, blank=True, null=True)
    aadhaar_number = models.CharField(max_length=12, null=True, blank=True)  # Remove unique constraint temporarily
    company_name = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        permissions = [
            ("can_edit_sensitive_info", "Can edit sensitive information like Aadhaar and PAN")
        ]

class BankAccount(models.Model):
    customer = models.ForeignKey(
        Customer, 
        on_delete=models.CASCADE,
        related_name='bank_accounts'
    )
    account_holder_name = models.CharField(max_length=100)
    bank_name = models.CharField(max_length=100)
    account_number = models.CharField(max_length=20)
    ifsc_code = models.CharField(max_length=11)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('customer', 'account_number')

    def save(self, *args, **kwargs):
        # If this is the first account, make it default
        if not self.pk and not BankAccount.objects.filter(customer=self.customer).exists():
            self.is_default = True
        
        # If this is being set as default, unset others
        if self.is_default:
            BankAccount.objects.filter(
                customer=self.customer, 
                is_default=True
            ).update(is_default=False)
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.bank_name} - {self.account_number}"

# Register models with auditlog
auditlog.register(CustomUser)
auditlog.register(Transaction)
auditlog.register(Customer)
auditlog.register(BankAccount)
