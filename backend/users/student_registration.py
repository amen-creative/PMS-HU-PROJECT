from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db import transaction
import re
from .models import User
from .serializers import UserSerializer, UserUpdateSerializer
from properties.models import Property
from audits.services import log_activity
import uuid


class StudentRegistrationView(APIView):
    """Student self-registration with PC registration"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Register student and their PC"""
        try:
            with transaction.atomic():
                # Student data
                student_data = {
                    'username': request.data.get('username'),
                    'email': request.data.get('email'),
                    'password': request.data.get('password'),
                    'first_name': request.data.get('first_name'),
                    'last_name': request.data.get('last_name'),
                    'university_id': request.data.get('university_id'),
                    'phone_number': request.data.get('phone_number', ''),
                    'department': request.data.get('department', ''),
                    'position': 'Student',
                    'role': 'STUDENT'
                }
                
                # Validate required fields
                required_fields = ['username', 'email', 'password', 'first_name', 'last_name', 'university_id']
                for field in required_fields:
                    if not student_data.get(field):
                        return Response({
                            'error': f'{field} is required'
                        }, status=status.HTTP_400_BAD_REQUEST)
                
                # Check if user already exists
                if User.objects.filter(username=student_data['username']).exists():
                    return Response({
                        'error': 'Username already exists'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if User.objects.filter(email__iexact=student_data['email']).exists():
                    return Response({
                        'error': 'Email already exists'
                    }, status=status.HTTP_400_BAD_REQUEST)

                if not student_data['email'].lower().endswith('@gmail.com'):
                    return Response({
                        'error': 'Only @gmail.com email addresses are allowed'
                    }, status=status.HTTP_400_BAD_REQUEST)

                if student_data['phone_number'] and not re.fullmatch(r'\d{10}', student_data['phone_number']):
                    return Response({
                        'error': 'Phone number must be exactly 10 digits'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if User.objects.filter(university_id=student_data['university_id']).exists():
                    return Response({
                        'error': 'University ID already exists'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Create student account
                student = User.objects.create_user(
                    username=student_data['username'],
                    email=student_data['email'],
                    password=student_data['password'],
                    first_name=student_data['first_name'],
                    last_name=student_data['last_name'],
                    university_id=student_data['university_id'],
                    phone_number=student_data['phone_number'],
                    department=student_data['department'],
                    position=student_data['position'],
                    role=student_data['role'],
                    is_staff=False,
                    is_superuser=False,
                    is_active=True
                )
                
                # UC-07 Step 7-8: Create StudentDevice with Pending status for cross-check
                # instead of directly creating Property with ASSIGNED status
                serial_number = request.data.get('serial_number')
                if not serial_number:
                    return Response({
                        'error': 'Serial number is required'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Check if serial number already exists in Property or StudentDevice
                if Property.objects.filter(serial_number__iexact=serial_number).exists():
                    return Response({
                        'error': 'PC with this serial number already registered'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                from students.models import StudentDevice
                from departments.models import Department
                
                # Get or infer department
                dept_name = student_data.get('department', '')
                department_obj = Department.objects.filter(name__iexact=dept_name).first() if dept_name else None
                
                # Get year of study
                year_of_study = request.data.get('year_of_study', 1)
                try:
                    year_of_study = int(year_of_study)
                except (ValueError, TypeError):
                    year_of_study = 1
                
                device = StudentDevice(
                    student=student,
                    student_id_number=student_data['university_id'],
                    department=department_obj,
                    year_of_study=year_of_study,
                    serial_number_submitted=serial_number,
                    verification_status='Pending',
                )
                
                # Handle photo uploads (Steps 4-5)
                if request.FILES.get('photo_url'):
                    device.photo_url = request.FILES['photo_url']
                if request.FILES.get('pc_image_url'):
                    device.pc_image_url = request.FILES['pc_image_url']
                
                device.save()
                
                # UC-07 Step 9: Notify IT Officers of new pending cross-check
                from notifications.services import notify_user
                it_officers = User.objects.filter(role='IT_OFFICER', is_active=True)
                security_officers = User.objects.filter(role='SECURITY', is_active=True)
                for officer in list(it_officers) + list(security_officers):
                    if officer:
                        notify_user(
                            officer,
                            "VERIFICATION",
                            "Student device registration",
                            f"New student device registration from {student.get_full_name() or student.username}. Serial: {serial_number}",
                        )
                
                # Log registration
                print(f"Student registration successful: {student.username} - Device serial: {serial_number}")

                # Return success response
                serializer = UserSerializer(student, context={'request': request})
                return Response({
                    'success': True,
                    'message': 'Student registration successful. Your device is pending cross-check verification.',
                    'student': serializer.data,
                    'device': {
                        'student_device_id': device.student_device_id,
                        'serial_number': device.serial_number_submitted,
                        'verification_status': device.verification_status,
                    }
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Registration error: {str(e)}")
            print(f"Traceback: {error_details}")
            
            # Handle specific error types
            error_message = str(e)
            if 'JSON' in error_message or 'unexpected token' in error_message.lower():
                error_message = 'Invalid data format. Please check your input and try again.'
            elif 'IntegrityError' in error_message:
                error_message = 'Data already exists. Please check if username, email, or university ID is already taken.'
            elif 'ValidationError' in error_message:
                error_message = 'Invalid data provided. Please check all required fields.'
            
            return Response({
                'error': error_message,
                'details': str(e) if 'DEBUG' in dir(__import__('django.conf').settings) and __import__('django.conf').settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def check_university_id(request):
    """Check if university ID is available for registration"""
    university_id = request.data.get('university_id')
    
    if not university_id:
        return Response({
            'error': 'University ID is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    exists = User.objects.filter(university_id=university_id).exists()
    
    return Response({
        'available': not exists,
        'message': 'University ID is available' if not exists else 'University ID already registered'
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def check_username(request):
    """Check if username is available for registration"""
    username = request.data.get('username')
    
    if not username:
        return Response({
            'error': 'Username is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    exists = User.objects.filter(username__iexact=username).exists()
    
    return Response({
        'available': not exists,
        'message': 'Username is available' if not exists else 'Username already taken'
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def check_pc_serial(request):
    """Check if PC serial number is already registered"""
    serial_number = request.data.get('serial_number')
    
    if not serial_number:
        return Response({
            'error': 'Serial number is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    exists = Property.objects.filter(serial_number__iexact=serial_number).exists()
    
    return Response({
        'available': not exists,
        'message': 'Serial number is available' if not exists else 'PC with this serial number already registered'
    })
