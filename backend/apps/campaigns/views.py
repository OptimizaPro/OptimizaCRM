"""
Optimiza-CRM – Email Marketing Campaigns views
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.middleware import get_current_organization
from core.permissions import IsOrgAdmin
from apps.integrations.models import Integration
from apps.crm.models import Lead
from .models import EmailCampaign
from .serializers import EmailCampaignSerializer
from .brevo_service import BrevoService, BrevoError


def _get_brevo_service(org):
    """Returns (BrevoService, None) or (None, error_str)."""
    try:
        integration = Integration.objects.get(
            organization=org, channel_type="brevo", status="connected"
        )
        api_key = integration.config.get("api_key", "")
        if not api_key:
            return None, "Brevo no está configurado. Ve a Integraciones → Brevo y conecta tu API key."
        return BrevoService(api_key), integration
    except Integration.DoesNotExist:
        return None, "Brevo no está configurado. Ve a Integraciones → Brevo y conecta tu API key."


def _get_recipients(org, recipient_type):
    """Returns list of (email, first_name, last_name)."""
    qs = Lead.objects.filter(organization=org).exclude(email="").exclude(email__isnull=True)
    if recipient_type == "all_customers":
        qs = qs.filter(status="customer")
    elif recipient_type == "all_leads":
        qs = qs.exclude(status="customer")
    # all_contacts: everyone with an email
    return list(qs.values_list("email", "first_name", "last_name"))


class EmailCampaignViewSet(viewsets.ModelViewSet):
    serializer_class = EmailCampaignSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        org = get_current_organization()
        if not org:
            return EmailCampaign.objects.none()
        return EmailCampaign.objects.filter(organization=org).order_by("-created_at")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy", "send", "sync_stats"):
            return [IsAuthenticated(), IsOrgAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        org = get_current_organization()
        serializer.save(organization=org)

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        campaign = self.get_object()

        if campaign.status == "sent":
            return Response({"error": "Esta campaña ya fue enviada."}, status=status.HTTP_400_BAD_REQUEST)
        if campaign.status == "sending":
            return Response({"error": "Esta campaña está en proceso de envío."}, status=status.HTTP_400_BAD_REQUEST)

        org = get_current_organization()
        brevo_service, result = _get_brevo_service(org)
        if brevo_service is None:
            return Response({"error": result}, status=status.HTTP_400_BAD_REQUEST)

        integration = result  # _get_brevo_service returns integration as second value on success

        recipients = _get_recipients(org, campaign.recipient_type)
        if not recipients:
            return Response({"error": "No hay contactos con email para enviar."}, status=status.HTTP_400_BAD_REQUEST)

        # Determine sender
        from_name  = campaign.from_name  or integration.config.get("sender_name", "")
        from_email = campaign.from_email or integration.config.get("sender_email", "")
        if not from_email:
            return Response(
                {"error": "Configura el email del remitente en la campaña o en la integración de Brevo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        campaign.status = "sending"
        campaign.save(update_fields=["status"])

        brevo_list_id    = None
        brevo_campaign_id = None

        try:
            # 1. Sync contacts to Brevo
            for email, first_name, last_name in recipients:
                try:
                    brevo_service.create_or_update_contact(email, first_name or "", last_name or "")
                except BrevoError:
                    pass  # Skip individual failures; contact may still be in Brevo from before

            # 2. Create a temporary Brevo list for this campaign
            list_name     = f"CRM_{str(campaign.id)[:8]}_{timezone.now().strftime('%Y%m%d%H%M%S')}"
            brevo_list_id = brevo_service.create_list(list_name)

            # 3. Add emails to that list
            emails = [r[0] for r in recipients]
            brevo_service.add_contacts_to_list(brevo_list_id, emails)

            # 4. Create the campaign in Brevo
            brevo_campaign_id = brevo_service.create_campaign(
                name=campaign.name,
                subject=campaign.subject,
                from_name=from_name,
                from_email=from_email,
                html_content=campaign.html_content,
                list_id=brevo_list_id,
                preview_text=campaign.preview_text,
            )

            # 5. Fire
            brevo_service.send_campaign_now(brevo_campaign_id)

            # 6. Persist
            campaign.status            = "sent"
            campaign.sent_at           = timezone.now()
            campaign.recipient_count   = len(recipients)
            campaign.brevo_campaign_id = brevo_campaign_id
            campaign.error_message     = ""
            campaign.save()

            return Response(EmailCampaignSerializer(campaign).data)

        except BrevoError as exc:
            campaign.status        = "error"
            campaign.error_message = str(exc)
            campaign.save(update_fields=["status", "error_message"])
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as exc:
            campaign.status        = "error"
            campaign.error_message = str(exc)
            campaign.save(update_fields=["status", "error_message"])
            return Response({"error": "Error inesperado al enviar la campaña."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"])
    def sync_stats(self, request, pk=None):
        campaign = self.get_object()
        if not campaign.brevo_campaign_id:
            return Response({"error": "Esta campaña no tiene ID de Brevo (aún no fue enviada)."}, status=status.HTTP_400_BAD_REQUEST)

        org = get_current_organization()
        brevo_service, result = _get_brevo_service(org)
        if brevo_service is None:
            return Response({"error": result}, status=status.HTTP_400_BAD_REQUEST)

        try:
            stats = brevo_service.get_campaign_stats(campaign.brevo_campaign_id)
            campaign.stat_delivered    = stats["delivered"]
            campaign.stat_opens        = stats["opens"]
            campaign.stat_clicks       = stats["clicks"]
            campaign.stat_unsubscribes = stats["unsubscribes"]
            campaign.stat_bounces      = stats["bounces"]
            campaign.save()
            return Response(EmailCampaignSerializer(campaign).data)
        except BrevoError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
