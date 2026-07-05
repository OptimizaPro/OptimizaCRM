from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="VoicePlan",
            fields=[
                ("id",                 models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("slug",               models.SlugField(max_length=50, unique=True)),
                ("name",               models.CharField(max_length=100)),
                ("price_monthly",      models.DecimalField(decimal_places=2, max_digits=8, help_text="Precio mensual en USD (ej. 49.00)")),
                ("agents",             models.PositiveSmallIntegerField(help_text="Número de agentes de voz IA incluidos")),
                ("minutes_included",   models.PositiveIntegerField(help_text="Minutos de llamada incluidos por mes")),
                ("overage_per_minute", models.DecimalField(decimal_places=3, max_digits=5, help_text="Coste por minuto adicional en USD (ej. 0.100)")),
                ("features",           models.JSONField(default=list, help_text='Array JSON de strings con las características del plan.')),
                ("cta_text",           models.CharField(default="Empezar prueba gratis", max_length=100)),
                ("is_popular",         models.BooleanField(default=False)),
                ("is_active",          models.BooleanField(default=True)),
                ("sort_order",         models.PositiveSmallIntegerField(default=0)),
            ],
            options={"db_table": "voice_plans", "ordering": ["sort_order"], "verbose_name": "Plan de Voz IA", "verbose_name_plural": "Planes de Voz IA"},
        ),
        migrations.CreateModel(
            name="VoiceFAQ",
            fields=[
                ("id",         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("question",   models.CharField(max_length=500)),
                ("answer",     models.TextField()),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                ("is_active",  models.BooleanField(default=True)),
            ],
            options={"db_table": "voice_faqs", "ordering": ["sort_order"], "verbose_name": "FAQ — Voz IA", "verbose_name_plural": "FAQs — Voz IA"},
        ),
        migrations.CreateModel(
            name="VoiceStat",
            fields=[
                ("id",         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("value",      models.CharField(max_length=20)),
                ("label",      models.CharField(max_length=200)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                ("is_active",  models.BooleanField(default=True)),
            ],
            options={"db_table": "voice_stats", "ordering": ["sort_order"], "verbose_name": "Estadística — Voz IA", "verbose_name_plural": "Estadísticas — Voz IA"},
        ),
    ]
