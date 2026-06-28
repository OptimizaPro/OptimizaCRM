"""
Optimiza-CRM – Recurrente API client
Base URL: https://app.recurrente.com/api/
Auth: X-SECRET-KEY header
"""

import hmac
import hashlib
import base64
import requests
from django.conf import settings

BASE_URL = "https://app.recurrente.com/api"


def _headers():
    return {
        "X-SECRET-KEY": settings.RECURRENTE_API_KEY,
        "Content-Type":  "application/json",
        "Accept":        "application/json",
    }


def create_checkout(plan_slug: str, success_url: str, cancel_url: str) -> dict:
    """
    Creates a Recurrente checkout session for the given plan slug.
    Looks up price and label from the Plan model (single source of truth).
    Returns {"id": "ch_...", "checkout_url": "https://..."}.
    """
    from .models import Plan  # local import to avoid circular dependency at module load

    try:
        plan = Plan.objects.get(slug=plan_slug, is_active=True)
    except Plan.DoesNotExist:
        raise ValueError(f"Plan no encontrado o inactivo: {plan_slug}")

    if not plan.price_monthly:
        raise ValueError(f"El plan '{plan_slug}' es gratuito y no requiere checkout.")

    payload = {
        "items": [
            {
                "name":            plan.recurrente_label,
                "amount_in_cents": int(plan.price_monthly * 100),  # Decimal → centavos enteros
                "currency":        plan.currency,
                "quantity":        1,
            }
        ],
        "success_url": success_url,
        "cancel_url":  cancel_url,
    }

    resp = requests.post(f"{BASE_URL}/checkouts", json=payload, headers=_headers(), timeout=15)
    resp.raise_for_status()
    return resp.json()


def create_addon_checkout(addon_slug: str, success_url: str, cancel_url: str) -> dict:
    """
    Creates a one-time Recurrente checkout for an add-on.
    Returns {"id": "ch_...", "checkout_url": "https://..."}.
    """
    from .models import AddOn  # local import to avoid circular dependency

    try:
        addon = AddOn.objects.get(slug=addon_slug, is_active=True)
    except AddOn.DoesNotExist:
        raise ValueError(f"Add-on no encontrado o inactivo: {addon_slug}")

    payload = {
        "items": [
            {
                "name":            f"Optimiza CRM — {addon.name}",
                "amount_in_cents": int(addon.price * 100),
                "currency":        "USD",
                "quantity":        1,
            }
        ],
        "success_url": success_url,
        "cancel_url":  cancel_url,
    }

    resp = requests.post(f"{BASE_URL}/checkouts", json=payload, headers=_headers(), timeout=15)
    resp.raise_for_status()
    return resp.json()


def verify_webhook_signature(payload_bytes: bytes, signature_header: str) -> bool:
    """
    Recurrente signs webhooks with HMAC-SHA256.
    Header format: "sha256=<hex_digest>"
    Secret is the whsec_ value returned when registering the webhook endpoint.
    """
    secret = getattr(settings, "RECURRENTE_WEBHOOK_SECRET", "").strip()
    if not secret:
        # Skip verification in dev if secret not configured
        return True

    if secret.startswith("whsec_"):
        # Base64-encoded secret
        try:
            secret_bytes = base64.b64decode(secret[len("whsec_"):])
        except Exception:
            secret_bytes = secret.encode()
    else:
        secret_bytes = secret.encode()

    expected = hmac.new(secret_bytes, payload_bytes, hashlib.sha256).hexdigest()
    provided = signature_header.replace("sha256=", "").strip()
    return hmac.compare_digest(expected, provided)
