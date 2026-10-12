import re

from rest_framework import serializers

from .models import Guest


class GuestSerializer(serializers.ModelSerializer):
    registered_by_name = serializers.CharField(source="registered_by.full_name", read_only=True)
    property_name = serializers.CharField(source="property.title", read_only=True)
    property_serial_number = serializers.CharField(source="property.serial_number", read_only=True)
    property_photo = serializers.ImageField(source="property.image", read_only=True)
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = Guest
        fields = [
            "guest_id",
            "full_name",
            "email",
            "contact_number",
            "purpose_of_visit",
            "property",
            "property_name",
            "property_serial_number",
            "property_photo",
            "guest_image",
            "entry_date",
            "exit_date",
            "national_id_number",
            "status",
            "registered_by",
            "registered_by_name",
            "created_at",
            "days_remaining",
        ]
        read_only_fields = ["guest_id", "entry_date", "created_at", "registered_by"]
        extra_kwargs = {"national_id_number": {"write_only": True}}

    def get_days_remaining(self, obj):
        from django.utils import timezone

        today = timezone.now().date()
        if obj.exit_date >= today:
            return (obj.exit_date - today).days
        return 0


class GuestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = [
            "full_name",
            "contact_number",
            "purpose_of_visit",
            "exit_date",
            "national_id_number",
        ]
        extra_kwargs = {
            "contact_number": {"required": True},
            "purpose_of_visit": {"required": True},
            "exit_date": {"required": True},
            "national_id_number": {"required": True},
        }

    def validate_contact_number(self, value):
        if not value:
            raise serializers.ValidationError("Contact number is required.")
        if not re.fullmatch(r"\d{10}", value):
            raise serializers.ValidationError("Phone number must be exactly 10 digits.")
        return value

    def validate_exit_date(self, value):
        from django.utils import timezone
        if value <= timezone.now().date():
            raise serializers.ValidationError("Exit date must be in the future.")
        return value


class GuestViewNidSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True)
