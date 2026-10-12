from rest_framework import serializers
from .models import StudentDevice


class StudentDeviceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.full_name', read_only=True)
    
    class Meta:
        model = StudentDevice
        fields = [
            'student_device_id', 'student', 'student_name', 'student_id_number',
            'department', 'department_name', 'year_of_study', 'photo_url',
            'pc_image_url', 'serial_number_submitted', 'verification_status',
            'verified_by', 'verified_by_name', 'verified_at', 'rejection_reason',
            'submitted_at'
        ]
        read_only_fields = ['student_device_id', 'submitted_at', 'verified_at']


class StudentDeviceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentDevice
        fields = [
            'student_id_number', 'department', 'year_of_study',
            'photo_url', 'pc_image_url', 'serial_number_submitted'
        ]


class StudentDeviceVerifySerializer(serializers.Serializer):
    verification_status = serializers.ChoiceField(choices=['Verified', 'Rejected'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
