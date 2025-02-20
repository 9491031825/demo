# Generated by Django 5.1.5 on 2025-02-20 10:30

import django.contrib.auth.models
import django.contrib.auth.validators
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='CustomUser',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('username', models.CharField(error_messages={'unique': 'A user with that username already exists.'}, help_text='Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.', max_length=150, unique=True, validators=[django.contrib.auth.validators.UnicodeUsernameValidator()], verbose_name='username')),
                ('first_name', models.CharField(blank=True, max_length=150, verbose_name='first name')),
                ('last_name', models.CharField(blank=True, max_length=150, verbose_name='last name')),
                ('is_staff', models.BooleanField(default=False, help_text='Designates whether the user can log into this admin site.', verbose_name='staff status')),
                ('is_active', models.BooleanField(default=True, help_text='Designates whether this user should be treated as active. Unselect this instead of deleting accounts.', verbose_name='active')),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date joined')),
                ('phone_number', models.CharField(default='+919347201829', max_length=15)),
                ('approved_devices', models.JSONField(blank=True, default=list)),
                ('verified_email', models.BooleanField(default=False)),
                ('verified_phone', models.BooleanField(default=False)),
                ('allowed_ips', models.JSONField(blank=True, default=list)),
                ('email', models.EmailField(default='mohanvarma1022@gmail.com', max_length=254)),
                ('groups', models.ManyToManyField(blank=True, help_text='The groups this user belongs to.', related_name='customuser_set', to='auth.group', verbose_name='groups')),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='customuser_set', to='auth.permission', verbose_name='user permissions')),
            ],
            options={
                'verbose_name': 'user',
                'verbose_name_plural': 'users',
                'abstract': False,
            },
            managers=[
                ('objects', django.contrib.auth.models.UserManager()),
            ],
        ),
        migrations.CreateModel(
            name='Customer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('phone_number', models.CharField(max_length=15)),
                ('email', models.EmailField(max_length=254)),
                ('address', models.TextField(blank=True)),
                ('gst_number', models.CharField(blank=True, max_length=15)),
                ('pan_number', models.CharField(blank=True, max_length=10, null=True)),
                ('aadhaar_number', models.CharField(blank=True, max_length=12, null=True)),
                ('company_name', models.CharField(blank=True, max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'permissions': [('can_edit_sensitive_info', 'Can edit sensitive information like Aadhaar and PAN')],
            },
        ),
        migrations.CreateModel(
            name='BankAccount',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('account_holder_name', models.CharField(max_length=100)),
                ('bank_name', models.CharField(max_length=100)),
                ('account_number', models.CharField(max_length=20)),
                ('ifsc_code', models.CharField(max_length=11)),
                ('is_active', models.BooleanField(default=True)),
                ('is_default', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bank_accounts', to='auth_system.customer')),
            ],
            options={
                'unique_together': {('customer', 'account_number')},
            },
        ),
        migrations.CreateModel(
            name='Transaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('transaction_type', models.CharField(choices=[('stock', 'Stock Transaction'), ('payment', 'Payment Transaction')], max_length=10)),
                ('payment_status', models.CharField(choices=[('pending', 'Pending'), ('partial', 'Partially Paid'), ('paid', 'Fully Paid')], default='pending', max_length=10)),
                ('quality_type', models.CharField(blank=True, max_length=50, null=True)),
                ('quantity', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('rate', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('payment_type', models.CharField(blank=True, choices=[('cash', 'Cash'), ('bank', 'Bank Transfer'), ('upi', 'UPI')], max_length=20, null=True)),
                ('total', models.DecimalField(decimal_places=2, max_digits=10)),
                ('amount_paid', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('balance', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('running_balance', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('transaction_id', models.CharField(blank=True, max_length=100, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('transaction_date', models.DateField(default=django.utils.timezone.now)),
                ('transaction_time', models.TimeField(default=django.utils.timezone.now)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('bank_account', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='auth_system.bankaccount')),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='auth_system.customer')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
