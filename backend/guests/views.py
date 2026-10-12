from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from audits.services import log_activity
from notifications.services import notify_user
from .models import Guest
from .serializers import GuestCreateSerializer, GuestSerializer, GuestViewNidSerializer


class PublicGuestRegistrationSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=100)


class PublicGuestRegistrationView(APIView):
    permission_classes = []

    def post(self, request):
        return Response(
            {
                "error": "Guest self-registration is disabled. A property officer must register the guest temporarily."
            },
            status=status.HTTP_403_FORBIDDEN,
        )


class GuestViewSet(viewsets.ModelViewSet):
    queryset = Guest.objects.select_related("registered_by", "property", "property__created_by")
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return GuestCreateSerializer
        elif self.action == "view_nid":
            return GuestViewNidSerializer
        return GuestSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        if user.role == "ADMIN":
            return queryset
        if user.role == "SECURITY":
            return queryset.filter(registered_by=user)
        return queryset.none()

    def create(self, request):
        if request.user.role not in {"SECURITY", "ADMIN"}:
            return Response(
                {"error": "Only gate security staff can register guest access."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        guest = serializer.save(
            registered_by=request.user,
            status=Guest.STATUS_ACTIVE,
        )

        if guest.property and guest.property.owner:
            notify_user(
                guest.property.owner,
                "SYSTEM",
                "Guest property access registered",
                f"Temporary guest access was registered for {guest.full_name} on property {guest.property.title}.",
                guest.property,
            )

        log_activity(
            actor=request.user,
            action="GUEST_REGISTERED",
            message=f"Guest {guest.full_name} registered for temporary access.",
            property_obj=guest.property,
            metadata={"guest_id": guest.guest_id},
        )

        return Response(GuestSerializer(guest, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def active(self, request):
        queryset = self.get_queryset().filter(status=Guest.STATUS_ACTIVE, exit_date__gte=timezone.now().date())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def view_nid(self, request, pk=None):
        if request.user.role not in ["ADMIN", "PROPERTY_OFFICER", "SECURITY"]:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        guest = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(username=request.user.username, password=serializer.validated_data["password"])
        if not user:
            return Response({"error": "Invalid password"}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            decrypted_nid = Guest.decrypt_nid(guest.national_id_number)
            log_activity(
                actor=request.user,
                action="GUEST_NID_VIEWED",
                message=f"NID viewed for guest {guest.full_name}.",
                property_obj=guest.property,
                metadata={"guest_id": guest.guest_id},
            )
            return Response({"national_id_number": decrypted_nid})
        except Exception:
            return Response({"error": "Failed to decrypt NID"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        if request.user.role not in ["ADMIN", "PROPERTY_OFFICER", "SECURITY"]:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        guest = self.get_object()
        guest.status = Guest.STATUS_ARCHIVED
        guest.save(update_fields=["status"])
        return Response(GuestSerializer(guest, context={"request": request}).data)
