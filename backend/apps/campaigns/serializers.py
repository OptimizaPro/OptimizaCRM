from rest_framework import serializers
from .models import EmailCampaign


class EmailCampaignSerializer(serializers.ModelSerializer):
    open_rate  = serializers.ReadOnlyField()
    click_rate = serializers.ReadOnlyField()
    status_display          = serializers.CharField(source="get_status_display", read_only=True)
    recipient_type_display  = serializers.CharField(source="get_recipient_type_display", read_only=True)

    class Meta:
        model  = EmailCampaign
        fields = [
            "id", "name", "subject", "preview_text",
            "from_name", "from_email", "html_content",
            "status", "status_display",
            "recipient_type", "recipient_type_display",
            "sent_at", "recipient_count", "error_message",
            "stat_delivered", "stat_opens", "stat_clicks",
            "stat_unsubscribes", "stat_bounces",
            "open_rate", "click_rate",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status", "sent_at", "recipient_count", "error_message",
            "stat_delivered", "stat_opens", "stat_clicks",
            "stat_unsubscribes", "stat_bounces",
            "open_rate", "click_rate",
            "created_at", "updated_at",
        ]
