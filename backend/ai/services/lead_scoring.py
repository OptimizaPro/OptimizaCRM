"""
Optimiza-CRM – Lead Scoring service (rule-based v2)
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro

Score range 0–100, split into four tiers:
  80–100  Hot      (alta probabilidad de cierre)
  60–79   Warm     (lead comprometido, seguimiento activo)
  40–59   Moderate (potencial, necesita nurturing)
   0–39   Cold     (datos escasos o lead perdido)

Factores y pesos máximos:
  Fuente del lead       → max 25 pts
  Estado del lead       → max 30 pts
  Completitud contacto  → max 30 pts  (email +10, phone +8, empresa +12)
  Engagement            → max 15 pts  (engagement_score externo, 0-15)
"""

SOURCE_SCORES: dict[str, int] = {
    "referral":  25,   # recomendación directa — máxima intención
    "web":       18,   # interés proactivo
    "event":     15,   # contacto en evento
    "social":    12,   # interacción en redes
    "cold_call":  8,   # sin demanda confirmada
    "other":     10,
}

STATUS_SCORES: dict[str, int] = {
    "converted": 30,   # ya convirtió
    "qualified": 28,   # confirmado con presupuesto/necesidad
    "contacted": 16,   # respuesta recibida
    "new":        5,   # aún no contactado
    "lost":       0,
}


def score_lead(features: dict) -> dict:
    source = features.get("source", "other")
    status = features.get("status", "new")

    source_pts     = SOURCE_SCORES.get(source, 10)
    status_pts     = STATUS_SCORES.get(status, 5)
    email_pts      = 10 if features.get("has_email")   else 0
    phone_pts      =  8 if features.get("has_phone")   else 0
    company_pts    = 12 if features.get("has_company") else 0
    engagement_pts = min(int(features.get("engagement_score", 0)), 15)

    contact_pts = email_pts + phone_pts + company_pts
    score       = min(100, max(0, source_pts + status_pts + contact_pts + engagement_pts))

    if score >= 80:
        quality, quality_es, probability = "hot",      "Caliente", 0.85
    elif score >= 60:
        quality, quality_es, probability = "warm",     "Tibio",    0.60
    elif score >= 40:
        quality, quality_es, probability = "moderate", "Moderado", 0.35
    else:
        quality, quality_es, probability = "cold",     "Frío",     0.10

    return {
        "score":                  score,
        "quality":                quality,
        "quality_es":             quality_es,
        "conversion_probability": round(probability, 3),
        "model":                  "rule_based_v2",
        "factors": {
            "source":     {"label": "Fuente",     "value": source, "pts": source_pts,     "max": 25},
            "status":     {"label": "Estado",     "value": status, "pts": status_pts,     "max": 30},
            "contact":    {"label": "Contacto",   "value": None,   "pts": contact_pts,    "max": 30,
                           "detail": {"email": email_pts, "phone": phone_pts, "company": company_pts}},
            "engagement": {"label": "Engagement", "value": None,   "pts": engagement_pts, "max": 15},
        },
    }
