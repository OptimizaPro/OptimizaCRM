"""
Optimiza-CRM – Voice AI Agent Widget views
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro

BACKEND_PUBLIC_URL must be set via environment variable in production
(e.g. https://api.optimizacrm.com). It defaults to http://localhost:8000.
"""

import json

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from apps.notifications.models import Notification


# ─── CORS helpers ────────────────────────────────────────────────────────────

def _cors(response, request=None):
    """Add permissive CORS headers (Vapi tool calls arrive from Vapi servers)."""
    origin = (request.headers.get("Origin", "*") if request else "*")
    response["Access-Control-Allow-Origin"]  = origin
    response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


# ─── Auth helper ─────────────────────────────────────────────────────────────

def _jwt_user_and_org(request):
    """
    Validate JWT and resolve organization from X-Organization-ID header.
    Returns (user, org) or raises ValueError with a message.
    """
    from rest_framework_simplejwt.authentication import JWTAuthentication
    from rest_framework.exceptions import AuthenticationFailed
    from apps.accounts.models import Organization

    try:
        auth = JWTAuthentication()
        result = auth.authenticate(request)
        if not result:
            raise ValueError("unauthorized")
        user, _ = result
    except (AuthenticationFailed, Exception) as exc:
        raise ValueError("unauthorized") from exc

    org_id = request.headers.get("X-Organization-ID")
    if not org_id:
        raise ValueError("organization required")

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        raise ValueError("organization not found")

    return user, org


# ─── Notification helper ─────────────────────────────────────────────────────

def _notify_admins(org, title, message, notification_type="lead", link=""):
    """Create a Notification for every admin/owner in the organization."""
    from apps.accounts.models import OrganizationMember  # noqa: F401 — may not exist
    # Fallback: notify all staff users in the org via OrganizationMember if available,
    # otherwise find users linked to the org through a membership model.
    try:
        from apps.accounts.models import OrganizationMember
        members = OrganizationMember.objects.filter(
            organization=org, role__in=["owner", "admin"]
        ).select_related("user")
        users = [m.user for m in members]
    except Exception:
        # If OrganizationMember doesn't exist yet, skip silently
        users = []

    for user in users:
        Notification.objects.create(
            organization=org,
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            link=link,
        )


# ─── Widget lookup by token ───────────────────────────────────────────────────

def _get_voice_widget(token):
    from .models import VoiceWidget
    return VoiceWidget.objects.select_related("organization", "knowledge_base").get(
        token=token, is_active=True
    )


# ─── 1. Public config endpoint ────────────────────────────────────────────────

