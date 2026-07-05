from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0003_alter_sitecontent_key_vozid"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sitecontent",
            name="key",
            field=models.CharField(
                choices=[
                    ("hero",                          "Inicio — Hero & Características"),
                    ("pricing",                       "Precios"),
                    ("features_page",                 "Página de Características"),
                    ("general",                       "Configuración General"),
                    ("nosotros",                      "Nosotros"),
                    ("contacto",                      "Contacto"),
                    ("privacidad",                    "Política de Privacidad"),
                    ("terminos",                      "Términos y Condiciones"),
                    ("servicios_whatsapp",            "Servicios — Setup WhatsApp Business"),
                    ("servicios_implementacion",      "Servicios — Implementación CRM"),
                    ("servicios_implementacion_voz",  "Servicios — Setup Agente de Voz IA"),
                    ("voz_ia",                        "Agente de Voz IA — Landing"),
                ],
                max_length=50,
                unique=True,
            ),
        ),
    ]
