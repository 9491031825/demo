from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from import_export.admin import ImportExportModelAdmin
from import_export.formats.base_formats import CSV, JSON, XLSX
from import_export import resources
from .models import CustomUser, Customer, Transaction
from auditlog.models import LogEntry
from auditlog.admin import LogEntryAdmin
from django.urls import reverse
from django.utils.html import format_html, format_html_join
from django.utils.safestring import mark_safe

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
    # add_fieldsets = UserAdmin.add_fieldsets + (
    #     ("Additional Info", {"fields": ("phone_number",)}),
    # )
    list_display = ("username", "email", "phone_number")
    search_fields = ("username", "email", "phone_number")

# Customer Admin
class CustomerAdmin(ImportExportModelAdmin):
    resource_class = CustomerResource
    formats = [CSV, JSON, XLSX]  # Enable CSV, JSON, and Excel
    list_display = ("name", "phone_number", "email", "company_name", "created_at")
    search_fields = ("name", "phone_number", "email", "company_name")
    list_filter = ("created_at", "updated_at")

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = [
        'id', 
        'customer', 
        'transaction_type',
        'total',
        'amount_paid',
        'payment_status',
        'created_at'
    ]
    list_filter = [
        'transaction_type',
        'payment_status',
        'created_at'
    ]
    search_fields = ['customer__name', 'transaction_id']

# CustomLogEntryAdmin
# class CustomLogEntryAdmin(LogEntryAdmin):
#     list_display = ['created', 'resource_url', 'action', 'user_url', 'object_repr', 'changes_str']
#     list_filter = ['action', 'timestamp', 'content_type', 'user']
#     search_fields = ['object_repr', 'changes', 'user__username']
#     date_hierarchy = 'timestamp'

#     def resource_url(self, obj):
#         if obj.content_type and obj.object_id:
#             url = reverse(
#                 f'admin:{obj.content_type.app_label}_{obj.content_type.model}_change',
#                 args=[obj.object_id]
#             )
#             return format_html('<a href="{}">{}</a>', url, obj.object_repr)
#         return obj.object_repr
#     resource_url.short_description = 'Resource'

#     def user_url(self, obj):
#         if obj.actor:
#             url = reverse('admin:auth_system_customuser_change', args=[obj.actor.id])
#             return format_html('<a href="{}">{}</a>', url, obj.actor)
#         return None
#     user_url.short_description = 'User'

#     def changes_str(self, obj):
#         if obj.changes:
#             return format_html_join(
#                 mark_safe('<br>'),
#                 '{}: {}',
#                 ((k, v) for k, v in obj.changes.items())
#             )
#         return None
#     changes_str.short_description = 'Changes'

# Register your models
admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Customer, CustomerAdmin)

# Unregister the default LogEntry admin and register our custom one
# admin.site.unregister(LogEntry)
# admin.site.register(LogEntry, CustomLogEntryAdmin)
