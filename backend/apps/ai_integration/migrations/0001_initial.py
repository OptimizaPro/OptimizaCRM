import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AIUsage',
            fields=[
                ('id',             models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('period_start',   models.DateField(help_text='Primer día del mes al que corresponde este registro')),
                ('credits_used',   models.PositiveIntegerField(default=0)),
                ('credits_limit',  models.PositiveIntegerField(default=50, help_text='Límite mensual copiado del plan en el momento de creación')),
                ('organization',   models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ai_usage_records', to='accounts.organization')),
            ],
            options={
                'db_table':        'ai_usage',
                'ordering':        ['-period_start'],
                'unique_together': {('organization', 'period_start')},
            },
        ),
    ]
