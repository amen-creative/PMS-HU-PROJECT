from rest_framework.permissions import BasePermission


def has_any_role(user, roles):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return getattr(user, "role", None) in roles


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, {"ADMIN"})


class IsPropertyOfficer(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, {"ADMIN", "PROPERTY_OFFICER"})


class IsDepartmentHead(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, {"ADMIN", "DEPT_HEAD"})


class IsSecurityOfficer(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, {"ADMIN", "SECURITY"})


class IsITOfficer(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, {"ADMIN"})


class IsAdminOrPropertyOfficer(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, {"ADMIN", "PROPERTY_OFFICER"})


class IsPropertyCreator(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, {"ADMIN", "PROPERTY_OFFICER"})


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return has_any_role(request.user, {"STUDENT"})


class CanManageStudentAssets(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            request.user.is_superuser or 
            request.user.role in {"ADMIN", "PROPERTY_OFFICER", "DEPT_HEAD", "SECURITY"}
        )


class IsGuestUser(BasePermission):
    """
    Check if user is authenticated as guest user.
    """
    
    def has_permission(self, request, view):
        # Guest users authenticate via guest_code, not JWT
        return True  # Will be handled in view logic


class CanManageGuestUsers(BasePermission):
    """
    Allows access only to users who can manage guest users.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        return (
            request.user.is_superuser or 
            request.user.role in {"ADMIN", "PROPERTY_OFFICER", "DEPT_HEAD"}
        )


class CanVerifyAsGuest(BasePermission):
    """
    Check if guest user can verify property.
    """
    
    def has_object_permission(self, request, view, obj):
        # This will be handled in guest verification logic
        return True
