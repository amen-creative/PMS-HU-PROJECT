from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count
from django.db import models
from django.utils import timezone

from .models import GuestUser, GuestPropertyAccess
from .guest_serializers import (
    GuestUserSerializer, 
    GuestUserCreateSerializer, 
    GuestUserUpdateSerializer,
    GuestPropertyAccessSerializer
)
from .permissions import IsAdminOrPropertyOfficer
from properties.models import Property
from audits.services import log_activity


class GuestUserListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = GuestUserSerializer
    permission_classes = [IsAuthenticated, IsAdminOrPropertyOfficer]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.role in {"ADMIN", "PROPERTY_OFFICER"}:
            return GuestUser.objects.select_related("access_granted_by")
        return GuestUser.objects.filter(access_granted_by=user)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return GuestUserCreateSerializer
        return GuestUserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer_class(
            data=request.data, 
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        guest_user = serializer.save()
        
        log_activity(
            actor=request.user,
            action="GUEST_USER_CREATED",
            message=f"Guest user {guest_user.full_name} created for event {guest_user.event_name}.",
            metadata={"guest_user_id": guest_user.id, "event_name": guest_user.event_name},
        )
        
        return Response(
            GuestUserSerializer(guest_user, context={"request": request}).data,
            status=status.HTTP_201_CREATED
        )


class GuestUserDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GuestUserUpdateSerializer
    permission_classes = [IsAuthenticated, IsAdminOrPropertyOfficer]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.role in {"ADMIN", "PROPERTY_OFFICER"}:
            return GuestUser.objects.select_related("access_granted_by", "access_revoked_by")
        return GuestUser.objects.filter(access_granted_by=user)

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return GuestUserUpdateSerializer
        return GuestUserSerializer

    def update(self, request, *args, **kwargs):
        guest_user = self.get_object()
        old_status = guest_user.is_active
        
        serializer = self.get_serializer_class(
            instance=guest_user,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        updated_guest = serializer.save()
        
        # Log deactivation if status changed
        if old_status and not updated_guest.is_active:
            updated_guest.access_revoked_by = request.user
            updated_guest.save(update_fields=["access_revoked_by"])
            
            log_activity(
                actor=request.user,
                action="GUEST_ACCESS_REVOKED",
                message=f"Guest access revoked for {updated_guest.full_name}.",
                metadata={"guest_user_id": updated_guest.id},
            )
        
        return Response(
            GuestUserSerializer(updated_guest, context={"request": request}).data
        )

    def destroy(self, request, *args, **kwargs):
        guest_user = self.get_object()
        
        log_activity(
            actor=request.user,
            action="GUEST_USER_DELETED",
            message=f"Guest user {guest_user.full_name} deleted.",
            metadata={"guest_user_id": guest_user.id},
        )
        
        return super().destroy(request, *args, **kwargs)


class GuestPropertyAccessListAPIView(generics.ListCreateAPIView):
    serializer_class = GuestPropertyAccessSerializer
    permission_classes = [IsAuthenticated, IsAdminOrPropertyOfficer]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.role in {"ADMIN", "PROPERTY_OFFICER"}:
            return GuestPropertyAccess.objects.select_related("guest_user", "property", "granted_by")
        return GuestPropertyAccess.objects.filter(granted_by=user)

    def create(self, request, *args, **kwargs):
        guest_user_id = request.data.get("guest_user")
        property_id = request.data.get("property")
        
        try:
            guest_user = GuestUser.objects.get(id=guest_user_id)
            property_obj = Property.objects.get(id=property_id)
            
            # Check if access already exists
            if GuestPropertyAccess.objects.filter(
                guest_user=guest_user, 
                property=property_obj
            ).exists():
                return Response(
                    {"detail": "Guest already has access to this property."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            access = GuestPropertyAccess.objects.create(
                guest_user=guest_user,
                property=property_obj,
                granted_by=request.user,
                notes=request.data.get("notes", "")
            )
            
            log_activity(
                actor=request.user,
                action="GUEST_PROPERTY_ACCESS_GRANTED",
                message=f"Property {property_obj.title} access granted to {guest_user.full_name}.",
                property_obj=property_obj,
                metadata={
                    "guest_user_id": guest_user.id, 
                    "property_id": property_obj.id
                },
            )
            
            return Response(
                GuestPropertyAccessSerializer(access, context={"request": request}).data,
                status=status.HTTP_201_CREATED
            )
            
        except (GuestUser.DoesNotExist, Property.DoesNotExist):
            return Response(
                {"detail": "Guest user or property not found."},
                status=status.HTTP_404_NOT_FOUND
            )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def guest_statistics(request):
    """Get guest user statistics"""
    user = request.user
    
    if not (user.is_superuser or user.role in {"ADMIN", "PROPERTY_OFFICER"}):
        return Response(
            {"detail": "Permission denied."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    total_guests = GuestUser.objects.count()
    active_guests = GuestUser.objects.filter(
        is_active=True, 
        event_end_date__gt=timezone.now()
    ).count()
    expired_guests = GuestUser.objects.filter(
        event_end_date__lt=timezone.now()
    ).count()
    
    # Access by event
    event_stats = list(
        GuestUser.objects.values("event_name")
        .annotate(
            guest_count=models.Count("id"),
            active_count=models.Count("id", filter=models.Q(is_active=True))
        )
        .order_by("-guest_count")[:10]
    )
    
    return Response({
        "total_guests": total_guests,
        "active_guests": active_guests,
        "expired_guests": expired_guests,
        "event_statistics": event_stats,
        "recent_guests": GuestUserSerializer(
            GuestUser.objects.order_by("-created_at")[:10],
            many=True,
            context={"request": request}
        ).data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def guest_property_verification(request):
    """Guest user property verification endpoint"""
    guest_code = request.GET.get("guest_code")
    property_id = request.GET.get("property_id")
    
    if not guest_code or not property_id:
        return Response(
            {"detail": "Guest code and property ID required."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        guest_user = GuestUser.objects.get(
            guest_code=guest_code,
            is_active=True
        )
        
        if guest_user.is_expired:
            return Response(
                {"detail": "Guest access has expired."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if guest has access to this property
        has_access = GuestPropertyAccess.objects.filter(
            guest_user=guest_user,
            property_id=property_id,
            is_active=True
        ).exists()
        
        if not has_access:
            return Response(
                {"detail": "Guest does not have access to this property."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        property_obj = Property.objects.get(id=property_id)
        
        # Log verification
        log_activity(
            actor=None,  # Guest user
            action="GUEST_PROPERTY_VERIFIED",
            message=f"Guest {guest_user.full_name} verified property {property_obj.title}.",
            property_obj=property_obj,
            metadata={
                "guest_user_id": guest_user.id,
                "guest_code": str(guest_code),
                "verification_method": "guest_code"
            },
        )
        
        return Response({
            "success": True,
            "message": "Property verification successful",
            "property": {
                "title": property_obj.title,
                "serial_number": property_obj.serial_number,
                "owner_name": property_obj.owner.username if property_obj.owner else None,
                "department": property_obj.department,
            },
            "guest_info": {
                "full_name": guest_user.full_name,
                "event_name": guest_user.event_name,
                "access_level": guest_user.access_level,
            }
        })
        
    except GuestUser.DoesNotExist:
        return Response(
            {"detail": "Invalid guest code."},
            status=status.HTTP_404_NOT_FOUND
        )
    except Property.DoesNotExist:
        return Response(
            {"detail": "Property not found."},
            status=status.HTTP_404_NOT_FOUND
        )
