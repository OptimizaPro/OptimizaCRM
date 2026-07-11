import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("accounts", "0001_initial"),
        ("crm",      "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ChatbotWidget",
            fields=[
                ("id",              models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("created_at",      models.DateTimeField(auto_now_add=True)),
                ("updated_at",      models.DateTimeField(auto_now=True)),
                ("organization",    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="+", to="accounts.organization")),
                ("token",           models.UUIDField(default=uuid.uuid4, unique=True, editable=False)),
                ("name",            models.CharField(default="Asistente", max_length=100)),
                ("is_active",       models.BooleanField(default=True)),
                ("llm_model",       models.CharField(default="groq/llama-3.3-70b-versatile", max_length=100)),
                ("system_prompt",   models.TextField(blank=True)),
                ("welcome_message", models.CharField(default="¡Hola! ¿En qué puedo ayudarte hoy?", max_length=500)),
                ("message_count",   models.PositiveIntegerField(default=0)),
                ("session_count",   models.PositiveIntegerField(default=0)),
                ("config",          models.JSONField(default=dict, blank=True)),
            ],
            options={"db_table": "chatbot_widgets"},
        ),
        migrations.CreateModel(
            name="ChatSession",
            fields=[
                ("id",         models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("widget",     models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sessions", to="chatbot.chatbotwidget")),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("ended_at",   models.DateTimeField(blank=True, null=True)),
                ("metadata",   models.JSONField(default=dict, blank=True)),
                ("lead",       models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="chat_sessions", to="crm.lead")),
            ],
            options={"db_table": "chatbot_sessions", "ordering": ["-started_at"]},
        ),
        migrations.CreateModel(
            name="ChatMessage",
            fields=[
                ("id",           models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("session",      models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="chatbot.chatsession")),
                ("role",         models.CharField(choices=[("user", "Usuario"), ("assistant", "Asistente")], max_length=10)),
                ("content",      models.TextField()),
                ("sources_used", models.JSONField(default=list, blank=True)),
                ("created_at",   models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "chatbot_messages", "ordering": ["created_at"]},
        ),
    ]
