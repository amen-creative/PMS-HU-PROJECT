from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from .models import SystemSettings
from .serializers import SystemSettingsSerializer


class SystemSettingsViewSet(viewsets.ModelViewSet):
    queryset = SystemSettings.objects.all()
    serializer_class = SystemSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            from users.permissions import IsAdmin
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    def list(self, request):
        # Return the single settings record
        settings_obj = SystemSettings.objects.first()
        if not settings_obj:
            # Create default settings if none exist
            settings_obj = SystemSettings.objects.create()
        serializer = self.get_serializer(settings_obj)
        return Response(serializer.data)

    def create(self, request):
        # Only one settings record allowed
        if SystemSettings.objects.exists():
            return Response({'error': 'Settings already exist. Use PATCH to update.'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        
        # Log the change in AuditLog
        from audits.models import AuditLog
        AuditLog.objects.create(
            action='SETTINGS_CREATED',
            performed_by=request.user,
            target_model='SystemSettings',
            target_id=serializer.instance.settings_id,
            details=serializer.validated_data
        )
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        
        # Log the change in AuditLog
        from audits.models import AuditLog
        AuditLog.objects.create(
            action='SETTINGS_UPDATED',
            performed_by=request.user,
            target_model='SystemSettings',
            target_id=instance.settings_id,
            details=serializer.validated_data
        )
        
        return Response(serializer.data)
