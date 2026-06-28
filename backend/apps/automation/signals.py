"""
Optimiza-CRM – Automation signals
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


def _fire_rules(organization, trigger_type, context: dict):
    """Query active rules for the given trigger and execute each one."""
    try:
        from apps.automation.models import AutomationRule  # noqa: PLC0415
        from apps.automation.executor import execute_rule  # noqa: PLC0415
        rules = AutomationRule.objects.filter(
            organization=organization,
            trigger_type=trigger_type,
            is_active=True,
        )
        for rule in rules:
            execute_rule(rule, context)
    except Exception:
        logger.exception("Error firing automation rules for trigger '%s'", trigger_type)


# ─── Lead signals ─────────────────────────────────────────────────────────────

@receiver(post_save, sender="crm.Lead")
def on_lead_saved(sender, instance, created, **kwargs):
    # Trigger: lead_created
    if created:
        _fire_rules(
            organization=instance.organization,
            trigger_type="lead_created",
            context={"lead_id": str(instance.id), "lead_name": instance.full_name},
        )

    # Trigger: lead_score_high (score >= 80 and it just reached/exceeded that threshold)
    if not created and instance.score >= 80:
        # Detect if the score crossed 80 by comparing with the pre-save value stored
        # via update_fields hint or simply fire if score >= 80 (idempotency handled
        # by executor — duplicate notifications are acceptable in automation context)
        try:
            old = sender.objects.get(pk=instance.pk)
        except sender.DoesNotExist:
            old = None
        old_score = getattr(old, "score", 0) if old else 0
        if instance.score >= 80 and old_score < 80:
            _fire_rules(
                organization=instance.organization,
                trigger_type="lead_score_high",
                context={
                    "lead_id":    str(instance.id),
                    "lead_name":  instance.full_name,
                    "lead_score": instance.score,
                },
            )


# ─── Opportunity signals ──────────────────────────────────────────────────────

@receiver(post_save, sender="crm.Opportunity")
def on_opportunity_saved(sender, instance, created, **kwargs):
    if created:
        return  # Only care about updates for won/lost

    try:
        old = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    old_stage = getattr(old, "stage", None)
    new_stage = instance.stage

    if old_stage != "won" and new_stage == "won":
        _fire_rules(
            organization=instance.organization,
            trigger_type="deal_won",
            context={
                "opportunity_id":    str(instance.id),
                "opportunity_title": instance.title,
                "amount":            str(instance.amount),
            },
        )
    elif old_stage != "lost" and new_stage == "lost":
        _fire_rules(
            organization=instance.organization,
            trigger_type="deal_lost",
            context={
                "opportunity_id":    str(instance.id),
                "opportunity_title": instance.title,
                "lost_reason":       instance.lost_reason,
            },
        )
