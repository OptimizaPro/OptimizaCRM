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
            "avatar_url": cfg.get("avatar_url", ""),
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
        agent_id = request.GET.get("agent_id")
        if agent_id:
            widget = VoiceWidget.objects.filter(organization=org, id=agent_id).select_related("knowledge_base").first()
        else:
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
                "system_prompt":    widget.system_prompt,
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

        # ── Save Vapi keys to org.settings ───────────────────────────────────
        vapi_private_key_in = (body.get("vapi_private_key") or "").strip()
        vapi_public_key_in  = (body.get("vapi_public_key")  or "").strip()
        if vapi_private_key_in or vapi_public_key_in:
            org_settings = org.settings or {}
            if vapi_private_key_in:
                org_settings["vapi_private_key"] = vapi_private_key_in
            if vapi_public_key_in:
                org_settings["vapi_public_key"] = vapi_public_key_in
            org.settings = org_settings
            org.save(update_fields=["settings"])

        # Get or create widget — support multi-agent via agent_id
        agent_id = (body.get("agent_id") or "").strip()
        if agent_id:
            widget = VoiceWidget.objects.filter(organization=org, id=agent_id).first()
            if not widget:
                return JsonResponse({"error": "Agent not found"}, status=404)
        else:
            widget, _ = VoiceWidget.objects.get_or_create(organization=org)

        # Update widget fields — support both nested {"widget":{...}} and flat body
        widget_data = body.get("widget") or {
            k: body[k] for k in ("llm_model", "is_active", "config", "system_prompt") if k in body
        }
        if "llm_model" in widget_data:
            widget.llm_model = widget_data["llm_model"]
        if "is_active" in widget_data:
            widget.is_active = widget_data["is_active"]
        if "config" in widget_data:
            widget.config = widget_data["config"]
        if "system_prompt" in widget_data:
            widget.system_prompt = widget_data["system_prompt"]

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

        # Push to Vapi — use freshly saved org.settings
        org.refresh_from_db(fields=["settings"])
        org_settings     = org.settings or {}
        vapi_private_key = org_settings.get("vapi_private_key", "")
        vapi_error       = None

        if vapi_private_key:
            # If a new private key was submitted, clear the stale assistant ID so a
            # fresh assistant is created under the new Vapi account (avoids cross-account 403).
            if vapi_private_key_in and widget.vapi_assistant_id:
                widget.vapi_assistant_id = ""

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
                "system_prompt":     widget.system_prompt,
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
    duration_secs   = int(message.get("durationSeconds", 0))
    ended_reason    = message.get("endedReason", "")

    # Vapi analysis block — available when analysisPlan is configured
    analysis         = message.get("analysis", {})
    vapi_summary     = analysis.get("summary") or message.get("summary", "")
    vapi_structured  = analysis.get("structuredData") or {}
    vapi_success     = analysis.get("successEvaluation")  # "true"/"false" string

    # Determine status from endedReason
    if ended_reason in ("assistant-ended-call", "customer-ended-call", "silence-timed-out"):
        call_status = "completed"
    elif ended_reason in ("error", "assistant-error", "pipeline-error"):
        call_status = "failed"
    else:
        call_status = "completed"

    call_obj = None
    if vapi_call_id:
        try:
            from .models import VoiceCall
            update_fields = dict(
                status           = call_status,
                transcript       = transcript,
                summary          = vapi_summary,
                duration_seconds = duration_secs,
                ended_at         = timezone.now(),
            )
            # Store Vapi structured data immediately if available
            if vapi_structured:
                update_fields["structured_output"] = vapi_structured
                # Derive sentiment from qualification_score if present
                score = vapi_structured.get("qualification_score")
                if score is not None:
                    try:
                        s = int(score)
                        if s >= 7:
                            update_fields["sentiment"] = "positive"
                        elif s >= 4:
                            update_fields["sentiment"] = "neutral"
                        else:
                            update_fields["sentiment"] = "negative"
                    except (ValueError, TypeError):
                        pass

            updated = VoiceCall.objects.filter(vapi_call_id=vapi_call_id).update(**update_fields)

            if updated:
                call_obj = VoiceCall.objects.filter(vapi_call_id=vapi_call_id).select_related("widget").first()
                if call_obj:
                    from .models import VoiceWidget
                    VoiceWidget.objects.filter(pk=call_obj.widget_id).update(
                        call_count=call_obj.widget.call_count + 1
                    )
        except Exception:
            pass

    # ── Post-call LLM enrichment (Celery) ────────────────────────────────────
    # Always enrich: if Vapi already extracted structured data the task will
    # still run to fill gaps and potentially create/update the linked lead.
    if call_obj and transcript and call_status == "completed":
        try:
            from .tasks import enrich_voice_call  # noqa: PLC0415
            enrich_voice_call.delay(call_obj.pk)
        except Exception:
            pass

    r = JsonResponse({"ok": True})
    return _cors(r, request)


