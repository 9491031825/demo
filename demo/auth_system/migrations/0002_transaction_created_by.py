# Generated by Django 5.1.6 on 2025-02-26 21:53

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('auth_system', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='created_by',
            field=models.CharField(blank=True, help_text='Username of the user who created this transaction', max_length=150, null=True),
        ),
    ]
