"""
Optimiza-CRM – Organization middleware
Reads X-Organization-ID header and stores the org in thread-local storage.
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import threading

_thread_locals = threading.local()


def get_current_organization():
    return getattr(_thread_locals, "organization", None)


class OrganizationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def _get_user_from_jwt(self, request):
        """Decode the Bearer token and return the user without relying on DRF auth."""
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None
        raw_token = auth_header.split(" ", 1)[1]
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            from django.contrib.auth import get_user_model
            token = AccessToken(raw_token)
            User = get_user_model()
            return User.objects.get(id=token["user_id"], is_active=True)
        except Exception:
            return None

    def __call__(self, request):
        org_id = request.headers.get("X-Organization-ID")
        _thread_locals.organization = None

        if org_id:
            # Use DRF-authenticated user if available, otherwise decode JWT directly
            user = request.user if (hasattr(request, "user") and request.user.is_authenticated) else self._get_user_from_jwt(request)
            if user and user.is_authenticated:
                try:
                    from apps.accounts.models import Organization, Membership
                    org = Organization.objects.get(id=org_id, is_active=True)
                    if Membership.objects.filter(user=user, organization=org, is_active=True).exists():
                        _thread_locals.organization = org
                except Exception:
                    pass

        response = self.get_response(request)
        _thread_locals.organization = None
        return response
