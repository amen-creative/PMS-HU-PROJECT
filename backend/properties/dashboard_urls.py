from django.urls import path

from .views import RoleBasedDashboardAPIView


urlpatterns = [
    path("", RoleBasedDashboardAPIView.as_view(), name="dashboard-overview"),
]
