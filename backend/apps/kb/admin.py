from django.contrib import admin
from .models import KnowledgeBase, KBSource


class KBSourceInline(admin.TabularInline):
    model  = KBSource
    extra  = 0
    fields = ("source_type", "name", "char_count", "created_at")
    readonly_fields = ("created_at",)


@admin.register(KnowledgeBase)
class KnowledgeBaseAdmin(admin.ModelAdmin):
    list_display  = ("organization", "created_at", "updated_at")
    inlines       = [KBSourceInline]
    readonly_fields = ("created_at", "updated_at")


@admin.register(KBSource)
class KBSourceAdmin(admin.ModelAdmin):
    list_display  = ("name", "source_type", "char_count", "organization", "created_at")
    list_filter   = ("source_type",)
    readonly_fields = ("created_at",)
