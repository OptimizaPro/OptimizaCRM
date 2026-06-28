"""
Optimiza-CRM – Automation admin (django-unfold)
"""

from django.contrib import admin
from unfold.admin import ModelAdmin as UnfoldModelAdmin
from .models import AutomationRule


@admin.register(AutomationRule)
class AutomationRuleAdmin(UnfoldModelAdmin):
    list_display    = ("name", "trigger_type", "action_type", "is_active", "run_count", "last_run_at", "organization")
    search_fields   = ("name",)
    list_filter     = ("is_active", "trigger_type", "action_type", "organization")
    readonly_fields = ("run_count", "last_run_at", "created_at", "updated_at")
    fieldsets       = (
        ("Regla",         {"fields": ("name", "description", "organization", "is_active")}),
        ("Disparador",    {"fields": ("trigger_type", "trigger_config")}),
        ("Acción",        {"fields": ("action_type", "action_config")}),
        ("Estadísticas",  {"fields": ("run_count", "last_run_at")}),
        ("Fechas",        {"fields": ("created_at", "updated_at")}),
    )
