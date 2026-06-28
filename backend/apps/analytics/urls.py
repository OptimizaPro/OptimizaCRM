"""
Optimiza-CRM – Analytics URL conf
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DashboardView, RevenueAnalyticsView, PipelineAnalyticsView,
    TeamPerformanceView, StagesSummaryView, SalesGoalViewSet, ReportViewSet,
)

router = DefaultRouter()
router.register(r"reports", ReportViewSet, basename="report")
router.register(r"goals",   SalesGoalViewSet, basename="goal")

urlpatterns = [
    path("dashboard/",              DashboardView.as_view(),         name="dashboard"),
    path("analytics/revenue/",      RevenueAnalyticsView.as_view(),  name="revenue-analytics"),
    path("analytics/pipeline/",     PipelineAnalyticsView.as_view(), name="pipeline-analytics"),
    path("analytics/team/",         TeamPerformanceView.as_view(),   name="team-performance"),
    path("analytics/stages/",       StagesSummaryView.as_view(),     name="stages-summary"),
    path("",                        include(router.urls)),
]