# ─── KB Source limits per plan ───────────────────────────────────────────────

KB_SOURCE_LIMITS: dict[str, int] = {
    "basico":     3,
    "pro":        6,
    "equipo":     9,
    "enterprise": 50,   # a medida — ajustar por org según contrato
}
KB_SOURCE_LIMIT_DEFAULT = 3   # para orgs sin suscripción activa


def _get_kb_source_limit(org) -> int:
    """Returns the max KB sources for the org's plan."""
    try:
        plan = org.subscription.plan
    except Exception:
        plan = "basico"
    return KB_SOURCE_LIMITS.get(plan, KB_SOURCE_LIMIT_DEFAULT)


# ─── Helper: save KB source record ───────────────────────────────────────────

def _save_kb_source(org, agent_id, source_type, name, char_count):
    """
    Looks up the VoiceWidget (by agent_id or first widget of org),
    ensures its KB exists, checks plan limits, then creates a VoiceKBSource.

    Returns:
      { "source": {...} }                    on success
      { "limit_error": True, "limit": N, "current": N, "plan": str }  on plan limit
      None                                   if widget/KB not found or unexpected error
    """
    try:
        from .models import VoiceWidget, VoiceKnowledgeBase, VoiceKBSource
        if agent_id:
            widget = VoiceWidget.objects.filter(organization=org, id=agent_id).select_related("knowledge_base").first()
        else:
            widget = VoiceWidget.objects.filter(organization=org).select_related("knowledge_base").first()

        if not widget:
            return None

        # Ensure KB exists
        if not widget.knowledge_base:
            kb = VoiceKnowledgeBase.objects.create(organization=org)
            widget.knowledge_base = kb
            widget.save(update_fields=["knowledge_base"])
        else:
            kb = widget.knowledge_base

        # ── Plan limit check ──────────────────────────────────────────────────
        limit = _get_kb_source_limit(org)
        current_count = VoiceKBSource.objects.filter(knowledge_base=kb).count()
        if current_count >= limit:
            try:
                plan = org.subscription.plan
            except Exception:
                plan = "basico"
            return {
                "limit_error": True,
                "limit":       limit,
                "current":     current_count,
                "plan":        plan,
            }

        source = VoiceKBSource.objects.create(
            organization=org,
            knowledge_base=kb,
            source_type=source_type,
            name=name,
            char_count=char_count,
        )
        return {
            "source": {
                "id":          source.id,
                "source_type": source.source_type,
                "name":        source.name,
                "char_count":  source.char_count,
                "created_at":  source.created_at.isoformat(),
            }
        }
    except Exception:
        return None


# ─── 7. Scrape URL → KB classifier ───────────────────────────────────────────

@csrf_exempt
def voice_scrape_url(request):
    """
    POST /api/v1/voice-widget/scrape-url/
    Authenticated — requires JWT + X-Organization-ID.
    Body: { "url": "https://...", "agent_id": "<optional>" }
    Returns: { "knowledge_base": { ...KB fields... }, "char_count": N, "source": {...} }
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

    url      = (body.get("url")      or "").strip()
    agent_id = (body.get("agent_id") or "").strip()
    if not url:
        return JsonResponse({"error": "url is required"}, status=400)

    try:
        from .scraper_service import scrape_and_classify
        kb_data = scrape_and_classify(url, org)
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=422)
    except Exception as exc:
        return JsonResponse({"error": f"Error al procesar la URL: {exc}"}, status=500)

    total_chars = sum(len(v) for v in kb_data.values() if isinstance(v, str))
    result = _save_kb_source(org, agent_id or None, "url", url, total_chars)

    if result and result.get("limit_error"):
        return JsonResponse({
            "error":       f"Has alcanzado el límite de {result['limit']} fuentes para el plan {result['plan']}. Actualiza tu plan para añadir más.",
            "limit_error": True,
            "limit":       result["limit"],
            "current":     result["current"],
            "plan":        result["plan"],
        }, status=402)

    return JsonResponse({
        "knowledge_base": kb_data,
        "char_count":     total_chars,
        "source_url":     url,
        "source":         result.get("source") if result else None,
    })


# ─── 8. Reset assistant ID ───────────────────────────────────────────────────

@csrf_exempt
def voice_reset_assistant(request):
    """
    POST /api/v1/voice-widget/reset-assistant/
    Authenticated — clears vapi_assistant_id so the next save creates a fresh one.
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

    from .models import VoiceWidget
    body = _tool_parse_body(request)
    agent_id = (body.get("agent_id") or "").strip()
    if agent_id:
        updated = VoiceWidget.objects.filter(organization=org, id=agent_id).update(vapi_assistant_id="")
    else:
        updated = VoiceWidget.objects.filter(organization=org).update(vapi_assistant_id="")
    return JsonResponse({"ok": True, "cleared": updated > 0})


