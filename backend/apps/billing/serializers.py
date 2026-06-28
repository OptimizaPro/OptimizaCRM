"""
Optimiza-CRM – Billing serializers
"""

from rest_framework import serializers
from .models import AddOn, Plan, Subscription


class AddOnSerializer(serializers.ModelSerializer):
    price_display = serializers.CharField(read_only=True)

    class Meta:
        model  = AddOn
        fields = ["id", "slug", "name", "description", "price", "price_display", "period", "icon", "is_featured", "sort_order"]


class PlanSerializer(serializers.ModelSerializer):
    price_display = serializers.CharField(read_only=True)

    class Meta:
        model  = Plan
        fields = [
            "id", "slug", "name", "tagline",
            "price_monthly", "price_annual", "currency",
            "price_display", "cta_text", "features",
            "has_trial", "trial_days",
            "is_popular", "sort_order",
            "ai_credits_monthly",
        ]


class SubscriptionSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model  = Subscription
        fields = [
            "id", "plan", "status", "is_active",
            "trial_ends_at", "current_period_start", "current_period_end",
            "canceled_at", "created_at", "updated_at",
        ]
        read_only_fields = fields
