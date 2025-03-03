from django.contrib.auth import authenticate, login, get_user_model
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer, CustomerSerializer, TransactionSerializer, BankAccountSerializer
from .models import Transaction, Customer, BankAccount
from django.core.mail import send_mail
from django.db.models import Q, Sum, Count, Avg
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

import qrcode
import io
import base64
from django.http import HttpResponse

User = get_user_model()
otp_storage = {}  # Store OTP temporarily

load_dotenv()
# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY')
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')  
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')

ADMIN_PHONE = os.getenv('ADMIN_PHONE')
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL')

#user login
@api_view(['POST'])
@permission_classes([AllowAny])
def user_login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    use_google_auth = request.data.get('use_google_auth', False)
    google_auth_code = request.data.get('google_auth_code')

    user = authenticate(username=username, password=password)

    if user is None:
        return Response({"error": "Invalid credentials"}, status=401)

    # First login step - return success to show auth options
    if not use_google_auth and not google_auth_code:
        return Response({"success": True, "message": "Credentials verified"})

    # Handle Google Authenticator verification
    if use_google_auth and google_auth_code:
        # Get admin user for Google Auth verification
        admin_user = User.objects.filter(is_superuser=True, is_admin_2fa_enabled=True).first()
        if not admin_user:
            return Response({"error": "Google Authenticator not set up by admin"}, status=400)

        if admin_user.verify_google_auth_code(google_auth_code):
            # If verification successful, log in user and return tokens
            login(request, user)
            refresh = RefreshToken.for_user(user)
            return Response({
                "access_token": str(refresh.access_token),
                "refresh_token": str(refresh),
                "user": UserSerializer(user).data,
                "redirect": "/dashboard"
            })
        else:
            return Response({"error": "Invalid Google Authenticator code"}, status=401)

    # For regular OTP flow
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
    
    # Get filter parameters
    filter_type = request.GET.get('filterType', None)
    start_date = request.GET.get('startDate', None)
    end_date = request.GET.get('endDate', None)
    
    # Base query
    transactions_query = Transaction.objects.filter(
        customer_id=customer_id
    ).select_related('bank_account')
    
    # Apply date range filter if provided
    if filter_type == 'date_range' and start_date and end_date:
        transactions_query = transactions_query.filter(
            transaction_date__gte=start_date,
            transaction_date__lte=end_date
        )
    
    # Order and paginate
    transactions = transactions_query.order_by('-created_at')[
        (page - 1) * page_size : (page - 1) * page_size + page_size
    ]
    
    total = transactions_query.count()
    
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
        'total_pending': float(total_pending),
        'filter_applied': filter_type == 'date_range'
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
        
        # Print user information at the start
        print(f"User authenticated: {request.user.is_authenticated}")
        print(f"Username: {request.user.username}")
        
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
                
                # Check for advance payments (negative balance)
                # Calculate current balance before this transaction
                stock_total = Transaction.objects.filter(
                    customer=customer,
                    transaction_type='stock'
                ).aggregate(total=Sum('total'))['total'] or 0
                
                payment_total = Transaction.objects.filter(
                    customer=customer,
                    transaction_type='payment'
                ).aggregate(total=Sum('amount_paid'))['total'] or 0
                
                # If payment_total > stock_total, we have an advance payment
                advance_amount = float(payment_total) - float(stock_total)
                
                # Determine initial values for the new transaction
                initial_amount_paid = 0
                initial_balance = total
                initial_payment_status = 'pending'
                
                # If we have an advance payment, apply it to this transaction
                if advance_amount > 0:
                    # Apply the advance to this transaction
                    amount_to_apply = min(advance_amount, total)
                    initial_amount_paid = amount_to_apply
                    initial_balance = total - amount_to_apply
                    initial_payment_status = 'paid' if initial_balance == 0 else 'partial'
                
                # Print debug information
                print(f"Creating stock transaction for customer {customer_id}")
                print(f"Stock total: {stock_total}, Payment total: {payment_total}")
                print(f"Advance amount: {advance_amount}")
                print(f"Initial amount paid: {initial_amount_paid}")
                print(f"Initial balance: {initial_balance}")
                print(f"Initial payment status: {initial_payment_status}")
                
                # Print debug information for created_by
                print(f"User creating transaction: {request.user.username}")
                
                transaction_data = {
                    'customer': customer.id,
                    'transaction_type': 'stock',
                    'quality_type': data.get('quality_type'),
                    'quantity': quantity,
                    'rate': rate,
                    'total': total,
                    'notes': data.get('notes', ''),
                    'transaction_date': data.get('transaction_date', timezone.now().date().isoformat()),
                    'transaction_time': data.get('transaction_time', timezone.now().time().isoformat()),
                    'payment_status': initial_payment_status,
                    'balance': initial_balance,
                    'amount_paid': initial_amount_paid,
                    'payment_type': data.get('payment_type', 'cash'),
                    'created_by': request.user.username
                }
                
                # Print the transaction data for debugging
                print(f"Transaction data before serialization: {transaction_data}")
                
                serializer = TransactionSerializer(data=transaction_data)
                if serializer.is_valid():
                    transaction_obj = serializer.save()
                    print(f"Transaction saved with created_by: {transaction_obj.created_by}")
                    print(f"Full transaction object after save: {transaction_obj.__dict__}")
                    saved_transactions.append(serializer.data)
                else:
                    print(f"Serializer errors: {serializer.errors}")
                    raise ValidationError(f"Validation error for transaction: {serializer.errors}")
        
        return Response(saved_transactions, status=201)
        
    except ValidationError as e:
        print(f"Validation error: {str(e)}")
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        print(f"Exception: {str(e)}")
        return Response({'error': str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_transaction(request):
    try:
        from decimal import Decimal
        data = request.data
        
        # Print user information at the start
        print(f"User authenticated: {request.user.is_authenticated}")
        print(f"Username: {request.user.username}")
        
        # Validate required fields
        required_fields = ['customer_id', 'payment_type', 'amount_paid']
        for field in required_fields:
            if not data.get(field):
                return Response({'error': f'Missing required field: {field}'}, status=400)
        
        customer = get_object_or_404(Customer, id=data.get('customer_id'))
        payment_amount = Decimal(str(data.get('amount_paid', '0')))
        
        # Get bank account if provided - check both field names
        bank_account_id = data.get('bank_account_id')
        if not bank_account_id:
            bank_account_id = data.get('bank_account')
        
        bank_account = None
        if bank_account_id and data.get('payment_type') == 'bank':
            bank_account = get_object_or_404(BankAccount, id=bank_account_id)
        
        with transaction.atomic():
            # Create the payment transaction
            transaction_data = {
                'customer': customer.id,
                'transaction_type': 'payment',
                'payment_type': data.get('payment_type'),
                'amount_paid': payment_amount,
                'total': payment_amount,
                'balance': Decimal('0'),
                'notes': data.get('notes', ''),
                'transaction_date': data.get('transaction_date', timezone.now().date()),
                'transaction_time': data.get('transaction_time', timezone.now().time()),
                'payment_status': 'paid',
                'quality_type': 'payment',
                'quantity': 1,
                'rate': payment_amount,
                'created_by': request.user.username
            }
            
            # Add bank_account_id if payment type is bank
            if data.get('payment_type') == 'bank' and bank_account:
                transaction_data['bank_account_id'] = bank_account.id
            
            # Print the transaction data for debugging
            print(f"Payment transaction data before serialization: {transaction_data}")
            
            serializer = TransactionSerializer(data=transaction_data)
            if not serializer.is_valid():
                print(f"Payment serializer errors: {serializer.errors}")
                return Response(serializer.errors, status=400)
            
            payment_transaction = serializer.save()
            print(f"Payment transaction saved with created_by: {payment_transaction.created_by}")
            print(f"Full payment transaction object after save: {payment_transaction.__dict__}")
            
            # Check if manual allocation is enabled
            manual_allocation = data.get('manual_allocation', False)
            allocations = data.get('allocations', {})
            
            updated_transactions = []
            
            if manual_allocation and allocations:
                # Convert allocations from string keys to integers if needed
                processed_allocations = {}
                for tx_id, amount in allocations.items():
                    # Handle both string and integer keys
                    processed_allocations[int(tx_id)] = Decimal(str(amount))
                
                # Get all transactions that have allocations
                tx_ids = list(processed_allocations.keys())
                transactions_to_update = Transaction.objects.filter(
                    id__in=tx_ids,
                    customer=customer,
                    transaction_type='stock',
                    payment_status__in=['pending', 'partial']
                )
                
                # Apply allocations to each transaction
                for tx in transactions_to_update:
                    allocation_amount = processed_allocations.get(tx.id, Decimal('0'))
                    if allocation_amount > 0:
                        current_balance = Decimal(str(tx.balance or '0'))
                        # Ensure we don't allocate more than the balance
                        amount_to_apply = min(allocation_amount, current_balance)
                        
                        tx.amount_paid = Decimal(str(tx.amount_paid or '0')) + amount_to_apply
                        tx.balance = current_balance - amount_to_apply
                        tx.payment_status = 'paid' if tx.balance == 0 else 'partial'
                        tx.save()
                        
                        updated_transactions.append({
                            'id': tx.id,
                            'amount_applied': str(amount_to_apply),
                            'new_balance': str(tx.balance)
                        })
            else:
                # Use the default allocation logic (oldest transactions first)
                # Update pending transactions
                pending_transactions = Transaction.objects.filter(
                    customer=customer,
                    transaction_type='stock',
                    payment_status__in=['pending', 'partial']
                ).order_by('created_at')  # Default is oldest first
                
                # Check if we should use a different sorting order
                sort_order = data.get('sort_order', 'oldest_first')
                if sort_order == 'smallest_first':
                    pending_transactions = pending_transactions.order_by('balance')
                elif sort_order == 'largest_first':
                    pending_transactions = pending_transactions.order_by('-balance')
                
                remaining_payment = payment_amount
                
                for pending_tx in pending_transactions:
                    if remaining_payment <= 0:
                        break
                        
                    current_balance = Decimal(str(pending_tx.balance or '0'))
                    if current_balance > 0:
                        amount_to_apply = min(remaining_payment, current_balance)
                        pending_tx.amount_paid = Decimal(str(pending_tx.amount_paid or '0')) + amount_to_apply
                        pending_tx.balance = current_balance - amount_to_apply
                        pending_tx.payment_status = 'paid' if pending_tx.balance == 0 else 'partial'
                        pending_tx.save()
                        
                        remaining_payment -= amount_to_apply
                        updated_transactions.append({
                            'id': pending_tx.id,
                            'amount_applied': str(amount_to_apply),
                            'new_balance': str(pending_tx.balance)
                        })
            
            # Store updated_transactions in the payment transaction for serialization
            payment_transaction.updated_transactions = updated_transactions
            
            # Re-serialize with the updated_transactions included
            response_serializer = TransactionSerializer(payment_transaction)
            
            return Response({
                'payment': response_serializer.data,
                'allocation_type': 'manual' if manual_allocation else 'automatic'
            }, status=201)
            
    except Exception as e:
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
        
        # Calculate total pending amount (sum of remaining balances)
        total_pending = stock_transactions.aggregate(
            total_pending=Sum('balance')
        )['total_pending'] or 0
        
        # Calculate net balance (total payments - total stock amount)
        # This approach ensures advance payments are properly accounted for
        net_balance = float(total_stock_amount) - float(total_payments)
        
        # If net_balance is negative, it means there's an advance payment
        is_advance = net_balance < 0

        return Response({
            'total_pending': float(total_pending),
            'total_paid': float(total_payments),
            'net_balance': float(net_balance),
            'is_advance': is_advance,
            'advance_amount': float(abs(net_balance) if is_advance else 0),
            'debug_info': {
                'stock_transactions': list(stock_transactions.values(
                    'id', 'total', 'balance', 'amount_paid', 'transaction_date'
                )),
                'payment_transactions': list(payment_transactions.values(
                    'id', 'amount_paid', 'transaction_date'
                )),
                'total_stock_amount': float(total_stock_amount),
                'total_payments': float(total_payments)
            }
        })

    except Exception as e:
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
        ).select_related('customer')  # Add customer relation
        
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
            
        # Get detailed transaction data
        insights = query.values(
            'transaction_date',
            'transaction_time',
            'customer__name',
            'quality_type',
            'quantity',
            'rate',
            'total',
            'payment_status',
            'notes',
            'created_by'
        ).order_by('-transaction_date', '-transaction_time')
        
        # Format the insights data
        formatted_insights = [{
            'transaction_date': transaction['transaction_date'],
            'transaction_time': transaction['transaction_time'].strftime('%H:%M:%S'),
            'customer_name': transaction['customer__name'],
            'quality_type': transaction['quality_type'],
            'quantity': float(transaction['quantity']),
            'rate': float(transaction['rate']),
            'total_amount': float(transaction['total']),
            'payment_status': transaction['payment_status'],
            'notes': transaction['notes'],
            'created_by': transaction['created_by']
        } for transaction in insights]
        
        # Calculate summary
        summary = {
            'total_purchases': query.count(),
            'total_amount': float(query.aggregate(Sum('total'))['total__sum'] or 0),
            'total_quantity': float(query.aggregate(Sum('quantity'))['quantity__sum'] or 0)
        }
        
        return Response({
            'insights': formatted_insights,
            'summary': summary
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_bulk_payment(request):
    try:
        payments_data = request.data
        
        saved_payments = []
        updated_transactions = []
        
        with transaction.atomic():
            for payment in payments_data:
                customer_id = payment.get('customer_id')
                customer = get_object_or_404(Customer, id=customer_id)
                payment_amount = float(payment.get('amount_paid', 0))
                
                # Get pending transactions for this customer
                pending_transactions = Transaction.objects.filter(
                    customer=customer,
                    transaction_type='stock',
                    payment_status__in=['pending', 'partial']
                ).order_by('created_at')
                
                # Get bank account if provided - check both field names
                bank_account_id = payment.get('bank_account_id')
                if not bank_account_id:
                    bank_account_id = payment.get('bank_account')
                
                bank_account = None
                if bank_account_id and payment.get('payment_type') == 'bank':
                    bank_account = get_object_or_404(BankAccount, id=bank_account_id)
                
                # Create the payment transaction
                transaction_data = {
                    'customer': customer.id,
                    'transaction_type': 'payment',
                    'payment_type': payment.get('payment_type', 'bank'),
                    'quality_type': 'payment',
                    'quantity': 1,
                    'rate': payment_amount,
                    'total': payment_amount,
                    'amount_paid': payment_amount,
                    'balance': 0,
                    'notes': payment.get('notes', ''),
                    'transaction_date': payment.get('transaction_date', timezone.now().date()),
                    'transaction_time': payment.get('transaction_time', timezone.now().time()),
                    'payment_status': 'paid',
                    'created_by': request.user.username
                }
                
                # Add bank_account_id if payment type is bank
                if payment.get('payment_type') == 'bank' and bank_account:
                    transaction_data['bank_account_id'] = bank_account.id
                
                serializer = TransactionSerializer(data=transaction_data)
                if serializer.is_valid():
                    payment_transaction = serializer.save()
                    saved_payments.append(serializer.data)
                    
                    # Update pending transactions with this payment
                    remaining_payment = payment_amount
                    customer_updated_transactions = []
                    
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
                            customer_updated_transactions.append({
                                'id': pending_tx.id,
                                'amount_applied': amount_to_apply,
                                'new_balance': pending_tx.balance
                            })
                    
                    updated_transactions.append({
                        'customer_id': customer_id,
                        'updated_transactions': customer_updated_transactions,
                        'remaining_payment': remaining_payment
                    })
                else:
                    raise ValidationError(f"Validation error for payment: {serializer.errors}")
        
        return Response({
            'payments': saved_payments,
            'updated_transactions': updated_transactions
        }, status=201)
        
    except ValidationError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_insights(request):
    try:
        # Get query parameters
        time_frame = request.GET.get('timeFrame', 'all')
        payment_types = request.GET.getlist('paymentTypes[]', [])
        date_param = request.GET.get('date')

        # Base query for payment transactions
        query = Transaction.objects.filter(
            transaction_type='payment'
        ).select_related('customer', 'bank_account')
        
        # Apply time frame filter
        if time_frame == 'today':
            if date_param:
                # Use the provided date
                target_date = datetime.fromisoformat(date_param.replace('Z', '+00:00')).date()
            else:
                # Use current date in server's timezone
                target_date = timezone.localtime(timezone.now()).date()
            
            query = query.filter(transaction_date=target_date)
        elif time_frame == 'weekly':
            week_ago = timezone.now().date() - timedelta(days=7)
            query = query.filter(transaction_date__gte=week_ago)
        elif time_frame == 'monthly':
            month_ago = timezone.now().date() - timedelta(days=30)
            query = query.filter(transaction_date__gte=month_ago)
        
        # Apply payment type filter
        if payment_types:
            query = query.filter(payment_type__in=payment_types)
            
        # Get detailed transaction data
        insights = query.values(
            'transaction_date',
            'transaction_time',
            'customer__name',
            'payment_type',
            'bank_account__account_number',
            'amount_paid',
            'notes',
            'created_by'
        ).order_by('-transaction_date', '-transaction_time')
        
        # Calculate most common payment type
        payment_type_count = query.values('payment_type').annotate(
            count=Count('id')
        ).order_by('-count').first()
        
        # Format insights data
        formatted_insights = [{
            'transaction_date': payment['transaction_date'],
            'transaction_time': payment['transaction_time'].strftime('%H:%M:%S'),
            'customer_name': payment['customer__name'],
            'payment_type': payment['payment_type'],
            'bank_account': payment['bank_account__account_number'],
            'amount_paid': float(payment['amount_paid']),
            'notes': payment['notes'],
            'created_by': payment['created_by']
        } for payment in insights]
        
        # Calculate summary
        summary = {
            'total_payments': query.count(),
            'total_amount': float(query.aggregate(Sum('amount_paid'))['amount_paid__sum'] or 0),
            'average_payment': float(query.aggregate(Avg('amount_paid'))['amount_paid__avg'] or 0),
            'most_common_type': payment_type_count['payment_type'] if payment_type_count else None
        }
        
        return Response({
            'insights': formatted_insights,
            'summary': summary
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pending_transactions(request, customer_id):
    try:
        customer = get_object_or_404(Customer, id=customer_id)
        
        # Get all pending or partially paid stock transactions
        pending_transactions = Transaction.objects.filter(
            customer=customer,
            transaction_type='stock',
            payment_status__in=['pending', 'partial']
        ).order_by('created_at')
        
        serializer = TransactionSerializer(pending_transactions, many=True)
        
        return Response({
            'results': serializer.data,
            'count': pending_transactions.count()
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_default_bank_account(request, customer_id, account_id):
    try:
        # Verify customer belongs to current user
        customer = get_object_or_404(Customer, id=customer_id, user=request.user)
        bank_account = get_object_or_404(BankAccount, id=account_id, customer=customer)
        
        # Remove default status from all other accounts
        BankAccount.objects.filter(customer=customer, is_default=True).update(is_default=False)
        
        # Set the selected account as default
        bank_account.is_default = True
        bank_account.save()
        
        return Response({
            'message': 'Default bank account updated successfully',
            'bank_account': BankAccountSerializer(bank_account).data
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def setup_google_auth(request):
    """
    Setup Google Authenticator for admin only
    """
    user = request.user
    
    # Only allow admin to setup 2FA
    if not user.is_superuser:
        return Response({"error": "Only admin can setup Google Authenticator"}, status=403)
    
    # Generate secret key if not exists
    secret = user.generate_google_auth_secret()
    
    # Generate QR code with custom app name
    app_name = "MHHB"  # You can change this to your desired app name
    qr_uri = f"otpauth://totp/{app_name}:{user.username}?secret={secret}&issuer={app_name}"
    img = qrcode.make(qr_uri)
    
    # Convert QR code to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return Response({
        "secret": secret,
        "qr_code": qr_base64,
        "message": "Please scan this QR code with Google Authenticator app"
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_google_auth_setup(request):
    """
    Verify Google Authenticator setup for admin
    """
    user = request.user
    code = request.data.get('code')
    
    if not user.is_superuser:
        return Response({"error": "Only admin can verify Google Authenticator"}, status=403)
    
    if not code:
        return Response({"error": "Verification code is required"}, status=400)
    
    if user.verify_google_auth_code(code):
        user.is_admin_2fa_enabled = True
        user.save()
        return Response({"message": "Google Authenticator setup verified successfully"})
    
    return Response({"error": "Invalid verification code"}, status=400)