# ─── 9. Upload avatar ────────────────────────────────────────────────────────

@csrf_exempt
def voice_upload_avatar(request):
    """
    POST /api/v1/voice-widget/upload-avatar/
    Authenticated — requires JWT + X-Organization-ID.
    Body: multipart/form-data with field "avatar" (jpg/png/webp/gif, max 2 MB).
    Saves the file to media/voice-avatars/<org_id>/ and stores the URL in widget.config.
    Returns: { "avatar_url": "https://..." }
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

    uploaded = request.FILES.get("avatar")
    if not uploaded:
        return JsonResponse({"error": "No se recibió ningún archivo (campo 'avatar')"}, status=400)

    MAX_BYTES = 2 * 1024 * 1024  # 2 MB
    if uploaded.size > MAX_BYTES:
        return JsonResponse({"error": "La imagen supera el límite de 2 MB."}, status=413)

    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    content_type = uploaded.content_type or ""
    if content_type not in ALLOWED_TYPES:
        return JsonResponse({"error": "Formato no permitido. Usa JPG, PNG, WebP o GIF."}, status=415)

    import os
    import uuid
    from django.conf import settings
    from django.core.files.base import ContentFile
    from django.core.files.storage import default_storage

    ext = os.path.splitext(uploaded.name)[1].lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    rel_path = f"voice-avatars/{org.id}/{filename}"

    saved_path = default_storage.save(rel_path, ContentFile(uploaded.read()))
    avatar_url = default_storage.url(saved_path)

    # Persist in widget config
    from .models import VoiceWidget
    agent_id = request.POST.get("agent_id", "").strip()
    if agent_id:
        widget = VoiceWidget.objects.filter(organization=org, id=agent_id).first()
        if not widget:
            return JsonResponse({"error": "Agent not found"}, status=404)
    else:
        widget, _ = VoiceWidget.objects.get_or_create(organization=org)
    cfg = widget.config or {}
    cfg["avatar_url"] = avatar_url
    widget.config = cfg
    widget.save(update_fields=["config"])

    return JsonResponse({"avatar_url": avatar_url})


# ─── 9. Import file → KB classifier ─────────────────────────────────────────

@csrf_exempt
def voice_import_file(request):
    """
    POST /api/v1/voice-widget/import-file/
    Authenticated — requires JWT + X-Organization-ID.
    Body: multipart/form-data with field "file" (PDF, .md, or .txt).
    Returns: { "knowledge_base": { ...KB fields... }, "filename": "..." }
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

    uploaded = request.FILES.get("file")
    if not uploaded:
        return JsonResponse({"error": "No se recibió ningún archivo (campo 'file')"}, status=400)

    # 10 MB cap
    MAX_BYTES = 10 * 1024 * 1024
    if uploaded.size > MAX_BYTES:
        return JsonResponse({"error": "El archivo supera el límite de 10 MB."}, status=413)

    agent_id = (request.POST.get("agent_id") or "").strip()

    try:
        file_bytes = uploaded.read()
        from .scraper_service import scrape_and_classify_file
        kb_data = scrape_and_classify_file(file_bytes, uploaded.name, org)
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=422)
    except Exception as exc:
        return JsonResponse({"error": f"Error al procesar el archivo: {exc}"}, status=500)

    total_chars = sum(len(v) for v in kb_data.values() if isinstance(v, str))
    result = _save_kb_source(org, agent_id or None, "file", uploaded.name, total_chars)

    if result and result.get("limit_error"):
        return JsonResponse({
            "error":       f"Has alcanzado el límite de {result['limit']} fuentes para el plan {result['plan']}. Actualiza tu plan para añadir más.",
            "limit_error": True,
            "limit":       result["limit"],
            "current":     result["current"],
            "plan":        result["plan"],
        }, status=402)

    return JsonResponse({
        "knowledge_base": kb_data,
        "char_count":     total_chars,
        "filename":       uploaded.name,
        "source":         result.get("source") if result else None,
    })


# ─── KB Sources — list & delete ──────────────────────────────────────────────

