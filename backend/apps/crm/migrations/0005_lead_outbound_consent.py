"""
Migration: add outbound_consent and consent_date to Lead model.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0004_voice_agent_source_calendarevent_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="lead",
            name="outbound_consent",
            field=models.BooleanField(default=False, verbose_name="Consentimiento outbound"),
        ),
        migrations.AddField(
            model_name="lead",
            name="consent_date",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Fecha de consentimiento"),
        ),
    ]
