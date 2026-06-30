"""
Google Drive integration views — OAuth 2.0 + document linking
No external Google SDK required — uses requests directly.
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import json
import hmac
import hashlib
import base64
from datetime import timedelta
from urllib.parse import urlencode

import requests as http_requests
from django.conf import settings
from django.http import HttpResponseRedirect, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated

from core.middleware import get_current_organization
from .models import GoogleDriveToken, DriveDocument

GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_DRIVE_URL = "https://www.googleapis.com/drive/v3/files"
SCOPES = "https://www.googleapis.com/auth/drive.readonly"


# ── State helpers (CSRF protection) ──────────────────────────────────────────

def _make_state(org_id: str) -> str:
    payload = json.dumps({"org": str(org_id)})
    sig = hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    return base64.urlsafe_b64encode(f"{payload}|{sig}".encode()).decode()


def _verify_state(state: str):
    try:
        decoded = base64.urlsafe_b64decode(state.encode()).decode()
        payload, sig = decoded.rsplit("|", 1)
        expected = hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
        if not hmac.compare_digest(sig, expected):
            return None
        return json.loads(payload)["org"]
    except Exception:
        return None


# ── Token helpers ─────────────────────────────────────────────────────────────

def _refresh_token(token_obj: GoogleDriveToken):
    """Refresh access token if expired. Returns fresh access_token or None on failure."""
    if token_obj.token_expiry and token_obj.token_expiry > timezone.now() + timedelta(seconds=60):
        return token_obj.access_token  # still valid

    if not token_obj.refresh_token:
        return None

    resp = http_requests.post(GOOGLE_TOKEN_URL, data={
        "grant_type":    "refresh_token",
        "refresh_token": token_obj.refresh_token,
        "client_id":     settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
    }, timeout=10)

    if not resp.ok:
        return None

    data = resp.json()
    token_obj.access_token = data["access_token"]
    token_obj.token_expiry = timezone.now() + timedelta(seconds=data.get("expires_in", 3600))
    token_obj.save(update_fields=["access_token", "token_expiry", "updated_at"])
    return token_obj.access_token


def _get_valid_token(org):
    token_obj = GoogleDriveToken.objects.filter(organization=org).first()
    if not token_obj:
        return None
    return _refresh_token(token_obj)


# ── Drive status ──────────────────────────────────────────────────────────────

@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def drive_status(request):
    org = get_current_organization()
    if not org:
        return JsonResponse({"error": "organization required"}, status=400)

    if request.method == "DELETE":
        GoogleDriveToken.objects.filter(organization=org).delete()
        return JsonResponse({"disconnected": True})

    token_obj = GoogleDriveToken.objects.filter(organization=org).first()
    if token_obj:
        return JsonResponse({"connected": True, "connected_at": token_obj.connected_at.isoformat()})
    return JsonResponse({"connected": False, "connected_at": None})


# ── OAuth — step 1: get auth URL ──────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def drive_auth_url(request):
    org = get_current_organization()
    if not org:
        return JsonResponse({"error": "organization required"}, status=400)

    state = _make_state(str(org.id))
    params = {
        "client_id":     settings.GOOGLE_CLIENT_ID,
        "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         SCOPES,
        "access_type":   "offline",
        "prompt":        "consent",
        "state":         state,
    }
    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return JsonResponse({"auth_url": auth_url})


# ── OAuth — step 2: callback ──────────────────────────────────────────────────

@csrf_exempt
@api_view(["GET"])
@permission_classes([AllowAny])
def drive_callback(request):
    code  = request.GET.get("code")
    state = request.GET.get("state")
    error = request.GET.get("error")

    frontend_base = getattr(settings, "FRONTEND_URL", "http://localhost:3000")

    if error or not code or not state:
        return HttpResponseRedirect(f"{frontend_base}/dashboard/integrations?drive_error=1")

    org_id = _verify_state(state)
    if not org_id:
        return HttpResponseRedirect(f"{frontend_base}/dashboard/integrations?drive_error=csrf")

    # Exchange code for tokens
    resp = http_requests.post(GOOGLE_TOKEN_URL, data={
        "code":          code,
        "client_id":     settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
        "grant_type":    "authorization_code",
    }, timeout=10)

    if not resp.ok:
        return HttpResponseRedirect(f"{frontend_base}/dashboard/integrations?drive_error=token")

    data = resp.json()

    from apps.accounts.models import Organization
    try:
        org = Organization.objects.get(pk=org_id)
    except Organization.DoesNotExist:
        return HttpResponseRedirect(f"{frontend_base}/dashboard/integrations?drive_error=org")

    expiry = timezone.now() + timedelta(seconds=data.get("expires_in", 3600))
    GoogleDriveToken.objects.update_or_create(
        organization=org,
        defaults={
            "access_token":  data["access_token"],
            "refresh_token": data.get("refresh_token", ""),
            "token_expiry":  expiry,
        },
    )

    return HttpResponseRedirect(f"{frontend_base}/dashboard/integrations?drive_connected=1")


# ── Drive search ──────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def drive_search(request):
    org = get_current_organization()
    if not org:
        return JsonResponse({"error": "organization required"}, status=400)

    q = request.GET.get("q", "").strip()
    if not q:
        return JsonResponse({"files": []})

    access_token = _get_valid_token(org)
    if not access_token:
        return JsonResponse({"error": "not_connected"}, status=401)

    query = f"name contains '{q}' and trashed = false"
    resp = http_requests.get(GOOGLE_DRIVE_URL, params={
        "q":        query,
        "fields":   "files(id,name,mimeType,webViewLink,iconLink,modifiedTime)",
        "pageSize": 20,
        "orderBy":  "modifiedTime desc",
    }, headers={"Authorization": f"Bearer {access_token}"}, timeout=10)

    if not resp.ok:
        return JsonResponse({"error": "drive_api_error"}, status=502)

    return JsonResponse({"files": resp.json().get("files", [])})


# ── Document linking ──────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def drive_documents(request):
    org = get_current_organization()
    if not org:
        return JsonResponse({"error": "organization required"}, status=400)

    if request.method == "GET":
        entity_type = request.GET.get("entity_type")
        entity_id   = request.GET.get("entity_id")
        qs = DriveDocument.objects.filter(organization=org)
        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        if entity_id:
            qs = qs.filter(entity_id=str(entity_id))
        docs = list(qs.values(
            "id", "drive_file_id", "name", "mime_type",
            "web_view_link", "icon_link", "created_at",
            "entity_type", "entity_id",
        ))
        for d in docs:
            d["created_at"] = d["created_at"].isoformat()
        return JsonResponse({"documents": docs})

    # POST — link a document
    body = json.loads(request.body)
    entity_type   = body.get("entity_type")
    entity_id     = body.get("entity_id")
    drive_file_id = body.get("drive_file_id")
    name          = body.get("name", "")
    mime_type     = body.get("mime_type", "")
    web_view_link = body.get("web_view_link", "")
    icon_link     = body.get("icon_link", "")

    if not all([entity_type, entity_id, drive_file_id, name]):
        return JsonResponse({"error": "Faltan campos requeridos"}, status=400)

    doc, created = DriveDocument.objects.get_or_create(
        organization=org,
        entity_type=entity_type,
        entity_id=str(entity_id),
        drive_file_id=drive_file_id,
        defaults={
            "name": name,
            "mime_type": mime_type,
            "web_view_link": web_view_link,
            "icon_link": icon_link,
        },
    )

    return JsonResponse({
        "document": {
            "id":            doc.id,
            "drive_file_id": doc.drive_file_id,
            "name":          doc.name,
            "mime_type":     doc.mime_type,
            "web_view_link": doc.web_view_link,
            "icon_link":     doc.icon_link,
            "entity_type":   doc.entity_type,
            "entity_id":     doc.entity_id,
            "created_at":    doc.created_at.isoformat(),
        },
        "created": created,
    }, status=201 if created else 200)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def drive_document_delete(request, doc_id: int):
    org = get_current_organization()
    if not org:
        return JsonResponse({"error": "organization required"}, status=400)
    deleted, _ = DriveDocument.objects.filter(pk=doc_id, organization=org).delete()
    if not deleted:
        return JsonResponse({"error": "No encontrado"}, status=404)
    return JsonResponse({"deleted": True})
