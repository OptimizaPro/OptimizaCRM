"""
Optimiza-CRM – Scheduling views
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from datetime import timedelta, datetime, date

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Organization
from apps.crm.models import CalendarEvent
from apps.crm.views import TenantViewSetMixin
from core.middleware import get_current_organization
from core.permissions import IsReadOnlyOrAbove

from .models import Booking, EventType, ScheduleAvailability
from .serializers import (
    BookingSerializer,
    EventTypeSerializer,
    PublicBookingCreateSerializer,
    PublicEventTypeSerializer,
    ScheduleAvailabilitySerializer,
)


# ─── Protected views ──────────────────────────────────────────────────────────

class EventTypeViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset           = EventType.objects.all()
    serializer_class   = EventTypeSerializer
    permission_classes = [IsReadOnlyOrAbove]

    def perform_create(self, serializer):
        serializer.save(
            organization=get_current_organization(),
            user=self.request.user,
        )


class AvailabilityViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset           = ScheduleAvailability.objects.all()
    serializer_class   = ScheduleAvailabilitySerializer
    permission_classes = [IsReadOnlyOrAbove]

    def get_queryset(self):
        org = get_current_organization()
        if not org:
            return ScheduleAvailability.objects.none()
        return ScheduleAvailability.objects.filter(
            organization=org,
            user=self.request.user,
        )

    def perform_create(self, serializer):
        serializer.save(
            organization=get_current_organization(),
            user=self.request.user,
        )

    @action(detail=False, methods=["post"], url_path="bulk-update")
    def bulk_update(self, request):
        org = get_current_organization()
        if not org:
            return Response({"detail": "Organization not found."}, status=status.HTTP_400_BAD_REQUEST)

        slots_data = request.data.get("slots", [])

        # Delete all existing availability for this user+org
        ScheduleAvailability.objects.filter(organization=org, user=request.user).delete()

        created = []
        for slot in slots_data:
            serializer = ScheduleAvailabilitySerializer(data=slot)
            if serializer.is_valid():
                instance = serializer.save(organization=org, user=request.user)
                created.append(instance)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        result = ScheduleAvailabilitySerializer(created, many=True)
        return Response(result.data, status=status.HTTP_201_CREATED)


class BookingViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset           = Booking.objects.all()
    serializer_class   = BookingSerializer
    permission_classes = [IsReadOnlyOrAbove]

    def perform_destroy(self, instance):
        # Also remove the linked CalendarEvent
        if instance.calendar_event:
            instance.calendar_event.delete()
        instance.delete()

    def get_queryset(self):
        org = get_current_organization()
        if not org:
            return Booking.objects.none()
        qs = Booking.objects.filter(organization=org).order_by("-start_time")

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        start_param = self.request.query_params.get("start")
        if start_param:
            qs = qs.filter(start_time__gte=start_param)

        end_param = self.request.query_params.get("end")
        if end_param:
            qs = qs.filter(start_time__lte=end_param)

        return qs

    @action(detail=True, methods=["post"], url_path="confirm")
    def confirm(self, request, pk=None):
        booking = self.get_object()
        booking.status = "confirmed"
        booking.save(update_fields=["status", "updated_at"])
        if booking.calendar_event:
            booking.calendar_event.status = "confirmed"
            booking.calendar_event.save(update_fields=["status"])
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        booking = self.get_object()
        reason = request.data.get("reason", "")
        booking.status = "cancelled"
        booking.cancellation_reason = reason
        booking.save(update_fields=["status", "cancellation_reason", "updated_at"])
        if booking.calendar_event:
            booking.calendar_event.status = "cancelled"
            booking.calendar_event.save(update_fields=["status"])
        return Response(BookingSerializer(booking).data)


# ─── Public views ─────────────────────────────────────────────────────────────

class PublicOrgScheduleView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, org_slug):
        org = get_object_or_404(Organization, slug=org_slug)
        event_types = EventType.objects.filter(organization=org, is_active=True)
        serializer = PublicEventTypeSerializer(event_types, many=True)
        return Response({
            "org_name":   org.name,
            "org_slug":   org.slug,
            "event_types": serializer.data,
        })


class PublicEventTypeSlotsView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, org_slug, event_slug):
        org = get_object_or_404(Organization, slug=org_slug)
        event_type = get_object_or_404(EventType, slug=event_slug, organization=org, is_active=True)

        date_param = request.query_params.get("date")

        if not date_param:
            return Response({
                "event_type": PublicEventTypeSerializer(event_type).data,
                "slots": [],
            })

        # Parse date
        try:
            target_date = date.fromisoformat(date_param)
        except ValueError:
            return Response({"detail": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        today = now.date()

        # Check max_notice_days
        if (target_date - today).days > event_type.max_notice_days:
            return Response({
                "event_type": PublicEventTypeSerializer(event_type).data,
                "slots": [],
            })

        # Get day_of_week (Python weekday: 0=Monday)
        day_of_week = target_date.weekday()

        # Get active availability windows for host on that day
        availabilities = ScheduleAvailability.objects.filter(
            organization=org,
            user=event_type.user,
            day_of_week=day_of_week,
            is_active=True,
        )

        duration   = timedelta(minutes=event_type.duration_minutes)
        buffer     = timedelta(minutes=event_type.buffer_minutes)
        min_notice = timedelta(hours=event_type.min_notice_hours)
        earliest   = now + min_notice

        # Gather existing CalendarEvents for the host on target_date (non-cancelled)
        day_start = timezone.make_aware(datetime.combine(target_date, datetime.min.time()))
        day_end   = timezone.make_aware(datetime.combine(target_date, datetime.max.time()))

        busy_calendar = CalendarEvent.objects.filter(
            organization=org,
            user=event_type.user,
            start_time__lt=day_end,
            end_time__gt=day_start,
        ).exclude(status="cancelled").values_list("start_time", "end_time")

        # Existing confirmed/pending bookings for this event type on that day
        busy_bookings = Booking.objects.filter(
            organization=org,
            event_type=event_type,
            start_time__lt=day_end,
            end_time__gt=day_start,
            status__in=["pending", "confirmed"],
        ).values_list("start_time", "end_time")

        busy_periods = list(busy_calendar) + list(busy_bookings)

        slots = []
        for avail in availabilities:
            window_start = timezone.make_aware(
                datetime.combine(target_date, avail.start_time)
            )
            window_end = timezone.make_aware(
                datetime.combine(target_date, avail.end_time)
            )

            slot_start = window_start
            while slot_start + duration <= window_end:
                slot_end = slot_start + duration

                # Skip slots in the past (considering min_notice)
                if slot_start < earliest:
                    slot_start = slot_end + buffer
                    continue

                # Check conflicts
                conflict = False
                for busy_start, busy_end in busy_periods:
                    if busy_start < slot_end and busy_end > slot_start:
                        conflict = True
                        break

                if not conflict:
                    slots.append({
                        "start": slot_start.isoformat(),
                        "end":   slot_end.isoformat(),
                    })

                slot_start = slot_end + buffer

        return Response({
            "event_type": PublicEventTypeSerializer(event_type).data,
            "slots": slots,
        })


class PublicBookingVerifyView(APIView):
    """Public: client verifies or self-confirms their booking via UUID link."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, booking_id):
        booking    = get_object_or_404(Booking, id=booking_id)
        event_type = booking.event_type
        org        = booking.organization
        return Response({
            "booking_id":            str(booking.id),
            "status":                booking.status,
            "booker_name":           booking.booker_name,
            "booker_email":          booking.booker_email,
            "start_time":            booking.start_time.isoformat(),
            "end_time":              booking.end_time.isoformat(),
            "event_type":            event_type.title,
            "duration_minutes":      event_type.duration_minutes,
            "location":              event_type.location,
            "instructions":          event_type.instructions,
            "org_name":              org.name,
            "requires_confirmation": event_type.requires_confirmation,
        })

    def post(self, request, booking_id):
        """Client self-confirms a pending booking."""
        booking = get_object_or_404(Booking, id=booking_id)
        if booking.status != "pending":
            return Response(
                {"detail": "Esta reserva no está pendiente de confirmación."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        booking.status = "confirmed"
        booking.save(update_fields=["status", "updated_at"])
        if booking.calendar_event:
            booking.calendar_event.status = "confirmed"
            booking.calendar_event.save(update_fields=["status"])
        return Response({"status": "confirmed"})


class PublicBookingCreateView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, org_slug, event_slug):
        org = get_object_or_404(Organization, slug=org_slug)
        event_type = get_object_or_404(EventType, slug=event_slug, organization=org, is_active=True)

        serializer = PublicBookingCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        start_time = data["start_time"]

        # Ensure timezone aware
        if timezone.is_naive(start_time):
            start_time = timezone.make_aware(start_time)

        now = timezone.now()
        min_notice = timedelta(hours=event_type.min_notice_hours)

        # Validate start_time is in future with min_notice
        if start_time < now + min_notice:
            return Response(
                {"detail": "La hora seleccionada no cumple el plazo mínimo de antelación."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate not beyond max_notice_days
        max_date = now.date() + timedelta(days=event_type.max_notice_days)
        if start_time.date() > max_date:
            return Response(
                {"detail": "La fecha seleccionada excede el plazo máximo de reserva."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        end_time = start_time + timedelta(minutes=event_type.duration_minutes)

        # Validate slot falls within an availability window
        day_of_week = start_time.weekday()
        availabilities = ScheduleAvailability.objects.filter(
            organization=org,
            user=event_type.user,
            day_of_week=day_of_week,
            is_active=True,
        )

        slot_in_window = False
        for avail in availabilities:
            window_start = timezone.make_aware(
                datetime.combine(start_time.date(), avail.start_time)
            )
            window_end = timezone.make_aware(
                datetime.combine(start_time.date(), avail.end_time)
            )
            if start_time >= window_start and end_time <= window_end:
                slot_in_window = True
                break

        if not slot_in_window:
            return Response(
                {"detail": "El horario seleccionado no está disponible."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check conflicts with CalendarEvents (non-cancelled)
        calendar_conflict = CalendarEvent.objects.filter(
            organization=org,
            user=event_type.user,
            start_time__lt=end_time,
            end_time__gt=start_time,
        ).exclude(status="cancelled").exists()

        if calendar_conflict:
            return Response(
                {"detail": "El horario seleccionado ya está ocupado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check conflicts with existing bookings
        booking_conflict = Booking.objects.filter(
            organization=org,
            event_type=event_type,
            start_time__lt=end_time,
            end_time__gt=start_time,
            status__in=["pending", "confirmed"],
        ).exists()

        if booking_conflict:
            return Response(
                {"detail": "El horario seleccionado ya fue reservado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Determine booking status
        booking_status   = "pending" if event_type.requires_confirmation else "confirmed"
        calendar_status  = "pending_confirmation" if event_type.requires_confirmation else "confirmed"

        # Create CalendarEvent
        notes     = data.get("booker_notes", "")
        cal_event = CalendarEvent.objects.create(
            organization=org,
            user=event_type.user,
            title=f"\U0001f4c5 {data['booker_name']} — {event_type.title}",
            event_type="meeting",
            start_time=start_time,
            end_time=end_time,
            status=calendar_status,
            description=(
                f"Reserva de {data['booker_name']} ({data['booker_email']})\n\n{notes}"
            ),
        )

        # Create Booking
        booking = Booking.objects.create(
            organization=org,
            event_type=event_type,
            booker_name=data["booker_name"],
            booker_email=data["booker_email"],
            booker_phone=data.get("booker_phone", ""),
            booker_notes=notes,
            start_time=start_time,
            end_time=end_time,
            status=booking_status,
            calendar_event=cal_event,
        )

        return Response({
            "booking_id":           str(booking.id),
            "status":               booking.status,
            "start_time":           start_time.isoformat(),
            "end_time":             end_time.isoformat(),
            "event_type":           event_type.title,
            "requires_confirmation": event_type.requires_confirmation,
        }, status=status.HTTP_201_CREATED)
