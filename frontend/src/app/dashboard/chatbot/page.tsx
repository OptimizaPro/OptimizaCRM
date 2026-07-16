"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { useAuthStore } from "@/store/auth";
import { FeatureGate } from "@/components/dashboard/feature-gate";
import {
  chatbotApi, type ChatbotWidget, type ChatSession_, type ChatSessionDetail,
} from "@/lib/api";
import {
  Bot, Save, Copy, Check, RefreshCw, MessageSquare,
  Loader2, Info, ChevronDown, ChevronUp, FileUp, X,
  User, Phone, Mail, TrendingUp, TrendingDown, Minus, ChevronRight,
  Database, Users, Zap, Settings, ChevronLeft, ArrowLeft,
} from "lucide-react";

// ─── Styles ──────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20";

const selectCls =
  "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20";

// ─── LLM model options ───────────────────────────────────────────────────────

const LLM_MODELS = [
  { value: "groq/llama-3.3-70b-versatile",       label: "Llama 3.3 70B (Groq — rápido)" },
  { value: "groq/llama-3.1-8b-instant",           label: "Llama 3.1 8B (Groq — ultra-rápido)" },
  { value: "openai/gpt-4o-mini",                  label: "GPT-4o Mini (OpenAI)" },
  { value: "openai/gpt-4o",                       label: "GPT-4o (OpenAI — más preciso)" },
  { value: "anthropic/claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (Anthropic)" },
];

// ─── Copy button ─────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

// ─── Embedding progress bar ──────────────────────────────────────────────────

