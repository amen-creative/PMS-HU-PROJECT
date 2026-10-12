from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Department, User


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "is_active")
    search_fields = ("name", "code")

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ("username", "email", "role", "position", "department", "university_id", "is_staff")
    list_filter = ("role", "department", "is_staff", "is_active")
    search_fields = ("username", "email", "first_name", "last_name", "university_id")
    
    fieldsets = UserAdmin.fieldsets + (
        ("Profile Information", {"fields": ("role", "position", "department", "department_ref", "phone_number", "university_id", "profile_picture")}),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Profile Information", {"fields": ("role", "position", "department", "department_ref", "phone_number", "university_id", "profile_picture")}),
    )

admin.site.register(User, CustomUserAdmin)
