"""
Optimiza-CRM – CRM serializers
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import csv
import io
from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from .models import (
    Lead, Customer, Opportunity, Task, Activity,
    CalendarEvent, PipelineTemplate, PipelineStage,
    Team, TeamMembership,
)


class LeadSerializer(serializers.ModelSerializer):
    assigned_to_detail  = UserSerializer(source="assigned_to", read_only=True)
    full_name           = serializers.ReadOnlyField()
    engagement_score    = serializers.ReadOnlyField()
    opportunity_stage   = serializers.SerializerMethodField()
    opportunity_id      = serializers.SerializerMethodField()

    def get_opportunity_stage(self, obj):
        opp = obj.opportunities.order_by("-created_at").first()
        return opp.stage if opp else None

    def get_opportunity_id(self, obj):
        opp = obj.opportunities.order_by("-created_at").first()
        return str(opp.id) if opp else None

    class Meta:
        model  = Lead
        fields = [
            "id", "lead_ref_id", "first_name", "last_name", "full_name", "email", "phone",
            "company", "title", "source", "status", "score", "notes",
            "assigned_to", "assigned_to_detail", "custom_fields",
            "email_opens", "link_clicks", "page_visits", "engagement_score",
            "outbound_consent", "consent_date",
            "opportunity_stage", "opportunity_id",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "lead_ref_id", "score", "engagement_score", "created_at", "updated_at"]


class CustomerSerializer(serializers.ModelSerializer):
    assigned_to_detail = UserSerializer(source="assigned_to", read_only=True)

    class Meta:
        model  = Customer
        fields = [
            "id", "name", "email", "phone", "company", "status",
            "churn_risk", "lifetime_value", "address", "notes",
            "assigned_to", "assigned_to_detail", "custom_fields",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "churn_risk", "created_at", "updated_at"]


class OpportunitySerializer(serializers.ModelSerializer):
    assigned_to_detail = UserSerializer(source="assigned_to", read_only=True)
    customer_name      = serializers.CharField(source="customer.name", read_only=True)

    class Meta:
        model  = Opportunity
        fields = [
            "id", "title", "description", "stage", "amount", "probability",
            "expected_close_date", "won_at", "lost_at", "lost_reason",
            "customer", "customer_name", "lead", "assigned_to", "assigned_to_detail",
            "pipeline_template", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "won_at", "lost_at", "created_at", "updated_at"]


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_detail = UserSerializer(source="assigned_to", read_only=True)

    class Meta:
        model  = Task
        fields = [
            "id", "title", "description", "priority", "status",
            "due_date", "reminder_at", "completed_at",
            "assigned_to", "assigned_to_detail", "created_by",
            "related_type", "related_id", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "completed_at", "created_at", "updated_at"]


class ActivitySerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source="user", read_only=True)

    class Meta:
        model  = Activity
        fields = [
            "id", "activity_type", "related_type", "related_id",
            "subject", "body", "metadata",
            "user", "user_detail", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CalendarEventSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CalendarEvent
        fields = [
            "id", "title", "description", "event_type", "status",
            "start_time", "end_time", "location",
            "related_type", "related_id", "is_all_day", "user",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PipelineStageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PipelineStage
        fields = ["id", "name", "slug", "order", "color", "probability", "sla_hours", "is_won", "is_lost"]
        read_only_fields = ["id", "slug"]


class PipelineTemplateSerializer(serializers.ModelSerializer):
    stages            = PipelineStageSerializer(many=True, read_only=True)
    opportunity_count = serializers.SerializerMethodField()

    class Meta:
        model  = PipelineTemplate
        fields = [
            "id", "name", "description", "pipeline_type", "color",
            "is_active", "is_default", "stages", "opportunity_count", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_opportunity_count(self, obj):
        return obj.opportunities.count()


class TeamMembershipSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source="user", read_only=True)

    class Meta:
        model  = TeamMembership
        fields = ["id", "user", "user_detail", "role", "joined_at"]
        read_only_fields = ["id", "joined_at"]


class TeamSerializer(serializers.ModelSerializer):
    memberships  = TeamMembershipSerializer(many=True, read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model  = Team
        fields = ["id", "name", "description", "color", "memberships", "member_count", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_member_count(self, obj):
        return obj.memberships.count()


class BulkLeadActionSerializer(serializers.Serializer):
    ids         = serializers.ListField(child=serializers.UUIDField())
    action      = serializers.ChoiceField(choices=["delete", "assign", "update_status"])
    assigned_to = serializers.UUIDField(required=False)
    status      = serializers.CharField(required=False)


class CSVImportSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, value):
        if not value.name.endswith(".csv"):
            raise serializers.ValidationError("El archivo debe ser CSV.")
        return value
