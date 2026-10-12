from django.contrib import admin
from .models import Assignment

@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ('property', 'assigned_to', 'status', 'requested_at')
    list_filter = ('status',)
    search_fields = ('property__title', 'assigned_to__username')