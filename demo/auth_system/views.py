from django.contrib.auth import authenticate, login, get_user_model
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer
import random
from twilio.rest import Client
from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings
from dotenv import load_dotenv
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from twilio.twiml.messaging_response import MessagingResponse
import json
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from django.contrib.auth import login
from django.shortcuts import redirect

User = get_user_model()
otp_storage = {}  # Store OTP temporarily

load_dotenv()
# SECURITY WARNING: keep the secret key used in production secret!
import os

ADMIN_PHONE = os.getenv('ADMIN_PHONE')
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL')
SECRET_KEY = os.getenv('SECRET_KEY')
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')

@api_view(['POST'])
@permission_classes([AllowAny])
def user_login(request):
    username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(username=username, password=password)

    if user is None:
        return Response({"error": "Invalid credentials"}, status=401)

    # Generate a 6-digit OTP
    otp = str(random.randint(100000, 999999))
    otp_storage[username] = otp  # Store OTP temporarily

    # Initialize response messages
    email_status = "OTP sent via email."
    sms_status = "OTP sent via SMS."

    # Send OTP via Email with Exception Handling
    try:
        send_mail(
            "Your Login OTP",
            f"{username}'s login OTP generated: {otp}",
            "no-reply@example.com",
            [ADMIN_EMAIL],
            fail_silently=False,
        )
    except Exception as e:
        email_status = f"Failed to send OTP via email. Error: {str(e)}"

    # Send OTP via SMS using Twilio with Exception Handling
    try:
        if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER and ADMIN_PHONE:
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            client.messages.create(
                body=f"{username}'s login OTP generated: {otp}",
                from_=TWILIO_PHONE_NUMBER,
                to=ADMIN_PHONE,
            )
        else:
            sms_status = "Twilio credentials or admin phone number is missing."
    except Exception as e:
        sms_status = f"Failed to send OTP via SMS. Error: {str(e)}"

    return Response({
        "message": "OTP process completed.",
        "email_status": email_status,
        "sms_status": sms_status,
        "next": "/user/login/otpverification"
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_user(request):
    username = request.data.get('username')
    otp_entered = request.data.get('otp')

    if not username or not otp_entered:
        return Response({"error": "Username and OTP are required."}, status=400)

    stored_otp = otp_storage.get(username)

    if stored_otp is None:
        return Response({"error": "No OTP found. Please request a new OTP."}, status=400)

    if otp_entered != stored_otp:
        return Response({"error": "Invalid OTP."}, status=401)

    # OTP is correct, remove from storage
    del otp_storage[username]

    # Generate JWT Token
    user = get_object_or_404(User, username=username)
    refresh = RefreshToken.for_user(user)

    return Response({
        "message": "OTP verified successfully!",
        "access_token": str(refresh.access_token),
        "refresh_token": str(refresh),
        "redirect": "/home"
    }, status=200)


# #phone otp sending
# @api_view(['POST'])
# def send_phone_otp(request):
#     phone = request.data.get('phone_number')

#     if not phone:
#         return Response({"error": "Phone number is required"}, status=400)

#     user = get_object_or_404(User, phone_number=phone)
    
#     otp = random.randint(100000, 999999)
#     otp_storage[phone] = otp  # Store OTP in memory (Use Redis in production)

#     # Send OTP via Twilio
#     try:
#         client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
#         message = client.messages.create(
#             body=f"Your OTP is {otp}",
#             from_=TWILIO_PHONE_NUMBER,
#             to=phone
#         )
#         return Response({"message": "OTP sent successfully"})
#     except Exception as e:
#         return Response({"error": f"Failed to send OTP: {str(e)}"}, status=500)

# #phone otp verification
# @api_view(['POST'])
# def verify_phone_otp(request):
#     phone = request.data.get('phone_number')
#     otp = int(request.data.get('otp'))
    
#     if otp_storage.get(phone) == otp:
#         user = get_object_or_404(User, phone_number=phone)
#         user.verified_phone = True
#         user.save()
#         del otp_storage[phone]
#         return Response({"message": "Phone verified successfully"})
#     return Response({"error": "Invalid OTP"}, status=400)

# #google oauth login and verify
# @api_view(['POST'])
# @permission_classes([AllowAny])
# def google_login(request):
#     token = request.data.get('token')
    
#     try:
#         idinfo = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)
#         email = idinfo['email']

#         user, created = User.objects.get_or_create(email=email, defaults={"username": email.split('@')[0]})
#         user.verified_email = True
#         user.save()
        
#         return Response({"message": "Google login successful", "next": "/user/login/email/verify/"})
    
#     except:
#         return Response({"error": "Invalid Google token"}, status=400)


# #email sending otp
# @api_view(['POST'])
# @permission_classes([AllowAny])
# def send_email_otp(request):
#     email = request.data.get('email')
#     user = get_object_or_404(User, email=email)

#     otp = random.randint(100000, 999999)
#     otp_storage[email] = otp  # Store OTP temporarily

#     # Send email using Django's email functionality
#     send_mail(
#         subject="Your OTP Verification Code",
#         message=f"Your OTP is: {otp}",
#         from_email="pallelarakesh5@gmail.com",
#         recipient_list=[email],
#         fail_silently=False,
#     )

#     return Response({"message": "Email OTP sent successfully"})


# #email otp verification
# @api_view(['POST'])
# @permission_classes([AllowAny])
# def verify_email_otp(request):
#     email = request.data.get('email')
#     otp = int(request.data.get('otp'))

#     if otp_storage.get(email) == otp:
#         user = get_object_or_404(User, email=email)
#         user.verified_email = True
#         user.save()
#         del otp_storage[email]
        
#         # Generate JWT tokens
#         refresh = RefreshToken.for_user(user)
#         return Response({
#             "message": "Email verified successfully",
#             "token": str(refresh.access_token),
#             "next": "/home/"
#         })

#     return Response({"error": "Invalid OTP"}, status=400)


#home Page
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def home_page(request):
    return Response({"message": "Welcome to the secured home page!"})

def custom_login_view(request):
    if request.method == "POST":
        user = authenticate(request, username=request.POST["username"], password=request.POST["password"])
        if user is not None:
            user.ip_address = request.META.get("REMOTE_ADDR")  # Store IP
            user.save()
            login(request, user)
            return redirect("home")

@csrf_exempt
def twilio_incoming(request):
    data = json.loads(request.body)
    sender = data.get('From')
    message = data.get('Body')
    print(f"Incoming message from {sender}: {message}")
    return JsonResponse({"message": "Received"})

@csrf_exempt
def twilio_status(request):
    data = json.loads(request.body)
    message_sid = data.get('MessageSid')
    status = data.get('MessageStatus')
    print(f"Message {message_sid} status: {status}")
    return JsonResponse({"message": "Status received"})

