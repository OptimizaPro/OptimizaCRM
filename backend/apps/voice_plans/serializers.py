"""
Optimiza-CRM – Voice Plans serializers
"""

from rest_framework import serializers
from .models import VoiceFAQ, VoicePlan, VoiceStat, VoiceSetupPlan


# ─── Public (read-only, landing page) ─────────────────────────────────────────

class VoicePlanSerializer(serializers.ModelSerializer):
    annual_price    = serializers.IntegerField(read_only=True)
    overage_display = serializers.CharField(read_only=True)

    class Meta:
        model  = VoicePlan
        fields = [
            "id", "slug", "name",
            "price_monthly", "annual_price",
            "agents", "minutes_included",
            "overage_per_minute", "overage_display",
            "features", "cta_text",
            "is_popular", "sort_order",
        ]


class VoiceFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model  = VoiceFAQ
        fields = ["id", "question", "answer", "sort_order"]


class VoiceStatSerializer(serializers.ModelSerializer):
    class Meta:
        model  = VoiceStat
        fields = ["id", "value", "label", "sort_order"]


class VoiceSetupPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model  = VoiceSetupPlan
        fields = [
            "id", "slug", "name", "tagline",
            "price", "days",
            "features", "cta_text",
            "is_popular", "sort_order",
        ]


# ─── Admin (full CRUD, dashboard) ─────────────────────────────────────────────

class VoicePlanAdminSerializer(serializers.ModelSerializer):
    annual_price    = serializers.IntegerField(read_only=True)
    overage_display = serializers.CharField(read_only=True)

    class Meta:
        model  = VoicePlan
        fields = [
            "id", "slug", "name",
            "price_monthly", "annual_price",
            "agents", "minutes_included",
            "overage_per_minute", "overage_display",
            "features", "cta_text",
            "is_popular", "is_active", "sort_order",
        ]


class VoiceFAQAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model  = VoiceFAQ
        fields = ["id", "question", "answer", "sort_order", "is_active"]


class VoiceStatAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model  = VoiceStat
        fields = ["id", "value", "label", "sort_order", "is_active"]


class VoiceSetupPlanAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model  = VoiceSetupPlan
        fields = [
            "id", "slug", "name", "tagline",
            "price", "days",
            "features", "cta_text",
            "is_popular", "is_active", "sort_order",
        ]
