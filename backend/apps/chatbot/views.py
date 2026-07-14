"""
Optimiza-CRM – Chatbot RAG API views
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro

Public endpoints (token-based, no JWT):
  POST /api/v1/chatbot/chat/      — send message, get RAG response

Authenticated endpoints (JWT + X-Organization-ID):
  GET  /api/v1/chatbot/manage/    — get or create widget config
  POST /api/v1/chatbot/manage/    — update widget config
  POST /api/v1/chatbot/embed/     — trigger KB re-embedding (Celery)
  GET  /api/v1/chatbot/sessions/  — list recent sessions
  GET  /api/v1/chatbot/embed-status/ — embedding status for current KB
"""

import json
import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

logger = logging.getLogger(__name__)


# ─── CORS / Auth helpers ──────────────────────────────────────────────────────

def _cors(response, request=None):
    origin = (request.headers.get("Origin", "*") if request else "*")
    response["Access-Control-Allow-Origin"]  = origin
    response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


def _jwt_user_and_org(request):
    from rest_framework_simplejwt.authentication import JWTAuthentication
    from rest_framework.exceptions import AuthenticationFailed
    from apps.accounts.models import Organization

    try:
        auth   = JWTAuthentication()
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


# ─── Widget serializer ────────────────────────────────────────────────────────

def _serialize_widget(widget, embed_status=None):
    from .models import ChatSession
    try:
        leads_count = ChatSession.objects.filter(
            widget=widget, lead__isnull=False,
        ).values("lead").distinct().count()
    except Exception:
        leads_count = 0

    return {
        "id":              str(widget.id),
        "token":           str(widget.token),
        "name":            widget.name,
        "is_active":       widget.is_active,
        "llm_model":       widget.llm_model,
        "system_prompt":   widget.system_prompt,
        "welcome_message": widget.welcome_message,
        "message_count":   widget.message_count,
        "session_count":   widget.session_count,
        "leads_count":     leads_count,
        "config":          widget.config,
        **({"embed_status": embed_status} if embed_status is not None else {}),
    }


# ─── 1. Public chat endpoint ──────────────────────────────────────────────────

