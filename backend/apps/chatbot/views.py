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
    history = [
        {"role": m.role, "content": m.content}
        for m in session.messages.order_by("created_at")[:12]
    ]

    # Save user message
    ChatMessage.objects.create(session=session, role="user", content=message)

    # ── RAG pipeline ──────────────────────────────────────────────────────────
    from .rag_service import chat_rag
    reply, sources = chat_rag(widget, history, message)

    # Save assistant message
    ChatMessage.objects.create(
        session=session, role="assistant", content=reply, sources_used=sources,
    )

    # Increment message counter (2 messages: user + assistant)
    ChatbotWidget.objects.filter(pk=widget.pk).update(
        message_count=widget.message_count + 2,
    )

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

    try:
        from .tasks import embed_knowledge_base
        embed_knowledge_base.delay(str(kb.id))
        return _cors(JsonResponse({"ok": True, "kb_id": str(kb.id)}), request)
    except Exception as exc:
        return _cors(JsonResponse({"error": f"Error al lanzar tarea: {exc}"}, status=500), request)


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

    qs     = ChatSession.objects.filter(widget=widget).order_by("-started_at")
    count  = qs.count()
    offset = (page - 1) * page_size
    items  = qs[offset: offset + page_size]

    def _ser_session(s):
        msgs = list(s.messages.order_by("created_at"))
        first_user = next((m.content for m in msgs if m.role == "user"), "")
        return {
            "id":          str(s.id),
            "started_at":  s.started_at.isoformat(),
            "message_count": len(msgs),
            "first_message": first_user[:100],
        }

    return _cors(JsonResponse({
        "sessions":    [_ser_session(s) for s in items.prefetch_related("messages")],
        "count":       count,
        "page":        page,
        "page_size":   page_size,
        "total_pages": max(1, (count + page_size - 1) // page_size),
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
