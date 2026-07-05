from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("voice_plans", "0002_alter_voiceplan_cta_text_alter_voiceplan_features_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="VoiceSetupPlan",
            fields=[
                ("id",         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("slug",       models.SlugField(max_length=50, unique=True)),
                ("name",       models.CharField(max_length=100)),
                ("tagline",    models.CharField(help_text="Descripción corta que aparece bajo el nombre del tier", max_length=300)),
                ("price",      models.DecimalField(blank=True, decimal_places=2, help_text="Precio en USD. Dejar vacío para tiers 'A medida'.", max_digits=8, null=True)),
                ("days",       models.CharField(default="A convenir", help_text='Plazo de entrega visible (ej. "48 horas hábiles", "5 días hábiles")', max_length=60)),
                ("features",   models.JSONField(default=list, help_text='Array JSON de objetos {text, highlight}. Ej: [{"text": "1 agente configurado", "highlight": false}]')),
                ("cta_text",   models.CharField(default="Contratar", help_text="Texto del botón CTA en la tarjeta del tier", max_length=100)),
                ("is_popular", models.BooleanField(default=False, help_text="Marca este tier como el más elegido (resaltado visualmente)")),
                ("is_active",  models.BooleanField(default=True, help_text="Solo los tiers activos se muestran en /servicios/voz-ia")),
                ("sort_order", models.PositiveSmallIntegerField(default=0, help_text="Orden de aparición (menor número = primero)")),
            ],
            options={
                "verbose_name": "Setup Agente de Voz IA",
                "verbose_name_plural": "Setup Agente de Voz IA — Tiers",
                "db_table": "voice_setup_plans",
                "ordering": ["sort_order"],
            },
        ),
    ]
