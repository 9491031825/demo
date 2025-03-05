from django.urls import path
from .views import (
    user_login, verify_user, home_page, twilio_incoming, 
    twilio_status, verify_token, search_customers, create_customer,
    get_transactions,
    add_bank_account, get_bank_accounts, get_customer_bank_accounts, 
    get_transaction_details, get_transaction_history, create_stock_transaction,
    create_payment_transaction, get_customer_details, get_customer_balance,
    get_purchase_insights,
    create_bulk_payment,
    get_payment_insights,
    get_pending_transactions,
    set_default_bank_account,
    setup_google_auth,
    verify_google_auth_setup,
    send_email_otp,
    verify_email_otp,
    get_inventory_overview,
    get_customer_inventory,
    add_inventory_expense,
    get_inventory_expenses,
)

urlpatterns = [
    path('user/login/', user_login, name="user_login"),
    path('user/login/otpverification/', verify_user, name="verify_user"),
    path('home/', home_page, name="home_page"),
    path('twilio/incoming/', twilio_incoming),
    path('twilio/status/', twilio_status),
    path('api/auth/verify/', verify_token, name='verify_token'),
    path('api/customers/search/', search_customers, name='search_customers'),
    path('api/customers/create/', create_customer, name='create_customer'),
    path('api/customers/<int:customer_id>/', get_customer_details, name='get_customer_details'),
    path('api/customers/<int:customer_id>/balance/', get_customer_balance, name='get_customer_balance'),
    path('api/customers/<int:customer_id>/transactions/', get_transactions, name='get_transactions'),
    path('api/customers/<int:customer_id>/bank-accounts/', get_customer_bank_accounts, name='get_customer_bank_accounts'),
    path('api/customers/<int:customer_id>/bank-accounts/add/', add_bank_account, name='add_bank_account'),
    path('api/customers/<int:customer_id>/bank-accounts/<int:account_id>/set-default/', set_default_bank_account, name='set_default_bank_account'),
    path('api/transactions/stock/create/', create_stock_transaction, name='create_stock_transaction'),
    path('api/transactions/payment/create/', create_payment_transaction, name='create_payment_transaction'),
    path('api/transactions/<int:transaction_id>/', get_transaction_details, name='get_transaction_details'),
    path('api/transactions/search/', get_transactions, name='get_transactions'),
    path('api/transactions/insights', get_purchase_insights, name='purchase_insights'),
    path('api/transactions/payment/bulk/', create_bulk_payment, name='create_bulk_payment'),
    path('api/transactions/payment-insights', get_payment_insights, name='get_payment_insights'),
    path('api/customers/<int:customer_id>/pending-transactions/', get_pending_transactions),
    path('login/', user_login, name='user_login'),
    path('verify/', verify_user, name='verify_user'),
    path('home/', home_page, name='home_page'),
    path('email/send-otp/', send_email_otp, name='send_email_otp'),
    path('email/verify-otp/', verify_email_otp, name='verify_email_otp'),
    path('setup-google-auth/', setup_google_auth, name='setup_google_auth'),
    path('verify-google-auth-setup/', verify_google_auth_setup, name='verify_google_auth_setup'),
    path('api/inventory/', get_inventory_overview, name='get_inventory_overview'),
    path('api/customers/<int:customer_id>/inventory/', get_customer_inventory, name='get_customer_inventory'),
    path('api/customers/<int:customer_id>/inventory/expenses/', get_inventory_expenses, name='get_inventory_expenses'),
    path('api/customers/<int:customer_id>/inventory/add-expense/', add_inventory_expense, name='add_inventory_expense'),
]
