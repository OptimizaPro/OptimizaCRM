"""
Lead capture state machine for ChatBot RAG.

Flow (when capture_lead enabled in widget.config):
  1. First user message → ask_name  (skip RAG — only ask for name)
  2. User gives name → ask_phone
  3. User gives phone → ask_email  + create Lead with OPT-XXXX
  4. User gives email → active     + update Lead email + ask killer question
  5. Returning lead: user sends "OPT-XXXX" → look up existing lead → active

OPT-XXXX format: "OPT-" + 4 unambiguous alphanumeric chars (no 0/O/1/I/L).
"""

import random
import logging
import re

logger = logging.getLogger(__name__)

# Unambiguous chars: exclude 0, O, 1, I, L
_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


# ── Ref ID helpers ────────────────────────────────────────────────────────────

def _gen_ref_id() -> str:
    return "OPT-" + "".join(random.choices(_CHARS, k=4))


def _unique_ref_id(org) -> str:
    from apps.crm.models import Lead
    for _ in range(20):
        ref = _gen_ref_id()
        if not Lead.objects.filter(organization=org, lead_ref_id=ref).exists():
            return ref
    return "OPT-" + "".join(random.choices(_CHARS, k=6))


def _is_ref_id(text: str) -> bool:
    return bool(re.match(r'^OPT-[A-Z2-9]{4,6}$', text.strip().upper()))


def _find_lead_by_ref(org, ref_id: str):
    from apps.crm.models import Lead
    return Lead.objects.filter(organization=org, lead_ref_id=ref_id.strip().upper()).first()


def _create_lead(org, name: str, phone: str):
    from apps.crm.models import Lead
    ref_id = _unique_ref_id(org)
    parts  = name.strip().split(None, 1)
    first  = parts[0]
    last   = parts[1] if len(parts) > 1 else ""
    return Lead.objects.create(
        organization=org,
        first_name=first,
        last_name=last,
        phone=phone.strip(),
        source="chatbot",
        status="new",
        lead_ref_id=ref_id,
    )


# ── Killer question from KB ───────────────────────────────────────────────────

def _get_killer_question(widget) -> str | None:
    """Return the first qualification question from the org's KB, or None."""
    try:
        from apps.kb.models import KnowledgeBase
        kb = KnowledgeBase.objects.get(organization=widget.organization)
        qs = kb.qualification_questions
        if qs and isinstance(qs, list):
            for q in qs:
                if q and str(q).strip():
                    return str(q).strip()
    except Exception:
        pass
    return None


# ── Response templates ────────────────────────────────────────────────────────

def _ask_name_msg(welcome: str = "") -> str:
    intro = f"{welcome}\n\n" if welcome else ""
    return (
        f"{intro}Para atenderte mejor y poder darte seguimiento personalizado, "
        "¿me puedes decir tu nombre?"
    )


def _ask_phone_msg(name: str) -> str:
    return (
        f"¡Mucho gusto, {name}! "
        "¿Cuál es tu número de teléfono? (Lo usaremos solo para contactarte si necesitas ayuda)"
    )


def _ask_email_msg() -> str:
    return (
        "Perfecto, casi terminamos. "
        "¿Tienes un correo electrónico donde podamos enviarte información? "
        "(Escribe «no» para omitir)"
    )


def _lead_created_msg(ref_id: str, name: str, killer_q: str | None = None) -> str:
    msg = (
        f"¡Listo, {name}! ✅ He registrado tus datos.\n\n"
        f"Tu código de referencia personal es **{ref_id}** — "
        "guárdalo para futuras consultas y te identificaremos de inmediato.\n\n"
    )
    if killer_q:
        msg += killer_q
    else:
        msg += "Ahora cuéntame, ¿en qué puedo ayudarte hoy?"
    return msg


def _returning_lead_msg(name: str, ref_id: str) -> str:
    return (
        f"¡Bienvenido de vuelta, {name}! 👋 "
        f"He encontrado tu registro ({ref_id}). ¿En qué puedo ayudarte hoy?"
    )


# ── Main entry point ──────────────────────────────────────────────────────────

