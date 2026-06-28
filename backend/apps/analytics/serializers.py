"""
Optimiza-CRM – Analytics serializers
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from rest_framework import serializers
from .models import Report, SalesGoal


class SalesGoalSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model  = SalesGoal
        fields = [
            "id", "user", "user_name", "period", "year", "month", "quarter",
            "target_revenue", "target_deals", "created_at",
        ]
        read_only_fields = ["id", "user_name", "created_at"]

    def get_user_name(self, obj):
        return obj.user.full_name


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Report
        fields = [
            "id", "name", "report_type", "parameters",
            "schedule", "last_run_at", "is_scheduled",
            "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "last_run_at", "created_by", "created_at", "updated_at"]
