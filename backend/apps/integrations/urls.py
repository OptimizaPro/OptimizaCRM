"""
Optimiza-CRM – Integrations URL conf
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IntegrationViewSet, MessageViewSet, widget_config, widget_submit, widget_manage, hub_config
from .voice_views import (
    voice_widget_config,
    voice_widget_manage,
    voice_tool_book_appointment,
    voice_tool_escalate,
    voice_tool_qualify,
    voice_call_ended,
    voice_scrape_url,
    voice_import_file,
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
]
