"""
Data migration — seed initial VoiceSetupPlan tiers.
"""

from django.db import migrations


TIERS = [
    {
        "slug":       "starter",
        "name":       "Setup Starter",
        "tagline":    "Para empresas que quieren un agente operativo rápido con lo esencial configurado.",
        "price":      "299.00",
        "days":       "48 horas hábiles",
        "cta_text":   "Contratar Setup Starter",
        "is_popular": False,
        "is_active":  True,
        "sort_order": 0,
        "features": [
            {"text": "Configuración completa de 1 agente de voz",          "highlight": False},
            {"text": "Base de conocimiento desde tu web o documento",       "highlight": True},
            {"text": "Saludo, despedida y flujo de conversación inicial",   "highlight": False},
            {"text": "Hasta 5 preguntas de calificación de leads",          "highlight": False},
            {"text": "Integración con CRM (captura de leads automática)",  "highlight": True},
            {"text": "Prueba funcional y ajuste fino",                      "highlight": False},
            {"text": "Documentación de configuración entregada",            "highlight": False},
        ],
    },
    {
        "slug":       "pro",
        "name":       "Setup Pro",
        "tagline":    "Para equipos que necesitan múltiples agentes, flujos avanzados y experiencia de marca.",
        "price":      "599.00",
        "days":       "5 días hábiles",
        "cta_text":   "Contratar Setup Pro",
        "is_popular": True,
        "is_active":  True,
        "sort_order": 1,
        "features": [
            {"text": "Todo lo del Setup Starter",                                       "highlight": False},
            {"text": "Hasta 3 agentes configurados",                                    "highlight": True},
            {"text": "Múltiples bases de conocimiento",                                 "highlight": False},
            {"text": "Flujos de calificación avanzados a medida de tu negocio",        "highlight": True},
            {"text": "Escalado automático a humano vía WhatsApp configurado",          "highlight": True},
            {"text": "Agenda de citas integrada con tu calendario",                     "highlight": False},
            {"text": "1 sesión de ajuste post-lanzamiento (15 días)",                   "highlight": True},
        ],
    },
    {
        "slug":       "enterprise",
        "name":       "Setup Enterprise",
        "tagline":    "Para empresas con múltiples departamentos, flujos complejos o más de 3 agentes activos.",
        "price":      None,
        "days":       "A convenir",
        "cta_text":   "Solicitar propuesta",
        "is_popular": False,
        "is_active":  True,
        "sort_order": 2,
        "features": [
            {"text": "Todo lo del Setup Pro",                                           "highlight": False},
            {"text": "Agentes ilimitados según plan contratado",                        "highlight": False},
            {"text": "Voz personalizada de marca",                                      "highlight": True},
            {"text": "Flujos multi-departamento y multi-idioma",                        "highlight": False},
            {"text": "Integraciones avanzadas (ERP, e-commerce, sistema propio)",      "highlight": True},
            {"text": "Capacitación al equipo operativo",                                "highlight": False},
            {"text": "Acompañamiento de adopción 30 días",                             "highlight": True},
            {"text": "Soporte prioritario con SLA definido",                            "highlight": False},
        ],
    },
]


def seed_setup_plans(apps, schema_editor):
    VoiceSetupPlan = apps.get_model("voice_plans", "VoiceSetupPlan")
    for tier in TIERS:
        VoiceSetupPlan.objects.update_or_create(
            slug=tier["slug"],
            defaults={k: v for k, v in tier.items() if k != "slug"},
        )


def unseed_setup_plans(apps, schema_editor):
    VoiceSetupPlan = apps.get_model("voice_plans", "VoiceSetupPlan")
    VoiceSetupPlan.objects.filter(slug__in=[t["slug"] for t in TIERS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("voice_plans", "0004_alter_voicesetupplan_features"),
    ]

    operations = [
        migrations.RunPython(seed_setup_plans, reverse_code=unseed_setup_plans),
    ]
