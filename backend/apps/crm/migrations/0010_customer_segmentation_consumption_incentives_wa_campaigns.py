"""
Migration: Customer segmentation, ConsumptionRecord, IncentiveProgram, WhatsAppCampaign
"""

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0009_lead_ref_id_chatbot_source"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── 1. Add segment fields to Customer ────────────────────────────────────
        migrations.AddField(
            model_name="customer",
            name="segment",
            field=models.CharField(
                choices=[
                    ("basic",    "Básico"),
                    ("frequent", "Frecuente"),
                    ("vip",      "VIP"),
                    ("premium",  "Premium"),
                ],
                default="basic",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="customer",
            name="segment_auto",
            field=models.BooleanField(
                default=True,
                help_text="Segmento asignado automáticamente por reglas",
            ),
        ),
        migrations.AddIndex(
            model_name="customer",
            index=models.Index(fields=["organization", "segment"], name="customers_org_segment_idx"),
        ),
        migrations.AddIndex(
            model_name="customer",
            index=models.Index(fields=["organization", "status"], name="customers_org_status_idx"),
        ),

        # ── 2. ConsumptionRecord ──────────────────────────────────────────────────
        migrations.CreateModel(
            name="ConsumptionRecord",
            fields=[
                ("id",          models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at",  models.DateTimeField(auto_now_add=True)),
                ("updated_at",  models.DateTimeField(auto_now=True)),
                ("amount",      models.DecimalField(decimal_places=2, max_digits=15)),
                ("date",        models.DateField()),
                ("description", models.CharField(blank=True, max_length=255)),
                ("category",    models.CharField(
                    choices=[
                        ("purchase", "Compra"),
                        ("service",  "Servicio"),
                        ("recharge", "Recarga"),
                        ("other",    "Otro"),
                    ],
                    default="purchase",
                    max_length=20,
                )),
                ("reference",   models.CharField(blank=True, help_text="# factura u otro identificador", max_length=100)),
                ("organization", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="+",
                    to="accounts.organization",
                )),
                ("customer", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="consumption_records",
                    to="crm.customer",
                )),
            ],
            options={
                "db_table": "consumption_records",
                "ordering": ["-date", "-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="consumptionrecord",
            index=models.Index(fields=["organization", "customer", "date"], name="consumption_org_cust_date_idx"),
        ),

        # ── 3. IncentiveProgram ───────────────────────────────────────────────────
        migrations.CreateModel(
            name="IncentiveProgram",
            fields=[
                ("id",             models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at",     models.DateTimeField(auto_now_add=True)),
                ("updated_at",     models.DateTimeField(auto_now=True)),
                ("name",           models.CharField(max_length=255)),
                ("description",    models.TextField(blank=True)),
                ("program_type",   models.CharField(
                    choices=[
                        ("points",   "Puntos"),
                        ("discount", "Descuento"),
                        ("gift",     "Regalo"),
                        ("cashback", "Cashback"),
                    ],
                    default="points",
                    max_length=20,
                )),
                ("target_segment", models.CharField(
                    choices=[
                        ("all",      "Todos"),
                        ("basic",    "Básico"),
                        ("frequent", "Frecuente"),
                        ("vip",      "VIP"),
                        ("premium",  "Premium"),
                    ],
                    default="all",
                    max_length=20,
                )),
                ("min_amount",    models.DecimalField(decimal_places=2, default=0, help_text="Consumo mínimo para calificar", max_digits=15)),
                ("reward_value",  models.DecimalField(decimal_places=2, default=0, help_text="Valor del beneficio", max_digits=10)),
                ("rules",         models.JSONField(blank=True, default=dict, help_text="Reglas adicionales en formato JSON")),
                ("is_active",     models.BooleanField(default=True)),
                ("start_date",    models.DateField()),
                ("end_date",      models.DateField(blank=True, null=True)),
                ("organization",  models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="+",
                    to="accounts.organization",
                )),
                ("created_by",    models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="created_incentive_programs",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "db_table": "incentive_programs",
                "ordering": ["-created_at"],
            },
        ),

        # ── 4. WhatsAppCampaign ───────────────────────────────────────────────────
        migrations.CreateModel(
            name="WhatsAppCampaign",
            fields=[
                ("id",               models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at",       models.DateTimeField(auto_now_add=True)),
                ("updated_at",       models.DateTimeField(auto_now=True)),
                ("name",             models.CharField(max_length=255)),
                ("message_template", models.TextField(help_text="Usar {{nombre}}, {{segmento}}, {{empresa}} como variables")),
                ("target_segment",   models.CharField(
                    choices=[
                        ("all",      "Todos"),
                        ("basic",    "Básico"),
                        ("frequent", "Frecuente"),
                        ("vip",      "VIP"),
                        ("premium",  "Premium"),
                    ],
                    default="all",
                    max_length=20,
                )),
                ("status",          models.CharField(
                    choices=[
                        ("draft",     "Borrador"),
                        ("scheduled", "Programada"),
                        ("sending",   "Enviando"),
                        ("sent",      "Enviada"),
                        ("failed",    "Fallida"),
                    ],
                    default="draft",
                    max_length=20,
                )),
                ("scheduled_at",    models.DateTimeField(blank=True, null=True)),
                ("sent_at",         models.DateTimeField(blank=True, null=True)),
                ("sent_count",      models.PositiveIntegerField(default=0)),
                ("failed_count",    models.PositiveIntegerField(default=0)),
                ("recipient_count", models.PositiveIntegerField(default=0, help_text="Total de destinatarios al momento del envío")),
                ("organization",    models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="+",
                    to="accounts.organization",
                )),
                ("created_by",      models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="created_wa_campaigns",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "db_table": "whatsapp_campaigns",
                "ordering": ["-created_at"],
            },
        ),
    ]
