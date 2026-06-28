"""
Optimiza-CRM – Revenue Forecast service
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import statistics


def forecast_revenue(historical: list, pipeline_value: float, period: str = "monthly") -> dict:
    if not historical:
        historical = [0]

    recent      = historical[:6] if len(historical) >= 6 else historical
    avg_revenue = statistics.mean(recent) if recent else 0

    if len(recent) >= 2:
        growth_rate = (recent[0] - recent[-1]) / max(recent[-1], 1)
        growth_rate = max(-0.5, min(0.5, growth_rate))
    else:
        growth_rate = 0.05

    pipeline_factor = pipeline_value * 0.25

    if period == "weekly":
        base    = avg_revenue / 4
        periods = ["Semana 1", "Semana 2", "Semana 3", "Semana 4"]
    elif period == "quarterly":
        base    = avg_revenue * 3
        periods = ["T1", "T2", "T3", "T4"]
    else:
        base    = avg_revenue
        periods = ["Mes 1", "Mes 2", "Mes 3"]

    divisor  = {"weekly": 12, "quarterly": 1}.get(period, 3)
    forecast = base * (1 + growth_rate) + pipeline_factor / divisor

    forecasts = [
        {
            "period":              label,
            "forecasted_revenue":  round(max(0, forecast * (1 + growth_rate * i * 0.1)), 2),
            "confidence":          round(max(0.5, 0.85 - i * 0.05), 2),
        }
        for i, label in enumerate(periods)
    ]

    return {
        "period_type":             period,
        "forecasts":               forecasts,
        "historical_average":      round(avg_revenue, 2),
        "growth_rate":             round(growth_rate, 4),
        "pipeline_contribution":   round(pipeline_factor, 2),
        "model":                   "rule_based_forecast_v1",
    }
