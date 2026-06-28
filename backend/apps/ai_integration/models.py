"""
Optimiza-CRM – AI Integration models
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.db import models
from apps.accounts.models import Organization


class AIUsage(models.Model):
    """
    Monthly AI credit usage per organization.
    One record per org per billing period (first day of the month).
    """
    organization  = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="ai_usage_records")
    period_start  = models.DateField(help_text="Primer día del mes al que corresponde este registro")
    credits_used  = models.PositiveIntegerField(default=0)
    credits_limit = models.PositiveIntegerField(default=50, help_text="Límite mensual copiado del plan en el momento de creación")

    class Meta:
        db_table        = "ai_usage"
        unique_together = [("organization", "period_start")]
        ordering        = ["-period_start"]

    def __str__(self):
        return f"{self.organization.name} — {self.period_start} ({self.credits_used}/{self.credits_limit})"

    @property
    def credits_remaining(self):
        return max(0, self.credits_limit - self.credits_used)

    @property
    def usage_pct(self):
        if not self.credits_limit:
            return 100
        return round((self.credits_used / self.credits_limit) * 100)
