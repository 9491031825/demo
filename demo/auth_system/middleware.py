from django.contrib.auth import logout
from django.contrib import messages
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from django.shortcuts import redirect

class AdminSessionTimeoutMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/admin/') and request.user.is_authenticated:
            last_activity = request.session.get('last_admin_activity')
            if last_activity:
                last_activity = timezone.datetime.fromisoformat(last_activity)
                if timezone.now() > last_activity + timedelta(seconds=settings.ADMIN_SESSION_TIMEOUT):
                    logout(request)
                    messages.warning(request, 'Your session has expired. Please login again.')
                    return redirect('admin:login')
            
            request.session['last_admin_activity'] = timezone.now().isoformat()

        return self.get_response(request) 