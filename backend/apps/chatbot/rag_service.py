"""
Optimiza-CRM – RAG Service
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro

Pipeline:
  1. chunk_knowledge_base()  — split KB fields into text chunks
  2. embed_chunks()          — call OpenAI text-embedding-3-small for each chunk
  3. retrieve_context()      — embed query, cosine sim → top-k chunks
  4. chat_rag()              — build prompt with context, call LLM, return response
"""

import json
import math
import logging
import urllib.request
import urllib.error
from typing import Optional

logger = logging.getLogger(__name__)

OPENAI_EMBED_URL = "https://api.openai.com/v1/embeddings"
EMBED_MODEL      = "text-embedding-3-small"
EMBED_DIMS       = 1536

GROQ_API_URL   = "https://api.groq.com/openai/v1/chat/completions"
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

LLM_URLS = {
    "groq":   GROQ_API_URL,
    "openai": OPENAI_API_URL,
    "gemini": GEMINI_API_URL,
}

# Max chars per chunk — fields longer than this are split with overlap
CHUNK_SIZE    = 800
CHUNK_OVERLAP = 80


# ─── Chunking ─────────────────────────────────────────────────────────────────

def _split_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping chunks. Tries to break at sentence boundaries."""
    text = text.strip()
    if not text:
        return []
    if len(text) <= size:
        return [text]

    chunks = []
    start  = 0
    while start < len(text):
        end = start + size
        if end < len(text):
            # Try to break at a sentence or newline
            for sep in ("\n\n", "\n", ". ", "? ", "! ", " "):
                pos = text.rfind(sep, start + size // 2, end)
                if pos != -1:
                    end = pos + len(sep)
                    break
        chunks.append(text[start:end].strip())
        start = end - overlap
    return [c for c in chunks if c]


def chunk_knowledge_base(kb) -> list[dict]:
    """
    Returns a list of {section, chunk_index, text} dicts for all non-empty KB fields.
    qualification_questions (list) is joined as bullet points.
    """
    from apps.kb.models import KBChunk

    sections = [
        ("company_info",      kb.company_info),
        ("products_services", kb.products_services),
        ("pricing",           kb.pricing),
        ("faqs",              kb.faqs),
        ("working_hours",     kb.working_hours),
        ("contact_info",      kb.contact_info),
        ("appointment_rules", kb.appointment_rules),
    ]

    # Add qualification_questions as text
    qs = kb.qualification_questions
    if qs and isinstance(qs, list):
        qs_text = "\n".join(f"- {q}" for q in qs if q)
        if qs_text:
            sections.append(("qualification_questions", qs_text))

    label = KBChunk.SECTION_LABELS

    result = []
    for section, text in sections:
        if not (text and text.strip()):
            continue
        section_label = label.get(section, section)
        raw_chunks = _split_text(text)
        for idx, chunk_text in enumerate(raw_chunks):
            # Prepend section label so the LLM knows context
            prefixed = f"[{section_label}]\n{chunk_text}"
            result.append({"section": section, "chunk_index": idx, "text": prefixed})

    return result


# ─── Embedding API ───────────────────────────────────────────────────────────

def _get_openai_key(org=None) -> str:
    """
    Priority:
      1. Org's AI integration (provider=openai)
      2. OPENAI_API_KEY env var
    """
    if org:
        try:
            from apps.integrations.models import Integration
            integ = Integration.objects.get(
                organization=org, channel_type="ai_provider",
                status="connected", is_active=True,
            )
            cfg = integ.config or {}
            if cfg.get("provider") == "openai" and cfg.get("api_key"):
                return cfg["api_key"]
        except Exception:
            pass

    import os
    return os.environ.get("OPENAI_API_KEY", "")


def embed_text(text: str, api_key: str) -> Optional[list]:
    """Call OpenAI text-embedding-3-small. Returns list[float] or None on error."""
    payload = json.dumps({"model": EMBED_MODEL, "input": text}).encode("utf-8")
    req = urllib.request.Request(
        OPENAI_EMBED_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["data"][0]["embedding"]
    except urllib.error.HTTPError as e:
        logger.error("embed_text HTTP error: %s – %s", e.code, e.read().decode("utf-8", errors="replace"))
        return None
    except Exception as e:
        logger.error("embed_text error: %s", e)
        return None


# ─── Similarity ───────────────────────────────────────────────────────────────

def _dot(a: list, b: list) -> float:
    return sum(x * y for x, y in zip(a, b))


def _norm(v: list) -> float:
    return math.sqrt(sum(x * x for x in v))


def cosine_similarity(a: list, b: list) -> float:
    na, nb = _norm(a), _norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return _dot(a, b) / (na * nb)


# ─── Context retrieval ────────────────────────────────────────────────────────

def retrieve_context(kb, query: str, api_key: str, top_k: int = 4) -> list[dict]:
    """
    Embed query → cosine similarity against all KBChunks → return top-k.
    Returns list of {section, text, score}.
    Falls back to keyword match if embeddings are missing.
    """
    from apps.kb.models import KBChunk

    chunks = list(KBChunk.objects.filter(knowledge_base=kb).values("section", "text", "embedding"))
    if not chunks:
        return []

    # Check if embeddings exist
    has_embeddings = any(c["embedding"] for c in chunks)

    if has_embeddings and api_key:
        query_vec = embed_text(query, api_key)
        if query_vec:
            scored = []
            for c in chunks:
                if not c["embedding"]:
                    continue
                try:
                    vec = json.loads(c["embedding"])
                    score = cosine_similarity(query_vec, vec)
                    scored.append({"section": c["section"], "text": c["text"], "score": score})
                except Exception:
                    continue
            scored.sort(key=lambda x: x["score"], reverse=True)
            return scored[:top_k]

    # Fallback: keyword relevance (count query word hits in chunk text)
    query_words = set(query.lower().split())
    scored = []
    for c in chunks:
        text_lower = c["text"].lower()
        score = sum(1 for w in query_words if w in text_lower)
        scored.append({"section": c["section"], "text": c["text"], "score": score})
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]


# ─── LLM call ────────────────────────────────────────────────────────────────

def _resolve_llm(llm_model: str, org) -> tuple[str, str, str]:
    """
    Resolve (api_key, api_url, model) from the llm_model slug
    using the org's configured AI provider.
    """
    from apps.integrations.models import Integration

    # Determine provider from model slug prefix
    if llm_model.startswith("openai/"):
        provider = "openai"
        model    = llm_model.split("/", 1)[1]
    elif llm_model.startswith("groq/"):
        provider = "groq"
        model    = llm_model.split("/", 1)[1]
    elif llm_model.startswith("anthropic/"):
        provider = "openai"   # Anthropic via compatible endpoint
        model    = llm_model.split("/", 1)[1]
    else:
        provider = "groq"
        model    = llm_model

    api_url = LLM_URLS.get(provider, GROQ_API_URL)

    # Try org's integration key
    try:
        integ = Integration.objects.get(
            organization=org, channel_type="ai_provider",
            status="connected", is_active=True,
        )
        cfg      = integ.config or {}
        int_prov = cfg.get("provider", "groq")
        if int_prov == provider and cfg.get("api_key"):
            return cfg["api_key"], api_url, model
    except Exception:
        pass

    # Env fallback
    import os
    key_map = {
        "groq":   os.environ.get("GROQ_API_KEY", ""),
        "openai": os.environ.get("OPENAI_API_KEY", ""),
    }
    return key_map.get(provider, ""), api_url, model


def call_llm_chat(api_key: str, api_url: str, model: str,
                  system: str, messages: list, max_tokens: int = 600) -> tuple[str, Optional[str]]:
    """OpenAI-compatible chat call. Returns (content, error)."""
    payload = json.dumps({
        "model": model,
        "messages": [{"role": "system", "content": system}] + messages,
        "temperature": 0.4,
        "max_tokens": max_tokens,
    }).encode("utf-8")

    req = urllib.request.Request(
        api_url,
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"].strip(), None
    except urllib.error.HTTPError as e:
        return "", f"LLM API error {e.code}: {e.read().decode('utf-8', errors='replace')[:200]}"
    except Exception as e:
        return "", str(e)


# ─── Full RAG chat ────────────────────────────────────────────────────────────

SYSTEM_TEMPLATE = """Eres {agent_name}, el asistente virtual de {company_name}.
Responde únicamente basándote en la información proporcionada. Si no sabes algo, dilo honestamente.
Sé conciso, amigable y profesional. Responde siempre en el mismo idioma del usuario.

