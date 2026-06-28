"""
Optimiza-CRM – URL / File → Knowledge Base classifier
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro

Sources supported:
  • URL  — trafilatura extracts readable text from any public webpage
  • PDF  — pdfplumber extracts text page by page
  • .md  — decoded directly as plain text (Markdown is already readable)
  • .txt — decoded directly as plain text

All sources feed the same AI classifier (Groq → OpenAI fallback) that maps
the extracted text into the 8 VoiceKnowledgeBase fields.
"""

import io
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


# ─── File extraction ─────────────────────────────────────────────────────────

ALLOWED_EXTENSIONS = {".pdf", ".md", ".txt"}


def extract_from_file(file_bytes: bytes, filename: str) -> str:
    """
    Extract readable text from an uploaded file.

    Supported:
    - .pdf  → pdfplumber (page by page, joined with newlines)
    - .md   → UTF-8 decode, strip Markdown syntax
    - .txt  → UTF-8 decode

    Returns plain text truncated to 8 000 chars.
    Raises ValueError for unsupported types or empty content.
    """
    name = (filename or "").lower()
    ext  = ""
    if "." in name:
        ext = "." + name.rsplit(".", 1)[-1]

    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Formato no soportado '{ext}'. Se admiten: PDF, Markdown (.md) y texto plano (.txt)."
        )

    text = ""

    if ext == ".pdf":
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                pages = []
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    if page_text.strip():
                        pages.append(page_text.strip())
                text = "\n\n".join(pages)
        except ImportError:
            raise ValueError("pdfplumber no está instalado en el servidor.")
        except Exception as exc:
            raise ValueError(f"No se pudo leer el PDF: {exc}")

    elif ext in (".md", ".txt"):
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text = file_bytes.decode("latin-1", errors="replace")

        if ext == ".md":
            # Strip common Markdown syntax to reduce noise for the AI
            text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)  # headings
            text = re.sub(r"\*{1,2}(.+?)\*{1,2}", r"\1", text)          # bold/italic
            text = re.sub(r"`{1,3}[^`]*`{1,3}", "", text)               # code
            text = re.sub(r"!\[.*?\]\(.*?\)", "", text)                  # images
            text = re.sub(r"\[(.+?)\]\(.*?\)", r"\1", text)             # links
            text = re.sub(r"^[-*>]\s+", "", text, flags=re.MULTILINE)   # lists/blockquotes
            text = re.sub(r"\n{3,}", "\n\n", text).strip()

    if not text.strip():
        raise ValueError("El archivo no contiene texto legible.")

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
- qualification_questions: Array JSON de 3-5 strings. Preguntas clave para calificar prospectos, basadas en el negocio. Ejemplo: ["¿Cuántos empleados tiene?", "¿Cuál es tu presupuesto?"]

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


def classify_text(text: str, org=None) -> dict:
    """
    Shared classifier: takes plain text, calls AI, returns KB dict.
    Used by both scrape_and_classify (URL) and scrape_and_classify_file (file upload).
    """
    from django.conf import settings

    org_settings = (org.settings or {}) if org else {}
    groq_key   = org_settings.get("groq_api_key")   or getattr(settings, "GROQ_API_KEY",   "")
    openai_key = org_settings.get("openai_api_key") or getattr(settings, "OPENAI_API_KEY", "")

    if not groq_key and not openai_key:
        raise ValueError(
            "No hay clave de API configurada. Añade GROQ_API_KEY u OPENAI_API_KEY en "
            "los ajustes de la organización o en las variables de entorno del servidor."
        )

    raw: dict = {}
    last_error = ""
    if groq_key:
        try:
            raw = _call_groq(text, groq_key)
        except Exception as exc:
            last_error = str(exc)

    if not raw and openai_key:
        try:
            raw = _call_openai(text, openai_key)
        except Exception as exc:
            last_error = str(exc)

    if not raw:
        raise ValueError(f"Error al clasificar el contenido: {last_error}")

    result = {}
    for field in KB_FIELDS:
        val = raw.get(field) or ""
        if field == "qualification_questions":
            # Keep as list; normalise whatever the AI returned
            if isinstance(val, list):
                result[field] = [str(q).strip() for q in val if str(q).strip()]
            elif isinstance(val, str) and val.strip():
                # AI returned a plain string — split on newlines or semicolons
                items = re.split(r"\n|;", val)
                result[field] = [q.strip() for q in items if q.strip()]
            else:
                result[field] = []
        else:
            result[field] = str(val).strip()
    return result


def scrape_and_classify_file(file_bytes: bytes, filename: str, org=None) -> dict:
    """
    Extract text from an uploaded PDF / .md / .txt file and classify into KB fields.
    """
    text = extract_from_file(file_bytes, filename)
    return classify_text(text, org)


def scrape_and_classify(url: str, org=None) -> dict:
    """Scrape a public URL and classify its content into KB fields."""
    text = fetch_and_extract(url)
    return classify_text(text, org)
