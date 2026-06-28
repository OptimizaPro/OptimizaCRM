"""
Optimiza-CRM – AI Integration views
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import os
import json
import urllib.request
import urllib.error
from datetime import date

from django.db import models as _db_models
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response

from core.permissions import IsReadOnlyOrAbove
from core.middleware import get_current_organization
from apps.crm.models import Lead, Customer, Opportunity, Activity, Task
from apps.crm.serializers import LeadSerializer, CustomerSerializer

GROQ_API_URL   = "https://api.groq.com/openai/v1/chat/completions"
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

PROVIDER_DEFAULTS = {
    "groq":   {"url": GROQ_API_URL,   "model": "llama-3.1-8b-instant"},
    "openai": {"url": OPENAI_API_URL,  "model": "gpt-4o-mini"},
    "gemini": {"url": GEMINI_API_URL,  "model": "gemini-1.5-flash"},
}

_FALLBACK_KEY = os.environ.get("GROQ_API_KEY", "")

WRITING_PROMPTS = {
    "improve": (
        "Eres un asistente de redacción profesional para un CRM. "
        "Mejora el siguiente borrador manteniendo el mismo tono e intención, "
        "corrigiendo gramática y haciéndolo más claro y profesional. "
        "Devuelve SOLO el texto mejorado, sin explicaciones ni comillas."
    ),
    "professional": (
        "Eres un asistente de ventas en un CRM. Redacta una respuesta profesional y cordial "
        "al siguiente mensaje de un cliente o lead. Sé conciso, claro y orientado a la acción. "
        "Devuelve SOLO el texto de la respuesta, sin asunto ni explicaciones."
    ),
    "informal": (
        "Eres un asistente de ventas en un CRM. Redacta una respuesta cercana y conversacional "
        "al siguiente mensaje, adecuada para WhatsApp o chat. Breve, directa y amigable. "
        "Devuelve SOLO el texto de la respuesta, sin explicaciones."
    ),
    "summarize": (
        "Resume el siguiente mensaje en 2-3 frases clave, en español. "
        "Devuelve SOLO el resumen, sin explicaciones."
    ),
}


def _get_ai_config():
    """Return (api_key, api_url, model) from the org's ai_provider integration or env fallback."""
    from apps.integrations.models import Integration  # noqa: PLC0415
    org = get_current_organization()
    if org:
        try:
            integration = Integration.objects.get(
                organization=org, channel_type="ai_provider",
                status="connected", is_active=True,
            )
            config   = integration.config or {}
            provider = config.get("provider", "groq")
            api_key  = config.get("api_key", "")
            model    = config.get("model") or PROVIDER_DEFAULTS.get(provider, PROVIDER_DEFAULTS["groq"])["model"]
            api_url  = PROVIDER_DEFAULTS.get(provider, PROVIDER_DEFAULTS["groq"])["url"]
            if api_key:
                return api_key, api_url, model
        except Integration.DoesNotExist:
            pass

    defaults = PROVIDER_DEFAULTS["groq"]
    return _FALLBACK_KEY, defaults["url"], defaults["model"]


