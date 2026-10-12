from rest_framework import generics, viewsets
from rest_framework.permissions import IsAuthenticated

from audits.services import log_activity
from .models import User
from .serializers import UserAdminSerializer, UserSerializer


class UserListAPIView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = User.objects.select_related("department_ref").order_by("username")

        if user.is_superuser or user.role in {"ADMIN", "PROPERTY_OFFICER"}:
            return queryset

        if user.role == "DEPT_HEAD" and user.department:
            return queryset.filter(department__iexact=user.department)

        return queryset.filter(id=user.id)


class UserManagementViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related("department_ref").order_by("username")
    serializer_class = UserAdminSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_superuser or self.request.user.role == "ADMIN":
            return super().get_queryset()
        return User.objects.none()

    def create(self, request, *args, **kwargs):
        if not (request.user.is_superuser or request.user.role == "ADMIN"):
            from rest_framework.response import Response
            return Response({"detail": "Only the System Administrator can manage users."}, status=403)
        response = super().create(request, *args, **kwargs)
        created_user = User.objects.filter(pk=response.data.get("id")).first()
        if created_user:
            generated_password = getattr(created_user, "_generated_password", None)
            if generated_password:
                response.data["temporary_password"] = generated_password
            log_activity(
                actor=request.user,
                action="USER_CREATED",
                message=f"User {created_user.username} created.",
                metadata={"user_id": created_user.id, "role": created_user.role},
            )
        return response

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        target_user = self.get_object()
        if getattr(target_user, "_generated_password", None):
            response.data["temporary_password"] = target_user._generated_password
        log_activity(
            actor=request.user,
            action="USER_UPDATED",
            message=f"User {target_user.username} updated.",
            metadata={"user_id": target_user.id, "role": target_user.role},
        )
        return response

    def destroy(self, request, *args, **kwargs):
        target_user = self.get_object()
        username = target_user.username
        user_id = target_user.id
        response = super().destroy(request, *args, **kwargs)
        log_activity(
            actor=request.user,
            action="USER_DELETED",
            message=f"User {username} deleted.",
            metadata={"user_id": user_id},
        )
        return response
