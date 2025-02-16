# Generated by Django 5.1.6 on 2025-02-16 13:41

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('auth_system', '0007_alter_customuser_email_alter_customuser_phone_number'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='customer',
            options={'permissions': [('can_edit_sensitive_info', 'Can edit sensitive information like Aadhaar and PAN')]},
        ),
        migrations.AddField(
            model_name='customer',
            name='aadhaar_number',
            field=models.CharField(default=0, max_length=12, unique=True),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='customer',
            name='pan_number',
            field=models.CharField(blank=True, max_length=10),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='phone_number',
            field=models.CharField(default='+919347201829', max_length=15),
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
        migrations.AddField(
            model_name='transaction',
            name='bank_account',
            field=models.ForeignKey(blank=True, help_text='Required only for bank transfers', null=True, on_delete=django.db.models.deletion.SET_NULL, to='auth_system.bankaccount'),
        ),
    ]
