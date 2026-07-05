"""
Optimiza-CRM – Forms views
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import json

from django.db import models as _db_models
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.middleware import get_current_organization
from core.permissions import IsOrgAdmin
from .models import EmbedForm, FormSubmission
from .serializers import EmbedFormSerializer, FormSubmissionSerializer


# ─── CORS helper (same pattern as integrations/views.py) ─────────────────────

def _cors(response, request):
    origin = request.headers.get("Origin", "*")
    response["Access-Control-Allow-Origin"] = origin
    response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type"
    return response


# ─── Plan limits ──────────────────────────────────────────────────────────────

FORM_LIMIT_BY_PLAN = {
    # Current slugs in Organization.plan choices
    "free":       1,
    "pro":        6,
    "enterprise": 12,
    # Pricing page slugs (basico / equipo)
    "basico":     2,
    "equipo":     12,
}
DEFAULT_FORM_LIMIT = 2


def _form_limit(org) -> int:
    plan = getattr(org, "plan", "free") or "free"
    return FORM_LIMIT_BY_PLAN.get(plan, DEFAULT_FORM_LIMIT)


# ─── Authenticated CRUD ───────────────────────────────────────────────────────

class EmbedFormViewSet(viewsets.ModelViewSet):
    serializer_class   = EmbedFormSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        org = get_current_organization()
        if not org:
            return EmbedForm.objects.none()
        return EmbedForm.objects.filter(organization=org).order_by("-created_at")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOrgAdmin()]
        return [IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        """Override list to include plan limit metadata."""
        org        = get_current_organization()
        limit      = _form_limit(org) if org else DEFAULT_FORM_LIMIT
        queryset   = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "results":     serializer.data,
            "form_count":  queryset.count(),
            "form_limit":  limit,
            "plan":        getattr(org, "plan", "free") if org else "free",
        })

    def perform_create(self, serializer):
        org   = get_current_organization()
        limit = _form_limit(org)
        count = EmbedForm.objects.filter(organization=org).count()
        if count >= limit:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                {"detail": f"Has alcanzado el límite de {limit} formulario(s) de tu plan. Actualiza tu plan para crear más."},
                code="form_limit_exceeded",
            )
        serializer.save(organization=org)

    @action(detail=True, methods=["get"], url_path="submissions")
    def submissions(self, request, pk=None):
        form = self.get_object()
        qs   = FormSubmission.objects.filter(form=form).order_by("-created_at")
        serializer = FormSubmissionSerializer(qs, many=True)
        return Response({"results": serializer.data})


# ─── Public endpoints (no auth) ───────────────────────────────────────────────

# Direct lead field mapping from form field key → Lead model field
LEAD_DIRECT_FIELDS = {"first_name", "last_name", "email", "phone", "company", "title", "notes"}


def _get_client_ip(request):
    x_forwarded = request.headers.get("X-Forwarded-For")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


@csrf_exempt
def form_public_config(request):
    """GET /api/v1/f/config/?token=<uuid>  — public, no auth"""
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    token = request.GET.get("token")
    if not token:
        return _cors(JsonResponse({"error": "token required"}, status=400), request)

    try:
        form = EmbedForm.objects.select_related("organization").get(
            token=token, is_active=True
        )
    except EmbedForm.DoesNotExist:
        return _cors(JsonResponse({"error": "form not found"}, status=404), request)

    r = JsonResponse({
        "token":           str(form.token),
        "fields":          form.fields,
        "style":           form.style,
        "success_message": form.success_message,
        "redirect_url":    form.redirect_url,
    })
    return _cors(r, request)


@csrf_exempt
def form_public_submit(request):
    """POST /api/v1/f/submit/  — public, no auth"""
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    if request.method != "POST":
        return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, Exception):
        return _cors(JsonResponse({"error": "invalid JSON"}, status=400), request)

    token = body.get("token")
    if not token:
        return _cors(JsonResponse({"error": "token required"}, status=400), request)

    try:
        form = EmbedForm.objects.select_related("organization").get(
            token=token, is_active=True
        )
    except EmbedForm.DoesNotExist:
        return _cors(JsonResponse({"error": "form not found"}, status=404), request)

    submitted = body.get("data", {})

    # Validate required fields
    for field_def in form.fields:
        key      = field_def.get("key", "")
        required = field_def.get("required", False)
        if required and not submitted.get(key, "").strip():
            label = field_def.get("label", key)
            return _cors(
                JsonResponse({"error": f'El campo "{label}" es obligatorio.'}, status=400),
                request,
            )

    # Build Lead kwargs from field definitions
    lead_kwargs   = {"source": "web", "status": "new", "score": 0}
    custom_fields = {}

    for field_def in form.fields:
        key        = field_def.get("key", "")
        lead_field = field_def.get("lead_field")
        value      = submitted.get(key, "").strip() if isinstance(submitted.get(key), str) else submitted.get(key, "")

        if lead_field and lead_field in LEAD_DIRECT_FIELDS:
            lead_kwargs[lead_field] = value
        else:
            if value:
                custom_fields[key] = value

    if custom_fields:
        lead_kwargs["custom_fields"] = custom_fields

    # Ensure first_name is always set
    if not lead_kwargs.get("first_name"):
        lead_kwargs["first_name"] = lead_kwargs.get("email", "Lead").split("@")[0]

    # Upsert lead — deduplicate by email if present
    from apps.crm.models import Lead
    org  = form.organization
    email = lead_kwargs.get("email", "")

    if email:
        lead, _ = Lead.objects.update_or_create(
            organization=org,
            email=email,
            defaults=lead_kwargs,
        )
    else:
        lead = Lead.objects.create(organization=org, **lead_kwargs)

    # Create submission record
    submission = FormSubmission.objects.create(
        organization=org,
        form=form,
        lead=lead,
        data=submitted,
        ip_address=_get_client_ip(request),
        user_agent=request.headers.get("User-Agent", "")[:500],
    )

    # Increment counter atomically
    EmbedForm.objects.filter(pk=form.pk).update(
        submit_count=_db_models.F("submit_count") + 1
    )

    r = JsonResponse({"ok": True, "lead_id": str(lead.id)})
    return _cors(r, request)
