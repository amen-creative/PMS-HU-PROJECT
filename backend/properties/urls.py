from django.urls import path
from .views import (
    verify_qr,
    VerificationAPIView,
    property_categories,
    property_departments,
    PropertyListCreateAPIView,
    PropertyUpdateAPIView,
    PropertyDeleteAPIView,
    PendingPropertyListAPIView,
    PropertyApprovalAPIView,
    PropertySearchAPIView,
    RoleBasedDashboardAPIView,
    ReportsAPIView,
    export_properties_csv,
)
from .gate_verification import GateVerificationView, StudentDeviceListView, verification_statistics

urlpatterns = [
    # QR Verification
    path('verify/<uuid:uuid>/<str:hash_value>/', verify_qr),
    path('verify/', VerificationAPIView.as_view(), name='property-verify'),

    # Property CRUD APIs
    path('', PropertyListCreateAPIView.as_view()),
    path('pending/', PendingPropertyListAPIView.as_view(), name='property-pending-list'),
    path('<int:pk>/approval/', PropertyApprovalAPIView.as_view(), name='property-approval'),
    path('<int:pk>/', PropertyUpdateAPIView.as_view()),
    path('<int:pk>/delete/', PropertyDeleteAPIView.as_view()),
    
    # Property Search API
    path('categories/', property_categories, name='property-categories'),
    path('departments/', property_departments, name='property-departments'),
    path('search/', PropertySearchAPIView.as_view(), name='property-search'),
    path('export-csv/', export_properties_csv, name='export-properties-csv'),
    
    # Gate Verification for Students
    path('gate-verification/', GateVerificationView.as_view(), name='gate-verification'),
    path('student-devices/', StudentDeviceListView.as_view(), name='student-devices'),
    path('verification-stats/', verification_statistics, name='verification-stats'),
    
    # Role-based Dashboard and Reports
    path('dashboard/role/', RoleBasedDashboardAPIView.as_view(), name='role-dashboard'),
    path('reports/', ReportsAPIView.as_view(), name='property-reports'),
]
