from django.urls import path

from .views import IncidentListCreateAPIView, IncidentUpdateAPIView


urlpatterns = [
    path("", IncidentListCreateAPIView.as_view(), name="incident-list-create"),
    path("<int:pk>/", IncidentUpdateAPIView.as_view(), name="incident-update"),
]
