from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import EmailCampaign


@admin.register(EmailCampaign)
class EmailCampaignAdmin(ModelAdmin):
    list_display = ("name", "subject", "status", "recipient_type", "recipient_count", "sent_at", "organization")
    list_filter  = ("status", "recipient_type", "organization")
    search_fields = ("name", "subject")
    readonly_fields = ("status", "recipient_count", "sent_at", "brevo_campaign_id",
                       "stat_delivered", "stat_opens", "stat_clicks", "stat_unsubscribes", "stat_bounces",
                       "error_message", "created_at", "updated_at")
