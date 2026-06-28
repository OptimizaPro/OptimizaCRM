"""
Optimiza-CRM – Automation models
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.db import models
from core.models import TenantModel


class AutomationRule(TenantModel):
    TRIGGER_CHOICES = [
        ("lead_created",     "Nuevo lead creado"),
        ("lead_score_high",  "Score de lead ≥ 80"),
        ("deal_won",         "Negocio ganado"),
        ("deal_lost",        "Negocio perdido"),
        ("task_overdue",     "Tarea vencida"),
        ("customer_at_risk", "Cliente en riesgo de abandono"),
    ]

    ACTION_CHOICES = [
        ("send_whatsapp", "Enviar mensaje de WhatsApp"),
        ("send_email",    "Enviar email"),
        ("create_task",   "Crear tarea"),
        ("notify_user",   "Notificar al usuario"),
    ]

    name          = models.CharField(max_length=255)
    description   = models.TextField(blank=True)
    trigger_type  = models.CharField(max_length=50, choices=TRIGGER_CHOICES)
    action_type   = models.CharField(max_length=50, choices=ACTION_CHOICES)
    action_config = models.JSONField(default=dict)
    is_active     = models.BooleanField(default=True)
    run_count     = models.PositiveIntegerField(default=0)
    last_run_at   = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "automation_rules"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.trigger_type} → {self.action_type})"