@csrf_exempt
def voice_kb_sources(request):
    """
    GET  /api/v1/voice-widget/kb-sources/?agent_id=<id>  — list sources for an agent's KB
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    if request.method != "GET":
        return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)

    try:
        _user, org = _jwt_user_and_org(request)
    except ValueError as exc:
        msg = str(exc)
        return JsonResponse({"error": msg}, status=401 if msg == "unauthorized" else 400)

    from .models import VoiceWidget, VoiceKBSource
    agent_id = (request.GET.get("agent_id") or "").strip()

    if agent_id:
        widget = VoiceWidget.objects.filter(organization=org, id=agent_id).select_related("knowledge_base").first()
    else:
        widget = VoiceWidget.objects.filter(organization=org).select_related("knowledge_base").first()

    limit = _get_kb_source_limit(org)

    if not widget or not widget.knowledge_base:
        return JsonResponse({"sources": [], "limit": limit, "count": 0})

    sources = VoiceKBSource.objects.filter(knowledge_base=widget.knowledge_base)
    source_list = [
        {
            "id":          s.id,
            "source_type": s.source_type,
            "name":        s.name,
            "char_count":  s.char_count,
            "created_at":  s.created_at.isoformat(),
        }
        for s in sources
    ]
    return JsonResponse({
        "sources": source_list,
        "limit":   limit,
        "count":   len(source_list),
    })


@csrf_exempt
def voice_kb_source_delete(request, source_id):
    """
    DELETE /api/v1/voice-widget/kb-sources/<source_id>/  — delete a source record
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    if request.method != "DELETE":
        return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)

    try:
        _user, org = _jwt_user_and_org(request)
    except ValueError as exc:
        msg = str(exc)
        return JsonResponse({"error": msg}, status=401 if msg == "unauthorized" else 400)

    from .models import VoiceKBSource
    try:
        source = VoiceKBSource.objects.get(id=source_id, organization=org)
        source.delete()
        return JsonResponse({"ok": True})
    except VoiceKBSource.DoesNotExist:
        return JsonResponse({"error": "not found"}, status=404)


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


# ─── Multi-agent CRUD ─────────────────────────────────────────────────────────

def _widget_summary(widget) -> dict:
    """Compact representation used in the agents list."""
    cfg = widget.config or {}
    return {
        "id":                str(widget.id),
        "name":              widget.name,
        "token":             str(widget.token),
        "vapi_assistant_id": widget.vapi_assistant_id,
        "is_active":         widget.is_active,
        "lead_count":        widget.lead_count,
        "call_count":        widget.call_count,
        "config": {
            "agent_name": cfg.get("agent_name", "Asistente"),
            "color":      cfg.get("color", "#EA580C"),
            "avatar_url": cfg.get("avatar_url", ""),
            "voice":      cfg.get("voice", ""),
        },
    }


def _plan_info(org) -> dict:
    """Return the org's active voice plan limits."""
    try:
        from apps.voice_plans.models import VoicePlan
        plan_slug = (org.settings or {}).get("voice_plan_slug", "starter")
        plan = VoicePlan.objects.filter(slug=plan_slug, is_active=True).first()
        if plan:
            return {"slug": plan.slug, "name": plan.name, "agent_limit": plan.agents}
    except Exception:
        pass
    return {"slug": "starter", "name": "Starter", "agent_limit": 1}


@csrf_exempt
def voice_widget_agents(request):
    """
    GET  /api/v1/voice-widget/agents/  — list all agents for the org
    POST /api/v1/voice-widget/agents/  — create a new agent (checks plan limit)
    Requires JWT + X-Organization-ID.
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    try:
        _user, org = _jwt_user_and_org(request)
    except ValueError as exc:
        msg = str(exc)
        return JsonResponse({"error": msg}, status=401 if msg == "unauthorized" else 400)

    from .models import VoiceWidget

    if request.method == "GET":
        agents = VoiceWidget.objects.filter(organization=org).order_by("created_at")
        plan   = _plan_info(org)
        return JsonResponse({
            "agents": [_widget_summary(w) for w in agents],
            "plan":   plan,
            "agent_count": agents.count(),
        })

    if request.method == "POST":
        try:
            body = json.loads(request.body)
        except Exception:
            return JsonResponse({"error": "invalid JSON"}, status=400)

        # Plan limit check
        plan  = _plan_info(org)
        count = VoiceWidget.objects.filter(organization=org).count()
        if count >= plan["agent_limit"]:
            return JsonResponse({
                "error": (
                    f"Tu plan {plan['name']} permite máximo {plan['agent_limit']} agente(s). "
                    "Actualiza tu plan para añadir más."
                ),
                "limit_reached": True,
            }, status=402)

        name = (body.get("name") or "Agente de Voz").strip()[:100]
        widget = VoiceWidget.objects.create(organization=org, name=name)
        return JsonResponse({"agent": _widget_summary(widget)}, status=201)

    return JsonResponse({"error": "method not allowed"}, status=405)


@csrf_exempt
def voice_widget_agent_delete(request, agent_id):
    """
    DELETE /api/v1/voice-widget/agents/<agent_id>/  — delete a specific agent
    Requires JWT + X-Organization-ID.
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    if request.method != "DELETE":
        return JsonResponse({"error": "method not allowed"}, status=405)

    try:
        _user, org = _jwt_user_and_org(request)
    except ValueError as exc:
        msg = str(exc)
        return JsonResponse({"error": msg}, status=401 if msg == "unauthorized" else 400)

    from .models import VoiceWidget
    try:
        widget = VoiceWidget.objects.get(organization=org, id=agent_id)
    except VoiceWidget.DoesNotExist:
        return JsonResponse({"error": "Agent not found"}, status=404)

    # Delete Vapi assistant (best-effort)
    if widget.vapi_assistant_id:
        try:
            org_settings = org.settings or {}
            api_key = org_settings.get("vapi_private_key", "")
            if api_key:
                from .vapi_service import delete_assistant
                delete_assistant(widget.vapi_assistant_id, api_key)
        except Exception:
            pass

    # Delete KB and widget
    if widget.knowledge_base:
        widget.knowledge_base.delete()
    widget.delete()

    return JsonResponse({"ok": True})


