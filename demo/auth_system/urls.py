from django.urls import path
from .views import user_login, send_phone_otp, verify_phone_otp, google_login, send_email_otp, verify_email_otp, home_page

urlpatterns = [
    path('user/login/', user_login, name="user_login"),
    path('user/login/phone/verify/', send_phone_otp, name="send_phone_otp"),
    path('user/login/phone/otp/', verify_phone_otp, name="verify_phone_otp"),
    path('user/login/email/', google_login, name="google_login"),
    path('user/login/email/verify/', send_email_otp, name="send_email_otp"),
    path('user/login/email/otp/', verify_email_otp, name="verify_email_otp"),
    path('home/', home_page, name="home_page"),
]
