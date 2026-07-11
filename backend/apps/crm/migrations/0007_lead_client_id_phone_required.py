"""
Migration: add client_id to Lead; widen phone to 30 chars (was 20).
phone already has default='' so no data migration needed.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0006_add_teams"),
    ]

    operations = [
        # Widen phone to 30 chars (was 20) — no data loss
        migrations.AlterField(
            model_name="lead",
            name="phone",
            field=models.CharField(max_length=30, blank=False, default=""),
        ),
        # New client_id field
        migrations.AddField(
            model_name="lead",
            name="client_id",
            field=models.CharField(
                max_length=100,
                blank=True,
                default="",
                verbose_name="ID de cliente",
                help_text=(
                    "Identificador propio del cliente (p. ej. número de expediente). "
                    "El agente de voz lo usa para vincular llamadas a registros existentes."
                ),
            ),
        ),
        # Index for fast lookup by org + client_id
        migrations.AddIndex(
            model_name="lead",
            index=models.Index(
                fields=["organization", "client_id"],
                name="leads_org_client_id_idx",
            ),
        ),
    ]
