from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models

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
