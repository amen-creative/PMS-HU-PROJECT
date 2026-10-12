from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.mail import send_mail
from django.conf import settings as django_settings
from django.utils import timezone
from .models import StudentDevice
from .serializers import StudentDeviceSerializer, StudentDeviceCreateSerializer, StudentDeviceVerifySerializer
from notifications.services import notify_user
from audits.services import log_activity


class StudentDeviceViewSet(viewsets.ModelViewSet):
    queryset = StudentDevice.objects.select_related('student', 'department', 'verified_by')
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return StudentDeviceCreateSerializer
        elif self.action in ['verify', 'reject']:
            return StudentDeviceVerifySerializer
        return StudentDeviceSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Role-based filtering
        if user.role in ['ADMIN', 'IT_OFFICER', 'SECURITY']:
            return queryset
        elif user.role == 'STUDENT':
            return queryset.filter(student=user)
        return queryset.none()

    def create(self, request):
        if request.user.role != 'STUDENT':
            return Response(
                {'error': 'Only students can register personal devices through this portal.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Set student to current user
        device = serializer.save(student=request.user)
        
        # Create notification for IT Officers and Security
        from users.models import User
        it_officers = User.objects.filter(role='IT_OFFICER')
        security_officers = User.objects.filter(role='SECURITY')
        
        for officer in list(it_officers) + list(security_officers):
            if officer:
                notify_user(
                    officer,
                    "VERIFICATION",
                    "Student device registration",
                    f"New student device registration from {request.user.get_full_name() or request.user.username}. Serial: {device.serial_number_submitted}",
                )
                # UC-07 Step 9: Send email notification to IT Officer
                if officer.email:
                    try:
                        send_mail(
                            subject=f"Student Device Pending Cross-Check: {device.serial_number_submitted}",
                            message=(
                                f"A new student device registration requires cross-check.\n\n"
                                f"Student: {request.user.get_full_name() or request.user.username}\n"
                                f"Student ID: {device.student_id_number}\n"
                                f"Serial Number: {device.serial_number_submitted}\n"
                                f"Submitted: {device.submitted_at}\n\n"
                                f"Please review the cross-check queue at your earliest convenience."
                            ),
                            from_email=django_settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[officer.email],
                            fail_silently=True,
                        )
                    except Exception:
                        pass

        log_activity(
            actor=request.user,
            action="STUDENT_DEVICE_REGISTERED",
            message=f"Student {request.user.username} registered device with serial {device.serial_number_submitted}",
            metadata={"student_device_id": device.student_device_id, "serial_number": device.serial_number_submitted},
        )

        return Response(StudentDeviceSerializer(device).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def my(self, request):
        queryset = self.get_queryset().filter(student=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def queue(self, request):
        """Pending cross-check queue for IT_OFFICER and SECURITY"""
        if request.user.role not in ['IT_OFFICER', 'SECURITY']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        queryset = self.get_queryset().filter(verification_status='Pending')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Mark device as verified - UC-07 Step 12"""
        if request.user.role not in ['IT_OFFICER', 'SECURITY', 'ADMIN']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        device = self.get_object()
        if device.verification_status != 'Pending':
            return Response({'error': 'Only pending devices can be verified'}, status=status.HTTP_400_BAD_REQUEST)

        device.verification_status = 'Verified'
        device.verified_by = request.user
        device.verified_at = timezone.now()
        device.save()

        # UC-07 Step 12: Link device to student profile by creating Property record
        from properties.models import Property
        if not Property.objects.filter(serial_number=device.serial_number_submitted).exists():
            Property.objects.create(
                title=f"{device.student.get_full_name() or device.student.username}'s Personal Device",
                category="PC",
                serial_number=device.serial_number_submitted,
                status='ASSIGNED',
                owner=device.student,
                current_assignee=device.student,
                department=device.student.department,
                created_by=request.user,
                updated_by=request.user,
            )

        # Notify student with confirmation
        notify_user(
            device.student,
            "VERIFICATION",
            "Device verified",
            "Your personal device has been verified and linked to your profile.",
        )

        log_activity(
            actor=request.user,
            action="STUDENT_DEVICE_VERIFIED",
            message=f"Device {device.serial_number_submitted} verified for student {device.student.username}",
            metadata={"student_device_id": device.student_device_id, "serial_number": device.serial_number_submitted},
        )

        return Response(StudentDeviceSerializer(device).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Mark device as rejected - UC-07 Step 13"""
        if request.user.role not in ['IT_OFFICER', 'SECURITY', 'ADMIN']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        device = self.get_object()
        if device.verification_status != 'Pending':
            return Response({'error': 'Only pending devices can be rejected'}, status=status.HTTP_400_BAD_REQUEST)

        device.verification_status = 'Rejected'
        device.verified_by = request.user
        device.verified_at = timezone.now()
        device.rejection_reason = serializer.validated_data.get('rejection_reason', '')
        device.save()

        # Notify student with rejection reason
        notify_user(
            device.student,
            "VERIFICATION",
            "Device rejected",
            f"Your device registration was rejected. Reason: {device.rejection_reason}. You may resubmit with corrected information.",
        )

        log_activity(
            actor=request.user,
            action="STUDENT_DEVICE_REJECTED",
            message=f"Device {device.serial_number_submitted} rejected for student {device.student.username}. Reason: {device.rejection_reason}",
            metadata={"student_device_id": device.student_device_id, "rejection_reason": device.rejection_reason},
        )

        return Response(StudentDeviceSerializer(device).data)

    @action(detail=True, methods=['post'])
    def resubmit(self, request, pk=None):
        """Allow student to resubmit a rejected device - UC-07 Step 13"""
        device = self.get_object()
        if device.student != request.user:
            return Response({'error': 'You can only resubmit your own devices'}, status=status.HTTP_403_FORBIDDEN)
        if device.verification_status != 'Rejected':
            return Response({'error': 'Only rejected devices can be resubmitted'}, status=status.HTTP_400_BAD_REQUEST)

        # Update fields from resubmission
        if request.data.get('serial_number_submitted'):
            device.serial_number_submitted = request.data.get('serial_number_submitted')
        if request.data.get('photo_url'):
            device.photo_url = request.data.get('photo_url')
        if request.data.get('pc_image_url'):
            device.pc_image_url = request.data.get('pc_image_url')

        device.verification_status = 'Pending'
        device.verified_by = None
        device.verified_at = None
        device.rejection_reason = None
        device.save()

        # Notify IT Officers of resubmission
        from users.models import User
        it_officers = User.objects.filter(role='IT_OFFICER', is_active=True)
        security_officers = User.objects.filter(role='SECURITY', is_active=True)
        for officer in list(it_officers) + list(security_officers):
            if officer:
                notify_user(
                    officer,
                    "VERIFICATION",
                    "Student device resubmitted",
                    f"Device from {request.user.get_full_name() or request.user.username} has been resubmitted for cross-check.",
                )

        log_activity(
            actor=request.user,
            action="STUDENT_DEVICE_RESUBMITTED",
            message=f"Student {request.user.username} resubmitted device with serial {device.serial_number_submitted}",
            metadata={"student_device_id": device.student_device_id},
        )

        return Response(StudentDeviceSerializer(device).data)
