"""
Optimiza-CRM – Integrations URL conf
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IntegrationViewSet, MessageViewSet, widget_config, widget_submit, widget_manage, hub_config
from .drive_views import (
    drive_status,
    drive_auth_url,
    drive_callback,
    drive_search,
    drive_documents,
    drive_document_delete,
)
from .voice_views import (
    voice_widget_config,
    voice_widget_manage,
    voice_tool_book_appointment,
    voice_tool_escalate,
    voice_tool_qualify,
    voice_call_ended,
    voice_scrape_url,
    voice_import_file,
    voice_reset_assistant,
    voice_upload_avatar,
    voice_widget_agents,
    voice_widget_agent_delete,
    voice_kb_sources,
    voice_kb_source_delete,
    voice_generate_prompt,
    voice_calls_list,
    voice_call_detail,
    voice_outbound_phone,
    voice_outbound_call,
)

router = DefaultRouter()
router.register(r"integrations", IntegrationViewSet, basename="integration")
router.register(r"messages",     MessageViewSet,     basename="message")

urlpatterns = [
    path("", include(router.urls)),

    # ── Web Widget (public + authenticated) ───────────────────────────────────
    path("widget/config/",  widget_config,  name="widget-config"),
    path("widget/submit/",  widget_submit,  name="widget-submit"),
    path("widget/manage/",  widget_manage,  name="widget-manage"),
    path("widget/hub/",     hub_config,     name="widget-hub"),

    # ── Voice AI Widget — public config ───────────────────────────────────────
    path("voice-widget/config/",  voice_widget_config,  name="voice-widget-config"),

    # ── Voice AI Widget — authenticated management ────────────────────────────
    path("voice-widget/manage/",  voice_widget_manage,  name="voice-widget-manage"),

    # ── Voice AI Widget — Vapi tool webhooks (public) ─────────────────────────
    path("voice-widget/tool/book-appointment/", voice_tool_book_appointment, name="voice-tool-book"),
    path("voice-widget/tool/escalate/",         voice_tool_escalate,         name="voice-tool-escalate"),
    path("voice-widget/tool/qualify/",          voice_tool_qualify,          name="voice-tool-qualify"),

    # ── Voice AI Widget — Vapi end-of-call webhook (public) ───────────────────
    path("voice-widget/call-ended/",            voice_call_ended,            name="voice-call-ended"),

    # ── Voice AI Widget — URL scraper → KB classifier (authenticated) ─────────
    path("voice-widget/scrape-url/",            voice_scrape_url,            name="voice-scrape-url"),

    # ── Voice AI Widget — File import → KB classifier (authenticated) ──────────
    path("voice-widget/import-file/",           voice_import_file,           name="voice-import-file"),

    # ── Voice AI Widget — Reset assistant ID (authenticated) ─────────────────
    path("voice-widget/reset-assistant/",        voice_reset_assistant,        name="voice-reset-assistant"),

    # ── Voice AI Widget — Avatar upload (authenticated) ───────────────────────
    path("voice-widget/upload-avatar/",         voice_upload_avatar,         name="voice-upload-avatar"),

    # ── Voice AI Agents — Multi-agent CRUD (authenticated) ────────────────────
    path("voice-widget/agents/",                voice_widget_agents,         name="voice-widget-agents"),
    path("voice-widget/agents/<str:agent_id>/", voice_widget_agent_delete,   name="voice-widget-agent-delete"),

    # ── Voice KB Sources — list & delete (authenticated) ─────────────────────
    path("voice-widget/kb-sources/",              voice_kb_sources,          name="voice-kb-sources"),
    path("voice-widget/kb-sources/<uuid:source_id>/", voice_kb_source_delete, name="voice-kb-source-delete"),

    # ── Voice AI — Generate system prompt (authenticated) ─────────────────────
    path("voice-widget/generate-prompt/",         voice_generate_prompt,     name="voice-generate-prompt"),

    # ── Voice AI — Calls list & detail (authenticated) ────────────────────────
    path("voice-widget/calls/",                   voice_calls_list,          name="voice-calls-list"),
    path("voice-widget/calls/<int:call_id>/",     voice_call_detail,         name="voice-call-detail"),

    # ── Voice AI — Outbound (voz-business plan only) ──────────────────────────
    path("voice-widget/outbound/phone/",          voice_outbound_phone,      name="voice-outbound-phone"),
    path("voice-widget/outbound/call/",           voice_outbound_call,       name="voice-outbound-call"),

    # ── Google Drive — OAuth + documents (authenticated) ─────────────────────
    path("drive/status/",                    drive_status,          name="drive-status"),
    path("drive/auth-url/",                  drive_auth_url,        name="drive-auth-url"),
    path("drive/callback/",                  drive_callback,        name="drive-callback"),
    path("drive/search/",                    drive_search,          name="drive-search"),
    path("drive/documents/",                 drive_documents,       name="drive-documents"),
    path("drive/documents/<int:doc_id>/",    drive_document_delete, name="drive-document-delete"),
]
