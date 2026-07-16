"""
Optimiza-CRM – Brevo email helper
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro

Resolución de API key: primero busca la integración Brevo de la org,
luego cae en la key global de settings (plan de OptimizaCRM como fallback).
"""

import requests as _http


def get_org_brevo_config(org):
    """
    Returns (api_key, sender_name, sender_email) for the given org.

    Priority:
    1. Integration(channel_type='brevo', status='connected') de la org
    2. settings.BREVO_API_KEY + settings.DEFAULT_FROM_EMAIL (fallback global)
    """
    if org:
        try:
            from apps.integrations.models import Integration
            intg = Integration.objects.get(
                organization=org, channel_type="brevo", status="connected"
            )
            cfg          = intg.config or {}
            api_key      = cfg.get("api_key", "")
            sender_name  = cfg.get("sender_name") or cfg.get("from_name") or org.name
            sender_email = cfg.get("sender_email", "")
            if api_key and sender_email:
                return api_key, sender_name, sender_email
        except Exception:
            pass  # Integration not found or inactive → fall through

    # Global fallback
    from django.conf import settings as _s
    from email.utils import parseaddr as _parseaddr
    api_key = getattr(_s, "BREVO_API_KEY", "")
    raw_from = getattr(_s, "DEFAULT_FROM_EMAIL", "OptimizaCRM <noreply@optimizacrm.com>")
    sender_name, sender_email = _parseaddr(raw_from)
    if not sender_email:
        sender_email = raw_from
    if not sender_name:
        sender_name = "OptimizaCRM"
    return api_key, sender_name, sender_email


def send_org_email(org, to_email: str, subject: str, body_text: str, body_html: str = None) -> bool:
    """
    Send a transactional email on behalf of an org.
    Uses the org's own Brevo integration when configured; falls back to the
    platform global Brevo key (OptimizaCRM covers the cost in that case).

    Returns True on success, False on failure.
    """
    api_key, sender_name, sender_email = get_org_brevo_config(org)

    if not api_key:
        org_label = getattr(org, "id", "global")
        print(f"[BREVO] No API key available (org={org_label}) — email NOT sent to {to_email}", flush=True)
        return False

    payload = {
        "sender":      {"name": sender_name, "email": sender_email},
        "to":          [{"email": to_email}],
        "subject":     subject,
        "textContent": body_text,
    }
    if body_html:
        payload["htmlContent"] = body_html

    try:
        resp = _http.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers={"api-key": api_key, "Content-Type": "application/json"},
            timeout=10,
        )
        org_label = getattr(org, "id", "global")
        if resp.ok:
            print(f"[BREVO] OK → {to_email} (org={org_label})", flush=True)
            return True
        else:
            print(f"[BREVO] {resp.status_code} → {to_email} (org={org_label}): {resp.text}", flush=True)
            return False
    except Exception as exc:
        print(f"[BREVO] Exception → {to_email}: {exc}", flush=True)
        return False
