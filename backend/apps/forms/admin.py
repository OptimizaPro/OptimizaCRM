from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import EmbedForm, FormSubmission


class FormSubmissionInline(TabularInline):
    model          = FormSubmission
    extra          = 0
    readonly_fields = ("created_at", "ip_address", "lead", "data")
    fields         = ("created_at", "lead", "ip_address", "data")
    can_delete     = False
    show_change_link = True


@admin.register(EmbedForm)
class EmbedFormAdmin(ModelAdmin):
    list_display  = ("name", "organization", "is_active", "submit_count", "created_at")
    list_filter   = ("is_active", "organization")
    search_fields = ("name", "organization__name")
    readonly_fields = ("token", "submit_count", "embed_url", "embed_code", "created_at", "updated_at")
    inlines       = [FormSubmissionInline]
    fieldsets     = [
        ("General", {"fields": ("organization", "name", "is_active", "token")}),
        ("Contenido", {"fields": ("fields", "success_message", "redirect_url")}),
        ("Apariencia", {"fields": ("style",)}),
        ("Estadísticas", {"fields": ("submit_count",)}),
        ("Código embed", {"fields": ("embed_url", "embed_code")}),
        ("Fechas", {"fields": ("created_at", "updated_at")}),
    ]


@admin.register(FormSubmission)
class FormSubmissionAdmin(ModelAdmin):
    list_display  = ("form", "organization", "lead", "ip_address", "created_at")
    list_filter   = ("organization",)
    readonly_fields = ("form", "organization", "lead", "data", "ip_address", "user_agent", "created_at", "updated_at")
    search_fields = ("form__name", "lead__email", "ip_address")
