"""
Optimiza-CRM – Automation executor
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import logging
from django.utils import timezone

logger = logging.getLogger(__name__)


def execute_rule(rule, context: dict):
    """Execute a single AutomationRule. Never raises — all errors are caught and logged."""
    try:
        # Update run stats
        rule.run_count += 1
        rule.last_run_at = timezone.now()
        rule.save(update_fields=["run_count", "last_run_at"])

        action = rule.action_type
        org    = rule.organization

        if action == "notify_user":
            _action_notify_user(rule, org, context)
        elif action == "create_task":
            _action_create_task(rule, org, context)
        elif action == "send_whatsapp":
            _action_log_channel(rule, org, context, channel="WhatsApp")
        elif action == "send_email":
            _action_send_email(rule, org, context)
        else:
            logger.warning("AutomationRule %s: unknown action_type '%s'", rule.id, action)

    except Exception:
        logger.exception("AutomationRule %s failed during execution", rule.id)


# ─── Private helpers ──────────────────────────────────────────────────────────

def _get_org_users(org):
    """Return all active users for the given organization."""
    from apps.accounts.models import Membership  # noqa: PLC0415
    return [m.user for m in Membership.objects.filter(organization=org, is_active=True).select_related("user")]


def _action_notify_user(rule, org, context):
    from apps.notifications.models import Notification  # noqa: PLC0415
    users = _get_org_users(org)
    title   = rule.action_config.get("title", f"Automatización: {rule.name}")
    message = rule.action_config.get("message", f"Regla '{rule.name}' ejecutada. Contexto: {context}")
    for user in users:
        Notification.objects.create(
            organization=org,
            user=user,
            title=title,
            message=message,
            notification_type="info",
        )


def _action_create_task(rule, org, context):
    from apps.crm.models import Task  # noqa: PLC0415
    from apps.accounts.models import Membership  # noqa: PLC0415
    task_title = rule.action_config.get("task_title", "Tarea automática")
    # Assign to first active org admin or any member
    membership = (
        Membership.objects.filter(organization=org, is_active=True, role="org_admin").first()
        or Membership.objects.filter(organization=org, is_active=True).first()
    )
    if not membership:
        logger.warning("AutomationRule %s: no active members found to assign task", rule.id)
        return
    Task.objects.create(
        organization=org,
        assigned_to=membership.user,
        created_by=membership.user,
        title=task_title,
        description=f"Tarea creada automáticamente por la regla '{rule.name}'. Contexto: {context}",
    )


def _action_log_channel(rule, org, context, channel: str):
    from apps.notifications.models import Notification  # noqa: PLC0415
    users = _get_org_users(org)
    message = f"{channel} enviado a: {context}"
    for user in users:
        Notification.objects.create(
            organization=org,
            user=user,
            title=f"{channel} enviado — {rule.name}",
            message=message,
            notification_type="info",
        )


def _action_send_email(rule, org, context):
    """Send email via Brevo if configured, otherwise fall back to in-app notification."""
    from apps.notifications.models import Notification          # noqa: PLC0415
    from apps.integrations.models import Integration            # noqa: PLC0415
    from apps.integrations.views import send_brevo_email        # noqa: PLC0415

    subject  = rule.action_config.get("subject", f"Automatización: {rule.name}")
    body     = rule.action_config.get("message", f"Regla '{rule.name}' ejecutada.\n\nContexto: {context}")
    to_email = rule.action_config.get("to_email", "")

    # Try Brevo first
    brevo = Integration.objects.filter(
        organization=org,
        channel_type="brevo",
        status="connected",
    ).first()

    if brevo and to_email:
        cfg        = brevo.config
        api_key    = cfg.get("api_key", "")
        sender_name  = cfg.get("sender_name", "OptimizaCRM")
        sender_email = cfg.get("sender_email", "")

        error = send_brevo_email(api_key, sender_name, sender_email, to_email, subject, body)
        if error:
            logger.error("AutomationRule %s — Brevo send failed: %s", rule.id, error)
        else:
            logger.info("AutomationRule %s — email sent via Brevo to %s", rule.id, to_email)
            return

    # Fall back: in-app notification
    users = _get_org_users(org)
    for user in users:
        Notification.objects.create(
            organization=org,
            user=user,
            title=f"Email — {rule.name}",
            message=body,
            notification_type="info",
        )