def process_capture(
    session,
    message: str,
    is_first_exchange: bool,
    org,
    widget=None,
) -> tuple[str | None, bool]:
    """
    Process the lead capture state machine.

    Returns:
        (capture_reply, should_skip_rag)
        - capture_reply: str if the bot should reply with this instead of (or in addition to) RAG
        - should_skip_rag: True  → use ONLY capture_reply, do not run RAG
                           False → append capture_reply AFTER the RAG response
    """
    state = session.capture_state

    # ── Returning lead detection (any state, any message) ─────────────────────
    if _is_ref_id(message):
        ref  = message.strip().upper()
        lead = _find_lead_by_ref(org, ref)
        if lead:
            session.capture_state = "active"
            session.lead = lead
            session.save(update_fields=["capture_state", "lead"])
            return _returning_lead_msg(lead.first_name, ref), True
        # ref not found → treat as normal message, fall through

    # ── State: init → first user message triggers name capture ───────────────
    if state == "init":
        if is_first_exchange:
            session.capture_state = "ask_name"
            session.save(update_fields=["capture_state"])
            # skip_rag=True: ONLY ask for name, don't answer the user's question yet
            return _ask_name_msg(), True
        # Non-first exchange but still in init (edge case): just skip capture
        session.capture_state = "skip"
        session.save(update_fields=["capture_state"])
        return None, False

    # ── State: ask_name → collect name ───────────────────────────────────────
    if state == "ask_name":
        name = message.strip()
        if len(name) < 2:
            return "Disculpa, ¿podrías decirme tu nombre completo?", True
        data = session.lead_data or {}
        data["name"] = name
        session.lead_data = data
        session.capture_state = "ask_phone"
        session.save(update_fields=["lead_data", "capture_state"])
        return _ask_phone_msg(name), True

    # ── State: ask_phone → collect phone, create lead ────────────────────────
    if state == "ask_phone":
        phone  = message.strip()
        digits = re.sub(r'\D', '', phone)
        if len(digits) < 6:
            return (
                "Necesito un número de teléfono válido (mínimo 6 dígitos). "
                "¿Cuál es tu número de teléfono?", True
            )
        data = session.lead_data or {}
        data["phone"] = phone
        session.lead_data = data
        try:
            lead = _create_lead(org, data.get("name", "Sin nombre"), phone)
            session.lead = lead
            session.capture_state = "ask_email"
            session.save(update_fields=["lead_data", "capture_state", "lead"])
        except Exception as exc:
            logger.error("lead_capture _create_lead error: %s", exc)
            session.capture_state = "active"
            session.save(update_fields=["lead_data", "capture_state"])
            return "Gracias. ¿En qué puedo ayudarte?", True
        return _ask_email_msg(), True

    # ── State: ask_email → collect email, show OPT code, ask killer Q ────────
    if state == "ask_email":
        raw        = message.strip()
        skip_email = raw.lower() in ("no", "no tengo", "sin correo", "omitir", "skip", "-", "n/a")
        email      = "" if skip_email else raw
        data       = session.lead_data or {}
        data["email"] = email
        session.lead_data = data
        session.capture_state = "active"
        session.save(update_fields=["lead_data", "capture_state"])

        if session.lead and email and "@" in email:
            try:
                session.lead.email = email
                session.lead.save(update_fields=["email"])
            except Exception:
                pass

        ref_id   = session.lead.lead_ref_id if session.lead else ""
        name     = (data.get("name") or "").split()[0] if data.get("name") else "Cliente"
        killer_q = _get_killer_question(widget) if widget else None
        return _lead_created_msg(ref_id, name, killer_q), True

    # ── State: active / skip → no interception ───────────────────────────────
    return None, False


# ── Intent analysis ───────────────────────────────────────────────────────────

def analyze_intent(session, widget) -> dict:
    """
    LLM call to classify conversation intent: high / medium / low.
    Persists result on session and returns the dict.
    """
    from apps.chatbot.rag_service import call_llm_chat, _resolve_llm
    import json as _json

    msgs = list(session.messages.order_by("created_at")[:20])
    if not msgs:
        return {}

    transcript = "\n".join(
        f"{'Usuario' if m.role == 'user' else 'Asistente'}: {m.content}"
        for m in msgs
    )

    system = (
        "Eres un analista de intención de compra. "
        "Analiza la conversación y responde ÚNICAMENTE en JSON con este formato exacto:\n"
        '{"level":"high|medium|low","topics":["tema1","tema2"],"summary":"resumen en una frase"}\n'
        "level: high=listo para comprar/cotizar, medium=interesado explorando, low=curiosidad o soporte."
    )
    messages = [
        {"role": "user", "content": f"Conversación:\n{transcript}\n\nResponde solo el JSON."}
    ]

    try:
        api_key, api_url, model = _resolve_llm(widget.llm_model, widget.organization)
        if not api_key:
            return {}
        reply, err = call_llm_chat(api_key, api_url, model, system, messages, max_tokens=200)
    except Exception as exc:
        logger.warning("intent analysis LLM error: %s", exc)
        return {}

    if err or not reply:
        return {}

    try:
        clean = reply.strip()
        if clean.startswith("```"):
            clean = re.sub(r'^```[a-z]*\n?', '', clean)
            clean = re.sub(r'\n?```$', '', clean.strip())
        data    = _json.loads(clean)
        level   = data.get("level", "")[:10]
        topics  = data.get("topics", [])
        summary = data.get("summary", "")[:500]
        session.intent_level   = level
        session.intent_topics  = topics if isinstance(topics, list) else []
        session.intent_summary = summary
        session.save(update_fields=["intent_level", "intent_topics", "intent_summary"])
        return {"level": level, "topics": topics, "summary": summary}
    except Exception as exc:
        logger.warning("intent analysis parse error: %s | reply: %s", exc, reply[:200])
        return {}
