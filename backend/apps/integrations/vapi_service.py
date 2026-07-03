"""
Vapi API service — server-side calls using the organization's private API key.
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import requests
from django.conf import settings

VAPI_API_BASE = "https://api.vapi.ai"

SYSTEM_PROMPT_TEMPLATE = """Eres {agent_name}, el asistente de voz de {company_name}.
Tu función es atender clientes de forma natural y profesional en español latinoamericano.

━━━ CONOCIMIENTO DE LA EMPRESA ━━━

SOBRE NOSOTROS:
{company_info}

PRODUCTOS Y SERVICIOS:
{products_services}

PRECIOS:
{pricing}

HORARIO DE ATENCIÓN:
{working_hours}

INFORMACIÓN DE CONTACTO:
{contact_info}

PROCESO DE CITAS:
{appointment_rules}

PREGUNTAS FRECUENTES:
{faqs}

━━━ PREGUNTAS DE CALIFICACIÓN ━━━
Cuando corresponda, realiza estas preguntas de forma conversacional (nunca todas a la vez):
{qualification_questions}

━━━ REGLAS CRÍTICAS (seguir siempre) ━━━
1. NUNCA inventes información. Si no sabes algo: "Lo consultaré con mi equipo y te haré saber a la brevedad."
2. Si el cliente pide hablar con una persona, usa escalateToHuman de inmediato sin preguntar.
3. Si ocurre un error al procesar una acción, discúlpate y ofrece contacto alternativo: {whatsapp_number}
4. Tono: amable, profesional, conciso. Evita respuestas largas.
5. Al agendar cita, usa bookAppointment — queda pendiente de confirmación por el equipo.
6. Al completar calificación, usa qualifyLead para registrar los datos.
7. Al finalizar, despídete con: {farewell}
"""

VOICE_MAP = {
    # México
    "es-MX-NuriaNeural":    {"provider": "azure", "voiceId": "es-MX-NuriaNeural"},
    "es-MX-DaliaNeural":    {"provider": "azure", "voiceId": "es-MX-DaliaNeural"},
    "es-MX-CarlotaNeural":  {"provider": "azure", "voiceId": "es-MX-CarlotaNeural"},
    "es-MX-BeatrizNeural":  {"provider": "azure", "voiceId": "es-MX-BeatrizNeural"},
    "es-MX-LarissaNeural":  {"provider": "azure", "voiceId": "es-MX-LarissaNeural"},
    "es-MX-RenataNeural":   {"provider": "azure", "voiceId": "es-MX-RenataNeural"},
    "es-MX-MarinaNeural":   {"provider": "azure", "voiceId": "es-MX-MarinaNeural"},
    "es-MX-JorgeNeural":    {"provider": "azure", "voiceId": "es-MX-JorgeNeural"},
    "es-MX-GerardoNeural":  {"provider": "azure", "voiceId": "es-MX-GerardoNeural"},
    "es-MX-YagoNeural":     {"provider": "azure", "voiceId": "es-MX-YagoNeural"},
    # Guatemala
    "es-GT-MartaNeural":    {"provider": "azure", "voiceId": "es-GT-MartaNeural"},
    "es-GT-AndresNeural":   {"provider": "azure", "voiceId": "es-GT-AndresNeural"},
    # Colombia
    "es-CO-SalomeNeural":   {"provider": "azure", "voiceId": "es-CO-SalomeNeural"},
    "es-CO-GonzaloNeural":  {"provider": "azure", "voiceId": "es-CO-GonzaloNeural"},
    # Argentina
    "es-AR-ElenaNeural":    {"provider": "azure", "voiceId": "es-AR-ElenaNeural"},
    "es-AR-TomasNeural":    {"provider": "azure", "voiceId": "es-AR-TomasNeural"},
    # Chile
    "es-CL-CatalinaNeural": {"provider": "azure", "voiceId": "es-CL-CatalinaNeural"},
    "es-CL-LorenzoNeural":  {"provider": "azure", "voiceId": "es-CL-LorenzoNeural"},
    # España
    "es-ES-ElviraNeural":   {"provider": "azure", "voiceId": "es-ES-ElviraNeural"},
    "es-ES-AbrilNeural":    {"provider": "azure", "voiceId": "es-ES-AbrilNeural"},
    "es-ES-IreneNeural":    {"provider": "azure", "voiceId": "es-ES-IreneNeural"},
    "es-ES-AlvaroNeural":   {"provider": "azure", "voiceId": "es-ES-AlvaroNeural"},
    "es-ES-TeoNeural":      {"provider": "azure", "voiceId": "es-ES-TeoNeural"},
    # US Spanish
    "es-US-PalomaNeural":   {"provider": "azure", "voiceId": "es-US-PalomaNeural"},
    "es-US-AlonsoNeural":   {"provider": "azure", "voiceId": "es-US-AlonsoNeural"},
}


def _headers(api_key: str) -> dict:
    return {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}


def _build_system_prompt(widget, kb) -> str:
    cfg = widget.config or {}
    qs = kb.qualification_questions if kb else []
    qs_text = "\n".join(f"- {q}" for q in qs) if qs else "No aplica."
    return SYSTEM_PROMPT_TEMPLATE.format(
        agent_name            = cfg.get("agent_name", "Asistente"),
        company_name          = widget.organization.name,
        company_info          = (kb.company_info if kb else "") or "No disponible.",
        products_services     = (kb.products_services if kb else "") or "No disponible.",
        pricing               = (kb.pricing if kb else "") or "No disponible.",
        working_hours         = (kb.working_hours if kb else "") or "No especificado.",
        contact_info          = (kb.contact_info if kb else "") or "No disponible.",
        appointment_rules     = (kb.appointment_rules if kb else "") or "Consultar con el equipo.",
        faqs                  = (kb.faqs if kb else "") or "No disponible.",
        qualification_questions = qs_text,
        whatsapp_number       = (kb.whatsapp_number if kb else "") or "nuestro equipo",
        farewell              = cfg.get("farewell", "¡Hasta luego! Que tenga un excelente día."),
    )


def _build_tools(widget) -> list:
    # Set BACKEND_PUBLIC_URL in production via environment variable.
    backend_url = getattr(settings, "BACKEND_PUBLIC_URL", "http://localhost:8000")
    token = str(widget.token)
    base = f"{backend_url}/api/v1/voice-widget/tool"
    return [
        {
            "type": "function",
            "function": {
                "name": "bookAppointment",
                "description": "Agenda una cita en el calendario del equipo. Queda pendiente de confirmación. Informa al cliente que recibirá confirmación.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "caller_name":    {"type": "string",  "description": "Nombre completo del cliente"},
                        "caller_email":   {"type": "string",  "description": "Email del cliente"},
                        "caller_phone":   {"type": "string",  "description": "Teléfono del cliente"},
                        "preferred_date": {"type": "string",  "description": "Fecha preferida (ej: 2025-07-15 o 'lunes próximo')"},
                        "preferred_time": {"type": "string",  "description": "Hora preferida (ej: 10:00 AM)"},
                        "service_type":   {"type": "string",  "description": "Tipo de servicio o motivo de la cita"},
                        "notes":          {"type": "string",  "description": "Notas adicionales"},
                    },
                    "required": ["caller_name", "preferred_date"],
                },
            },
            "server": {"url": f"{base}/book-appointment/?token={token}"},
        },
        {
            "type": "function",
            "function": {
                "name": "escalateToHuman",
                "description": "Transfiere a un agente humano vía WhatsApp. Usar si el cliente lo pide o si no puedes resolver la consulta.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "caller_name":  {"type": "string", "description": "Nombre del cliente"},
                        "caller_phone": {"type": "string", "description": "Teléfono del cliente"},
                        "reason":       {"type": "string", "description": "Motivo del escalado"},
                        "summary":      {"type": "string", "description": "Resumen de la conversación"},
                    },
                    "required": ["reason"],
                },
            },
            "server": {"url": f"{base}/escalate/?token={token}"},
        },
        {
            "type": "function",
            "function": {
                "name": "qualifyLead",
                "description": "Registra los datos de calificación del lead al completar las preguntas.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "caller_name":  {"type": "string"},
                        "caller_email": {"type": "string"},
                        "caller_phone": {"type": "string"},
                        "answers":      {"type": "object", "description": "Respuestas a las preguntas de calificación"},
                        "is_qualified": {"type": "boolean", "description": "¿El lead cumple los criterios?"},
                        "notes":        {"type": "string"},
                    },
                    "required": ["answers"],
                },
            },
            "server": {"url": f"{base}/qualify/?token={token}"},
        },
    ]


def _build_model_config(llm_model: str, system_prompt: str, tools: list) -> dict:
    """Returns Vapi model config dict based on llm_model string 'provider/model-name'."""
    parts    = llm_model.split("/", 1)
    provider = parts[0] if len(parts) == 2 else "groq"
    model    = parts[1] if len(parts) == 2 else llm_model
    return {
        "provider":     provider,
        "model":        model,
        "messages": [{"role": "system", "content": system_prompt}],
        "temperature":  0.6,
        "tools":        tools,
    }


def create_or_update_assistant(widget, kb, api_key: str) -> str:
    """
    Creates or updates a Vapi assistant for the given widget + knowledge base.
    Returns the assistant ID (string).
    """
    cfg          = widget.config or {}
    voice_key    = cfg.get("voice", "es-MX-NuriaNeural")
    voice_config = VOICE_MAP.get(voice_key, {"provider": "azure", "voiceId": "es-MX-NuriaNeural"})
    system_prompt = widget.system_prompt.strip() if widget.system_prompt and widget.system_prompt.strip() else _build_system_prompt(widget, kb)
    tools         = _build_tools(widget)

    payload = {
        "name":           f"OptimizaCRM – {widget.organization.name}",
        "firstMessage":   cfg.get(
            "greeting",
            f"Hola, soy {cfg.get('agent_name', 'el asistente')} de {widget.organization.name}. ¿En qué puedo ayudarte hoy?",
        ),
        "endCallMessage": cfg.get("farewell", "¡Hasta luego! Que tenga un excelente día."),
        "model":          _build_model_config(widget.llm_model, system_prompt, tools),
        "voice":          voice_config,
        "transcriber": {
            "provider": "deepgram",
            "language": "es",
        },
        "silenceTimeoutSeconds":      30,
        "maxDurationSeconds":         600,
        "backgroundSound":            "off",
        "backchannelingEnabled":      False,
        "backgroundDenoisingEnabled": True,
        "analysisPlan": {
            "summaryPrompt": (
                "Eres un asistente de CRM. Resume la llamada en español en 2-3 oraciones: "
                "qué quería el cliente, qué se resolvió y cuál es el siguiente paso."
            ),
            "structuredDataPrompt": (
                "Extrae los datos de la conversación en el formato JSON indicado. "
                "Si un dato no fue mencionado, usa null. "
                "qualification_score va de 1 (mínimo interés) a 10 (listo para comprar)."
            ),
            "structuredDataSchema": {
                "type": "object",
                "properties": {
                    "lead_name":           {"type": "string",  "description": "Nombre completo del cliente"},
                    "lead_email":          {"type": "string",  "description": "Email del cliente"},
                    "lead_phone":          {"type": "string",  "description": "Teléfono del cliente"},
                    "company":             {"type": "string",  "description": "Empresa u organización del cliente"},
                    "intent":              {"type": "string",  "description": "Intención principal del cliente en la llamada"},
                    "is_interested":       {"type": "boolean", "description": "¿El cliente mostró interés real?"},
                    "qualification_score": {"type": "integer", "description": "Puntuación de calificación del lead (1-10)"},
                    "budget_mentioned":    {"type": "string",  "description": "Presupuesto o rango de precio mencionado"},
                    "timeline":            {"type": "string",  "description": "Urgencia o plazo mencionado por el cliente"},
                    "objections":          {
                        "type": "array", "items": {"type": "string"},
                        "description": "Objeciones o dudas planteadas por el cliente",
                    },
                    "follow_up_action":    {"type": "string",  "description": "Próximo paso acordado o recomendado"},
                    "appointment_date":    {"type": "string",  "description": "Fecha/hora de cita agendada, si aplica"},
                    "summary_es":          {"type": "string",  "description": "Resumen de la llamada en español (2-3 oraciones)"},
                },
                "required": ["is_interested", "qualification_score", "summary_es"],
            },
            "successEvaluationPrompt": (
                "La llamada fue exitosa si el cliente mostró interés, proporcionó datos de contacto "
                "o agendó una cita. Responde solo 'true' o 'false'."
            ),
            "successEvaluationRubric": "PassFail",
        },
    }

    if widget.vapi_assistant_id:
        # Try to update the existing assistant
        r = requests.patch(
            f"{VAPI_API_BASE}/assistant/{widget.vapi_assistant_id}",
            headers=_headers(api_key),
            json=payload,
            timeout=15,
        )
        if r.status_code in (403, 404):
            # The assistant belongs to a different Vapi account (e.g. key was rotated).
            # Fall back to creating a fresh assistant under the current key.
            r = requests.post(
                f"{VAPI_API_BASE}/assistant",
                headers=_headers(api_key),
                json=payload,
                timeout=15,
            )
    else:
        # Create new assistant
        r = requests.post(
            f"{VAPI_API_BASE}/assistant",
            headers=_headers(api_key),
            json=payload,
            timeout=15,
        )

    if not r.ok:
        try:
            detail = r.json()
        except Exception:
            detail = r.text
        raise Exception(f"Vapi {r.status_code}: {detail}")

    data = r.json()
    return data["id"]


def delete_assistant(assistant_id: str, api_key: str) -> None:
    """Deletes a Vapi assistant by ID. Errors are silently ignored."""
    try:
        requests.delete(
            f"{VAPI_API_BASE}/assistant/{assistant_id}",
            headers=_headers(api_key),
            timeout=10,
        )
    except Exception:
        pass
