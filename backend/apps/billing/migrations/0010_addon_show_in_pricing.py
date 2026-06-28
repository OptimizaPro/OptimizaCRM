from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0009_addon_ai_credits_orgaddon'),
    ]

    operations = [
        migrations.AddField(
            model_name='addon',
            name='show_in_pricing',
            field=models.BooleanField(
                default=True,
                help_text='Mostrar en la página de precios pública (/precios). Desactiva para servicios con landing page propia.',
                verbose_name='Mostrar en precios',
            ),
        ),
    ]
