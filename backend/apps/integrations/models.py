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
