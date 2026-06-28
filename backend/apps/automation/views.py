"""
Optimiza-CRM – Automation views
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.middleware import get_current_organization
from core.permissions import IsReadOnlyOrAbove
from .executor import execute_rule
from .models import AutomationRule
from .serializers import AutomationRuleSerializer


class AutomationRuleViewSet(viewsets.ModelViewSet):
    serializer_class   = AutomationRuleSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyOrAbove]

    def get_queryset(self):
        org = get_current_organization()
        if not org:
            return AutomationRule.objects.none()
        return AutomationRule.objects.filter(organization=org)

    def perform_create(self, serializer):
        org = get_current_organization()
        serializer.save(organization=org)

    @action(detail=True, methods=["post"], url_path="toggle")
    def toggle(self, request, pk=None):
        rule = self.get_object()
        rule.is_active = not rule.is_active
        rule.save(update_fields=["is_active"])
        return Response(AutomationRuleSerializer(rule).data)

    @action(detail=True, methods=["post"], url_path="run")
    def run(self, request, pk=None):
        rule = self.get_object()
        execute_rule(rule, context={})
        rule.refresh_from_db(fields=["run_count", "last_run_at"])
        return Response({"status": "ok", "run_count": rule.run_count})
