"""
Optimiza-CRM – Root URL configuration
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path("api/v1/health/", lambda r: JsonResponse({"status": "ok"})),
    path("admin/", admin.site.urls),
    # API v1
    path("api/v1/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.crm.urls")),
    path("api/v1/", include("apps.integrations.urls")),
    path("api/v1/", include("apps.content.urls")),
    path("api/v1/", include("apps.analytics.urls")),
    path("api/v1/", include("apps.ai_integration.urls")),
    path("api/v1/", include("apps.notifications.urls")),
    path("api/v1/", include("apps.automation.urls")),
    path("api/v1/", include("apps.billing.urls")),
    path("api/v1/", include("apps.forms.urls")),
    path("api/v1/", include("apps.campaigns.urls")),
    path("api/v1/", include("apps.voice_plans.urls")),
    # API docs
    path("api/schema/",  SpectacularAPIView.as_view(),  name="schema"),
    path("api/docs/",    SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/",   SpectacularRedocView.as_view(url_name="schema"),   name="redoc"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
