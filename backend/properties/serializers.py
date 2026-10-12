from rest_framework import serializers

from departments.models import Department
from .models import Property


class CaseInsensitiveChoiceField(serializers.ChoiceField):
    def to_internal_value(self, data):
        if isinstance(data, str):
            data = data.strip().upper()
        return super().to_internal_value(data)


class PropertySerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True)
    photo = serializers.ImageField(source="image", required=False, allow_null=True)
    qr_code_image = serializers.ImageField(source="qr_code", read_only=True)
    title = serializers.CharField(required=False, allow_blank=True)
    property_code = serializers.CharField(read_only=True)
    department = serializers.CharField(required=False, allow_blank=True)
    status = CaseInsensitiveChoiceField(choices=Property.STATUS_CHOICES, required=False)
    condition = CaseInsensitiveChoiceField(choices=Property.CONDITION_CHOICES, required=False)
    purchase_year = serializers.IntegerField(required=False)
    monetary_value = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, write_only=True)
    value = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    created_by = serializers.IntegerField(source="created_by_id", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    created_by_details = serializers.SerializerMethodField()
    updated_by = serializers.IntegerField(source="updated_by_id", read_only=True)
    owner = serializers.IntegerField(source="owner_id", read_only=True)
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    current_assignee = serializers.IntegerField(source="current_assignee_id", read_only=True)
    assignee_username = serializers.CharField(source="current_assignee.username", read_only=True)

    class Meta:
        model = Property
        fields = (
            "id",
            "property_code",
            "name",
            "title",
            "description",
            "category",
            "model",
            "serial_number",
            "department",
            "location",
            "status",
            "condition",
            "purchase_year",
            "value",
            "monetary_value",
            "approval_status",
            "image",
            "photo",
            "qr_code",
            "qr_code_image",
            "created_at",
            "updated_at",
            "created_by",
            "created_by_username",
            "created_by_details",
            "updated_by",
            "owner",
            "owner_username",
            "current_assignee",
            "assignee_username",
        )
        read_only_fields = (
            "id",
            "property_code",
            "created_at",
            "updated_at",
            "created_by",
            "created_by_username",
            "created_by_details",
            "updated_by",
            "owner",
            "owner_username",
            "current_assignee",
            "assignee_username",
            "qr_code",
            "qr_code_image",
            "photo",
        )

    def get_created_by_details(self, obj):
        if not obj.created_by:
            return None
        return {
            "id": obj.created_by_id,
            "username": obj.created_by.username,
            "email": obj.created_by.email,
            "role": obj.created_by.role,
        }

    def _incoming_value(self, *keys):
        initial_data = getattr(self, "initial_data", None) or {}
        for key in keys:
            value = initial_data.get(key)
            if value is not None:
                return value
        return None

    def validate(self, attrs):
        title = (
            attrs.get("title")
            or self._incoming_value("title")
            or getattr(self.instance, "title", "")
            or ""
        ).strip()
        name = (
            self._incoming_value("name")
            or getattr(self.instance, "name", "")
            or ""
        ).strip()
        resolved_title = title or name
        if not resolved_title:
            raise serializers.ValidationError({"title": "Title is required."})

        serial_number = attrs.get("serial_number", getattr(self.instance, "serial_number", None))
        if serial_number:
            queryset = Property.objects.filter(serial_number__iexact=serial_number.strip())
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError(
                    {"serial_number": "A property with this serial number already exists."}
                )
            attrs["serial_number"] = serial_number.strip()

        category = attrs.get("category", getattr(self.instance, "category", "GENERAL")) or "GENERAL"
        attrs["category"] = category.strip().upper()
        attrs["title"] = resolved_title
        attrs["name"] = resolved_title
        department_value = attrs.get("department", getattr(self.instance, "department", None))
        if isinstance(department_value, str):
            department_value = department_value.strip()
            if department_value:
                # The Property model expects a string for department, not a Department object
                attrs["department"] = department_value
            else:
                attrs["department"] = ""
        else:
            attrs["department"] = department_value or ""
        attrs["model"] = (attrs.get("model", getattr(self.instance, "model", "")) or "").strip()

        monetary_value = attrs.pop("monetary_value", getattr(self.instance, "value", 0))
        if monetary_value is not None and monetary_value < 0:
            raise serializers.ValidationError({"monetary_value": "Monetary value cannot be negative."})
        attrs["value"] = monetary_value or 0
        if not attrs.get("purchase_year"):
            attrs["purchase_year"] = 2024

        if "status" in attrs and attrs["status"]:
            attrs["status"] = str(attrs["status"]).strip().upper()
        if "condition" in attrs and attrs["condition"]:
            attrs["condition"] = str(attrs["condition"]).strip().upper()

        return attrs
