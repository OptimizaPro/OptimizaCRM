from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chatbot", "0002_alter_chatbotwidget_options_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="chatsession",
            name="capture_state",
            field=models.CharField(
                choices=[
                    ("init", "Inicio"),
                    ("ask_name", "Preguntando nombre"),
                    ("ask_phone", "Preguntando teléfono"),
                    ("ask_email", "Preguntando email"),
                    ("active", "Activo"),
                    ("skip", "Sin captura"),
                ],
                default="init",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="chatsession",
            name="lead_data",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="chatsession",
            name="intent_level",
            field=models.CharField(blank=True, default="", max_length=10),
        ),
        migrations.AddField(
            model_name="chatsession",
            name="intent_topics",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="chatsession",
            name="intent_summary",
            field=models.TextField(blank=True),
        ),
    ]
