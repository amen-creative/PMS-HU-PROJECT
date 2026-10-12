import shutil
import json
from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from properties.models import Property
from users.models import User


class PropertyCreateAPITests(APITestCase):
    def setUp(self):
        super().setUp()
        self.media_root = Path(settings.BASE_DIR) / "test_media"
        self.media_root.mkdir(exist_ok=True)
        self.override = override_settings(MEDIA_ROOT=self.media_root)
        self.override.enable()

        self.user = User.objects.create_user(
            username="creator",
            password="testpass123",
            role=User.ROLE_PROPERTY_OFFICER,
            department="IT",
        )
        self.client.force_authenticate(self.user)

    def tearDown(self):
        self.override.disable()
        shutil.rmtree(self.media_root, ignore_errors=True)
        super().tearDown()

    def test_create_property_accepts_legacy_name_field(self):
        image = SimpleUploadedFile(
            "property.gif",
            (
                b"GIF87a\x01\x00\x01\x00\x80\x00\x00"
                b"\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,"
                b"\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
            ),
            content_type="image/gif",
        )
        payload = {
            "name": "Office Laptop",
            "category": "IT",
            "serial_number": "LEGACY-NAME-001",
            "department": "Finance",
            "model": "Latitude 5440",
            "image": image,
        }

        response = self.client.post("/api/properties/", payload, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["title"], payload["name"])
        self.assertEqual(response.data["name"], payload["name"])
        self.assertTrue(Property.objects.filter(serial_number=payload["serial_number"]).exists())

    def test_create_property_accepts_json_payload(self):
        payload = {
            "title": "JSON Laptop",
            "category": "it",
            "serial_number": "JSON-CREATE-001",
            "department": "Finance",
            "model": "Latitude 5450",
        }

        response = self.client.post("/api/properties/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["title"], payload["title"])
        self.assertEqual(response.data["name"], payload["title"])
        self.assertEqual(response.data["category"], "IT")
        self.assertEqual(response.data["department"], payload["department"])

    def test_create_property_accepts_lowercase_status_and_condition(self):
        payload = {
            "title": "Lowercase Choices",
            "category": "it",
            "serial_number": "JSON-CREATE-LOWER-001",
            "department": "Finance",
            "model": "Latitude 5450",
            "status": "available",
            "condition": "good",
        }

        response = self.client.post("/api/properties/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["status"], "AVAILABLE")
        self.assertEqual(response.data["condition"], "GOOD")

    def test_qr_payload_contains_rich_property_details(self):
        property_obj = Property.objects.create(
            title="Department Laptop",
            category="IT",
            serial_number="RICH-QR-001",
            department="Finance",
            model="Latitude 7490",
            description="Finance office laptop assigned for daily reporting.",
            location="Finance Office Block A",
            approval_status="APPROVED",
            status=Property.STATUS_ASSIGNED,
            condition=Property.CONDITION_GOOD,
            owner=self.user,
            current_assignee=self.user,
            created_by=self.user,
        )

        payload = json.loads(property_obj.get_qr_payload())

        self.assertEqual(payload["property_id"], property_obj.id)
        self.assertEqual(payload["property_code"], str(property_obj.property_code))
        self.assertEqual(payload["title"], property_obj.title)
        self.assertEqual(payload["serial_number"], property_obj.serial_number)
        self.assertEqual(payload["department"], property_obj.department)
        self.assertEqual(payload["location"], property_obj.location)
        self.assertEqual(payload["status"], property_obj.status)
        self.assertEqual(payload["approval_status"], property_obj.approval_status)
        self.assertEqual(payload["owner_name"], self.user.username)
        self.assertEqual(payload["owner"]["username"], self.user.username)
        self.assertEqual(payload["owner"]["full_name"], self.user.username)
        self.assertEqual(payload["current_assignee"]["username"], self.user.username)
        self.assertEqual(payload["registered_by"]["username"], self.user.username)
        self.assertIn(property_obj.title, payload["scan_summary"])
        self.assertEqual(payload["secure_hash"], property_obj.secure_hash)
