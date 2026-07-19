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
        elif action == "assign_lead":
            _action_assign_lead(rule, org, context)
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


def _action_assign_lead(rule, org, context):
    """Assign a lead to a user via round-robin or segment matching."""
    from apps.crm.models import Lead, TeamMembership  # noqa: PLC0415
    from apps.automation.models import AutomationRule  # noqa: PLC0415
    from django.db import transaction                  # noqa: PLC0415

    # Resolve lead — context carries lead_id (string) from signal
    lead_id = context.get("lead_id")
    lead_obj = context.get("lead")  # fallback: direct lead instance
    if lead_id:
        try:
            lead = Lead.objects.get(id=lead_id, organization=org)
        except Lead.DoesNotExist:
            logger.warning("assign_lead: Lead %s not found in org %s", lead_id, org.id)
            return
    elif lead_obj is not None:
        lead = lead_obj
    else:
        logger.warning("assign_lead: no lead_id or lead in context for rule %s", rule.id)
        return

    config = rule.action_config
    mode   = config.get("mode", "round_robin")

    if mode == "segment":
        user_id = _match_segment(lead, config.get("segments", []))
        if user_id:
            lead.assigned_to_id = user_id
            lead.save(update_fields=["assigned_to"])
            _notify_assignee(lead, user_id, org)
            return
        # Fall through to fallback
        fallback = config.get("fallback", {})
        if not fallback:
            return
        # Use fallback as round_robin config
        config = fallback

    # Round robin
    team_id = config.get("team_id")
    if not team_id:
        logger.warning("assign_lead: no team_id in action_config for rule %s", rule.id)
        return

    members = list(
        TeamMembership.objects.filter(team_id=team_id)
        .order_by("joined_at")
        .values_list("user_id", flat=True)
    )
    if not members:
        logger.warning("assign_lead: team %s has no members", team_id)
        return

    with transaction.atomic():
        locked_rule = AutomationRule.objects.select_for_update().get(pk=rule.pk)
        cfg = locked_rule.action_config
        # For segment fallback the root config holds current_index
        idx = cfg.get("current_index", 0) % len(members)
        user_id = members[idx]
        cfg["current_index"] = idx + 1
        locked_rule.action_config = cfg
        locked_rule.save(update_fields=["action_config"])

    lead.assigned_to_id = user_id
    lead.save(update_fields=["assigned_to"])
    _notify_assignee(lead, user_id, org)


def _match_segment(lead, segments):
    """Return user_id of the first matching segment, or None."""
    for seg in segments:
        conditions = seg.get("conditions", [])
        logic      = seg.get("logic", "AND")
        results    = [_eval_condition(lead, c) for c in conditions]
        if not results:
            continue
        matched = all(results) if logic == "AND" else any(results)
        if matched:
            return seg.get("user_id")
    return None


def _eval_condition(lead, condition):
    """Evaluate a single condition against a lead. Returns bool."""
    field = condition.get("field", "")
    op    = condition.get("op", "eq")
    value = condition.get("value", "")

    if field.startswith("custom_fields."):
        key    = field[len("custom_fields."):]
        actual = str(lead.custom_fields.get(key, "")).lower()
    elif hasattr(lead, field):
        actual = str(getattr(lead, field) or "").lower()
    else:
        return False

    value_lower = str(value).lower()

    if op == "eq":
        return actual == value_lower
    elif op == "neq":
        return actual != value_lower
    elif op == "contains":
        return value_lower in actual
    elif op == "starts_with":
        return actual.startswith(value_lower)
    elif op == "gte":
        try:
            return float(actual) >= float(value)
        except (ValueError, TypeError):
            return False
    elif op == "lte":
        try:
            return float(actual) <= float(value)
        except (ValueError, TypeError):
            return False
    return False


def _notify_assignee(lead, user_id, org):
    """Send an in-app notification to the newly assigned user."""
    try:
        from apps.notifications.models import Notification  # noqa: PLC0415
        from apps.accounts.models import User               # noqa: PLC0415
        user = User.objects.get(id=user_id)
        Notification.objects.create(
            organization=org,
            user=user,
            title="Nuevo lead asignado",
            message=f"Se te ha asignado el lead {lead.full_name} ({lead.phone}).",
            notification_type="info",
        )
    except Exception as exc:
        logger.warning("assign_lead notify error: %s", exc)
