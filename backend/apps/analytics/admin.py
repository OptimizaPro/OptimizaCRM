"""
Optimiza-CRM – Analytics admin (django-unfold)
"""

from django.contrib import admin
from unfold.admin import ModelAdmin as UnfoldModelAdmin
from .models import SalesGoal, Report


@admin.register(SalesGoal)
class SalesGoalAdmin(UnfoldModelAdmin):
    list_display    = ("user", "organization", "period", "year", "month", "target_revenue", "target_deals")
    list_filter     = ("period", "year", "organization")
    search_fields   = ("user__email", "organization__name")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Report)
class ReportAdmin(UnfoldModelAdmin):
    list_display    = ("name", "report_type", "organization", "created_by", "created_at")
    list_filter     = ("report_type", "organization")
    search_fields   = ("name",)
    readonly_fields = ("created_at", "updated_at")
