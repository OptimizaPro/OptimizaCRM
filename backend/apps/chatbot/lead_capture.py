"""
Lead capture state machine for ChatBot RAG.

Flow (when capture_lead enabled in widget.config):

  RETURNING LEAD:
    init → ask_id → [OPT-XXXX found] → ask_killer → active

  NEW LEAD:
    init → ask_id → [new/no ID] → ask_name → ask_phone → ask_email
         → ask_company → ask_killer → active

  States:
    init        First user message arrives — transition to ask_id
    ask_id      Ask for reference ID (OPT-XXXX) or "nuevo"
    ask_name    Collect full name
    ask_phone   Collect phone (required — Lead created here)
    ask_email   Collect email (optional)
    ask_company Collect company (optional) — lead updated
    ask_killer  Ask qualification question(s) from KB — intent scored after answer
    active      Normal RAG mode
    skip        Capture disabled mid-session
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


def _create_lead(org, name: str, phone: str) -> "Lead":
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


# ── KB qualification questions ────────────────────────────────────────────────

def _get_killer_questions(widget) -> list[str]:
    """Return all non-empty qualification questions from the org's KB."""
    try:
        from apps.kb.models import KnowledgeBase
        kb = KnowledgeBase.objects.get(organization=widget.organization)
        qs = kb.qualification_questions
        if qs and isinstance(qs, list):
            return [str(q).strip() for q in qs if q and str(q).strip()]
    except Exception:
        pass
    return []


def _next_killer_question(widget, answered_idx: int) -> str | None:
    """Return the next killer question after `answered_idx`, or None if done."""
    questions = _get_killer_questions(widget)
    next_idx  = answered_idx + 1
    if next_idx < len(questions):
        return questions[next_idx]
    return None


def _first_killer_question(widget) -> str | None:
    questions = _get_killer_questions(widget)
    return questions[0] if questions else None


# ── Intent analysis + score update ───────────────────────────────────────────

def _score_from_intent(level: str) -> int:
    return {"high": 80, "medium": 50, "low": 20}.get(level, 0)


def run_intent_and_score(session, widget) -> None:
    """Run intent analysis and update lead score if score is still 0."""
    result = analyze_intent(session, widget)
    if result and session.lead and session.lead.score == 0:
        score = _score_from_intent(result.get("level", ""))
        if score:
            try:
                from apps.crm.models import Lead
                Lead.objects.filter(pk=session.lead.pk).update(score=score)
                session.lead.score = score
            except Exception as exc:
                logger.warning("lead score update error: %s", exc)


# ── Response templates ────────────────────────────────────────────────────────

def _ask_id_msg() -> str:
    return (
        "Para atenderte mejor, ¿tienes un código de referencia de una consulta anterior? "
        "(Formato: OPT-XXXX)\n\n"
        "Si es tu primera vez, escribe **nuevo**."
    )


def _ask_name_msg() -> str:
    return "¡Perfecto! Para registrarte, ¿cuál es tu nombre completo?"


def _ask_phone_msg(name: str) -> str:
    return (
        f"¡Mucho gusto, {name}! "
        "¿Cuál es tu número de teléfono? "
        "(Lo usaremos solo para contactarte si necesitas ayuda)"
    )


def _ask_email_msg() -> str:
    return (
        "¿Tienes un correo electrónico donde podamos enviarte información? "
        "(Escribe «no» para omitir)"
    )


def _ask_company_msg() -> str:
    return "¿A qué empresa o negocio perteneces? (Escribe «no» si no aplica)"


def _lead_created_msg(ref_id: str, name: str, killer_q: str | None) -> str:
    msg = (
        f"¡Listo, {name}! ✅ He registrado tus datos.\n\n"
        f"Tu código de referencia personal es **{ref_id}** — "
        "guárdalo para que te identifiquemos en futuras consultas.\n\n"
    )
    if killer_q:
        msg += killer_q
    else:
        msg += "Ahora cuéntame, ¿en qué puedo ayudarte?"
    return msg


def _returning_lead_msg(name: str, ref_id: str, killer_q: str | None) -> str:
    base = (
        f"¡Bienvenido de vuelta, {name}! 👋 "
        f"He encontrado tu registro ({ref_id}).\n\n"
    )
    if killer_q:
        return base + killer_q
    return base + "¿En qué puedo ayudarte hoy?"


