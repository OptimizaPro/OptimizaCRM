"""
Optimiza-CRM – Voice Plans admin (django-unfold)
"""

import json
from django import forms
from django.contrib import admin
from unfold.admin import ModelAdmin as UnfoldModelAdmin

from .models import VoiceFAQ, VoicePlan, VoiceStat, VoiceSetupPlan


# ── Widget JSON formateado ────────────────────────────────────────────────────

class PrettyJSONField(forms.JSONField):
    widget = forms.Textarea(attrs={
        "rows": 14,
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


class VoicePlanForm(forms.ModelForm):
    features = PrettyJSONField(
        label="Características",
        help_text=(
            "Array JSON de strings. Cada string es una línea de feature visible en la tarjeta del plan.<br>"
            'Ej: ["1 agente de voz IA", "300 min/mes incluidos", "Soporte por chat"]'
        ),
    )

    class Meta:
        model  = VoicePlan
        fields = "__all__"


# ── VoicePlan admin ───────────────────────────────────────────────────────────

@admin.register(VoicePlan)
class VoicePlanAdmin(UnfoldModelAdmin):
    form              = VoicePlanForm
    list_display      = ("name", "slug", "price_monthly", "agents", "minutes_included", "overage_per_minute", "is_popular", "is_active", "sort_order")
    list_editable     = ("is_popular", "is_active", "sort_order")
    list_filter       = ("is_active", "is_popular")
    search_fields     = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    fieldsets         = (
        ("Identificación", {
            "fields": ("name", "slug"),
        }),
        ("Precio y capacidad", {
            "fields": ("price_monthly", "agents", "minutes_included", "overage_per_minute"),
        }),
        ("Contenido", {
            "fields": ("features", "cta_text"),
        }),
        ("Visibilidad", {
            "fields": ("is_popular", "is_active", "sort_order"),
        }),
    )


# ── VoiceFAQ admin ────────────────────────────────────────────────────────────

@admin.register(VoiceFAQ)
class VoiceFAQAdmin(UnfoldModelAdmin):
    list_display  = ("question_short", "sort_order", "is_active")
    list_editable = ("sort_order", "is_active")
    list_filter   = ("is_active",)
    search_fields = ("question", "answer")
    fieldsets     = (
        (None, {
            "fields": ("question", "answer"),
        }),
        ("Visibilidad", {
            "fields": ("is_active", "sort_order"),
        }),
    )

    @admin.display(description="Pregunta")
    def question_short(self, obj):
        return obj.question[:90] + ("…" if len(obj.question) > 90 else "")


# ── VoiceSetupPlan admin ──────────────────────────────────────────────────────

class VoiceSetupPlanForm(forms.ModelForm):
    features = PrettyJSONField(
        label="Características del tier",
        help_text=(
            "Array JSON de objetos {text, highlight}. Los items con highlight: true "
            "aparecen en naranja (feature destacada).<br>"
            'Ej: [{"text": "1 agente configurado", "highlight": false}, '
            '{"text": "Integración al CRM", "highlight": true}]'
        ),
    )

    class Meta:
        model  = VoiceSetupPlan
        fields = "__all__"


@admin.register(VoiceSetupPlan)
class VoiceSetupPlanAdmin(UnfoldModelAdmin):
    form          = VoiceSetupPlanForm
    list_display  = ("name", "slug", "price", "days", "is_popular", "is_active", "sort_order")
    list_editable = ("is_popular", "is_active", "sort_order")
    list_filter   = ("is_active", "is_popular")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    fieldsets     = (
        ("Identificación", {
            "fields": ("name", "slug"),
        }),
        ("Precio y plazo", {
            "fields": ("price", "days"),
            "description": "Deja el precio vacío para tiers 'A medida' (Enterprise).",
        }),
        ("Contenido", {
            "fields": ("tagline", "features", "cta_text"),
        }),
        ("Visibilidad", {
            "fields": ("is_popular", "is_active", "sort_order"),
        }),
    )


# ── VoiceStat admin ───────────────────────────────────────────────────────────

@admin.register(VoiceStat)
class VoiceStatAdmin(UnfoldModelAdmin):
    list_display  = ("value", "label", "sort_order", "is_active")
    list_editable = ("sort_order", "is_active")
    list_filter   = ("is_active",)
    search_fields = ("value", "label")
    fieldsets     = (
        (None, {
            "fields": ("value", "label"),
        }),
        ("Visibilidad", {
            "fields": ("is_active", "sort_order"),
        }),
    )
