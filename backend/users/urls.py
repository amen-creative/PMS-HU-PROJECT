from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import UserListAPIView, UserManagementViewSet
from .profile_views import UserProfileView, user_profile_detail, upload_profile_picture, remove_profile_picture, change_password, export_user_data
from .student_registration import StudentRegistrationView, check_university_id, check_username, check_pc_serial

router = DefaultRouter()
router.register("manage", UserManagementViewSet, basename="users-manage")

urlpatterns = [
    path("", UserListAPIView.as_view(), name="users-list"),
    path("", include(router.urls)),
    path("guests/", include("users.guest_urls")),
    path("profile/", UserProfileView.as_view(), name="user-profile"),
    path("profile/detail/", user_profile_detail, name="user-profile-detail"),
    path("profile/upload-picture/", upload_profile_picture, name="upload-profile-picture"),
    path("profile/remove-picture/", remove_profile_picture, name="remove-profile-picture"),
    path("change-password/", change_password, name="change-password"),
    path("export-data/", export_user_data, name="export-user-data"),

    # Student Registration
    path("register/student/", StudentRegistrationView.as_view(), name="student-registration"),
    path("check/university-id/", check_university_id, name="check-university-id"),
    path("check/username/", check_username, name="check-username"),
    path("check/pc-serial/", check_pc_serial, name="check-pc-serial"),
]
