"""
Optimiza-CRM – Integrations async tasks
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import json
import logging

from celery import shared_task

logger = logging.getLogger(__name__)

# ─── Structured output schema (mirrors Vapi analysisPlan) ────────────────────

_EXTRACTION_SYSTEM = """Eres un asistente especializado en análisis de conversaciones de ventas para CRM.
Tu única función es extraer datos estructurados de transcripts de llamadas en español.
Devuelve EXCLUSIVAMENTE un objeto JSON válido, sin texto adicional, sin bloques de código."""

_EXTRACTION_SCHEMA_DESC = """Extrae del transcript el siguiente JSON:
{
  "lead_name":           string | null,   // Nombre completo del cliente
  "lead_email":          string | null,   // Email del cliente
  "lead_phone":          string | null,   // Teléfono del cliente
  "company":             string | null,   // Empresa u organización del cliente
  "intent":              string | null,   // Intención principal de la llamada
  "is_interested":       boolean,         // ¿El cliente mostró interés real?
  "qualification_score": integer,         // Calificación 1-10 (10 = listo para comprar)
  "budget_mentioned":    string | null,   // Presupuesto o rango mencionado
  "timeline":            string | null,   // Urgencia o plazo mencionado
  "objections":          string[],        // Lista de objeciones o dudas
  "follow_up_action":    string | null,   // Próximo paso acordado
  "appointment_date":    string | null,   // Fecha/hora de cita agendada
  "summary_es":          string           // Resumen en español (2-3 oraciones)
}

