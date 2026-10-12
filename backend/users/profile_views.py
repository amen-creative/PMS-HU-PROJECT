from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import models
from django.http import HttpResponse
from django.utils import timezone
from .models import User
from .serializers import UserSerializer, UserUpdateSerializer
from audits.services import log_activity


class UserProfileView(generics.RetrieveUpdateAPIView):
    """User profile view for viewing and updating profile"""
    serializer_class = UserUpdateSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_object(self):
        return self.request.user
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return UserSerializer
        return UserUpdateSerializer
    
    def update(self, request, *args, **kwargs):
        """Update user profile with profile picture and university ID"""
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            # Track changes for logging
            changes = []
            old_values = {}
            new_values = {}
            
            # Check for profile picture change
            if 'profile_picture' in request.FILES and not user.profile_picture:
                changes.append('profile_picture_added')
                old_values['profile_picture'] = None
                new_values['profile_picture'] = request.FILES['profile_picture'].name
            elif 'profile_picture' in request.FILES and user.profile_picture:
                changes.append('profile_picture_updated')
                old_values['profile_picture'] = user.profile_picture.name
                new_values['profile_picture'] = request.FILES['profile_picture'].name
            
            # Check for university ID change
            if 'university_id' in serializer.validated_data:
                new_university_id = serializer.validated_data['university_id']
                if user.university_id != new_university_id:
                    changes.append('university_id_updated')
                    old_values['university_id'] = user.university_id
                    new_values['university_id'] = new_university_id
            
            # Save the updated user
            updated_user = serializer.save()
            
            # Log the profile update
            if changes:
                log_activity(
                    actor=user,
                    action='PROFILE_UPDATED',
                    message=f'User {user.username} updated profile: {", ".join(changes)}',
                    metadata={
                        'changes': changes,
                        'old_values': old_values,
                        'new_values': new_values,
                        'updated_at': timezone.now().isoformat()
                    }
                )
            
            # Return updated user data
            response_serializer = UserSerializer(updated_user, context={'request': request})
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'user': response_serializer.data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile_detail(request):
    """Get detailed user profile information"""
    user = request.user
    serializer = UserSerializer(user, context={'request': request})
    
    return Response({
        'success': True,
        'user': serializer.data,
        'profile_completion': {
            'has_profile_picture': bool(user.profile_picture),
            'has_university_id': bool(user.university_id),
            'has_phone': bool(user.phone_number),
            'has_position': bool(user.position),
            'has_department': bool(user.department),
            'completion_percentage': _calculate_profile_completion(user)
        }
    })


def _calculate_profile_completion(user):
    """Calculate profile completion percentage"""
    fields = [
        bool(user.first_name),
        bool(user.last_name),
        bool(user.email),
        bool(user.phone_number),
        bool(user.position),
        bool(user.department),
        bool(user.university_id),
        bool(user.profile_picture)
    ]
    completed = sum(fields)
    return int((completed / len(fields)) * 100)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_profile_picture(request):
    """Upload profile picture separately"""
    if 'profile_picture' not in request.FILES:
        return Response({
            'error': 'No profile picture provided'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = request.user
    old_picture = user.profile_picture
    
    # Update profile picture
    user.profile_picture = request.FILES['profile_picture']
    user.save()
    
    # Delete old picture if exists
    if old_picture:
        try:
            old_picture.delete(save=False)
        except:
            pass
    
    # Log the upload
    log_activity(
        actor=user,
        action='PROFILE_PICTURE_UPLOADED',
        message=f'User {user.username} uploaded new profile picture',
        metadata={
            'filename': request.FILES['profile_picture'].name,
            'file_size': request.FILES['profile_picture'].size,
            'uploaded_at': timezone.now().isoformat()
        }
    )
    
    # Return updated user data
    serializer = UserSerializer(user, context={'request': request})
    return Response({
        'success': True,
        'message': 'Profile picture uploaded successfully',
        'user': serializer.data
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_profile_picture(request):
    """Remove profile picture"""
    user = request.user
    
    if not user.profile_picture:
        return Response({
            'error': 'No profile picture to remove'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Delete profile picture
    old_picture = user.profile_picture
    user.profile_picture = None
    user.save()
    
    # Delete file
    try:
        old_picture.delete(save=False)
    except:
        pass
    
    # Log the removal
    log_activity(
        actor=user,
        action='PROFILE_PICTURE_REMOVED',
        message=f'User {user.username} removed profile picture',
        metadata={
            'removed_at': timezone.now().isoformat()
        }
    )
    
    # Return updated user data
    serializer = UserSerializer(user, context={'request': request})
    return Response({
        'success': True,
        'message': 'Profile picture removed successfully',
        'user': serializer.data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change user password"""
    user = request.user
    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')

    if not current_password or not new_password:
        return Response({'error': 'Current and new password are required'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 8:
        return Response({'error': 'New password must be at least 8 characters'}, status=status.HTTP_400_BAD_REQUEST)

    if not user.check_password(current_password):
        return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()

    log_activity(
        actor=user,
        action='PASSWORD_CHANGED',
        message=f'User {user.username} changed their password',
        metadata={'changed_at': timezone.now().isoformat()},
    )

    return Response({'success': True, 'message': 'Password changed successfully'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_user_data(request):
    """Export all data associated with the authenticated user"""
    import json
    from properties.models import Property
    from assignments.models import Assignment, TransferRequest
    from incidents.models import Incident

    user = request.user
    data = {
        'user': UserSerializer(user, context={'request': request}).data,
        'properties': list(Property.objects.filter(
            models.Q(owner=user) | models.Q(current_assignee=user)
        ).values('id', 'title', 'serial_number', 'category', 'status', 'department')),
        'assignments': list(Assignment.objects.filter(
            models.Q(requested_by=user) | models.Q(approved_by=user)
        ).values('assignment_id', 'status', 'requested_at')),
        'transfers': list(TransferRequest.objects.filter(
            models.Q(from_user=user) | models.Q(to_user=user)
        ).values('transfer_id', 'status', 'reason', 'created_at')),
        'incidents': list(Incident.objects.filter(
            reported_by=user
        ).values('incident_id', 'tracking_number', 'incident_type', 'status', 'created_at')),
        'exported_at': timezone.now().isoformat(),
    }

    response = HttpResponse(json.dumps(data, default=str, indent=2), content_type='application/json')
    response['Content-Disposition'] = f'attachment; filename="user_data_{user.username}.json"'
    return response
