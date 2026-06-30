from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("integrations", "0004_voice_models"),
    ]

    operations = [
        migrations.AddField(
            model_name="voicewidget",
            name="name",
            field=models.CharField(
                max_length=100,
                default="Agente de Voz",
                verbose_name="Nombre del agente",
                help_text="Identificador interno del agente (visible solo en el dashboard).",
            ),
        ),
    ]
