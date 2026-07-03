from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("integrations", "0010_voicewidget_system_prompt"),
    ]

    operations = [
        migrations.AddField(
            model_name="voicecall",
            name="structured_output",
            field=models.JSONField(
                default=dict,
                blank=True,
                verbose_name="Salida estructurada",
            ),
        ),
    ]
