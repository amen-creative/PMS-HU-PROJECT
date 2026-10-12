from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IncidentViewSet, EscalationLogViewSet

router = DefaultRouter()
router.register(r'', IncidentViewSet, basename='incident')
router.register(r'escalations', EscalationLogViewSet, basename='escalation')

urlpatterns = [
    path('', include(router.urls)),
]