@csrf_exempt
def voice_widget_config(request):
    """
    GET /api/v1/voice-widget/config/?token=<uuid>
    Public — no authentication required.
    Returns assistant_id, vapi_public_key, and widget config for the frontend SDK.
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    token = request.GET.get("token")
    if not token:
        return _cors(JsonResponse({"error": "token required"}, status=400), request)

    try:
        widget = _get_voice_widget(token)
    except Exception:
        return _cors(JsonResponse({"error": "widget not found"}, status=404), request)

    org_settings    = widget.organization.settings or {}
    vapi_public_key = org_settings.get("vapi_public_key", "")
    cfg             = widget.config or {}

    r = JsonResponse({
        "assistant_id":    widget.vapi_assistant_id,
        "vapi_public_key": vapi_public_key,
        "config": {
            "agent_name": cfg.get("agent_name", "Asistente"),
            "color":      cfg.get("color", "#EA580C"),
            "greeting":   cfg.get("greeting", ""),
            "farewell":   cfg.get("farewell", ""),
            "voice":      cfg.get("voice", "es-MX-NuriaNeural"),
        },
        "org_name": widget.organization.name,
    })
    return _cors(r, request)


# ─── 2. Authenticated manage endpoint ────────────────────────────────────────

@csrf_exempt
def voice_widget_manage(request):
    """
    GET  /api/v1/voice-widget/manage/  — returns widget + knowledge base
    POST /api/v1/voice-widget/manage/  — create/update widget + KB + push to Vapi
    Requires JWT and X-Organization-ID header.
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    # Authenticate
    try:
        _user, org = _jwt_user_and_org(request)
    except ValueError as exc:
        msg = str(exc)
        status_code = 401 if msg == "unauthorized" else 400
        return JsonResponse({"error": msg}, status=status_code)

    from .models import VoiceWidget, VoiceKnowledgeBase

    # ── GET ───────────────────────────────────────────────────────────────────
    if request.method == "GET":
        widget = VoiceWidget.objects.filter(organization=org).select_related("knowledge_base").first()
        if not widget:
            return JsonResponse({"widget": None, "knowledge_base": None})

        kb = widget.knowledge_base
        return JsonResponse({
            "widget": {
                "id":               str(widget.id),
                "token":            str(widget.token),
                "vapi_assistant_id": widget.vapi_assistant_id,
                "llm_model":        widget.llm_model,
                "is_active":        widget.is_active,
                "lead_count":       widget.lead_count,
                "call_count":       widget.call_count,
                "config":           widget.config,
            },
            "knowledge_base": {
                "id":                     str(kb.id),
                "company_info":           kb.company_info,
                "products_services":      kb.products_services,
                "pricing":                kb.pricing,
                "faqs":                   kb.faqs,
                "working_hours":          kb.working_hours,
                "contact_info":           kb.contact_info,
                "appointment_rules":      kb.appointment_rules,
                "qualification_questions": kb.qualification_questions,
                "whatsapp_number":        kb.whatsapp_number,
            } if kb else None,
        })

    # ── POST ──────────────────────────────────────────────────────────────────
    if request.method == "POST":
        try:
            body = json.loads(request.body)
        except (json.JSONDecodeError, Exception):
            return JsonResponse({"error": "invalid JSON"}, status=400)

        # Get or create widget
        widget, _ = VoiceWidget.objects.get_or_create(organization=org)

        # Update widget fields
        widget_data = body.get("widget", {})
        if "llm_model" in widget_data:
            widget.llm_model = widget_data["llm_model"]
        if "is_active" in widget_data:
            widget.is_active = widget_data["is_active"]
        if "config" in widget_data:
            widget.config = widget_data["config"]

        # Update or create knowledge base
        kb_data = body.get("knowledge_base")
        if kb_data is not None:
            if widget.knowledge_base:
                kb = widget.knowledge_base
            else:
                kb = VoiceKnowledgeBase.objects.create(organization=org)
                widget.knowledge_base = kb

            kb_fields = [
                "company_info", "products_services", "pricing", "faqs",
                "working_hours", "contact_info", "appointment_rules",
                "qualification_questions", "whatsapp_number",
            ]
            for field in kb_fields:
                if field in kb_data:
                    setattr(kb, field, kb_data[field])
            kb.save()
        else:
            kb = widget.knowledge_base

        # Push to Vapi if keys are available
        org_settings     = org.settings or {}
        vapi_private_key = org_settings.get("vapi_private_key", "")
        vapi_error       = None

        if vapi_private_key:
            try:
                from .vapi_service import create_or_update_assistant
                assistant_id = create_or_update_assistant(widget, kb, vapi_private_key)
                widget.vapi_assistant_id = assistant_id
            except Exception as exc:
                vapi_error = str(exc)

        widget.save()

        response_data = {
            "widget": {
                "id":                str(widget.id),
                "token":             str(widget.token),
                "vapi_assistant_id": widget.vapi_assistant_id,
                "llm_model":         widget.llm_model,
                "is_active":         widget.is_active,
                "lead_count":        widget.lead_count,
                "call_count":        widget.call_count,
                "config":            widget.config,
            },
            "knowledge_base": {
                "id":                     str(kb.id),
                "company_info":           kb.company_info,
                "products_services":      kb.products_services,
                "pricing":                kb.pricing,
                "faqs":                   kb.faqs,
                "working_hours":          kb.working_hours,
                "contact_info":           kb.contact_info,
                "appointment_rules":      kb.appointment_rules,
                "qualification_questions": kb.qualification_questions,
                "whatsapp_number":        kb.whatsapp_number,
            } if kb else None,
        }
        if vapi_error:
            response_data["vapi_warning"] = f"Widget guardado, pero error al sincronizar con Vapi: {vapi_error}"

        return JsonResponse(response_data, status=200)

    return JsonResponse({"error": "method not allowed"}, status=405)


# ─── Tool helper: get widget by token from query param ───────────────────────

def _tool_widget(request):
    token = request.GET.get("token")
    if not token:
        raise ValueError("token required")
    return _get_voice_widget(token)


def _tool_parse_body(request):
    try:
        return json.loads(request.body) if request.body else {}
    except (json.JSONDecodeError, Exception):
        return {}


# ─── 3. Tool: book-appointment ────────────────────────────────────────────────

