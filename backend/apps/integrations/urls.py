"""
Optimiza-CRM – Integrations URL conf
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IntegrationViewSet, MessageViewSet, widget_config, widget_submit, widget_manage

router = DefaultRouter()
router.register(r"integrations", IntegrationViewSet, basename="integration")
router.register(r"messages",     MessageViewSet,     basename="message")

urlpatterns = [
    path("", include(router.urls)),
    # Public widget endpoints (no JWT)
    path("widget/config/",  widget_config,  name="widget-config"),
    path("widget/submit/",  widget_submit,  name="widget-submit"),
    # Authenticated widget management
    path("widget/manage/",  widget_manage,  name="widget-manage"),
]
