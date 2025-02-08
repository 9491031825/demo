from django.urls import path
from .views import (
    user_login, send_phone_otp, verify_phone_otp, google_login, 
    send_email_otp, verify_email_otp, home_page, twilio_incoming, 
    twilio_status, verify_token, search_customers, create_customer,
    get_transactions
)

urlpatterns = [
    path('user/login/', user_login, name="user_login"),
    path('user/login/phone/verify/', send_phone_otp, name="send_phone_otp"),
    path('user/login/phone/otp/', verify_phone_otp, name="verify_phone_otp"),
    path('user/login/email/', google_login, name="google_login"),
    path('user/login/email/otp/', send_email_otp, name='send_email_otp'),
    path('user/login/email/verify/', verify_email_otp, name='verify_email_otp'),
    path('home/', home_page, name="home_page"),
    path('twilio/incoming/', twilio_incoming),
    path('twilio/status/', twilio_status),
    path('api/auth/verify/', verify_token, name='verify_token'),
    path('api/customers/search/', search_customers, name='search_customers'),
    path('api/customers/create/', create_customer, name='create_customer'),
    path('api/customers/<int:customer_id>/transactions/', get_transactions, name='get_transactions'),
]
