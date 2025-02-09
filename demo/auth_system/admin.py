from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from import_export.admin import ImportExportModelAdmin
from import_export.formats.base_formats import CSV, JSON, XLSX
from import_export import resources
from .models import CustomUser, Customer, Transaction

# CustomUser Resource
class CustomUserResource(resources.ModelResource):
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'phone_number', 'verified_email', 'verified_phone')

# Customer Resource
class CustomerResource(resources.ModelResource):
    class Meta:
        model = Customer
        fields = ('id', 'name', 'phone_number', 'email', 'company_name', 'created_at')

# Transaction Resource
class TransactionResource(resources.ModelResource):
    class Meta:
        model = Transaction
        fields = ('id', 'customer__name', 'quality_type', 'quantity', 'rate', 'total', 'payment_status', 'created_at')

# CustomUser Admin
class CustomUserAdmin(UserAdmin, ImportExportModelAdmin):
    resource_class = CustomUserResource
    formats = [CSV, JSON, XLSX]  # Enable CSV, JSON, and Excel
    fieldsets = UserAdmin.fieldsets + (
        ("Additional Info", {"fields": ("phone_number", "verified_email", "verified_phone", "allowed_ips")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Additional Info", {"fields": ("phone_number",)}),
    )
    list_display = ("username", "email", "phone_number", "verified_email", "verified_phone")
    search_fields = ("username", "email", "phone_number")

# Customer Admin
class CustomerAdmin(ImportExportModelAdmin):
    resource_class = CustomerResource
    formats = [CSV, JSON, XLSX]  # Enable CSV, JSON, and Excel
    list_display = ("name", "phone_number", "email", "company_name", "created_at")
    search_fields = ("name", "phone_number", "email", "company_name")
    list_filter = ("created_at", "updated_at")

# Transaction Admin
class TransactionAdmin(ImportExportModelAdmin):
    resource_class = TransactionResource
    formats = [CSV, JSON, XLSX]  # Enable CSV, JSON, and Excel
    list_display = ("customer", "quality_type", "quantity", "rate", "total", "payment_status", "created_at")
    search_fields = ("customer__name", "quality_type", "payment_status")
    list_filter = ("payment_status", "created_at")

# Register Admin Models
admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Customer, CustomerAdmin)
admin.site.register(Transaction, TransactionAdmin)
