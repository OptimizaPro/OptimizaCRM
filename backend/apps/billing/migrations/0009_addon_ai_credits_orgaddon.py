import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
        ('billing', '0008_plan_ai_credits_monthly'),
    ]

    operations = [
        # 1. Add ai_credits field to AddOn
        migrations.AddField(
            model_name='addon',
            name='ai_credits',
            field=models.PositiveIntegerField(
                default=0,
                help_text='Créditos de IA mensuales que añade este add-on al límite de la organización. 0 = no aporta créditos IA.',
                verbose_name='Créditos IA / mes',
            ),
        ),

        # 2. Create OrgAddOn model
        migrations.CreateModel(
            name='OrgAddOn',
            fields=[
                ('id',                     models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status',                 models.CharField(choices=[('active', 'Activo'), ('canceled', 'Cancelado')], default='active', max_length=20, verbose_name='Estado')),
                ('activated_at',           models.DateTimeField(auto_now_add=True)),
                ('expires_at',             models.DateTimeField(blank=True, help_text='Dejar vacío para renovación mensual. Rellena solo para activaciones puntuales con fecha de fin.', null=True)),
                ('recurrente_checkout_id', models.CharField(blank=True, help_text='ID del checkout en Recurrente (se completa automáticamente vía webhook)', max_length=100)),
                ('notes',                  models.TextField(blank=True, help_text='Notas internas (ej. activado manualmente, cliente VIP, prueba gratuita)')),
                ('created_at',             models.DateTimeField(auto_now_add=True)),
                ('updated_at',             models.DateTimeField(auto_now=True)),
                ('addon',        models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='org_subscriptions', to='billing.addon', verbose_name='Complemento')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='org_addons', to='accounts.organization')),
            ],
            options={
                'verbose_name':        'Add-on de organización',
                'verbose_name_plural': 'Add-ons de organizaciones',
                'db_table':            'org_addons',
                'ordering':            ['-activated_at'],
                'unique_together':     {('organization', 'addon')},
            },
        ),
    ]
