from rest_framework import serializers
from .models import VerificationLog


class VerificationLogSerializer(serializers.ModelSerializer):
    property_title = serializers.CharField(source='property.title', read_only=True)
    scanned_by_name = serializers.CharField(source='scanned_by.full_name', read_only=True)
    
    class Meta:
        model = VerificationLog
        fields = [
            'log_id', 'property', 'property_title', 'scanned_by', 'scanned_by_name',
            'scan_time', 'result', 'details'
        ]
        read_only_fields = ['log_id', 'scan_time']


class QRVerifySerializer(serializers.Serializer):
    qr_payload = serializers.CharField(required=False, allow_blank=True)
    qr_image = serializers.FileField(required=False)

    def validate(self, attrs):
        if not attrs.get("qr_payload") and not attrs.get("qr_image"):
            raise serializers.ValidationError({"qr_payload": "Provide qr_payload or upload qr_image."})
        return attrs
