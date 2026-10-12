from django.urls import path
from . import guest_views
from .auth import GuestAuthenticationView

app_name = 'guests'

urlpatterns = [
    # Guest User Management
    path('', guest_views.GuestUserListCreateAPIView.as_view(), name='guest-list-create'),
    path('<int:pk>/', guest_views.GuestUserDetailAPIView.as_view(), name='guest-detail'),
    
    # Guest Property Access
    path('property-access/', guest_views.GuestPropertyAccessListAPIView.as_view(), name='guest-property-access'),
    
    # Guest Statistics
    path('statistics/', guest_views.guest_statistics, name='guest-statistics'),
    
    # Guest Property Verification
    path('verify/', guest_views.guest_property_verification, name='guest-property-verification'),
]
