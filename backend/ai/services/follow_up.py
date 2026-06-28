"""
Optimiza-CRM – Follow-Up Recommendation service
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

_ACTIONS: dict[str, dict] = {
    "new":         {"action": "Enviar email de introducción",               "channel": "email",   "timing_days": 0},
    "contacted":   {"action": "Programar llamada de descubrimiento",        "channel": "phone",   "timing_days": 2},
    "qualified":   {"action": "Enviar invitación para reunión de propuesta", "channel": "meeting", "timing_days": 1},
    "proposal":    {"action": "Seguimiento de propuesta",                   "channel": "email",   "timing_days": 3},
    "negotiation": {"action": "Llamada de verificación ejecutiva",          "channel": "phone",   "timing_days": 1},
    "active":      {"action": "Revisión de negocio trimestral",             "channel": "meeting", "timing_days": 7},
    "inactive":    {"action": "Campaña de reactivación por email",          "channel": "email",   "timing_days": 0},
}

_TEMPLATES: dict[tuple, str] = {
    ("lead",     "new",         "email"):   "Hola {name}, gracias por tu interés en nuestras soluciones...",
    ("lead",     "qualified",   "meeting"): "Hola {name}, me gustaría programar una reunión para hablar sobre tus necesidades...",
    ("customer", "active",      "meeting"): "Hola {name}, quería agendar nuestra revisión trimestral de negocio...",
    ("customer", "inactive",    "email"):   "Hola {name}, echamos de menos trabajar contigo. Aquí tienes nuestras novedades...",
}


def recommend_follow_up(data: dict) -> dict:
    entity_type        = data.get("entity_type", "lead")
    status             = data.get("status", "new")
    last_contact_days  = data.get("days_since_last_contact", 7)
    score              = int(data.get("score", 50))

    template = _ACTIONS.get(status, _ACTIONS["new"])

    if last_contact_days > 14:
        timing_days, urgency = 0, "high"
    elif last_contact_days > 7:
        timing_days, urgency = 1, "medium"
    else:
        timing_days, urgency = template["timing_days"], "low"

    channel = ("phone" if template["channel"] == "email" else template["channel"]) if score >= 80 else template["channel"]
    if score >= 80:
        urgency = "high"

    message_template = _TEMPLATES.get(
        (entity_type, status, channel),
        f"Hola {{name}}, haciendo seguimiento respecto a tu {entity_type}...",
    )

    return {
        "recommended_action": template["action"],
        "best_channel":        channel,
        "timing_days":         timing_days,
        "urgency":             urgency,
        "message_template":    message_template,
        "model":               "rule_based_followup_v1",
    }
