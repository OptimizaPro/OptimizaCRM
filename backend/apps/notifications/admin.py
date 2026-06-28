"""
Optimiza-CRM – Notifications admin (django-unfold)
"""

from django.contrib import admin
from unfold.admin import ModelAdmin as UnfoldModelAdmin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(UnfoldModelAdmin):
    list_display    = ("title", "notification_type", "is_read", "user", "organization", "created_at")
    list_filter     = ("notification_type", "is_read", "organization")
    search_fields   = ("title", "user__email")
    readonly_fields = ("created_at",)
