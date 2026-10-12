from rest_framework import serializers
import re
from .models import Department, User


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ("id", "name", "code", "is_active")


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    department_details = DepartmentSerializer(source="department_ref", read_only=True)
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "position",
            "department",
            "department_ref",
            "department_details",
            "phone_number",
            "profile_picture",
            "profile_picture_url",
            "university_id",
            "is_active",
        )
        read_only_fields = ("id",)

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username
    
    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile including profile picture and university ID"""
    
    class Meta:
        model = User
        fields = (
            "first_name",
            "last_name",
            "email",
            "position",
            "department",
            "phone_number",
            "profile_picture",
            "university_id",
        )
    
    def validate_university_id(self, value):
        """Validate university ID is unique"""
        if value:
            user = self.instance
            if User.objects.exclude(pk=user.pk if user else None).filter(university_id=value).exists():
                raise serializers.ValidationError("University ID already exists.")
        return value
    
    def validate_email(self, value):
        """Validate email is unique"""
        user = self.instance
        if value and not value.lower().endswith("@gmail.com"):
            raise serializers.ValidationError("Only @gmail.com email addresses are allowed.")
        if User.objects.exclude(pk=user.pk if user else None).filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already exists.")
        return value

    def validate_phone_number(self, value):
        if value and not re.fullmatch(r"\d{10}", value):
            raise serializers.ValidationError("Phone number must be exactly 10 digits.")
        return value

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class UserAdminSerializer(serializers.ModelSerializer):
    temporary_password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "position",
            "department",
            "department_ref",
            "phone_number",
            "university_id",
            "is_active",
            "failed_login_attempts",
            "is_locked",
            "temporary_password",
        )
        read_only_fields = ("id", "failed_login_attempts")

    def validate_email(self, value):
        if value and not value.lower().endswith("@gmail.com"):
            raise serializers.ValidationError("Only @gmail.com email addresses are allowed.")
        queryset = User.objects.exclude(pk=self.instance.pk if self.instance else None)
        if value and queryset.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already exists.")
        return value

    def validate_username(self, value):
        queryset = User.objects.exclude(pk=self.instance.pk if self.instance else None)
        if queryset.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def validate_phone_number(self, value):
        if value and not re.fullmatch(r"\d{10}", value):
            raise serializers.ValidationError("Phone number must be exactly 10 digits.")
        return value

    def create(self, validated_data):
        temp_password = validated_data.pop("temporary_password", "") or User.objects.make_random_password()
        user = User(**validated_data)
        user.set_password(temp_password)
        user.save()
        user._generated_password = temp_password
        return user

    def update(self, instance, validated_data):
        temp_password = validated_data.pop("temporary_password", "")
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if validated_data.get("is_locked") is False:
            instance.failed_login_attempts = 0
            instance.locked_at = None
        if temp_password:
            instance.set_password(temp_password)
            instance._generated_password = temp_password
        instance.save()
        return instance