function EmbedProgress({ pct, count }: { pct: number; count: number }) {
  const pctRounded = Math.round(pct);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{count} fragmentos embebidos</span>
        <span className={pctRounded === 100 ? "text-green-400" : "text-orange-400"}>
          {pctRounded}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pctRounded === 100 ? "bg-green-500" : "bg-orange-500"
          }`}
          style={{ width: `${Math.min(pctRounded, 100)}%` }}
        />
      </div>
      {pctRounded < 100 && (
        <p className="text-xs text-slate-500">
          El embedding se procesa en segundo plano. Recarga la página para actualizar.
        </p>
      )}
    </div>
  );
}

// ─── Intent badge ─────────────────────────────────────────────────────────────

function IntentBadge({ level }: { level: string }) {
  if (!level) return null;
  const cfg =
    level === "high"   ? { cls: "bg-green-500/15 text-green-400",  icon: TrendingUp,   label: "Alto" }
    : level === "medium" ? { cls: "bg-amber-500/15 text-amber-400",  icon: Minus,        label: "Medio" }
    :                      { cls: "bg-slate-700 text-slate-400",     icon: TrendingDown, label: "Bajo" };
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
      <Icon className="h-2.5 w-2.5" />{cfg.label}
    </span>
  );
}

// ─── Session row ──────────────────────────────────────────────────────────────

function SessionRow({
  s,
  isSelected,
  onClick,
}: {
  s: ChatSession_;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
        isSelected
          ? "border-orange-500/40 bg-orange-500/5"
          : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-medium text-slate-300">
                {new Date(s.started_at).toLocaleString("es-GT", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "America/Guatemala",
                })}
              </p>
              {s.lead && (
                <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
                  {s.lead.ref_id}
                </span>
              )}
              <IntentBadge level={s.intent_level ?? ""} />
            </div>
            {s.lead && (
              <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />{s.lead.name}
                </span>
                {s.lead.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />{s.lead.phone}
                  </span>
                )}
                {s.lead.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />{s.lead.email}
                  </span>
                )}
              </div>
            )}
            {!s.lead && s.first_message && (
              <p className="mt-0.5 max-w-xs truncate text-[11px] text-slate-500">
                {s.first_message}
              </p>
            )}
            {s.intent_summary && (
              <p className="mt-1 max-w-sm truncate text-[11px] text-slate-400 italic">
                {s.intent_summary}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-400">
            {s.message_count} msg
          </span>
          <ChevronRight className={`h-3.5 w-3.5 text-slate-600 transition-transform ${isSelected ? "rotate-90 text-orange-400" : ""}`} />
        </div>
      </div>
    </button>
  );
}

// ─── Session detail panel ─────────────────────────────────────────────────────

function SessionDetailPanel({
  detail,
  onClose,
}: {
  detail: ChatSessionDetail;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/60">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs font-semibold text-slate-200">
              {new Date(detail.started_at).toLocaleString("es-GT", {
                dateStyle: "long",
                timeStyle: "short",
                timeZone: "America/Guatemala",
              })}
            </p>
            {detail.lead && (
              <p className="text-[11px] text-slate-500">
                {detail.lead.name} · <span className="font-mono text-orange-400">{detail.lead.ref_id}</span>
              </p>
            )}
          </div>
        </div>
        {detail.intent_level && <IntentBadge level={detail.intent_level} />}
      </div>

      {/* Lead info */}
      {detail.lead && (
        <div className="border-b border-slate-800 px-4 py-3 flex flex-wrap gap-3 text-[11px] text-slate-400">
          {detail.lead.phone && (
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{detail.lead.phone}</span>
          )}
          {detail.lead.email && (
            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{detail.lead.email}</span>
          )}
        </div>
      )}

      {/* Intent summary */}
      {detail.intent_summary && (
        <div className="border-b border-slate-800 px-4 py-2.5 bg-slate-950/30">
          <p className="text-[11px] text-slate-400 italic">{detail.intent_summary}</p>
        </div>
      )}

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {detail.messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-slate-700 text-slate-200"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Conversaciones ──────────────────────────────────────────────────────

type HasLeadFilter    = "all" | "true" | "false";
type IntentFilter     = "all" | "high" | "medium" | "low";

function ConversationsTab({
  token,
  orgId,
  hasWidget,
}: {
  token: string;
  orgId: string;
  hasWidget: boolean;
}) {
  const [page, setPage]           = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasLead, setHasLead]     = useState<HasLeadFilter>("all");
  const [intentLevel, setIntent]  = useState<IntentFilter>("all");
  const PAGE_SIZE = 20;

  const filters = {
    hasLead:     hasLead     !== "all" ? (hasLead     as "true" | "false")                : undefined,
    intentLevel: intentLevel !== "all" ? (intentLevel as "high" | "medium" | "low")      : undefined,
  };

  const changeFilter = (fn: () => void) => { fn(); setPage(1); setSelectedId(null); };

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ["chatbot-sessions", orgId, page, hasLead, intentLevel],
    queryFn: () => chatbotApi.listSessions(token, orgId, page, PAGE_SIZE, filters),
    enabled: !!token && !!orgId && hasWidget,
  });

  const { data: sessionDetail, isLoading: loadingDetail } = useQuery<ChatSessionDetail>({
    queryKey: ["chatbot-session", orgId, selectedId],
    queryFn: () => chatbotApi.getSession(token, orgId, selectedId!),
    enabled: !!token && !!orgId && !!selectedId,
  });

  const sessions = (sessionsData?.sessions as ChatSession_[]) ?? [];
  const totalPages = sessionsData?.total_pages ?? 1;
  const count = sessionsData?.count ?? 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
      {/* ── Left: session list ── */}
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Historial de conversaciones</h3>
            {!isLoading && (
              <p className="text-xs text-slate-500 mt-0.5">{count} sesiones registradas</p>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <button
                onClick={() => { setPage((p) => Math.max(1, p - 1)); setSelectedId(null); }}
                disabled={page === 1}
                className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 disabled:opacity-40 hover:border-slate-600 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-1">{page} / {totalPages}</span>
              <button
                onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); setSelectedId(null); }}
                disabled={page === totalPages}
                className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 disabled:opacity-40 hover:border-slate-600 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Lead filter */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
            {(
              [
                { id: "all",   label: "Todos" },
                { id: "true",  label: "Con lead" },
                { id: "false", label: "Sin lead" },
              ] as { id: HasLeadFilter; label: string }[]
            ).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => changeFilter(() => setHasLead(id))}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  hasLead === id
                    ? "bg-slate-700 text-slate-100"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Intent filter */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
            {(
              [
                { id: "all",    label: "Intención" },
                { id: "high",   label: "Alto",  cls: "text-green-400" },
                { id: "medium", label: "Medio", cls: "text-amber-400" },
                { id: "low",    label: "Bajo",  cls: "text-slate-400" },
              ] as { id: IntentFilter; label: string; cls?: string }[]
            ).map(({ id, label, cls }) => (
              <button
                key={id}
                onClick={() => changeFilter(() => setIntent(id))}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  intentLevel === id
                    ? `bg-slate-700 ${cls ?? "text-slate-100"}`
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/40 py-16">
            <MessageSquare className="h-8 w-8 text-slate-700" />
            <p className="text-sm text-slate-500">Aún no hay conversaciones</p>
            <p className="text-xs text-slate-600">Las sesiones del widget aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <SessionRow
                key={s.id}
                s={s}
                isSelected={selectedId === s.id}
                onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
              />
            ))}
          </div>
        )}

        {/* Bottom pagination */}
        {totalPages > 1 && sessions.length > 0 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => { setPage((p) => Math.max(1, p - 1)); setSelectedId(null); }}
              disabled={page === 1}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 disabled:opacity-40 hover:border-slate-600 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <span className="text-xs text-slate-500">Página {page} de {totalPages}</span>
            <button
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); setSelectedId(null); }}
              disabled={page === totalPages}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 disabled:opacity-40 hover:border-slate-600 transition-colors"
            >
              Siguiente <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Right: session detail ── */}
      <div className="hidden lg:block">
        {selectedId ? (
          loadingDetail ? (
            <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60">
              <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            </div>
          ) : sessionDetail && sessionDetail.id === selectedId ? (
            <div className="sticky top-0 max-h-[calc(100vh-180px)]">
              <SessionDetailPanel
                detail={sessionDetail}
                onClose={() => setSelectedId(null)}
              />
            </div>
          ) : null
        ) : (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-800 border-dashed bg-slate-950/20">
            <MessageSquare className="h-8 w-8 text-slate-700" />
            <p className="text-sm text-slate-500">Selecciona una sesión para ver la transcripción</p>
          </div>
        )}
      </div>

      {/* Mobile: transcript inline (below the list) */}
      {selectedId && sessionDetail && sessionDetail.id === selectedId && (
        <div className="lg:hidden">
          <SessionDetailPanel
            detail={sessionDetail}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatbotPage() {
  const { tokens, organization } = useAuthStore();
  const token = tokens?.access ?? "";
  const orgId = organization?.id ?? "";
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"config" | "sessions">("config");

  // ── Form state ────────────────────────────────────────────────────────────
  const [name, setName]                     = useState("Asistente");
  const [llmModel, setLlmModel]             = useState("groq/llama-3.3-70b-versatile");
  const [welcomeMessage, setWelcomeMessage] = useState("¡Hola! ¿En qué puedo ayudarte hoy?");
  const [systemPrompt, setSystemPrompt]     = useState("");
  const [isActive, setIsActive]             = useState(true);
  const [color, setColor]                   = useState("#0891b2");
  const [captureLead, setCaptureLead]       = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [promptFileName, setPromptFileName] = useState<string | null>(null);
  const [promptDragOver, setPromptDragOver] = useState(false);
  const promptFileRef = useRef<HTMLInputElement>(null);

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["chatbot-manage", orgId],
    queryFn:  () => chatbotApi.get(token, orgId),
    enabled:  !!token && !!orgId,
  });

  useEffect(() => {
    if (!data?.widget) return;
    const w: ChatbotWidget = data.widget;
    setName(w.name ?? "Asistente");
    setLlmModel(w.llm_model ?? "groq/llama-3.3-70b-versatile");
    setWelcomeMessage(w.welcome_message ?? "¡Hola! ¿En qué puedo ayudarte hoy?");
    setSystemPrompt(w.system_prompt ?? "");
    setIsActive(w.is_active ?? true);
    setColor((w.config?.color as string) ?? "#0891b2");
    setCaptureLead((w.config?.capture_lead as boolean) ?? false);
  }, [data?.widget]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload: Partial<ChatbotWidget>) => chatbotApi.save(token, orgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-manage", orgId] });
      toast.success("Configuración guardada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const loadPromptFile = (file: File) => {
    if (!file.name.endsWith(".md") && !file.name.endsWith(".txt")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) { setSystemPrompt(text); setPromptFileName(file.name); }
    };
    reader.readAsText(file, "utf-8");
  };

  const handleSave = () => {
    saveMutation.mutate({
      name, llm_model: llmModel, welcome_message: welcomeMessage,
      system_prompt: systemPrompt, is_active: isActive,
      config: { color, capture_lead: captureLead },
    });
  };

  // ── Re-embed ──────────────────────────────────────────────────────────────
  const embedMutation = useMutation({
    mutationFn: () => chatbotApi.triggerEmbed(token, orgId),
    onSuccess: () => {
      toast.success("Re-embedding en cola. Puede tardar unos minutos.");
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["chatbot-manage", orgId] }), 3000);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Embed code ────────────────────────────────────────────────────────────
  const widgetToken = data?.widget?.token;
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  const origin  = typeof window !== "undefined" ? window.location.origin : "https://optimizacrm.com";
  const embedScript = widgetToken
    ? `<script\n  src="${origin}/chatbot-widget.js"\n  data-token="${widgetToken}"\n  data-api="${apiBase}"\n  defer\n></script>`
    : "";

  const embedStatus = data?.widget?.embed_status;
  const chunkCount  = embedStatus?.total_chunks ?? 0;
  const embeddedPct = chunkCount > 0
    ? ((embedStatus?.embedded_chunks ?? 0) / chunkCount) * 100
    : 0;

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
        <DashboardHeader title="Chatbot RAG" />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      </div>
    );
  }

  return (
    <FeatureGate
      minPlan="pro"
      featureName="Chatbot RAG"
      featureDescription="Despliega un chatbot inteligente en tu web con respuestas basadas en tu base de conocimiento, entrenado con tus propios datos."
      highlights={["Widget embebible en tu sitio web", "Respuestas con IA generativa", "Captura automática de leads", "Integrado con tu Base de Conocimiento"]}
    >
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <DashboardHeader title="Chatbot RAG" />

      <div className="flex-1 overflow-y-auto bg-slate-900/30">
        <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">

          {/* ── Header row ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Chatbot IA</h2>
                <p className="text-sm text-slate-400">
                  Responde preguntas usando tu Base de Conocimiento compartida
                </p>
              </div>
            </div>
            {activeTab === "config" && (
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {saveMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Save className="h-4 w-4" />}
                Guardar
              </button>
            )}
          </div>

          {/* ── KPI cards ── */}
          {data?.widget && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                {
                  label: "Mensajes totales",
                  value: data.widget.message_count.toLocaleString(),
                  icon: MessageSquare,
                  color: "text-sky-400", bg: "bg-sky-950/40",
                  border: "border-sky-800/30", glow: "shadow-sky-900/20",
                },
                {
                  label: "Sesiones totales",
                  value: data.widget.session_count.toLocaleString(),
                  icon: Users,
                  color: "text-orange-400", bg: "bg-orange-950/40",
                  border: "border-orange-800/30", glow: "shadow-orange-900/20",
                },
                {
                  label: "Leads capturados",
                  value: (data.widget.leads_count ?? 0).toLocaleString(),
                  icon: Zap,
                  color: "text-green-400", bg: "bg-green-950/40",
                  border: "border-green-800/30", glow: "shadow-green-900/20",
                },
                {
                  label: "Fragmentos KB",
                  value: chunkCount.toLocaleString(),
                  icon: Database,
                  color: "text-amber-400", bg: "bg-amber-950/40",
                  border: "border-amber-800/30", glow: "shadow-amber-900/20",
                },
              ].map(({ label, value, icon: Icon, color, bg, border, glow }) => (
                <div
                  key={label}
                  className={`rounded-2xl border ${border} bg-slate-950 p-5 flex flex-col gap-4 shadow-lg ${glow}`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-100">{value}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Tab bar ── */}
          <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
            {(
              [
                { id: "config",   label: "Configuración",   icon: Settings },
                { id: "sessions", label: "Conversaciones",  icon: MessageSquare,
                  badge: data?.widget?.session_count ?? 0 },
              ] as const
            ).map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? "bg-slate-800 text-slate-100 shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {badge !== undefined && badge > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    activeTab === id ? "bg-orange-500/20 text-orange-400" : "bg-slate-800 text-slate-500"
                  }`}>
                    {badge.toLocaleString()}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab: Configuración ── */}
          {activeTab === "config" && (
            <div className="space-y-6">

              {/* Embedding status */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200">Estado del embedding</h3>
                  <button
                    onClick={() => embedMutation.mutate()}
                    disabled={embedMutation.isPending}
                    className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100 disabled:opacity-50 transition-colors"
                  >
                    {embedMutation.isPending
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <RefreshCw className="h-3.5 w-3.5" />}
                    Regenerar embeddings
                  </button>
                </div>
                {chunkCount === 0 ? (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                    <p className="text-sm text-amber-300">
                      No hay fragmentos embebidos. Guarda contenido en la{" "}
                      <a href="/dashboard/knowledge-base" className="underline hover:text-amber-200">
                        Base de Conocimiento
                      </a>{" "}
                      y luego haz clic en &quot;Regenerar embeddings&quot;.
                    </p>
                  </div>
                ) : (
                  <EmbedProgress pct={embeddedPct} count={chunkCount} />
                )}
              </div>

              {/* Widget configuration */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-5">
                <h3 className="text-sm font-semibold text-slate-200">Configuración del widget</h3>

                {/* Active toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">Widget activo</p>
                    <p className="text-xs text-slate-500">Si está inactivo, el chatbot no responderá</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={isActive}
                    onClick={() => setIsActive((v) => !v)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                      isActive ? "bg-orange-500" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Capture lead toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">Captura de leads</p>
                    <p className="text-xs text-slate-500">
                      El chatbot solicitará nombre, teléfono y email tras el saludo inicial y registrará el lead con código OPT-XXXX
                    </p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={captureLead}
                    onClick={() => setCaptureLead((v) => !v)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                      captureLead ? "bg-orange-500" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        captureLead ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Nombre del asistente
                  </label>
                  <input
                    className={inputCls}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Asistente"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Color del widget
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-10 w-10 cursor-pointer rounded-lg border border-slate-700 bg-slate-900 p-0.5"
                    />
                    <input
                      className={inputCls + " font-mono uppercase"}
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="#0891b2"
                      maxLength={7}
                    />
                    <div
                      className="h-10 w-10 flex-shrink-0 rounded-lg border border-slate-700"
                      style={{ background: color }}
                    />
                  </div>
                </div>

                {/* LLM model */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Modelo de lenguaje
                  </label>
                  <select
                    className={selectCls}
                    value={llmModel}
                    onChange={(e) => setLlmModel(e.target.value)}
                  >
                    {LLM_MODELS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Welcome message */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Mensaje de bienvenida
                  </label>
                  <input
                    className={inputCls}
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="¡Hola! ¿En qué puedo ayudarte hoy?"
                  />
                </div>

                {/* System prompt — collapsible */}
                <div>
                  <button
                    onClick={() => setPromptExpanded((v) => !v)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span>Instrucciones del sistema</span>
                      {systemPrompt && (
                        <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
                          {systemPrompt.length.toLocaleString()} chars
                        </span>
                      )}
                    </div>
                    {promptExpanded
                      ? <ChevronUp className="h-4 w-4 text-slate-400" />
                      : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </button>

                  {promptExpanded && (
                    <div className="mt-3 space-y-3">
                      {promptFileName && (
                        <div className="flex items-center justify-between rounded-lg border border-green-800/50 bg-green-950/30 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-green-900/60 text-[9px] font-bold text-green-400">
                              MD
                            </div>
                            <span className="text-xs font-medium text-green-300">{promptFileName}</span>
                            <span className="text-[10px] text-green-600">cargado</span>
                          </div>
                          <button
                            onClick={() => { setSystemPrompt(""); setPromptFileName(null); }}
                            className="rounded p-0.5 text-green-700 hover:text-green-400 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      <div
                        onDragOver={(e) => { e.preventDefault(); setPromptDragOver(true); }}
                        onDragLeave={() => setPromptDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setPromptDragOver(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) loadPromptFile(file);
                        }}
                        className={`relative rounded-xl border transition-colors ${
                          promptDragOver ? "border-orange-500 bg-orange-500/5" : "border-slate-700"
                        }`}
                      >
                        {promptDragOver && (
                          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-orange-500/10">
                            <div className="flex flex-col items-center gap-1.5">
                              <FileUp className="h-6 w-6 text-orange-400" />
                              <span className="text-xs font-medium text-orange-300">Suelta el archivo aquí</span>
                            </div>
                          </div>
                        )}
                        <textarea
                          className="w-full rounded-xl bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-400/20 resize-none font-mono leading-relaxed"
                          rows={12}
                          value={systemPrompt}
                          onChange={(e) => setSystemPrompt(e.target.value)}
                          placeholder={"Eres un asistente de ventas amable.\nResponde siempre en español.\n\n# O arrastra un archivo .md aquí"}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                          Se antepone al contexto de la KB en cada conversación.
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => promptFileRef.current?.click()}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-orange-600/60 hover:text-orange-400 transition-colors"
                          >
                            <FileUp className="h-3.5 w-3.5" />
                            .md / .txt
                          </button>
                          <input
                            ref={promptFileRef}
                            type="file"
                            accept=".md,.txt"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file) loadPromptFile(file);
                            }}
                          />
                          <button
                            onClick={handleSave}
                            disabled={saveMutation.isPending}
                            className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                          >
                            {saveMutation.isPending
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Save className="h-3.5 w-3.5" />}
                            Guardar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Embed code */}
              {widgetToken && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-200">Código de integración</h3>
                    <CopyButton text={embedScript} />
                  </div>
                  <p className="text-xs text-slate-500">
                    Pega este script antes del cierre de{" "}
                    <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">&lt;/body&gt;</code>{" "}
                    en tu sitio web.
                  </p>
                  <pre className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-950 p-4 text-xs text-slate-300 leading-relaxed">
                    {embedScript}
                  </pre>
                  <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                    <p className="mb-1 text-xs font-medium text-slate-400">Token del widget</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate text-xs text-slate-300">{widgetToken}</code>
                      <CopyButton text={widgetToken} />
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
                    <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-sky-400" />
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      El Chatbot RAG aparece automáticamente como canal en el{" "}
                      <a href="/dashboard/hub" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                        Hub de Contacto
                      </a>{" "}
                      cuando el widget está activo.
                    </p>
                  </div>
                </div>
              )}

              {/* API endpoints */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-200">Endpoints del chatbot</h3>
                <div className="space-y-2">
                  {[
                    { method: "POST", path: "/api/v1/chatbot/chat/",   desc: "Enviar mensaje (público, requiere token)" },
                    { method: "GET",  path: "/api/v1/chatbot/config/", desc: "Configuración pública del widget" },
                  ].map(({ method, path, desc }) => (
                    <div key={path} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                      <span
                        className={`mt-0.5 flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          method === "POST"
                            ? "bg-orange-500/15 text-orange-400"
                            : "bg-blue-500/15 text-blue-400"
                        }`}
                      >
                        {method}
                      </span>
                      <div>
                        <code className="text-xs text-slate-300">{path}</code>
                        <p className="mt-0.5 text-[11px] text-slate-500">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ── Tab: Conversaciones ── */}
          {activeTab === "sessions" && (
            <ConversationsTab
              token={token}
              orgId={orgId}
              hasWidget={!!data?.widget}
            />
          )}

        </div>
      </div>
    </div>
    </FeatureGate>
  );
}