def _call_llm(api_key, api_url, model, system_prompt, user_text, temperature=0.7, max_tokens=512):
    """Call an OpenAI-compatible API. Returns (result_text, error_string)."""
    payload = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_text},
        ],
        "temperature": temperature,
        "max_tokens":  max_tokens,
    }).encode("utf-8")

    req = urllib.request.Request(
        api_url,
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "OptimizaCRM/1.0",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data   = json.loads(resp.read().decode("utf-8"))
            result = data["choices"][0]["message"]["content"].strip()
            return result, None
    except urllib.error.HTTPError as e:
        return None, f"API error: {e.read().decode('utf-8')}"
    except Exception as e:
        return None, str(e)


# ─── AI Credit helpers ────────────────────────────────────────────────────────

def _get_ai_usage(org):
    """
    Get or create the current month's AIUsage record for the org.
    Limit = plan base credits + credits from all active add-ons.
    """
    from apps.ai_integration.models import AIUsage   # noqa: PLC0415
    from apps.billing.models import Plan, OrgAddOn   # noqa: PLC0415
    from django.utils import timezone as _tz

    period_start = date.today().replace(day=1)

    # Base credits from plan
    limit = 50  # safe default (Básico)
    try:
        sub   = org.subscription
        plan  = Plan.objects.get(slug=sub.plan)
        limit = plan.ai_credits_monthly
    except Exception:
        pass

    # Extra credits from active add-ons
    try:
        now = _tz.now()
        addon_credits = (
            OrgAddOn.objects
            .filter(
                organization=org,
                status="active",
            )
            .filter(
                _db_models.Q(expires_at__isnull=True) | _db_models.Q(expires_at__gt=now)
            )
            .aggregate(total=_db_models.Sum("addon__ai_credits"))
        )["total"] or 0
        limit += addon_credits
    except Exception:
        pass

    usage, created = AIUsage.objects.get_or_create(
        organization=org,
        period_start=period_start,
        defaults={"credits_limit": limit, "credits_used": 0},
    )
    # Sync limit if plan or add-ons changed since record was created
    if not created and usage.credits_limit != limit:
        usage.credits_limit = limit
        usage.save(update_fields=["credits_limit"])
    return usage


def _consume_credit(org):
    """
    Verify the org has remaining credits and consume one atomically.
    Returns (True, None) on success or (False, Response) when limit is reached.
    """
    from apps.ai_integration.models import AIUsage  # noqa: PLC0415

    usage = _get_ai_usage(org)
    if usage.credits_used >= usage.credits_limit:
        return False, Response(
            {
                "error": (
                    f"Has alcanzado el límite de {usage.credits_limit} créditos de IA para este mes. "
                    "Actualiza tu plan o añade el Paquete IA para continuar."
                ),
                "credits_used":  usage.credits_used,
                "credits_limit": usage.credits_limit,
                "upgrade_url":   "/precios",
            },
            status=402,
        )
    AIUsage.objects.filter(pk=usage.pk).update(
        credits_used=_db_models.F("credits_used") + 1
    )
    return True, None


# ─── Views ────────────────────────────────────────────────────────────────────

class WritingAssistantView(APIView):
    permission_classes = [IsReadOnlyOrAbove]

    def post(self, request):
        action  = request.data.get("action")
        text    = request.data.get("text", "").strip()
        channel = request.data.get("channel", "email")

        if not action or action not in WRITING_PROMPTS:
            return Response({"error": "Acción no válida."}, status=400)
        if not text:
            return Response({"error": "Se requiere el texto del mensaje."}, status=400)

        org = get_current_organization()
        if not org:
            return Response({"error": "Organización no encontrada."}, status=400)
        ok, err = _consume_credit(org)
        if not ok:
            return err

        api_key, api_url, model = _get_ai_config()
        if not api_key:
            return Response(
                {"error": "No hay un proveedor de IA configurado. Ve a Integraciones → Proveedor de IA."},
                status=503,
            )

        system_prompt = WRITING_PROMPTS[action]
        if channel == "whatsapp" and action == "professional":
            system_prompt = WRITING_PROMPTS["informal"]

        result, error = _call_llm(api_key, api_url, model, system_prompt, text)
        if error:
            return Response({"error": error}, status=502)
        return Response({"result": result})


class LeadScoreView(APIView):
    permission_classes = [IsReadOnlyOrAbove]

    def post(self, request):
        from ai.services.lead_scoring import score_lead  # noqa: PLC0415

        lead_id = request.data.get("lead_id")
        org     = get_current_organization()

        if lead_id:
            try:
                lead = Lead.objects.get(id=lead_id, organization=org)
                features = {
                    "source":           lead.source,
                    "status":           lead.status,
                    "has_email":        bool(lead.email),
                    "has_phone":        bool(lead.phone),
                    "has_company":      bool(lead.company),
                    "engagement_score": lead.engagement_score,
                }
                result    = score_lead(features)
                lead.score = result["score"]
                lead.save(update_fields=["score"])
                return Response({**result, "lead": LeadSerializer(lead).data})
            except Lead.DoesNotExist:
                return Response({"error": "Lead no encontrado."}, status=404)

        features = request.data.get("features", request.data)
        return Response(score_lead(features))


class ChurnPredictView(APIView):
    permission_classes = [IsReadOnlyOrAbove]

    def post(self, request):
        from ai.services.churn_prediction import predict_churn  # noqa: PLC0415

        customer_id = request.data.get("customer_id")
        org         = get_current_organization()

        if customer_id:
            try:
                customer  = Customer.objects.get(id=customer_id, organization=org)
                opp_count = Opportunity.objects.filter(customer=customer).count()
                won_count = Opportunity.objects.filter(customer=customer, stage="won").count()
                features  = {
                    "lifetime_value":    float(customer.lifetime_value),
                    "status":            customer.status,
                    "opportunity_count": opp_count,
                    "won_deals":         won_count,
                    "days_since_created": (customer.updated_at - customer.created_at).days,
                }
                result = predict_churn(features)
                customer.churn_risk = result["churn_risk"]
                customer.save(update_fields=["churn_risk"])
                return Response({**result, "customer": CustomerSerializer(customer).data})
            except Customer.DoesNotExist:
                return Response({"error": "Cliente no encontrado."}, status=404)

        return Response(predict_churn(request.data.get("features", request.data)))


class RevenueForecastView(APIView):
    permission_classes = [IsReadOnlyOrAbove]

    def post(self, request):
        from ai.services.revenue_forecast import forecast_revenue  # noqa: PLC0415
        from django.db.models import Sum as _Sum

        org    = get_current_organization()
        period = request.data.get("period", "monthly")
        now    = timezone.now()

        historical = []
        for i in range(12):
            month = now.month - i
            year  = now.year
            while month <= 0:
                month += 12
                year  -= 1
            start   = now.replace(year=year, month=month, day=1)
            revenue = Opportunity.objects.filter(
                organization=org, stage="won", won_at__gte=start,
            ).aggregate(total=_Sum("amount"))["total"] or 0
            historical.append(float(revenue))

        pipeline = float(
            Opportunity.objects.filter(organization=org)
            .exclude(stage__in=["won", "lost"])
            .aggregate(total=_Sum("amount"))["total"] or 0
        )
        return Response(forecast_revenue(historical, pipeline, period))


# ─── Follow-up: context injection helpers ────────────────────────────────────

_FOLLOW_UP_SYSTEM = (
    "Eres un asistente experto en ventas para un CRM latinoamericano. "
    "Tu tarea es analizar el historial completo de un lead y recomendar la mejor acción de seguimiento.\n\n"
    "Responde ÚNICAMENTE con un objeto JSON válido con exactamente estos campos:\n"
    "{\n"
    '  "recommended_action": "Descripción breve de la acción recomendada (máx. 80 caracteres)",\n'
    '  "best_channel": "email" | "phone" | "meeting" | "whatsapp",\n'
    '  "timing_days": <entero, días de espera antes de actuar — 0 = hoy>,\n'
    '  "urgency": "low" | "medium" | "high",\n'
    '  "personalized_message": "Borrador del mensaje en español, personalizado con detalles concretos del lead"\n'
    "}\n\n"
    "El mensaje personalizado debe mencionar detalles específicos del historial: última interacción, "
    "oportunidades activas, notas relevantes. Nunca uses placeholders como {name}."
)


def _build_lead_context(lead: Lead, org) -> dict:
    """Gather all available CRM context for a lead in one pass."""
    now = timezone.now()

    activities = list(
        Activity.objects.filter(organization=org, related_type="lead", related_id=lead.id)
        .order_by("-created_at")
        .values("activity_type", "subject", "body", "created_at")[:5]
    )

    tasks = list(
        Task.objects.filter(
            organization=org, related_type="lead", related_id=lead.id,
            status__in=["pending", "in_progress"],
        )
        .order_by("due_date")
        .values("title", "priority", "due_date")[:3]
    )

    opportunities = list(
        lead.opportunities.exclude(stage__in=["won", "lost"])
        .values("title", "stage", "amount", "probability", "expected_close_date")[:3]
    )

    days_since = None
    if activities:
        delta = now - activities[0]["created_at"]
        days_since = delta.days

    return {
        "lead":                    lead,
        "activities":              activities,
        "tasks":                   tasks,
        "opportunities":           opportunities,
        "days_since_last_contact": days_since,
    }


def _format_context_prompt(ctx: dict) -> str:
    """Convert lead context dict into a readable prompt for the LLM."""
    lead: Lead = ctx["lead"]
    lines = [
        f"LEAD: {lead.first_name} {lead.last_name}".strip(),
        f"Empresa: {lead.company or 'No especificada'}",
        f"Cargo: {lead.title or 'No especificado'}",
        f"Estado: {lead.get_status_display()}",
        f"Fuente: {lead.get_source_display()}",
        f"Score IA: {lead.score}/100  |  Engagement: {lead.engagement_score}/15",
    ]

    days = ctx["days_since_last_contact"]
    lines.append(f"Días desde último contacto: {days if days is not None else 'Sin registros'}")

    if lead.notes:
        lines.append(f"\nNOTAS DEL LEAD:\n{lead.notes[:400]}")

    activities = ctx["activities"]
    if activities:
        lines.append("\nHISTORIAL DE ACTIVIDADES (más reciente primero):")
        for i, act in enumerate(activities, 1):
            date_str = act["created_at"].strftime("%d/%m/%Y") if act.get("created_at") else ""
            subject  = act.get("subject") or "(sin asunto)"
            snippet  = (act.get("body") or "").strip()[:120]
            line     = f"{i}. [{act['activity_type']}] {subject} — {date_str}"
            if snippet:
                line += f"\n   {snippet}"
            lines.append(line)
    else:
        lines.append("\nHISTORIAL: Sin actividades registradas aún.")

    tasks = ctx["tasks"]
    if tasks:
        lines.append("\nTAREAS PENDIENTES:")
        for t in tasks:
            due = t["due_date"].strftime("%d/%m/%Y") if t.get("due_date") else "Sin fecha"
            lines.append(f"  - [{t['priority']}] {t['title']} — vence: {due}")

    opportunities = ctx["opportunities"]
    if opportunities:
        lines.append("\nOPORTUNIDADES ACTIVAS:")
        for opp in opportunities:
            close = opp["expected_close_date"].strftime("%d/%m/%Y") if opp.get("expected_close_date") else "Sin fecha"
            lines.append(
                f"  - \"{opp['title']}\" — {opp['stage']} — "
                f"${opp['amount']} ({opp['probability']}% prob.) — cierre: {close}"
            )

    return "\n".join(lines)


def _llm_follow_up(api_key: str, api_url: str, model: str, ctx: dict) -> dict | None:
    """Call LLM with lead context. Returns parsed dict or None on failure."""
    prompt_text  = _format_context_prompt(ctx)
    result_text, error = _call_llm(
        api_key, api_url, model,
        _FOLLOW_UP_SYSTEM,
        prompt_text,
        temperature=0.4,
        max_tokens=700,
    )

    if error or not result_text:
        return None

    # Strip markdown code fences if LLM wraps the JSON
    text = result_text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text  = parts[1].lstrip("json").strip() if len(parts) > 1 else text

    try:
        parsed = json.loads(text)
        parsed["model"] = "llm_context_v1"
        return parsed
    except (json.JSONDecodeError, KeyError):
        return None


class FollowUpRecommendationView(APIView):
    permission_classes = [IsReadOnlyOrAbove]

    def post(self, request):
        lead_id = request.data.get("lead_id")
        org     = get_current_organization()

        if not org:
            return Response({"error": "Organización no encontrada."}, status=400)
        ok, err = _consume_credit(org)
        if not ok:
            return err

        api_key, api_url, model = _get_ai_config()
        if not api_key:
            return Response(
                {"error": "No hay un proveedor de IA configurado. Ve a Integraciones → Proveedor de IA y añade tu clave API."},
                status=503,
            )

        # ── Context injection path (lead_id provided) ──────────────────────
        if lead_id and org:
            try:
                lead   = Lead.objects.get(id=lead_id, organization=org)
                ctx    = _build_lead_context(lead, org)
                result = _llm_follow_up(api_key, api_url, model, ctx)
                if result:
                    return Response(result)
                return Response({"error": "La IA no pudo generar una recomendación. Intenta de nuevo."}, status=502)
            except Lead.DoesNotExist:
                return Response({"error": "Lead no encontrado."}, status=404)

        # ── Generic path (no lead_id): LLM with minimal context ────────────
        generic_prompt = (
            "No hay un lead específico seleccionado. "
            "Genera una recomendación de seguimiento genérica para un lead calificado "
            "en etapa de propuesta con alto interés. "
            "Sé concreto y accionable."
        )
        result_text, error = _call_llm(
            api_key, api_url, model,
            _FOLLOW_UP_SYSTEM,
            generic_prompt,
            temperature=0.5,
            max_tokens=700,
        )
        if error:
            return Response({"error": f"Error del proveedor de IA: {error}"}, status=502)

        text = result_text.strip()
        if text.startswith("```"):
            parts = text.split("```")
            text  = parts[1].lstrip("json").strip() if len(parts) > 1 else text
        try:
            parsed = json.loads(text)
            parsed["model"] = "llm_generic_v1"
            return Response(parsed)
        except (json.JSONDecodeError, KeyError):
            return Response({"error": "La IA devolvió una respuesta inesperada. Intenta de nuevo."}, status=502)


_SENTIMENT_SYSTEM = (
    "Eres un experto en análisis de sentimiento para un CRM de ventas en español. "
    "Analiza el texto del cliente o lead y responde ÚNICAMENTE con un objeto JSON válido:\n"
    "{\n"
    '  "sentiment": "positive" | "negative" | "neutral",\n'
    '  "confidence": <número entre 0.0 y 1.0>,\n'
    '  "score": <número entre -1.0 (muy negativo) y 1.0 (muy positivo)>,\n'
    '  "positive_signals": <entero — número de señales positivas detectadas>,\n'
    '  "negative_signals": <entero — número de señales negativas detectadas>\n'
    "}\n\n"
    "Criterios ESTRICTOS — aplícalos con precisión:\n"
    "- positive: el texto expresa entusiasmo claro, satisfacción explícita o señales inequívocas de compra "
    "(ej. 'me encanta', 'queremos avanzar', 'es justo lo que necesitamos', 'cuándo podemos firmar'). "
    "Buscar o explorar NO es positivo.\n"
    "- neutral: el texto es exploratorio, informativo o evaluativo sin carga emocional clara "
    "(ej. 'estamos buscando', 'necesitamos una solución', 'nos gustaría conocer más', preguntas de información). "
    "La mayoría de primeros contactos y consultas caen aquí.\n"
    "- negative: el texto expresa queja, rechazo, frustración, insatisfacción o señales de abandono "
    "(ej. 'no nos convenció', 'es muy caro', 'tuvimos problemas', 'vamos a cancelar').\n"
    "La confianza debe reflejar qué tan clara e inequívoca es la señal emocional. "
    "Ante la duda entre positive y neutral, elige neutral."
)


_BRIEFING_SYSTEM = (
    "Eres un asistente de ventas experto para un CRM latinoamericano. "
    "Tu tarea es generar un resumen ejecutivo de contacto basado en el historial completo del lead.\n\n"
    "Responde ÚNICAMENTE con un objeto JSON válido con exactamente estos campos:\n"
    "{\n"
    '  "context_summary": "2-3 oraciones resumiendo quién es, dónde está en el proceso y el punto más relevante",\n'
    '  "key_points": ["hecho clave 1", "hecho clave 2", "hecho clave 3"],\n'
    '  "talking_points": ["pregunta o punto de conversación 1", "pregunta o punto de conversación 2", "pregunta o punto de conversación 3"],\n'
    '  "potential_objections": [\n'
    '    { "objection": "objeción probable 1", "response": "cómo responderla de forma convincente y honesta" },\n'
    '    { "objection": "objeción probable 2", "response": "cómo responderla de forma convincente y honesta" }\n'
    '  ],\n'
    '  "suggested_next_step": "Acción concreta y específica para cerrar o avanzar"\n'
    "}\n\n"
    "Sé específico y usa los datos reales del lead. Nunca uses placeholders como {name}. "
    "Los key_points deben ser hechos concretos (fechas, montos, actividades). "
    "Los talking_points deben ser preguntas o afirmaciones que abran la conversación. "
    "Las responses a objeciones deben ser directas, honestas y orientadas a generar confianza — sin ser agresivas."
)


class CallBriefingView(APIView):
    permission_classes = [IsReadOnlyOrAbove]

    def post(self, request):
        lead_id = request.data.get("lead_id")
        org     = get_current_organization()

        if not lead_id:
            return Response({"error": "Se requiere seleccionar un lead."}, status=400)
        if not org:
            return Response({"error": "Organización no encontrada."}, status=400)
        ok, err = _consume_credit(org)
        if not ok:
            return err

        api_key, api_url, model = _get_ai_config()
        if not api_key:
            return Response(
                {"error": "No hay un proveedor de IA configurado. Ve a Integraciones → Proveedor de IA."},
                status=503,
            )

        try:
            lead = Lead.objects.get(id=lead_id, organization=org)
        except Lead.DoesNotExist:
            return Response({"error": "Lead no encontrado."}, status=404)

        ctx         = _build_lead_context(lead, org)
        prompt_text = _format_context_prompt(ctx)

        result_text, error = _call_llm(
            api_key, api_url, model,
            _BRIEFING_SYSTEM,
            prompt_text,
            temperature=0.3,
            max_tokens=800,
        )
        if error:
            return Response({"error": f"Error del proveedor de IA: {error}"}, status=502)

        raw = result_text.strip()
        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1].lstrip("json").strip() if len(parts) > 1 else raw
        try:
            parsed = json.loads(raw)
            parsed["lead_name"] = f"{lead.first_name} {lead.last_name}".strip()
            parsed["company"]   = lead.company or ""
            parsed["model"]     = "llm_briefing_v1"
            return Response(parsed)
        except (json.JSONDecodeError, KeyError):
            return Response({"error": "La IA devolvió una respuesta inesperada. Intenta de nuevo."}, status=502)


