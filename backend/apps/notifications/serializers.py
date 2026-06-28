"""
Optimiza-CRM – Notifications serializers
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notification
        fields = [
            "id", "title", "message", "notification_type",
            "is_read", "link", "metadata", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
