"""
Data migration: fix Voz Starter plan price from $49 to $149/mes.
"""

from django.db import migrations


def fix_starter_price(apps, schema_editor):
    VoicePlan = apps.get_model("voice_plans", "VoicePlan")

    plan = (
        VoicePlan.objects.filter(slug="voz-starter").first()
        or VoicePlan.objects.filter(slug="starter").first()
        or VoicePlan.objects.filter(name__icontains="starter").first()
    )

    if not plan:
        return

    plan.price_monthly = "149.00"
    plan.save()


class Migration(migrations.Migration):

    dependencies = [
        ("voice_plans", "0007_voicefaq_seed"),
    ]

    operations = [
        migrations.RunPython(fix_starter_price, migrations.RunPython.noop),
    ]
