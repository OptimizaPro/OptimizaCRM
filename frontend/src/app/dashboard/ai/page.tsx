"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth";
import { aiApi, crmApi } from "@/lib/api";
import { Brain, MessageSquare, TrendingUp, Users, Search, X, Smile, Meh, Frown, PhoneCall, CheckCircle2, AlertCircle, ArrowRight, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ─── Sentiment helpers ─────────────────────────────────────────────────────────

const SENTIMENT_CONFIG = {
  positive: {
    label:   "Positivo",
    icon:    Smile,
    color:   "text-green-400",
    bg:      "bg-green-950/30 border-green-800/40",
    message: "El cliente muestra interés y disposición. Momento ideal para avanzar con una propuesta concreta o agendar una reunión.",
    action:  "Avanza en el proceso — el timing es favorable.",
  },
  negative: {
    label:   "Negativo",
    icon:    Frown,
    color:   "text-red-400",
    bg:      "bg-red-950/30 border-red-800/40",
    message: "Se detectan señales de fricción o insatisfacción. Prioriza una respuesta empática y ofrece soluciones concretas.",
    action:  "Responde pronto con empatía y alternativas.",
  },
  neutral: {
    label:   "Neutral",
    icon:    Meh,
    color:   "text-amber-400",
    bg:      "bg-amber-950/30 border-amber-800/40",
    message: "El cliente evalúa opciones sin un compromiso claro. Refuerza el valor diferencial de tu oferta para inclinar la decisión.",
    action:  "Comparte casos de éxito o un incentivo para decidir.",
  },
};

// ─── Quick-launch card ────────────────────────────────────────────────────────

function QuickCard({
  icon: Icon, title, desc, onClick, loading,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <Card
      className="cursor-pointer border-slate-800 bg-slate-950 transition-all hover:-translate-y-0.5 hover:border-orange-800/60 hover:shadow-lg hover:shadow-orange-900/10"
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center p-6 text-center">
        <div className="mb-3 rounded-lg bg-orange-950/40 p-3 text-orange-400">
          <Icon className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-slate-200">{title}</p>
        <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{desc}</p>
        {loading
          ? <div className="mt-3 h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          : <p className="mt-3 text-[10px] text-orange-500/60">Haz clic para ejecutar</p>
        }
      </CardContent>
    </Card>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-800/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
      {message}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AIPage() {
  const { tokens, organization } = useAuthStore();

  // Sentiment
  const [sentimentText, setSentimentText] = useState("");
  const [sentimentResult, setSentimentResult] = useState<{ sentiment: string; confidence: number } | null>(null);
  const [sentimentError, setSentimentError] = useState<string | null>(null);

  // Forecast
  const [forecastResult, setForecastResult] = useState<{ period: string; forecasted_revenue: number; confidence: number }[] | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);

  // Follow-up
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<{ id: string; label: string } | null>(null);
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [followUpResult, setFollowUpResult] = useState<{
    recommended_action: string;
    best_channel: string;
    timing_days: number;
    urgency: string;
    personalized_message?: string;
    message_template?: string;
  } | null>(null);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  // Resumen de contacto (briefing)
  const [briefingResult, setBriefingResult] = useState<{
    lead_name: string;
    company: string;
    context_summary: string;
    key_points: string[];
    talking_points: string[];
    potential_objections: { objection: string; response: string }[];
    suggested_next_step: string;
  } | null>(null);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  // AI credit usage
  const { data: aiUsage } = useQuery({
    queryKey: ["ai-usage", organization?.id],
    queryFn:  () => aiApi.getUsage(tokens!.access, organization!.id),
    enabled:  !!tokens && !!organization,
    staleTime: 60_000,
  });

  // Lead search (follow-up)
  const { data: leadResults } = useQuery({
    queryKey: ["leads-search", leadSearch],
    queryFn: () => crmApi.getLeads(tokens!.access, organization!.id, `search=${encodeURIComponent(leadSearch)}&page_size=8`),
    enabled: !!tokens && !!organization && leadSearch.length >= 2,
    staleTime: 30_000,
  });

  // Mutations
  const sentimentMutation = useMutation({
    mutationFn: () => aiApi.analyzeSentiment(tokens!.access, organization!.id, sentimentText),
    onSuccess: (data) => { setSentimentError(null); setSentimentResult(data); },
    onError: (err: Error) => setSentimentError(err.message ?? "Error al analizar el texto."),
  });

  const forecastMutation = useMutation({
    mutationFn: () => aiApi.forecastRevenue(tokens!.access, organization!.id, "monthly"),
    onSuccess: (data) => { setForecastError(null); setForecastResult(data.forecasts); },
    onError: (err: Error) => setForecastError(err.message ?? "Error al generar el pronóstico."),
  });

  const followUpMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = selectedLead
        ? { lead_id: selectedLead.id }
        : { status: "qualified", score: 85, entity_type: "lead" };
      return aiApi.followUp(tokens!.access, organization!.id, payload);
    },
    onSuccess: (data) => { setFollowUpError(null); setFollowUpResult(data); },
    onError: (err: Error) => setFollowUpError(err.message ?? "Error al obtener la recomendación."),
  });

  const briefingMutation = useMutation({
    mutationFn: () => aiApi.callBriefing(tokens!.access, organization!.id, selectedLead!.id),
    onSuccess: (data) => { setBriefingError(null); setBriefingResult(data); },
    onError: (err: Error) => setBriefingError(err.message ?? "Error al generar el resumen."),
  });

  const urgencyLabel = (u: string) => ({ high: "Alta", medium: "Media", low: "Baja" }[u] ?? u);
  const channelLabel = (c: string) => ({ email: "Email", whatsapp: "WhatsApp", phone: "Teléfono", meeting: "Reunión", sms: "SMS" }[c] ?? c);

  return (
    <>
      <DashboardHeader title="Herramientas IA" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Intro + credit bar */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-orange-400" />
                <p className="text-sm font-medium text-slate-200">Herramientas de inteligencia artificial</p>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Requiere clave de IA configurada en Integraciones → Proveedor de IA.
              </p>
            </div>

            {/* Credit usage */}
            {aiUsage && (
              <div className="flex-shrink-0 min-w-[180px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Zap className="h-3 w-3" /> Créditos IA
                  </span>
                  <span className={`text-[11px] font-semibold ${aiUsage.usage_pct >= 90 ? "text-red-400" : aiUsage.usage_pct >= 70 ? "text-amber-400" : "text-slate-400"}`}>
                    {aiUsage.credits_used} / {aiUsage.credits_limit}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${aiUsage.usage_pct >= 90 ? "bg-red-500" : aiUsage.usage_pct >= 70 ? "bg-amber-500" : "bg-orange-500"}`}
                    style={{ width: `${Math.min(100, aiUsage.usage_pct)}%` }}
                  />
                </div>
                {aiUsage.usage_pct >= 90 && (
                  <p className="mt-1 text-[10px] text-red-400">
                    Casi sin créditos — <a href="/precios" className="underline hover:text-red-300">mejorar plan</a>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick-launch grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickCard
            icon={Users}
            title="Recomendación de seguimiento"
            desc="Sugiere acción, canal y momento óptimo para contactar a un lead."
            onClick={() => followUpMutation.mutate()}
            loading={followUpMutation.isPending}
          />
          <QuickCard
            icon={MessageSquare}
            title="Análisis de sentimiento"
            desc="Detecta el tono emocional de emails, mensajes o notas de clientes."
            onClick={() => sentimentMutation.mutate()}
            loading={sentimentMutation.isPending}
          />
          <QuickCard
            icon={TrendingUp}
            title="Pronóstico de ingresos"
            desc="Proyecta ingresos de los próximos 3 meses con tu historial y pipeline."
            onClick={() => forecastMutation.mutate()}
            loading={forecastMutation.isPending}
          />
          <QuickCard
            icon={PhoneCall}
            title="Resumen de contacto"
            desc="Resumen ejecutivo con puntos clave, objeciones y guía de conversación."
            onClick={() => selectedLead && briefingMutation.mutate()}
            loading={briefingMutation.isPending}
          />
        </div>

        {/* ── 1. Recomendación de seguimiento ──────────────────────────────── */}
        <Card className="border-slate-800 bg-slate-950">
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="flex items-center gap-2 text-base text-slate-100">
              <Users className="h-4 w-4 text-orange-400" />
              Recomendación de seguimiento
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Selecciona un lead para obtener una recomendación personalizada con su historial real — o ejecuta sin selección para una sugerencia genérica.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {/* Lead selector */}
            {selectedLead ? (
              <div className="flex items-center justify-between rounded-xl border border-orange-800/40 bg-orange-950/20 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">{selectedLead.label}</p>
                  <p className="text-xs text-slate-500">La IA analizará su historial de actividades, tareas y oportunidades</p>
                </div>
                <button
                  onClick={() => { setSelectedLead(null); setLeadSearch(""); setFollowUpResult(null); }}
                  className="ml-4 rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    placeholder="Buscar lead por nombre, empresa o email (opcional)..."
                    value={leadSearch}
                    onChange={(e) => { setLeadSearch(e.target.value); setShowLeadDropdown(true); }}
                    onFocus={() => setShowLeadDropdown(true)}
                    onBlur={() => setTimeout(() => setShowLeadDropdown(false), 150)}
                    className="pl-9 bg-slate-900 border-slate-700"
                  />
                </div>
                {showLeadDropdown && leadResults?.results && leadResults.results.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 shadow-xl shadow-black/40 overflow-hidden">
                    {leadResults.results.map((lead) => {
                      const name = lead.full_name || `${lead.first_name} ${lead.last_name}`.trim();
                      return (
                        <button
                          key={lead.id}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-800"
                          onMouseDown={() => {
                            setSelectedLead({ id: lead.id, label: `${name}${lead.company ? ` · ${lead.company}` : ""}` });
                            setShowLeadDropdown(false);
                            setLeadSearch("");
                          }}
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-950/60 text-xs font-semibold text-orange-400">
                            {(lead.first_name?.[0] ?? "?").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-slate-200">{name}</p>
                            <p className="truncate text-xs text-slate-500">{[lead.company, lead.email].filter(Boolean).join(" · ")}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {leadSearch.length >= 2 && leadResults?.results?.length === 0 && (
                  <p className="mt-2 text-xs text-slate-500">No se encontraron leads con ese criterio.</p>
                )}
              </div>
            )}

            <Button
              onClick={() => followUpMutation.mutate()}
              disabled={followUpMutation.isPending}
              className="bg-orange-600 hover:bg-orange-500 text-white"
            >
              {followUpMutation.isPending ? "Analizando..." : selectedLead ? "Analizar este lead" : "Obtener recomendación genérica"}
            </Button>

            {followUpError && <ErrorBanner message={followUpError} />}

            {followUpResult && (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-slate-100">{followUpResult.recommended_action}</p>
                  {followUpResult.personalized_message
                    ? <Badge variant="secondary" className="text-[10px] shrink-0">Personalizada con historial</Badge>
                    : <Badge variant="secondary" className="text-[10px] shrink-0 border border-slate-700 text-slate-500 bg-transparent">Genérica</Badge>
                  }
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Canal recomendado", value: channelLabel(followUpResult.best_channel) },
                    { label: "Tiempo de espera",  value: `${followUpResult.timing_days} día${followUpResult.timing_days !== 1 ? "s" : ""}` },
                    { label: "Urgencia",          value: urgencyLabel(followUpResult.urgency) },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                      <p className="text-[10px] text-slate-500">{label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-200">{value}</p>
                    </div>
                  ))}
                </div>
                {(followUpResult.personalized_message || followUpResult.message_template) && (
                  <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">Mensaje sugerido</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                      {followUpResult.personalized_message ?? followUpResult.message_template}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── 2. Análisis de sentimiento ────────────────────────────────────── */}
        <Card className="border-slate-800 bg-slate-950">
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="flex items-center gap-2 text-base text-slate-100">
              <MessageSquare className="h-4 w-4 text-orange-400" />
              Análisis de sentimiento
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Pega un email, mensaje de WhatsApp o nota de cliente para detectar el tono emocional y recibir orientación de respuesta.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <Textarea
              placeholder="Pega aquí el texto a analizar..."
              value={sentimentText}
              onChange={(e) => setSentimentText(e.target.value)}
              rows={4}
            />
            <Button
              onClick={() => sentimentMutation.mutate()}
              disabled={!sentimentText.trim() || sentimentMutation.isPending}
              className="bg-orange-600 hover:bg-orange-500 text-white"
            >
              {sentimentMutation.isPending ? "Analizando..." : "Analizar sentimiento"}
            </Button>
            {sentimentError && <ErrorBanner message={sentimentError} />}
            {sentimentResult && (() => {
              const key = sentimentResult.sentiment as keyof typeof SENTIMENT_CONFIG;
              const cfg = SENTIMENT_CONFIG[key] ?? SENTIMENT_CONFIG.neutral;
              const SentIcon = cfg.icon;
              return (
                <div className={`rounded-xl border p-4 space-y-3 ${cfg.bg}`}>
                  <div className="flex items-center gap-3">
                    <SentIcon className={`h-5 w-5 ${cfg.color}`} />
                    <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-slate-400">
                      Confianza: <span className="font-semibold text-slate-200">{(sentimentResult.confidence * 100).toFixed(0)}%</span>
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{cfg.message}</p>
                  <div className="flex items-center gap-2 rounded-lg bg-slate-900/60 px-3 py-2">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Acción sugerida</span>
                    <span className="text-xs text-slate-300">{cfg.action}</span>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* ── 3. Pronóstico de ingresos ─────────────────────────────────────── */}
        <Card className="border-slate-800 bg-slate-950">
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="flex items-center gap-2 text-base text-slate-100">
              <TrendingUp className="h-4 w-4 text-orange-400" />
              Pronóstico de ingresos
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Proyecta los ingresos de los próximos 3 meses combinando historial de ventas y pipeline activo.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <Button
              onClick={() => forecastMutation.mutate()}
              disabled={forecastMutation.isPending}
              className="bg-orange-600 hover:bg-orange-500 text-white"
            >
              {forecastMutation.isPending ? "Calculando..." : "Generar pronóstico"}
            </Button>
            {forecastError && <ErrorBanner message={forecastError} />}
            {forecastResult && (
              <div className="grid gap-4 sm:grid-cols-3">
                {forecastResult.map((f) => (
                  <div key={f.period} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="text-xs text-slate-500">{f.period}</p>
                    <p className="mt-1.5 text-2xl font-black text-slate-100">{formatCurrency(f.forecasted_revenue)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-800">
                        <div
                          className="h-1.5 rounded-full bg-orange-500"
                          style={{ width: `${(f.confidence * 100).toFixed(0)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">{(f.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-600">Nivel de confianza</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── 4. Resumen de contacto ────────────────────────────────────────── */}
        <Card className="border-slate-800 bg-slate-950">
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="flex items-center gap-2 text-base text-slate-100">
              <PhoneCall className="h-4 w-4 text-orange-400" />
              Resumen de contacto
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Genera un resumen ejecutivo del lead seleccionado arriba — contexto, puntos clave, guía de conversación y próximo paso recomendado.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {/* Lead context — shared with follow-up */}
            {selectedLead ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-950/60 text-xs font-semibold text-orange-400">
                  {selectedLead.label[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{selectedLead.label}</p>
                  <p className="text-xs text-slate-500">Lead seleccionado en Recomendación de seguimiento</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3">
                <p className="text-sm text-slate-500">
                  Selecciona un lead en <span className="text-slate-300">Recomendación de seguimiento</span> (sección anterior) para generar su resumen.
                </p>
              </div>
            )}

            <Button
              onClick={() => briefingMutation.mutate()}
              disabled={!selectedLead || briefingMutation.isPending}
              className="bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-40"
            >
              {briefingMutation.isPending ? "Preparando resumen..." : "Generar resumen de contacto"}
            </Button>

            {briefingError && <ErrorBanner message={briefingError} />}

            {briefingResult && (
              <div className="space-y-4">
                {/* Header */}
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-950/60 text-sm font-bold text-orange-400">
                      {briefingResult.lead_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-100">{briefingResult.lead_name}</p>
                      {briefingResult.company && <p className="text-xs text-slate-500">{briefingResult.company}</p>}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">{briefingResult.context_summary}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Key points */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-slate-500">Puntos clave</p>
                    <ul className="space-y-2">
                      {briefingResult.key_points.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Talking points */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-slate-500">Guía de conversación</p>
                    <ul className="space-y-2">
                      {briefingResult.talking_points.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Objections + responses */}
                <div className="space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-amber-500/70">Posibles objeciones y cómo responderlas</p>
                  {briefingResult.potential_objections.map((item, i) => (
                    <div key={i} className="rounded-xl border border-amber-800/30 bg-amber-950/10 p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <p className="text-sm font-medium text-amber-200">{item.objection}</p>
                      </div>
                      <div className="flex items-start gap-2 pl-5">
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                        <p className="text-sm text-slate-300 leading-relaxed">{item.response}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Next step */}
                <div className="flex items-start gap-3 rounded-xl border border-orange-800/40 bg-orange-950/20 p-4">
                  <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-orange-500/70">Próximo paso sugerido</p>
                    <p className="mt-1 text-sm font-medium text-slate-200">{briefingResult.suggested_next_step}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </>
  );
}
