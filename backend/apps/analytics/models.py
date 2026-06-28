"""
Optimiza-CRM – Analytics models
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.db import models
from django.conf import settings
from core.models import TenantModel


class SalesGoal(TenantModel):
    """Monthly sales target per user."""
    PERIOD_CHOICES = [
        ("monthly",   "Mensual"),
        ("quarterly", "Trimestral"),
    ]

    user           = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sales_goals")
    period         = models.CharField(max_length=20, choices=PERIOD_CHOICES, default="monthly")
    year           = models.IntegerField()
    month          = models.IntegerField(null=True, blank=True)   # 1-12 for monthly, null for quarterly
    quarter        = models.IntegerField(null=True, blank=True)   # 1-4 for quarterly
    target_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    target_deals   = models.IntegerField(default=0)

    class Meta:
        db_table = "sales_goals"
        unique_together = [["organization", "user", "period", "year", "month", "quarter"]]
        ordering = ["-year", "-month"]

    def __str__(self):
        return f"{self.user} – {self.period} {self.year}/{self.month or self.quarter}"


class Report(TenantModel):
    REPORT_TYPES = [
        ("leads",    "Reporte de Leads"),
        ("pipeline", "Reporte de Pipeline"),
        ("revenue",  "Reporte de Ingresos"),
        ("team",     "Rendimiento del Equipo"),
        ("custom",   "Reporte Personalizado"),
    ]
    FORMAT_CHOICES = [
        ("pdf",   "PDF"),
        ("excel", "Excel"),
        ("csv",   "CSV"),
    ]

    created_by   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    name         = models.CharField(max_length=255)
    report_type  = models.CharField(max_length=50, choices=REPORT_TYPES)
    parameters   = models.JSONField(default=dict, blank=True)
    schedule     = models.CharField(max_length=100, blank=True)
    last_run_at  = models.DateTimeField(null=True, blank=True)
    is_scheduled = models.BooleanField(default=False)

    class Meta:
        db_table = "reports"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.report_type})"
