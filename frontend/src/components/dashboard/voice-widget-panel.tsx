"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mic, Copy, Check, Zap, Phone, ToggleLeft, ToggleRight,
  ExternalLink, Maximize2, Rocket, Globe2, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { voiceWidgetApi, cmsApi, type VoiceWidget, type VoiceKnowledgeBase } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

// ─── Constants ────────────────────────────────────────────────────────────────

const VOICE_OPTIONS = [
  { value: "Nuria",  label: "Nuria — Femenina, México" },
  { value: "Jorge",  label: "Jorge — Masculino, México" },
  { value: "Dalia",  label: "Dalia — Femenina, México" },
  { value: "Elvira", label: "Elvira — Femenina, España" },
];
const MODEL_OPTIONS = [
  { value: "groq/llama-3.3-70b-versatile",      label: "Groq Llama 3.3 70B (recomendado)" },
  { value: "groq/llama-3.1-8b-instant",          label: "Groq Llama 3.1 8B (ultra rápido)" },
  { value: "openai/gpt-4o",                       label: "OpenAI GPT-4o" },
  { value: "openai/gpt-4o-mini",                  label: "OpenAI GPT-4o Mini" },
  { value: "anthropic/claude-3-5-haiku-20241022", label: "Anthropic Claude 3.5 Haiku" },
];

const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500";
const labelCls = "text-xs font-medium text-slate-400";

// ─── ExpandableTextarea ───────────────────────────────────────────────────────

