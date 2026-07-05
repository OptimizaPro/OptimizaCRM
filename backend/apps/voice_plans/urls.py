from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    VoiceFAQListView,
    VoiceFAQViewSet,
    VoicePlanListView,
    VoicePlanViewSet,
    VoiceStatListView,
    VoiceStatViewSet,
    VoiceSetupPlanListView,
    VoiceSetupPlanViewSet,
)

# Admin CRUD router
router = DefaultRouter()
router.register("voice/admin/plans",       VoicePlanViewSet,      basename="voice-admin-plans")
router.register("voice/admin/faqs",        VoiceFAQViewSet,       basename="voice-admin-faqs")
router.register("voice/admin/stats",       VoiceStatViewSet,      basename="voice-admin-stats")
router.register("voice/admin/setup-plans", VoiceSetupPlanViewSet, basename="voice-admin-setup-plans")

urlpatterns = [
    # Public (landing page, no auth)
    path("voice/plans/",        VoicePlanListView.as_view(),      name="voice-plans"),
    path("voice/faqs/",         VoiceFAQListView.as_view(),       name="voice-faqs"),
    path("voice/stats/",        VoiceStatListView.as_view(),      name="voice-stats"),
    path("voice/setup-plans/",  VoiceSetupPlanListView.as_view(), name="voice-setup-plans"),
    # Admin CRUD (org_admin / staff)
    path("", include(router.urls)),
]
