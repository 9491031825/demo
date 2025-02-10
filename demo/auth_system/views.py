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
from django.db.models import Q, Sum
from .models import Transaction, Customer
from datetime import datetime, timedelta
import pytz
from auditlog.models import LogEntry
from django.core.paginator import Paginator

User = get_user_model()
otp_storage = {}  # Store OTP temporarily

load_dotenv()
# SECURITY WARNING: keep the secret key used in production secret!
import os

SECRET_KEY = os.getenv('SECRET_KEY')
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')  
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')


# Load environment variables
import os

ADMIN_PHONE = os.getenv('ADMIN_PHONE')
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL')

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
            subject="Your Login OTP",
            message=f"{username}'s login OTP: {otp}",
            from_email=EMAIL_HOST_USER,
            recipient_list=[ADMIN_EMAIL],
            fail_silently=False,
        )
    except Exception as e:
        print(f"Email Error: {str(e)}")

    # Send OTP via SMS
    sms_status = "OTP sent via SMS."
    try:
        if all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, ADMIN_PHONE]):
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
    response = Response({
        "message": "OTP process completed.",
        "email_status": email_status,
        "sms_status": sms_status,
        "next": "/user/login/otpverification"
    })
    print(sms_status)
    return response

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_user(request):
    username = request.data.get('username')
    otp_entered = request.data.get('otp')

    if not username or not otp_entered:
        return Response({"error": "Username and OTP are required."}, status=400)

    stored_otp_data = otp_storage.get(username)

    if not stored_otp_data:
        return Response({"error": "No OTP found. Please request a new OTP."}, status=400)

    # Check if OTP has expired (5 minutes)
    time_diff = datetime.now(pytz.UTC) - stored_otp_data['timestamp']
    if time_diff > timedelta(minutes=2):
        # Remove expired OTP
        del otp_storage[username]
        return Response({"error": "OTP has expired. Please request a new one."}, status=400)

    if otp_entered != stored_otp_data['otp']:
        return Response({"error": "Invalid OTP."}, status=401)

    # OTP is correct and not expired, remove from storage
    del otp_storage[username]

    # Generate JWT Token
    user = get_object_or_404(User, username=username)
    refresh = RefreshToken.for_user(user)

    return Response({
        "message": "OTP verified successfully!",
        "access_token": str(refresh.access_token),
        "refresh_token": str(refresh),
        "redirect": "/dashboard"
    }, status=200)


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
def get_transactions(request, customer_id):
    # Verify the customer belongs to the current user
    customer = get_object_or_404(Customer, id=customer_id, user=request.user)
    
    page = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 10))
    
    start = (page - 1) * page_size
    end = start + page_size
    
    transactions = Transaction.objects.filter(
        customer_id=customer_id
    ).order_by('-created_at')[start:end]
    
    total = Transaction.objects.filter(customer_id=customer_id).count()
    
    serializer = TransactionSerializer(transactions, many=True)
    
    # Calculate total pending amount for this customer
    total_pending = Transaction.objects.filter(
        customer_id=customer_id,
        payment_status__in=['pending', 'partial']
    ).aggregate(
        total_pending=Sum('balance')
    )['total_pending'] or 0
    
    return Response({
        'results': serializer.data,
        'count': total,
        'customer_name': customer.name,
        'total_pending': float(total_pending)
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_customer(request):
    email = request.data.get('email')
    phone_number = request.data.get('phone_number')
    
    duplicate_fields = {}
    
    if email:
        existing_email = Customer.objects.filter(email=email).first()
        if existing_email:
            duplicate_fields['email'] = True
    
    if phone_number:
        existing_phone = Customer.objects.filter(phone_number=phone_number).first()
        if existing_phone:
            duplicate_fields['phone_number'] = True
    
    if duplicate_fields:
        # Get the first matching customer to show as an example
        existing_customer = Customer.objects.filter(
            Q(email=email) if email else Q(phone_number=phone_number)
        ).first()
        
        return Response({
            "error": "Customer already exists",
            "duplicate_fields": duplicate_fields,
            "existing_customer": CustomerSerializer(existing_customer).data
        }, status=400)
    
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_transaction(request):
    try:
        data = request.data
        customer_id = data.get('customer_id')
        
        # Verify the customer belongs to the current user
        customer = get_object_or_404(Customer, id=customer_id, user=request.user)
        
        transactions_data = data.get('transactions', [])
        payment_details = data.get('payment_details', {})
        
        if not transactions_data:
            return Response({
                'error': 'Missing required fields: transactions'
            }, status=400)

        created_transactions = []
        current_datetime = datetime.now()
        payment_amount = float(payment_details.get('payment_amount', 0))
        
        total_transaction_amount = sum(float(t['total']) for t in transactions_data)
        
        for transaction in transactions_data:
            transaction_total = float(transaction['total'])
            proportional_payment = (transaction_total / total_transaction_amount) * payment_amount if payment_amount > 0 else 0
            
            transaction_data = {
                'customer': customer_id,  # Changed from customer_id to customer
                'quality_type': transaction['quality_type'],
                'quantity': transaction['quantity'],
                'rate': transaction['rate'],
                'total': transaction_total,
                'amount_paid': proportional_payment,
                'balance': transaction_total - proportional_payment,
                'payment_type': payment_details.get('payment_type', 'cash'),
                'transaction_id': payment_details.get('transaction_id', ''),
                'notes': payment_details.get('notes', ''),
                'transaction_date': current_datetime.date(),
                'transaction_time': current_datetime.time()
            }
            
            serializer = TransactionSerializer(
                data=transaction_data,
                context={'customer_id': customer_id}
            )
            
            if serializer.is_valid():
                transaction = serializer.save()
                transaction.update_payment_status()
                created_transactions.append(serializer.data)
            else:
                print("Serializer errors:", serializer.errors)
                return Response(serializer.errors, status=400)
        
        return Response(created_transactions, status=201)
    except Exception as e:
        print(f"Error creating transaction: {str(e)}")
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_transactions(request):
    query = request.GET.get('query', '')
    page = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 10))
    
    start = (page - 1) * page_size
    end = start + page_size
    
    # Filter transactions by the current user's customers
    user_customers = Customer.objects.filter(user=request.user).values_list('id', flat=True)
    
    transactions = Transaction.objects.filter(
        customer_id__in=user_customers
    ).filter(
        Q(customer__name__icontains=query) |
        Q(quality_type__icontains=query) |
        Q(payment_status__icontains=query)
    ).select_related('customer').order_by('-created_at')[start:end]
    
    total = Transaction.objects.filter(
        customer_id__in=user_customers
    ).filter(
        Q(customer__name__icontains=query) |
        Q(quality_type__icontains=query) |
        Q(payment_status__icontains=query)
    ).count()
    
    serializer = TransactionSerializer(transactions, many=True)
    
    # Calculate total pending amount
    total_pending = Transaction.objects.filter(
        customer_id__in=user_customers,
        payment_status__in=['pending', 'partial']
    ).aggregate(
        total_pending=Sum('balance')
    )['total_pending'] or 0
    
    return Response({
        'results': serializer.data,
        'count': total,
        'total_pending': float(total_pending)
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_audit_logs(request):
    page = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 10))
    user_id = request.GET.get('user_id')
    action = request.GET.get('action')
    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')
    
    logs = LogEntry.objects.all()
    
    if user_id:
        logs = logs.filter(actor_id=user_id)
    if action:
        logs = logs.filter(action=action)
    if date_from:
        logs = logs.filter(timestamp__gte=date_from)
    if date_to:
        logs = logs.filter(timestamp__lte=date_to)
        
    logs = logs.order_by('-timestamp')
    
    paginator = Paginator(logs, page_size)
    current_page = paginator.page(page)
    
    return Response({
        'results': [{
            'id': log.id,
            'timestamp': log.timestamp,
            'user': log.actor.username if log.actor else None,
            'action': log.get_action_display(),
            'resource_type': log.content_type.model,
            'resource_name': log.object_repr,
            'changes': log.changes
        } for log in current_page],
        'count': paginator.count,
        'total_pages': paginator.num_pages
    })