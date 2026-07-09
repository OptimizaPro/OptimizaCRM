"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mic, Copy, Check, Zap, Phone, ToggleLeft, ToggleRight,
  ExternalLink, Maximize2, Rocket, Globe2, Loader2, FileUp, Eye, EyeOff, Camera,
  Link2, FileText, Trash2, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { voiceWidgetApi, cmsApi, type VoiceWidget, type VoiceKnowledgeBase, type VoiceKBSource } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

// ─── Constants ────────────────────────────────────────────────────────────────

const VOICE_OPTIONS = [
  // ── México ────────────────────────────────────────────────────────────────
  { value: "es-MX-NuriaNeural",    label: "Nuria — Femenina · México" },
  { value: "es-MX-DaliaNeural",    label: "Dalia — Femenina · México" },
  { value: "es-MX-CarlotaNeural",  label: "Carlota — Femenina · México" },
  { value: "es-MX-BeatrizNeural",  label: "Beatriz — Femenina · México" },
  { value: "es-MX-LarissaNeural",  label: "Larissa — Femenina · México" },
  { value: "es-MX-RenataNeural",   label: "Renata — Femenina · México" },
  { value: "es-MX-MarinaNeural",   label: "Marina — Femenina · México" },
  { value: "es-MX-JorgeNeural",    label: "Jorge — Masculino · México" },
  { value: "es-MX-GerardoNeural",  label: "Gerardo — Masculino · México" },
  { value: "es-MX-YagoNeural",     label: "Yago — Masculino · México" },
  // ── Guatemala ─────────────────────────────────────────────────────────────
  { value: "es-GT-MartaNeural",    label: "Marta — Femenina · Guatemala" },
  { value: "es-GT-AndresNeural",   label: "Andrés — Masculino · Guatemala" },
  // ── Colombia ──────────────────────────────────────────────────────────────
  { value: "es-CO-SalomeNeural",   label: "Salomé — Femenina · Colombia" },
  { value: "es-CO-GonzaloNeural",  label: "Gonzalo — Masculino · Colombia" },
  // ── Argentina ─────────────────────────────────────────────────────────────
  { value: "es-AR-ElenaNeural",    label: "Elena — Femenina · Argentina" },
  { value: "es-AR-TomasNeural",    label: "Tomás — Masculino · Argentina" },
  // ── Chile ─────────────────────────────────────────────────────────────────
  { value: "es-CL-CatalinaNeural", label: "Catalina — Femenina · Chile" },
  { value: "es-CL-LorenzoNeural",  label: "Lorenzo — Masculino · Chile" },
  // ── España ────────────────────────────────────────────────────────────────
  { value: "es-ES-ElviraNeural",   label: "Elvira — Femenina · España" },
  { value: "es-ES-AbrilNeural",    label: "Abril — Femenina · España" },
  { value: "es-ES-IreneNeural",    label: "Irene — Femenina · España" },
  { value: "es-ES-AlvaroNeural",   label: "Álvaro — Masculino · España" },
  { value: "es-ES-TeoNeural",      label: "Teo — Masculino · España" },
  // ── US Spanish ────────────────────────────────────────────────────────────
  { value: "es-US-PalomaNeural",   label: "Paloma — Femenina · EE. UU." },
  { value: "es-US-AlonsoNeural",   label: "Alonso — Masculino · EE. UU." },
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
  id: "", token: "", name: "Agente de Voz", vapi_assistant_id: "", llm_model: "groq/llama-3.3-70b-versatile",
  is_active: true, lead_count: 0, call_count: 0,
  config: { agent_name: "Sofía", voice: "es-MX-NuriaNeural", color: "#EA580C", greeting: "", farewell: "", avatar_url: "", escalation_mode: "whatsapp", transfer_number: "" },
  knowledge_base: null,
};

const DEFAULT_KB: VoiceKnowledgeBase = {
  company_info: "", products_services: "", pricing: "", faqs: "",
  working_hours: "", contact_info: "", appointment_rules: "",
  qualification_questions: [], whatsapp_number: "",
};

