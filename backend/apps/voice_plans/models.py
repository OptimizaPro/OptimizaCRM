"""
Optimiza-CRM – Voice IA Plans models
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.db import models


class VoicePlan(models.Model):
    """Pricing tier for the Voice IA agent service."""

    slug              = models.SlugField(max_length=50, unique=True)
    name              = models.CharField(max_length=100)
    price_monthly     = models.DecimalField(
        max_digits=8, decimal_places=2,
        help_text="Precio mensual en USD (ej. 49.00)"
    )
    agents            = models.PositiveSmallIntegerField(
        help_text="Número de agentes de voz IA incluidos"
    )
    minutes_included  = models.PositiveIntegerField(
        help_text="Minutos de llamada incluidos por mes"
    )
    overage_per_minute = models.DecimalField(
        max_digits=5, decimal_places=3,
        help_text="Coste por minuto adicional en USD (ej. 0.100)"
    )
    features          = models.JSONField(
        default=list,
        help_text=(
            'Array JSON de strings con las características del plan. '
            'Ej: ["1 agente de voz IA", "300 min/mes incluidos", "Soporte por chat"]'
        ),
    )
    cta_text          = models.CharField(
        max_length=100, default="Empezar prueba gratis",
        help_text="Texto del botón CTA en la tarjeta del plan"
    )
    is_popular        = models.BooleanField(
        default=False,
        help_text="Marca este plan como el más popular (resaltado visualmente)"
    )
    is_active         = models.BooleanField(
        default=True,
        help_text="Solo los planes activos se muestran en la landing"
    )
    sort_order        = models.PositiveSmallIntegerField(
        default=0,
        help_text="Orden de aparición (menor número = primero)"
    )

    class Meta:
        db_table = "voice_plans"
        ordering = ["sort_order"]
        verbose_name = "Plan de Voz IA"
        verbose_name_plural = "Planes de Voz IA"

    def __str__(self):
        return f"{self.name} — ${self.price_monthly}/mes"

    @property
    def annual_price(self) -> int:
        """Precio mensual con descuento anual del 20%, redondeado."""
        return round(float(self.price_monthly) * 0.8)

    @property
    def overage_display(self) -> str:
        return f"${self.overage_per_minute}"


class VoiceSetupPlan(models.Model):
    """One-time setup / implementation service tier for the Voice IA agent."""

    slug     = models.SlugField(max_length=50, unique=True)
    name     = models.CharField(max_length=100)
    tagline  = models.CharField(
        max_length=300,
        help_text="Descripción corta que aparece bajo el nombre del tier",
    )
    price    = models.DecimalField(
        max_digits=8, decimal_places=2,
        null=True, blank=True,
        help_text="Precio en USD. Dejar vacío para tiers 'A medida'.",
    )
    days     = models.CharField(
        max_length=60, default="A convenir",
        help_text='Plazo de entrega visible (ej. "48 horas hábiles", "5 días hábiles")',
    )
    features = models.JSONField(
        default=list,
        help_text=(
            'Array JSON de objetos {text, highlight}. '
            'Ej: [{"text": "1 agente configurado", "highlight": false}, '
            '{"text": "Integración al CRM", "highlight": true}]'
        ),
    )
    cta_text    = models.CharField(
        max_length=100, default="Contratar",
        help_text="Texto del botón CTA en la tarjeta del tier",
    )
    is_popular  = models.BooleanField(
        default=False,
        help_text="Marca este tier como el más elegido (resaltado visualmente)",
    )
    is_active   = models.BooleanField(
        default=True,
        help_text="Solo los tiers activos se muestran en /servicios/voz-ia",
    )
    sort_order  = models.PositiveSmallIntegerField(
        default=0,
        help_text="Orden de aparición (menor número = primero)",
    )

    class Meta:
        db_table = "voice_setup_plans"
        ordering = ["sort_order"]
        verbose_name = "Setup Agente de Voz IA"
        verbose_name_plural = "Setup Agente de Voz IA — Tiers"

    def __str__(self):
        price_str = f"${self.price}" if self.price is not None else "A medida"
        return f"{self.name} — {price_str}"


class VoiceFAQ(models.Model):
    """FAQ item for the /voz-ia landing page."""

    question   = models.CharField(max_length=500)
    answer     = models.TextField()
    sort_order = models.PositiveSmallIntegerField(default=0)
    is_active  = models.BooleanField(default=True)

    class Meta:
        db_table = "voice_faqs"
        ordering = ["sort_order"]
        verbose_name = "FAQ — Voz IA"
        verbose_name_plural = "FAQs — Voz IA"

    def __str__(self):
        return self.question[:80]


class VoiceStat(models.Model):
    """Key metric shown in the stats bar of /voz-ia."""

    value      = models.CharField(max_length=20, help_text='Valor visible (ej. "24/7", "<1s", "+40%")')
    label      = models.CharField(max_length=200, help_text='Descripción de la métrica')
    sort_order = models.PositiveSmallIntegerField(default=0)
    is_active  = models.BooleanField(default=True)

    class Meta:
        db_table = "voice_stats"
        ordering = ["sort_order"]
        verbose_name = "Estadística — Voz IA"
        verbose_name_plural = "Estadísticas — Voz IA"

    def __str__(self):
        return f"{self.value} · {self.label}"
