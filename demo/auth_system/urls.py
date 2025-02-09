from django.urls import path
from .views import (
    user_login, verify_user, home_page, twilio_incoming, 
    twilio_status, verify_token, search_customers, create_customer,
    get_transactions
)

urlpatterns = [
    path('user/login/', user_login, name="user_login"),
    path('user/login/otpverification/', verify_user, name="verify_user"),
    path('auth/verify/', verify_token, name='verify_token'),
    path('customers/search/', search_customers, name='search_customers'),
    path('customers/create/', create_customer, name='create_customer'),
    path('customers/<int:customer_id>/transactions/', get_transactions, name='get_transactions'),
    path('twilio/incoming/', twilio_incoming),
    path('twilio/status/', twilio_status),
]
