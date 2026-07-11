"""
Data migration: fix Voz Business plan.
  - agents: 1 → 10
  - minutes_included: 300 → 5000
  - features: replace stale strings that mention "1 agente" or "300 min"
"""

from django.db import migrations


def fix_business_plan(apps, schema_editor):
    VoicePlan = apps.get_model("voice_plans", "VoicePlan")

    # Match by slug or name (case-insensitive) to be safe
    plan = (
        VoicePlan.objects.filter(slug="business").first()
        or VoicePlan.objects.filter(name__icontains="business").first()
    )

    if not plan:
        return  # Plan doesn't exist yet — nothing to fix

    plan.agents           = 10
    plan.minutes_included = 5000

    # Fix stale feature strings that reflect the old wrong values
    replacements = {
        "1 agente":    "10 agentes",
        "300 min":     "5.000 min",
        "300min":      "5.000 min",
        "300 minutos": "5.000 minutos",
    }
    fixed = []
    for feature in (plan.features or []):
        updated = feature
        for old, new in replacements.items():
            updated = updated.replace(old, new)
        fixed.append(updated)
    plan.features = fixed

    plan.save()


class Migration(migrations.Migration):

    dependencies = [
        ("voice_plans", "0005_voicesetupplan_seed"),
    ]

    operations = [
        migrations.RunPython(fix_business_plan, migrations.RunPython.noop),
    ]