{extra_prompt}

── INFORMACIÓN DISPONIBLE ──
{context}
────────────────────────────

REGLAS:
1. Nunca inventes datos, precios ni fechas que no estén en el contexto.
2. Si el usuario pregunta algo fuera del contexto, di: "No tengo esa información. Te recomiendo contactarnos directamente."
3. Mantén las respuestas breves (máximo 3-4 oraciones salvo que se pida más detalle).
"""


def chat_rag(widget, history: list[dict], user_message: str) -> tuple[str, list[dict]]:
    """
    Full RAG pipeline for a chat turn.

    Args:
        widget:       ChatbotWidget instance
        history:      list of {role, content} (prior messages in session)
        user_message: new user message

    Returns:
        (assistant_reply, sources_used)
        sources_used = [{section, snippet}]
    """
    org = widget.organization

    # ── 1. Get KB ─────────────────────────────────────────────────────────────
    try:
        from apps.kb.models import KnowledgeBase
        kb = KnowledgeBase.objects.get(organization=org)
    except Exception:
        kb = None

    # ── 2. Retrieve context ───────────────────────────────────────────────────
    sources_used = []
    context_text = ""

    if kb:
        openai_key = _get_openai_key(org)
        top_chunks = retrieve_context(kb, user_message, openai_key, top_k=4)
        if top_chunks:
            context_parts = []
            for chunk in top_chunks:
                snippet = chunk["text"][:300]
                context_parts.append(snippet)
                sources_used.append({
                    "section": chunk["section"],
                    "snippet": chunk["text"][:120] + ("…" if len(chunk["text"]) > 120 else ""),
                })
            context_text = "\n\n".join(context_parts)
        else:
            context_text = "No hay información disponible en la base de conocimiento."
    else:
        context_text = "No hay base de conocimiento configurada."

    # ── 3. Build system prompt ────────────────────────────────────────────────
    cfg        = widget.config or {}
    agent_name = cfg.get("agent_name") or widget.name or "Asistente"
    system     = SYSTEM_TEMPLATE.format(
        agent_name    = agent_name,
        company_name  = org.name,
        extra_prompt  = (widget.system_prompt or "").strip(),
        context       = context_text,
    )

    # ── 4. Build messages (keep last 6 turns for context) ────────────────────
    messages = list(history[-12:]) + [{"role": "user", "content": user_message}]

    # ── 5. Call LLM ──────────────────────────────────────────────────────────
    api_key, api_url, model = _resolve_llm(widget.llm_model, org)
    if not api_key:
        return (
            "Lo siento, no hay un proveedor de IA configurado. Contacta al administrador.",
            [],
        )

    reply, error = call_llm_chat(api_key, api_url, model, system, messages)
    if error:
        logger.error("chat_rag LLM error for widget %s: %s", widget.id, error)
        return "Lo siento, ocurrió un error al procesar tu consulta. Por favor intenta de nuevo.", []

    return reply, sources_used
