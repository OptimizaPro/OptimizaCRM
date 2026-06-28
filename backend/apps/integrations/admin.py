"""
Optimiza-CRM – Integrations admin (django-unfold)
"""

from django.contrib import admin
from unfold.admin import ModelAdmin as UnfoldModelAdmin
from .models import Integration, IntegrationLog, Message, WebWidget


@admin.register(Integration)
class IntegrationAdmin(UnfoldModelAdmin):
    list_display    = ("name", "channel_type", "organization", "status", "is_active", "created_at")
    list_filter     = ("channel_type", "status", "is_active", "organization")
    search_fields   = ("name", "organization__name")
    readonly_fields = ("created_at", "updated_at")


@admin.register(IntegrationLog)
class IntegrationLogAdmin(UnfoldModelAdmin):
    list_display    = ("integration", "direction", "status", "created_at")
    list_filter     = ("status", "direction")
    search_fields   = ("integration__name",)
    readonly_fields = ("integration", "direction", "contact", "message_type",
                       "content", "status", "metadata", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Message)
class MessageAdmin(UnfoldModelAdmin):
    list_display    = ("subject", "direction", "from_address", "is_read", "organization", "received_at")
    list_filter     = ("direction", "is_read", "organization")
    search_fields   = ("subject", "from_address", "to_address")
    readonly_fields = ("created_at", "updated_at")


@admin.register(WebWidget)
class WebWidgetAdmin(UnfoldModelAdmin):
    list_display    = ("token", "mode", "organization", "is_active", "lead_count", "created_at")
    list_filter     = ("mode", "is_active", "organization")
    readonly_fields = ("token", "lead_count", "created_at", "updated_at")
