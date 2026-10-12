from rest_framework import serializers
from .models import Incident, EscalationLog


class IncidentSerializer(serializers.ModelSerializer):
    property_title = serializers.CharField(source='property.title', read_only=True)
    reported_by_name = serializers.CharField(source='reported_by.full_name', read_only=True)
    
    class Meta:
        model = Incident
        fields = [
            'incident_id', 'property', 'property_title', 'incident_type',
            'reported_by', 'reported_by_name', 'report_date', 'incident_date',
            'location', 'description', 'attachment', 'status', 'tracking_number',
            'assigned_officer', 'escalation_sent_at', 'admin_escalation_sent_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['incident_id', 'tracking_number', 'report_date', 'created_at', 'updated_at']


class IncidentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = [
            'property', 'incident_type', 'incident_date', 'location',
            'description', 'attachment'
        ]

    def validate(self, attrs):
        property_obj = attrs.get('property')
        incident_type = attrs.get('incident_type')

        if property_obj and property_obj.status not in ('ASSIGNED', 'REGISTERED', 'AVAILABLE'):
            raise serializers.ValidationError(
                {"property": "Incidents can only be reported for registered, available, or assigned properties."}
            )
        if incident_type and incident_type not in dict(Incident.INCIDENT_TYPE_CHOICES):
            raise serializers.ValidationError(
                {"incident_type": "Invalid incident type. Must be Lost, Stolen, or Damaged."}
            )
        return attrs


class EscalationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EscalationLog
        fields = [
            'escalation_id', 'escalation_type', 'related_model', 'related_id',
            'recipient_email', 'sent_at', 'resolved', 'resolution_note',
            'resolved_at', 'resolved_by'
        ]
        read_only_fields = ['escalation_id', 'sent_at']
