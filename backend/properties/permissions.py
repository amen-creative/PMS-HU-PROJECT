from rest_framework.permissions import BasePermission, SAFE_METHODS


def _is_admin(user):
    return bool(user and user.is_authenticated and (user.is_superuser or user.role == "ADMIN"))


def _is_staff_level(user):
    return bool(
        user
        and user.is_authenticated
        and (user.is_superuser or user.role in {"ADMIN", "PROPERTY_OFFICER", "STAFF"})
    )


class IsAdmin(BasePermission):
    """
    Allow only users with ADMIN role.
    """

    def has_permission(self, request, view):
        return _is_admin(request.user)


class IsAdminOrReadOnly(BasePermission):
    """
    Authenticated users can read.
    Only ADMIN role can write.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return _is_admin(request.user)


class IsAdminOrStaff(BasePermission):
    """
    Allow create/update/delete for ADMIN, PROPERTY_OFFICER, and STAFF users.
    """

    def has_permission(self, request, view):
        return _is_staff_level(request.user)