@csrf_exempt
def chatbot_chat(request):
    """
    POST /api/v1/chatbot/chat/
    Public — identified by widget token.
    Body: { "token": "<uuid>", "session_id": "<uuid|null>", "message": "..." }
    Returns: { "session_id": "...", "response": "...", "sources": [...] }
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    if request.method != "POST":
        return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)

    try:
        body = json.loads(request.body)
    except Exception:
        return _cors(JsonResponse({"error": "invalid JSON"}, status=400), request)

    token      = (body.get("token") or "").strip()
    session_id = (body.get("session_id") or "").strip()
    message    = (body.get("message") or "").strip()

    if not token:
        return _cors(JsonResponse({"error": "token required"}, status=400), request)
    if not message:
        return _cors(JsonResponse({"error": "message required"}, status=400), request)
    if len(message) > 2000:
        return _cors(JsonResponse({"error": "message too long (max 2000 chars)"}, status=400), request)

    # Load widget
    from .models import ChatbotWidget, ChatSession, ChatMessage
    try:
        widget = ChatbotWidget.objects.select_related("organization").get(
            token=token, is_active=True,
        )
    except ChatbotWidget.DoesNotExist:
        return _cors(JsonResponse({"error": "widget not found"}, status=404), request)

    # Get or create session
    session = None
    if session_id:
        session = ChatSession.objects.filter(id=session_id, widget=widget).first()

    if not session:
        session = ChatSession.objects.create(widget=widget)
        ChatbotWidget.objects.filter(pk=widget.pk).update(session_count=widget.session_count + 1)

    # Load conversation history (last 12 messages for context)
    prior_messages = list(session.messages.order_by("created_at")[:12])
    history = [{"role": m.role, "content": m.content} for m in prior_messages]

    # Is this the very first exchange? (no messages yet in session)
    is_first_exchange = len(prior_messages) == 0

    # Save user message
    ChatMessage.objects.create(session=session, role="user", content=message)

    # ── Lead capture state machine ────────────────────────────────────────────
    capture_enabled = (widget.config or {}).get("capture_lead", False)
    capture_reply   = None
    skip_rag        = False

    if capture_enabled:
        try:
            if session.capture_state not in ("active", "skip"):
                from .lead_capture import process_capture
                capture_reply, skip_rag = process_capture(
                    session, message, is_first_exchange, widget.organization, widget,
                )
        except Exception as exc:
            logger.error("lead_capture error (widget=%s): %s", widget.id, exc, exc_info=True)
            capture_reply = None
            skip_rag = False

    if skip_rag and capture_reply:
        reply   = capture_reply
        sources = []
    else:
        # ── RAG pipeline ──────────────────────────────────────────────────────
        from .rag_service import chat_rag
        rag_reply, sources = chat_rag(widget, history, message)
        reply = rag_reply

    # Save assistant message
    ChatMessage.objects.create(
        session=session, role="assistant", content=reply, sources_used=sources,
    )

    # Increment message counter (2 messages: user + assistant)
    ChatbotWidget.objects.filter(pk=widget.pk).update(
        message_count=widget.message_count + 2,
    )

    # ── Trigger intent analysis after session reaches 6+ messages ────────────
    total_msgs = len(prior_messages) + 2  # user + assistant just saved
    if total_msgs >= 6 and session.capture_state == "active" and not session.intent_level:
        try:
            from .lead_capture import analyze_intent
            analyze_intent(session, widget)
        except Exception:
            pass

    return _cors(JsonResponse({
        "session_id": str(session.id),
        "response":   reply,
        "sources":    sources,
    }), request)


# ─── 2. Authenticated manage endpoint ────────────────────────────────────────

@csrf_exempt
def chatbot_manage(request):
    """
    GET  /api/v1/chatbot/manage/  — get or create widget
    POST /api/v1/chatbot/manage/  — update widget config
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    try:
        _, org = _jwt_user_and_org(request)
    except ValueError as exc:
        msg = str(exc)
        return _cors(JsonResponse({"error": msg}, status=401 if msg == "unauthorized" else 400), request)

    from .models import ChatbotWidget
    from apps.kb.models import KnowledgeBase, KBChunk

    def _embed_status(org):
        try:
            kb     = KnowledgeBase.objects.get(organization=org)
            total  = KBChunk.objects.filter(knowledge_base=kb).count()
            with_e = KBChunk.objects.filter(knowledge_base=kb, embedded_at__isnull=False).count()
            return {"total_chunks": total, "embedded_chunks": with_e, "ready": total > 0 and total == with_e}
        except Exception:
            return {"total_chunks": 0, "embedded_chunks": 0, "ready": False}

    if request.method == "GET":
        widget, _ = ChatbotWidget.objects.get_or_create(organization=org)
        return _cors(JsonResponse({
            "widget":       _serialize_widget(widget, embed_status=_embed_status(org)),
        }), request)

    if request.method == "POST":
        try:
            body = json.loads(request.body)
        except Exception:
            return _cors(JsonResponse({"error": "invalid JSON"}, status=400), request)

        widget, _ = ChatbotWidget.objects.get_or_create(organization=org)

        WIDGET_FIELDS = ["name", "is_active", "llm_model", "system_prompt", "welcome_message", "config"]
        for field in WIDGET_FIELDS:
            if field in body:
                setattr(widget, field, body[field])
        widget.save()

        return _cors(JsonResponse({
            "widget": _serialize_widget(widget, embed_status=_embed_status(org)),
        }), request)

    return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)


# ─── 3. Trigger embedding ─────────────────────────────────────────────────────

