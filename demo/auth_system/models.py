from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models
from django.conf import settings
from django.utils import timezone

class CustomUser(AbstractUser):
    phone_number = models.CharField(max_length=15,  blank=False, null=False)
    approved_devices = models.JSONField(default=list, blank=True)  # Optional: Store approved device details
    verified_email = models.BooleanField(default=False)
    verified_phone = models.BooleanField(default=False)
    allowed_ips = models.JSONField(default=list, blank=True)  # Optional: Store allowed IPs

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
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE)
    quality_type = models.CharField(max_length=50)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_type = models.CharField(
        max_length=20,
        choices=[
            ('cash', 'Cash'),
            ('bank', 'Bank Transfer'),
            ('upi', 'UPI')
        ],
        default='cash'
    )
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    payment_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('partial', 'Partial'),
            ('paid', 'Paid'),
            ('overpaid', 'Overpaid')
        ],
        default='pending'
    )
    transaction_date = models.DateField(default=timezone.now)
    transaction_time = models.TimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def update_payment_status(self):
        if self.amount_paid == 0:
            self.payment_status = 'pending'
        elif self.amount_paid < self.total:
            self.payment_status = 'partial'
        elif self.amount_paid == self.total:
            self.payment_status = 'paid'
        else:
            self.payment_status = 'overpaid'
        self.balance = self.total - self.amount_paid
        self.save()

    class Meta:
        ordering = ['-created_at']

class Customer(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        null=True,  # Allow null temporarily for migration
        blank=True
    )
    name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=15)
    email = models.EmailField()
    address = models.TextField(blank=True)
    gst_number = models.CharField(max_length=15, blank=True)
    company_name = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
