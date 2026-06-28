"""
Optimiza-CRM – Integrations serializers
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from rest_framework import serializers
from .models import Integration, IntegrationLog, Message


class IntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Integration
        fields = [
            "id", "channel_type", "name", "status", "is_active",
            "connected_at", "last_sync_at", "error_message",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "status", "connected_at", "last_sync_at", "error_message", "created_at", "updated_at"]


class IntegrationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model  = IntegrationLog
        fields = ["id", "direction", "contact", "message_type", "content", "status", "metadata", "created_at"]
        read_only_fields = ["id", "created_at"]


class MessageSerializer(serializers.ModelSerializer):
    channel_type = serializers.CharField(source="integration.channel_type", read_only=True)

    class Meta:
        model  = Message
        fields = [
            "id", "integration", "channel_type", "external_id",
            "direction", "from_address", "to_address", "subject",
            "body_text", "body_html", "is_read", "thread_id",
            "received_at", "metadata", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "external_id", "channel_type", "created_at", "updated_at"]
