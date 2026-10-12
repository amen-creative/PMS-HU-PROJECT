from rest_framework import viewsets, permissions
from django.db.models import Q
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('performed_by')
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Role-based filtering
        if user.role in ['ADMIN', 'IT_OFFICER']:
            # Apply filters if provided
            target_model = self.request.query_params.get('target_model')
            target_id = self.request.query_params.get('target_id')
            action = self.request.query_params.get('action')
            date_from = self.request.query_params.get('date_from')
            date_to = self.request.query_params.get('date_to')
            
            if target_model:
                queryset = queryset.filter(target_model=target_model)
            if target_id:
                queryset = queryset.filter(target_id=target_id)
            if action:
                queryset = queryset.filter(action__icontains=action)
            if date_from:
                queryset = queryset.filter(timestamp__gte=date_from)
            if date_to:
                queryset = queryset.filter(timestamp__lte=date_to)
            
            return queryset
        return queryset.none()

