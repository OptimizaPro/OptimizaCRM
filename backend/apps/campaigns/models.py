"""
Optimiza-CRM – Email Marketing Campaigns
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.db import models
from core.models import TenantModel


class EmailCampaign(TenantModel):
    STATUS_CHOICES = [
        ("draft",   "Borrador"),
        ("sending", "Enviando"),
        ("sent",    "Enviado"),
        ("error",   "Error"),
    ]
    RECIPIENT_CHOICES = [
        ("all_contacts",  "Todos los contactos con email"),
        ("all_leads",     "Solo leads (no clientes)"),
        ("all_customers", "Solo clientes"),
    ]

    name             = models.CharField(max_length=200, verbose_name="Nombre interno")
    subject          = models.CharField(max_length=500, verbose_name="Asunto")
    preview_text     = models.CharField(max_length=200, blank=True, verbose_name="Texto de vista previa")
    from_name        = models.CharField(max_length=100, blank=True, verbose_name="Nombre del remitente")
    from_email       = models.EmailField(blank=True, verbose_name="Email del remitente")
    html_content     = models.TextField(verbose_name="Contenido HTML")
    status           = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft", verbose_name="Estado")
    recipient_type   = models.CharField(max_length=20, choices=RECIPIENT_CHOICES, default="all_contacts", verbose_name="Destinatarios")
    sent_at          = models.DateTimeField(null=True, blank=True, verbose_name="Enviado el")
    recipient_count  = models.PositiveIntegerField(default=0, editable=False, verbose_name="Destinatarios enviados")
    error_message    = models.TextField(blank=True, verbose_name="Error")
    brevo_campaign_id = models.BigIntegerField(null=True, blank=True, editable=False, verbose_name="ID en Brevo")
    # Stats (synced from Brevo)
    stat_delivered   = models.PositiveIntegerField(default=0, editable=False)
    stat_opens       = models.PositiveIntegerField(default=0, editable=False)
    stat_clicks      = models.PositiveIntegerField(default=0, editable=False)
    stat_unsubscribes = models.PositiveIntegerField(default=0, editable=False)
    stat_bounces     = models.PositiveIntegerField(default=0, editable=False)

    class Meta:
        db_table             = "email_campaigns"
        ordering             = ["-created_at"]
        verbose_name         = "Campaña de email"
        verbose_name_plural  = "Campañas de email"

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"

    @property
    def open_rate(self):
        if not self.stat_delivered:
            return 0.0
        return round(self.stat_opens / self.stat_delivered * 100, 1)

    @property
    def click_rate(self):
        if not self.stat_delivered:
            return 0.0
        return round(self.stat_clicks / self.stat_delivered * 100, 1)
