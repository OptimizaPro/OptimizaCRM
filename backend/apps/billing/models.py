"""
Optimiza-CRM – Billing models
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import uuid
from django.db import models
from apps.accounts.models import Organization


STATUS_CHOICES = [
    ("trialing",   "Trialing"),
    ("active",     "Active"),
    ("past_due",   "Past Due"),
    ("canceled",   "Canceled"),
    ("incomplete", "Incomplete"),
]


class Plan(models.Model):
    """
    Pricing plan — single source of truth for billing, CMS and frontend.
    Replaces the hardcoded PLAN_PRICES / PLAN_LABELS dicts in recurrente.py.
    """
    slug          = models.SlugField(max_length=50, unique=True)
    name          = models.CharField(max_length=100)
    tagline       = models.CharField(max_length=255, blank=True, help_text="Descripción corta visible en la página de precios")
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, help_text="Precio mensual en USD (ej. 19.00). Usa 0.00 para plan gratuito.")
    price_annual  = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Precio anual en USD (ej. 190.00). Usa 0.00 si no hay modalidad anual.")
    currency      = models.CharField(max_length=3, default="USD")
    cta_text      = models.CharField(max_length=100, default="Empezar")
    features      = models.JSONField(
        default=list,
        help_text=(
            'Array JSON de objetos con tres propiedades: '
            '"text" (nombre de la característica), '
            '"included" (true = incluida, false = bloqueada/gris), '
            '"highlight" (true = destacada en naranja, para diferenciadores clave del plan). '
            'Ej: [{"text": "2 usuarios incluidos", "included": true, "highlight": false}, '
            '{"text": "Lead Scoring IA", "included": false, "highlight": false}]'
        ),
    )
    ai_credits_monthly = models.PositiveIntegerField(
        default=50,
        help_text="Créditos de IA incluidos por mes (análisis de sentimiento, seguimiento, briefing, escritura). 0 = sin IA.",
    )
    has_trial     = models.BooleanField(default=True, help_text="Ofrece período de prueba gratuita antes del primer cobro")
    trial_days    = models.PositiveSmallIntegerField(default=14, help_text="Duración de la prueba gratuita en días (solo aplica si has_trial está activo)")
    is_popular    = models.BooleanField(default=False, help_text="Marca este plan como el más popular / recomendado")
    is_active     = models.BooleanField(default=True, help_text="Solo los planes activos se muestran en la página de precios y permiten checkout")
    sort_order    = models.PositiveSmallIntegerField(default=0, help_text="Orden en la página de precios (menor número = primero)")

    class Meta:
        db_table = "billing_plans"
        ordering = ["sort_order"]

    def __str__(self):
        price = f"${self.price_monthly:.2f}/mes" if self.price_monthly else "Gratis"
        return f"{self.name} — {price}"

    @property
    def price_display(self):
        if not self.price_monthly:
            return "Gratis"
        return f"${self.price_monthly:.2f}"

    @property
    def recurrente_label(self):
        return f"Optimiza CRM — {self.name}"


class AddOn(models.Model):
    """
    Complemento opcional disponible en cualquier plan de pago.
    """
    ICON_CHOICES = [
        ("user-plus",      "Usuario adicional"),
        ("graduation-cap", "Onboarding / formación"),
        ("workflow",       "Automatizaciones"),
        ("zap",            "Velocidad / rendimiento"),
        ("shield",         "Seguridad"),
        ("brain",          "Inteligencia artificial"),
        ("bar-chart-3",    "Analítica"),
        ("plug",           "Integraciones"),
    ]

    name        = models.CharField(max_length=100, verbose_name="Nombre del complemento")
    slug        = models.SlugField(max_length=50, unique=True, verbose_name="Slug ó URL amigable")
    description = models.TextField(help_text="Descripción breve visible en la página de precios", verbose_name="Descripción")
    price       = models.DecimalField(max_digits=10, decimal_places=2, help_text="Precio en USD (ej. 8.00)", verbose_name="Precio")
    period      = models.CharField(max_length=100, help_text="Texto del período (ej. /usuario/mes, pago único, /mes por bloque de +10 reglas)", verbose_name="Período")
    icon        = models.CharField(max_length=50, choices=ICON_CHOICES, default="zap", help_text="Icono Lucide que se muestra en la tarjeta", verbose_name="Icono")
    ai_credits  = models.PositiveIntegerField(
        default=0,
        help_text="Créditos de IA mensuales que añade este add-on al límite de la organización. 0 = no aporta créditos IA.",
        verbose_name="Créditos IA / mes",
    )
    is_featured     = models.BooleanField(default=False, help_text="Destaca este add-on con borde naranja y badge en la página de precios", verbose_name="Destacado")
    is_active       = models.BooleanField(default=True, help_text="Activo = permite checkout. Desactivado = no se puede contratar.", verbose_name="Activo")
    show_in_pricing = models.BooleanField(default=True, help_text="Mostrar en la página de precios pública (/precios). Desactiva para servicios con landing page propia.", verbose_name="Mostrar en precios")
    sort_order      = models.PositiveSmallIntegerField(default=0, help_text="Orden de aparición (menor número = primero)", verbose_name="Orden de aparición")

    class Meta:
        db_table = "billing_addons"
        ordering = ["sort_order"]

    def __str__(self):
        return f"{self.name} — ${self.price}"

    @property
    def price_display(self):
        return f"${self.price:.2f}"


class Subscription(models.Model):
    id                    = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization          = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name="subscription")
    plan                  = models.CharField(max_length=50, default="basico", help_text="Slug del plan activo (referencia a billing_plans.slug)")
    status                = models.CharField(max_length=50, choices=STATUS_CHOICES, default="trialing")
    recurrente_customer_id = models.CharField(max_length=100, blank=True)
    recurrente_checkout_id = models.CharField(max_length=100, blank=True)
    trial_ends_at         = models.DateTimeField(null=True, blank=True)
    current_period_start  = models.DateTimeField(null=True, blank=True)
    current_period_end    = models.DateTimeField(null=True, blank=True)
    canceled_at           = models.DateTimeField(null=True, blank=True)
    created_at            = models.DateTimeField(auto_now_add=True)
    updated_at            = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subscriptions"

    def __str__(self):
        return f"{self.organization.name} — {self.plan} ({self.status})"

    @property
    def is_active(self):
        return self.status in ("trialing", "active")


class OrgAddOn(models.Model):
    """
    Add-on activo para una organización.
    Controla qué complementos tiene contratados cada org y su estado.
    """
    STATUS_CHOICES = [
        ("active",   "Activo"),
        ("canceled", "Cancelado"),
    ]

    organization           = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="org_addons")
    addon                  = models.ForeignKey(AddOn, on_delete=models.PROTECT, related_name="org_subscriptions", verbose_name="Complemento")
    status                 = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active", verbose_name="Estado")
    activated_at           = models.DateTimeField(auto_now_add=True)
    expires_at             = models.DateTimeField(null=True, blank=True, help_text="Dejar vacío para renovación mensual. Rellena solo para activaciones puntuales con fecha de fin.")
    recurrente_checkout_id = models.CharField(max_length=100, blank=True, help_text="ID del checkout en Recurrente (se completa automáticamente vía webhook)")
    notes                  = models.TextField(blank=True, help_text="Notas internas (ej. activado manualmente, cliente VIP, prueba gratuita)")
    created_at             = models.DateTimeField(auto_now_add=True)
    updated_at             = models.DateTimeField(auto_now=True)

    class Meta:
        db_table        = "org_addons"
        unique_together = [("organization", "addon")]
        ordering        = ["-activated_at"]
        verbose_name    = "Add-on de organización"
        verbose_name_plural = "Add-ons de organizaciones"

    def __str__(self):
        return f"{self.organization.name} — {self.addon.name} ({self.status})"

    @property
    def is_active(self):
        from django.utils import timezone
        if self.status != "active":
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        return True


class BillingEvent(models.Model):
    """Raw webhook events from Recurrente for audit / idempotency."""
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_id     = models.CharField(max_length=100, unique=True)   # Recurrente event id
    event_type   = models.CharField(max_length=100)
    payload      = models.JSONField(default=dict)
    processed    = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "billing_events"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.event_type} ({self.event_id})"
