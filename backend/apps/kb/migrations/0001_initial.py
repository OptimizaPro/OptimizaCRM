import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="KnowledgeBase",
            fields=[
                ("id",           models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("created_at",   models.DateTimeField(auto_now_add=True)),
                ("updated_at",   models.DateTimeField(auto_now=True)),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="+", to="accounts.organization")),
                ("company_info",            models.TextField(blank=True, verbose_name="Sobre la empresa")),
                ("products_services",       models.TextField(blank=True, verbose_name="Productos y servicios")),
                ("pricing",                 models.TextField(blank=True, verbose_name="Precios y planes")),
                ("faqs",                    models.TextField(blank=True, verbose_name="Preguntas frecuentes")),
                ("working_hours",           models.CharField(blank=True, max_length=500, verbose_name="Horario de atención")),
                ("contact_info",            models.TextField(blank=True, verbose_name="Información de contacto")),
                ("appointment_rules",       models.TextField(blank=True, verbose_name="Reglas de citas")),
                ("qualification_questions", models.JSONField(blank=True, default=list, verbose_name="Preguntas de calificación")),
                ("whatsapp_number",         models.CharField(blank=True, max_length=30, verbose_name="WhatsApp de escalado")),
            ],
            options={"db_table": "knowledge_bases", "verbose_name": "Base de conocimiento"},
        ),
        migrations.CreateModel(
            name="KBSource",
            fields=[
                ("id",           models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("created_at",   models.DateTimeField(auto_now_add=True)),
                ("updated_at",   models.DateTimeField(auto_now=True)),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="+", to="accounts.organization")),
                ("knowledge_base", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sources", to="kb.knowledgebase", verbose_name="Base de conocimiento")),
                ("source_type",  models.CharField(choices=[("url", "URL"), ("file", "Archivo")], max_length=10, verbose_name="Tipo")),
                ("name",         models.CharField(max_length=500, verbose_name="Nombre / URL")),
                ("char_count",   models.PositiveIntegerField(default=0, verbose_name="Caracteres extraídos")),
            ],
            options={"db_table": "kb_sources", "ordering": ["-created_at"], "verbose_name": "Fuente de KB"},
        ),
    ]
