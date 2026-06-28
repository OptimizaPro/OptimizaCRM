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
            name="EmailCampaign",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=200, verbose_name="Nombre interno")),
                ("subject", models.CharField(max_length=500, verbose_name="Asunto")),
                ("preview_text", models.CharField(blank=True, max_length=200, verbose_name="Texto de vista previa")),
                ("from_name", models.CharField(blank=True, max_length=100, verbose_name="Nombre del remitente")),
                ("from_email", models.EmailField(blank=True, verbose_name="Email del remitente")),
                ("html_content", models.TextField(verbose_name="Contenido HTML")),
                ("status", models.CharField(choices=[("draft", "Borrador"), ("sending", "Enviando"), ("sent", "Enviado"), ("error", "Error")], default="draft", max_length=20, verbose_name="Estado")),
                ("recipient_type", models.CharField(choices=[("all_contacts", "Todos los contactos con email"), ("all_leads", "Solo leads (no clientes)"), ("all_customers", "Solo clientes")], default="all_contacts", max_length=20, verbose_name="Destinatarios")),
                ("sent_at", models.DateTimeField(blank=True, null=True, verbose_name="Enviado el")),
                ("recipient_count", models.PositiveIntegerField(default=0, editable=False, verbose_name="Destinatarios enviados")),
                ("error_message", models.TextField(blank=True, verbose_name="Error")),
                ("brevo_campaign_id", models.BigIntegerField(blank=True, editable=False, null=True, verbose_name="ID en Brevo")),
                ("stat_delivered", models.PositiveIntegerField(default=0, editable=False)),
                ("stat_opens", models.PositiveIntegerField(default=0, editable=False)),
                ("stat_clicks", models.PositiveIntegerField(default=0, editable=False)),
                ("stat_unsubscribes", models.PositiveIntegerField(default=0, editable=False)),
                ("stat_bounces", models.PositiveIntegerField(default=0, editable=False)),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="+", to="accounts.organization")),
            ],
            options={
                "verbose_name": "Campaña de email",
                "verbose_name_plural": "Campañas de email",
                "db_table": "email_campaigns",
                "ordering": ["-created_at"],
            },
        ),
    ]
