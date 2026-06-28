"""
Optimiza-CRM – CMS Content URL conf
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SiteContentViewSet

router = DefaultRouter()
router.register(r"content", SiteContentViewSet, basename="content")

urlpatterns = [path("", include(router.urls))]
