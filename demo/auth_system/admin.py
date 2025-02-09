from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Additional Info", {"fields": ("ip_address",)}),  # Only keeping IP address
    )
    add_fieldsets = UserAdmin.add_fieldsets  
    list_display = ("username", "ip_address")  # Only displaying username and IP
    search_fields = ("username",)

admin.site.register(CustomUser, CustomUserAdmin)
