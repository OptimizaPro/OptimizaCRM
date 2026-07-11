"""
Optimiza-CRM – CRM models
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import uuid
from django.db import models
from django.conf import settings
from core.models import TenantModel


class Lead(TenantModel):
    STATUS_CHOICES = [
        ("new",       "Nuevo"),
        ("contacted", "Contactado"),
        ("qualified", "Calificado"),
        ("converted", "Convertido"),
        ("lost",      "Perdido"),
    ]
    SOURCE_CHOICES = [
        ("web",         "Sitio web"),
        ("referral",    "Referido"),
        ("cold_call",   "Llamada en frío"),
        ("social",      "Redes sociales"),
        ("event",       "Evento"),
        ("voice_agent", "Agente de voz"),
        ("other",       "Otro"),
    ]

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="assigned_leads",
    )
    first_name    = models.CharField(max_length=100)
    last_name     = models.CharField(max_length=100, blank=True)
    email         = models.EmailField(blank=True)
    phone         = models.CharField(max_length=30, blank=False, default="")
    company       = models.CharField(max_length=255, blank=True)
    client_id     = models.CharField(
        max_length=100, blank=True, default="",
        verbose_name="ID de cliente",
        help_text="Identificador propio del cliente (p. ej. número de expediente). "
                  "El agente de voz lo usa para vincular llamadas a registros existentes.",
    )
    title         = models.CharField(max_length=100, blank=True)
    source        = models.CharField(max_length=50, choices=SOURCE_CHOICES, default="web")
    status        = models.CharField(max_length=50, choices=STATUS_CHOICES, default="new")
    score         = models.IntegerField(default=0)
    outbound_consent = models.BooleanField(default=False, verbose_name="Consentimiento outbound")
    consent_date     = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de consentimiento")
    notes         = models.TextField(blank=True)
    custom_fields = models.JSONField(default=dict, blank=True)

    # ── Engagement counters (updated by tracking integrations) ────────────────
    email_opens  = models.PositiveIntegerField(default=0, help_text="Número de veces que el lead abrió un email")
    link_clicks  = models.PositiveIntegerField(default=0, help_text="Número de clics en enlaces enviados")
    page_visits  = models.PositiveIntegerField(default=0, help_text="Número de visitas a páginas rastreadas")

    @property
    def engagement_score(self) -> int:
        """Puntuación de engagement 0-15 basada en interacciones acumuladas.

        Pesos:
          email_opens  → 2 pts c/u, máx 6  (3 aperturas para saturar)
          link_clicks  → 3 pts c/u, máx 6  (2 clics para saturar)
          page_visits  → 1 pt  c/u, máx 3  (3 visitas para saturar)
        Total máx: 15 pts
        """
        pts = (
            min(self.email_opens * 2, 6)
            + min(self.link_clicks * 3, 6)
            + min(self.page_visits * 1, 3)
        )
        return min(pts, 15)

    class Meta:
        db_table = "leads"
        ordering = ["-created_at"]
        indexes  = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["organization", "assigned_to"]),
            models.Index(fields=["organization", "client_id"]),
        ]

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return self.full_name or self.email


class Customer(TenantModel):
    STATUS_CHOICES = [
        ("active",   "Activo"),
        ("inactive", "Inactivo"),
        ("churned",  "Perdido"),
    ]

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="assigned_customers",
    )
    name           = models.CharField(max_length=255)
    email          = models.EmailField(blank=True)
    phone          = models.CharField(max_length=20, blank=True)
    company        = models.CharField(max_length=255, blank=True)
    status         = models.CharField(max_length=50, choices=STATUS_CHOICES, default="active")
    churn_risk     = models.FloatField(default=0.0)
    lifetime_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    address        = models.TextField(blank=True)
    notes          = models.TextField(blank=True)
    custom_fields  = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "customers"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Opportunity(TenantModel):
    STAGE_CHOICES = [
        ("new",         "Nuevo"),
        ("contacted",   "Contactado"),
        ("qualified",   "Calificado"),
        ("proposal",    "Propuesta"),
        ("negotiation", "Negociación"),
        ("won",         "Ganado"),
        ("lost",        "Perdido"),
    ]

    customer    = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name="opportunities")
    lead        = models.ForeignKey(Lead,     on_delete=models.SET_NULL, null=True, blank=True, related_name="opportunities")
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="assigned_opportunities",
    )
    pipeline_template = models.ForeignKey(
        "PipelineTemplate", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="opportunities",
    )
    title               = models.CharField(max_length=255)
    description         = models.TextField(blank=True)
    stage               = models.CharField(max_length=50, choices=STAGE_CHOICES, default="new")
    amount              = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    probability         = models.IntegerField(default=10)
    expected_close_date = models.DateField(null=True, blank=True)
    won_at              = models.DateTimeField(null=True, blank=True)
    lost_at             = models.DateTimeField(null=True, blank=True)
    lost_reason         = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "opportunities"
        ordering = ["-created_at"]
        indexes  = [
            models.Index(fields=["organization", "stage"]),
            models.Index(fields=["organization", "expected_close_date"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.stage})"


class Task(TenantModel):
    PRIORITY_CHOICES = [
        ("low",    "Baja"),
        ("medium", "Media"),
        ("high",   "Alta"),
        ("urgent", "Urgente"),
    ]
    STATUS_CHOICES = [
        ("pending",     "Pendiente"),
        ("in_progress", "En progreso"),
        ("completed",   "Completada"),
        ("cancelled",   "Cancelada"),
    ]

    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assigned_tasks")
    created_by  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_tasks")
    title        = models.CharField(max_length=255)
    description  = models.TextField(blank=True)
    priority     = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    due_date     = models.DateTimeField(null=True, blank=True)
    reminder_at  = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    related_type = models.CharField(max_length=50, blank=True)
    related_id   = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = "tasks"
        ordering = ["due_date", "-created_at"]
        indexes  = [models.Index(fields=["organization", "assigned_to", "due_date"])]

    def __str__(self):
        return f"{self.title} [{self.priority}]"


class Activity(TenantModel):
    TYPE_CHOICES = [
        ("call",          "Llamada"),
        ("email",         "Email"),
        ("meeting",       "Reunión"),
        ("note",          "Nota"),
        ("task",          "Tarea"),
        ("status_change", "Cambio de estado"),
    ]

    user          = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="activities")
    activity_type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    related_type  = models.CharField(max_length=50)
    related_id    = models.UUIDField()
    subject       = models.CharField(max_length=255, blank=True)
    body          = models.TextField(blank=True)
    metadata      = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "activities"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.activity_type}: {self.subject}"


class CalendarEvent(TenantModel):
    EVENT_TYPES = [
        ("meeting",   "Reunión"),
        ("call",      "Llamada"),
        ("follow_up", "Seguimiento"),
        ("task",      "Tarea"),
    ]

    user         = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="calendar_events")
    title        = models.CharField(max_length=255)
    description  = models.TextField(blank=True)
    event_type   = models.CharField(max_length=50, choices=EVENT_TYPES, default="meeting")
    start_time   = models.DateTimeField()
    end_time     = models.DateTimeField()
    location     = models.CharField(max_length=255, blank=True)
    related_type = models.CharField(max_length=50, blank=True)
    related_id   = models.UUIDField(null=True, blank=True)
    is_all_day   = models.BooleanField(default=False)

    STATUS_CHOICES = [
        ("confirmed",            "Confirmada"),
        ("pending_confirmation", "Pendiente de confirmación"),
        ("cancelled",            "Cancelada"),
    ]
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="confirmed")

    class Meta:
        db_table = "calendar_events"
        ordering = ["start_time"]

    def __str__(self):
        return f"{self.title} ({self.event_type})"


class PipelineTemplate(TenantModel):
    TYPE_CHOICES = [
        ("sales",     "Ventas"),
        ("post_sale", "Post-Venta"),
        ("loyalty",   "Fidelización"),
        ("custom",    "Personalizado"),
    ]

    name          = models.CharField(max_length=100)
    description   = models.TextField(blank=True)
    pipeline_type = models.CharField(max_length=50, choices=TYPE_CHOICES, default="sales")
    color         = models.CharField(max_length=7, default="#EA580C")
    is_active     = models.BooleanField(default=True)
    is_default    = models.BooleanField(default=False)

    class Meta:
        db_table = "pipeline_templates"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.name} ({self.pipeline_type})"


class PipelineStage(models.Model):
    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pipeline = models.ForeignKey(PipelineTemplate, on_delete=models.CASCADE, related_name="stages")
    name     = models.CharField(max_length=100)
    slug     = models.SlugField(max_length=100)
    order    = models.PositiveIntegerField(default=0)
    color    = models.CharField(max_length=7, default="#6B7280")
    probability = models.PositiveSmallIntegerField(default=50)
    sla_hours   = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Horas máximas de atención en esta etapa. Vacío = sin límite.")
    is_won   = models.BooleanField(default=False)
    is_lost  = models.BooleanField(default=False)

    class Meta:
        db_table     = "pipeline_stages"
        ordering     = ["order"]
        unique_together = ["pipeline", "slug"]

    def __str__(self):
        return f"{self.pipeline.name} → {self.name}"


# ─── Teams ────────────────────────────────────────────────────────────────────

class Team(TenantModel):
    name        = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    color       = models.CharField(max_length=7, default="#f97316")

    class Meta:
        db_table = "teams"
        ordering = ["name"]

    def __str__(self):
        return self.name


class TeamMembership(models.Model):
    ROLE_CHOICES = [
        ("leader", "Líder"),
        ("member", "Miembro"),
    ]
    team      = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="memberships")
    user      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="team_memberships")
    role      = models.CharField(max_length=20, choices=ROLE_CHOICES, default="member")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = "team_memberships"
        unique_together = [["team", "user"]]

    def __str__(self):
        return f"{self.user} → {self.team}"
