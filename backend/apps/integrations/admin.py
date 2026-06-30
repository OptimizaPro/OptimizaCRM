"""
Optimiza-CRM – Integrations admin (django-unfold)
"""

from django.contrib import admin
from unfold.admin import ModelAdmin as UnfoldModelAdmin
from .models import Integration, IntegrationLog, Message, WebWidget, VoiceKnowledgeBase, VoiceKBSource, VoiceWidget, VoiceCall, GoogleDriveToken, DriveDocument


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


@admin.register(VoiceKnowledgeBase)
class VoiceKnowledgeBaseAdmin(UnfoldModelAdmin):
    list_display    = ("organization", "working_hours", "created_at")
    list_filter     = ("organization",)
    search_fields   = ("organization__name",)
    readonly_fields = ("created_at", "updated_at")
    fieldsets       = (
        ("Organización", {"fields": ("organization",)}),
        ("Contenido de la empresa", {
            "fields": ("company_info", "products_services", "pricing", "faqs"),
        }),
        ("Operaciones", {
            "fields": ("working_hours", "contact_info", "appointment_rules"),
        }),
        ("Agente de voz", {
            "fields": ("qualification_questions", "whatsapp_number"),
        }),
        ("Fechas", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )


@admin.register(VoiceKBSource)
class VoiceKBSourceAdmin(UnfoldModelAdmin):
    list_display  = ("organization", "source_type", "name", "char_count", "created_at")
    list_filter   = ("source_type", "organization")
    search_fields = ("name", "organization__name")
    readonly_fields = ("organization", "knowledge_base", "source_type", "name", "char_count", "created_at")


@admin.register(VoiceWidget)
class VoiceWidgetAdmin(UnfoldModelAdmin):
    list_display    = ("token", "organization", "llm_model", "is_active", "lead_count", "call_count", "created_at")
    list_filter     = ("is_active", "llm_model", "organization")
    search_fields   = ("organization__name",)
    readonly_fields = ("token", "vapi_assistant_id", "lead_count", "call_count", "created_at", "updated_at")
    fieldsets       = (
        ("Organización", {"fields": ("organization",)}),
        ("Configuración", {
            "fields": ("knowledge_base", "llm_model", "is_active", "config"),
        }),
        ("Vapi", {
            "fields": ("token", "vapi_assistant_id"),
        }),
        ("Estadísticas", {
            "fields": ("lead_count", "call_count"),
        }),
        ("Fechas", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )


@admin.register(VoiceCall)
class VoiceCallAdmin(UnfoldModelAdmin):
    list_display    = ("vapi_call_id", "organization", "status", "duration_seconds", "escalated_to_human", "created_at")
    list_filter     = ("status", "escalated_to_human", "organization")
    search_fields   = ("vapi_call_id", "caller_name", "caller_phone", "organization__name")
    readonly_fields = (
        "id", "organization", "widget", "vapi_call_id",
        "caller_name", "caller_phone", "status",
        "duration_seconds", "transcript", "summary", "sentiment",
        "lead", "appointment", "escalated_to_human",
        "qualification_data", "ended_at",
        "created_at", "updated_at",
    )

    def has_add_permission(self, request):
        return False


@admin.register(GoogleDriveToken)
class GoogleDriveTokenAdmin(UnfoldModelAdmin):
    list_display    = ("organization", "connected_at", "updated_at")
    list_filter     = ("organization",)
    readonly_fields = ("access_token", "refresh_token", "token_expiry", "connected_at", "updated_at")

    def has_add_permission(self, request):
        return False


@admin.register(DriveDocument)
class DriveDocumentAdmin(UnfoldModelAdmin):
    list_display    = ("name", "entity_type", "entity_id", "organization", "created_at")
    list_filter     = ("entity_type", "organization")
    search_fields   = ("name", "organization__name")
    readonly_fields = ("organization", "entity_type", "entity_id", "drive_file_id", "name", "mime_type", "web_view_link", "icon_link", "created_at")

    def has_add_permission(self, request):
        return False