# ─── 10. Calls list ──────────────────────────────────────────────────────────

@csrf_exempt
def voice_calls_list(request):
    """
    GET /api/v1/voice-widget/calls/
    Authenticated — requires JWT + X-Organization-ID.
    Optional query params: agent_id, page (default 1), page_size (default 20, max 100).
    Returns paginated calls for the org ordered by -created_at.
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    if request.method != "GET":
        return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)

    try:
        _user, org = _jwt_user_and_org(request)
    except ValueError as exc:
        msg = str(exc)
        return _cors(JsonResponse({"error": msg}, status=401 if msg == "unauthorized" else 400), request)

    from .models import VoiceCall

    qs = VoiceCall.objects.filter(organization=org).select_related("widget", "lead").order_by("-created_at")

    agent_id = (request.GET.get("agent_id") or "").strip()
    if agent_id:
        qs = qs.filter(widget__id=agent_id)

    try:
        page = max(1, int(request.GET.get("page", 1)))
    except (ValueError, TypeError):
        page = 1

    try:
        page_size = min(100, max(1, int(request.GET.get("page_size", 20))))
    except (ValueError, TypeError):
        page_size = 20

    count       = qs.count()
    total_pages = max(1, (count + page_size - 1) // page_size)
    offset      = (page - 1) * page_size
    calls       = qs[offset: offset + page_size]

    def _serialize(call):
        so = call.structured_output or {}
        return {
            "id":               call.id,
            "vapi_call_id":     call.vapi_call_id,
            "agent_id":         str(call.widget.id) if call.widget else None,
            "agent_name":       (call.widget.config or {}).get("agent_name", "") if call.widget else "",
            "caller_name":      call.caller_name,
            "caller_phone":     call.caller_phone,
            "status":           call.status,
            "duration_seconds": call.duration_seconds,
            "sentiment":        call.sentiment,
            "ended_at":         call.ended_at.isoformat() if call.ended_at else None,
            "created_at":       call.created_at.isoformat(),
            "lead_id":          call.lead_id,
            "structured_output": {
                "lead_name":           so.get("lead_name"),
                "qualification_score": so.get("qualification_score"),
                "is_interested":       so.get("is_interested"),
                "intent":              so.get("intent"),
                "summary_es":          so.get("summary_es"),
                "follow_up_action":    so.get("follow_up_action"),
                "budget_mentioned":    so.get("budget_mentioned"),
                "timeline":            so.get("timeline"),
                "objections":          so.get("objections"),
            },
        }

    return _cors(JsonResponse({
        "results":     [_serialize(c) for c in calls],
        "count":       count,
        "page":        page,
        "page_size":   page_size,
        "total_pages": total_pages,
    }), request)


# ─── 11. Call detail ──────────────────────────────────────────────────────────

@csrf_exempt
def voice_call_detail(request, call_id):
    """
    GET /api/v1/voice-widget/calls/<int:call_id>/
    Authenticated — requires JWT + X-Organization-ID.
    Returns full call record including transcript and summary.
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    if request.method != "GET":
        return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)

    try:
        _user, org = _jwt_user_and_org(request)
    except ValueError as exc:
        msg = str(exc)
        return _cors(JsonResponse({"error": msg}, status=401 if msg == "unauthorized" else 400), request)

    from .models import VoiceCall

    try:
        call = VoiceCall.objects.select_related("widget", "lead").get(id=call_id, organization=org)
    except VoiceCall.DoesNotExist:
        return _cors(JsonResponse({"error": "not found"}, status=404), request)

    so = call.structured_output or {}
    data = {
        "id":               call.id,
        "vapi_call_id":     call.vapi_call_id,
        "agent_id":         str(call.widget.id) if call.widget else None,
        "agent_name":       (call.widget.config or {}).get("agent_name", "") if call.widget else "",
        "caller_name":      call.caller_name,
        "caller_phone":     call.caller_phone,
        "status":           call.status,
        "duration_seconds": call.duration_seconds,
        "sentiment":        call.sentiment,
        "ended_at":         call.ended_at.isoformat() if call.ended_at else None,
        "created_at":       call.created_at.isoformat(),
        "lead_id":          call.lead_id,
        "transcript":       call.transcript,
        "summary":          call.summary,
        "structured_output": {
            "lead_name":           so.get("lead_name"),
            "qualification_score": so.get("qualification_score"),
            "is_interested":       so.get("is_interested"),
            "intent":              so.get("intent"),
            "summary_es":          so.get("summary_es"),
            "follow_up_action":    so.get("follow_up_action"),
            "budget_mentioned":    so.get("budget_mentioned"),
            "timeline":            so.get("timeline"),
            "objections":          so.get("objections"),
        },
    }
    return _cors(JsonResponse(data), request)


