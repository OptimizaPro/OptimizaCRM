"""
Optimiza-CRM – CRM URLs
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LeadViewSet, CustomerViewSet, OpportunityViewSet,
    TaskViewSet, ActivityViewSet, CalendarViewSet,
    PipelineTemplateViewSet,
)

router = DefaultRouter()
router.register("leads",         LeadViewSet,             basename="lead")
router.register("customers",     CustomerViewSet,         basename="customer")
router.register("opportunities", OpportunityViewSet,      basename="opportunity")
router.register("tasks",         TaskViewSet,             basename="task")
router.register("activities",    ActivityViewSet,         basename="activity")
router.register("calendar",      CalendarViewSet,         basename="calendar")
router.register("pipelines",     PipelineTemplateViewSet, basename="pipeline")

urlpatterns = [path("", include(router.urls))]
