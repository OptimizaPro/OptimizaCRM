"""
Optimiza-CRM – Chatbot RAG models
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import uuid
from django.db import models
from core.models import TenantModel


class ChatbotWidget(TenantModel):
    """Chatbot embebible por organización, alimentado por la KB compartida."""

    LLM_CHOICES = [
        ("groq/llama-3.3-70b-versatile",        "Groq Llama 3.3 70B (recomendado)"),
        ("groq/llama-3.1-8b-instant",            "Groq Llama 3.1 8B (ultra rápido)"),
        ("openai/gpt-4o-mini",                   "OpenAI GPT-4o Mini"),
        ("openai/gpt-4o",                        "OpenAI GPT-4o"),
        ("anthropic/claude-3-5-haiku-20251001",  "Anthropic Claude 3.5 Haiku"),
    ]

    token           = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    name            = models.CharField(max_length=100, default="Asistente", verbose_name="Nombre del chatbot")
    is_active       = models.BooleanField(default=True, verbose_name="Activo")
    llm_model       = models.CharField(max_length=100, choices=LLM_CHOICES, default="groq/llama-3.3-70b-versatile")
    system_prompt   = models.TextField(blank=True, verbose_name="System prompt adicional")
    welcome_message = models.CharField(max_length=500, default="¡Hola! ¿En qué puedo ayudarte hoy?", verbose_name="Mensaje de bienvenida")
    message_count   = models.PositiveIntegerField(default=0, verbose_name="Mensajes totales")
    session_count   = models.PositiveIntegerField(default=0, verbose_name="Sesiones totales")
    config          = models.JSONField(default=dict, blank=True)
    # config keys: color, avatar_url, position (bottom-right|bottom-left),
    #              placeholder, show_sources, allowed_origins

    class Meta:
        db_table     = "chatbot_widgets"
        verbose_name = "Widget de chatbot"

    def __str__(self):
        return f"Chatbot – {self.organization.name}"


class ChatSession(models.Model):
    """Sesión anónima de chat (no requiere login)."""

    CAPTURE_STATES = [
        ("init",        "Inicio"),
        ("ask_id",      "Preguntando ID de referencia"),
        ("ask_name",    "Preguntando nombre"),
        ("ask_phone",   "Preguntando teléfono"),
        ("ask_email",   "Preguntando email"),
        ("ask_company", "Preguntando empresa"),
        ("ask_killer",  "Pregunta de calificación"),
        ("active",      "Activo"),
        ("skip",        "Sin captura"),
    ]

    INTENT_LEVELS = [
        ("high",   "Alto"),
        ("medium", "Medio"),
        ("low",    "Bajo"),
        ("",       "Sin análisis"),
    ]

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    widget     = models.ForeignKey(ChatbotWidget, on_delete=models.CASCADE, related_name="sessions")
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at   = models.DateTimeField(null=True, blank=True)
    metadata   = models.JSONField(default=dict, blank=True)  # user-agent, referrer, etc.
    lead       = models.ForeignKey(
        "crm.Lead", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="chat_sessions",
    )
    # ── Lead capture state machine ─────────────────────────────────────────────
    capture_state  = models.CharField(max_length=20, choices=CAPTURE_STATES, default="init")
    lead_data      = models.JSONField(default=dict, blank=True)   # {name, phone, email} collected so far
    # ── Intent analysis (populated after session ends or on demand) ────────────
    intent_level   = models.CharField(max_length=10, blank=True, default="")
    intent_topics  = models.JSONField(default=list, blank=True)
    intent_summary = models.TextField(blank=True)

    class Meta:
        db_table = "chatbot_sessions"
        ordering = ["-started_at"]

    def __str__(self):
        return f"Session {self.id} – {self.widget.organization.name}"


class ChatMessage(models.Model):
    """Mensaje individual dentro de una sesión de chat."""

    ROLE_USER      = "user"
    ROLE_ASSISTANT = "assistant"
    ROLES = [
        (ROLE_USER,      "Usuario"),
        (ROLE_ASSISTANT, "Asistente"),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session      = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="messages")
    role         = models.CharField(max_length=10, choices=ROLES)
    content      = models.TextField()
    sources_used = models.JSONField(default=list, blank=True)  # [{section, snippet}]
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "chatbot_messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"[{self.role}] {self.content[:60]}"
