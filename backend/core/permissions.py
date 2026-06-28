"""
Optimiza-CRM – DRF permission classes
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from rest_framework.permissions import BasePermission
from core.middleware import get_current_organization

ROLE_HIERARCHY = {
    "org_admin":       4,
    "sales_manager":   3,
    "sales_executive": 2,
    "viewer":          1,
}


def _user_role(request) -> int:
    org = get_current_organization()
    if not org or not request.user.is_authenticated:
        return 0
    try:
        from apps.accounts.models import Membership  # noqa: PLC0415
        m = Membership.objects.get(user=request.user, organization=org, is_active=True)
        return ROLE_HIERARCHY.get(m.role, 0)
    except Exception:
        return 0


class IsOrgAdmin(BasePermission):
    def has_permission(self, request, view):
        return _user_role(request) >= ROLE_HIERARCHY["org_admin"]


class CanWriteCRM(BasePermission):
    """Sales manager and above can write CRM data."""
    def has_permission(self, request, view):
        return _user_role(request) >= ROLE_HIERARCHY["sales_manager"]


class IsReadOnlyOrAbove(BasePermission):
    """Any authenticated member with at least viewer role."""
    def has_permission(self, request, view):
        return _user_role(request) >= ROLE_HIERARCHY["viewer"]
