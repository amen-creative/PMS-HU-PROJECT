from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentDeviceViewSet

router = DefaultRouter()
router.register(r'', StudentDeviceViewSet, basename='studentdevice')

urlpatterns = [
    path('', include(router.urls)),
]
