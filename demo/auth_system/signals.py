from django.contrib.auth.signals import user_logged_in, user_login_failed
from django.dispatch import receiver
from .models import LoginHistory
from django.utils import timezone

@receiver(user_logged_in)
def log_successful_login(sender, request, user, **kwargs):
    LoginHistory.objects.create(
        user=user,
        login_datetime=timezone.now(),
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT'),
        status='success',
        device_info={
            'browser': request.META.get('HTTP_USER_AGENT', ''),
            'platform': request.META.get('HTTP_SEC_CH_UA_PLATFORM', ''),
        }
    )

@receiver(user_login_failed)
def log_failed_login(sender, credentials, request, **kwargs):
    # Try to find the user
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        user = User.objects.get(username=credentials.get('username'))
        LoginHistory.objects.create(
            user=user,
            login_datetime=timezone.now(),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            status='failed',
            device_info={
                'browser': request.META.get('HTTP_USER_AGENT', ''),
                'platform': request.META.get('HTTP_SEC_CH_UA_PLATFORM', ''),
            }
        )
    except User.DoesNotExist:
        pass  