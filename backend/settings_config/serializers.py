from rest_framework import serializers
from .models import SystemSettings


class SystemSettingsSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(source='updated_by.full_name', read_only=True)
    
    class Meta:
        model = SystemSettings
        fields = [
            'settings_id', 'first_escalation_hours', 'admin_escalation_hours',
            'email_templates', 'updated_at', 'updated_by', 'updated_by_name'
        ]
        read_only_fields = ['settings_id', 'updated_at']

    def validate_first_escalation_hours(self, value):
        if value < 0:
            raise serializers.ValidationError("First escalation hours cannot be negative.")
        return value

    def validate_admin_escalation_hours(self, value):
        if value < 0:
            raise serializers.ValidationError("Admin escalation hours cannot be negative.")
        return value

    def validate(self, attrs):
        first = attrs.get("first_escalation_hours", getattr(self.instance, "first_escalation_hours", 48))
        admin = attrs.get("admin_escalation_hours", getattr(self.instance, "admin_escalation_hours", 96))
        if admin < first:
            raise serializers.ValidationError(
                {"admin_escalation_hours": "Admin escalation must be greater than or equal to first escalation."}
            )
        return attrs
