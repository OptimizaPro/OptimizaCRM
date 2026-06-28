"""
Optimiza-CRM – Integrations views
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import imaplib
import json
import smtplib
import email as email_lib
import urllib.request
import urllib.error
from email.header import decode_header as decode_email_header
from email.utils import parseaddr, parsedate_to_datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import IsOrgAdmin, IsReadOnlyOrAbove
from core.middleware import get_current_organization
from .models import Integration, IntegrationLog, Message
from .serializers import IntegrationSerializer, IntegrationLogSerializer, MessageSerializer


# ─── IMAP / SMTP helpers ──────────────────────────────────────────────────────

def _decode_mime_words(s):
    if not s:
        return ""
    parts = decode_email_header(s)
    result = []
    for part, enc in parts:
        if isinstance(part, bytes):
            result.append(part.decode(enc or "utf-8", errors="replace"))
        else:
            result.append(part)
    return "".join(result)


def _extract_body(msg):
    body_text = body_html = ""
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            cd = str(part.get("Content-Disposition", ""))
            if "attachment" in cd:
                continue
            if ct == "text/plain" and not body_text:
                payload = part.get_payload(decode=True)
                if payload:
                    body_text = payload.decode(part.get_content_charset() or "utf-8", errors="replace")
            elif ct == "text/html" and not body_html:
                payload = part.get_payload(decode=True)
                if payload:
                    body_html = payload.decode(part.get_content_charset() or "utf-8", errors="replace")
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            ct = msg.get_content_type()
            charset = msg.get_content_charset() or "utf-8"
            text = payload.decode(charset, errors="replace")
            if ct == "text/html":
                body_html = text
            else:
                body_text = text
    return body_text, body_html


def _fetch_imap_emails(integration, limit=50):
    """Fetch emails via IMAP and save as Message objects. Returns (created, error)."""
    config    = integration.config
    imap_host = config.get("imap_host", "imap.gmail.com")
    imap_port = int(config.get("imap_port", 993))
    username  = config.get("username", "")
    password  = config.get("password", "")

    try:
        mail = imaplib.IMAP4_SSL(imap_host, imap_port)
        mail.login(username, password)
        mail.select("INBOX")

        _, data  = mail.search(None, "ALL")
        all_ids  = data[0].split()
        recent   = all_ids[-limit:] if len(all_ids) > limit else all_ids

        created = 0
        for num in reversed(recent):
            _, msg_data = mail.fetch(num, "(RFC822)")
            if not msg_data or not msg_data[0]:
                continue
            raw = msg_data[0][1]
            msg = email_lib.message_from_bytes(raw)

            message_id = msg.get("Message-ID", f"imap-{num.decode()}").strip()
            subject    = _decode_mime_words(msg.get("Subject", ""))
            from_addr  = _decode_mime_words(msg.get("From", ""))
            to_addr    = _decode_mime_words(msg.get("To", ""))
            date_str   = msg.get("Date", "")
            thread_id  = (msg.get("References", "") or msg.get("In-Reply-To", "") or "").strip()

            try:
                received_at = parsedate_to_datetime(date_str)
                if received_at.tzinfo is None:
                    received_at = timezone.make_aware(received_at)
            except Exception:
                received_at = timezone.now()

            body_text, body_html = _extract_body(msg)

            _, was_created = Message.objects.get_or_create(
                integration=integration,
                external_id=message_id,
                defaults={
                    "organization":  integration.organization,
                    "direction":     "inbound",
                    "from_address":  from_addr,
                    "to_address":    to_addr,
                    "subject":       subject,
                    "body_text":     body_text,
                    "body_html":     body_html,
                    "thread_id":     thread_id,
                    "received_at":   received_at,
                },
            )
            if was_created:
                created += 1

        mail.close()
        mail.logout()
        return created, None

    except imaplib.IMAP4.error as e:
        return 0, str(e)
    except Exception as e:
        return 0, str(e)


def _send_smtp_email(integration, to_address, subject, body_text, in_reply_to=None, references=None):
    """Send email via SMTP. Returns error string or None on success."""
    config    = integration.config
    host      = config.get("host", "smtp.gmail.com")
    port      = int(config.get("port", 587))
    username  = config.get("username", "")
    password  = config.get("password", "")
    from_name = config.get("from_name", "")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{from_name} <{username}>" if from_name else username
    msg["To"]      = to_address
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
    if references:
        msg["References"] = references
    msg.attach(MIMEText(body_text, "plain", "utf-8"))

    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.login(username, password)
            server.sendmail(username, [to_address], msg.as_string())
        return None
    except Exception as e:
        return str(e)


# ─── Brevo helpers ────────────────────────────────────────────────────────────

BREVO_API_BASE = "https://api.brevo.com/v3"


def _brevo_request(api_key, method, path, payload=None):
    """Make a request to Brevo REST API. Returns (response_dict, error_str)."""
    url = f"{BREVO_API_BASE}{path}"
    data = json.dumps(payload).encode("utf-8") if payload else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "api-key":      api_key,
            "Content-Type": "application/json",
            "Accept":       "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read()
            return json.loads(body) if body else {}, None
    except urllib.error.HTTPError as e:
        try:
            err_body = json.loads(e.read())
            msg = err_body.get("message", str(e))
        except Exception:
            msg = str(e)
        return {}, msg
    except Exception as e:
        return {}, str(e)


def _validate_brevo_key(api_key):
    """Validate API key by fetching account info. Returns (account_dict, error_str)."""
    return _brevo_request(api_key, "GET", "/account")


def send_brevo_email(api_key, sender_name, sender_email, to_address, subject, body_text, body_html=None):
    """Send a transactional email via Brevo API. Returns error string or None on success."""
    payload = {
        "sender": {"name": sender_name or "OptimizaCRM", "email": sender_email},
        "to":     [{"email": to_address}],
        "subject": subject,
        "textContent": body_text,
    }
    if body_html:
        payload["htmlContent"] = body_html

    _, error = _brevo_request(api_key, "POST", "/smtp/email", payload)
    return error


# ─── ViewSets ─────────────────────────────────────────────────────────────────

class IntegrationViewSet(viewsets.ModelViewSet):
    serializer_class   = IntegrationSerializer
    permission_classes = [IsReadOnlyOrAbove]

    def get_queryset(self):
        org = get_current_organization()
        if not org:
            return Integration.objects.none()
        return Integration.objects.filter(organization=org)

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "connect", "disconnect"]:
            return [IsOrgAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(organization=get_current_organization())

    @action(detail=True, methods=["post"])
    def connect(self, request, pk=None):
        integration = self.get_object()
        config      = request.data.get("config", {})

        required = {
            "whatsapp":  ["phone_number_id", "access_token", "verify_token"],
            "email":     ["username", "password"],
            "brevo":     ["api_key", "sender_email"],
            "facebook":  ["page_id", "access_token"],
            "instagram": ["account_id", "access_token"],
            "telegram":  ["bot_token"],
            "sms":       ["account_sid", "auth_token", "from_number"],
        }
        missing = [f for f in required.get(integration.channel_type, []) if not config.get(f)]
        if missing:
            return Response(
                {"error": f"Campos requeridos: {', '.join(missing)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate Brevo API key before saving
        if integration.channel_type == "brevo":
            _, err = _validate_brevo_key(config["api_key"])
            if err:
                return Response(
                    {"error": f"API Key de Brevo inválida: {err}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if integration.channel_type == "email":
            config.setdefault("imap_host", "imap.gmail.com")
            config.setdefault("imap_port", "993")
            config.setdefault("host",      "smtp.gmail.com")
            config.setdefault("port",      "587")

        integration.config        = config
        integration.status        = "connected"
        integration.connected_at  = timezone.now()
        integration.error_message = ""
        integration.save()

        IntegrationLog.objects.create(
            integration=integration, direction="outbound",
            message_type="system", content="Integración conectada correctamente", status="success",
        )
        return Response(IntegrationSerializer(integration).data)

    @action(detail=True, methods=["post"])
    def disconnect(self, request, pk=None):
        integration = self.get_object()
        integration.status        = "disconnected"
        integration.connected_at  = None
        integration.config        = {}
        integration.error_message = ""
        integration.save()

        IntegrationLog.objects.create(
            integration=integration, direction="outbound",
            message_type="system", content="Integración desconectada", status="success",
        )
        return Response(IntegrationSerializer(integration).data)

    @action(detail=True, methods=["post"], url_path="test")
    def test_connection(self, request, pk=None):
        integration = self.get_object()
        if integration.status != "connected":
            return Response({"error": "La integración no está conectada."}, status=400)

        if integration.channel_type == "email":
            _, error = _fetch_imap_emails(integration, limit=1)
            if error:
                integration.status        = "error"
                integration.error_message = error
                integration.save()
                return Response({"status": "error", "message": error}, status=400)

        elif integration.channel_type == "brevo":
            _, error = _validate_brevo_key(integration.config.get("api_key", ""))
            if error:
                integration.status        = "error"
                integration.error_message = error
                integration.save()
                return Response({"status": "error", "message": error}, status=400)

        integration.last_sync_at = timezone.now()
        integration.save()

        IntegrationLog.objects.create(
            integration=integration, direction="outbound",
            message_type="system", content="Prueba de conexión exitosa", status="success",
        )
        return Response({"status": "ok", "message": "Prueba de conexión exitosa"})

    @action(detail=True, methods=["get"])
    def logs(self, request, pk=None):
        integration = self.get_object()
        logs = integration.logs.all()[:50]
        return Response(IntegrationLogSerializer(logs, many=True).data)

    @action(detail=True, methods=["post"])
    def fetch(self, request, pk=None):
        integration = self.get_object()
        if integration.status != "connected":
            return Response({"error": "La integración no está conectada."}, status=400)
        if integration.channel_type != "email":
            return Response({"error": "Fetch solo disponible para integraciones de email."}, status=400)

        limit   = int(request.data.get("limit", 50))
        created, error = _fetch_imap_emails(integration, limit=limit)

        if error:
            integration.status        = "error"
            integration.error_message = error
            integration.save()
            return Response({"error": error}, status=400)

        integration.last_sync_at  = timezone.now()
        integration.error_message = ""
        integration.save()

        IntegrationLog.objects.create(
            integration=integration, direction="inbound",
            message_type="system", content=f"Obtenidos {created} mensajes nuevos", status="success",
        )
        return Response({"status": "ok", "new_messages": created})


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class   = MessageSerializer
    permission_classes = [IsReadOnlyOrAbove]
    http_method_names  = ["get", "patch", "post", "delete", "head", "options"]

    def get_queryset(self):
        org = get_current_organization()
        if not org:
            return Message.objects.none()
        qs        = Message.objects.filter(organization=org).select_related("integration")
        channel   = self.request.query_params.get("channel")
        is_read   = self.request.query_params.get("is_read")
        direction = self.request.query_params.get("direction")
        if channel:
            qs = qs.filter(integration__channel_type=channel)
        if is_read is not None:
            qs = qs.filter(is_read=is_read.lower() == "true")
        if direction:
            qs = qs.filter(direction=direction)
        return qs

    @action(detail=True, methods=["patch"], url_path="read")
    def mark_read(self, request, pk=None):
        message = self.get_object()
        message.is_read = True
        message.save(update_fields=["is_read"])
        return Response(MessageSerializer(message).data)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        org = get_current_organization()
        Message.objects.filter(organization=org, is_read=False).update(is_read=True)
        return Response({"status": "ok"})

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request):
        ids = request.data.get("ids", [])
        if not ids:
            return Response({"error": "No se proporcionaron IDs."}, status=400)
        org     = get_current_organization()
        deleted, _ = Message.objects.filter(organization=org, id__in=ids).delete()
        return Response({"deleted": deleted})

    @action(detail=True, methods=["post"])
    def reply(self, request, pk=None):
        message = self.get_object()
        body    = request.data.get("body", "").strip()
        if not body:
            return Response({"error": "El cuerpo de la respuesta es obligatorio."}, status=400)

        integration = message.integration
        if integration.status != "connected":
            return Response({"error": "La integración de email no está conectada."}, status=400)
        if integration.channel_type != "email":
            return Response({"error": "Solo se puede responder por email por ahora."}, status=400)

        _, from_email = parseaddr(message.from_address)
        to_address    = from_email or message.from_address
        subject       = message.subject or ""
        if not subject.lower().startswith("re:"):
            subject = f"Re: {subject}"

        error = _send_smtp_email(
            integration=integration,
            to_address=to_address,
            subject=subject,
            body_text=body,
            in_reply_to=message.external_id,
            references=" ".join(filter(None, [message.thread_id, message.external_id])),
        )
        if error:
            return Response({"error": error}, status=400)

        sent = Message.objects.create(
            organization=integration.organization,
            integration=integration,
            external_id=f"sent-{timezone.now().timestamp()}",
            direction="outbound",
            from_address=integration.config.get("username", ""),
            to_address=to_address,
            subject=subject,
            body_text=body,
            thread_id=message.thread_id or message.external_id,
            received_at=timezone.now(),
            is_read=True,
        )

        IntegrationLog.objects.create(
            integration=integration, direction="outbound",
            contact=to_address, message_type="email",
            content=f"Respuesta enviada: {subject}", status="success",
        )
        return Response(MessageSerializer(sent).data, status=201)


# ─── Public Widget views (no JWT required) ────────────────────────────────────

from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
import json


def _widget_cors_headers(response, request):
    origin = request.headers.get("Origin", "*")
    response["Access-Control-Allow-Origin"] = origin
    response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type"
    return response


@csrf_exempt
def widget_config(request):
    """GET /api/v1/widget/config/?token=<uuid>  — public, no auth"""
    if request.method == "OPTIONS":
        r = JsonResponse({})
        return _widget_cors_headers(r, request)

    token = request.GET.get("token")
    if not token:
        return JsonResponse({"error": "token required"}, status=400)

    try:
        from .models import WebWidget
        widget = WebWidget.objects.select_related("organization").get(
            token=token, is_active=True
        )
    except (WebWidget.DoesNotExist, Exception):
        return JsonResponse({"error": "widget not found"}, status=404)

    cfg = widget.config or {}
    r = JsonResponse({
        "mode":               widget.mode,
        "color":              cfg.get("color", "#EA580C"),
        "title":              cfg.get("title", "¿Podemos ayudarte?"),
        "subtitle":           cfg.get("subtitle", "Escríbenos y te contactamos pronto"),
        "button_text":        cfg.get("button_text", "Enviar mensaje"),
        "success_message":    cfg.get("success_message", "¡Gracias! Nos pondremos en contacto pronto."),
        "whatsapp_number":    cfg.get("whatsapp_number", ""),
        "whatsapp_message":   cfg.get("whatsapp_message", "Hola, me gustaría más información"),
        "org_name":           widget.organization.name,
    })
    return _widget_cors_headers(r, request)


@csrf_exempt
def widget_submit(request):
    """POST /api/v1/widget/submit/  — public, no auth"""
    if request.method == "OPTIONS":
        r = JsonResponse({})
        return _widget_cors_headers(r, request)

    if request.method != "POST":
        r = JsonResponse({"error": "method not allowed"}, status=405)
        return _widget_cors_headers(r, request)

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, Exception):
        r = JsonResponse({"error": "invalid JSON"}, status=400)
        return _widget_cors_headers(r, request)

    token = body.get("token")
    if not token:
        r = JsonResponse({"error": "token required"}, status=400)
        return _widget_cors_headers(r, request)

    try:
        from .models import WebWidget
        widget = WebWidget.objects.select_related("organization").get(
            token=token, is_active=True
        )
    except (WebWidget.DoesNotExist, Exception):
        r = JsonResponse({"error": "widget not found"}, status=404)
        return _widget_cors_headers(r, request)

    name    = body.get("name", "").strip()
    email   = body.get("email", "").strip()
    phone   = body.get("phone", "").strip()
    message = body.get("message", "").strip()

    if not name or not email:
        r = JsonResponse({"error": "name and email are required"}, status=400)
        return _widget_cors_headers(r, request)

    # Create Lead
    from apps.crm.models import Lead
    parts = name.split(" ", 1)
    Lead.objects.create(
        organization = widget.organization,
        first_name   = parts[0],
        last_name    = parts[1] if len(parts) > 1 else "",
        email        = email,
        phone        = phone,
        source       = "website",
        status       = "new",
        notes        = f"[Widget] {message}" if message else "",
    )

    # Increment counter
    WebWidget.objects.filter(pk=widget.pk).update(
        lead_count=widget.lead_count + 1
    )

    r = JsonResponse({"ok": True})
    return _widget_cors_headers(r, request)


@csrf_exempt
def widget_manage(request):
    """
    GET  /api/v1/widget/manage/  — requires JWT (via DRF auth)
    POST /api/v1/widget/manage/  — create/update widget config
    """
    from rest_framework_simplejwt.authentication import JWTAuthentication
    from rest_framework.exceptions import AuthenticationFailed

    try:
        auth = JWTAuthentication()
        user_auth = auth.authenticate(request)
        if not user_auth:
            return JsonResponse({"error": "unauthorized"}, status=401)
        user, _ = user_auth
    except AuthenticationFailed:
        return JsonResponse({"error": "unauthorized"}, status=401)

    org_id = request.headers.get("X-Organization-ID")
    if not org_id:
        return JsonResponse({"error": "organization required"}, status=400)

    from apps.accounts.models import Organization
    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "organization not found"}, status=404)

    from .models import WebWidget

    if request.method == "GET":
        widget = WebWidget.objects.filter(organization=org).first()
        if not widget:
            return JsonResponse({"widget": None})
        return JsonResponse({"widget": {
            "id":         str(widget.id),
            "token":      str(widget.token),
            "mode":       widget.mode,
            "is_active":  widget.is_active,
            "lead_count": widget.lead_count,
            "config":     widget.config,
        }})

    if request.method == "POST":
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "invalid JSON"}, status=400)

        widget, _ = WebWidget.objects.get_or_create(organization=org)
        widget.mode      = body.get("mode", widget.mode)
        widget.is_active = body.get("is_active", widget.is_active)
        widget.config    = body.get("config", widget.config)
        widget.save()
        return JsonResponse({"widget": {
            "id":         str(widget.id),
            "token":      str(widget.token),
            "mode":       widget.mode,
            "is_active":  widget.is_active,
            "lead_count": widget.lead_count,
            "config":     widget.config,
        }})

    return JsonResponse({"error": "method not allowed"}, status=405)
