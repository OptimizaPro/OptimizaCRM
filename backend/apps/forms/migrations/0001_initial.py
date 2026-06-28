import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("accounts", "0001_initial"),
        ("crm", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="EmbedForm",
            fields=[
                ("id",            models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at",    models.DateTimeField(auto_now_add=True)),
                ("updated_at",    models.DateTimeField(auto_now=True)),
                ("token",         models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("name",          models.CharField(max_length=100, verbose_name="Nombre interno")),
                ("is_active",     models.BooleanField(default=True, verbose_name="Activo")),
                ("submit_count",  models.PositiveIntegerField(default=0, editable=False, verbose_name="Envíos")),
                ("fields",        models.JSONField(default=list, verbose_name="Campos del formulario")),
                ("style",         models.JSONField(blank=True, default=dict, verbose_name="Estilo")),
                ("success_message", models.CharField(default="¡Gracias! Nos pondremos en contacto pronto.", max_length=500, verbose_name="Mensaje de éxito")),
                ("redirect_url",  models.URLField(blank=True, verbose_name="URL de redirección")),
                ("organization",  models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="+", to="accounts.organization")),
            ],
            options={"db_table": "embed_forms", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="FormSubmission",
            fields=[
                ("id",         models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("data",       models.JSONField(default=dict, verbose_name="Datos enviados")),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True, verbose_name="IP")),
                ("user_agent", models.TextField(blank=True, verbose_name="User Agent")),
                ("form",       models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="submissions", to="forms.embedform", verbose_name="Formulario")),
                ("lead",       models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="form_submissions", to="crm.lead", verbose_name="Lead generado")),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="+", to="accounts.organization")),
            ],
            options={"db_table": "form_submissions", "ordering": ["-created_at"]},
        ),
    ]
