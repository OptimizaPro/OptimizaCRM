from django.contrib import admin
from .models import ChatbotWidget, ChatSession, ChatMessage


class ChatMessageInline(admin.TabularInline):
    model       = ChatMessage
    extra       = 0
    fields      = ("role", "content", "created_at")
    readonly_fields = ("created_at",)
    max_num     = 20


@admin.register(ChatbotWidget)
class ChatbotWidgetAdmin(admin.ModelAdmin):
    list_display  = ("organization", "name", "llm_model", "is_active", "message_count", "session_count")
    readonly_fields = ("token", "message_count", "session_count", "created_at", "updated_at")


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display  = ("id", "widget", "started_at")
    readonly_fields = ("id", "started_at")
    inlines       = [ChatMessageInline]


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display  = ("role", "session", "content", "created_at")
    list_filter   = ("role",)
    readonly_fields = ("id", "created_at")
