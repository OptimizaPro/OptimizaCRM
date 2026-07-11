from django.urls import path
from .views import (
    chatbot_chat,
    chatbot_manage,
    chatbot_embed,
    chatbot_sessions,
    chatbot_config,
)

urlpatterns = [
    path("chatbot/chat/",     chatbot_chat,     name="chatbot-chat"),
    path("chatbot/config/",   chatbot_config,   name="chatbot-config"),
    path("chatbot/manage/",   chatbot_manage,   name="chatbot-manage"),
    path("chatbot/embed/",    chatbot_embed,    name="chatbot-embed"),
    path("chatbot/sessions/", chatbot_sessions, name="chatbot-sessions"),
]
