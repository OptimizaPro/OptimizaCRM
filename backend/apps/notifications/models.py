"""
Optimiza-CRM – Notifications models
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.db import models
from django.conf import settings
from core.models import TenantModel


class Notification(TenantModel):
    TYPE_CHOICES = [
        ("info",    "Información"),
        ("success", "Éxito"),
        ("warning", "Advertencia"),
        ("task",    "Tarea"),
        ("deal",    "Negocio"),
        ("lead",    "Lead"),
    ]

    user              = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications",
    )
    title             = models.CharField(max_length=255)
    message           = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="info")
    is_read           = models.BooleanField(default=False)
    link              = models.CharField(max_length=500, blank=True)
    metadata          = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.notification_type}: {self.title}"
