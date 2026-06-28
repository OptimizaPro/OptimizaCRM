"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mic, Copy, Check, Zap, Phone, ToggleLeft, ToggleRight, ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { voiceWidgetApi, type VoiceWidget, type VoiceKnowledgeBase } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

// ─── Constants ────────────────────────────────────────────────────────────────

const VOICE_OPTIONS = [
  { value: "Nuria",  label: "Nuria — Femenina, México" },
  { value: "Jorge",  label: "Jorge — Masculino, México" },
  { value: "Dalia",  label: "Dalia — Femenina, México" },
  { value: "Elvira", label: "Elvira — Femenina, España" },
];
const MODEL_OPTIONS = [
  { value: "groq/llama-3.3-70b-versatile",       label: "Groq Llama 3.3 70B (recomendado)" },
  { value: "groq/llama-3.1-8b-instant",           label: "Groq Llama 3.1 8B (ultra rápido)" },
  { value: "openai/gpt-4o",                        label: "OpenAI GPT-4o" },
  { value: "openai/gpt-4o-mini",                   label: "OpenAI GPT-4o Mini" },
  { value: "anthropic/claude-3-5-haiku-20241022",  label: "Anthropic Claude 3.5 Haiku" },
];

const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500";
const labelCls = "mb-1 block text-xs font-medium text-slate-400";

