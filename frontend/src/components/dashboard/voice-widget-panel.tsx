"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mic, Copy, Check, Zap, Phone, ToggleLeft, ToggleRight,
  ExternalLink, Maximize2, Rocket, Loader2, Eye, EyeOff, Camera,
  BookOpen, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { voiceWidgetApi, cmsApi, type VoiceWidget } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";

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
  { value: "openai/gpt-4o",                       label: "OpenAI GPT-4o (recomendado)" },
  { value: "openai/gpt-4o-mini",                  label: "OpenAI GPT-4o Mini" },
  { value: "anthropic/claude-3-5-haiku-20241022", label: "Anthropic Claude 3.5 Haiku" },
  { value: "groq/llama-3.3-70b-versatile",        label: "Groq Llama 3.3 70B" },
  { value: "groq/llama-3.1-8b-instant",           label: "Groq Llama 3.1 8B (ultra rápido)" },
];

const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500";

const labelCls = "text-xs font-medium text-slate-400";

// ─── ExpandableTextarea ───────────────────────────────────────────────────────

function ExpandableTextarea({
  label, value, onChange, placeholder, rows = 3, hint, colSpan2 = false, textareaClassName,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  hint?: string;
  colSpan2?: boolean;
  textareaClassName?: string;
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
        className={cn(inputCls, "resize-none", textareaClassName)}
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
  id: "", token: "", name: "Agente de Voz", vapi_assistant_id: "", llm_model: "openai/gpt-4o",
  is_active: true, lead_count: 0, active_leads: 0, call_count: 0, system_prompt: "",
  config: { agent_name: "Sofía", voice: "es-MX-NuriaNeural", color: "#EA580C", greeting: "", farewell: "", avatar_url: "", escalation_mode: "whatsapp", transfer_number: "" },
  knowledge_base: null,
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
  const [editingPrivKey,    setEditingPrivKey]    = useState(false);
  const [editingPubKey,     setEditingPubKey]     = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["voice-widget", agentId ?? "default"],
    queryFn:  () => voiceWidgetApi.get(auth.token, auth.orgId, agentId),
    enabled:  !!tokens && !!organization,
  });

  const widget = data?.widget ?? null;
  const [form,   setForm]   = useState<Partial<VoiceWidget>>({});
  const [dirty,   setDirty]   = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const current: VoiceWidget = widget ?? DEFAULT_WIDGET;
  const merged: VoiceWidget  = {
    ...current,
    ...form,
    config: { ...current.config, ...(form.config ?? {}) },
  };

  const patch    = (key: keyof VoiceWidget, value: unknown) => { setForm((f) => ({ ...f, [key]: value })); setDirty(true); };
  const patchCfg = (key: string, value: string)              => { setForm((f) => ({ ...f, config: { ...(f.config ?? {}), [key]: value } })); setDirty(true); };

  const saveMutation = useMutation({
    mutationFn: () =>
      voiceWidgetApi.save(auth.token, auth.orgId, {
        widget: {
          llm_model:     merged.llm_model,
          is_active:     merged.is_active,
          config:        merged.config,
          name:          merged.name,
          system_prompt: merged.system_prompt ?? "",
        },
        ...(vapiPrivateKey ? { vapi_private_key: vapiPrivateKey } : {}),
        ...(vapiPublicKey  ? { vapi_public_key:  vapiPublicKey  } : {}),
        ...(agentId        ? { agent_id: agentId }               : {}),
      } as Parameters<typeof voiceWidgetApi.save>[2]),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["voice-widget", agentId ?? "default"] });
      qc.invalidateQueries({ queryKey: ["voice-agents"] });
      setForm({});
      setDirty(false);
      const warning = (data as Record<string, unknown>).vapi_warning as string | undefined;
      setSaveMsg(warning ? `⚠ Error Vapi: ${warning}` : "Asistente sincronizado ✓");
      setTimeout(() => setSaveMsg(""), warning ? 30000 : 6000);
      setVapiPrivateKey("");
      setVapiPublicKey("");
      setEditingPrivKey(false);
      setEditingPubKey(false);
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

  if (isLoading) return <div className="h-48 animate-pulse rounded-2xl bg-slate-800" />;

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
                <span className="text-xs font-semibold text-slate-300">
                  {widget.active_leads} leads activos
                  <span className="ml-1 text-slate-500 font-normal">/ {widget.lead_count} total</span>
                </span>
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
              {widget?.has_vapi_private_key && !editingPrivKey ? (
                <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
                  <span className="text-xs text-slate-400 tracking-widest">••••••••••••••••</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-green-400">Guardada ✓</span>
                    <button
                      type="button"
                      onClick={() => setEditingPrivKey(true)}
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
                    autoFocus={editingPrivKey}
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
              {widget?.has_vapi_public_key && !editingPubKey ? (
                <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
                  <span className="text-xs text-slate-400 tracking-widest">••••••••••••••••</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-green-400">Guardada ✓</span>
                    <button
                      type="button"
                      onClick={() => setEditingPubKey(true)}
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
                    autoFocus={editingPubKey}
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
          {(editingPrivKey || editingPubKey) && (
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
                value={merged.llm_model ?? "openai/gpt-4o"}
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

        {/* ── C. Instrucciones del agente (system prompt) ─────────────────── */}
        <div className="border-t border-slate-800 pt-5">
          <p className="mb-3 text-[11px] text-slate-500">
            Define la personalidad, tono y restricciones del agente. Ejemplo: qué temas puede tratar, qué no, cómo responder ante objeciones, etc.
          </p>
          <ExpandableTextarea
            label="Instrucciones del agente"
            hint="(Opcional · se añade antes de la base de conocimiento)"
            value={merged.system_prompt ?? ""}
            onChange={(v) => { patch("system_prompt", v); setDirty(true); }}
            placeholder={`Eres ${merged.config.agent_name || "Sofía"}, asistente virtual de [empresa]. Habla siempre en español, tono amable y profesional.\n\nNUNCA hables de: competidores, política, religión o temas ajenos al negocio.\nSi preguntan algo que no sabes: "Lo consultaré con mi equipo y me pongo en contacto contigo."\nSi el cliente quiere hablar con una persona, transfiere inmediatamente sin preguntar.`}
            rows={5}
            colSpan2
            textareaClassName="font-mono text-xs leading-relaxed"
          />
        </div>

        {/* ── D. Base de Conocimiento ──────────────────────────────────────── */}
        <div className="border-t border-slate-800 pt-5">
          <Link
            href="/dashboard/knowledge-base"
            className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-4 py-3.5 hover:border-orange-600/50 hover:bg-slate-800/60 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Base de Conocimiento</p>
                <p className="text-xs text-slate-500">
                  Gestiona el contenido compartido que usa este agente
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-orange-400 transition-colors" />
          </Link>
        </div>

        {/* ── Escalado a humano (kept here as it's widget config, not KB) ─── */}
        <div className="border-t border-slate-800 pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
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

              {/* WhatsApp number — shown when mode is whatsapp or both */}
              {(merged.config.escalation_mode === "whatsapp" || merged.config.escalation_mode === "both" || !merged.config.escalation_mode) && (
                <div>
                  <label className={labelCls + " mb-1 block"}>Número WhatsApp de escalado</label>
                  <Input
                    className={inputCls}
                    value={merged.config.whatsapp_number ?? ""}
                    onChange={(e) => patchCfg("whatsapp_number", e.target.value)}
                    placeholder="Con código país: 50212345678"
                  />
                </div>
              )}

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
