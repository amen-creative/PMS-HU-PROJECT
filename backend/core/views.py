from django.http import JsonResponse

def test_api(request):
    return JsonResponse({"message": "Backend connected successfully"})

def home(request):
    """Home page view for the root URL"""
    return JsonResponse({
        "message": "Welcome to PMS-HU Backend API",
        "version": "1.0.0",
        "endpoints": {
            "admin": "/admin/",
            "test": "/test/",
            "api_auth_login": "/api/auth/login/",
            "api_users": "/api/users/",
            "api_properties": "/api/properties/",
            "api_assignments": "/api/assignments/",
            "api_audits": "/api/audits/",
            "api_notifications": "/api/notifications/"
        },
        "documentation": "API documentation available at /admin/"
    })