import qrcode
from io import BytesIO
from django.core.files.base import ContentFile


def generate_qr(property_obj):
    qr_payload = property_obj.get_qr_payload()
    qr = qrcode.make(qr_payload)

    buffer = BytesIO()
    qr.save(buffer, format="PNG")

    filename = f"{property_obj.property_code}.png"
    property_obj.qr_code_image.save(filename, ContentFile(buffer.getvalue()), save=False)