// ─── Panel ───────────────────────────────────────────────────────────────────

export function VoiceWidgetPanel({ agentId }: { agentId?: string } = {}) {
  const { tokens, organization } = useAuthStore();
  const qc   = useQueryClient();
  const auth = { token: tokens!.access, orgId: String(organization!.id) };

  const [vapiPrivateKey,    setVapiPrivateKey]    = useState("");
  const [vapiPublicKey,     setVapiPublicKey]     = useState("");
  const [showPrivateKey,    setShowPrivateKey]    = useState(false);
  const [showPublicKey,     setShowPublicKey]     = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["voice-widget", agentId ?? "default"],
    queryFn:  () => voiceWidgetApi.get(auth.token, auth.orgId, agentId),
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
        widget: {
          llm_model: merged.llm_model,
          is_active: merged.is_active,
          config:    merged.config,
          name:      merged.name,
        },
        knowledge_base: mergedKb,
        ...(vapiPrivateKey ? { vapi_private_key: vapiPrivateKey } : {}),
        ...(vapiPublicKey  ? { vapi_public_key:  vapiPublicKey  } : {}),
        ...(agentId        ? { agent_id: agentId }               : {}),
      } as Parameters<typeof voiceWidgetApi.save>[2]),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["voice-widget", agentId ?? "default"] });
      qc.invalidateQueries({ queryKey: ["voice-agents"] });
      setForm({});
      setKbForm({});
      setDirty(false);
      const warning = (data as Record<string, unknown>).vapi_warning as string | undefined;
      setSaveMsg(warning ? `⚠ Error Vapi: ${warning}` : "Asistente sincronizado ✓");
      setTimeout(() => setSaveMsg(""), warning ? 30000 : 6000);
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

  // KB Sources
  const sourcesQ = useQuery({
    queryKey: ["kb-sources", agentId ?? "default"],
    queryFn:  () => voiceWidgetApi.listKbSources(auth.token, auth.orgId, agentId),
    enabled:  !!tokens && !!organization,
  });
  const sources: VoiceKBSource[] = sourcesQ.data?.sources ?? [];
  const sourcesLimit: number     = sourcesQ.data?.limit ?? 3;
  const sourcesCount: number     = sourcesQ.data?.count ?? sources.length;
  const sourcesAtLimit           = sourcesCount >= sourcesLimit;

  const [deletingSourceId, setDeletingSourceId] = useState<number | null>(null);
  const deleteSourceMutation = useMutation({
    mutationFn: (id: number) => voiceWidgetApi.deleteKbSource(auth.token, auth.orgId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kb-sources", agentId ?? "default"] });
      toast.success("Fuente eliminada");
    },
    onError: (e: Error) => toast.error(e.message || "Error al eliminar"),
    onSettled: () => setDeletingSourceId(null),
  });

  // URL scraper
  const [scrapeOpen,     setScrapeOpen]     = useState(false);
  const [scrapeUrl,      setScrapeUrl]      = useState("");
  const [scrapeImported, setScrapeImported] = useState<string[]>([]);
  const scrapeMutation = useMutation({
    mutationFn: () => voiceWidgetApi.scrapeUrl(auth.token, auth.orgId, scrapeUrl, agentId),
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
      qc.invalidateQueries({ queryKey: ["kb-sources", agentId ?? "default"] });
    },
  });

  // Reset assistant
  const resetMutation = useMutation({
    mutationFn: () => voiceWidgetApi.resetAssistant(auth.token, auth.orgId, agentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voice-widget", agentId ?? "default"] });
      toast.success("Asistente reseteado", {
        description: "Re-ingresa tu Private API Key y guarda para crear uno nuevo.",
        duration: 12000,
      });
    },
    onError: (e: Error) => {
      toast.error("No se pudo resetear", {
        description: e.message || "Inténtalo de nuevo.",
      });
    },
  });

  // Avatar upload
  const [avatarUploading,  setAvatarUploading]  = useState(false);
  const [avatarError,      setAvatarError]      = useState("");

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("La imagen supera el límite de 2 MB.");
      return;
    }

    setAvatarUploading(true);
    setAvatarError("");
    try {
      const { avatar_url } = await voiceWidgetApi.uploadAvatar(auth.token, auth.orgId, file);
      patchCfg("avatar_url", avatar_url);
      // Trigger save automatically so the URL persists
      setSaveMsg("");
      setDirty(true);
    } catch (err) {
      setAvatarError((err as Error).message || "Error al subir la imagen");
    } finally {
      setAvatarUploading(false);
    }
  };

  // File import
  const [fileImporting,  setFileImporting]  = useState(false);
  const [fileImported,   setFileImported]   = useState<string[]>([]);
  const [fileImportError, setFileImportError] = useState("");

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";            // reset so same file can be re-selected
    if (!file) return;

    setFileImporting(true);
    setFileImported([]);
    setFileImportError("");

    try {
      const { knowledge_base } = await voiceWidgetApi.importFile(auth.token, auth.orgId, file, agentId);
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
      setFileImported(imported);
      qc.invalidateQueries({ queryKey: ["kb-sources", agentId ?? "default"] });
    } catch (err) {
      setFileImportError((err as Error).message || "Error al importar el archivo");
    } finally {
      setFileImporting(false);
    }
  };

  if (isLoading) return <div className="h-48 animate-pulse rounded-2xl bg-slate-800" />;

  const _qs = mergedKb.qualification_questions;
  const qualQsStr = Array.isArray(_qs)
    ? _qs.join("\n")
    : typeof _qs === "string" ? _qs : "";

  return (
    <Card className="rounded-2xl border border-slate-700 bg-slate-950">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-base">Agente de Voz IA</CardTitle>
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
                title={merged.is_active ? "Desactivar Agente de Voz IA en el widget flotante" : "Activar Agente de Voz IA en el widget flotante"}
              >
                {merged.is_active
                  ? <ToggleRight className="h-6 w-6 text-orange-500" />
                  : <ToggleLeft  className="h-6 w-6" />}
              </button>
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Añade un asistente de voz flotante a tu web. Conecta tus claves de voz para activar el agente.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── A. Claves de conexión ────────────────────────────────────────── */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-300">Claves de conexión</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Private Key */}
            <div>
              <label className={labelCls + " mb-1 block"}>Private API Key</label>
              {widget?.has_vapi_private_key && !vapiPrivateKey ? (
                <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
                  <span className="text-xs text-slate-400 tracking-widest">••••••••••••••••</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-green-400">Guardada ✓</span>
                    <button
                      type="button"
                      onClick={() => { setVapiPrivateKey(" "); setTimeout(() => setVapiPrivateKey(""), 0); }}
                      className="text-[10px] text-slate-500 hover:text-orange-400 transition-colors underline"
                    >
                      Cambiar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type={showPrivateKey ? "text" : "password"}
                    className={inputCls + " pr-9"}
                    value={vapiPrivateKey}
                    onChange={(e) => { setVapiPrivateKey(e.target.value); setDirty(true); }}
                    placeholder="sk-••••••••••••••••"
                    autoComplete="off"
                    autoFocus={!!widget?.has_vapi_private_key}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPrivateKey((v) => !v)}
                    className="absolute inset-y-0 right-2.5 flex items-center text-slate-500 hover:text-orange-400 transition-colors"
                    tabIndex={-1}
                    title={showPrivateKey ? "Ocultar clave" : "Mostrar clave"}
                  >
                    {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </div>
            {/* Public Key */}
            <div>
              <label className={labelCls + " mb-1 block"}>Public API Key</label>
              {widget?.has_vapi_public_key && !vapiPublicKey ? (
                <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
                  <span className="text-xs text-slate-400 tracking-widest">••••••••••••••••</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-green-400">Guardada ✓</span>
                    <button
                      type="button"
                      onClick={() => { setVapiPublicKey(" "); setTimeout(() => setVapiPublicKey(""), 0); }}
                      className="text-[10px] text-slate-500 hover:text-orange-400 transition-colors underline"
                    >
                      Cambiar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type={showPublicKey ? "text" : "password"}
                    className={inputCls + " pr-9"}
                    value={vapiPublicKey}
                    onChange={(e) => { setVapiPublicKey(e.target.value); setDirty(true); }}
                    placeholder="pk-••••••••••••••••"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPublicKey((v) => !v)}
                    className="absolute inset-y-0 right-2.5 flex items-center text-slate-500 hover:text-orange-400 transition-colors"
                    tabIndex={-1}
                    title={showPublicKey ? "Ocultar clave" : "Mostrar clave"}
                  >
                    {showPublicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>
          {(widget?.has_vapi_private_key || widget?.has_vapi_public_key) && (vapiPrivateKey || vapiPublicKey) && (
            <p className="mt-2 rounded-lg border border-amber-800 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-300">
              Vas a reemplazar una clave guardada. Asegúrate de que la nueva sea correcta antes de guardar.
            </p>
          )}
        </div>

        {/* ── B. Configuración del agente ──────────────────────────────────── */}
        <div className="border-t border-slate-800 pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-300">Configuración del Agente</p>

          {/* Avatar */}
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {/* gradient ring wrapper */}
              <div
                className={cn(
                  "rounded-full p-[3px]",
                  merged.config.avatar_url
                    ? "bg-gradient-to-br from-orange-600 via-orange-400 to-orange-300 shadow-[0_0_18px_rgba(234,88,12,0.45),0_0_6px_rgba(234,88,12,0.25)]"
                    : "bg-gradient-to-br from-slate-700 to-slate-600",
                )}
              >
                <label
                  className={cn(
                    "group relative flex h-[74px] w-[74px] cursor-pointer items-center justify-center overflow-hidden rounded-full bg-slate-800 transition-colors",
                    !merged.config.avatar_url && "hover:bg-slate-700",
                    avatarUploading && "cursor-not-allowed opacity-60",
                  )}
                  title="Subir foto del agente"
                >
                  {merged.config.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={merged.config.avatar_url}
                      alt="Avatar agente"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-400">
                      {(merged.config.agent_name ?? "A").charAt(0).toUpperCase()}
                    </span>
                  )}
                  {/* overlay on hover */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    {avatarUploading
                      ? <Loader2 className="h-5 w-5 animate-spin text-white" />
                      : <Camera  className="h-5 w-5 text-white" />}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={avatarUploading}
                    onChange={handleAvatarUpload}
                  />
                </label>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-200">Foto del agente</p>
              <p className="mt-0.5 text-xs text-slate-500">JPG, PNG, WebP o GIF · máx. 2 MB</p>
              {avatarError && (
                <p className="mt-1 text-xs text-red-400">{avatarError}</p>
              )}
              {merged.config.avatar_url && !avatarUploading && (
                <button
                  type="button"
                  onClick={() => { patchCfg("avatar_url", ""); setDirty(true); }}
                  className="mt-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
                >
                  Eliminar foto
                </button>
              )}
            </div>
          </div>

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
            <ExpandableTextarea
              label="Saludo inicial"
              value={merged.config.greeting ?? ""}
              onChange={(v) => patchCfg("greeting", v)}
              placeholder={`Hola, soy ${merged.config.agent_name || "Sofía"}. ¿En qué puedo ayudarte hoy?`}
              rows={2}
              colSpan2
            />
          </div>
        </div>

        {/* ── C. Base de Conocimiento ──────────────────────────────────────── */}
        <div className="border-t border-slate-800 pt-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Base de Conocimiento</p>
            <div className="flex items-center gap-2">
              {/* Import from URL */}
              <button
                type="button"
                onClick={() => { setScrapeImported([]); setScrapeOpen(true); }}
                disabled={sourcesAtLimit}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors",
                  sourcesAtLimit
                    ? "cursor-not-allowed opacity-40"
                    : "hover:border-orange-600 hover:text-orange-400"
                )}
                title={sourcesAtLimit ? "Límite de fuentes alcanzado — actualiza tu plan" : "Importar base de conocimiento desde una URL"}
              >
                <Globe2 className="h-3.5 w-3.5" />
                URL
              </button>
              {/* Import from file */}
              <label
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors",
                  sourcesAtLimit || fileImporting
                    ? "cursor-not-allowed opacity-40"
                    : "cursor-pointer hover:border-orange-600 hover:text-orange-400"
                )}
                title={sourcesAtLimit ? "Límite de fuentes alcanzado — actualiza tu plan" : "Importar desde PDF o Markdown"}
              >
                {fileImporting
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <FileUp   className="h-3.5 w-3.5" />}
                PDF / MD
                <input
                  type="file"
                  accept=".pdf,.md,.txt"
                  className="sr-only"
                  disabled={fileImporting || sourcesAtLimit}
                  onChange={handleFileImport}
                />
              </label>
            </div>
          </div>

          {/* URL import success banner */}
          {scrapeImported.length > 0 && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-green-800 bg-green-950/40 px-3 py-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400" />
              <p className="text-xs text-green-300">
                Importado desde URL:{" "}
                <span className="font-medium">{scrapeImported.join(", ")}</span>.
                Revisa y haz clic en <strong>Guardar cambios</strong>.
              </p>
            </div>
          )}

          {/* File import success banner */}
          {fileImported.length > 0 && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-green-800 bg-green-950/40 px-3 py-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400" />
              <p className="text-xs text-green-300">
                Importado desde archivo:{" "}
                <span className="font-medium">{fileImported.join(", ")}</span>.
                Revisa y haz clic en <strong>Guardar cambios</strong>.
              </p>
            </div>
          )}

          {/* File import error */}
          {fileImportError && (
            <p className="mb-3 rounded-lg border border-red-800 bg-red-950/30 px-3 py-2 text-xs text-red-400">
              {fileImportError}
            </p>
          )}

          {/* ── Fuentes ──────────────────────────────────────────────────── */}
          <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/50">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Fuentes importadas
                </p>
                {/* Usage counter */}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  sourcesAtLimit
                    ? "bg-red-950/60 text-red-400"
                    : "bg-slate-800 text-slate-400"
                )}>
                  {sourcesCount} / {sourcesLimit}
                </span>
                {/* Upgrade chip */}
                {sourcesAtLimit && (
                  <a
                    href="/precios"
                    className="flex items-center gap-1 rounded-full bg-orange-950/50 border border-orange-800/60 px-2 py-0.5 text-[10px] font-semibold text-orange-400 hover:bg-orange-950 transition-colors"
                  >
                    Actualizar plan
                  </a>
                )}
              </div>
              <span
                className="text-[10px] text-slate-600 cursor-help"
                title="Eliminar una fuente borra el registro. El contenido ya extraído permanece en los campos hasta que los edites manualmente."
              >
                <AlertCircle className="h-3 w-3 inline-block" />
              </span>
            </div>

            {sourcesQ.isLoading ? (
              <div className="flex items-center justify-center py-5">
                <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
              </div>
            ) : sources.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 py-6 text-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-600">
                  <FileText className="h-4 w-4" />
                </div>
                <p className="text-xs text-slate-600">Sin fuentes importadas</p>
                <p className="text-[10px] text-slate-700">Importa una URL o archivo para poblar la KB</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-800/60">
                {sources.map((src) => {
                  const isDeleting = deletingSourceId === src.id;
                  const date = new Date(src.created_at).toLocaleDateString("es-GT", {
                    day: "numeric", month: "short", year: "numeric",
                  });
                  const displayName = src.source_type === "url"
                    ? (() => { try { return new URL(src.name).hostname + new URL(src.name).pathname; } catch { return src.name; } })()
                    : src.name;

                  return (
                    <li key={src.id} className="group flex items-center gap-3 px-3 py-2.5">
                      <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
                        src.source_type === "url"
                          ? "bg-blue-950/50 text-blue-400"
                          : "bg-orange-950/50 text-orange-400"
                      }`}>
                        {src.source_type === "url"
                          ? <Link2   className="h-3.5 w-3.5" />
                          : <FileText className="h-3.5 w-3.5" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-300" title={src.name}>
                          {displayName}
                        </p>
                        <p className="text-[10px] text-slate-600">
                          {date} · {src.char_count.toLocaleString()} chars
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setDeletingSourceId(src.id);
                          deleteSourceMutation.mutate(src.id);
                        }}
                        disabled={isDeleting}
                        title="Eliminar fuente"
                        className="flex-shrink-0 rounded-lg p-1.5 text-slate-700 opacity-0 group-hover:opacity-100 hover:bg-red-950/40 hover:text-red-400 transition-all disabled:opacity-40"
                      >
                        {isDeleting
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2  className="h-3.5 w-3.5" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

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

            {/* Escalado a humano */}
            <div className="col-span-2 rounded-xl border border-slate-700 bg-slate-800/40 p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Escalado a humano</p>

              {/* Mode selector — 3 radio-style buttons */}
              <div>
                <label className={labelCls + " mb-2 block"}>Modo de escalado</label>
                <div className="flex gap-2">
                  {[
                    { value: "whatsapp", label: "WhatsApp", desc: "Notificación al equipo" },
                    { value: "transfer", label: "Transferencia", desc: "Llamada en vivo" },
                    { value: "both",     label: "Ambos", desc: "Notifica + transfiere" },
                  ].map(({ value, label, desc }) => {
                    const active = (merged.config.escalation_mode ?? "whatsapp") === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => patchCfg("escalation_mode", value)}
                        className={`flex-1 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                          active
                            ? "border-orange-500 bg-orange-950/40 text-orange-300"
                            : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        <p className="text-xs font-semibold">{label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Transfer number — shown when mode is transfer or both */}
              {(merged.config.escalation_mode === "transfer" || merged.config.escalation_mode === "both") && (
                <div>
                  <label className={labelCls + " mb-1 block"}>Número de transferencia (E.164)</label>
                  <Input
                    className={inputCls}
                    value={merged.config.transfer_number ?? ""}
                    onChange={(e) => patchCfg("transfer_number", e.target.value)}
                    placeholder="+50212345678"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">Con código de país. Puede ser móvil, fijo u otro número Twilio.</p>
                </div>
              )}
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
        <div className="space-y-3 border-t border-slate-800 pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={(!dirty && !!widget) || saveMutation.isPending}
              className="bg-orange-600 hover:bg-orange-500 text-white"
            >
              {saveMutation.isPending
                ? "Sincronizando…"
                : widget ? "Guardar cambios" : "Crear asistente"}
            </Button>
            {widget?.vapi_assistant_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast("¿Resetear el asistente de voz?", {
                    description: "Necesitarás re-ingresar tu Private API Key y guardar para crear uno nuevo.",
                    action: {
                      label: "Sí, resetear",
                      onClick: () => resetMutation.mutate(),
                    },
                    cancel: { label: "Cancelar", onClick: () => {} },
                    duration: 10000,
                  });
                }}
                disabled={resetMutation.isPending}
                className="border-slate-700 text-slate-400 hover:border-red-700 hover:text-red-400"
              >
                {resetMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Resetear asistente"}
              </Button>
            )}
            {saveMsg && (
              <span className={cn(
                "flex items-center gap-1.5 text-xs",
                saveMsg.startsWith("Guardado. Error") ? "text-amber-400" : "text-green-400"
              )}>
                <Check className="h-3.5 w-3.5" /> {saveMsg}
              </span>
            )}
            {saveMutation.isError && (
              <span className="text-xs text-red-400">
                {(saveMutation.error as Error)?.message || "Error al guardar"}
              </span>
            )}
          </div>
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
                El asistente aún no está configurado. Ingresa tus claves de conexión y guarda para activar el widget.
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
