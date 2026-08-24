"""
Optimiza-CRM – CRM views
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import csv
import io
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)
from django.http import HttpResponse
from django.utils import timezone
from django.utils.text import slugify
from django.shortcuts import get_object_or_404
from django.db.models import Sum
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters

from core.permissions import CanWriteCRM, IsReadOnlyOrAbove
from core.middleware import get_current_organization
from .models import (
    Lead, Customer, Opportunity, Task, Activity,
    CalendarEvent, PipelineTemplate, PipelineStage,
    Team, TeamMembership, ConsumptionRecord, IncentiveProgram,
    WhatsAppCampaign,
)
from .serializers import (
    LeadSerializer, CustomerSerializer, OpportunitySerializer,
    TaskSerializer, ActivitySerializer, CalendarEventSerializer,
    BulkLeadActionSerializer, CSVImportSerializer,
    PipelineTemplateSerializer, PipelineStageSerializer,
    TeamSerializer, TeamMembershipSerializer,
    ConsumptionRecordSerializer, IncentiveProgramSerializer,
    WhatsAppCampaignSerializer,
)


# ─── Shared mixin ─────────────────────────────────────────────────────────────

class TenantViewSetMixin:
    def get_queryset(self):
        org = get_current_organization()
        if not org:
            return self.queryset.model.objects.none()
        return self.queryset.model.objects.filter(organization=org)

    def perform_create(self, serializer):
        serializer.save(organization=get_current_organization())


# ─── Leads ────────────────────────────────────────────────────────────────────

class LeadFilter(filters.FilterSet):
    status      = filters.CharFilter()
    source      = filters.CharFilter()
    assigned_to = filters.UUIDFilter()
    min_score   = filters.NumberFilter(field_name="score", lookup_expr="gte")

    class Meta:
        model  = Lead
        fields = ["status", "source", "assigned_to"]


class LeadViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset         = Lead.objects.prefetch_related("opportunities")
    serializer_class = LeadSerializer
    permission_classes = [IsReadOnlyOrAbove]
    filterset_class  = LeadFilter
    search_fields    = ["first_name", "last_name", "email", "company"]
    ordering_fields  = ["created_at", "score", "status"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "bulk", "import_csv"]:
            return [CanWriteCRM()]
        return super().get_permissions()

    def perform_create(self, serializer):
        org  = get_current_organization()
        lead = serializer.save(organization=org)

        # Auto-create a follow-up task for every new lead
        Task.objects.create(
            organization = org,
            created_by   = self.request.user,
            assigned_to  = lead.assigned_to,
            title        = f"Seguimiento — {lead.full_name}",
            description  = (
                f"Tarea de seguimiento generada automáticamente para el lead "
                f"{lead.full_name} ({lead.email or 'sin email'})."
            ),
            priority     = "medium",
            status       = "pending",
            related_type = "lead",
            related_id   = lead.id,
            due_date     = timezone.now() + timedelta(days=1),
        )

    @action(detail=True, methods=["post"], url_path="convert-to-opportunity")
    def convert_to_opportunity(self, request, pk=None):
        lead = self.get_object()
        org  = get_current_organization()
        if lead.opportunities.exists():
            return Response({"detail": "Este lead ya tiene una oportunidad vinculada."}, status=status.HTTP_400_BAD_REQUEST)
        opp = Opportunity.objects.create(
            organization = org,
            lead         = lead,
            assigned_to  = lead.assigned_to,
            title        = lead.full_name or lead.email or "Nueva oportunidad",
            stage        = "new",
            amount       = 0,
            probability  = 10,
        )
        Lead.objects.filter(id=lead.id).update(status="qualified", updated_at=timezone.now())
        return Response(OpportunitySerializer(opp).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="convert-to-customer")
    def convert_to_customer(self, request, pk=None):
        lead = self.get_object()
        org  = get_current_organization()
        name = lead.full_name or lead.email or "Cliente"
        # Create or get customer (match by email if available)
        if lead.email:
            customer, created = Customer.objects.get_or_create(
                organization=org, email=lead.email,
                defaults={"name": name, "phone": lead.phone, "company": lead.company, "assigned_to": lead.assigned_to},
            )
        else:
            customer = Customer.objects.create(
                organization=org, name=name, phone=lead.phone, company=lead.company, assigned_to=lead.assigned_to,
            )
            created = True
        Lead.objects.filter(id=lead.id).update(status="converted", updated_at=timezone.now())
        return Response({**CustomerSerializer(customer).data, "created": created}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def bulk(self, request):
        serializer = BulkLeadActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        org   = get_current_organization()
        leads = Lead.objects.filter(organization=org, id__in=serializer.validated_data["ids"])
        action_type = serializer.validated_data["action"]
        if action_type == "delete":
            count = leads.count(); leads.delete()
            return Response({"deleted": count})
        elif action_type == "assign":
            leads.update(assigned_to_id=serializer.validated_data["assigned_to"])
            return Response({"updated": leads.count()})
        elif action_type == "update_status":
            leads.update(status=serializer.validated_data["status"])
            return Response({"updated": leads.count()})
        return Response({"error": "Acción inválida"}, status=400)

    @action(detail=False, methods=["post"], url_path="import")
    def import_csv(self, request):
        serializer = CSVImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        org = get_current_organization()
        decoded = serializer.validated_data["file"].read().decode("utf-8")
        reader  = csv.DictReader(io.StringIO(decoded))
        created = 0
        for row in reader:
            Lead.objects.create(
                organization=org,
                first_name=row.get("first_name", ""),
                last_name=row.get("last_name", ""),
                email=row.get("email", ""),
                phone=row.get("phone", ""),
                company=row.get("company", ""),
                source=row.get("source", "web"),
                status=row.get("status", "new"),
            )
            created += 1
        return Response({"imported": created})

    @action(detail=True, methods=["post"], url_path="track", permission_classes=[])
    def track(self, request, pk=None):
        """Endpoint público para registrar eventos de engagement.

        Body JSON:
          { "event": "email_open" | "link_click" | "page_visit" }

        Diseñado para ser llamado desde:
          - Pixel de seguimiento en emails (GET con ?event=email_open)
          - Webhooks de proveedores de email (Brevo, Mailchimp, etc.)
          - Scripts de seguimiento web
        """
        from django.db.models import F  # noqa: PLC0415

        event = request.data.get("event") or request.query_params.get("event")
        ALLOWED = {"email_open": "email_opens", "link_click": "link_clicks", "page_visit": "page_visits"}

        if event not in ALLOWED:
            return Response(
                {"error": f"Evento inválido. Opciones: {list(ALLOWED.keys())}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        field = ALLOWED[event]
        Lead.objects.filter(pk=pk).update(**{field: F(field) + 1})

        lead = Lead.objects.get(pk=pk)
        return Response({
            "lead_id":          str(lead.pk),
            "event":            event,
            "email_opens":      lead.email_opens,
            "link_clicks":      lead.link_clicks,
            "page_visits":      lead.page_visits,
            "engagement_score": lead.engagement_score,
        })

    @action(detail=False, methods=["get"])
    def export(self, request):
        org    = get_current_organization()
        leads  = Lead.objects.filter(organization=org)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["first_name", "last_name", "email", "phone", "company", "source", "status", "score"])
        for lead in leads:
            writer.writerow([lead.first_name, lead.last_name, lead.email, lead.phone,
                             lead.company, lead.source, lead.status, lead.score])
        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="leads.csv"'
        return response


# ─── Customers ────────────────────────────────────────────────────────────────

class CustomerViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset           = Customer.objects.all()
    serializer_class   = CustomerSerializer
    permission_classes = [IsReadOnlyOrAbove]
    search_fields      = ["name", "email", "company"]
    filterset_fields   = ["status", "segment"]
    ordering_fields    = ["created_at", "lifetime_value", "churn_risk"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [CanWriteCRM()]
        return super().get_permissions()

    @action(detail=True, methods=["get"])
    def activities(self, request, pk=None):
        customer   = self.get_object()
        activities = Activity.objects.filter(
            organization=customer.organization, related_type="customer", related_id=customer.id,
        )
        return Response(ActivitySerializer(activities, many=True).data)

    @action(detail=True, methods=["post"])
    def notes(self, request, pk=None):
        customer = self.get_object()
        activity = Activity.objects.create(
            organization=customer.organization, user=request.user,
            activity_type="note", related_type="customer", related_id=customer.id,
            subject=request.data.get("subject", "Nota"),
            body=request.data.get("body", ""),
        )
        return Response(ActivitySerializer(activity).data, status=201)

    @action(detail=False, methods=["post"], url_path="import")
    def import_csv(self, request):
        serializer = CSVImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        org     = get_current_organization()
        decoded = serializer.validated_data["file"].read().decode("utf-8")
        reader  = csv.DictReader(io.StringIO(decoded))
        created = 0
        for row in reader:
            Customer.objects.create(
                organization=org,
                name=row.get("name", ""),
                email=row.get("email", ""),
                phone=row.get("phone", ""),
                company=row.get("company", ""),
                status=row.get("status", "active"),
            )
            created += 1
        return Response({"imported": created})

    @action(detail=False, methods=["get"])
    def export(self, request):
        org       = get_current_organization()
        customers = Customer.objects.filter(organization=org)
        output    = io.StringIO()
        writer    = csv.writer(output)
        writer.writerow(["name", "email", "phone", "company", "status", "segment", "lifetime_value", "churn_risk"])
        for c in customers:
            writer.writerow([c.name, c.email, c.phone, c.company, c.status, c.segment, c.lifetime_value, c.churn_risk])
        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="customers.csv"'
        return response

    @action(detail=True, methods=["get", "post"], url_path="consumption")
    def consumption(self, request, pk=None):
        customer = self.get_object()
        org      = get_current_organization()

        if request.method == "GET":
            qs = ConsumptionRecord.objects.filter(organization=org, customer=customer)
            date_from = request.query_params.get("date_from")
            date_to   = request.query_params.get("date_to")
            if date_from:
                qs = qs.filter(date__gte=date_from)
            if date_to:
                qs = qs.filter(date__lte=date_to)
            total = qs.aggregate(total=Sum("amount"))["total"] or 0
            return Response({
                "records": ConsumptionRecordSerializer(qs, many=True).data,
                "total":   float(total),
                "count":   qs.count(),
            })

        # POST — create record
        serializer = ConsumptionRecordSerializer(data={**request.data, "customer": str(customer.id)})
        serializer.is_valid(raise_exception=True)
        record = serializer.save(organization=org, customer=customer)

        # Update customer lifetime_value and recalculate segment
        customer.lifetime_value = (
            ConsumptionRecord.objects.filter(organization=org, customer=customer)
            .aggregate(total=Sum("amount"))["total"] or 0
        )
        customer.recalculate_segment()
        customer.save(update_fields=["lifetime_value", "segment"])

        return Response(ConsumptionRecordSerializer(record).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="consumption-summary")
    def consumption_summary(self, request, pk=None):
        """Aggregated consumption for two arbitrary months, for period comparison."""
        customer = self.get_object()
        org      = get_current_organization()
        now      = timezone.now()

        MONTHS_ES = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
        ]

        def _parse_int(key, default):
            try:
                return int(request.query_params.get(key, default))
            except (ValueError, TypeError):
                return default

        year  = _parse_int("year",  now.year)
        month = _parse_int("month", now.month)
        if not (1 <= month <= 12):
            month = now.month

        def_prev_m = month - 1 if month > 1 else 12
        def_prev_y = year if month > 1 else year - 1
        compare_year  = _parse_int("compare_year",  def_prev_y)
        compare_month = _parse_int("compare_month", def_prev_m)
        if not (1 <= compare_month <= 12):
            compare_month = def_prev_m

        def _period_totals(y, m):
            qs = ConsumptionRecord.objects.filter(
                organization=org, customer=customer, date__year=y, date__month=m
            )
            total = float(qs.aggregate(t=Sum("amount"))["t"] or 0)
            count = qs.count()
            by_category = {
                cat: float(qs.filter(category=cat).aggregate(t=Sum("amount"))["t"] or 0)
                for cat in ("purchase", "service", "recharge", "other")
            }
            return {"total": total, "count": count, "by_category": by_category,
                    "label": f"{MONTHS_ES[m - 1]} {y}"}

        current = _period_totals(year, month)
        compare = _period_totals(compare_year, compare_month)

        if compare["total"] > 0:
            delta_pct = round((current["total"] - compare["total"]) / compare["total"] * 100, 1)
        else:
            delta_pct = None

        trend = "neutral"
        if delta_pct is not None:
            trend = "up" if delta_pct > 0 else "down" if delta_pct < 0 else "neutral"

        return Response({"current": current, "compare": compare,
                         "delta_pct": delta_pct, "trend": trend})

    @action(detail=True, methods=["delete"], url_path=r"consumption/(?P<record_id>[^/.]+)")
    def delete_consumption(self, request, pk=None, record_id=None):
        customer = self.get_object()
        org      = get_current_organization()
        record   = get_object_or_404(ConsumptionRecord, id=record_id, organization=org, customer=customer)
        record.delete()

        # Recalculate lifetime_value and segment after deletion
        customer.lifetime_value = (
            ConsumptionRecord.objects.filter(organization=org, customer=customer)
            .aggregate(total=Sum("amount"))["total"] or 0
        )
        customer.recalculate_segment()
        customer.save(update_fields=["lifetime_value", "segment"])

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch"], url_path="segment")
    def update_segment(self, request, pk=None):
        """Manually set a customer segment (disables auto-segmentation)."""
        customer     = self.get_object()
        new_segment  = request.data.get("segment")
        valid        = dict(Customer.SEGMENT_CHOICES)
        if new_segment not in valid:
            return Response({"error": f"Segmento inválido. Opciones: {list(valid.keys())}"}, status=400)
        Customer.objects.filter(id=customer.id).update(
            segment=new_segment, segment_auto=False,
        )
        customer.refresh_from_db()
        return Response(CustomerSerializer(customer).data)

    @action(detail=False, methods=["get"], url_path="by-segment")
    def by_segment(self, request):
        org = get_current_organization()
        result = {}
        for seg, label in Customer.SEGMENT_CHOICES:
            qs     = Customer.objects.filter(organization=org, segment=seg)
            result[seg] = {
                "label": label,
                "count": qs.count(),
                "total_ltv": float(qs.aggregate(t=Sum("lifetime_value"))["t"] or 0),
            }
        return Response(result)


# ─── Incentive Programs ───────────────────────────────────────────────────────

class IncentiveProgramViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset           = IncentiveProgram.objects.all()
    serializer_class   = IncentiveProgramSerializer
    permission_classes = [IsReadOnlyOrAbove]
    search_fields      = ["name", "description"]
    filterset_fields   = ["program_type", "target_segment", "is_active"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [CanWriteCRM()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(organization=get_current_organization(), created_by=self.request.user)


# ─── WhatsApp Campaigns ───────────────────────────────────────────────────────

class WhatsAppCampaignViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset           = WhatsAppCampaign.objects.all()
    serializer_class   = WhatsAppCampaignSerializer
    permission_classes = [IsReadOnlyOrAbove]
    search_fields      = ["name"]
    filterset_fields   = ["status", "target_segment"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "preview", "send"]:
            return [CanWriteCRM()]
        return super().get_permissions()

    def perform_create(self, serializer):
        org = get_current_organization()
        # Calculate recipient_count at creation time
        segment = serializer.validated_data.get("target_segment", "all")
        qs = Customer.objects.filter(organization=org, phone__gt="")
        if segment != "all":
            qs = qs.filter(segment=segment)
        serializer.save(organization=org, created_by=self.request.user, recipient_count=qs.count())

    @action(detail=True, methods=["post"])
    def preview(self, request, pk=None):
        """Returns the rendered message for the first matched recipient."""
        campaign = self.get_object()
        org      = get_current_organization()
        qs = Customer.objects.filter(organization=org, phone__gt="")
        if campaign.target_segment != "all":
            qs = qs.filter(segment=campaign.target_segment)
        sample = qs.first()
        if not sample:
            return Response({"rendered": campaign.message_template, "recipient": None})
        rendered = (
            campaign.message_template
            .replace("{{nombre}}", sample.name)
            .replace("{{segmento}}", dict(Customer.SEGMENT_CHOICES).get(sample.segment, sample.segment))
            .replace("{{empresa}}", sample.company or "")
        )
        return Response({
            "rendered":  rendered,
            "recipient": {"name": sample.name, "phone": sample.phone, "segment": sample.segment},
        })

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        """
        Marks campaign as 'sending' and queues messages.
        WhatsApp integration will be wired once Meta API is configured.
        """
        campaign = self.get_object()
        if campaign.status not in ("draft", "scheduled"):
            return Response({"error": "Solo se pueden enviar campañas en estado borrador o programada."}, status=400)

        org = get_current_organization()
        qs  = Customer.objects.filter(organization=org, phone__gt="")
        if campaign.target_segment != "all":
            qs = qs.filter(segment=campaign.target_segment)

        recipient_count = qs.count()
        WhatsAppCampaign.objects.filter(id=campaign.id).update(
            status="sending",
            recipient_count=recipient_count,
        )

        # TODO: enqueue actual WhatsApp API calls here once Meta integration is configured
        # For now, simulate immediate "sent" status
        WhatsAppCampaign.objects.filter(id=campaign.id).update(
            status="sent",
            sent_count=recipient_count,
            failed_count=0,
            sent_at=timezone.now(),
        )

        campaign.refresh_from_db()
        return Response(WhatsAppCampaignSerializer(campaign).data)


# ─── Opportunities ────────────────────────────────────────────────────────────

class OpportunityFilter(filters.FilterSet):
    stage       = filters.CharFilter()
    assigned_to = filters.UUIDFilter()

    class Meta:
        model  = Opportunity
        fields = ["stage", "assigned_to"]


class OpportunityViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset           = Opportunity.objects.select_related("customer", "assigned_to")
    serializer_class   = OpportunitySerializer
    permission_classes = [IsReadOnlyOrAbove]
    filterset_class    = OpportunityFilter
    search_fields      = ["title"]
    ordering_fields    = ["created_at", "amount", "expected_close_date"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "update_stage"]:
            return [CanWriteCRM()]
        return super().get_permissions()

    @action(detail=False, methods=["get"])
    def pipeline(self, request):
        org    = get_current_organization()
        stages = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]
        result = {}
        for stage in stages:
            opps = Opportunity.objects.filter(organization=org, stage=stage)
            result[stage] = {
                "count":        opps.count(),
                "total_amount": float(opps.aggregate(total=Sum("amount"))["total"] or 0),
                "opportunities": OpportunitySerializer(opps[:50], many=True).data,
            }
        return Response(result)

    @action(detail=False, methods=["get"])
    def export(self, request):
        org    = get_current_organization()
        opps   = Opportunity.objects.filter(organization=org).select_related("customer")
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["title", "stage", "amount", "probability", "customer", "expected_close_date"])
        for opp in opps:
            writer.writerow([
                opp.title, opp.stage, opp.amount, opp.probability,
                opp.customer.name if opp.customer else "",
                opp.expected_close_date or "",
            ])
        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="opportunities.csv"'
        return response

    @action(detail=True, methods=["patch"], url_path="stage")
    def update_stage(self, request, pk=None):
        opp       = self.get_object()
        new_stage = request.data.get("stage")
        if new_stage not in dict(Opportunity.STAGE_CHOICES):
            return Response({"error": "Etapa inválida"}, status=400)
        opp.stage = new_stage
        if new_stage == "won":
            opp.won_at = timezone.now(); opp.probability = 100
        elif new_stage == "lost":
            opp.lost_at = timezone.now()
            opp.lost_reason = request.data.get("lost_reason", "")
            opp.probability = 0
        opp.save()

        # Sync lead status for terminal stages only
        if opp.lead_id:
            if new_stage == "won":
                Lead.objects.filter(id=opp.lead_id).update(status="converted", updated_at=timezone.now())
            elif new_stage == "lost":
                Lead.objects.filter(id=opp.lead_id).update(status="lost", updated_at=timezone.now())

        STAGE_LABELS_ES = {
            "new": "Nuevo", "contacted": "Contactado", "qualified": "Calificado",
            "proposal": "Propuesta", "negotiation": "Negociación", "won": "Ganado", "lost": "Perdido",
        }
        Activity.objects.create(
            organization=opp.organization, user=request.user,
            activity_type="status_change", related_type="opportunity", related_id=opp.id,
            subject=f"Etapa cambiada a {STAGE_LABELS_ES.get(new_stage, new_stage)}",
        )
        return Response(OpportunitySerializer(opp).data)


# ─── Tasks ────────────────────────────────────────────────────────────────────

class TaskViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset           = Task.objects.all()
    serializer_class   = TaskSerializer
    permission_classes = [IsReadOnlyOrAbove]
    search_fields      = ["title", "description"]
    ordering_fields    = ["due_date", "priority", "created_at", "status"]
    filterset_fields   = ["status", "priority", "assigned_to"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy",
                           "complete", "reopen", "update_status"]:
            return [CanWriteCRM()]
        return super().get_permissions()

    def perform_create(self, serializer):
        org = get_current_organization()
        # Default assigned_to to the current user if not provided
        assigned_to = serializer.validated_data.get("assigned_to") or self.request.user
        serializer.save(organization=org, created_by=self.request.user, assigned_to=assigned_to)

    @action(detail=True, methods=["patch"], url_path="complete")
    def complete(self, request, pk=None):
        task              = self.get_object()
        task.status       = "completed"
        task.completed_at = timezone.now()
        task.save(update_fields=["status", "completed_at"])
        return Response(TaskSerializer(task).data)

    @action(detail=True, methods=["patch"], url_path="reopen")
    def reopen(self, request, pk=None):
        task              = self.get_object()
        task.status       = "pending"
        task.completed_at = None
        task.save(update_fields=["status", "completed_at"])
        return Response(TaskSerializer(task).data)

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        task       = self.get_object()
        new_status = request.data.get("status")
        valid      = dict(Task.STATUS_CHOICES)
        if new_status not in valid:
            return Response(
                {"error": f"Estado inválido. Opciones: {list(valid.keys())}"},
                status=400,
            )
        task.status = new_status
        if new_status == "completed":
            task.completed_at = timezone.now()
        elif task.completed_at and new_status != "completed":
            task.completed_at = None
        task.save(update_fields=["status", "completed_at"])
        return Response(TaskSerializer(task).data)


# ─── Activities ───────────────────────────────────────────────────────────────

class ActivityViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset           = Activity.objects.all()
    serializer_class   = ActivitySerializer
    permission_classes = [CanWriteCRM]
    filterset_fields   = ["activity_type", "related_type", "related_id"]

    def perform_create(self, serializer):
        serializer.save(organization=get_current_organization(), user=self.request.user)


# ─── Calendar ─────────────────────────────────────────────────────────────────

class CalendarViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset           = CalendarEvent.objects.all()
    serializer_class   = CalendarEventSerializer
    permission_classes = [IsReadOnlyOrAbove]

    def get_queryset(self):
        qs    = super().get_queryset()
        start = self.request.query_params.get("start")
        end   = self.request.query_params.get("end")
        if start:
            qs = qs.filter(end_time__gte=start)
        if end:
            qs = qs.filter(start_time__lte=end)
        return qs

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [CanWriteCRM()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(organization=get_current_organization(), user=self.request.user)


# ─── Pipelines ────────────────────────────────────────────────────────────────

class PipelineTemplateViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset           = PipelineTemplate.objects.prefetch_related("stages")
    serializer_class   = PipelineTemplateSerializer
    permission_classes = [IsReadOnlyOrAbove]
    pagination_class   = None

    def get_permissions(self):
        if self.action not in ["list", "retrieve", "kanban"]:
            return [CanWriteCRM()]
        return super().get_permissions()

    @action(detail=True, methods=["post"], url_path="stages")
    def add_stage(self, request, pk=None):
        pipeline = self.get_object()
        name = request.data.get("name", "").strip()
        if not name:
            return Response({"error": "El nombre de la etapa es obligatorio."}, status=400)
        base_slug = slugify(name) or "stage"
        slug, counter = base_slug, 1
        while PipelineStage.objects.filter(pipeline=pipeline, slug=slug).exists():
            slug = f"{base_slug}-{counter}"; counter += 1
        stage = PipelineStage.objects.create(
            pipeline=pipeline, name=name, slug=slug,
            order=pipeline.stages.count(),
            color=request.data.get("color", "#6B7280"),
            probability=request.data.get("probability", 50),
            is_won=request.data.get("is_won", False),
            is_lost=request.data.get("is_lost", False),
        )
        return Response(PipelineStageSerializer(stage).data, status=201)

    @action(detail=True, methods=["patch"], url_path=r"stages/(?P<stage_id>[^/.]+)")
    def update_stage(self, request, pk=None, stage_id=None):
        pipeline = self.get_object()
        stage    = get_object_or_404(PipelineStage, id=stage_id, pipeline=pipeline)
        serializer = PipelineStageSerializer(stage, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ─── Teams ────────────────────────────────────────────────────────────────────

class TeamViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset           = Team.objects.prefetch_related("memberships__user")
    serializer_class   = TeamSerializer
    permission_classes = [IsReadOnlyOrAbove]
    pagination_class   = None

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "add_member", "remove_member"]:
            return [CanWriteCRM()]
        return super().get_permissions()

    @action(detail=True, methods=["post"], url_path="members")
    def add_member(self, request, pk=None):
        team    = self.get_object()
        user_id = request.data.get("user_id")
        role    = request.data.get("role", "member")

        from apps.accounts.models import Membership  # noqa: PLC0415
        if not Membership.objects.filter(
            organization=team.organization, user_id=user_id, is_active=True,
        ).exists():
            return Response({"error": "El usuario no pertenece a esta organización."}, status=400)

        # ── Plan limit validation ──────────────────────────────────────────────
        PLAN_MEMBER_LIMITS = {"basico": 2, "pro": 6, "equipo": 12}
        try:
            from apps.billing.models import Subscription  # noqa: PLC0415
            sub = Subscription.objects.get(organization=team.organization)
            plan_slug = sub.plan
        except Exception:
            plan_slug = "basico"

        limit = PLAN_MEMBER_LIMITS.get(plan_slug, 2)
        current_count = TeamMembership.objects.filter(team=team).count()
        already_member = TeamMembership.objects.filter(team=team, user_id=user_id).exists()
        if not already_member and current_count >= limit:
            return Response(
                {
                    "error": f"Tu plan «{plan_slug}» permite un máximo de {limit} miembro{'s' if limit != 1 else ''} por equipo. "
                             f"Actualiza tu plan para agregar más colaboradores."
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        # ──────────────────────────────────────────────────────────────────────

        membership, created = TeamMembership.objects.get_or_create(
            team=team, user_id=user_id,
            defaults={"role": role},
        )
        if not created:
            membership.role = role
            membership.save()
        return Response(TeamMembershipSerializer(membership).data, status=201 if created else 200)

    @action(detail=True, methods=["delete"], url_path=r"members/(?P<user_id>[^/.]+)")
    def remove_member(self, request, pk=None, user_id=None):
        team = self.get_object()
        TeamMembership.objects.filter(team=team, user_id=user_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["delete"], url_path=r"stages/(?P<stage_id>[^/.]+)")
    def remove_stage(self, request, pk=None, stage_id=None):
        pipeline = self.get_object()
        stage    = get_object_or_404(PipelineStage, id=stage_id, pipeline=pipeline)
        stage.delete()
        return Response(status=204)

    @action(detail=True, methods=["post"], url_path="reorder")
    def reorder_stages(self, request, pk=None):
        pipeline  = self.get_object()
        stage_ids = request.data.get("stage_ids", [])
        for i, stage_id in enumerate(stage_ids):
            PipelineStage.objects.filter(id=stage_id, pipeline=pipeline).update(order=i)
        return Response({"status": "reordered"})

    @action(detail=True, methods=["get"], url_path="kanban")
    def kanban(self, request, pk=None):
        pipeline = self.get_object()
        result   = {}
        for stage in pipeline.stages.order_by("order"):
            opps = Opportunity.objects.filter(
                organization=pipeline.organization, pipeline_template=pipeline, stage=stage.slug,
            )
            result[stage.slug] = {
                "stage":        PipelineStageSerializer(stage).data,
                "count":        opps.count(),
                "total_amount": float(opps.aggregate(total=Sum("amount"))["total"] or 0),
                "opportunities": OpportunitySerializer(opps[:50], many=True).data,
            }
        return Response(result)