function ExpandableTextarea({
  label, value, onChange, placeholder, rows = 3, hint, colSpan2 = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  hint?: string;
  colSpan2?: boolean;
}) {
  const [open,  setOpen]  = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!open) setDraft(value);
  }, [value, open]);

  return (
    <div className={colSpan2 ? "sm:col-span-2" : ""}>
      <div className="mb-1 flex items-center justify-between">
        <label className={labelCls}>
          {label}
          {hint && <span className="ml-1 text-slate-500">{hint}</span>}
        </label>
        <button
          type="button"
          onClick={() => { setDraft(value); setOpen(true); }}
          className="text-slate-600 hover:text-orange-400 transition-colors"
          title="Expandir editor"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <textarea
        rows={rows}
        className={inputCls + " resize-none"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl border-slate-700 bg-slate-900 p-0">
          <DialogHeader className="border-b border-slate-800 px-6 py-4">
            <DialogTitle className="text-sm font-semibold text-white">{label}</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <textarea
              rows={18}
              className={inputCls + " resize-y"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
            <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-500 text-white"
              onClick={() => { onChange(draft); setOpen(false); }}
            >
              Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Snippet ─────────────────────────────────────────────────────────────────

function VoiceSnippetBox({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://app.optimizacrm.com";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
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

  const [vapiPrivateKey, setVapiPrivateKey] = useState("");
  const [vapiPublicKey,  setVapiPublicKey]  = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["voice-widget"],
    queryFn:  () => voiceWidgetApi.get(auth.token, auth.orgId),
    enabled:  !!tokens && !!organization,
  });

  const widget = data?.widget ?? null;
  const [form,   setForm]   = useState<Partial<VoiceWidget>>({});
  const [kbForm, setKbForm] = useState<Partial<VoiceKnowledgeBase>>({});
  const [dirty,   setDirty]   = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const current: VoiceWidget = widget ?? DEFAULT_WIDGET;
  const merged: VoiceWidget  = {
    ...current,
    ...form,
    config: { ...current.config, ...(form.config ?? {}) },
  };
  const mergedKb: VoiceKnowledgeBase = {
    ...(current.knowledge_base ?? DEFAULT_KB),
    ...kbForm,
  };

  const patch    = (key: keyof VoiceWidget, value: unknown) => { setForm((f) => ({ ...f, [key]: value })); setDirty(true); };
  const patchCfg = (key: string, value: string)              => { setForm((f) => ({ ...f, config: { ...(f.config ?? {}), [key]: value } })); setDirty(true); };
  const patchKb  = (key: keyof VoiceKnowledgeBase, value: string | string[]) => { setKbForm((f) => ({ ...f, [key]: value })); setDirty(true); };

  const saveMutation = useMutation({
    mutationFn: () =>
      voiceWidgetApi.save(auth.token, auth.orgId, {
        ...merged,
        knowledge_base: mergedKb,
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

  // Publish on optimizacrm.com
  const [publishedOnWeb, setPublishedOnWeb] = useState(false);
  const [publishError,   setPublishError]   = useState("");
  const publishMutation = useMutation({
    mutationFn: async (widgetToken: string) => {
      const existing = await cmsApi.getSection("general").catch(() => ({ data: {} }));
      return cmsApi.updateSection(auth.token, "general", {
        ...(existing?.data ?? {}),
        website_voice_widget_token: widgetToken,
      }, auth.orgId);
    },
    onSuccess: () => { setPublishedOnWeb(true); setPublishError(""); },
    onError:   (e: Error) => setPublishError(e.message || "Error al publicar"),
  });

  // URL scraper
  const [scrapeOpen,     setScrapeOpen]     = useState(false);
  const [scrapeUrl,      setScrapeUrl]      = useState("");
  const [scrapeImported, setScrapeImported] = useState<string[]>([]);
  const scrapeMutation = useMutation({
    mutationFn: () => voiceWidgetApi.scrapeUrl(auth.token, auth.orgId, scrapeUrl),
    onSuccess: ({ knowledge_base }) => {
      const imported: string[] = [];
      const fieldsToMerge = [
        "company_info", "products_services", "pricing", "faqs",
        "working_hours", "contact_info", "appointment_rules", "qualification_questions",
      ] as const;
      setKbForm((prev) => {
        const next = { ...prev };
        for (const field of fieldsToMerge) {
          const val = knowledge_base[field];
          if (val && (typeof val === "string" ? val.trim() : (val as string[]).length > 0)) {
            (next as Record<string, unknown>)[field] = val;
            imported.push(field);
          }
        }
        return next;
      });
      setDirty(true);
      setScrapeImported(imported);
      setScrapeUrl("");
      setScrapeOpen(false);
    },
  });

  if (isLoading) return <div className="h-48 animate-pulse rounded-2xl bg-slate-800" />;

  const qualQsStr = (mergedKb.qualification_questions ?? []).join("\n");

  return (
    <Card className="rounded-2xl border border-slate-700 bg-slate-950">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-base">Agente de Voz IA</CardTitle>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-400">
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
                onClick={() => patch("is_active", !merged.is_active)}
                className="text-slate-400 hover:text-orange-400 transition-colors"
                title={merged.is_active ? "Desactivar asistente" : "Activar asistente"}
              >
                {merged.is_active
                  ? <ToggleRight className="h-6 w-6 text-orange-500" />
                  : <ToggleLeft  className="h-6 w-6" />}
              </button>
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Añade un asistente de voz flotante a tu web. Cada organización conecta su propia cuenta de Vapi.
          Los costes de voz se facturan directamente por Vapi a tu tarjeta.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── A. Vapi API Keys ─────────────────────────────────────────────── */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-300">Claves API de Vapi</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls + " mb-1 block"}>Private API Key</label>
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
              <label className={labelCls + " mb-1 block"}>Public API Key</label>
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
              className="inline-flex items-center gap-0.5 text-orange-400 hover:text-orange-300">
              dashboard.vapi.ai <ExternalLink className="h-2.5 w-2.5" />
            </a>{" "}
            → Account → API Keys
          </p>
        </div>

        {/* ── B. Configuración del agente ──────────────────────────────────── */}
        <div className="border-t border-slate-800 pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-300">Configuración del Agente</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls + " mb-1 block"}>Nombre del agente</label>
              <Input
                className={inputCls}
                value={merged.config.agent_name ?? ""}
                onChange={(e) => patchCfg("agent_name", e.target.value)}
                placeholder="Sofía"
              />
            </div>
            <div>
              <label className={labelCls + " mb-1 block"}>Voz</label>
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
              <label className={labelCls + " mb-1 block"}>Modelo LLM</label>
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
              <label className={labelCls + " mb-1 block"}>Color principal</label>
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
              <label className={labelCls + " mb-1 block"}>Despedida</label>
              <Input
                className={inputCls}
                value={merged.config.farewell ?? ""}
                onChange={(e) => patchCfg("farewell", e.target.value)}
                placeholder="Hasta luego, fue un placer ayudarte."
              />
            </div>
            <div className="sm:col-span-2">
              <div className="mb-1 flex items-center justify-between">
                <label className={labelCls}>Saludo inicial</label>
                <button
                  type="button"
                  onClick={() => {/* handled by ExpandableTextarea */}}
                  className="hidden"
                />
              </div>
              <ExpandableTextarea
                label="Saludo inicial"
                value={merged.config.greeting ?? ""}
                onChange={(v) => patchCfg("greeting", v)}
                placeholder={`Hola, soy ${merged.config.agent_name || "Sofía"}. ¿En qué puedo ayudarte hoy?`}
                rows={2}
                colSpan2={false}
              />
            </div>
          </div>
        </div>

        {/* ── C. Base de Conocimiento ──────────────────────────────────────── */}
        <div className="border-t border-slate-800 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Base de Conocimiento</p>
            <button
              type="button"
              onClick={() => { setScrapeImported([]); setScrapeOpen(true); }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-orange-600 hover:text-orange-400 transition-colors"
              title="Importar base de conocimiento desde una URL"
            >
              <Globe2 className="h-3.5 w-3.5" />
              Importar desde URL
            </button>
          </div>

          {/* Import success banner */}
          {scrapeImported.length > 0 && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-green-800 bg-green-950/40 px-3 py-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400" />
              <p className="text-xs text-green-300">
                Datos importados en:{" "}
                <span className="font-medium">{scrapeImported.join(", ")}</span>.
                Revisa los campos y haz clic en <strong>Guardar cambios</strong> para confirmar.
              </p>
            </div>
          )}

          {/* Scrape URL Dialog */}
          <Dialog open={scrapeOpen} onOpenChange={setScrapeOpen}>
            <DialogContent className="max-w-lg border-slate-700 bg-slate-900 p-0">
              <DialogHeader className="border-b border-slate-800 px-6 py-4">
                <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Globe2 className="h-4 w-4 text-orange-400" />
                  Importar base de conocimiento desde URL
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 px-6 py-5">
                <p className="text-xs text-slate-400">
                  Pega la URL de tu web corporativa, página de servicios o cualquier página pública.
                  La IA extraerá y clasificará el contenido en los campos de la base de conocimiento.
                </p>
                <div>
                  <label className={labelCls + " mb-1 block"}>URL de la página</label>
                  <Input
                    className={inputCls}
                    value={scrapeUrl}
                    onChange={(e) => setScrapeUrl(e.target.value)}
                    placeholder="https://www.tuempresa.com"
                    onKeyDown={(e) => { if (e.key === "Enter" && scrapeUrl) scrapeMutation.mutate(); }}
                    autoFocus
                  />
                </div>
                {scrapeMutation.isError && (
                  <p className="text-xs text-red-400">
                    {(scrapeMutation.error as Error)?.message || "Error al procesar la URL"}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
                <Button
                  variant="ghost"
                  className="text-slate-400 hover:text-white"
                  onClick={() => setScrapeOpen(false)}
                  disabled={scrapeMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white"
                  onClick={() => scrapeMutation.mutate()}
                  disabled={!scrapeUrl.trim() || scrapeMutation.isPending}
                >
                  {scrapeMutation.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importando…</>
                  ) : (
                    <><Globe2 className="h-3.5 w-3.5" /> Importar</>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="grid gap-3 sm:grid-cols-2">
            <ExpandableTextarea
              label="Sobre la empresa"
              value={mergedKb.company_info}
              onChange={(v) => patchKb("company_info", v)}
              placeholder="Describe quiénes sois, vuestra misión y valores…"
              rows={4}
              colSpan2
            />
            <ExpandableTextarea
              label="Productos y servicios"
              value={mergedKb.products_services}
              onChange={(v) => patchKb("products_services", v)}
              placeholder="Lista los productos o servicios que ofreces…"
              rows={4}
              colSpan2
            />
            <ExpandableTextarea
              label="Precios y planes"
              value={mergedKb.pricing}
              onChange={(v) => patchKb("pricing", v)}
              placeholder="Plan Básico: $X/mes — Plan Pro: $Y/mes…"
              rows={3}
              colSpan2
            />
            <ExpandableTextarea
              label="Preguntas frecuentes"
              value={mergedKb.faqs}
              onChange={(v) => patchKb("faqs", v)}
              placeholder="P: ¿Tienen soporte 24/7? R: Sí, disponible por chat y email…"
              rows={4}
              colSpan2
            />
            <div>
              <label className={labelCls + " mb-1 block"}>Horario de atención</label>
              <Input
                className={inputCls}
                value={mergedKb.working_hours}
                onChange={(e) => patchKb("working_hours", e.target.value)}
                placeholder="Lunes a Viernes 9:00–18:00 (hora Ciudad de México)"
              />
            </div>
            <div>
              <label className={labelCls + " mb-1 block"}>WhatsApp de escalado</label>
              <Input
                className={inputCls}
                value={mergedKb.whatsapp_number}
                onChange={(e) => patchKb("whatsapp_number", e.target.value)}
                placeholder="Con código país: 50212345678"
              />
            </div>
            <ExpandableTextarea
              label="Información de contacto"
              value={mergedKb.contact_info}
              onChange={(v) => patchKb("contact_info", v)}
              placeholder="Email: hola@empresa.com | Tel: +502 1234 5678"
              rows={2}
              colSpan2
            />
            <ExpandableTextarea
              label="Reglas de citas / agenda"
              value={mergedKb.appointment_rules}
              onChange={(v) => patchKb("appointment_rules", v)}
              placeholder="Las citas se reservan con 24h de antelación. Duración: 30 min…"
              rows={3}
              colSpan2
            />
            <ExpandableTextarea
              label="Preguntas de calificación"
              hint="(una por línea)"
              value={qualQsStr}
              onChange={(v) => patchKb("qualification_questions", v.split("\n").map((l) => l.trimStart()))}
              placeholder={"¿Cuántos empleados tiene tu empresa?\n¿Qué presupuesto manejas?\n¿Cuándo planeas implementar la solución?"}
              rows={3}
              colSpan2
            />
          </div>
        </div>

        {/* ── Guardar ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-t border-slate-800 pt-5">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={(!dirty && !!widget) || saveMutation.isPending}
            className="bg-orange-600 hover:bg-orange-500 text-white"
          >
            {saveMutation.isPending
              ? "Sincronizando con Vapi…"
              : widget ? "Guardar cambios" : "Crear asistente"}
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

        {/* ── Snippet + Publicar ───────────────────────────────────────────── */}
        {widget && (
          <div className="space-y-2 border-t border-slate-800 pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-400">Código para embeber el agente de voz</p>
              <a
                href={`/voice-widget-preview?token=${widget.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"
              >
                <ExternalLink className="h-3 w-3" /> Vista previa
              </a>
            </div>
            {!widget.vapi_assistant_id && (
              <p className="rounded-lg border border-amber-800 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
                El asistente aún no está sincronizado con Vapi. Configura tus API Keys y guarda para activar el widget.
              </p>
            )}
            <VoiceSnippetBox token={widget.token} />
            <p className="text-[11px] text-slate-500">
              Pega este script antes del cierre de <code className="text-slate-400">&lt;/body&gt;</code>.
              El widget se carga de forma asíncrona y no afecta el rendimiento de tu web.
            </p>

            {/* Publicar en optimizacrm.com */}
            {publishError && (
              <p className="mt-2 text-xs text-red-400">{publishError}</p>
            )}
            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-slate-200">Activar en optimizacrm.com</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Publica el agente de voz en todas las páginas de tu landing</p>
              </div>
              <Button
                size="sm"
                onClick={() => publishMutation.mutate(widget.token)}
                disabled={publishMutation.isPending || publishedOnWeb}
                className={cn(
                  "gap-1.5 text-xs",
                  publishedOnWeb
                    ? "bg-green-700 hover:bg-green-700 cursor-default text-white"
                    : "bg-orange-600 hover:bg-orange-500 text-white"
                )}
              >
                {publishedOnWeb ? (
                  <><Check className="h-3 w-3" /> Publicado</>
                ) : (
                  <><Rocket className="h-3 w-3" /> {publishMutation.isPending ? "Publicando…" : "Publicar"}</>
                )}
              </Button>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
