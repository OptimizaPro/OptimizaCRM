"""
Optimiza-CRM – Integrations models
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import uuid
from django.db import models
from core.models import TenantModel


class Integration(TenantModel):
    CHANNEL_CHOICES = [
        ("whatsapp",           "WhatsApp Business"),
        ("email",              "Email (SMTP/IMAP)"),
        ("brevo",              "Brevo (Email transaccional)"),
        ("outlook",            "Microsoft 365 / Outlook"),
        ("facebook",           "Facebook Pages"),
        ("instagram",          "Instagram Business"),
        ("telegram",           "Telegram"),
        ("sms",                "SMS / Twilio"),
        ("tiktok",             "TikTok Lead Generation"),
        ("google_calendar",    "Google Calendar"),
        ("automation_webhook", "Automatización (Zapier · Make · n8n)"),
        ("ai_provider",        "Proveedor de IA"),
    ]
    STATUS_CHOICES = [
        ("disconnected", "Desconectado"),
        ("connected",    "Conectado"),
        ("error",        "Error"),
        ("pending",      "Pendiente"),
    ]

    channel_type   = models.CharField(max_length=50, choices=CHANNEL_CHOICES)
    name           = models.CharField(max_length=100)
    config         = models.JSONField(default=dict, blank=True)
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default="disconnected")
    is_active      = models.BooleanField(default=True)
    connected_at   = models.DateTimeField(null=True, blank=True)
    last_sync_at   = models.DateTimeField(null=True, blank=True)
    error_message  = models.TextField(blank=True)

    class Meta:
        db_table       = "integrations"
        unique_together = ["organization", "channel_type"]
        ordering       = ["channel_type"]

    def __str__(self):
        return f"{self.get_channel_type_display()} ({self.organization.name})"


class IntegrationLog(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    integration  = models.ForeignKey(Integration, on_delete=models.CASCADE, related_name="logs")
    direction    = models.CharField(max_length=10, choices=[("inbound", "Entrante"), ("outbound", "Saliente")])
    contact      = models.CharField(max_length=255, blank=True)
    message_type = models.CharField(max_length=50, blank=True)
    content      = models.TextField(blank=True)
    status       = models.CharField(max_length=20, default="sent")
    metadata     = models.JSONField(default=dict, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "integration_logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.integration.channel_type} {self.direction} – {self.created_at}"


class Message(TenantModel):
    DIRECTION_CHOICES = [("inbound", "Entrante"), ("outbound", "Saliente")]

    integration  = models.ForeignKey(Integration, on_delete=models.CASCADE, related_name="messages")
    external_id  = models.CharField(max_length=500)
    direction    = models.CharField(max_length=10, choices=DIRECTION_CHOICES, default="inbound")
    from_address = models.CharField(max_length=500, blank=True)
    to_address   = models.CharField(max_length=500, blank=True)
    subject      = models.CharField(max_length=500, blank=True)
    body_text    = models.TextField(blank=True)
    body_html    = models.TextField(blank=True)
    is_read      = models.BooleanField(default=False)
    thread_id    = models.CharField(max_length=255, blank=True)
    received_at  = models.DateTimeField()
    metadata     = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table       = "inbox_messages"
        ordering       = ["-received_at"]
        unique_together = ["integration", "external_id"]

    def __str__(self):
        return f'{self.subject or "(sin asunto)"} de {self.from_address}'


class WebWidget(TenantModel):
    """Embeddable widget for capturing leads from external websites."""

    MODE_CHOICES = [
        ("form",      "Formulario de contacto"),
        ("whatsapp",  "Botón de WhatsApp"),
        ("both",      "Formulario + WhatsApp"),
    ]

    token       = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    mode        = models.CharField(max_length=20, choices=MODE_CHOICES, default="form")
    is_active   = models.BooleanField(default=True)
    lead_count  = models.PositiveIntegerField(default=0)
    config      = models.JSONField(default=dict, blank=True)
    # config keys: color, title, subtitle, whatsapp_number, whatsapp_message,
    #              button_text, success_message, allowed_origins

    class Meta:
        db_table = "web_widgets"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Widget {self.mode} – {self.organization.name}"


class VoiceKnowledgeBase(TenantModel):
    """Base de conocimiento por organización para el agente de voz."""

    company_info            = models.TextField(blank=True, verbose_name="Sobre la empresa", help_text="Quiénes somos, misión, propuesta de valor")
    products_services       = models.TextField(blank=True, verbose_name="Productos y servicios", help_text="Qué ofrecemos, cómo funciona")
    pricing                 = models.TextField(blank=True, verbose_name="Precios y planes", help_text="Precios, planes, condiciones")
    faqs                    = models.TextField(blank=True, verbose_name="Preguntas frecuentes", help_text="Q&A más comunes")
    working_hours           = models.CharField(max_length=500, blank=True, verbose_name="Horario de atención")
    contact_info            = models.TextField(blank=True, verbose_name="Información de contacto", help_text="Email, teléfono, ubicación, web")
    appointment_rules       = models.TextField(blank=True, verbose_name="Reglas de citas", help_text="Cómo agendar, disponibilidad, duración")
    qualification_questions = models.JSONField(default=list, blank=True, verbose_name="Preguntas de calificación", help_text='Lista de strings. Ej: ["¿Cuántos empleados tiene?"]')
    whatsapp_number         = models.CharField(max_length=30, blank=True, verbose_name="WhatsApp de escalado", help_text="Con código de país, sin +. Ej: 50212345678")

    class Meta:
        db_table = "voice_knowledge_bases"
        verbose_name = "Base de conocimiento de voz"
        verbose_name_plural = "Bases de conocimiento de voz"

    def __str__(self):
        return f"KB – {self.organization.name}"


class VoiceKBSource(TenantModel):
    """Registro de cada fuente (URL o archivo) importada a la base de conocimiento de voz."""

    SOURCE_URL  = "url"
    SOURCE_FILE = "file"
    SOURCE_TYPES = [
        (SOURCE_URL,  "URL"),
        (SOURCE_FILE, "Archivo"),
    ]

    knowledge_base = models.ForeignKey(
        VoiceKnowledgeBase, on_delete=models.CASCADE,
        related_name="sources", verbose_name="Base de conocimiento",
    )
    source_type = models.CharField(max_length=10, choices=SOURCE_TYPES, verbose_name="Tipo")
    name        = models.CharField(max_length=500, verbose_name="Nombre / URL")
    char_count  = models.PositiveIntegerField(default=0, verbose_name="Caracteres extraídos")
    created_at  = models.DateTimeField(auto_now_add=True, verbose_name="Importado el")

    class Meta:
        db_table = "voice_kb_sources"
        ordering = ["-created_at"]
        verbose_name = "Fuente de KB de voz"
        verbose_name_plural = "Fuentes de KB de voz"

    def __str__(self):
        return f"{self.get_source_type_display()}: {self.name[:60]}"


class VoiceWidget(TenantModel):
    LLM_CHOICES = [
        ("groq/llama-3.3-70b-versatile",        "Groq Llama 3.3 70B (recomendado)"),
        ("groq/llama-3.1-8b-instant",            "Groq Llama 3.1 8B (ultra rápido)"),
        ("openai/gpt-4o",                        "OpenAI GPT-4o"),
        ("openai/gpt-4o-mini",                   "OpenAI GPT-4o Mini"),
        ("anthropic/claude-3-5-haiku-20251001",  "Anthropic Claude 3.5 Haiku"),
    ]

    token             = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    name              = models.CharField(max_length=100, default="Agente de Voz", verbose_name="Nombre del agente")
    vapi_assistant_id = models.CharField(max_length=100, blank=True, verbose_name="Vapi Assistant ID")
    knowledge_base    = models.OneToOneField(
        VoiceKnowledgeBase, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="widget", verbose_name="Base de conocimiento",
    )
    llm_model     = models.CharField(max_length=100, choices=LLM_CHOICES, default="groq/llama-3.3-70b-versatile", verbose_name="Modelo LLM")
    system_prompt = models.TextField(blank=True, verbose_name="System prompt personalizado", help_text="Deja vacío para usar el prompt generado automáticamente desde la base de conocimiento.")
    is_active  = models.BooleanField(default=True, verbose_name="Activo")
    lead_count = models.PositiveIntegerField(default=0, verbose_name="Leads captados")
    call_count = models.PositiveIntegerField(default=0, verbose_name="Llamadas totales")
    config     = models.JSONField(default=dict, blank=True)
    # config keys: agent_name, voice, color, greeting, farewell

    class Meta:
        db_table = "voice_widgets"
        verbose_name = "Widget de voz"
        verbose_name_plural = "Widgets de voz"

    def __str__(self):
        return f"VoiceWidget – {self.organization.name}"


class VoiceCall(TenantModel):
    STATUS_CHOICES = [
        ("completed",   "Completada"),
        ("failed",      "Fallida"),
        ("in_progress", "En progreso"),
    ]

    widget             = models.ForeignKey(VoiceWidget, on_delete=models.CASCADE, related_name="calls", verbose_name="Widget")
    vapi_call_id       = models.CharField(max_length=100, unique=True, verbose_name="Vapi Call ID")
    caller_name        = models.CharField(max_length=200, blank=True)
    caller_phone       = models.CharField(max_length=30, blank=True)
    status             = models.CharField(max_length=30, choices=STATUS_CHOICES, default="in_progress", verbose_name="Estado")
    duration_seconds   = models.PositiveIntegerField(default=0, verbose_name="Duración (segundos)")
    transcript         = models.TextField(blank=True, verbose_name="Transcript")
    summary            = models.TextField(blank=True, verbose_name="Resumen")
    sentiment          = models.CharField(max_length=20, blank=True, verbose_name="Sentimiento")
    lead               = models.ForeignKey("crm.Lead", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Lead")
    appointment        = models.ForeignKey("crm.CalendarEvent", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Cita")
    escalated_to_human = models.BooleanField(default=False, verbose_name="Escalado a humano")
    qualification_data = models.JSONField(default=dict, blank=True, verbose_name="Datos de calificación")
    structured_output  = models.JSONField(default=dict, blank=True, verbose_name="Salida estructurada")
    ended_at           = models.DateTimeField(null=True, blank=True, verbose_name="Fin de llamada")

    class Meta:
        db_table = "voice_calls"
        ordering = ["-created_at"]
        verbose_name = "Llamada de voz"
        verbose_name_plural = "Llamadas de voz"

    def __str__(self):
        return f"Call {self.vapi_call_id[:8]} – {self.organization.name}"


class GoogleDriveToken(TenantModel):
    """OAuth 2.0 tokens de Google Drive por organización."""
    access_token  = models.TextField()
    refresh_token = models.TextField(blank=True)
    token_expiry  = models.DateTimeField(null=True, blank=True)
    connected_at  = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "google_drive_tokens"

    def __str__(self):
        return f"Drive token – {self.organization.name}"


class DriveDocument(TenantModel):
    """Documento de Google Drive vinculado a una entidad CRM."""
    ENTITY_LEAD        = "lead"
    ENTITY_CUSTOMER    = "customer"
    ENTITY_OPPORTUNITY = "opportunity"
    ENTITY_TYPES = [
        (ENTITY_LEAD,        "Lead"),
        (ENTITY_CUSTOMER,    "Cliente"),
        (ENTITY_OPPORTUNITY, "Oportunidad"),
    ]

    entity_type   = models.CharField(max_length=20, choices=ENTITY_TYPES)
    entity_id     = models.CharField(max_length=100)   # UUID o int como string
    drive_file_id = models.CharField(max_length=200)
    name          = models.CharField(max_length=500)
    mime_type     = models.CharField(max_length=200, blank=True)
    web_view_link = models.URLField(max_length=1000, blank=True)
    icon_link     = models.URLField(max_length=500, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table       = "drive_documents"
        ordering       = ["-created_at"]
        unique_together = [("organization", "entity_type", "entity_id", "drive_file_id")]

    def __str__(self):
        return f"{self.name} → {self.entity_type}:{self.entity_id}"