// ─── Snippet ─────────────────────────────────────────────────────────────────
function VoiceSnippetBox({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const origin  = typeof window !== "undefined" ? window.location.origin : "https://app.optimizacrm.com";
  const apiUrl  = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const snippet = `<script\n  src="${origin}/voice-widget.js"\n  data-token="${token}"\n  data-api="${apiUrl}"\n  async\n></script>`;

  const copy = () => {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs text-slate-300">
      <pre className="overflow-x-auto whitespace-pre">{snippet}</pre>
      <button
        onClick={copy}
        className="absolute right-3 top-3 rounded-md border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:text-orange-400 transition-colors"
        title="Copiar snippet"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

// ─── Default values ───────────────────────────────────────────────────────────
const DEFAULT_WIDGET: VoiceWidget = {
  id: "", token: "", vapi_assistant_id: "", llm_model: "groq/llama-3.3-70b-versatile",
  is_active: true, lead_count: 0, call_count: 0,
  config: { agent_name: "Sofía", voice: "Nuria", color: "#EA580C", greeting: "", farewell: "" },
  knowledge_base: null,
};

const DEFAULT_KB: VoiceKnowledgeBase = {
  company_info: "", products_services: "", pricing: "", faqs: "",
  working_hours: "", contact_info: "", appointment_rules: "",
  qualification_questions: [], whatsapp_number: "",
};

// ─── Panel ───────────────────────────────────────────────────────────────────
export function VoiceWidgetPanel() {
  const { tokens, organization } = useAuthStore();
  const qc   = useQueryClient();
  const auth = { token: tokens!.access, orgId: organization!.id };

  // API keys (stored locally, sent on save)
  const [vapiPrivateKey, setVapiPrivateKey] = useState("");
  const [vapiPublicKey,  setVapiPublicKey]  = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["voice-widget"],
    queryFn:  () => voiceWidgetApi.get(auth.token, auth.orgId),
    enabled:  !!tokens && !!organization,
  });

  const widget  = data?.widget ?? null;
  const [form,  setForm]  = useState<Partial<VoiceWidget>>({});
  const [kbForm, setKbForm] = useState<Partial<VoiceKnowledgeBase>>({});
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const current: VoiceWidget = widget ?? DEFAULT_WIDGET;
  const merged:  VoiceWidget = {
    ...current,
    ...form,
    config: { ...current.config, ...(form.config ?? {}) },
  };
  const mergedKb: VoiceKnowledgeBase = {
    ...(current.knowledge_base ?? DEFAULT_KB),
    ...kbForm,
  };

  const patch = (key: keyof VoiceWidget, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };
  const patchCfg = (key: string, value: string) => {
    setForm((f) => ({ ...f, config: { ...(f.config ?? {}), [key]: value } }));
    setDirty(true);
  };
  const patchKb = (key: keyof VoiceKnowledgeBase, value: string | string[]) => {
    setKbForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      voiceWidgetApi.save(auth.token, auth.orgId, {
        ...merged,
        knowledge_base: mergedKb,
        // Pass Vapi keys if provided
        ...(vapiPrivateKey ? { vapi_private_key: vapiPrivateKey } as Record<string, unknown> : {}),
        ...(vapiPublicKey  ? { vapi_public_key:  vapiPublicKey  } as Record<string, unknown> : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voice-widget"] });
      setForm({});
      setKbForm({});
      setDirty(false);
      setSaveMsg("Asistente actualizado en Vapi");
      setTimeout(() => setSaveMsg(""), 4000);
    },
  });

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-slate-800" />;
  }

  const qualQsStr = (mergedKb.qualification_questions ?? []).join("\n");

  return (
    <Card className="rounded-2xl border border-slate-700 bg-slate-950">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-base">Agente de Voz IA</CardTitle>
            {/* Vapi badge */}
            <span className="rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-400 tracking-wide">
              Powered by Vapi
            </span>
          </div>
          {widget && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1">
                <Phone className="h-3 w-3 text-orange-400" />
                <span className="text-xs font-semibold text-slate-300">{widget.call_count} llamadas</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1">
                <Zap className="h-3 w-3 text-orange-400" />
                <span className="text-xs font-semibold text-slate-300">{widget.lead_count} leads</span>
              </div>
              <button
                onClick={() => { patch("is_active", !merged.is_active); }}
                className="text-slate-400 hover:text-orange-400 transition-colors"
                title={merged.is_active ? "Desactivar asistente" : "Activar asistente"}
              >
                {merged.is_active
                  ? <ToggleRight className="h-6 w-6 text-orange-500" />
                  : <ToggleLeft className="h-6 w-6" />}
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Añade un asistente de voz flotante a tu web. Cada organización conecta su propia cuenta de Vapi.
          Los costes de voz se facturan directamente por Vapi a tu tarjeta.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── A. Vapi API Keys ─────────────────────────────────────────────── */}
        <div>
          <p className="mb-3 text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Claves API de Vapi
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Private API Key</label>
              <input
                type="password"
                className={inputCls}
                value={vapiPrivateKey}
                onChange={(e) => { setVapiPrivateKey(e.target.value); setDirty(true); }}
                placeholder="sk-••••••••••••••••"
                autoComplete="off"
              />
            </div>
            <div>
              <label className={labelCls}>Public API Key</label>
              <Input
                className={inputCls}
                value={vapiPublicKey}
                onChange={(e) => { setVapiPublicKey(e.target.value); setDirty(true); }}
                placeholder="pk-••••••••••••••••"
                autoComplete="off"
              />
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            Obtén tus keys en{" "}
            <a href="https://dashboard.vapi.ai" target="_blank" rel="noopener noreferrer"
              className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-0.5">
              dashboard.vapi.ai <ExternalLink className="h-2.5 w-2.5" />
            </a>
            {" "}→ Account → API Keys
          </p>
        </div>

        {/* ── B. Widget Configuration ──────────────────────────────────────── */}
        <div className="border-t border-slate-800 pt-5">
          <p className="mb-3 text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Configuración del Agente
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Nombre del agente</label>
              <Input
                className={inputCls}
                value={merged.config.agent_name ?? ""}
                onChange={(e) => patchCfg("agent_name", e.target.value)}
                placeholder="Sofía"
              />
            </div>
            <div>
              <label className={labelCls}>Voz</label>
              <select
                className={inputCls}
                value={merged.config.voice ?? "Nuria"}
                onChange={(e) => patchCfg("voice", e.target.value)}
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Modelo LLM</label>
              <select
                className={inputCls}
                value={merged.llm_model ?? "groq/llama-3.3-70b-versatile"}
                onChange={(e) => patch("llm_model", e.target.value)}
              >
                {MODEL_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Color principal</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={merged.config.color ?? "#EA580C"}
                  onChange={(e) => patchCfg("color", e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-slate-700 bg-slate-800 p-0.5"
                />
                <Input
                  className={cn(inputCls, "font-mono")}
                  value={merged.config.color ?? "#EA580C"}
                  onChange={(e) => patchCfg("color", e.target.value)}
                  placeholder="#EA580C"
                  maxLength={7}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Despedida</label>
              <Input
                className={inputCls}
                value={merged.config.farewell ?? ""}
                onChange={(e) => patchCfg("farewell", e.target.value)}
                placeholder="Hasta luego, fue un placer ayudarte."
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Saludo inicial</label>
              <textarea
                rows={2}
                className={inputCls + " resize-none"}
                value={merged.config.greeting ?? ""}
                onChange={(e) => patchCfg("greeting", e.target.value)}
                placeholder={`Hola, soy ${merged.config.agent_name || "Sofía"}. ¿En qué puedo ayudarte hoy?`}
              />
            </div>
          </div>
        </div>

        {/* ── C. Knowledge Base ────────────────────────────────────────────── */}
        <div className="border-t border-slate-800 pt-5">
          <p className="mb-3 text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Base de Conocimiento
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Sobre la empresa</label>
              <textarea rows={4} className={inputCls + " resize-none"}
                value={mergedKb.company_info}
                onChange={(e) => patchKb("company_info", e.target.value)}
                placeholder="Describe quiénes sois, vuestra misión y valores…"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Productos y servicios</label>
              <textarea rows={4} className={inputCls + " resize-none"}
                value={mergedKb.products_services}
                onChange={(e) => patchKb("products_services", e.target.value)}
                placeholder="Lista los productos o servicios que ofreces…"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Precios y planes</label>
              <textarea rows={3} className={inputCls + " resize-none"}
                value={mergedKb.pricing}
                onChange={(e) => patchKb("pricing", e.target.value)}
                placeholder="Plan Básico: $X/mes — Plan Pro: $Y/mes…"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Preguntas frecuentes</label>
              <textarea rows={4} className={inputCls + " resize-none"}
                value={mergedKb.faqs}
                onChange={(e) => patchKb("faqs", e.target.value)}
                placeholder="P: ¿Tienen soporte 24/7? R: Sí, disponible por chat y email…"
              />
            </div>
            <div>
              <label className={labelCls}>Horario de atención</label>
              <Input
                className={inputCls}
                value={mergedKb.working_hours}
                onChange={(e) => patchKb("working_hours", e.target.value)}
                placeholder="Lunes a Viernes 9:00–18:00 (hora Ciudad de México)"
              />
            </div>
            <div>
              <label className={labelCls}>Número WhatsApp de escalado</label>
              <Input
                className={inputCls}
                value={mergedKb.whatsapp_number}
                onChange={(e) => patchKb("whatsapp_number", e.target.value)}
                placeholder="Con código país: 50212345678"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Información de contacto</label>
              <textarea rows={2} className={inputCls + " resize-none"}
                value={mergedKb.contact_info}
                onChange={(e) => patchKb("contact_info", e.target.value)}
                placeholder="Email: hola@empresa.com | Tel: +502 1234 5678"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Reglas de citas / agenda</label>
              <textarea rows={3} className={inputCls + " resize-none"}
                value={mergedKb.appointment_rules}
                onChange={(e) => patchKb("appointment_rules", e.target.value)}
                placeholder="Las citas se reservan con 24h de antelación. Duración: 30 min…"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>
                Preguntas de calificación
                <span className="ml-1 text-slate-500">(una por línea)</span>
              </label>
              <textarea rows={3} className={inputCls + " resize-none"}
                value={qualQsStr}
                onChange={(e) => {
                  const lines = e.target.value.split("\n").map((l) => l.trimStart());
                  patchKb("qualification_questions", lines);
                }}
                placeholder={"¿Cuántos empleados tiene tu empresa?\n¿Qué presupuesto manejas?\n¿Cuándo planeas implementar la solución?"}
              />
            </div>
          </div>
        </div>

        {/* ── Save ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-t border-slate-800 pt-5">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={(!dirty && !!widget) || saveMutation.isPending}
            className="bg-orange-600 hover:bg-orange-500 text-white"
          >
            {saveMutation.isPending
              ? "Sincronizando con Vapi…"
              : widget
              ? "Guardar cambios"
              : "Crear asistente"}
          </Button>
          {saveMsg && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <Check className="h-3.5 w-3.5" /> {saveMsg}
            </span>
          )}
          {saveMutation.isError && (
            <span className="text-xs text-red-400">
              {(saveMutation.error as Error)?.message || "Error al guardar"}
            </span>
          )}
        </div>

        {/* ── D. Embed snippet ─────────────────────────────────────────────── */}
        {widget && widget.vapi_assistant_id && (
          <div className="space-y-2 border-t border-slate-800 pt-5">
            <p className="text-xs font-medium text-slate-400">Código para embeber el agente de voz</p>
            <VoiceSnippetBox token={widget.token} />
            <p className="text-[11px] text-slate-500">
              Pega este script antes del cierre de <code className="text-slate-400">&lt;/body&gt;</code>.
              El widget se carga de forma asíncrona y no afecta el rendimiento de tu web.
            </p>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
