"""
Optimiza-CRM – Shared Knowledge Base API views
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro

Endpoints (all under /api/v1/kb/):
  GET  /manage/        — get or create org KB
  POST /manage/        — save KB fields
  POST /scrape-url/    — scrape URL → classify into KB fields, create KBSource
  POST /import-file/   — import file → classify, create KBSource
  GET  /sources/       — list KBSources for org
  DELETE /sources/<uuid>/ — delete a KBSource
"""

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt


# ─── CORS / Auth helpers (shared pattern) ────────────────────────────────────

def _cors(response, request=None):
    origin = (request.headers.get("Origin", "*") if request else "*")
    response["Access-Control-Allow-Origin"]  = origin
    response["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
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


# ─── Plan limits ──────────────────────────────────────────────────────────────

KB_SOURCE_LIMITS = {
    "basico":     3,
    "pro":        6,
    "equipo":     9,
    "enterprise": 50,
}
KB_SOURCE_LIMIT_DEFAULT = 3


def _source_limit(org) -> int:
    try:
        plan = org.subscription.plan
    except Exception:
        plan = "basico"
    return KB_SOURCE_LIMITS.get(plan, KB_SOURCE_LIMIT_DEFAULT)


# ─── Serializers ─────────────────────────────────────────────────────────────

KB_FIELDS = [
    "company_info", "products_services", "pricing", "faqs",
    "working_hours", "contact_info", "appointment_rules",
    "qualification_questions", "whatsapp_number",
]


def _serialize_kb(kb):
    return {
        "id":   str(kb.id),
        **{f: getattr(kb, f) for f in KB_FIELDS},
    }


def _serialize_source(src):
    return {
        "id":          str(src.id),
        "source_type": src.source_type,
        "name":        src.name,
        "char_count":  src.char_count,
        "created_at":  src.created_at.isoformat(),
    }


# ─── 1. GET/POST manage ──────────────────────────────────────────────────────

@csrf_exempt
def kb_manage(request):
    """
    GET  /api/v1/kb/manage/  — get or create org KB
    POST /api/v1/kb/manage/  — update KB fields
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)

    try:
        _, org = _jwt_user_and_org(request)
    except ValueError as exc:
        msg = str(exc)
        return _cors(JsonResponse({"error": msg}, status=401 if msg == "unauthorized" else 400), request)

    from .models import KnowledgeBase

    if request.method == "GET":
        kb, _ = KnowledgeBase.objects.get_or_create(organization=org)
        limit  = _source_limit(org)
        count  = kb.sources.count()
        return _cors(JsonResponse({
            "knowledge_base": _serialize_kb(kb),
            "source_count":   count,
            "source_limit":   limit,
        }), request)

    if request.method == "POST":
        try:
            body = json.loads(request.body)
        except Exception:
            return _cors(JsonResponse({"error": "invalid JSON"}, status=400), request)

        kb, _ = KnowledgeBase.objects.get_or_create(organization=org)
        for field in KB_FIELDS:
            if field in body:
                setattr(kb, field, body[field])
        kb.save()
        return _cors(JsonResponse({"knowledge_base": _serialize_kb(kb)}), request)

    return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)


# ─── 2. Scrape URL ───────────────────────────────────────────────────────────

@csrf_exempt
def kb_scrape_url(request):
    """
    POST /api/v1/kb/scrape-url/
    Body: { "url": "https://..." }
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

    try:
        body = json.loads(request.body)
    except Exception:
        return _cors(JsonResponse({"error": "invalid JSON"}, status=400), request)

    url = (body.get("url") or "").strip()
    if not url:
        return _cors(JsonResponse({"error": "url is required"}, status=400), request)

    try:
        from apps.integrations.scraper_service import scrape_and_classify
        kb_data = scrape_and_classify(url, org)
    except ValueError as exc:
        return _cors(JsonResponse({"error": str(exc)}, status=422), request)
    except Exception as exc:
        return _cors(JsonResponse({"error": f"Error al procesar la URL: {exc}"}, status=500), request)

    total_chars = sum(len(v) for v in kb_data.values() if isinstance(v, str))

    # Check limit then save source
    from .models import KnowledgeBase, KBSource
    kb, _    = KnowledgeBase.objects.get_or_create(organization=org)
    limit    = _source_limit(org)
    current  = kb.sources.count()

    if current >= limit:
        try:
            plan = org.subscription.plan
        except Exception:
            plan = "basico"
        return _cors(JsonResponse({
            "error":       f"Has alcanzado el límite de {limit} fuentes para el plan {plan}.",
            "limit_error": True,
            "limit":       limit,
            "current":     current,
            "plan":        plan,
        }, status=402), request)

    source = KBSource.objects.create(
        organization=org, knowledge_base=kb,
        source_type="url", name=url, char_count=total_chars,
    )

    return _cors(JsonResponse({
        "knowledge_base": kb_data,
        "char_count":     total_chars,
        "source":         _serialize_source(source),
    }), request)


# ─── 3. Import file ──────────────────────────────────────────────────────────

@csrf_exempt
def kb_import_file(request):
    """
    POST /api/v1/kb/import-file/
    Body: multipart/form-data with field "file"
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

    uploaded = request.FILES.get("file")
    if not uploaded:
        return _cors(JsonResponse({"error": "No se recibió ningún archivo (campo 'file')"}, status=400), request)

    if uploaded.size > 10 * 1024 * 1024:
        return _cors(JsonResponse({"error": "El archivo supera el límite de 10 MB."}, status=413), request)

    try:
        file_bytes = uploaded.read()
        from apps.integrations.scraper_service import scrape_and_classify_file
        kb_data = scrape_and_classify_file(file_bytes, uploaded.name, org)
    except ValueError as exc:
        return _cors(JsonResponse({"error": str(exc)}, status=422), request)
    except Exception as exc:
        return _cors(JsonResponse({"error": f"Error al procesar el archivo: {exc}"}, status=500), request)

    total_chars = sum(len(v) for v in kb_data.values() if isinstance(v, str))

    from .models import KnowledgeBase, KBSource
    kb, _   = KnowledgeBase.objects.get_or_create(organization=org)
    limit   = _source_limit(org)
    current = kb.sources.count()

    if current >= limit:
        try:
            plan = org.subscription.plan
        except Exception:
            plan = "basico"
        return _cors(JsonResponse({
            "error":       f"Has alcanzado el límite de {limit} fuentes para el plan {plan}.",
            "limit_error": True,
            "limit":       limit,
            "current":     current,
            "plan":        plan,
        }, status=402), request)

    source = KBSource.objects.create(
        organization=org, knowledge_base=kb,
        source_type="file", name=uploaded.name, char_count=total_chars,
    )

    return _cors(JsonResponse({
        "knowledge_base": kb_data,
        "char_count":     total_chars,
        "filename":       uploaded.name,
        "source":         _serialize_source(source),
    }), request)


# ─── 4. List sources ─────────────────────────────────────────────────────────

@csrf_exempt
def kb_sources(request):
    """
    GET /api/v1/kb/sources/
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

    from .models import KnowledgeBase
    kb, _  = KnowledgeBase.objects.get_or_create(organization=org)
    limit  = _source_limit(org)
    srcs   = kb.sources.all()
    return _cors(JsonResponse({
        "sources": [_serialize_source(s) for s in srcs],
        "limit":   limit,
        "count":   srcs.count(),
    }), request)


# ─── 5. Delete source ────────────────────────────────────────────────────────

@csrf_exempt
def kb_source_delete(request, source_id):
    """
    DELETE /api/v1/kb/sources/<uuid>/
    """
    if request.method == "OPTIONS":
        return _cors(JsonResponse({}), request)
    if request.method != "DELETE":
        return _cors(JsonResponse({"error": "method not allowed"}, status=405), request)

    try:
        _, org = _jwt_user_and_org(request)
    except ValueError as exc:
        msg = str(exc)
        return _cors(JsonResponse({"error": msg}, status=401 if msg == "unauthorized" else 400), request)

    from .models import KBSource
    try:
        src = KBSource.objects.get(id=source_id, organization=org)
        src.delete()
        return _cors(JsonResponse({"ok": True}), request)
    except KBSource.DoesNotExist:
        return _cors(JsonResponse({"error": "not found"}, status=404), request)
