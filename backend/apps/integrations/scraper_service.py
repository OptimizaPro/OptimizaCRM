"""
Optimiza-CRM – URL scraper → Knowledge Base classifier
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro

Flow:
  1. Fetch + extract readable text from a URL using trafilatura.
  2. Send the text to an AI (Groq → OpenAI fallback) with a structured prompt.
  3. Return a dict matching VoiceKnowledgeBase fields.
"""

import json
import re
from urllib.parse import urlparse

import requests as http_requests


# ─── Extraction ───────────────────────────────────────────────────────────────

def fetch_and_extract(url: str) -> str:
    """
    Download a URL and extract its main readable text using trafilatura.
    Falls back to a basic requests + regex strip if trafilatura is unavailable.

    Returns plain text (≤ 8 000 chars to keep AI token costs low).
    """
    # Validate URL
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL inválida — solo se admiten URLs http/https.")

    try:
        import trafilatura

        # trafilatura.fetch_url respects robots.txt and sends a browser-like UA
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            raise ValueError("No se pudo descargar la página.")

        text = trafilatura.extract(
            downloaded,
            include_tables=True,
            include_links=False,
            favor_precision=False,   # favor recall — we want as much text as possible
            no_fallback=False,
        )
        if not text:
            raise ValueError("No se encontró contenido legible en la página.")

    except ImportError:
        # trafilatura not installed — minimal fallback
        resp = http_requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()
        html = resp.text
        # Strip tags crudely
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s{2,}", " ", text).strip()

    # Limit size: ~8 000 chars ≈ 2 000 tokens
    return text[:8000]


# ─── Classification prompt ────────────────────────────────────────────────────

_CLASSIFY_SYSTEM = """
Eres un asistente experto en extracción de información empresarial.
Tu tarea es leer el contenido de una página web y rellenar una base de conocimiento estructurada para un agente de voz de atención al cliente.

Responde ÚNICAMENTE con un objeto JSON válido con exactamente estas claves:
{
  "company_info": "...",
  "products_services": "...",
  "pricing": "...",
  "faqs": "...",
  "working_hours": "...",
  "contact_info": "...",
  "appointment_rules": "...",
  "qualification_questions": "..."
}

Directrices por campo:
- company_info: Nombre, misión, historia, valores, ubicación, sector. 2-4 oraciones.
- products_services: Lista de productos o servicios con descripciones breves. Usa bullet points.
- pricing: Precios, planes, rangos, condiciones. Si no hay info, deja vacío "".
- faqs: 3-6 preguntas y respuestas frecuentes inferidas del contenido. Formato "P: ... R: ...".
- working_hours: Horarios de atención si los hay. Si no hay, deja vacío "".
- contact_info: Email, teléfono, dirección, redes sociales que aparezcan.
- appointment_rules: Instrucciones para agendar citas si aplica. Si no aplica, deja vacío "".
- qualification_questions: 3-5 preguntas clave para calificar prospectos, basadas en el negocio.

Si un campo no tiene información suficiente, pon "" (cadena vacía). No inventes datos que no están en el texto.
""".strip()


# ─── AI call ──────────────────────────────────────────────────────────────────

def _call_groq(prompt: str, api_key: str) -> dict:
    resp = http_requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": _CLASSIFY_SYSTEM},
                {"role": "user",   "content": f"Contenido de la web:\n\n{prompt}"},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        },
        timeout=60,
    )
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    return json.loads(content)


def _call_openai(prompt: str, api_key: str) -> dict:
    resp = http_requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": _CLASSIFY_SYSTEM},
                {"role": "user",   "content": f"Contenido de la web:\n\n{prompt}"},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        },
        timeout=60,
    )
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    return json.loads(content)


# ─── Public API ───────────────────────────────────────────────────────────────

KB_FIELDS = [
    "company_info", "products_services", "pricing", "faqs",
    "working_hours", "contact_info", "appointment_rules", "qualification_questions",
]


def scrape_and_classify(url: str, org=None) -> dict:
    """
    Main entry point.
    1. Scrape the URL.
    2. Classify text into KB fields via AI (org keys → global fallback).
    3. Return a dict with KB fields (empty strings for missing data).
    """
    from django.conf import settings

    # Resolve API keys: org-level BYOK first, then global settings
    org_settings = (org.settings or {}) if org else {}
    groq_key   = org_settings.get("groq_api_key")   or getattr(settings, "GROQ_API_KEY",   "")
    openai_key = org_settings.get("openai_api_key") or getattr(settings, "OPENAI_API_KEY", "")

    if not groq_key and not openai_key:
        raise ValueError(
            "No hay clave de API configurada. Añade GROQ_API_KEY u OPENAI_API_KEY en "
            "los ajustes de la organización o en las variables de entorno del servidor."
        )

    # 1. Scrape
    text = fetch_and_extract(url)

    # 2. Classify — Groq preferred (faster + cheaper), OpenAI fallback
    raw: dict = {}
    last_error = ""
    if groq_key:
        try:
            raw = _call_groq(text, groq_key)
        except Exception as exc:
            last_error = str(exc)
            raw = {}

    if not raw and openai_key:
        try:
            raw = _call_openai(text, openai_key)
        except Exception as exc:
            last_error = str(exc)

    if not raw:
        raise ValueError(f"Error al clasificar el contenido: {last_error}")

    # 3. Sanitise — keep only known fields, cast to str
    result = {field: str(raw.get(field, "") or "").strip() for field in KB_FIELDS}
    return result
