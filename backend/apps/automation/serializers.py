"""
Optimiza-CRM – Automation serializers
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from rest_framework import serializers
from .models import AutomationRule


class AutomationRuleSerializer(serializers.ModelSerializer):
    trigger_type_display = serializers.CharField(source="get_trigger_type_display", read_only=True)
    action_type_display  = serializers.CharField(source="get_action_type_display",  read_only=True)

    class Meta:
        model  = AutomationRule
        fields = [
            "id",
            "name",
            "description",
            "trigger_type",
            "trigger_type_display",
            "action_type",
            "action_type_display",
            "action_config",
            "is_active",
            "run_count",
            "last_run_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "run_count", "last_run_at", "created_at", "updated_at"]
