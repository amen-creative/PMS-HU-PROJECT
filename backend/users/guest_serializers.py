from rest_framework import serializers
from django.utils import timezone
import re
from .models import GuestUser, GuestPropertyAccess
from properties.models import Property


class GuestUserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    access_granted_by_name = serializers.CharField(source="access_granted_by.username", read_only=True)
    
    class Meta:
        model = GuestUser
        fields = (
            "id", "guest_code", "first_name", "last_name", "full_name", "email", 
            "phone_number", "organization", "purpose", "access_level", "event_name", 
            "event_start_date", "event_end_date", "is_active", "is_expired",
            "access_granted_by", "access_granted_by_name", "created_at", 
            "updated_at", "last_access", "access_count"
        )
        read_only_fields = ("guest_code", "access_granted_by", "created_at", "access_count")


class GuestPropertyAccessSerializer(serializers.ModelSerializer):
    property_title = serializers.CharField(source="property.title", read_only=True)
    property_serial_number = serializers.CharField(source="property.serial_number", read_only=True)
    granted_by_name = serializers.CharField(source="granted_by.username", read_only=True)
    
    class Meta:
        model = GuestPropertyAccess
        fields = (
            "id", "guest_user", "property", "property_title", "property_serial_number",
            "access_granted_at", "granted_by", "granted_by_name", "notes", "is_active"
        )
        read_only_fields = ("access_granted_at", "granted_by")


class GuestUserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new guest users"""
    property_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of property IDs this guest can access"
    )
    
    class Meta:
        model = GuestUser
        fields = (
            "first_name", "last_name", "email", "phone_number", "organization",
            "purpose", "access_level", "event_name", "event_start_date", 
            "event_end_date", "property_ids"
        )
    
    def validate_event_dates(self, attrs):
        start_date = attrs.get("event_start_date")
        end_date = attrs.get("event_end_date")
        
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError(
                "Event end date must be after start date."
            )
        
        if start_date and start_date < timezone.now():
            raise serializers.ValidationError(
                "Event start date cannot be in the past."
            )
        
        return attrs
    
    def validate_email(self, value):
        if value and not value.lower().endswith("@gmail.com"):
            raise serializers.ValidationError("Only @gmail.com email addresses are allowed.")
        if GuestUser.objects.filter(email__iexact=value, is_active=True).exists():
            raise serializers.ValidationError(
                "A guest user with this email already has active access."
            )
        return value

    def validate_phone_number(self, value):
        if value and not re.fullmatch(r"\d{10}", value):
            raise serializers.ValidationError("Phone number must be exactly 10 digits.")
        return value
    
    def create(self, validated_data):
        property_ids = validated_data.pop("property_ids", [])
        guest_user = GuestUser.objects.create(**validated_data)
        
        # Create property access records
        for property_id in property_ids:
            try:
                property_obj = Property.objects.get(id=property_id)
                GuestPropertyAccess.objects.create(
                    guest_user=guest_user,
                    property=property_obj,
                    granted_by=self.context["request"].user
                )
            except Property.DoesNotExist:
                continue
        
        return guest_user


class GuestUserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating guest users"""
    class Meta:
        model = GuestUser
        fields = (
            "first_name", "last_name", "phone_number", "organization",
            "purpose", "access_level", "event_name", "event_start_date", 
            "event_end_date", "is_active"
        )
    
    def validate_event_dates(self, attrs):
        start_date = attrs.get("event_start_date")
        end_date = attrs.get("event_end_date")
        
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError(
                "Event end date must be after start date."
            )
        
        return attrs

    def validate_phone_number(self, value):
        if value and not re.fullmatch(r"\d{10}", value):
            raise serializers.ValidationError("Phone number must be exactly 10 digits.")
        return value
