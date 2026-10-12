import io
from datetime import datetime

from django.db import OperationalError, ProgrammingError, connection
from django.http import HttpResponse
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from assignments.models import Assignment, Transfer
from audits.services import log_activity
from guests.models import Guest
from incidents.models import EscalationLog, Incident
from properties.models import Property
from students.models import StudentDevice


def _table_exists(model):
    try:
        return model._meta.db_table in connection.introspection.table_names()
    except (ProgrammingError, OperationalError):
        return False


def _safe_queryset(model, *select_related_fields):
    if not _table_exists(model):
        return model.objects.none()
    queryset = model.objects.all()
    if select_related_fields:
        queryset = queryset.select_related(*select_related_fields)
    return queryset


def _user_can_report(user, *roles):
    return user.is_superuser or user.role in roles


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def inventory_report(request):
    if not _user_can_report(request.user, "ADMIN", "PROPERTY_OFFICER"):
        return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

    queryset = Property.objects.all()
    department = request.query_params.get("department")
    category = request.query_params.get("category")
    prop_status = request.query_params.get("status")
    condition = request.query_params.get("condition")
    date_from = request.query_params.get("date_from")
    date_to = request.query_params.get("date_to")

    if department:
        queryset = queryset.filter(department__iexact=department)
    if category:
        queryset = queryset.filter(category__iexact=category)
    if prop_status:
        queryset = queryset.filter(status__iexact=prop_status)
    if condition:
        queryset = queryset.filter(condition__iexact=condition)
    if date_from:
        queryset = queryset.filter(created_at__date__gte=date_from)
    if date_to:
        queryset = queryset.filter(created_at__date__lte=date_to)

    data = [
        {
            "property_id": p.id,
            "title": p.title,
            "serial_number": p.serial_number,
            "category": p.category,
            "status": p.status,
            "condition": p.condition,
            "department": p.department,
            "created_at": p.created_at,
        }
        for p in queryset
    ]
    return Response({"data": data, "count": len(data)})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def transfers_report(request):
    if not _user_can_report(request.user, "ADMIN", "PROPERTY_OFFICER"):
        return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

    transfers = _safe_queryset(Transfer, "property", "from_user", "to_user", "approved_by")
    data = [
        {
            "transfer_id": t.id,
            "property": t.property.title,
            "from_user": t.from_user.full_name,
            "to_user": t.to_user.full_name if t.to_user else None,
            "status": t.status,
            "requested_at": t.created_at,
            "approved_at": t.reviewed_at,
            "completed_at": t.completed_at,
        }
        for t in transfers
    ]
    return Response({"data": data, "count": len(data)})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def incidents_report(request):
    if not _user_can_report(request.user, "ADMIN", "PROPERTY_OFFICER", "DEPT_HEAD", "SECURITY"):
        return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

    incidents = _safe_queryset(Incident, "property", "reported_by", "assigned_officer")
    if request.user.role == "DEPT_HEAD" and request.user.department:
        incidents = incidents.filter(property__department__iexact=request.user.department)
    elif request.user.role == "SECURITY":
        incidents = incidents.filter(assigned_officer=request.user)

    data = [
        {
            "incident_id": i.incident_id,
            "tracking_number": i.tracking_number,
            "property": i.property.title,
            "incident_type": i.incident_type,
            "status": i.status,
            "reported_by": i.reported_by.full_name,
            "report_date": i.report_date,
            "location": i.location,
        }
        for i in incidents
    ]
    return Response({"data": data, "count": len(data)})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def guests_report(request):
    if not _user_can_report(request.user, "ADMIN"):
        return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

    guests = _safe_queryset(Guest, "registered_by")
    data = [
        {
            "guest_id": g.guest_id,
            "full_name": g.full_name,
            "contact_number": g.contact_number,
            "purpose_of_visit": g.purpose_of_visit,
            "entry_date": g.entry_date,
            "exit_date": g.exit_date,
            "status": g.status,
            "registered_by": g.registered_by.full_name if g.registered_by else None,
        }
        for g in guests
    ]
    return Response({"data": data, "count": len(data)})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def student_devices_report(request):
    if not _user_can_report(request.user, "ADMIN", "IT_OFFICER"):
        return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

    devices = _safe_queryset(StudentDevice, "student", "department", "verified_by")
    data = [
        {
            "student_device_id": d.student_device_id,
            "student": d.student.full_name,
            "student_id_number": d.student_id_number,
            "department": d.department.name if d.department else None,
            "serial_number": d.serial_number_submitted,
            "verification_status": d.verification_status,
            "verified_by": d.verified_by.full_name if d.verified_by else None,
            "submitted_at": d.submitted_at,
        }
        for d in devices
    ]
    return Response({"data": data, "count": len(data)})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def escalations_report(request):
    if not _user_can_report(request.user, "ADMIN"):
        return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

    escalations = _safe_queryset(EscalationLog, "resolved_by")
    data = [
        {
            "escalation_id": e.escalation_id,
            "escalation_type": e.escalation_type,
            "related_model": e.related_model,
            "related_id": e.related_id,
            "recipient_email": e.recipient_email,
            "sent_at": e.sent_at,
            "resolved": e.resolved,
            "resolved_by": e.resolved_by.full_name if e.resolved_by else None,
            "resolved_at": e.resolved_at,
        }
        for e in escalations
    ]
    return Response({"data": data, "count": len(data)})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def department_summary_report(request):
    if not _user_can_report(request.user, "ADMIN", "DEPT_HEAD"):
        return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

    departments = [request.user.department] if request.user.role == "DEPT_HEAD" and request.user.department else sorted(
        set(Property.objects.exclude(department__exact="").values_list("department", flat=True))
    )
    data = []
    for dept_name in departments:
        properties = Property.objects.filter(department__iexact=dept_name)
        data.append(
            {
                "name": dept_name,
                "total_properties": properties.count(),
                "assigned": properties.filter(status="ASSIGNED").count(),
                "available": properties.filter(status="AVAILABLE").count(),
                "damaged": properties.filter(status="DAMAGED").count(),
                "lost": properties.filter(status="LOST").count(),
            }
        )
    return Response({"data": data, "count": len(data)})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def ownership_log_report(request):
    if not _user_can_report(request.user, "ADMIN", "PROPERTY_OFFICER"):
        return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

    property_id = request.query_params.get("property_id")
    if not property_id:
        return Response({"error": "property_id parameter required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        property_obj = Property.objects.get(pk=property_id)
    except Property.DoesNotExist:
        return Response({"error": "Property not found"}, status=status.HTTP_404_NOT_FOUND)

    assignments = Assignment.objects.filter(property=property_obj, status="APPROVED").order_by("updated_at")
    transfers = _safe_queryset(Transfer).filter(property=property_obj, status="APPROVED").order_by("reviewed_at")

    history = [
        {
            "type": "Assignment",
            "date": assignment.approved_at,
            "to": assignment.assigned_to.full_name,
            "by": assignment.assigned_by.full_name if assignment.assigned_by else None,
        }
        for assignment in assignments
    ]
    history.extend(
        {
            "type": "Transfer",
            "date": transfer.reviewed_at,
            "from": transfer.from_user.full_name,
            "to": transfer.to_user.full_name if transfer.to_user else None,
            "by": transfer.approved_by.full_name if transfer.approved_by else None,
        }
        for transfer in transfers
    )
    history.sort(key=lambda x: x["date"] or datetime.min)

    return Response({"property": property_obj.title, "property_id": property_obj.id, "history": history})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def export_report(request):
    if not _user_can_report(request.user, "ADMIN", "PROPERTY_OFFICER"):
        return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

    report_type = request.data.get("report_type") or request.query_params.get("report_type")
    filters = request.data.get("filters") or {}
    format_type = (request.data.get("format") or request.query_params.get("format") or "excel").lower()

    export_matrix = _build_export_matrix(report_type, filters)
    if export_matrix is None:
        return Response({"error": "Invalid report_type"}, status=status.HTTP_400_BAD_REQUEST)

    rows, columns = export_matrix
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{report_type}_report_{timestamp}"

    log_activity(
        actor=request.user,
        action="REPORT_EXPORT",
        message=f"Exported {report_type} report as {format_type}",
        metadata={"report_type": report_type, "format": format_type, "rows": len(rows)},
    )

    if format_type == "excel":
        return _export_excel(filename, columns, rows)
    if format_type == "pdf":
        return _export_pdf(filename, columns, rows, report_type)
    return Response({"error": "Invalid format. Use 'excel' or 'pdf'."}, status=status.HTTP_400_BAD_REQUEST)


def _build_export_matrix(report_type, filters):
    rows = []

    if report_type == "inventory":
        queryset = Property.objects.all()
        if filters.get("status"):
            queryset = queryset.filter(status__iexact=filters["status"])
        if filters.get("department"):
            queryset = queryset.filter(department__iexact=filters["department"])
        rows = [
            {
                "Property ID": p.id,
                "Title": p.title,
                "Serial Number": p.serial_number,
                "Category": p.category,
                "Department": p.department,
                "Status": p.status,
                "Condition": p.condition,
                "Created At": p.created_at.strftime("%Y-%m-%d %H:%M"),
            }
            for p in queryset
        ]
    elif report_type == "transfers":
        rows = [
            {
                "Transfer ID": t.id,
                "Property": t.property.title,
                "From User": t.from_user.full_name,
                "To User": t.to_user.full_name if t.to_user else "",
                "Status": t.status,
                "Requested At": t.created_at.strftime("%Y-%m-%d %H:%M"),
                "Reviewed At": t.reviewed_at.strftime("%Y-%m-%d %H:%M") if t.reviewed_at else "",
                "Completed At": t.completed_at.strftime("%Y-%m-%d %H:%M") if t.completed_at else "",
            }
            for t in _safe_queryset(Transfer, "property", "from_user", "to_user")
        ]
    elif report_type == "incidents":
        rows = [
            {
                "Incident ID": i.incident_id,
                "Tracking Number": i.tracking_number,
                "Property": i.property.title,
                "Type": i.incident_type,
                "Status": i.status,
                "Reported By": i.reported_by.full_name,
                "Location": i.location,
                "Report Date": i.report_date.strftime("%Y-%m-%d"),
            }
            for i in _safe_queryset(Incident, "property", "reported_by")
        ]
    elif report_type == "guests":
        rows = [
            {
                "Guest ID": g.guest_id,
                "Full Name": g.full_name,
                "Contact": g.contact_number,
                "Purpose": g.purpose_of_visit,
                "Entry Date": g.entry_date.strftime("%Y-%m-%d"),
                "Exit Date": g.exit_date.strftime("%Y-%m-%d"),
                "Status": g.status,
            }
            for g in _safe_queryset(Guest)
        ]
    elif report_type == "student_devices":
        rows = [
            {
                "Device ID": d.student_device_id,
                "Student": d.student.full_name,
                "Student ID": d.student_id_number,
                "Department": d.department.name if d.department else "",
                "Serial Number": d.serial_number_submitted,
                "Verification Status": d.verification_status,
                "Submitted At": d.submitted_at.strftime("%Y-%m-%d %H:%M"),
            }
            for d in _safe_queryset(StudentDevice, "student", "department")
        ]
    elif report_type == "escalations":
        rows = [
            {
                "Escalation ID": e.escalation_id,
                "Type": e.escalation_type,
                "Related Model": e.related_model,
                "Related ID": e.related_id,
                "Recipient": e.recipient_email,
                "Sent At": e.sent_at.strftime("%Y-%m-%d %H:%M"),
                "Resolved": "Yes" if e.resolved else "No",
            }
            for e in _safe_queryset(EscalationLog)
        ]
    elif report_type == "department_summary":
        for dept_name in sorted(set(Property.objects.exclude(department__exact="").values_list("department", flat=True))):
            properties = Property.objects.filter(department__iexact=dept_name)
            rows.append(
                {
                    "Department": dept_name,
                    "Total Properties": properties.count(),
                    "Assigned": properties.filter(status="ASSIGNED").count(),
                    "Available": properties.filter(status="AVAILABLE").count(),
                    "Damaged": properties.filter(status="DAMAGED").count(),
                    "Lost": properties.filter(status="LOST").count(),
                }
            )
    else:
        return None

    columns = list(rows[0].keys()) if rows else ["No Data"]
    if not rows:
        rows = [{"No Data": "No records found for selected criteria"}]
    return rows, columns


def _export_excel(filename, columns, rows):
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Report"
    worksheet.append(columns)
    for row in rows:
        worksheet.append([str(row.get(column, "")) for column in columns])

    output = io.BytesIO()
    workbook.save(output)
    output.seek(0)
    response = HttpResponse(
        output.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}.xlsx"'
    return response


def _export_pdf(filename, columns, rows, report_type):
    output = io.BytesIO()
    pdf = canvas.Canvas(output, pagesize=A4)
    width, height = A4
    y = height - 40

    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y, f"PMS-HU {report_type.replace('_', ' ').title()} Report")
    y -= 24
    pdf.setFont("Helvetica", 8)
    for row in rows:
        line = " | ".join(str(row.get(col, ""))[:28] for col in columns)
        pdf.drawString(40, y, line)
        y -= 14
        if y < 40:
            pdf.showPage()
            y = height - 40
            pdf.setFont("Helvetica", 8)

    pdf.save()
    output.seek(0)
    response = HttpResponse(output.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}.pdf"'
    return response
