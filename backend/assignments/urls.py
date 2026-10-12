from django.urls import path

from .views import AssignmentListCreateAPIView, AssignmentUpdateAPIView


urlpatterns = [
    path("", AssignmentListCreateAPIView.as_view(), name="assignment-list-create"),
    path("<int:pk>/", AssignmentUpdateAPIView.as_view(), name="assignment-update"),
]