@csrf_exempt
def chatbot_embed(request):
    """
    POST /api/v1/chatbot/embed/
    Triggers KB embedding Celery task for the org's KB.
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)
    if request.method != "POST":
        return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)

    try:
        _, org = _jwt_user_and_org(request)
    except ValueError as exc:
        msg = str(exc)
        return _cors(JsonResponse({"error": msg}, status=401 if msg == "unauthorized" else 400), request)

    from apps.kb.models import KnowledgeBase
    try:
        kb = KnowledgeBase.objects.get(organization=org)
    except KnowledgeBase.DoesNotExist:
        return _cors(JsonResponse({"error": "No hay base de conocimiento configurada"}, status=404), request)

    from .tasks import embed_knowledge_base
    kb_id = str(kb.id)

    # Try async first; fall back to synchronous if broker is unavailable.
    try:
        embed_knowledge_base.delay(kb_id)
        return _cors(JsonResponse({"ok": True, "kb_id": kb_id, "mode": "async"}), request)
    except Exception:
        pass

    try:
        result = embed_knowledge_base(kb_id)
        return _cors(JsonResponse({"ok": True, "kb_id": kb_id, "mode": "sync", **(result or {})}), request)
    except Exception as exc:
        return _cors(JsonResponse({"error": f"Error al procesar embeddings: {exc}"}, status=500), request)


# ─── 4. Sessions list ─────────────────────────────────────────────────────────

@csrf_exempt
def chatbot_sessions(request):
    """
    GET /api/v1/chatbot/sessions/?page=1&page_size=20
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)
    if request.method != "GET":
        return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)

    try:
        _, org = _jwt_user_and_org(request)
    except ValueError as exc:
        msg = str(exc)
        return _cors(JsonResponse({"error": msg}, status=401 if msg == "unauthorized" else 400), request)

    from .models import ChatbotWidget, ChatSession

    try:
        widget = ChatbotWidget.objects.get(organization=org)
    except ChatbotWidget.DoesNotExist:
        return _cors(JsonResponse({"sessions": [], "count": 0}), request)

    try:
        page      = max(1, int(request.GET.get("page", 1)))
        page_size = min(50, max(1, int(request.GET.get("page_size", 20))))
    except (ValueError, TypeError):
        page, page_size = 1, 20

    qs = ChatSession.objects.filter(widget=widget).order_by("-started_at")

    has_lead = request.GET.get("has_lead")
    if has_lead == "true":
        qs = qs.filter(lead_id__isnull=False)
    elif has_lead == "false":
        qs = qs.filter(lead_id__isnull=True)

    intent = request.GET.get("intent_level")
    if intent in ("high", "medium", "low"):
        qs = qs.filter(intent_level=intent)

    count  = qs.count()
    offset = (page - 1) * page_size
    items  = qs[offset: offset + page_size]

    def _ser_session(s):
        msgs = list(s.messages.order_by("created_at"))
        first_user = next((m.content for m in msgs if m.role == "user"), "")
        lead_info = None
        if s.lead_id:
            try:
                lead_info = {
                    "id":    str(s.lead.id),
                    "ref_id": getattr(s.lead, "lead_ref_id", ""),
                    "name":  s.lead.full_name,
                    "phone": s.lead.phone,
                    "email": s.lead.email,
                }
            except Exception:
                pass
        return {
            "id":             str(s.id),
            "started_at":     s.started_at.isoformat(),
            "message_count":  len(msgs),
            "first_message":  first_user[:100],
            "lead":           lead_info,
            "intent_level":   getattr(s, "intent_level", ""),
            "intent_topics":  getattr(s, "intent_topics", []),
            "intent_summary": getattr(s, "intent_summary", ""),
            "capture_state":  getattr(s, "capture_state", ""),
        }

    return _cors(JsonResponse({
        "sessions":    [_ser_session(s) for s in items.select_related("lead").prefetch_related("messages")],
        "count":       count,
        "page":        page,
        "page_size":   page_size,
        "total_pages": max(1, (count + page_size - 1) // page_size),
    }), request)


# ─── 4b. Session detail ───────────────────────────────────────────────────────

@csrf_exempt
def chatbot_session_detail(request, session_id):
    """
    GET /api/v1/chatbot/sessions/<session_id>/
    Returns full transcript + lead + intent for one session.
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)
    if request.method != "GET":
        return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)

    try:
        _, org = _jwt_user_and_org(request)
    except ValueError as exc:
        msg = str(exc)
        return _cors(JsonResponse({"error": msg}, status=401 if msg == "unauthorized" else 400), request)

    from .models import ChatSession
    try:
        session = ChatSession.objects.select_related("widget", "lead").get(
            id=session_id, widget__organization=org,
        )
    except ChatSession.DoesNotExist:
        return _cors(JsonResponse({"error": "not found"}, status=404), request)

    msgs = list(session.messages.order_by("created_at"))
    lead_info = None
    if session.lead:
        lead_info = {
            "id":     str(session.lead.id),
            "ref_id": session.lead.lead_ref_id,
            "name":   session.lead.full_name,
            "phone":  session.lead.phone,
            "email":  session.lead.email,
        }

    return _cors(JsonResponse({
        "id":             str(session.id),
        "started_at":     session.started_at.isoformat(),
        "capture_state":  session.capture_state,
        "lead":           lead_info,
        "intent_level":   session.intent_level,
        "intent_topics":  session.intent_topics,
        "intent_summary": session.intent_summary,
        "messages": [
            {
                "role":       m.role,
                "content":    m.content,
                "created_at": m.created_at.isoformat(),
            }
            for m in msgs
        ],
    }), request)


# ─── 5. Public widget config ──────────────────────────────────────────────────

@csrf_exempt
def chatbot_config(request):
    """
    GET /api/v1/chatbot/config/?token=<uuid>
    Public — returns display config for the embed script.
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)
    if request.method != "GET":
        return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)

    token = (request.GET.get("token") or "").strip()
    if not token:
        return _cors(JsonResponse({"error": "token required"}, status=400), request)

    from .models import ChatbotWidget
    try:
        widget = ChatbotWidget.objects.select_related("organization").get(
            token=token, is_active=True,
        )
    except ChatbotWidget.DoesNotExist:
        return _cors(JsonResponse({"error": "widget not found"}, status=404), request)

    cfg = widget.config or {}
    return _cors(JsonResponse({
        "name":            widget.name,
        "welcome_message": widget.welcome_message,
        "color":           cfg.get("color", "#EA580C"),
        "avatar_url":      cfg.get("avatar_url", ""),
        "position":        cfg.get("position", "bottom-right"),
        "placeholder":     cfg.get("placeholder", "Escribe tu mensaje…"),
        "show_sources":    cfg.get("show_sources", False),
        "org_name":        widget.organization.name,
    }), request)
