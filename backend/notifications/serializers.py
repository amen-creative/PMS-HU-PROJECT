from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    notification_id = serializers.IntegerField(source="id", read_only=True)
    notification_type = serializers.CharField(source="type", read_only=True)
    property_id = serializers.IntegerField(read_only=True)
    property_title = serializers.CharField(source="property.title", read_only=True)

    class Meta:
        model = Notification
        fields = [
            'notification_id', 'recipient', 'title', 'message', 'notification_type',
            'is_read', 'property_id', 'property_title', 'related_object_type',
            'related_object_id', 'created_at', 'read_at', 'updated_at'
        ]
        read_only_fields = ['notification_id', 'created_at', 'read_at', 'updated_at']
