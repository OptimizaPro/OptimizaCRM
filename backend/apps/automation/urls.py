"""
Optimiza-CRM – Automation URL conf
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AutomationRuleViewSet

router = DefaultRouter()
router.register(r"automations", AutomationRuleViewSet, basename="automation")

urlpatterns = [path("", include(router.urls))]
