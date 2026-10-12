from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.db import connection, OperationalError, ProgrammingError
import json
import hashlib
from .models import VerificationLog
from .serializers import VerificationLogSerializer, QRVerifySerializer
from notifications.services import notify_user


def _table_exists(model):
    try:
        return model._meta.db_table in connection.introspection.table_names()
    except (ProgrammingError, OperationalError):
        return False


class VerificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VerificationLog.objects.select_related('property', 'scanned_by')
    serializer_class = VerificationLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Role-based filtering
        if user.role in ['ADMIN', 'SECURITY', 'IT_OFFICER']:
            # Filter by property if provided
            property_id = self.request.query_params.get('property')
            if property_id:
                queryset = queryset.filter(property_id=property_id)
            return queryset
        return queryset.none()


class QRVerifyAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != 'SECURITY':
            return Response({'error': 'Only Security officers can verify QR codes'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        serializer = QRVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        qr_payload = serializer.validated_data.get('qr_payload', '')
        qr_image = serializer.validated_data.get('qr_image')

        if not qr_payload and qr_image:
            try:
                qr_payload = qr_image.read().decode("utf-8")
            except Exception:
                return Response(
                    {
                        "result": "QR_Invalid",
                        "message": "Uploaded QR file could not be decoded. For now, upload a text file containing the QR JSON payload.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        
        try:
            # Parse QR payload
            payload_data = json.loads(qr_payload)
            property_id = payload_data.get('property_id')
            serial_number = payload_data.get('serial_number')
            submitted_hash = payload_data.get('qr_hash')
            
            if not all([property_id, serial_number, submitted_hash]):
                return Response({
                    'result': 'QR_Invalid',
                    'message': 'Invalid QR payload format'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Look up property
            from properties.models import Property
            try:
                property = Property.objects.get(pk=property_id)
            except Property.DoesNotExist:
                return Response({
                    'result': 'QR_Invalid',
                    'message': 'Property not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Recompute hash and validate
            qr_secret = getattr(settings, 'QR_SECRET', settings.SECRET_KEY)
            legacy_hash = hashlib.sha256(f"{property_id}|{serial_number}|{qr_secret}".encode()).hexdigest()
            current_hash = property.secure_hash or ""
            
            if submitted_hash not in {legacy_hash, current_hash}:
                # Log ALERT and notify ADMIN
                if _table_exists(VerificationLog):
                    VerificationLog.objects.create(
                        property=property,
                        scanned_by=request.user,
                        result='QR_Invalid',
                        details=json.dumps({
                            'reason': 'Hash mismatch',
                            'submitted_hash': submitted_hash,
                            'legacy_hash': legacy_hash,
                            'current_hash': current_hash
                        })
                    )

                from users.models import User
                admin = User.objects.filter(role='ADMIN').first()
                notify_user(
                    admin,
                    "SECURITY_ALERT",
                    "Invalid QR scan detected",
                    f"SECURITY ALERT: Invalid QR scan detected for property {property.title}",
                    property,
                )
                
                return Response({
                    'result': 'QR_Invalid',
                    'message': 'QR code hash mismatch - possible tampering detected'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check property status
            if property.status in ['LOST', 'DAMAGED', 'Under Investigation']:
                return Response({
                    'result': 'Flagged',
                    'message': f'Property is flagged: {property.status}',
                    'property': {
                        'title': property.title,
                        'serial_number': property.serial_number,
                        'status': property.status
                    }
                })
            
            # Check for student device
            from students.models import StudentDevice
            student_device = StudentDevice.objects.filter(
                serial_number_submitted=serial_number,
                verification_status='Verified'
            ).first()
            
            if student_device:
                return Response({
                    'result': 'Personal_Device',
                    'message': 'This is a verified student personal device',
                    'student': {
                        'name': student_device.student.full_name,
                        'student_id': student_device.student_id_number,
                        'department': student_device.department.name if student_device.department else None
                    },
                    'device': {
                        'serial_number': student_device.serial_number_submitted,
                        'year_of_study': student_device.year_of_study
                    }
                })
            
            # Check assignment/transfer status
            from assignments.models import Assignment
            current_assignment = Assignment.objects.filter(
                property=property,
                status='APPROVED'
            ).first()
            
            if not current_assignment:
                return Response({
                    'result': 'Unauthorized',
                    'message': 'Property is not currently assigned to anyone',
                    'property': {
                        'title': property.title,
                        'serial_number': property.serial_number,
                        'status': property.status
                    }
                })
            
            # Log successful verification
            if _table_exists(VerificationLog):
                VerificationLog.objects.create(
                    property=property,
                    scanned_by=request.user,
                    result='Authorized',
                    details=json.dumps({
                        'assignment_id': current_assignment.assignment_id,
                        'assigned_to': current_assignment.assigned_to.full_name,
                        'assigned_by': current_assignment.assigned_by.full_name if current_assignment.assigned_by else None
                    })
                )
            
            return Response({
                'result': 'Authorized',
                'message': 'Property movement authorized',
                'property': {
                    'title': property.title,
                    'serial_number': property.serial_number,
                    'status': property.status,
                    'condition': property.condition
                },
                'assignment': {
                    'assigned_to': current_assignment.assigned_to.full_name,
                    'assigned_by': current_assignment.assigned_by.full_name if current_assignment.assigned_by else None,
                    'approved_at': current_assignment.approved_at
                }
            })
            
        except json.JSONDecodeError:
            return Response({
                'result': 'QR_Invalid',
                'message': 'Invalid JSON in QR payload'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'result': 'QR_Invalid',
                'message': f'Error processing QR: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def verify_qr_legacy(request, uuid, hash_value):
    """
    Backward-compatible endpoint for old QR URL format.
    """
    from properties.models import Property

    try:
        property_obj = Property.objects.get(property_code=uuid)
    except Property.DoesNotExist:
        return Response({"result": "QR_Invalid", "message": "Property not found"}, status=status.HTTP_404_NOT_FOUND)

    qr_secret = getattr(settings, 'QR_SECRET', settings.SECRET_KEY)
    expected_hash = hashlib.sha256(f"{property_obj.property_id}|{property_obj.serial_number}|{qr_secret}".encode()).hexdigest()
    if hash_value not in {expected_hash, property_obj.secure_hash}:
        return Response({"result": "QR_Invalid", "message": "Invalid QR hash"}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {
            "result": "Authorized",
            "message": "QR verified",
            "property": {
                "property_id": str(property_obj.property_id),
                "title": property_obj.title,
                "serial_number": property_obj.serial_number,
                "status": property_obj.status,
            },
        }
    )