def _id_not_found_msg(ref: str) -> str:
    return (
        f"No encontré el código **{ref}** en nuestros registros. "
        "¿Puedes verificarlo? Si no lo tienes, escribe **nuevo** para registrarte."
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
        skip_rag=True  → use ONLY capture_reply (don't run RAG)
        skip_rag=False → run RAG (capture_reply is None)
    """
    state = session.capture_state
    msg   = message.strip()

    # ── State: init → ask for ID on first exchange ────────────────────────────
    if state == "init":
        if is_first_exchange:
            session.capture_state = "ask_id"
            session.save(update_fields=["capture_state"])
            return _ask_id_msg(), True
        # Edge case: non-first message still in init → skip capture
        session.capture_state = "skip"
        session.save(update_fields=["capture_state"])
        return None, False

    # ── State: ask_id → check for OPT-XXXX or "new" ──────────────────────────
    if state == "ask_id":
        if _is_ref_id(msg):
            lead = _find_lead_by_ref(org, msg)
            if lead:
                killer_q = _first_killer_question(widget) if widget else None
                data     = session.lead_data or {}
                data["killer_q_idx"] = 0
                session.lead          = lead
                session.lead_data     = data
                session.capture_state = "ask_killer" if killer_q else "active"
                session.save(update_fields=["capture_state", "lead", "lead_data"])
                return _returning_lead_msg(lead.first_name, lead.lead_ref_id, killer_q), True
            else:
                # ID not found — stay in ask_id, let user try again or say "nuevo"
                return _id_not_found_msg(msg), True

        # "nuevo" / "no" / anything else → start new lead capture
        session.capture_state = "ask_name"
        session.save(update_fields=["capture_state"])
        return _ask_name_msg(), True

    # ── State: ask_name → collect name ───────────────────────────────────────
    if state == "ask_name":
        name = msg
        if len(name) < 2:
            return "Disculpa, ¿podrías decirme tu nombre completo?", True
        data = session.lead_data or {}
        data["name"] = name
        session.lead_data     = data
        session.capture_state = "ask_phone"
        session.save(update_fields=["lead_data", "capture_state"])
        return _ask_phone_msg(name), True

    # ── State: ask_phone → collect phone, create Lead ────────────────────────
    if state == "ask_phone":
        digits = re.sub(r'\D', '', msg)
        if len(digits) < 6:
            return (
                "Necesito un número de teléfono válido (mínimo 6 dígitos). "
                "¿Cuál es tu número?", True,
            )
        data = session.lead_data or {}
        data["phone"] = msg
        session.lead_data = data
        try:
            lead = _create_lead(org, data.get("name", "Sin nombre"), msg)
            session.lead          = lead
            session.capture_state = "ask_email"
            session.save(update_fields=["lead_data", "capture_state", "lead"])
        except Exception as exc:
            logger.error("lead_capture _create_lead error: %s", exc)
            session.capture_state = "active"
            session.save(update_fields=["lead_data", "capture_state"])
            return "Gracias. ¿En qué puedo ayudarte?", True
        return _ask_email_msg(), True

    # ── State: ask_email → collect email (optional) ───────────────────────────
    if state == "ask_email":
        skip = msg.lower() in ("no", "no tengo", "sin correo", "omitir", "skip", "-", "n/a")
        if not skip and "@" in msg:
            try:
                session.lead.email = msg
                session.lead.save(update_fields=["email"])
            except Exception:
                pass
            data = session.lead_data or {}
            data["email"] = msg
            session.lead_data = data
        session.capture_state = "ask_company"
        session.save(update_fields=["lead_data", "capture_state"])
        return _ask_company_msg(), True

    # ── State: ask_company → collect company (optional) ──────────────────────
    if state == "ask_company":
        skip = msg.lower() in ("no", "ninguna", "n/a", "-", "sin empresa", "omitir")
        if not skip and len(msg) >= 2:
            try:
                session.lead.company = msg
                session.lead.save(update_fields=["company"])
            except Exception:
                pass
            data = session.lead_data or {}
            data["company"] = msg
            session.lead_data = data

        # Move to killer question or active
        killer_q = _first_killer_question(widget) if widget else None
        if killer_q:
            data = session.lead_data or {}
            data["killer_q_idx"] = 0
            session.lead_data     = data
            session.capture_state = "ask_killer"
            session.save(update_fields=["lead_data", "capture_state"])
            ref_id = session.lead.lead_ref_id if session.lead else ""
            name   = (session.lead_data.get("name") or "").split()[0] or "Cliente"
            return _lead_created_msg(ref_id, name, killer_q), True
        else:
            # No killer questions → go active immediately
            ref_id = session.lead.lead_ref_id if session.lead else ""
            name   = (session.lead_data.get("name") or "").split()[0] or "Cliente"
            session.capture_state = "active"
            session.save(update_fields=["lead_data", "capture_state"])
            return _lead_created_msg(ref_id, name, None), True

    # ── State: ask_killer → record answer, ask next Q or go active ────────────
    if state == "ask_killer":
        # Save this answer
        data        = session.lead_data or {}
        answers     = data.get("killer_answers", [])
        q_idx       = data.get("killer_q_idx", 0)
        answers.append({"q_idx": q_idx, "answer": msg})
        data["killer_answers"] = answers

        # Is there another question?
        next_q = _next_killer_question(widget, q_idx) if widget else None
        if next_q:
            data["killer_q_idx"] = q_idx + 1
            session.lead_data = data
            session.save(update_fields=["lead_data"])
            return next_q, True
        else:
            # All questions answered → go active, run intent analysis
            session.lead_data     = data
            session.capture_state = "active"
            session.save(update_fields=["lead_data", "capture_state"])
            try:
                if widget:
                    run_intent_and_score(session, widget)
            except Exception as exc:
                logger.warning("killer Q intent analysis failed: %s", exc)
            # Hand off to RAG now
            return None, False

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
