from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .views import test_api, home
from rest_framework_simplejwt.views import TokenRefreshView
from users.auth import LoginTokenObtainPairView, GuestAuthenticationView
from verification.views import QRVerifyAPIView, verify_qr_legacy
from .dashboard_views import dashboard_stats, recent_activity, escalation_summary

urlpatterns = [
    path('', home, name='home'),
    path('admin/', admin.site.urls),
    path('test/', test_api),
    path('api/auth/login/', LoginTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/users/', include('users.urls')),
    path('api/users/guest-auth/', GuestAuthenticationView.as_view(), name='guest-auth'),
    path('api/departments/', include('departments.urls')),
    path('api/dashboard/stats/', dashboard_stats, name='dashboard-stats'),
    path('api/dashboard/activity/', recent_activity, name='dashboard-activity'),
    path('api/dashboard/escalations/', escalation_summary, name='dashboard-escalations'),
    path('api/dashboard/', include('properties.dashboard_urls')),
    path('api/verification/verify/', QRVerifyAPIView.as_view(), name='verification-verify'),
    path('api/verify/<uuid:uuid>/<str:hash_value>/', verify_qr_legacy),
    path('api/properties/', include('properties.urls')),
    path('api/assignments/', include('assignments.urls')),
    path('api/transfers/', include('assignments.transfer_urls')),
    path('api/incidents/', include('incidents.urls')),
    path('api/student-devices/', include('students.urls')),
    path('api/guests/', include('guests.urls')),
    path('api/verification/', include('verification.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/audit/', include('audits.urls')),
    path('api/settings/', include('settings_config.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
