from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("integrations", "0009_googledrive"),
    ]

    operations = [
        migrations.AddField(
            model_name="voicewidget",
            name="system_prompt",
            field=models.TextField(
                blank=True,
                verbose_name="System prompt personalizado",
                help_text="Deja vacío para usar el prompt generado automáticamente desde la base de conocimiento.",
            ),
        ),
    ]
