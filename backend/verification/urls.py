from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VerificationLogViewSet, QRVerifyAPIView

router = DefaultRouter()
router.register(r'logs', VerificationLogViewSet, basename='verificationlog')

urlpatterns = [
    path('', include(router.urls)),
    path('verify/', QRVerifyAPIView.as_view(), name='qr-verify'),
]
