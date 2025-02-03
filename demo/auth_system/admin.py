from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Additional Info", {"fields": ("phone_number", "verified_email", "verified_phone", "allowed_ips")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Additional Info", {"fields": ("phone_number",)}),
    )
    list_display = ("username", "email", "phone_number", "verified_email", "verified_phone")
    search_fields = ("username", "email", "phone_number")

admin.site.register(CustomUser, CustomUserAdmin)
