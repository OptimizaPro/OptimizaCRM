"""
Migration: add direction field to VoiceCall model.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("integrations", "0011_voicecall_structured_output"),
    ]

    operations = [
        migrations.AddField(
            model_name="voicecall",
            name="direction",
            field=models.CharField(
                choices=[("inbound", "Entrante"), ("outbound", "Saliente")],
                default="inbound",
                max_length=10,
                verbose_name="Dirección",
            ),
        ),
    ]
