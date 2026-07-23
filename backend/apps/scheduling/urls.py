"""
Optimiza-CRM – Scheduling URLs
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("scheduling/event-types", views.EventTypeViewSet,  basename="event-type")
router.register("scheduling/availability", views.AvailabilityViewSet, basename="availability")
router.register("scheduling/bookings",    views.BookingViewSet,     basename="booking")

urlpatterns = [
    path("", include(router.urls)),
    # Public booking endpoints
    path(
        "booking/<slug:org_slug>/",
        views.PublicOrgScheduleView.as_view(),
        name="public-org-schedule",
    ),
    path(
        "booking/<slug:org_slug>/<slug:event_slug>/",
        views.PublicEventTypeSlotsView.as_view(),
        name="public-event-slots",
    ),
    path(
        "booking/<slug:org_slug>/<slug:event_slug>/book/",
        views.PublicBookingCreateView.as_view(),
        name="public-booking-create",
    ),
]
