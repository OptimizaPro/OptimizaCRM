"""
Optimiza-CRM – Churn Prediction service
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""


def predict_churn(features: dict) -> dict:
    ltv       = features.get("lifetime_value", 0)
    status    = features.get("status", "active")
    opp_count = features.get("opportunity_count", 0)
    won_deals = features.get("won_deals", 0)
    days      = features.get("days_since_created", 30)

    risk = 0.3

    if status == "inactive":
        risk += 0.35
    elif status == "churned":
        risk = 0.95
    elif status == "active":
        if ltv < 1000:
            risk += 0.15
        elif ltv > 10000:
            risk -= 0.15

    if opp_count == 0:
        risk += 0.20
    elif won_deals == 0 and opp_count > 2:
        risk += 0.25

    if days > 365 and won_deals == 0:
        risk += 0.10

    churn_risk = min(1.0, max(0.0, round(risk, 3)))
    retention  = round(1.0 - churn_risk, 3)

    if churn_risk >= 0.7:
        level          = "high"
        recommendation = "Se requiere contacto inmediato. Programa una llamada de retención."
    elif churn_risk >= 0.4:
        level          = "medium"
        recommendation = "Aumenta el engagement. Envía una oferta personalizada."
    else:
        level          = "low"
        recommendation = "Mantén el contacto regular. Hay oportunidades de upsell."

    return {
        "churn_risk":             churn_risk,
        "retention_probability":  retention,
        "risk_level":             level,
        "recommendation":         recommendation,
        "model":                  "rule_based_churn_v1",
    }
