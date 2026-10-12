from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditAdmin(admin.ModelAdmin):
    list_display = ('performed_by', 'action', 'timestamp')
    search_fields = ('action',)
    list_filter = ('timestamp',)