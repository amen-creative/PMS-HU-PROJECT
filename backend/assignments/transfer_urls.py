from django.urls import path

from .views import (
    TransferRequestApproveAPIView,
    TransferRequestCompleteAPIView,
    TransferRequestListCreateAPIView,
    TransferRequestRejectAPIView,
)


urlpatterns = [
    path("", TransferRequestListCreateAPIView.as_view(), name="transfer-list-create"),
    path("<int:pk>/approve/", TransferRequestApproveAPIView.as_view(), name="transfer-approve"),
    path("<int:pk>/reject/", TransferRequestRejectAPIView.as_view(), name="transfer-reject"),
    path("<int:pk>/complete/", TransferRequestCompleteAPIView.as_view(), name="transfer-complete"),
]
