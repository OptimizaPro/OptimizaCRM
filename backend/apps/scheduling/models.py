"""
Optimiza-CRM – Scheduling models
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.conf import settings
from django.db import models

from core.models import TenantModel


class EventType(TenantModel):
    COLOR_CHOICES = [
        ("slate",  "Slate"),
        ("blue",   "Blue"),
        ("green",  "Green"),
        ("orange", "Orange"),
        ("red",    "Red"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_types",
    )
    title              = models.CharField(max_length=200)
    slug               = models.SlugField(max_length=120)
    description        = models.TextField(blank=True)
    duration_minutes   = models.PositiveIntegerField(default=30)
    buffer_minutes     = models.PositiveIntegerField(default=0)
    color              = models.CharField(max_length=20, choices=COLOR_CHOICES, default="blue")
    location           = models.CharField(max_length=255, blank=True)
    instructions       = models.TextField(blank=True)
    requires_confirmation = models.BooleanField(default=False)
    min_notice_hours   = models.PositiveIntegerField(default=1)
    max_notice_days    = models.PositiveIntegerField(default=60)
    is_active          = models.BooleanField(default=True)

    class Meta:
        db_table       = "scheduling_event_types"
        ordering       = ["title"]
        unique_together = [("organization", "slug")]

    def __str__(self):
        return self.title


class ScheduleAvailability(TenantModel):
    DAY_CHOICES = [
        (0, "Lunes"),
        (1, "Martes"),
        (2, "Miércoles"),
        (3, "Jueves"),
        (4, "Viernes"),
        (5, "Sábado"),
        (6, "Domingo"),
    ]

    user         = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="availability_slots",
    )
    day_of_week  = models.IntegerField(choices=DAY_CHOICES)
    start_time   = models.TimeField()
    end_time     = models.TimeField()
    is_active    = models.BooleanField(default=True)

    class Meta:
        db_table = "scheduling_availability"
        ordering = ["day_of_week", "start_time"]

    def __str__(self):
        return f"{self.user} — {self.get_day_of_week_display()} {self.start_time}–{self.end_time}"


class Booking(TenantModel):
    STATUS_CHOICES = [
        ("pending",   "Pendiente"),
        ("confirmed", "Confirmada"),
        ("cancelled", "Cancelada"),
        ("completed", "Completada"),
    ]

    event_type         = models.ForeignKey(
        EventType,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    booker_name        = models.CharField(max_length=200)
    booker_email       = models.EmailField()
    booker_phone       = models.CharField(max_length=30, blank=True)
    booker_notes       = models.TextField(blank=True)
    start_time         = models.DateTimeField()
    end_time           = models.DateTimeField()
    status             = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    cancellation_reason = models.TextField(blank=True)
    calendar_event     = models.OneToOneField(
        "crm.CalendarEvent",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking",
    )

    class Meta:
        db_table = "scheduling_bookings"
        ordering = ["-start_time"]

    def __str__(self):
        return f"{self.booker_name} — {self.event_type.title} @ {self.start_time}"