class SentimentAnalysisView(APIView):
    permission_classes = [IsReadOnlyOrAbove]

    def post(self, request):
        text = request.data.get("text", "")
        if not text:
            return Response({"error": "Se requiere el texto."}, status=400)

        org = get_current_organization()
        if not org:
            return Response({"error": "Organización no encontrada."}, status=400)
        ok, err = _consume_credit(org)
        if not ok:
            return err

        api_key, api_url, model = _get_ai_config()
        if not api_key:
            return Response(
                {"error": "No hay un proveedor de IA configurado. Ve a Integraciones → Proveedor de IA y añade tu clave API."},
                status=503,
            )

        result_text, error = _call_llm(
            api_key, api_url, model,
            _SENTIMENT_SYSTEM,
            text,
            temperature=0.2,
            max_tokens=150,
        )
        if error:
            return Response({"error": f"Error del proveedor de IA: {error}"}, status=502)

        raw = result_text.strip()
        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1].lstrip("json").strip() if len(parts) > 1 else raw
        try:
            parsed = json.loads(raw)
            parsed["model"] = "llm_sentiment_v1"
            return Response(parsed)
        except (json.JSONDecodeError, KeyError):
            return Response({"error": "La IA devolvió una respuesta inesperada. Intenta de nuevo."}, status=502)


class AIUsageView(APIView):
    """GET /api/v1/ai/usage/ — current month credit usage for the org."""
    permission_classes = [IsReadOnlyOrAbove]

    def get(self, request):
        org = get_current_organization()
        if not org:
            return Response({"error": "Organización no encontrada."}, status=400)
        usage = _get_ai_usage(org)
        return Response({
            "credits_used":      usage.credits_used,
            "credits_limit":     usage.credits_limit,
            "credits_remaining": usage.credits_remaining,
            "usage_pct":         usage.usage_pct,
            "period_start":      usage.period_start.isoformat(),
        })
