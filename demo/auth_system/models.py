from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models
from django.conf import settings

class CustomUser(AbstractUser):
    phone_number = models.CharField(max_length=15, unique=True, blank=False, null=False)
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
    created_at = models.DateTimeField(auto_now_add=True)
    payment_status = models.CharField(max_length=20, default='pending')

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
