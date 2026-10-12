from django.contrib import admin
from .models import Property

@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'serial_number', 'status', 'registered_by', 'created_at')
    search_fields = ('name', 'serial_number')
    list_filter = ('status', 'category')