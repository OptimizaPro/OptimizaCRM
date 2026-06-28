from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0007_add_addon_is_featured'),
    ]

    operations = [
        migrations.AddField(
            model_name='plan',
            name='ai_credits_monthly',
            field=models.PositiveIntegerField(
                default=50,
                help_text='Créditos de IA incluidos por mes (análisis de sentimiento, seguimiento, briefing, escritura). 0 = sin IA.',
            ),
        ),
    ]
