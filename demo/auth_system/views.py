from django.contrib.auth import authenticate, login, get_user_model
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer, CustomerSerializer, TransactionSerializer, BankAccountSerializer
from .models import Transaction, Customer, BankAccount
from django.core.mail import send_mail
from django.db.models import Q, Sum
from django.utils import timezone
from django.db import transaction
from django.core.paginator import Paginator
from auditlog.models import LogEntry
import random
from datetime import timedelta

import pytz
import json
from datetime import datetime
from dotenv import load_dotenv
import os
from twilio.rest import Client
from google.auth.transport import requests
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from twilio.twiml.messaging_response import MessagingResponse
from django.core.exceptions import ValidationError
from django.db.models.functions import TruncDate

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
    # email_status = "OTP sent via email."
    # try:
    #     send_mail(
    #         subject="Your Login OTP",
    #         message=f"{username}'s login OTP: {otp}",
    #         from_email=EMAIL_HOST_USER,
    #         recipient_list=[ADMIN_EMAIL],
    #         fail_silently=False,
    #     )
    # except Exception as e:
    #     print(f"Email Error: {str(e)}")

    # # Send OTP via SMS
    # try:
    #     if all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, ADMIN_PHONE]):
    #         client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    #         client.messages.create(
    #             body=f"{username}'s login OTP generated: {otp}",
    #             from_=TWILIO_PHONE_NUMBER,
    #             to=ADMIN_PHONE,
    #         )
    #         sms_status = "OTP sent via SMS."
    #     else:
    #         sms_status = "Twilio credentials or admin phone number is missing."
    # except Exception as e:
    #     sms_status = f"Failed to send OTP via SMS. Error: {str(e)}"
    response = Response({
        "message": "OTP process completed.",
        # "email_status": email_status,
        # "sms_status": sms_status,
        "next": "/user/login/otpverification"
    })
    # print(sms_status)
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
    
    customers = Customer.objects.all()
    
    if query:
        customers = customers.filter(
            Q(name__icontains=query) |
            Q(email__icontains=query) |
            Q(phone_number__icontains=query) |
            Q(company_name__icontains=query) |
            Q(gst_number__icontains=query) |
            Q(pan_number__icontains=query)
        )
    
    # Limit to 100 results if no search query, otherwise show all matches
    if not query:
        customers = customers[:100]
        
    serializer = CustomerSerializer(customers, many=True)
    return Response(serializer.data)

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
    # Check for duplicate Aadhaar
    aadhaar_number = request.data.get('aadhaar_number')
    if Customer.objects.filter(aadhaar_number=aadhaar_number).exists():
        return Response({
            "error": "Customer with this Aadhaar number already exists"
        }, status=400)

    serializer = CustomerSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_bank_account(request, customer_id):
    try:
        # Verify customer belongs to current user
        customer = get_object_or_404(Customer, id=customer_id, user=request.user)
        
        # Log the incoming request data
        print("Received bank account data:", request.data)
        
        # If this is set as default, unset other default accounts
        if request.data.get('is_default'):
            BankAccount.objects.filter(customer=customer, is_default=True).update(is_default=False)
        
        # Create serializer with customer context
        serializer = BankAccountSerializer(data=request.data)
        
        if serializer.is_valid():
            # Save with customer reference
            bank_account = serializer.save(customer=customer)
            print("Bank account created successfully:", bank_account.id)
            return Response(serializer.data, status=201)
        else:
            print("Serializer errors:", serializer.errors)
            return Response(serializer.errors, status=400)
            
    except Exception as e:
        print("Error creating bank account:", str(e))
        return Response({
            'error': f'Failed to create bank account: {str(e)}'
        }, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_bank_accounts(request, customer_id):
    customer = get_object_or_404(Customer, id=customer_id, user=request.user)
    bank_accounts = customer.bank_accounts.all()
    serializer = BankAccountSerializer(bank_accounts, many=True)
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_customer(request, customer_id):
    customer = get_object_or_404(Customer, id=customer_id, user=request.user)
    
    # Check if user has permission to edit sensitive information
    sensitive_fields = ['aadhaar_number', 'pan_number']
    has_sensitive_fields = any(field in request.data for field in sensitive_fields)
    
    if has_sensitive_fields and not request.user.has_perm('auth_system.can_edit_sensitive_info'):
        return Response({
            "error": "You don't have permission to edit sensitive information"
        }, status=403)
    
    serializer = CustomerSerializer(customer, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
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
def create_stock_transaction(request):
    try:
        transactions_data = request.data
        print("Received data:", transactions_data)
        
        # Handle both single transaction and multiple transactions
        if not isinstance(transactions_data, list):
            transactions_data = [transactions_data]
            
        saved_transactions = []
        
        with transaction.atomic():
            for data in transactions_data:
                customer_id = data.get('customer_id')
                customer = get_object_or_404(Customer, id=customer_id)
                
                # Convert string values to float, with error handling
                quantity = float(data.get('quantity', 0))
                rate = float(data.get('rate', 0))
                total = float(data.get('total', 0))
                
                transaction_data = {
                    'customer': customer.id,
                    'transaction_type': 'stock',
                    'quality_type': data.get('quality_type'),
                    'quantity': quantity,
                    'rate': rate,
                    'total': total,
                    'notes': data.get('notes', ''),
                    'transaction_date': data.get('transaction_date'),
                    'transaction_time': data.get('transaction_time'),
                    'payment_status': 'pending',
                    'balance': total,
                    'amount_paid': 0,
                    'payment_type': data.get('payment_type', 'cash')
                }
                
                # Print the transaction data for debugging
                print("Processing transaction data:", transaction_data)
                
                serializer = TransactionSerializer(data=transaction_data)
                if serializer.is_valid():
                    transaction_obj = serializer.save()
                    saved_transactions.append(serializer.data)
                else:
                    print("Serializer errors:", serializer.errors)
                    raise ValidationError(f"Validation error for transaction: {serializer.errors}")
        
        return Response(saved_transactions, status=201)
        
    except ValidationError as e:
        print(f"Validation error in create_stock_transaction: {str(e)}")
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        print(f"Error in create_stock_transaction: {str(e)}")
        return Response({'error': str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_transaction(request):
    try:
        data = request.data
        print("Received payment data:", data)
        
        customer = get_object_or_404(Customer, id=data.get('customer_id'))
        payment_amount = float(data.get('amount_paid', 0))
        
        # Ensure transaction_type is explicitly set
        if not data.get('transaction_type'):
            return Response({'error': 'Transaction type must be specified'}, status=400)
            
        # Get pending transactions
        pending_transactions = Transaction.objects.filter(
            customer=customer,
            transaction_type='stock',
            payment_status__in=['pending', 'partial']
        ).order_by('created_at')
        
        with transaction.atomic():
            # Create the payment transaction with explicit transaction_type
            transaction_data = {
                'customer': customer.id,
                'transaction_type': 'payment',  # Explicitly set as string
                'payment_type': data.get('payment_type'),
                'amount_paid': payment_amount,
                'total': payment_amount,
                'balance': 0,
                'transaction_id': data.get('transaction_id'),
                'bank_account': data.get('bank_account'),
                'notes': data.get('notes', ''),
                'transaction_date': data.get('transaction_date', timezone.now().date()),
                'transaction_time': data.get('transaction_time', timezone.now().time()),
                'payment_status': 'paid',
                'quality_type': 'payment',  # Explicitly set
                'quantity': 1,
                'rate': payment_amount
            }
            
            print("Creating payment with data:", transaction_data)
            
            # Create serializer with explicit transaction_type
            serializer = TransactionSerializer(data=transaction_data)
            if not serializer.is_valid():
                print("Serializer validation errors:", serializer.errors)
                return Response(serializer.errors, status=400)
            
            # Save with explicit transaction_type
            payment_transaction = serializer.save(transaction_type='payment')
            remaining_payment = payment_amount
            updated_transactions = []

            # Update pending transactions
            for pending_tx in pending_transactions:
                if remaining_payment <= 0:
                    break

                current_balance = float(pending_tx.balance or 0)
                if current_balance > 0:
                    amount_to_apply = min(remaining_payment, current_balance)
                    pending_tx.amount_paid = float(pending_tx.amount_paid or 0) + amount_to_apply
                    pending_tx.balance = current_balance - amount_to_apply
                    pending_tx.payment_status = 'paid' if pending_tx.balance == 0 else 'partial'
                    pending_tx.save()
                    
                    remaining_payment -= amount_to_apply
                    updated_transactions.append({
                        'id': pending_tx.id,
                        'amount_applied': amount_to_apply,
                        'new_balance': pending_tx.balance
                    })

            print(f"Payment of {payment_amount} applied. Updated transactions: {updated_transactions}")
            
            return Response({
                'payment': serializer.data,
                'updated_transactions': updated_transactions,
                'remaining_payment': remaining_payment
            }, status=201)
        
    except Exception as e:
        print(f"Error in create_payment_transaction: {str(e)}")
        print(f"Error type: {type(e)}")
        print(f"Error details: {e.__dict__}")
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_transaction_details(request, transaction_id):
    try:
        transaction = get_object_or_404(Transaction, id=transaction_id)
        serializer = TransactionSerializer(transaction)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_transaction_history(request, customer_id):
    try:
        customer = get_object_or_404(Customer, id=customer_id, user=request.user)

        transactions = Transaction.objects.filter(customer=customer)
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_customer_bank_accounts(request, customer_id):
    try:
        customer = get_object_or_404(Customer, id=customer_id, user=request.user)
        bank_accounts = BankAccount.objects.filter(customer=customer)
        serializer = BankAccountSerializer(bank_accounts, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_customer_details(request, customer_id):
    try:
        customer = get_object_or_404(Customer, id=customer_id, user=request.user)
        customer_data = CustomerSerializer(customer).data
        
        # Add a formatted identifier field that shows either GST or PAN
        customer_data['tax_identifier'] = {
            'type': 'GST' if customer.gst_number else 'PAN',
            'value': customer.gst_number if customer.gst_number else customer.pan_number,
            'both': {
                'gst': customer.gst_number or 'N/A',
                'pan': customer.pan_number or 'N/A'
            }
        }
        
        return Response(customer_data)
    except Exception as e:
        print(f"Error in get_customer_details: {str(e)}")  # Add debugging
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_customer_balance(request, customer_id):
    try:
        customer = get_object_or_404(Customer, id=customer_id)
        
        # Get all transactions for this customer
        all_transactions = Transaction.objects.filter(customer=customer)
        
        # Get stock transactions
        stock_transactions = Transaction.objects.filter(
            customer=customer,
            transaction_type='stock'
        )
        
        # Calculate total stock amount
        total_stock_amount = stock_transactions.aggregate(
            total=Sum('total')
        )['total'] or 0
        
        # Get payment transactions
        payment_transactions = Transaction.objects.filter(
            customer=customer,
            transaction_type='payment'
        )
        
        # Calculate total payments
        total_payments = payment_transactions.aggregate(
            total=Sum('amount_paid')
        )['total'] or 0
        
        # Calculate net balance
        net_balance = float(total_stock_amount) - float(total_payments)
        
        # Determine if it's an advance payment
        is_advance = total_payments > total_stock_amount
        
        print("\nDetailed Balance Calculations:")
        print(f"Total Stock Amount: {total_stock_amount}")
        print(f"Total Payments: {total_payments}")
        print(f"Net Balance: {net_balance}")
        print(f"Is Advance: {is_advance}")

        return Response({
            'total_pending': float(net_balance if net_balance > 0 else 0),
            'total_paid': float(total_payments),
            'net_balance': float(net_balance),
            'is_advance': is_advance,
            'advance_amount': float(abs(net_balance) if is_advance else 0),
            'debug_info': {
                'stock_transactions': list(stock_transactions.values(
                    'id', 'total', 'transaction_date'
                )),
                'payment_transactions': list(payment_transactions.values(
                    'id', 'amount_paid', 'transaction_date'
                ))
            }
        })

    except Exception as e:
        print(f"Error in get_customer_balance: {str(e)}")
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_purchase_insights(request):
    try:
        # Get query parameters
        time_frame = request.GET.get('timeFrame', 'all')
        quality_types = request.GET.getlist('qualityTypes[]', [])
        
        # Base query for stock transactions
        query = Transaction.objects.filter(
            transaction_type='stock'
        )
        
        # Apply time frame filter
        today = timezone.now().date()
        if time_frame == 'today':
            query = query.filter(transaction_date=today)
        elif time_frame == 'weekly':
            week_ago = today - timedelta(days=7)
            query = query.filter(transaction_date__gte=week_ago)
        elif time_frame == 'monthly':
            month_ago = today - timedelta(days=30)
            query = query.filter(transaction_date__gte=month_ago)
        
        # Apply quality type filter
        if quality_types:
            query = query.filter(quality_type__in=quality_types)
            
        # Group by date and quality type
        insights = query.values('transaction_date', 'quality_type').annotate(
            total_quantity=Sum('quantity'),
            total_amount=Sum('total')
        ).order_by('-transaction_date')
        
        # Calculate summary
        summary = {
            'total_purchases': query.count(),
            'total_amount': query.aggregate(Sum('total'))['total__sum'] or 0,
            'total_quantity': query.aggregate(Sum('quantity'))['quantity__sum'] or 0
        }
        
        return Response({
            'insights': insights,
            'summary': summary
        })
        
    except Exception as e:
        print(f"Error in get_purchase_insights: {str(e)}")
        return Response({'error': str(e)}, status=400)

