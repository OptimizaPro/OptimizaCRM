import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
        ("kb",       "0002_data_migrate_voice_kb"),
    ]

    operations = [
        migrations.CreateModel(
            name="KBChunk",
            fields=[
                ("id",             models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("created_at",     models.DateTimeField(auto_now_add=True)),
                ("updated_at",     models.DateTimeField(auto_now=True)),
                ("organization",   models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="+", to="accounts.organization")),
                ("knowledge_base", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chunks", to="kb.knowledgebase", verbose_name="Base de conocimiento")),
                ("section",        models.CharField(max_length=50, verbose_name="Sección KB")),
                ("chunk_index",    models.PositiveSmallIntegerField(default=0, verbose_name="Índice")),
                ("text",           models.TextField(verbose_name="Texto del fragmento")),
                ("embedding",      models.TextField(blank=True, verbose_name="Embedding JSON")),
                ("embedded_at",    models.DateTimeField(blank=True, null=True, verbose_name="Fecha de embedding")),
            ],
            options={
                "db_table":       "kb_chunks",
                "ordering":       ["section", "chunk_index"],
                "verbose_name":   "Fragmento KB",
            },
        ),
        migrations.AddConstraint(
            model_name="kbchunk",
            constraint=models.UniqueConstraint(
                fields=["knowledge_base", "section", "chunk_index"],
                name="unique_kb_chunk",
            ),
        ),
    ]
