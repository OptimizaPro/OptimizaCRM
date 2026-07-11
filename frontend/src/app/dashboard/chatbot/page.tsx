"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { useAuthStore } from "@/store/auth";
import { chatbotApi, type ChatbotWidget, type ChatSession_ } from "@/lib/api";
import {
  Bot, Save, Copy, Check, RefreshCw, MessageSquare,
  Loader2, Info, ChevronDown, ChevronUp, FileUp,
} from "lucide-react";

// ─── Styles ──────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20";

const textareaCls =
  "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20 resize-none";

const selectCls =
  "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20";

// ─── LLM model options ───────────────────────────────────────────────────────

const LLM_MODELS = [
  { value: "groq/llama-3.3-70b-versatile",     label: "Llama 3.3 70B (Groq — rápido)" },
  { value: "groq/llama-3.1-8b-instant",         label: "Llama 3.1 8B (Groq — ultra-rápido)" },
  { value: "openai/gpt-4o-mini",                label: "GPT-4o Mini (OpenAI)" },
  { value: "openai/gpt-4o",                     label: "GPT-4o (OpenAI — más preciso)" },
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatbotPage() {
  const { tokens, organization } = useAuthStore();
  const token = tokens?.access ?? "";
  const orgId = organization?.id ?? "";
  const queryClient = useQueryClient();

  // ── Form state ────────────────────────────────────────────────────────────
  const [name, setName]                   = useState("Asistente");
  const [llmModel, setLlmModel]           = useState("groq/llama-3.3-70b-versatile");
  const [welcomeMessage, setWelcomeMessage] = useState("¡Hola! ¿En qué puedo ayudarte hoy?");
  const [systemPrompt, setSystemPrompt]   = useState("");
  const [isActive, setIsActive]           = useState(true);
  const [promptExpanded, setPromptExpanded] = useState(false);

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["chatbot-manage", orgId],
    queryFn:  () => chatbotApi.get(token, orgId),
    enabled:  !!token && !!orgId,
  });

  // Hydrate form when data loads
  useEffect(() => {
    if (!data?.widget) return;
    const w: ChatbotWidget = data.widget;
    setName(w.name ?? "Asistente");
    setLlmModel(w.llm_model ?? "groq/llama-3.3-70b-versatile");
    setWelcomeMessage(w.welcome_message ?? "¡Hola! ¿En qué puedo ayudarte hoy?");
    setSystemPrompt(w.system_prompt ?? "");
    setIsActive(w.is_active ?? true);
  }, [data?.widget]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload: Partial<ChatbotWidget>) =>
      chatbotApi.save(token, orgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-manage", orgId] });
      toast.success("Configuración guardada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSave = () => {
    saveMutation.mutate({ name, llm_model: llmModel, welcome_message: welcomeMessage, system_prompt: systemPrompt, is_active: isActive });
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

  // ── Sessions ──────────────────────────────────────────────────────────────
  const { data: sessionsData } = useQuery({
    queryKey: ["chatbot-sessions", orgId],
    queryFn:  () => chatbotApi.listSessions(token, orgId),
    enabled:  !!token && !!orgId && !!data?.widget,
  });

  // ── Embed code ───────────────────────────────────────────────────────────
  const widgetToken = data?.widget?.token;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ?? "https://api.optimizacrm.com";
  const embedScript = widgetToken
    ? `<script src="${apiUrl}/static/chatbot.js" data-token="${widgetToken}" defer></script>`
    : "";

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

  const embedStatus = data?.widget?.embed_status;
  const chunkCount  = embedStatus?.total_chunks    ?? 0;
  const embeddedPct = chunkCount > 0
    ? ((embedStatus?.embedded_chunks ?? 0) / chunkCount) * 100
    : 0;

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <DashboardHeader title="Chatbot RAG" />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-6 p-6">

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
          </div>

          {/* ── Embedding status ── */}
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

          {/* ── Widget configuration ── */}
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
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
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
                <span>Instrucciones del sistema (system prompt)</span>
                {promptExpanded
                  ? <ChevronUp className="h-4 w-4 text-slate-400" />
                  : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {promptExpanded && (
                <div className="mt-2 space-y-2">
                  <textarea
                    className={textareaCls}
                    rows={10}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Eres un asistente de ventas amable. Responde siempre en español. Si no tienes información sobre algo, di que lo consultarás con el equipo…"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-500">
                        Define el tono, idioma y comportamiento. Se antepone al contexto de la KB.
                      </p>
                      <label className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors">
                        <FileUp className="h-3.5 w-3.5" />
                        Subir .md / .txt
                        <input
                          type="file"
                          accept=".md,.txt"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const text = ev.target?.result as string;
                              if (text) setSystemPrompt(text);
                            };
                            reader.readAsText(file, "utf-8");
                          }}
                        />
                      </label>
                    </div>
                    <button
                      onClick={handleSave}
                      disabled={saveMutation.isPending}
                      className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    >
                      {saveMutation.isPending
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Save className="h-4 w-4" />}
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Stats ── */}
          {data?.widget && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { label: "Mensajes totales", value: data.widget.message_count },
                { label: "Sesiones iniciadas", value: data.widget.session_count },
                { label: "Fragmentos KB", value: chunkCount },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center"
                >
                  <p className="text-2xl font-bold text-slate-100">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Embed code ── */}
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
            </div>
          )}

          {/* ── Recent sessions ── */}
          {sessionsData && sessionsData.count > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">Sesiones recientes</h3>
                <span className="text-xs text-slate-500">{sessionsData.count} total</span>
              </div>
              <div className="space-y-2">
                {(sessionsData.sessions as ChatSession_[]).slice(0, 8).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-4 w-4 flex-shrink-0 text-slate-500" />
                      <div>
                        <p className="text-xs font-medium text-slate-300">
                          {new Date(s.started_at).toLocaleString("es-GT", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                        {s.first_message && (
                          <p className="max-w-xs truncate text-[11px] text-slate-500">
                            {s.first_message}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                      {s.message_count} msg
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── API endpoint info ── */}
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
      </div>
    </div>
  );
}
