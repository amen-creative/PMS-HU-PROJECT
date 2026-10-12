from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GuestViewSet, PublicGuestRegistrationView

router = DefaultRouter()
router.register(r'', GuestViewSet, basename='guest')

urlpatterns = [
    path('public-register/', PublicGuestRegistrationView.as_view(), name='public-guest-register'),
    path('', include(router.urls)),
]
