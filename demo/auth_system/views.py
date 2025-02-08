from django.contrib.auth import authenticate, login, get_user_model
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer, CustomerSerializer, TransactionSerializer
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
from django.db.models import Q
from .models import Transaction, Customer

User = get_user_model()
otp_storage = {}  # Store OTP temporarily

load_dotenv()
# SECURITY WARNING: keep the secret key used in production secret!
import os

SECRET_KEY = os.getenv('SECRET_KEY')
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')

# Google OAuth Client ID (Replace with your credentials)
GOOGLE_CLIENT_ID = "your_google_client_id"


#user login
@api_view(['POST'])
@permission_classes([AllowAny])
def user_login(request):
    username = request.data.get('username')
    phone_number = request.data.get('phone_number')

    try:
        user = User.objects.get(username=username, phone_number=phone_number)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    # If user exists, proceed to phone OTP verification step
    return Response({"message": "User found, proceed to OTP verification", "next": "/user/login/phone/verify/"})


#phone otp verification
@api_view(['POST'])
def send_phone_otp(request):
    phone = request.data.get('phone_number')

    if not phone:
        return Response({"error": "Phone number is required"}, status=400)

    user = get_object_or_404(User, phone_number=phone)
    
    otp = random.randint(100000, 999999)
    otp_storage[phone] = otp  # Store OTP in memory (Use Redis in production)
    print(otp)
    # Send OTP via Twilio
    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=f"Your OTP is {otp}",
            from_=TWILIO_PHONE_NUMBER,
            to="+91"+phone
        )
        return Response({"message": "OTP sent successfully"})
    except Exception as e:
        return Response({"error": f"Failed to send OTP: {str(e)}"}, status=500)

@api_view(['POST'])
def verify_phone_otp(request):
    phone = request.data.get('phone_number')
    user_otp = request.data.get('otp')
    
    print(f"Received OTP verification request - Phone: {phone}, OTP: {user_otp}")  # Debug log
    print(f"Stored OTP for this phone: {otp_storage.get(phone)}")  # Debug log

    if not phone or not user_otp:
        return Response({"error": "Phone number and OTP are required"}, status=400)

    stored_otp = otp_storage.get(phone)
    
    if stored_otp and int(user_otp) == stored_otp:
        user = get_object_or_404(User, phone_number=phone)
        user.verified_phone = True
        user.save()
        
        del otp_storage[phone]
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            "message": "OTP verified successfully",
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
            "user": UserSerializer(user).data,
            "token_type": "Bearer",
            "expires_in": 3600
        })
    
    return Response({"error": "Invalid OTP"}, status=400)

#google oauth login and verify
@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    token = request.data.get('token')
    
    try:
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)
        email = idinfo['email']

        user, created = User.objects.get_or_create(email=email, defaults={"username": email.split('@')[0]})
        user.verified_email = True
        user.save()
        
        return Response({"message": "Google login successful", "next": "/user/login/email/verify/"})
    
    except:
        return Response({"error": "Invalid Google token"}, status=400)


#email sending otp
@api_view(['POST'])
@permission_classes([AllowAny])
def send_email_otp(request):
    email = request.data.get('email')
    user = get_object_or_404(User, email=email)

    otp = random.randint(100000, 999999)
    otp_storage[email] = otp  # Store OTP temporarily

    # Send email using Django's email functionality
    send_mail(
        subject="Your OTP Verification Code",
        message=f"Your OTP is: {otp}",
        from_email="pallelarakesh5@gmail.com",
        recipient_list=[email],
        fail_silently=False,
    )

    return Response({"message": "Email OTP sent successfully"})


#email otp verification
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email_otp(request):
    email = request.data.get('email')
    otp = int(request.data.get('otp'))

    if otp_storage.get(email) == otp:
        user = get_object_or_404(User, email=email)
        user.verified_email = True
        user.save()
        del otp_storage[email]
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            "message": "Email verified successfully",
            "token": str(refresh.access_token),
            "next": "/home/"
        })

    return Response({"error": "Invalid OTP"}, status=400)


#home Page
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def home_page(request):
    return Response({"message": "Welcome to the secured home page!"})

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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_customers(request):
    query = request.GET.get('query', '')
    
    if not query:
        return Response([])
    
    customers = Customer.objects.filter(
        Q(name__icontains=query) |
        Q(email__icontains=query) |
        Q(phone_number__icontains=query)
    )[:10]  # Limit to 10 results
    
    return Response(CustomerSerializer(customers, many=True).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_transactions(request):
    customer_id = request.GET.get('customer_id')
    page = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 10))
    
    start = (page - 1) * page_size
    end = start + page_size
    
    transactions = Transaction.objects.filter(
        customer_id=customer_id
    ).order_by('-created_at')[start:end]
    
    total = Transaction.objects.filter(customer_id=customer_id).count()
    
    serializer = TransactionSerializer(transactions, many=True)
    return Response({
        'results': serializer.data,
        'count': total
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_customer(request):
    serializer = CustomerSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

@api_view(['GET'])
def verify_token(request):
    if request.user.is_authenticated:
        return Response({
            "isValid": True,
            "user": UserSerializer(request.user).data
        })
    return Response({"isValid": False}, status=401)