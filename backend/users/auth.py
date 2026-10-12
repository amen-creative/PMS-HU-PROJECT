from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
from rest_framework import serializers, status
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from .models import GuestUser, GuestPropertyAccess
from guests.models import Guest
from notifications.services import notify_user

class LoginTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Accept either username or email for login.
    Falls back to default SimpleJWT flow for password verification.
    """

    email = serializers.EmailField(required=False, write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields[self.username_field].required = False
        # Ensure password field is required
        self.fields['password'].required = True

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["role"] = user.role
        token["department"] = user.department
        return token

    def validate(self, attrs):
        username = attrs.get("username")
        email = attrs.get("email")
        User = get_user_model()

        if not username and not email:
            raise serializers.ValidationError(
                {"detail": "Provide username or email and password."}
            )

        login_user = None
        if email and not username:
            users = User.objects.filter(email__iexact=email)
            if users.count() > 1:
                raise serializers.ValidationError(
                    {"detail": "Multiple users found for this email. Please use username."}
                )
            if not users.exists():
                raise serializers.ValidationError({"detail": "Invalid login credentials."})
            login_user = users.first()
            attrs["username"] = login_user.get_username()
        elif username:
            login_user = User.objects.filter(username__iexact=username).first()

        if login_user:
            if login_user.is_locked:
                raise serializers.ValidationError(
                    {"detail": "This account is locked. Please contact the System Administrator."}
                )
            if not login_user.is_active:
                raise serializers.ValidationError(
                    {"detail": "This account has been deactivated. Access is blocked."}
                )

        try:
            data = super().validate(attrs)
        except serializers.ValidationError:
            if login_user and check_password(attrs.get("password", ""), login_user.password):
                raise
            if login_user:
                login_user.register_failed_login()
                if login_user.is_locked:
                    admin_user = User.objects.filter(role="ADMIN", is_active=True).exclude(pk=login_user.pk).first()
                    notify_user(
                        admin_user,
                        "SECURITY_ALERT",
                        "Account locked after failed login attempts",
                        f"User {login_user.username} was locked after three consecutive failed login attempts.",
                    )
                    raise serializers.ValidationError(
                        {"detail": "Your account has been locked after three failed login attempts."}
                    )
            raise serializers.ValidationError({"detail": "Invalid login credentials."})

        if login_user:
            login_user.clear_login_failures()
        
        data["username"] = self.user.username
        data["role"] = self.user.role
        data["department"] = self.user.department
        data["token"] = data["access"]
        return data


class LoginTokenObtainPairView(TokenObtainPairView):
    serializer_class = LoginTokenObtainPairSerializer


class GuestAuthenticationSerializer(serializers.Serializer):
    """Guest user authentication using contact number and national ID"""
    contact_number = serializers.CharField(write_only=True)
    national_id_number = serializers.CharField(write_only=True)

    def validate(self, attrs):
        contact_number = attrs.get("contact_number")
        national_id_number = attrs.get("national_id_number")

        if not contact_number or not national_id_number:
            raise serializers.ValidationError({
                "detail": "Provide contact number and national ID for authentication."
            })

        try:
            # Try to find guest by contact number first
            guest = Guest.objects.get(
                contact_number=contact_number,
                status='Active'
            )
            
            # Verify NID by decrypting the stored value
            try:
                stored_nid_decrypted = Guest.decrypt_nid(guest.national_id_number)
                if stored_nid_decrypted != national_id_number:
                    raise serializers.ValidationError({
                        "detail": "Invalid guest credentials. Please check with security."
                    })
            except Exception as e:
                # If decryption fails, try direct comparison (in case it wasn't encrypted)
                if guest.national_id_number != national_id_number:
                    raise serializers.ValidationError({
                        "detail": "Invalid guest credentials. Please check with security."
                    })
            
            # Check if guest exit date has passed
            if guest.exit_date < timezone.now().date():
                raise serializers.ValidationError({
                    "detail": "Guest access has expired."
                })

            return {
                "guest": guest,
                "full_name": guest.full_name,
                "contact_number": guest.contact_number,
                "purpose_of_visit": guest.purpose_of_visit,
                "entry_date": guest.entry_date,
                "exit_date": guest.exit_date,
            }
            
        except Guest.DoesNotExist:
            raise serializers.ValidationError({
                "detail": "Invalid guest credentials. Please check with security."
            })


class GuestAuthenticationView(APIView):
    """Guest user authentication endpoint"""
    permission_classes = []

    def post(self, request):
        return Response(
            {
                "detail": "Guest login is disabled. Guests must be registered temporarily by a Property officer."
            },
            status=status.HTTP_403_FORBIDDEN,
        )