@csrf_exempt
def voice_tool_book_appointment(request):
    """
    POST /api/v1/voice-widget/tool/book-appointment/?token=<uuid>
    Vapi tool webhook — public, no auth.
    Creates a CalendarEvent (pending_confirmation) + Lead + Notification.
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    if request.method != "POST":
        return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)

    try:
        widget = _tool_widget(request)
    except Exception:
        return _cors(JsonResponse({"result": "Error: widget no encontrado."}, status=404), request)

    body = _tool_parse_body(request)

    # Vapi wraps tool call args under "message.toolCallList[0].function.arguments"
    # or may send them directly depending on server-side tool config.
    # Support both flat payload and Vapi's nested message format.
    args = body
    if "message" in body:
        try:
            tool_calls = body["message"].get("toolCallList", [])
            if tool_calls:
                args = tool_calls[0]["function"].get("arguments", {})
                if isinstance(args, str):
                    args = json.loads(args)
        except Exception:
            args = body

    caller_name    = args.get("caller_name", "Cliente")
    caller_email   = args.get("caller_email", "")
    caller_phone   = args.get("caller_phone", "")
    preferred_date = args.get("preferred_date", "")
    preferred_time = args.get("preferred_time", "")
    service_type   = args.get("service_type", "Consulta")
    notes          = args.get("notes", "")

    org = widget.organization

    # Get first org admin user as the calendar event owner
    admin_user = _get_first_admin(org)

    if admin_user:
        from apps.crm.models import CalendarEvent, Lead

        # Placeholder start/end times — admin will confirm exact datetime
        now        = timezone.now()
        start_time = now + timezone.timedelta(days=1)
        end_time   = start_time + timezone.timedelta(hours=1)

        description_parts = []
        if preferred_date:
            description_parts.append(f"Fecha preferida: {preferred_date} {preferred_time}".strip())
        if notes:
            description_parts.append(f"Notas: {notes}")

        event = CalendarEvent.objects.create(
            organization = org,
            user         = admin_user,
            title        = f"[Voz] Cita con {caller_name} – {service_type}",
            description  = "\n".join(description_parts),
            event_type   = "meeting",
            start_time   = start_time,
            end_time     = end_time,
            status       = "pending_confirmation",
        )

        # Create or update Lead
        _upsert_lead(
            org=org,
            first_name=caller_name.split(" ", 1)[0],
            last_name=caller_name.split(" ", 1)[1] if " " in caller_name else "",
            email=caller_email,
            phone=caller_phone,
            notes=f"[Voz] Solicitó cita: {service_type}. Fecha preferida: {preferred_date} {preferred_time}".strip(),
        )

        # Increment counters
        from .models import VoiceWidget
        VoiceWidget.objects.filter(pk=widget.pk).update(lead_count=widget.lead_count + 1)

        # Notify admins
        _notify_admins(
            org=org,
            title="Nueva cita desde Agente de Voz",
            message=f"{caller_name} solicitó una cita: {service_type}. Fecha preferida: {preferred_date} {preferred_time}".strip(),
            notification_type="lead",
            link=f"/dashboard/calendar/",
        )

    r = JsonResponse({"result": "Cita registrada. El equipo confirmará a la brevedad."})
    return _cors(r, request)


# ─── 4. Tool: escalate ───────────────────────────────────────────────────────

@csrf_exempt
def voice_tool_escalate(request):
    """
    POST /api/v1/voice-widget/tool/escalate/?token=<uuid>
    Vapi tool webhook — public, no auth.
    Notifies org admins and returns WhatsApp escalation message.
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    if request.method != "POST":
        return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)

    try:
        widget = _tool_widget(request)
    except Exception:
        return _cors(JsonResponse({"result": "Error: widget no encontrado."}, status=404), request)

    body = _tool_parse_body(request)

    args = body
    if "message" in body:
        try:
            tool_calls = body["message"].get("toolCallList", [])
            if tool_calls:
                args = tool_calls[0]["function"].get("arguments", {})
                if isinstance(args, str):
                    args = json.loads(args)
        except Exception:
            args = body

    caller_name  = args.get("caller_name", "Cliente")
    caller_phone = args.get("caller_phone", "")
    reason       = args.get("reason", "Sin especificar")
    summary      = args.get("summary", "")

    org = widget.organization

    # Mark call as escalated (best-effort via VoiceCall if call_id known)
    vapi_call_id = body.get("message", {}).get("call", {}).get("id", "") if "message" in body else ""
    if vapi_call_id:
        try:
            from .models import VoiceCall
            VoiceCall.objects.filter(vapi_call_id=vapi_call_id, widget=widget).update(escalated_to_human=True)
        except Exception:
            pass

    # Notify admins
    _notify_admins(
        org=org,
        title="Escalado a humano desde Agente de Voz",
        message=f"{caller_name} ({caller_phone}) solicitó hablar con un agente. Motivo: {reason}. {summary}".strip(),
        notification_type="warning",
        link="/dashboard/",
    )

    # Build WhatsApp link for the response message
    kb = widget.knowledge_base
    whatsapp_number = (kb.whatsapp_number if kb else "") or ""
    if whatsapp_number:
        wa_msg = f"Hola, soy {caller_name}. Me comunicó el asistente de voz. {reason}"
        result_msg = (
            f"Te estoy conectando con un agente humano ahora mismo. "
            f"Puedes continuar en WhatsApp: https://wa.me/{whatsapp_number}?text={wa_msg}"
        )
    else:
        result_msg = "Te estoy conectando con un agente humano ahora mismo."

    r = JsonResponse({"result": result_msg})
    return _cors(r, request)


