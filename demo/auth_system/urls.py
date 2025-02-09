from django.urls import path
from .views import user_login,verify_user,home_page,twilio_incoming,twilio_status  #, send_phone_otp, verify_phone_otp, google_login, send_email_otp, verify_email_otp

urlpatterns = [
    path('user/login/', user_login, name="user_login"),
    path('user/login/otpverification', verify_user, name="verify_user"),
    # path('user/login/phone/verify/', send_phone_otp, name="send_phone_otp"),
    # path('user/login/phone/otp/', verify_phone_otp, name="verify_phone_otp"),
    # path('user/login/email/', google_login, name="google_login"),
    # path('user/login/email/otp/', send_email_otp, name='send_email_otp'),
    # path('user/login/email/verify/', verify_email_otp, name='verify_email_otp'),
    path('home/', home_page, name="home_page"),
    path('twilio/incoming/', twilio_incoming),
    path('twilio/status/', twilio_status),
]
