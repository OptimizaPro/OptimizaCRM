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

━━━ RECOPILACIÓN DE DATOS (obligatorio en cada llamada) ━━━
Durante la conversación, recoge SIEMPRE estos datos del cliente de forma natural:
- NOMBRE COMPLETO — si el cliente no se presenta, pregunta: "¿Con quién tengo el gusto?"
- TELÉFONO DE CONTACTO — pregunta: "¿A qué número te podemos llamar si se corta?" (clave para el seguimiento)
- EMAIL — pide si el cliente quiere recibir información por correo o confirmar una cita
- EMPRESA O NEGOCIO — pregunta si el contexto es empresarial o profesional

No preguntes todos a la vez. Intégralos de forma conversacional y natural.
IMPORTANTE: Antes de invocar qualifyLead o bookAppointment asegúrate de tener al menos el nombre y el teléfono del cliente.

━━━ PREGUNTAS DE CALIFICACIÓN ━━━
Cuando corresponda, realiza estas preguntas de forma conversacional (nunca todas a la vez):
{qualification_questions}

━━━ REGLAS CRÍTICAS (seguir siempre) ━━━
1. NUNCA inventes información. Si no sabes algo: "Lo consultaré con mi equipo y te haré saber a la brevedad."
2. Si el cliente pide hablar con una persona, usa transferToHuman (si disponible) o escalateToHuman de inmediato sin preguntar.
3. Si ocurre un error al procesar una acción, discúlpate y ofrece contacto alternativo: {whatsapp_number}
4. Tono: amable, profesional, conciso. Evita respuestas largas.
5. Al agendar cita, usa bookAppointment — queda pendiente de confirmación por el equipo.
6. Al completar calificación, usa qualifyLead para registrar los datos.
7. Al finalizar, despídete con: {farewell}
"""

VOICE_MAP = {
    "es-MX-NuriaNeural":  {"provider": "azure", "voiceId": "es-MX-NuriaNeural"},
    "es-MX-JorgeNeural":  {"provider": "azure", "voiceId": "es-MX-JorgeNeural"},
    "es-MX-DaliaNeural":  {"provider": "azure", "voiceId": "es-MX-DaliaNeural"},
    "es-ES-ElviraNeural": {"provider": "azure", "voiceId": "es-ES-ElviraNeural"},
    "es-GT-MartaNeural":  {"provider": "azure", "voiceId": "es-GT-MartaNeural"},
    "es-GT-AndresNeural": {"provider": "azure", "voiceId": "es-GT-AndresNeural"},
}


def _headers(api_key: str) -> dict:
    return {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}


def _build_system_prompt(widget, kb) -> str:
    cfg = widget.config or {}
    qs = kb.qualification_questions if kb else []
    qs_text = "\n".join(f"- {q}" for q in qs) if qs else "No aplica."

    # Prepend custom system prompt if defined
    custom = (widget.system_prompt or "").strip()
    kb_block = SYSTEM_PROMPT_TEMPLATE.format(
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

    return f"{custom}\n\n{kb_block}".lstrip() if custom else kb_block


def _build_tools(widget) -> list:
    # Set BACKEND_PUBLIC_URL in production via environment variable.
    backend_url = getattr(settings, "BACKEND_PUBLIC_URL", "http://localhost:8000")
    token = str(widget.token)
    base = f"{backend_url}/api/v1/voice-widget/tool"

    cfg = widget.config or {}
    escalation_mode = cfg.get("escalation_mode", "whatsapp")
    transfer_number = cfg.get("transfer_number", "")

    tools = [
        {
            "type": "function",
            "function": {
                "name": "bookAppointment",
                "description": "Agenda una cita en el calendario del equipo. Queda pendiente de confirmación. Informa al cliente que recibirá confirmación. Asegúrate de tener nombre y teléfono del cliente antes de invocar.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "caller_name":    {"type": "string",  "description": "Nombre completo del cliente (obligatorio)"},
                        "caller_phone":   {"type": "string",  "description": "Teléfono de contacto del cliente (obligatorio para confirmar la cita)"},
                        "caller_email":   {"type": "string",  "description": "Email del cliente (para enviar confirmación)"},
                        "company":        {"type": "string",  "description": "Empresa o negocio del cliente"},
                        "preferred_date": {"type": "string",  "description": "Fecha preferida (ej: 2025-07-15 o 'lunes próximo')"},
                        "preferred_time": {"type": "string",  "description": "Hora preferida (ej: 10:00 AM)"},
                        "service_type":   {"type": "string",  "description": "Tipo de servicio o motivo de la cita"},
                        "notes":          {"type": "string",  "description": "Notas adicionales"},
                    },
                    "required": ["caller_name", "caller_phone", "preferred_date"],
                },
            },
            "server": {"url": f"{base}/book-appointment/?token={token}"},
        },
    ]

    # WhatsApp escalation tool
    if escalation_mode in ("whatsapp", "both"):
        tools.append({
            "type": "function",
            "function": {
                "name": "escalateToHuman",
                "description": "Transfiere a un agente humano vía WhatsApp. Usar si el cliente lo pide o si no puedes resolver la consulta. Intenta obtener nombre y teléfono antes de escalar.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "caller_name":  {"type": "string", "description": "Nombre completo del cliente"},
                        "caller_phone": {"type": "string", "description": "Teléfono del cliente para que el agente lo contacte"},
                        "reason":       {"type": "string", "description": "Motivo del escalado"},
                        "summary":      {"type": "string", "description": "Resumen de la conversación"},
                    },
                    "required": ["reason", "caller_name", "caller_phone"],
                },
            },
            "server": {"url": f"{base}/escalate/?token={token}"},
        })

    # Native Vapi transferCall tool
    if escalation_mode in ("transfer", "both") and transfer_number:
        tools.append({
            "type": "transferCall",
            "function": {
                "name": "transferToHuman",
                "description": "Transfiere la llamada en vivo a un agente humano. Usar si el cliente lo solicita explícitamente o si la situación requiere atención personalizada.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "reason": {"type": "string", "description": "Motivo de la transferencia"}
                    },
                    "required": ["reason"],
                },
            },
            "destinations": [
                {
                    "type": "number",
                    "number": transfer_number,
                    "message": "Un momento, te conecto con un asesor de nuestro equipo. Por favor mantente en línea.",
                }
            ],
        })

    tools.append({
        "type": "function",
        "function": {
            "name": "qualifyLead",
            "description": "Registra los datos del lead al completar la calificación. Invocar solo cuando ya tienes nombre y teléfono del cliente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "caller_name":  {"type": "string",  "description": "Nombre completo del cliente (obligatorio)"},
                    "caller_phone": {"type": "string",  "description": "Teléfono de contacto del cliente (obligatorio)"},
                    "caller_email": {"type": "string",  "description": "Email del cliente"},
                    "company":      {"type": "string",  "description": "Empresa o negocio del cliente"},
                    "answers":      {"type": "object",  "description": "Respuestas a las preguntas de calificación en formato clave-valor"},
                    "is_qualified": {"type": "boolean", "description": "¿El lead cumple los criterios de calificación?"},
                    "notes":        {"type": "string",  "description": "Observaciones adicionales sobre la conversación"},
                },
                "required": ["caller_name", "caller_phone", "answers"],
            },
        },
        "server": {"url": f"{base}/qualify/?token={token}"},
    })

    return tools


def _build_model_config(llm_model: str, system_prompt: str, tools: list) -> dict:
    """Returns Vapi model config dict based on llm_model string 'provider/model-name'."""
    parts    = llm_model.split("/", 1)
    provider = parts[0] if len(parts) == 2 else "groq"
    model    = parts[1] if len(parts) == 2 else llm_model
    return {
        "provider":    provider,
        "model":       model,
        "messages":    [{"role": "system", "content": system_prompt}],
        "temperature": 0.6,
        "tools":       tools,
    }


def create_or_update_assistant(widget, kb, api_key: str) -> str:
    """
    Creates or updates a Vapi assistant for the given widget + knowledge base.
    Returns the assistant ID (string).
    """
    cfg          = widget.config or {}
    voice_key    = cfg.get("voice", "es-MX-NuriaNeural")
    voice_config = VOICE_MAP.get(voice_key, {"provider": "azure", "voiceId": "es-MX-NuriaNeural"})
    system_prompt = _build_system_prompt(widget, kb)
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
    }

    if widget.vapi_assistant_id:
        # Update existing assistant
        r = requests.patch(
            f"{VAPI_API_BASE}/assistant/{widget.vapi_assistant_id}",
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
            detail = r.text[:600]
        raise ValueError(f"Vapi {r.status_code}: {detail}")
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