Reglas:
- qualification_score: 1-3 (sin interés), 4-6 (interés moderado), 7-8 (calificado), 9-10 (listo).
- Si el cliente no proporcionó un dato, usa null.
- summary_es debe ser conciso: qué quería el cliente, qué se resolvió, cuál es el siguiente paso.
- Devuelve SOLO el JSON, sin explicaciones."""


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def enrich_voice_call(self, call_id: int):
    """
    Post-call enrichment: runs LLM extraction on the call transcript to populate
    VoiceCall.structured_output and optionally update the linked Lead.
    """
    try:
        from .models import VoiceCall  # noqa: PLC0415
        call = VoiceCall.objects.select_related(
            "widget", "widget__organization", "lead",
        ).get(pk=call_id)
    except Exception as exc:
        logger.error("enrich_voice_call: call %s not found — %s", call_id, exc)
        return

    transcript = call.transcript or ""
    if not transcript.strip():
        logger.info("enrich_voice_call: call %s has no transcript, skipping", call_id)
        return

    org = call.widget.organization

    # ── Get AI config for this org ────────────────────────────────────────────
    try:
        from apps.ai_integration.views import _get_ai_config, _call_llm  # noqa: PLC0415
        api_key, api_url, model = _get_ai_config()
    except Exception as exc:
        logger.error("enrich_voice_call: could not get AI config — %s", exc)
        return

    if not api_key:
        logger.info("enrich_voice_call: no AI key configured for org %s", org.id)
        return

    user_text = f"TRANSCRIPT DE LA LLAMADA:\n\n{transcript}"

    result_text, error = _call_llm(
        api_key, api_url, model,
        _EXTRACTION_SYSTEM,
        f"{_EXTRACTION_SCHEMA_DESC}\n\n{user_text}",
        temperature=0.1,
        max_tokens=800,
    )

    if error:
        logger.error("enrich_voice_call: LLM error for call %s — %s", call_id, error)
        try:
            self.retry(exc=Exception(error))
        except self.MaxRetriesExceededError:
            pass
        return

    # ── Parse JSON response ───────────────────────────────────────────────────
    try:
        # Strip markdown code fences if present
        cleaned = result_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        structured = json.loads(cleaned.strip())
    except Exception as exc:
        logger.error("enrich_voice_call: JSON parse error for call %s — %s\nRaw: %s", call_id, exc, result_text)
        return

    # ── Save structured output to VoiceCall ──────────────────────────────────
    VoiceCall.objects.filter(pk=call_id).update(
        structured_output=structured,
        sentiment=_score_to_sentiment(structured.get("qualification_score")),
        summary=structured.get("summary_es") or call.transcript[:300],
    )

    # ── Auto-update linked Lead if interested ─────────────────────────────────
    if structured.get("is_interested") and call.lead_id:
        _update_lead(call.lead_id, structured)
    elif structured.get("is_interested") and not call.lead_id:
        _create_or_link_lead(call, structured, org)

    logger.info("enrich_voice_call: call %s enriched successfully", call_id)


def _score_to_sentiment(score) -> str:
    try:
        s = int(score)
    except (TypeError, ValueError):
        return ""
    if s >= 7:
        return "positive"
    if s >= 4:
        return "neutral"
    return "negative"


def _update_lead(lead_id: int, data: dict):
    """Enriches an existing Lead with structured output data."""
    try:
        from apps.crm.models import Lead  # noqa: PLC0415
        lead = Lead.objects.get(pk=lead_id)
        changed = False

        if data.get("lead_email") and not lead.email:
            lead.email = data["lead_email"]
            changed = True
        if data.get("lead_phone") and not lead.phone:
            lead.phone = data["lead_phone"]
            changed = True
        if data.get("company") and not lead.company:
            lead.company = data["company"]
            changed = True

        # Upgrade status to qualified if score >= 7
        score = data.get("qualification_score")
        if score and int(score) >= 7 and lead.status == "new":
            lead.status = "qualified"
            changed = True

        if data.get("summary_es"):
            note = f"[Agente de Voz] {data['summary_es']}"
            if data.get("follow_up_action"):
                note += f"\nSiguiente paso: {data['follow_up_action']}"
            lead.notes = (lead.notes + "\n\n" + note).strip() if lead.notes else note
            changed = True

        if changed:
            lead.save()
    except Exception as exc:
        logger.error("_update_lead: error updating lead %s — %s", lead_id, exc)


def _create_or_link_lead(call, data: dict, org):
    """Creates or deduplicates a Lead from structured output and links it to the VoiceCall."""
    try:
        from apps.crm.models import Lead  # noqa: PLC0415

        name_parts = (data.get("lead_name") or call.caller_name or "Lead de Voz").split(" ", 1)
        first_name = name_parts[0]
        last_name  = name_parts[1] if len(name_parts) > 1 else ""

        note = ""
        if data.get("summary_es"):
            note = f"[Agente de Voz] {data['summary_es']}"
        if data.get("follow_up_action"):
            note += f"\nSiguiente paso: {data['follow_up_action']}"
        if data.get("objections"):
            note += f"\nObjeciones: {', '.join(data['objections'])}"

        score = data.get("qualification_score") or 0
        status = "qualified" if int(score) >= 7 else "contacted"

        phone = data.get("lead_phone") or call.caller_phone or ""
        email = data.get("lead_email") or ""

        # Try dedup by real Vapi caller phone stored in custom_fields
        lead = None
        vapi_caller_phone = call.caller_phone  # caller_phone on VoiceCall holds the PSTN number
        if vapi_caller_phone:
            lead = Lead.objects.filter(
                organization=org,
                custom_fields__vapi_caller_phone=vapi_caller_phone,
            ).first()

        if lead is None and email:
            lead = Lead.objects.filter(organization=org, email=email).first()

        if lead is None and phone:
            lead = Lead.objects.filter(organization=org, phone=phone).first()

        if lead:
            _update_lead(lead.pk, data)
        else:
            cf = {}
            if vapi_caller_phone:
                cf["vapi_caller_phone"] = vapi_caller_phone
            lead = Lead.objects.create(
                organization  = org,
                first_name    = first_name,
                last_name     = last_name,
                email         = email,
                phone         = phone,
                company       = data.get("company") or "",
                source        = "voice_agent",
                status        = status,
                notes         = note.strip(),
                custom_fields = cf,
            )
            logger.info("_create_or_link_lead: created lead %s for call %s", lead.pk, call.pk)

        VoiceCall.objects.filter(pk=call.pk).update(lead=lead)
    except Exception as exc:
        logger.error("_create_or_link_lead: error for call %s — %s", call.pk, exc)