# ─── 5. Tool: qualify ────────────────────────────────────────────────────────

@csrf_exempt
def voice_tool_qualify(request):
    """
    POST /api/v1/voice-widget/tool/qualify/?token=<uuid>
    Vapi tool webhook — public, no auth.
    Creates/updates a Lead with status=qualified and qualification_data.
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    if request.method != "POST":
        return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)

    try:
        widget = _tool_widget(request)
    except Exception:
        return _cors(JsonResponse({"result": "Error: widget no encontrado."}, status=404), request)

    body = _tool_parse_body(request)

    args = body
    if "message" in body:
        try:
            tool_calls = body["message"].get("toolCallList", [])
            if tool_calls:
                args = tool_calls[0]["function"].get("arguments", {})
                if isinstance(args, str):
                    args = json.loads(args)
        except Exception:
            args = body

    caller_name   = args.get("caller_name", "")
    caller_email  = args.get("caller_email", "")
    caller_phone  = args.get("caller_phone", "")
    answers       = args.get("answers", {})
    is_qualified  = args.get("is_qualified", True)
    notes         = args.get("notes", "")

    org = widget.organization

    name_parts = caller_name.split(" ", 1) if caller_name else ["", ""]
    lead = _upsert_lead(
        org        = org,
        first_name = name_parts[0],
        last_name  = name_parts[1] if len(name_parts) > 1 else "",
        email      = caller_email,
        phone      = caller_phone,
        status     = "qualified" if is_qualified else "new",
        score      = 80 if is_qualified else 20,
        notes      = f"[Voz] {notes}" if notes else "[Voz] Calificado por agente de voz",
        qualification_data = answers,
    )

    # Increment lead counter
    from .models import VoiceWidget
    VoiceWidget.objects.filter(pk=widget.pk).update(lead_count=widget.lead_count + 1)

    # Update VoiceCall qualification_data if call_id known
    vapi_call_id = body.get("message", {}).get("call", {}).get("id", "") if "message" in body else ""
    if vapi_call_id and lead:
        try:
            from .models import VoiceCall
            VoiceCall.objects.filter(vapi_call_id=vapi_call_id, widget=widget).update(
                lead=lead,
                qualification_data=answers,
            )
        except Exception:
            pass

    _notify_admins(
        org=org,
        title="Lead calificado desde Agente de Voz",
        message=f"{caller_name or 'Cliente'} fue calificado por el agente de voz. Calificado: {'Sí' if is_qualified else 'No'}.",
        notification_type="lead",
        link="/dashboard/leads/",
    )

    r = JsonResponse({"result": "Datos registrados correctamente."})
    return _cors(r, request)


# ─── 6. Call-ended webhook ────────────────────────────────────────────────────

@csrf_exempt
def voice_call_ended(request):
    """
    POST /api/v1/voice-widget/call-ended/
    Vapi end-of-call webhook — public, no auth.
    Updates VoiceCall record with status, transcript, summary, duration.
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    if request.method != "POST":
        return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)

    body = _tool_parse_body(request)

    # Vapi end-of-call-report shape:
    # { "message": { "type": "end-of-call-report", "call": { "id": "...", ... },
    #                "transcript": "...", "summary": "...",
    #                "durationSeconds": 120, "endedReason": "..." } }
    message         = body.get("message", body)
    call_data       = message.get("call", {})
    vapi_call_id    = call_data.get("id", "")
    transcript      = message.get("transcript", "")
    summary         = message.get("summary", "")
    duration_secs   = int(message.get("durationSeconds", 0))
    ended_reason    = message.get("endedReason", "")

    # Determine status from endedReason
    if ended_reason in ("assistant-ended-call", "customer-ended-call", "silence-timed-out"):
        call_status = "completed"
    elif ended_reason in ("error", "assistant-error", "pipeline-error"):
        call_status = "failed"
    else:
        call_status = "completed"

    if vapi_call_id:
        try:
            from .models import VoiceCall
            updated = VoiceCall.objects.filter(vapi_call_id=vapi_call_id).update(
                status           = call_status,
                transcript       = transcript,
                summary          = summary,
                duration_seconds = duration_secs,
                ended_at         = timezone.now(),
            )
            # Increment widget call_count
            if updated:
                call_obj = VoiceCall.objects.filter(vapi_call_id=vapi_call_id).select_related("widget").first()
                if call_obj:
                    from .models import VoiceWidget
                    VoiceWidget.objects.filter(pk=call_obj.widget_id).update(
                        call_count=call_obj.widget.call_count + 1
                    )
        except Exception:
            pass

    r = JsonResponse({"ok": True})
    return _cors(r, request)


