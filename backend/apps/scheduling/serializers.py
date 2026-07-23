"""
Optimiza-CRM – Scheduling serializers
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from rest_framework import serializers

from .models import EventType, ScheduleAvailability, Booking


class EventTypeSerializer(serializers.ModelSerializer):
    user_name     = serializers.SerializerMethodField()
    bookings_count = serializers.SerializerMethodField()

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.email

    def get_bookings_count(self, obj):
        return obj.bookings.filter(status__in=["pending", "confirmed"]).count()

    class Meta:
        model  = EventType
        fields = [
            "id", "title", "slug", "description", "duration_minutes", "buffer_minutes",
            "color", "location", "instructions", "requires_confirmation",
            "min_notice_hours", "max_notice_days", "is_active",
            "user", "user_name", "bookings_count", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "user", "user_name", "bookings_count", "created_at", "updated_at",
        ]


class ScheduleAvailabilitySerializer(serializers.ModelSerializer):
    day_label = serializers.CharField(source="get_day_of_week_display", read_only=True)

    class Meta:
        model  = ScheduleAvailability
        fields = [
            "id", "day_of_week", "day_label", "start_time", "end_time",
            "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "day_label", "created_at", "updated_at"]


class BookingSerializer(serializers.ModelSerializer):
    event_type_title    = serializers.CharField(source="event_type.title", read_only=True)
    event_type_duration = serializers.IntegerField(source="event_type.duration_minutes", read_only=True)
    event_type_color    = serializers.CharField(source="event_type.color", read_only=True)

    class Meta:
        model  = Booking
        fields = [
            "id", "event_type", "event_type_title", "event_type_duration", "event_type_color",
            "booker_name", "booker_email", "booker_phone", "booker_notes",
            "start_time", "end_time", "status", "cancellation_reason",
            "calendar_event", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "event_type_title", "event_type_duration", "event_type_color",
            "calendar_event", "created_at", "updated_at",
        ]


# ─── Public serializers (minimal info) ────────────────────────────────────────

class PublicEventTypeSerializer(serializers.ModelSerializer):
    host_name = serializers.SerializerMethodField()

    def get_host_name(self, obj):
        return obj.user.get_full_name() or obj.user.first_name or "Host"

    class Meta:
        model  = EventType
        fields = [
            "id", "title", "slug", "description", "duration_minutes",
            "color", "location", "instructions", "requires_confirmation", "host_name",
        ]


class PublicBookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Booking
        fields = ["booker_name", "booker_email", "booker_phone", "booker_notes", "start_time"]
