"""
Optimiza-CRM – CRM views
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import csv
import io
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
)
from .serializers import (
    LeadSerializer, CustomerSerializer, OpportunitySerializer,
    TaskSerializer, ActivitySerializer, CalendarEventSerializer,
    BulkLeadActionSerializer, CSVImportSerializer,
    PipelineTemplateSerializer, PipelineStageSerializer,
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
    queryset         = Lead.objects.all()
    serializer_class = LeadSerializer
    permission_classes = [IsReadOnlyOrAbove]
    filterset_class  = LeadFilter
    search_fields    = ["first_name", "last_name", "email", "company"]
    ordering_fields  = ["created_at", "score", "status"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "bulk", "import_csv"]:
            return [CanWriteCRM()]
        return super().get_permissions()

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
        writer.writerow(["name", "email", "phone", "company", "status", "lifetime_value", "churn_risk"])
        for c in customers:
            writer.writerow([c.name, c.email, c.phone, c.company, c.status, c.lifetime_value, c.churn_risk])
        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="customers.csv"'
        return response


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
        Activity.objects.create(
            organization=opp.organization, user=request.user,
            activity_type="status_change", related_type="opportunity", related_id=opp.id,
            subject=f"Etapa cambiada a {new_stage}",
        )
        return Response(OpportunitySerializer(opp).data)


# ─── Tasks ────────────────────────────────────────────────────────────────────

class TaskViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset           = Task.objects.all()
    serializer_class   = TaskSerializer
    permission_classes = [IsReadOnlyOrAbove]
    search_fields      = ["title"]
    ordering_fields    = ["due_date", "priority", "created_at"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [CanWriteCRM()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(organization=get_current_organization(), created_by=self.request.user)


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