# ─── 7. Scrape URL → KB classifier ───────────────────────────────────────────

@csrf_exempt
def voice_scrape_url(request):
    """
    POST /api/v1/voice-widget/scrape-url/
    Authenticated — requires JWT + X-Organization-ID.
    Body: { "url": "https://..." }
    Returns: { "knowledge_base": { ...KB fields... }, "char_count": N }
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    if request.method != "POST":
        return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)

    try:
        _user, org = _jwt_user_and_org(request)
    except ValueError as exc:
        msg = str(exc)
        return JsonResponse({"error": msg}, status=401 if msg == "unauthorized" else 400)

    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "invalid JSON"}, status=400)

    url = (body.get("url") or "").strip()
    if not url:
        return JsonResponse({"error": "url is required"}, status=400)

    try:
        from .scraper_service import scrape_and_classify
        kb_data = scrape_and_classify(url, org)
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=422)
    except Exception as exc:
        return JsonResponse({"error": f"Error al procesar la URL: {exc}"}, status=500)

    total_chars = sum(len(v) for v in kb_data.values())
    return JsonResponse({"knowledge_base": kb_data, "char_count": total_chars, "source_url": url})


# ─── Private helpers ──────────────────────────────────────────────────────────

def _get_first_admin(org):
    """Return the first admin/owner user for the organization, or None."""
    try:
        from apps.accounts.models import OrganizationMember
        member = OrganizationMember.objects.filter(
            organization=org, role__in=["owner", "admin"]
        ).select_related("user").first()
        return member.user if member else None
    except Exception:
        return None


def _upsert_lead(org, first_name, email="", phone="", last_name="",
                 status="new", score=0, notes="", qualification_data=None):
    """
    Create or update a Lead. Matches by email (if provided) or phone.
    Returns the Lead instance or None.
    """
    from apps.crm.models import Lead

    try:
        if email:
            lead, created = Lead.objects.get_or_create(
                organization = org,
                email        = email,
                defaults={
                    "first_name": first_name,
                    "last_name":  last_name,
                    "phone":      phone,
                    "source":     "voice_agent",
                    "status":     status,
                    "score":      score,
                    "notes":      notes,
                },
            )
            if not created:
                # Update existing lead
                if phone and not lead.phone:
                    lead.phone = phone
                if notes:
                    lead.notes = (lead.notes + "\n" + notes).strip() if lead.notes else notes
                if score > lead.score:
                    lead.score = score
                lead.status = status
                update_fields = ["phone", "notes", "score", "status"]
                if qualification_data:
                    lead.custom_fields = {**lead.custom_fields, "qualification": qualification_data}
                    update_fields.append("custom_fields")
                lead.save(update_fields=update_fields)
        elif phone:
            lead, created = Lead.objects.get_or_create(
                organization = org,
                phone        = phone,
                defaults={
                    "first_name": first_name,
                    "last_name":  last_name,
                    "source":     "voice_agent",
                    "status":     status,
                    "score":      score,
                    "notes":      notes,
                },
            )
            if not created and notes:
                lead.notes = (lead.notes + "\n" + notes).strip() if lead.notes else notes
                lead.status = status
                lead.save(update_fields=["notes", "status"])
        else:
            # No unique identifier — create new lead
            lead = Lead.objects.create(
                organization = org,
                first_name   = first_name,
                last_name    = last_name,
                source       = "voice_agent",
                status       = status,
                score        = score,
                notes        = notes,
            )

        if qualification_data:
            lead.custom_fields = {**lead.custom_fields, "qualification": qualification_data}
            lead.save(update_fields=["custom_fields"])

        return lead
    except Exception:
        return None
