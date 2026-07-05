"""
Optimiza-CRM – Voice Plans views
  Public:  GET /voice/plans|faqs|stats/   — no auth
  Admin:   CRUD /voice/admin/plans|faqs|stats/  — org_admin / staff only
"""

from rest_framework import viewsets
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from core.middleware import get_current_organization
from .models import VoiceFAQ, VoicePlan, VoiceStat, VoiceSetupPlan
from .serializers import (
    VoiceFAQAdminSerializer,
    VoiceFAQSerializer,
    VoicePlanAdminSerializer,
    VoicePlanSerializer,
    VoiceStatAdminSerializer,
    VoiceStatSerializer,
    VoiceSetupPlanSerializer,
    VoiceSetupPlanAdminSerializer,
)


# ─── Permission ───────────────────────────────────────────────────────────────

class CanEditVoicePlans(BasePermission):
    """Django staff/superuser or org_admin membership."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        org = get_current_organization()
        if not org:
            return False
        try:
            from apps.accounts.models import Membership  # noqa: PLC0415
            m = Membership.objects.get(user=request.user, organization=org, is_active=True)
            return m.role == "org_admin"
        except Exception:
            return False


# ─── Public read-only views (landing /voz-ia) ─────────────────────────────────

class VoicePlanListView(APIView):
    """GET /api/v1/voice/plans/ — public"""
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get(self, request):
        plans = VoicePlan.objects.filter(is_active=True)
        return Response(VoicePlanSerializer(plans, many=True).data)


class VoiceFAQListView(APIView):
    """GET /api/v1/voice/faqs/ — public"""
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get(self, request):
        faqs = VoiceFAQ.objects.filter(is_active=True)
        return Response(VoiceFAQSerializer(faqs, many=True).data)


class VoiceStatListView(APIView):
    """GET /api/v1/voice/stats/ — public"""
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get(self, request):
        stats = VoiceStat.objects.filter(is_active=True)
        return Response(VoiceStatSerializer(stats, many=True).data)


class VoiceSetupPlanListView(APIView):
    """GET /api/v1/voice/setup-plans/ — public"""
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get(self, request):
        plans = VoiceSetupPlan.objects.filter(is_active=True)
        return Response(VoiceSetupPlanSerializer(plans, many=True).data)


# ─── Admin CRUD viewsets (dashboard) ──────────────────────────────────────────

class VoicePlanViewSet(viewsets.ModelViewSet):
    """CRUD /api/v1/voice/admin/plans/ — org_admin / staff"""
    permission_classes = [CanEditVoicePlans]
    serializer_class   = VoicePlanAdminSerializer
    queryset           = VoicePlan.objects.all().order_by("sort_order")


class VoiceFAQViewSet(viewsets.ModelViewSet):
    """CRUD /api/v1/voice/admin/faqs/ — org_admin / staff"""
    permission_classes = [CanEditVoicePlans]
    serializer_class   = VoiceFAQAdminSerializer
    queryset           = VoiceFAQ.objects.all().order_by("sort_order")


class VoiceStatViewSet(viewsets.ModelViewSet):
    """CRUD /api/v1/voice/admin/stats/ — org_admin / staff"""
    permission_classes = [CanEditVoicePlans]
    serializer_class   = VoiceStatAdminSerializer
    queryset           = VoiceStat.objects.all().order_by("sort_order")


class VoiceSetupPlanViewSet(viewsets.ModelViewSet):
    """CRUD /api/v1/voice/admin/setup-plans/ — org_admin / staff"""
    permission_classes = [CanEditVoicePlans]
    serializer_class   = VoiceSetupPlanAdminSerializer
    queryset           = VoiceSetupPlan.objects.all().order_by("sort_order")
