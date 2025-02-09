from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models
from django.conf import settings

class CustomUser(AbstractUser):
    ADMIN_PHONE = os.getenv('ADMIN_PHONE')
    ADMIN_EMAIL = os.getenv('ADMIN_EMAIL')

    phone_number = models.CharField(max_length=15, default=ADMIN_PHONE, blank=False, null=False)
    email = models.EmailField(default=ADMIN_EMAIL, blank=False, null=False)
    approved_devices = models.JSONField(default=list, blank=True)  # Optional: Store approved device details
    ip_address = models.GenericIPAddressField(blank=True, null=True) 

    def __str__(self):
        return self.ip_address if self.ip_address else self.username

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
