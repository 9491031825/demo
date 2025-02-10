from django.contrib.auth import authenticate, login, get_user_model
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer, CustomerSerializer, TransactionSerializer
import random
from twilio.rest import Client
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
from datetime import datetime, timedelta
import pytz
import firebase_admin
from firebase_admin import auth

User = get_user_model()
otp_storage = {}  # Store OTP temporarily

load_dotenv()
# SECURITY WARNING: keep the secret key used in production secret!
import os

SECRET_KEY = os.getenv('SECRET_KEY')

ADMIN_PHONE = os.getenv('ADMIN_PHONE')
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL')

# Firebase Initialization
if not firebase_admin._apps:
    firebase_admin.initialize_app()

#user login
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
    otp_storage[username] = {
        'otp': otp,
        'timestamp': datetime.now(pytz.UTC)
    }
    print(otp)  # For development purposes

    # Send OTP via Email
    email_status = "OTP sent via email."
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

    # Send OTP via Firebase SMS
    sms_status = "OTP sent via Firebase SMS."
    try:
        if ADMIN_PHONE:
            try:
                user = auth.get_user_by_phone_number(ADMIN_PHONE)
            except UserNotFoundError:
                user = auth.create_user(phone_number=ADMIN_PHONE)

            # Generate a session for OTP verification
            session_info = auth.generate_sign_in_with_phone_number(ADMIN_PHONE)

            return JsonResponse({"message": "OTP sent via Firebase SMS.", "session_info": session_info})

        else:
            sms_status = "Admin phone number is missing."
    except Exception as e:
        sms_status = f"Failed to send OTP via Firebase SMS. Error: {str(e)}"

    return Response({
        "message": "OTP process completed.",
        "firebase_otp_session": sms_status,
        "next": "/user/login/otpverification"
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_user(request):
    id_token = request.data.get('id_token')  # Firebase ID token sent from the frontend

    if not id_token:
        return Response({"error": "ID token is required."}, status=400)

    try:
        # Verify the Firebase ID token
        decoded_token = auth.verify_id_token(id_token)
        phone_number = decoded_token.get("phone_number")

        if not phone_number:
            return Response({"error": "Invalid token or phone number not found."}, status=400)

        # Get the user from your database (assuming phone number is unique)
        user = User.objects.filter(username=phone_number).first()
        if not user:
            return Response({"error": "User not found. Please register."}, status=404)

        # Generate JWT Token
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)

        return Response({
            "message": "OTP verified successfully!",
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
            "redirect": "/dashboard"
        }, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=401)


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

@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    username = request.data.get('username')
    password = request.data.get('password')
    is_resend = request.data.get('resend', False)
    
    if not username or not password:
        return Response({"error": "Username and password are required."}, status=400)
    
    user = authenticate(username=username, password=password)
    
    if user is not None:
        # Generate OTP and store with timestamp
        otp = str(random.randint(100000, 999999))
        otp_storage[username] = {
            'otp': otp,
            'timestamp': datetime.now(pytz.UTC)
        }
        
        # Send OTP to admin
        try:
            send_mail(
                'OTP for Login',
                f'OTP for user {username} is {otp}',
                'your-email@example.com',
                [ADMIN_EMAIL],
                fail_silently=False,
            )
            
            message = "OTP resent successfully!" if is_resend else "OTP sent successfully!"
            return Response({"next": "otp", "message": message})
        except Exception as e:
            return Response({"error": "Failed to send OTP."}, status=500)
    else:
        return Response({"error": "Invalid credentials."}, status=401)