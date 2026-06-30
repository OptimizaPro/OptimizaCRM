from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("integrations", "0006_alter_voicewidget_name"),
    ]

    operations = [
        migrations.CreateModel(
            name="VoiceKBSource",
            fields=[
                ("id",             models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("organization",   models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="+", to="accounts.organization", verbose_name="Organización")),
                ("knowledge_base", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sources", to="integrations.voiceknowledgebase", verbose_name="Base de conocimiento")),
                ("source_type",    models.CharField(choices=[("url", "URL"), ("file", "Archivo")], max_length=10, verbose_name="Tipo")),
                ("name",           models.CharField(max_length=500, verbose_name="Nombre / URL")),
                ("char_count",     models.PositiveIntegerField(default=0, verbose_name="Caracteres extraídos")),
                ("created_at",     models.DateTimeField(auto_now_add=True, verbose_name="Importado el")),
            ],
            options={
                "verbose_name":        "Fuente de KB de voz",
                "verbose_name_plural": "Fuentes de KB de voz",
                "db_table":            "voice_kb_sources",
                "ordering":            ["-created_at"],
            },
        ),
    ]
