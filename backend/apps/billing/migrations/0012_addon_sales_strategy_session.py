"""
Migration 0012
- Adds "target" icon choice to AddOn.icon
- Hides "Onboarding asistido" (show_in_pricing=False, is_active=False)
- Creates "Sesión de estrategia de ventas · $149" add-on
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
]


def swap_addons(apps, schema_editor):
    AddOn = apps.get_model("billing", "AddOn")

    # Hide the old onboarding add-on (try multiple possible slugs)
    for slug in ("onboarding-asistido", "onboarding"):
        AddOn.objects.filter(slug=slug).update(
            show_in_pricing=False,
            is_active=False,
        )

    # Create the new strategy session add-on (idempotent)
    AddOn.objects.update_or_create(
        slug="sales-strategy-session",
        defaults={
            "name":            "Sesión de estrategia de ventas",
            "description":     "Sesión de 90 min con un especialista para diseñar tu proceso de ventas, definir etapas del pipeline y configurar métricas clave.",
            "price":           "149.00",
            "period":          "pago único",
            "icon":            "target",
            "ai_credits":      0,
            "is_featured":     False,
            "is_active":       True,
            "show_in_pricing": True,
            "sort_order":      30,
        },
    )


def reverse_swap(apps, schema_editor):
    AddOn = apps.get_model("billing", "AddOn")

    # Re-enable old onboarding add-on
    for slug in ("onboarding-asistido", "onboarding"):
        AddOn.objects.filter(slug=slug).update(
            show_in_pricing=True,
            is_active=True,
        )

    # Remove the new add-on
    AddOn.objects.filter(slug="sales-strategy-session").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0011_alter_addon_is_active"),
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
