"""
Optimiza-CRM – CRM admin (django-unfold)
"""

from django.contrib import admin
from unfold.admin import ModelAdmin as UnfoldModelAdmin, TabularInline
from .models import Lead, Customer, Opportunity, Task, Activity, CalendarEvent, PipelineTemplate, PipelineStage


class PipelineStageInline(TabularInline):
    model  = PipelineStage
    extra  = 0
    fields = ("name", "order", "probability")


@admin.register(Lead)
class LeadAdmin(UnfoldModelAdmin):
    list_display    = ("first_name", "last_name", "email", "status", "score", "assigned_to", "organization", "created_at")
    search_fields   = ("first_name", "last_name", "email", "company")
    list_filter     = ("status", "organization")
    readonly_fields = ("created_at", "updated_at")
    fieldsets       = (
        ("Datos personales",  {"fields": ("first_name", "last_name", "email", "phone", "company", "title")}),
        ("Estado CRM",        {"fields": ("status", "score", "source", "assigned_to", "organization")}),
        ("Notas",             {"fields": ("notes", "custom_fields")}),
        ("Fechas",            {"fields": ("created_at", "updated_at")}),
    )


@admin.register(Customer)
class CustomerAdmin(UnfoldModelAdmin):
    list_display    = ("name", "email", "company", "status", "organization", "created_at")
    search_fields   = ("name", "email", "company")
    list_filter     = ("status", "organization")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Opportunity)
class OpportunityAdmin(UnfoldModelAdmin):
    list_display    = ("title", "stage", "amount", "probability", "customer", "organization", "expected_close_date")
    search_fields   = ("title", "customer__name")
    list_filter     = ("stage", "organization")
    readonly_fields = ("created_at", "updated_at", "won_at", "lost_at")


@admin.register(Task)
class TaskAdmin(UnfoldModelAdmin):
    list_display    = ("title", "status", "priority", "due_date", "assigned_to", "organization")
    search_fields   = ("title",)
    list_filter     = ("status", "priority", "organization")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Activity)
class ActivityAdmin(UnfoldModelAdmin):
    list_display    = ("activity_type", "subject", "user", "organization", "created_at")
    list_filter     = ("activity_type", "organization")
    search_fields   = ("subject",)
    readonly_fields = ("created_at",)


@admin.register(CalendarEvent)
class CalendarEventAdmin(UnfoldModelAdmin):
    list_display    = ("title", "start_time", "end_time", "event_type", "organization", "user")
    search_fields   = ("title",)
    list_filter     = ("event_type", "organization")
    readonly_fields = ("created_at", "updated_at")


@admin.register(PipelineTemplate)
class PipelineTemplateAdmin(UnfoldModelAdmin):
    list_display    = ("name", "organization", "is_default", "created_at")
    list_filter     = ("is_default", "organization")
    search_fields   = ("name",)
    inlines         = [PipelineStageInline]
    readonly_fields = ("created_at", "updated_at")
