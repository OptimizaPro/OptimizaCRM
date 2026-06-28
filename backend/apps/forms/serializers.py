from rest_framework import serializers
from .models import EmbedForm, FormSubmission


class FormSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = FormSubmission
        fields = ["id", "data", "ip_address", "lead", "created_at"]
        read_only_fields = fields


class EmbedFormSerializer(serializers.ModelSerializer):
    embed_url  = serializers.ReadOnlyField()
    embed_code = serializers.ReadOnlyField()

    class Meta:
        model  = EmbedForm
        fields = [
            "id", "token", "name", "is_active", "submit_count",
            "fields", "style", "success_message", "redirect_url",
            "embed_url", "embed_code", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "token", "submit_count", "embed_url", "embed_code", "created_at", "updated_at"]
