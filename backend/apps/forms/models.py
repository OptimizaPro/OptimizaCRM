"""
Optimiza-CRM – Custom embeddable forms
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import uuid
from django.db import models
from core.models import TenantModel


class EmbedForm(TenantModel):
    """
    Formulario personalizado incrustable en cualquier sitio web mediante iframe.

    El campo `fields` es un array JSON con la definición de cada campo:
    [
      {
        "key": "email",
        "label": "Correo electrónico",
        "field_type": "email",       # text | email | phone | textarea | select | checkbox
        "placeholder": "tu@empresa.com",
        "required": true,
        "lead_field": "email",       # first_name | last_name | email | phone | company | title | notes | null
        "options": []                # solo para field_type="select": ["Opción A", "Opción B"]
      }
    ]

    El campo `style` controla la apariencia del formulario público:
    {
      "primary_color": "#ea580c",
      "bg_color": "#ffffff",
      "border_radius": "8"
    }
    """

    token           = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    name            = models.CharField(max_length=100, verbose_name="Nombre interno")
    is_active       = models.BooleanField(default=True, verbose_name="Activo")
    submit_count    = models.PositiveIntegerField(default=0, editable=False, verbose_name="Envíos")
    fields          = models.JSONField(default=list, verbose_name="Campos del formulario")
    style           = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Estilo",
        help_text='Ej: {"primary_color": "#ea580c", "bg_color": "#ffffff", "border_radius": "8"}',
    )
    success_message = models.CharField(
        max_length=500,
        default="¡Gracias! Nos pondremos en contacto pronto.",
        verbose_name="Mensaje de éxito",
    )
    redirect_url    = models.URLField(
        blank=True,
        verbose_name="URL de redirección",
        help_text="Si se rellena, redirige aquí tras el envío en lugar de mostrar el mensaje de éxito.",
    )

    class Meta:
        db_table        = "embed_forms"
        ordering        = ["-created_at"]
        verbose_name    = "Formulario incrustable"
        verbose_name_plural = "Formularios incrustables"

    def __str__(self):
        return f"{self.name} ({self.organization.name})"

    @property
    def embed_url(self):
        from django.conf import settings
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        return f"{frontend_url}/f/{self.token}"

    @property
    def embed_code(self):
        return (
            f'<iframe src="{self.embed_url}" '
            f'width="100%" height="600" frameborder="0" '
            f'style="border:none;border-radius:8px;"></iframe>'
        )


class FormSubmission(TenantModel):
    """Respuesta recibida de un EmbedForm. Genera o actualiza un Lead automáticamente."""

    form       = models.ForeignKey(
        EmbedForm,
        on_delete=models.SET_NULL,
        null=True,
        related_name="submissions",
        verbose_name="Formulario",
    )
    lead       = models.ForeignKey(
        "crm.Lead",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="form_submissions",
        verbose_name="Lead generado",
    )
    data       = models.JSONField(default=dict, verbose_name="Datos enviados")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="IP")
    user_agent = models.TextField(blank=True, verbose_name="User Agent")

    class Meta:
        db_table        = "form_submissions"
        ordering        = ["-created_at"]
        verbose_name    = "Envío de formulario"
        verbose_name_plural = "Envíos de formularios"

    def __str__(self):
        form_name = self.form.name if self.form else "(eliminado)"
        return f"{form_name} — {self.created_at:%Y-%m-%d %H:%M}"
