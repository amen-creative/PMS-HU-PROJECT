from django.urls import path
from .views import (
    inventory_report,
    transfers_report,
    incidents_report,
    guests_report,
    student_devices_report,
    escalations_report,
    department_summary_report,
    ownership_log_report,
    export_report
)

urlpatterns = [
    path('inventory/', inventory_report, name='inventory-report'),
    path('transfers/', transfers_report, name='transfers-report'),
    path('incidents/', incidents_report, name='incidents-report'),
    path('guests/', guests_report, name='guests-report'),
    path('student-devices/', student_devices_report, name='student-devices-report'),
    path('escalations/', escalations_report, name='escalations-report'),
    path('department-summary/', department_summary_report, name='department-summary-report'),
    path('ownership-log/', ownership_log_report, name='ownership-log-report'),
    path('export/', export_report, name='export-report'),
]
