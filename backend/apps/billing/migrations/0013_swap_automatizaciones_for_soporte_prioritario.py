"""
Migration 0013
- Adds "headset" icon choice to AddOn.icon
- Disables "automatizaciones-extra" add-on (show_in_pricing=False, is_active=False)
- Creates "soporte-prioritario" add-on at $15/mes
"""

from django.db import migrations, models


ICON_CHOICES = [
    ("user-plus",      "Usuario adicional"),
    ("graduation-cap", "Onboarding / formación"),
    ("workflow",       "Automatizaciones"),
    ("zap",            "Velocidad / rendimiento"),
    ("shield",         "Seguridad"),
    ("brain",          "Inteligencia artificial"),
    ("bar-chart-3",    "Analítica"),
    ("plug",           "Integraciones"),
    ("target",         "Estrategia / ventas"),
    ("headset",        "Soporte"),
]


def swap_addons(apps, schema_editor):
    AddOn = apps.get_model("billing", "AddOn")

    # Disable automatizaciones-extra
    AddOn.objects.filter(slug="automatizaciones-extra").update(
        show_in_pricing=False,
        is_active=False,
    )

    # Create soporte-prioritario (idempotent)
    AddOn.objects.update_or_create(
        slug="soporte-prioritario",
        defaults={
            "name":            "Soporte Prioritario",
            "description":     "Respuesta garantizada en menos de 4 horas, canal directo por email y 1 sesión mensual de revisión de 30 min con el equipo.",
            "price":           "15.00",
            "period":          "/mes",
            "icon":            "headset",
            "ai_credits":      0,
            "is_featured":     False,
            "is_active":       True,
            "show_in_pricing": True,
            "sort_order":      20,
        },
    )


def reverse_swap(apps, schema_editor):
    AddOn = apps.get_model("billing", "AddOn")

    # Re-enable automatizaciones-extra
    AddOn.objects.filter(slug="automatizaciones-extra").update(
        show_in_pricing=True,
        is_active=True,
    )

    # Remove soporte-prioritario
    AddOn.objects.filter(slug="soporte-prioritario").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0012_addon_sales_strategy_session"),
    ]

    operations = [
        migrations.AlterField(
            model_name="addon",
            name="icon",
            field=models.CharField(
                choices=ICON_CHOICES,
                default="zap",
                help_text="Icono Lucide que se muestra en la tarjeta",
                max_length=50,
                verbose_name="Icono",
            ),
        ),
        migrations.RunPython(swap_addons, reverse_code=reverse_swap),
    ]
