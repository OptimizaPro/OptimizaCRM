"""
Optimiza-CRM – CMS / Site Content views
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response

from core.middleware import get_current_organization
from .models import SiteContent, DEFAULT_CONTENT


class CanEditCms(BasePermission):
    """Django staff/superuser or org_admin can edit CMS content."""

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


class SiteContentViewSet(viewsets.ViewSet):
    """
    GET  /content/        — all sections, public
    GET  /content/{key}/  — single section, public
    PATCH /content/{key}/ — update section, org_admin / staff only
    """

    def get_permissions(self):
        if self.action == "partial_update":
            return [CanEditCms()]
        return [AllowAny()]

    def list(self, request):
        result = {key: SiteContent.get_section(key) for key, _ in SiteContent.SECTION_CHOICES}
        return Response(result)

    def retrieve(self, request, pk=None):
        valid = [k for k, _ in SiteContent.SECTION_CHOICES]
        if pk not in valid:
            return Response({"error": "Sección no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"key": pk, "data": SiteContent.get_section(pk)})

    def partial_update(self, request, pk=None):
        valid = [k for k, _ in SiteContent.SECTION_CHOICES]
        if pk not in valid:
            return Response({"error": "Sección no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        new_data = request.data.get("data")
        if not isinstance(new_data, dict):
            return Response(
                {"error": "El campo 'data' debe ser un objeto JSON."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        obj, _ = SiteContent.objects.get_or_create(
            key=pk,
            defaults={"data": DEFAULT_CONTENT.get(pk, {})},
        )
        obj.data       = {**obj.data, **new_data}
        obj.updated_by = request.user
        obj.save()
        return Response({"key": pk, "data": obj.data})
