from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source='performed_by.full_name', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'audit_id', 'action', 'performed_by', 'performed_by_name',
            'target_model', 'target_id', 'details', 'timestamp'
        ]
        read_only_fields = ['audit_id', 'timestamp']
