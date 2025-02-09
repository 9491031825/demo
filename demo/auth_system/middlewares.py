import logging
from django.http import JsonResponse
from django.conf import settings

logger = logging.getLogger(__name__)

class RestrictIPMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        allowed_ips = getattr(settings, 'ALLOWED_OFFICE_IPS', [])
        user_ip = self.get_client_ip(request)

        # Log the detected IP
        logger.info(f"User IP detected: {user_ip}")

        if user_ip not in allowed_ips:
            return JsonResponse({"error": "Access denied from this IP"}, status=403)

        return self.get_response(request)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
