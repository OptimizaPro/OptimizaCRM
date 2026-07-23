"""
Optimiza-CRM – Scheduling admin
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Booking, EventType, ScheduleAvailability


@admin.register(EventType)
class EventTypeAdmin(ModelAdmin):
    list_display  = ["title", "duration_minutes", "is_active", "organization", "user"]
    list_filter   = ["is_active", "color"]
    search_fields = ["title"]


@admin.register(ScheduleAvailability)
class ScheduleAvailabilityAdmin(ModelAdmin):
    list_display = ["user", "day_of_week", "start_time", "end_time", "is_active", "organization"]
    list_filter  = ["day_of_week", "is_active"]


@admin.register(Booking)
class BookingAdmin(ModelAdmin):
    list_display  = ["booker_name", "booker_email", "event_type", "start_time", "status", "organization"]
    list_filter   = ["status"]
    search_fields = ["booker_name", "booker_email"]
