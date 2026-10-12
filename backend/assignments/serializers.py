from rest_framework import serializers

from properties.models import Property
from users.models import User

from .models import Assignment, TransferRequest


class AssignmentSerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(source="property.title", read_only=True)
    assigned_to_username = serializers.CharField(source="assigned_to.username", read_only=True)
    assigned_by_username = serializers.CharField(source="assigned_by.username", read_only=True)
    approved_by_username = serializers.CharField(source="approved_by.username", read_only=True)
    assigned_to = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(is_active=True), required=False, allow_null=True)
    assigned_department = serializers.CharField(write_only=True, required=False, allow_blank=True)
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = (
            "id",
            "property",
            "property_name",
            "assigned_to",
            "assigned_department",
            "assigned_to_username",
            "assigned_by",
            "assigned_by_username",
            "approved_by",
            "approved_by_username",
            "previous_owner",
            "owner_name",
            "notes",
            "history_log",
            "status",
            "assigned_date",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "assigned_by",
            "assigned_by_username",
            "approved_by",
            "approved_by_username",
            "previous_owner",
            "owner_name",
            "history_log",
            "assigned_date",
            "updated_at",
        )

    def get_owner_name(self, obj):
        return obj.assigned_to.get_full_name() or obj.assigned_to.username if obj.assigned_to else obj.property.department

    def create(self, validated_data):
        validated_data.pop("assigned_department", None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("assigned_department", None)
        return super().update(instance, validated_data)

    def validate(self, attrs):
        property_obj = attrs.get("property") or getattr(self.instance, "property", None)
        assigned_to = attrs.get("assigned_to") or getattr(self.instance, "assigned_to", None)
        assigned_department = (attrs.get("assigned_department") or "").strip()

        if not assigned_to and assigned_department:
            department_user = (
                User.objects.filter(department__iexact=assigned_department, role="DEPT_HEAD", is_active=True).first()
                or User.objects.filter(department__iexact=assigned_department, is_active=True).order_by("id").first()
            )
            if not department_user:
                raise serializers.ValidationError(
                    {"assigned_department": "No active user was found to represent that department assignment."}
                )
            attrs["assigned_to"] = department_user
            assigned_to = department_user

        if not assigned_to:
            raise serializers.ValidationError({"assigned_to": "Select a staff member, student, or target department."})

        if property_obj and assigned_to and property_obj.owner_id == assigned_to.id:
            raise serializers.ValidationError({"assigned_to": "Property is already assigned to this user."})
        if property_obj and not self.instance:
            if property_obj.status not in {Property.STATUS_REGISTERED, Property.STATUS_AVAILABLE}:
                raise serializers.ValidationError({"property": "Only registered or available properties can be assigned."})
            if property_obj.status == Property.STATUS_ASSIGNED or property_obj.current_assignee_id:
                raise serializers.ValidationError({"property": "Property is already assigned."})
            if property_obj.transfer_requests.filter(status="PENDING").exists():
                raise serializers.ValidationError({"property": "Property has a pending transfer request."})
        return attrs


class TransferRequestSerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(source="property.title", read_only=True)
    from_username = serializers.CharField(source="from_user.username", read_only=True)
    to_username = serializers.CharField(source="to_user.username", read_only=True)
    approved_by_username = serializers.CharField(source="approved_by.username", read_only=True)
    completed_by_username = serializers.CharField(source="completed_by.username", read_only=True)

    class Meta:
        model = TransferRequest
        fields = (
            "id",
            "property",
            "property_name",
            "from_user",
            "from_username",
            "to_user",
            "to_username",
            "status",
            "reason",
            "response_note",
            "approved_by",
            "approved_by_username",
            "completed_by",
            "completed_by_username",
            "created_at",
            "updated_at",
            "reviewed_at",
            "completed_at",
        )
        read_only_fields = (
            "id",
            "from_user",
            "from_username",
            "approved_by",
            "approved_by_username",
            "completed_by",
            "completed_by_username",
            "created_at",
            "updated_at",
            "reviewed_at",
            "completed_at",
            "status",
        )

    def validate(self, attrs):
        request = self.context.get("request")
        property_obj = attrs.get("property") or getattr(self.instance, "property", None)
        to_user = attrs.get("to_user") or getattr(self.instance, "to_user", None)

        if property_obj and property_obj.status != Property.STATUS_ASSIGNED:
            raise serializers.ValidationError({"property": "Only assigned properties can be transferred."})
        if property_obj and property_obj.transfer_requests.filter(status="PENDING").exclude(pk=getattr(self.instance, "pk", None)).exists():
            raise serializers.ValidationError({"property": "This property already has a pending transfer request."})
        if request and not (request.user.is_superuser or request.user.role in {"ADMIN", "PROPERTY_OFFICER"}):
            raise serializers.ValidationError({"property": "Only a Property Officer can initiate transfers."})

        if property_obj and to_user and property_obj.owner_id == to_user.id:
            raise serializers.ValidationError({"to_user": "Target user already owns this property."})

        return attrs
