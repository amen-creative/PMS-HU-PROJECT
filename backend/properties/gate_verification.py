from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.utils import timezone
from verification.models import VerificationLog
from audits.services import log_activity
from users.permissions import IsSecurityOfficer, IsStudent
from .models import Property


class GateVerificationView(APIView):
    """Gate verification for student PCs and devices"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Verify a student's device at the gate"""
        property_code = request.data.get('property_code')
        university_id = request.data.get('university_id')
        verification_type = request.data.get('verification_type', 'GATE_ENTRY')
        
        if not property_code or not university_id:
            return Response({
                'error': 'Property code and university ID are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Find the property
            property_obj = Property.objects.get(property_code=property_code)
            
            # Verify the student owns this property
            if not (property_obj.owner == request.user or property_obj.current_assignee == request.user):
                return Response({
                    'error': 'This device is not assigned to you'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Verify university ID matches
            if request.user.university_id != university_id:
                return Response({
                    'error': 'University ID does not match'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if this is a student device that needs verification
            if request.user.role != 'STUDENT':
                return Response({
                    'error': 'Gate verification is only for students'
                }, status=status.HTTP_403_FORBIDDEN)
            
            if not property_obj.category in ['PC', 'LAPTOP', 'COMPUTER']:
                return Response({
                    'error': 'This device type does not require gate verification'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create verification log
            verification_log = VerificationLog.objects.create(
                property=property_obj,
                verified_by=request.user,
                verification_status='VERIFIED',
                verification_method='GATE_SCAN',
                notes=f'Gate verification successful for {property_obj.title}'
            )
            
            # Update property status
            if property_obj.status == 'PENDING_VERIFICATION':
                property_obj.status = 'VERIFIED'
                property_obj.save()
            
            # Log activity
            log_activity(
                actor=request.user,
                action='GATE_VERIFICATION',
                message=f'Student {request.user.username} verified device {property_obj.title} at gate',
                property_obj=property_obj,
                metadata={
                    'verification_type': verification_type,
                    'university_id': university_id,
                    'property_code': str(property_code)
                }
            )
            
            # Get student profile information
            student_user = property_obj.owner if property_obj.owner.role == 'STUDENT' else property_obj.current_assignee
            
            student_info = {
                'id': student_user.id,
                'username': student_user.username,
                'full_name': student_user.get_full_name(),
                'first_name': student_user.first_name,
                'last_name': student_user.last_name,
                'email': student_user.email,
                'university_id': student_user.university_id,
                'phone_number': student_user.phone_number,
                'department': student_user.department,
                'profile_picture_url': None,
                'registration_date': student_user.created_at.isoformat()
            }
            
            # Add profile picture URL if available
            if student_user.profile_picture:
                request_obj = request
                student_info['profile_picture_url'] = request_obj.build_absolute_uri(student_user.profile_picture.url) if student_user.profile_picture else None
            
            return Response({
                'success': True,
                'message': 'Gate verification successful',
                'verification_type': verification_type,
                'device': {
                    'id': property_obj.id,
                    'title': property_obj.title,
                    'category': property_obj.category,
                    'serial_number': property_obj.serial_number,
                    'property_code': str(property_obj.property_code),
                    'status': property_obj.status,
                    'model': property_obj.model,
                    'description': property_obj.description
                },
                'student': student_info,
                'verification': {
                    'verified_by': request.user.username if request.user.is_authenticated else 'System',
                    'verification_time': timezone.now().isoformat(),
                    'location': 'University Gate',
                    'verification_method': 'QR_CODE_SCAN'
                }
            })
            
        except Property.DoesNotExist:
            return Response({
                'error': 'Device not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': f'Verification failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StudentDeviceListView(APIView):
    """List student's devices that need gate verification"""
    permission_classes = [IsAuthenticated, IsStudent]
    
    def get(self, request):
        """Get student's devices with verification status"""
        student_devices = Property.objects.filter(
            Q(owner=request.user) | Q(current_assignee=request.user),
            category__in=['PC', 'LAPTOP', 'COMPUTER']
        ).select_related('owner', 'current_assignee')
        
        devices_data = []
        for device in student_devices:
            devices_data.append({
                'id': device.id,
                'property_code': str(device.property_code),
                'title': device.title,
                'category': device.category,
                'serial_number': device.serial_number,
                'status': device.status,
                'needs_gate_verification': device.status in ['PENDING_VERIFICATION', 'ASSIGNED'],
                'last_verification': VerificationLog.objects.filter(
                    property=device,
                    verification_method='GATE_SCAN'
                ).order_by('-created_at').first(),
                'qr_code': device.qr_code.url if device.qr_code else None
            })
        
        return Response({
            'devices': devices_data,
            'total_devices': len(devices_data),
            'devices_needing_verification': len([d for d in devices_data if d['needs_gate_verification']])
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verification_statistics(request):
    """Get verification statistics for dashboard"""
    if request.user.role != 'STUDENT':
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
    
    student_devices = Property.objects.filter(
        Q(owner=request.user) | Q(current_assignee=request.user),
        category__in=['PC', 'LAPTOP', 'COMPUTER']
    )
    
    stats = {
        'total_devices': student_devices.count(),
        'verified_devices': student_devices.filter(status='VERIFIED').count(),
        'pending_verification': student_devices.filter(status='PENDING_VERIFICATION').count(),
        'assigned_devices': student_devices.filter(status='ASSIGNED').count(),
        'recent_verifications': VerificationLog.objects.filter(
            property__in=student_devices,
            verification_method='GATE_SCAN'
        ).count()
    }
    
    return Response(stats)
