from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0008_rename_leads_org_client_id_idx_leads_organiz_943439_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="lead",
            name="lead_ref_id",
            field=models.CharField(
                blank=True,
                db_index=True,
                default="",
                help_text="Código OPT-XXXX asignado por el ChatBot IA al capturar el lead.",
                max_length=20,
                verbose_name="ID de referencia chatbot",
            ),
        ),
        migrations.AlterField(
            model_name="lead",
            name="source",
            field=models.CharField(
                choices=[
                    ("web", "Sitio web"),
                    ("referral", "Referido"),
                    ("cold_call", "Llamada en frío"),
                    ("social", "Redes sociales"),
                    ("event", "Evento"),
                    ("voice_agent", "Agente de voz"),
                    ("chatbot", "Chatbot IA"),
                    ("other", "Otro"),
                ],
                default="web",
                max_length=50,
            ),
        ),
    ]