@csrf_exempt
def voice_generate_prompt(request):
    """
    POST /api/v1/voice-widget/generate-prompt/
    Generates a system prompt for the voice agent using AI, based on the
    current widget config and knowledge base. Returns {"system_prompt": "..."}.
    Requires JWT + X-Organization-ID.
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)
    if request.method != "POST":
        return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)

    org = _get_org(request)
    if isinstance(org, JsonResponse):
        return _cors(org, request)

    try:
        body = json.loads(request.body or "{}")
    except Exception:
        body = {}

    agent_id = (body.get("agent_id") or "").strip()

    from .models import VoiceWidget
    if agent_id:
        widget = VoiceWidget.objects.filter(organization=org, id=agent_id).select_related("knowledge_base").first()
    else:
        widget = VoiceWidget.objects.filter(organization=org).select_related("knowledge_base").first()

    if not widget:
        return _cors(JsonResponse({"error": "Widget not found"}, status=404), request)

    kb  = widget.knowledge_base
    cfg = widget.config or {}

    # Build context from KB and config
    context_parts = [
        f"Nombre del agente: {cfg.get('agent_name', 'Asistente')}",
        f"Empresa: {org.name}",
    ]
    if kb:
        if kb.company_info:
            context_parts.append(f"Información de la empresa:\n{kb.company_info}")
        if kb.products_services:
            context_parts.append(f"Productos y servicios:\n{kb.products_services}")
        if kb.pricing:
            context_parts.append(f"Precios:\n{kb.pricing}")
        if kb.working_hours:
            context_parts.append(f"Horario de atención: {kb.working_hours}")
        if kb.contact_info:
            context_parts.append(f"Contacto: {kb.contact_info}")
        if kb.appointment_rules:
            context_parts.append(f"Proceso de citas:\n{kb.appointment_rules}")
        if kb.qualification_questions:
            qs = kb.qualification_questions if isinstance(kb.qualification_questions, list) else []
            if qs:
                context_parts.append("Preguntas de calificación:\n" + "\n".join(f"- {q}" for q in qs))
        if kb.whatsapp_number:
            context_parts.append(f"WhatsApp para escalado: {kb.whatsapp_number}")

    context_text = "\n\n".join(context_parts)

    meta_system = (
        "Eres un experto en diseño de agentes de voz con IA para empresas LATAM. "
        "Tu tarea es escribir un system prompt claro, profesional y efectivo para un agente de voz. "
        "El prompt debe estar en español, ser conciso y cubrir: identidad del agente, objetivo principal, "
        "tono y restricciones clave (no inventar datos, escalar a humano cuando corresponda). "
        "Devuelve SOLO el system prompt, sin explicaciones ni encabezados adicionales."
    )

    user_text = (
        f"Escribe el system prompt para este agente de voz basándote en la siguiente información:\n\n"
        f"{context_text}\n\n"
        f"El prompt debe ser directo, usar primera persona del agente, y tener secciones claramente "
        f"delimitadas para: identidad, objetivo, tono, restricciones y despedida."
    )

    from apps.ai_integration.views import _get_ai_config, _call_llm  # noqa: PLC0415
    api_key, api_url, model = _get_ai_config()

    if not api_key:
        return _cors(JsonResponse({"error": "No hay proveedor de IA configurado. Añade una clave de Groq u OpenAI en Integraciones."}, status=400), request)

    result, error = _call_llm(api_key, api_url, model, meta_system, user_text, temperature=0.7, max_tokens=1200)

    if error:
        return _cors(JsonResponse({"error": error}, status=502), request)

    return _cors(JsonResponse({"system_prompt": result}), request)


# ─── 12. Outbound — manage Twilio phone number linked to Vapi ─────────────────

@csrf_exempt
def voice_outbound_phone(request):
    """
    GET    /api/v1/voice-widget/outbound/phone/  — return connected phone info
    POST   /api/v1/voice-widget/outbound/phone/  — link Twilio number via Vapi
    DELETE /api/v1/voice-widget/outbound/phone/  — unlink number from Vapi + clear settings
    Requires JWT + X-Organization-ID. Exclusive to voz-business plan.
    """
    import requests as http_requests

    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    try:
        _user, org = _jwt_user_and_org(request)
    except ValueError as exc:
        msg = str(exc)
        return _cors(JsonResponse({"error": msg}, status=401 if msg == "unauthorized" else 400), request)

    org_settings = org.settings or {}

    # ── GET ───────────────────────────────────────────────────────────────────
    if request.method == "GET":
        phone_number_id = org_settings.get("vapi_phone_number_id", "")
        phone_number    = org_settings.get("vapi_phone_number", "")
        return _cors(JsonResponse({
            "phone_number_id": phone_number_id,
            "phone_number":    phone_number,
            "connected":       bool(phone_number_id),
        }), request)

    # ── POST ──────────────────────────────────────────────────────────────────
    if request.method == "POST":
        # Plan check
        if org_settings.get("voice_plan_slug", "starter") != "voz-business":
            return _cors(JsonResponse(
                {"error": "plan_required", "required_plan": "voz-business"},
                status=403,
            ), request)

        try:
            body = json.loads(request.body)
        except Exception:
            return _cors(JsonResponse({"error": "invalid JSON"}, status=400), request)

        account_sid   = (body.get("account_sid")   or "").strip()
        auth_token    = (body.get("auth_token")    or "").strip()
        phone_number  = (body.get("phone_number")  or "").strip()
        friendly_name = (body.get("friendly_name") or "OptimizaCRM Outbound").strip()

        if not account_sid or not auth_token or not phone_number:
            return _cors(JsonResponse(
                {"error": "account_sid, auth_token and phone_number are required"},
                status=400,
            ), request)

        vapi_private_key = org_settings.get("vapi_private_key", "")
        if not vapi_private_key:
            return _cors(JsonResponse({"error": "vapi_private_key not configured"}, status=400), request)

        # Call Vapi to register the phone number
        try:
            resp = http_requests.post(
                "https://api.vapi.ai/phone-number",
                headers={
                    "Authorization": f"Bearer {vapi_private_key}",
                    "Content-Type":  "application/json",
                },
                json={
                    "provider":          "twilio",
                    "number":            phone_number,
                    "twilioAccountSid":  account_sid,
                    "twilioAuthToken":   auth_token,
                    "name":              friendly_name,
                },
                timeout=15,
            )
        except Exception as exc:
            return _cors(JsonResponse({"error": f"Error connecting to Vapi: {exc}"}, status=502), request)

        if not resp.ok:
            try:
                err_msg = resp.json().get("message", resp.text)
            except Exception:
                err_msg = resp.text
            return _cors(JsonResponse({"error": err_msg}, status=502), request)

        vapi_data       = resp.json()
        phone_number_id = vapi_data.get("id", "")

        # Persist in org.settings
        org_settings["vapi_phone_number_id"] = phone_number_id
        org_settings["vapi_phone_number"]    = phone_number
        org.settings = org_settings
        org.save(update_fields=["settings"])

        return _cors(JsonResponse({
            "phone_number_id": phone_number_id,
            "phone_number":    phone_number,
            "connected":       True,
        }), request)

    # ── DELETE ────────────────────────────────────────────────────────────────
    if request.method == "DELETE":
        phone_number_id  = org_settings.get("vapi_phone_number_id", "")
        vapi_private_key = org_settings.get("vapi_private_key", "")

        if phone_number_id and vapi_private_key:
            try:
                http_requests.delete(
                    f"https://api.vapi.ai/phone-number/{phone_number_id}",
                    headers={"Authorization": f"Bearer {vapi_private_key}"},
                    timeout=15,
                )
            except Exception:
                pass  # best-effort — clear settings regardless

        # Clear phone settings
        org_settings.pop("vapi_phone_number_id", None)
        org_settings.pop("vapi_phone_number", None)
        org.settings = org_settings
        org.save(update_fields=["settings"])

        return _cors(JsonResponse({"ok": True, "connected": False}), request)

    return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)


# ─── 13. Outbound — initiate a single outbound call ──────────────────────────

@csrf_exempt
def voice_outbound_call(request):
    """
    POST /api/v1/voice-widget/outbound/call/
    Body: { "lead_id": 123, "agent_id": "<uuid-optional>" }
    Initiates an outbound call via Vapi for a consented lead.
    Requires JWT + X-Organization-ID. Exclusive to voz-business plan.
    """
    import requests as http_requests

    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    if request.method != "POST":
        return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)

    try:
        _user, org = _jwt_user_and_org(request)
    except ValueError as exc:
        msg = str(exc)
        return _cors(JsonResponse({"error": msg}, status=401 if msg == "unauthorized" else 400), request)

    org_settings = org.settings or {}

    # Plan check
    if org_settings.get("voice_plan_slug", "starter") != "voz-business":
        return _cors(JsonResponse(
            {"error": "plan_required", "required_plan": "voz-business"},
            status=403,
        ), request)

    # Vapi phone number check
    vapi_phone_number_id = org_settings.get("vapi_phone_number_id", "")
    if not vapi_phone_number_id:
        return _cors(JsonResponse(
            {"error": "no_phone_number", "detail": "No outbound phone number configured. Connect a Twilio number first."},
            status=400,
        ), request)

    # Vapi private key check
    vapi_private_key = org_settings.get("vapi_private_key", "")
    if not vapi_private_key:
        return _cors(JsonResponse(
            {"error": "no_vapi_key", "detail": "Vapi private key not configured."},
            status=400,
        ), request)

    try:
        body = json.loads(request.body)
    except Exception:
        return _cors(JsonResponse({"error": "invalid JSON"}, status=400), request)

    lead_id  = body.get("lead_id")
    agent_id = (body.get("agent_id") or "").strip()

    if not lead_id:
        return _cors(JsonResponse({"error": "lead_id is required"}, status=400), request)

    # Load lead
    from apps.crm.models import Lead
    try:
        lead = Lead.objects.get(organization=org, id=lead_id)
    except Lead.DoesNotExist:
        return _cors(JsonResponse({"error": "lead not found"}, status=404), request)

    # Consent check
    if not lead.outbound_consent:
        return _cors(JsonResponse({"error": "no_consent"}, status=403), request)

    # Phone check
    if not lead.phone:
        return _cors(JsonResponse({"error": "no_phone"}, status=400), request)

    # Load widget — by agent_id or first org widget
    from .models import VoiceWidget
    if agent_id:
        widget = VoiceWidget.objects.filter(organization=org, id=agent_id).first()
    else:
        widget = VoiceWidget.objects.filter(organization=org).first()

    if not widget:
        return _cors(JsonResponse({"error": "no voice agent configured"}, status=400), request)

    if not widget.vapi_assistant_id:
        return _cors(JsonResponse(
            {"error": "no_assistant", "detail": "Voice agent has no Vapi assistant ID. Save the agent configuration first."},
            status=400,
        ), request)

    # Initiate call via Vapi
    try:
        resp = http_requests.post(
            "https://api.vapi.ai/call",
            headers={
                "Authorization": f"Bearer {vapi_private_key}",
                "Content-Type":  "application/json",
            },
            json={
                "phoneNumberId": vapi_phone_number_id,
                "assistantId":   widget.vapi_assistant_id,
                "customer": {
                    "number": lead.phone,
                    "name":   lead.full_name,
                },
            },
            timeout=15,
        )
    except Exception as exc:
        return _cors(JsonResponse({"error": f"Error connecting to Vapi: {exc}"}, status=502), request)

    if not resp.ok:
        try:
            err_body = resp.json()
            err_msg  = err_body.get("message", resp.text)
        except Exception:
            err_body = {}
            err_msg  = resp.text
        import logging
        logging.getLogger(__name__).error("Vapi outbound call error %s: %s", resp.status_code, err_body or err_msg)
        return _cors(JsonResponse({"error": err_msg, "vapi_status": resp.status_code}, status=502), request)

    vapi_response = resp.json()
    vapi_call_id  = vapi_response.get("id", "")

    # Create VoiceCall record
    from .models import VoiceCall
    VoiceCall.objects.create(
        organization=org,
        widget=widget,
        vapi_call_id=vapi_call_id,
        caller_name=lead.full_name,
        caller_phone=lead.phone,
        direction="outbound",
        status="in_progress",
        lead=lead,
    )

    return _cors(JsonResponse({"call_id": vapi_call_id, "status": "initiated"}), request)
