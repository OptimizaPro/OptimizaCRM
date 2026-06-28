"""
Optimiza-CRM – Billing admin (django-unfold)
"""

import json
from django import forms
from django.contrib import admin
from unfold.admin import ModelAdmin as UnfoldModelAdmin
from .models import AddOn, Plan, Subscription, BillingEvent, OrgAddOn


# ── Widget JSON formateado ────────────────────────────────────────────────────

class PrettyJSONField(forms.JSONField):
    """JSONField que muestra el valor con indent=2 en el textarea del admin."""

    widget = forms.Textarea(attrs={
        "rows": 22,
        "style": (
            "font-family: 'JetBrains Mono','Fira Code',ui-monospace,monospace;"
            "font-size: .8rem; line-height: 1.6;"
            "width: 100%; max-width: 100%; box-sizing: border-box;"
        ),
    })

    def prepare_value(self, value):
        if isinstance(value, (list, dict)):
            return json.dumps(value, ensure_ascii=False, indent=2)
        return super().prepare_value(value)


class PlanAdminForm(forms.ModelForm):
    features = PrettyJSONField(
        label="Características",
        help_text=(
            "Cada objeto requiere tres propiedades: "
            "<b>text</b> (nombre), <b>included</b> (true/false), "
            "<b>highlight</b> (true = destacada en naranja para diferenciadores clave)."
        ),
    )

    class Meta:
        model = Plan
        fields = "__all__"


# ── Plan admin ────────────────────────────────────────────────────────────────

@admin.register(AddOn)
class AddOnAdmin(UnfoldModelAdmin):
    list_display        = ("name", "slug", "price_col", "period", "icon", "is_featured", "is_active", "sort_order")
    list_filter         = ("is_active", "is_featured", "icon")
    list_editable       = ("sort_order", "is_featured", "is_active")
    search_fields       = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    fieldsets           = (
        ("Identificación", {
            "fields": ("name", "slug", "icon"),
        }),
        ("Precio", {
            "description": "Importe en USD (ej. 8.00). El texto del período aparece justo debajo del precio en la tarjeta.",
            "fields": ("price", "period"),
        }),
        ("Inteligencia artificial", {
            "description": "Créditos de IA mensuales que este add-on suma al límite de la organización. Solo aplica a add-ons del tipo Paquete IA.",
            "fields": ("ai_credits",),
        }),
        ("Descripción", {
            "fields": ("description",),
        }),
        ("Visibilidad", {
            "fields": ("is_featured", "is_active", "sort_order"),
        }),
    )

    @admin.display(description="Precio", ordering="price")
    def price_col(self, obj):
        return obj.price_display


@admin.register(Plan)
class PlanAdmin(UnfoldModelAdmin):
    form                = PlanAdminForm
    list_display        = ("name", "slug", "price_col", "trial_col", "currency", "is_popular", "is_active", "sort_order")
    list_filter         = ("is_active", "is_popular", "has_trial", "currency")
    list_editable       = ("sort_order", "is_active", "is_popular")
    search_fields       = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    fieldsets           = (
        ("Identificación", {
            "fields": ("name", "slug", "tagline", "cta_text"),
        }),
        ("Precios", {
            "description": "Importes en USD (ej. 19.00). Usa 0.00 para plan gratuito o sin modalidad anual.",
            "fields": ("price_monthly", "price_annual", "currency"),
        }),
        ("Prueba gratuita", {
            "description": "Si está activo, el usuario no es cobrado hasta que termine el período de prueba.",
            "fields": ("has_trial", "trial_days"),
        }),
        ("Características", {
            "fields": ("features",),
        }),
        ("Visibilidad", {
            "fields": ("is_popular", "is_active", "sort_order"),
        }),
    )

    @admin.display(description="Precio mensual", ordering="price_monthly")
    def price_col(self, obj):
        return obj.price_display

    @admin.display(description="Trial", ordering="trial_days")
    def trial_col(self, obj):
        return f"{obj.trial_days} días" if obj.has_trial else "—"


# ── Subscription admin ────────────────────────────────────────────────────────

@admin.register(Subscription)
class SubscriptionAdmin(UnfoldModelAdmin):
    list_display    = ("organization", "plan", "status", "trial_ends_at", "current_period_end", "created_at")
    list_filter     = ("status",)
    search_fields   = ("organization__name", "plan")
    readonly_fields = ("recurrente_checkout_id", "recurrente_customer_id", "created_at", "updated_at")
    fieldsets       = (
        ("Organización",  {"fields": ("organization", "plan", "status")}),
        ("Recurrente",    {"fields": ("recurrente_checkout_id", "recurrente_customer_id")}),
        ("Período",       {"fields": ("trial_ends_at", "current_period_start", "current_period_end", "canceled_at")}),
        ("Fechas",        {"fields": ("created_at", "updated_at")}),
    )


# ── BillingEvent admin ────────────────────────────────────────────────────────

@admin.register(BillingEvent)
class BillingEventAdmin(UnfoldModelAdmin):
    list_display    = ("event_type", "event_id", "processed", "created_at")
    list_filter     = ("event_type", "processed")
    search_fields   = ("event_id", "event_type")
    readonly_fields = ("event_id", "event_type", "payload", "processed", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


# ── OrgAddOn admin ────────────────────────────────────────────────────────────

@admin.register(OrgAddOn)
class OrgAddOnAdmin(UnfoldModelAdmin):
    list_display    = ("organization", "addon", "status", "credits_col", "activated_at", "expires_at")
    list_filter     = ("status", "addon")
    search_fields   = ("organization__name", "addon__name", "recurrente_checkout_id")
    autocomplete_fields = ("organization",)
    readonly_fields = ("activated_at", "created_at", "updated_at")
    fieldsets       = (
        ("Organización y complemento", {
            "fields": ("organization", "addon", "status"),
        }),
        ("Vigencia", {
            "description": "Deja 'Expira el' vacío para renovación mensual indefinida.",
            "fields": ("expires_at",),
        }),
        ("Facturación", {
            "fields": ("recurrente_checkout_id",),
        }),
        ("Notas internas", {
            "fields": ("notes",),
        }),
        ("Fechas", {
            "fields": ("activated_at", "created_at", "updated_at"),
        }),
    )

    @admin.display(description="Créditos IA/mes", ordering="addon__ai_credits")
    def credits_col(self, obj):
        credits = obj.addon.ai_credits
        return f"+{credits}" if credits else "—"
