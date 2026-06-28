"""
Optimiza-CRM – Billing views
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import json
import logging

from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.middleware import get_current_organization
from core.permissions import IsOrgAdmin
from .models import AddOn, Plan, Subscription, BillingEvent
from .serializers import AddOnSerializer, PlanSerializer, SubscriptionSerializer
from . import recurrente

logger = logging.getLogger(__name__)


# ─── GET /api/v1/billing/plans/  (pública) ────────────────────────────────────

class PlanListView(APIView):
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get(self, request):
        plans = Plan.objects.filter(is_active=True).order_by("sort_order")
        return Response(PlanSerializer(plans, many=True).data)


class AddOnListView(APIView):
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get(self, request):
        addons = AddOn.objects.filter(is_active=True, show_in_pricing=True).order_by("sort_order")
        return Response(AddOnSerializer(addons, many=True).data)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_or_create_subscription(org) -> Subscription:
    sub, _ = Subscription.objects.get_or_create(
        organization=org,
        defaults={
            "plan":   "basico",
            "status": "trialing",
            "trial_ends_at": timezone.now() + timezone.timedelta(days=14),
        },
    )
    return sub


# ─── GET /api/v1/billing/subscription/ ────────────────────────────────────────

class SubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = get_current_organization()
        if not org:
            return Response({"error": "Sin contexto de organización."}, status=400)

        sub = _get_or_create_subscription(org)
        return Response(SubscriptionSerializer(sub).data)


# ─── POST /api/v1/billing/checkout/ ───────────────────────────────────────────

class CreateCheckoutView(APIView):
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def post(self, request):
        org = get_current_organization()
        if not org:
            return Response({"error": "Sin contexto de organización."}, status=400)

        plan = request.data.get("plan", "basico")
        if not Plan.objects.filter(slug=plan, is_active=True).exists():
            return Response({"error": f"Plan inválido o inactivo: {plan}"}, status=400)

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        success_url  = f"{frontend_url}/dashboard/settings?status=success&plan={plan}"
        cancel_url   = f"{frontend_url}/dashboard/settings?status=canceled"

        try:
            checkout = recurrente.create_checkout(plan, success_url, cancel_url)
        except Exception as exc:
            logger.error("Recurrente checkout error: %s", exc)
            return Response({"error": "No se pudo crear el checkout. Intenta de nuevo."}, status=502)

        # Store the pending checkout id
        sub = _get_or_create_subscription(org)
        sub.recurrente_checkout_id = checkout["id"]
        sub.save(update_fields=["recurrente_checkout_id", "updated_at"])

        return Response({"checkout_url": checkout["checkout_url"]})


# ─── POST /api/v1/billing/addon-checkout/ ─────────────────────────────────────

class CreateAddonCheckoutView(APIView):
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def post(self, request):
        org = get_current_organization()
        if not org:
            return Response({"error": "Sin contexto de organización."}, status=400)

        addon_slug = request.data.get("slug", "")
        if not AddOn.objects.filter(slug=addon_slug, is_active=True).exists():
            return Response({"error": f"Add-on inválido o inactivo: {addon_slug}"}, status=400)

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        success_url  = f"{frontend_url}/dashboard/settings?status=success&addon={addon_slug}"
        cancel_url   = f"{frontend_url}/dashboard/settings?status=canceled"

        try:
            checkout = recurrente.create_addon_checkout(addon_slug, success_url, cancel_url)
        except Exception as exc:
            logger.error("Recurrente addon checkout error: %s", exc)
            return Response({"error": "No se pudo crear el checkout. Intenta de nuevo."}, status=502)

        return Response({"checkout_url": checkout["checkout_url"]})


# ─── POST /api/v1/billing/webhook/ ────────────────────────────────────────────

class WebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def post(self, request):
        payload_bytes = request.body
        sig_header    = request.headers.get("X-Recurrente-Signature", "")

        if not recurrente.verify_webhook_signature(payload_bytes, sig_header):
            logger.warning("Recurrente webhook: invalid signature")
            return HttpResponse(status=400)

        try:
            data = json.loads(payload_bytes)
        except json.JSONDecodeError:
            return HttpResponse(status=400)

        event_id   = data.get("id", "")
        event_type = data.get("type", "")

        # Idempotency check
        if BillingEvent.objects.filter(event_id=event_id).exists():
            return HttpResponse(status=200)

        BillingEvent.objects.create(
            event_id   = event_id,
            event_type = event_type,
            payload    = data,
        )

        self._process(event_type, data)
        return HttpResponse(status=200)

    def _process(self, event_type: str, data: dict):
        checkout_obj = data.get("data", {}).get("object", {})
        checkout_id  = checkout_obj.get("id", "")

        try:
            sub = Subscription.objects.get(recurrente_checkout_id=checkout_id)
        except Subscription.DoesNotExist:
            logger.info("Webhook %s: no subscription for checkout %s", event_type, checkout_id)
            return

        if event_type == "checkout.completed":
            # Determine plan from checkout metadata or amount
            sub.status = "active"
            sub.current_period_start = timezone.now()
            sub.current_period_end   = timezone.now() + timezone.timedelta(days=30)
            sub.save(update_fields=["status", "current_period_start", "current_period_end", "updated_at"])
            # Also update organization plan
            sub.organization.plan = sub.plan
            sub.organization.save(update_fields=["plan"])
            logger.info("Subscription activated for org %s (plan: %s)", sub.organization_id, sub.plan)

        elif event_type in ("subscription.canceled", "checkout.expired"):
            sub.status      = "canceled"
            sub.canceled_at = timezone.now()
            sub.save(update_fields=["status", "canceled_at", "updated_at"])
            logger.info("Subscription canceled for org %s", sub.organization_id)
