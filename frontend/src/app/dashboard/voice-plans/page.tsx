"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { FeatureGate } from "@/components/dashboard/feature-gate";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  voicePlansApi,
  voiceWidgetApi,
  voiceCallsApi,
  outboundApi,
  authApi,
  type VoicePlanAdmin,
  type VoiceFAQAdmin,
  type VoiceStatAdmin,
  type VoiceSetupPlanAdmin,
  type VoiceAgentSummary,
  type VoiceAgentPlan,
  type VoiceCallRecord,
  type VoiceCallStructuredOutput,
  type OutboundPhoneStatus,
} from "@/lib/api";
import { Input } from "@/components/ui/input";
import {
  Plus,Pencil,Trash2,Check,X,RefreshCw,ExternalLink,Mic,HelpCircle,BarChart3,
  Phone, Zap, Settings2, Loader2, TrendingUp, Crown, Wrench,
  PhoneCall, PhoneOff, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown,
  Minus, User, Mail, Building2, Target, DollarSign, Clock, AlertTriangle,
  ArrowRight, ChevronDown, ChevronUp, MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { VoiceWidgetPanel } from "@/components/dashboard/voice-widget-panel";

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20";

// ─── Toggle pill ──────────────────────────────────────────────────────────────

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        value
          ? "bg-green-900/40 text-green-400 hover:bg-green-900/60"
          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
      }`}
    >
      {label ?? (value ? "Activo" : "Inactivo")}
    </button>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-300">
        {label}
      </label>
      {hint && <p className="mb-1.5 text-xs text-slate-400">{hint}</p>}
      {children}
    </div>
  );
}

// ─── Toast inline ─────────────────────────────────────────────────────────────

function SaveToast({ status }: { status: "idle" | "success" | "error" }) {
  if (status === "idle") return null;
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
        status === "success"
          ? "bg-green-950/40 text-green-400"
          : "bg-red-950/40 text-red-400"
      }`}
    >
      {status === "success" ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <X className="h-3.5 w-3.5" />
      )}
      {status === "success" ? "Guardado" : "Error al guardar"}
    </div>
  );
}

// ─── Modal overlay ────────────────────────────────────────────────────────────

function Overlay({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      onClick={onClick}
    />
  );
}

// ─── Features textarea ────────────────────────────────────────────────────────

function FeaturesTextarea({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toText = (arr: string[]) => arr.join("\n");
  const toArray = (text: string): string[] => {
    const trimmed = text.trim();
    if (trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed);
      } catch {
        // fall through to line-by-line
      }
    }
    return trimmed
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  };

  return (
    <textarea
      className={inputCls}
      rows={6}
      value={toText(value)}
      onChange={(e) => onChange(toArray(e.target.value))}
      placeholder={"Calificación de leads 24/7\nIntegración con CRM\nReportes mensuales"}
    />
  );
}

// ─── Plan slide-over modal ────────────────────────────────────────────────────

interface PlanModalProps {
  plan: Partial<VoicePlanAdmin> | null;
  onClose: () => void;
  onSave: (data: Partial<VoicePlanAdmin>) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  saving: boolean;
  saveStatus: "idle" | "success" | "error";
  apiError: string;
}

const EMPTY_PLAN: Partial<VoicePlanAdmin> = {
  name: "",
  slug: "",
  price_monthly: "",
  annual_price: 0,
  agents: 1,
  minutes_included: 0,
  overage_per_minute: "0.00",
  overage_display: "",
  features: [],
  cta_text: "Comenzar gratis",
  is_popular: false,
  is_active: true,
  sort_order: 0,
};

function PlanModal({
  plan,
  onClose,
  onSave,
  onDelete,
  saving,
  saveStatus,
  apiError,
}: PlanModalProps) {
  const [form, setForm] = useState<Partial<VoicePlanAdmin>>(
    plan ? { ...EMPTY_PLAN, ...plan } : { ...EMPTY_PLAN }
  );

  useEffect(() => {
    setForm(plan ? { ...EMPTY_PLAN, ...plan } : { ...EMPTY_PLAN });
  }, [plan]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof VoicePlanAdmin>(k: K, v: VoicePlanAdmin[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const isEdit = Boolean(plan?.id);

  const handleDelete = async () => {
    if (!plan?.id) return;
    if (!window.confirm(`¿Eliminar el plan "${form.name}"? Esta acción no se puede deshacer.`))
      return;
    await onDelete?.(plan.id);
  };

  return (
    <>
      <Overlay onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400">
              <Mic className="h-4 w-4" />
            </div>
            <h2 className="font-semibold text-slate-100">
              {isEdit ? "Editar plan" : "Nuevo plan"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del plan">
              <input
                className={inputCls}
                value={form.name ?? ""}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Plan Básico"
              />
            </Field>
            <Field label="Slug">
              <input
                className={inputCls}
                value={form.slug ?? ""}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="basico"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Precio mensual (USD)">
              <input
                type="number"
                className={inputCls}
                value={form.price_monthly ?? ""}
                onChange={(e) => set("price_monthly", e.target.value)}
                placeholder="49"
                min={0}
                step={0.01}
              />
            </Field>
            <Field label="Precio anual / mes (USD)" hint="Precio por mes cuando se factura anualmente">
              <input
                type="number"
                className={inputCls}
                value={form.annual_price ?? ""}
                onChange={(e) => set("annual_price", Number(e.target.value))}
                placeholder="39"
                min={0}
                step={0.01}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Agentes">
              <input
                type="number"
                className={inputCls}
                value={form.agents ?? ""}
                onChange={(e) => set("agents", Number(e.target.value))}
                placeholder="1"
                min={1}
              />
            </Field>
            <Field label="Minutos incluidos">
              <input
                type="number"
                className={inputCls}
                value={form.minutes_included ?? ""}
                onChange={(e) => set("minutes_included", Number(e.target.value))}
                placeholder="100"
                min={0}
              />
            </Field>
            <Field label="Extra / min (USD)">
              <input
                type="number"
                className={inputCls}
                value={form.overage_per_minute ?? ""}
                onChange={(e) => set("overage_per_minute", e.target.value)}
                placeholder="0.08"
                min={0}
                step={0.001}
              />
            </Field>
          </div>

          <Field label="Texto del extra (display)" hint='Ej. "$0.08/min adicional"'>
            <input
              className={inputCls}
              value={form.overage_display ?? ""}
              onChange={(e) => set("overage_display", e.target.value)}
              placeholder="$0.08/min adicional"
            />
          </Field>

          <Field label="Texto del botón CTA">
            <input
              className={inputCls}
              value={form.cta_text ?? ""}
              onChange={(e) => set("cta_text", e.target.value)}
              placeholder="Comenzar gratis"
            />
          </Field>

          <Field
            label="Features"
            hint="Un feature por línea. O pega un JSON array directo si empieza con [."
          >
            <FeaturesTextarea
              value={form.features ?? []}
              onChange={(v) => set("features", v)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Orden (sort_order)">
              <input
                type="number"
                className={inputCls}
                value={form.sort_order ?? 0}
                onChange={(e) => set("sort_order", Number(e.target.value))}
                min={0}
              />
            </Field>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-300">Más popular</p>
              <Toggle
                value={form.is_popular ?? false}
                onChange={(v) => set("is_popular", v)}
                label={form.is_popular ? "Sí" : "No"}
              />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-300">Estado</p>
              <Toggle
                value={form.is_active ?? true}
                onChange={(v) => set("is_active", v)}
              />
            </div>
          </div>

          {apiError && (
            <p className="rounded-lg bg-red-950/30 px-3 py-2 text-xs text-red-400">
              {apiError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-950/30 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar plan
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SaveToast status={saveStatus} />
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={saving}
              onClick={() => onSave(form)}
              className="gap-1.5 bg-orange-600 text-white hover:bg-orange-700"
            >
              {saving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Plans tab ────────────────────────────────────────────────────────────────

// ─── Agents Tab ───────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  onConfigure,
  onDelete,
  onToggle,
  deleting,
  toggling,
}: {
  agent: VoiceAgentSummary;
  onConfigure: () => void;
  onDelete: () => void;
  onToggle: () => void;
  deleting: boolean;
  toggling: boolean;
}) {
  const color = agent.config.color || "#EA580C";
  const initials = (agent.config.agent_name || agent.name || "A")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950 p-5 gap-4">
      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white font-bold text-sm"
          style={{
            background: agent.config.avatar_url
              ? `url(${agent.config.avatar_url}) center/cover`
              : color,
            boxShadow: `0 0 14px ${color}60`,
          }}
        >
          {!agent.config.avatar_url && initials}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-100">{agent.name}</p>
          <p className="truncate text-xs text-slate-400">
            {agent.config.agent_name || "Sin nombre de agente"}
          </p>
        </div>
        {/* Active toggle */}
        <div className="ml-auto flex-shrink-0 flex items-center gap-2">
          <span className={`text-[10px] font-semibold ${agent.is_active ? "text-green-400" : "text-slate-500"}`}>
            {agent.is_active ? "Activo" : "Inactivo"}
          </span>
          <button
            onClick={onToggle}
            disabled={toggling}
            title={agent.is_active ? "Desactivar agente" : "Activar agente"}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
              agent.is_active ? "bg-green-500" : "bg-slate-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                agent.is_active ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Phone className="h-3 w-3 text-orange-400" />
          {agent.call_count} llamadas
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Zap className="h-3 w-3 text-orange-400" />
          {agent.active_leads} leads activos
          <span className="text-slate-600">/ {agent.lead_count} total</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-slate-800">
        <Button
          size="sm"
          onClick={onConfigure}
          className="flex-1 gap-1.5 bg-orange-600 hover:bg-orange-500 text-white"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Configurar
        </Button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="rounded-xl border border-slate-700 px-2.5 text-slate-400 hover:border-red-700 hover:text-red-400 transition-colors disabled:opacity-50"
          title="Eliminar agente"
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

function AgentSheet({
  agentId,
  agentName,
  onClose,
}: {
  agentId: string;
  agentName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
        {/* Sheet header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400">
              <Mic className="h-4 w-4" />
            </div>
            <h2 className="font-semibold text-slate-100 truncate max-w-xs">
              {agentName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Sheet body — scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <VoiceWidgetPanel agentId={agentId} />
        </div>
      </div>
    </>
  );
}

function AgentsTab({ token, orgId }: { token: string; orgId: string }) {
  const qc = useQueryClient();
  const [sheetAgentId,    setSheetAgentId]    = useState<string | null>(null);
  const [sheetAgentName,  setSheetAgentName]  = useState("");
  const [creating,        setCreating]        = useState(false);
  const [newName,         setNewName]         = useState("");
  const [deletingId,      setDeletingId]      = useState<string | null>(null);
  const [togglingId,      setTogglingId]      = useState<string | null>(null);
  const [showUpgrade,     setShowUpgrade]     = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["voice-agents"],
    queryFn:  () => voiceWidgetApi.listAgents(token, orgId),
    enabled:  !!token && !!orgId,
  });

  const agents: VoiceAgentSummary[] = data?.agents ?? [];
  const plan: VoiceAgentPlan = data?.plan ?? { slug: "starter", name: "Starter", agent_limit: 1 };
  const atLimit = agents.length >= plan.agent_limit;

  const createMutation = useMutation({
    mutationFn: () => voiceWidgetApi.createAgent(token, orgId, newName.trim() || "Agente de Voz"),
    onSuccess: ({ agent }) => {
      qc.invalidateQueries({ queryKey: ["voice-agents"] });
      setCreating(false);
      setNewName("");
      // Auto-open sheet for the new agent
      setSheetAgentId(agent.id);
      setSheetAgentName(agent.name);
      toast.success("Agente creado", { description: "Configura las claves de conexión y guarda para activarlo." });
    },
    onError: (e: Error) => {
      toast.error("No se pudo crear el agente", { description: e.message });
    },
  });

  const handleToggle = async (agent: VoiceAgentSummary) => {
    setTogglingId(agent.id);
    try {
      await voiceWidgetApi.toggleActive(token, orgId, agent.id, !agent.is_active);
      qc.invalidateQueries({ queryKey: ["voice-agents"] });
      toast.success(agent.is_active ? "Agente desactivado" : "Agente activado");
    } catch (e) {
      toast.error("Error al cambiar estado", { description: (e as Error).message });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (agent: VoiceAgentSummary) => {
    toast(`¿Eliminar "${agent.name}"?`, {
      description: "Se eliminará el asistente de voz asociado. Esta acción no se puede deshacer.",
      action: {
        label: "Sí, eliminar",
        onClick: async () => {
          setDeletingId(agent.id);
          try {
            await voiceWidgetApi.deleteAgent(token, orgId, agent.id);
            qc.invalidateQueries({ queryKey: ["voice-agents"] });
            toast.success("Agente eliminado");
          } catch (e) {
            toast.error("Error al eliminar", { description: (e as Error).message });
          } finally {
            setDeletingId(null);
          }
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
      duration: 10000,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
      </div>
    );
  }

  const totalLeads        = agents.reduce((s, a) => s + a.lead_count,   0);
  const totalActiveLeads  = agents.reduce((s, a) => s + a.active_leads, 0);
  const totalCalls        = agents.reduce((s, a) => s + a.call_count,   0);
  const activeCount       = agents.filter((a) => a.is_active).length;
  const convRate          = totalCalls > 0 ? Math.round((totalActiveLeads / totalCalls) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Leads activos",    value: totalActiveLeads,         icon: Zap,        color: "text-orange-400", bg: "bg-orange-950/40", border: "border-orange-800/30", glow: "shadow-orange-900/20" },
          { label: "Llamadas totales", value: totalCalls,               icon: Phone,      color: "text-sky-400",    bg: "bg-sky-950/40",    border: "border-sky-800/30",    glow: "shadow-sky-900/20"    },
          { label: "Agentes activos",  value: `${activeCount}/${plan.agent_limit}`, icon: Mic, color: "text-green-400", bg: "bg-green-950/40", border: "border-green-800/30", glow: "shadow-green-900/20" },
          { label: "Tasa conversión",  value: `${convRate}%`,           icon: TrendingUp, color: "text-amber-400",  bg: "bg-amber-950/40",  border: "border-amber-800/30",  glow: "shadow-amber-900/20"  },
        ].map(({ label, value, icon: Icon, color, bg, border, glow }) => (
          <div key={label} className={`rounded-2xl border ${border} bg-slate-950 p-5 flex flex-col gap-4 shadow-lg ${glow}`}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-100 leading-none">{value}</p>
              <p className="text-xs text-slate-500 mt-1.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Plan bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <p className="text-sm font-semibold text-slate-100">
              Plan activo: <span className="text-orange-400">{plan.name}</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {agents.length} de {plan.agent_limit} agente{plan.agent_limit !== 1 ? "s" : ""} activo{plan.agent_limit !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/precios"
            target="_blank"
            className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"
          >
            <ExternalLink className="h-3 w-3" />
            Ver planes
          </Link>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all"
            style={{ width: `${Math.min((agents.length / plan.agent_limit) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Create button / form */}
      {!creating ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => {
              if (atLimit) { setShowUpgrade(true); return; }
              setCreating(true);
            }}
            className={`gap-1.5 ${atLimit ? "bg-slate-700 text-slate-300 hover:!bg-orange-600 hover:!text-white" : "bg-orange-600 hover:!bg-orange-500 text-white"}`}
          >
            <Plus className="h-4 w-4" />
            Nuevo agente
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl border border-orange-500/30 bg-slate-950 p-4">
          <input
            autoFocus
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
            placeholder="Nombre del agente (ej. Recepcionista Principal)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createMutation.mutate();
              if (e.key === "Escape") { setCreating(false); setNewName(""); }
            }}
          />
          <Button
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="bg-orange-600 hover:bg-orange-500 text-white gap-1"
          >
            {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Crear
          </Button>
          <button
            onClick={() => { setCreating(false); setNewName(""); }}
            className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Agent cards grid */}
      {agents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-700 py-16">
          <Mic className="h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-400">No tienes agentes de voz configurados.</p>
          <Button
            size="sm"
            onClick={() => setCreating(true)}
            className="gap-1.5 bg-orange-600 text-white hover:bg-orange-500"
          >
            <Plus className="h-4 w-4" /> Crear primer agente
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onConfigure={() => {
                setSheetAgentId(agent.id);
                setSheetAgentName(agent.name);
              }}
              onToggle={() => handleToggle(agent)}
              onDelete={() => handleDelete(agent)}
              toggling={togglingId === agent.id}
              deleting={deletingId === agent.id}
            />
          ))}
        </div>
      )}

      {/* Config sheet */}
      {sheetAgentId && (
        <AgentSheet
          agentId={sheetAgentId}
          agentName={sheetAgentName}
          onClose={() => setSheetAgentId(null)}
        />
      )}

      {/* Upgrade modal */}
      {showUpgrade && (
        <>
          <Overlay onClick={() => setShowUpgrade(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400">
                    <Crown className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-slate-100">Límite alcanzado</h3>
                </div>
                <button
                  onClick={() => setShowUpgrade(false)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-5 space-y-4">
                <p className="text-sm text-slate-300">
                  Tu plan <span className="font-semibold text-orange-400">{plan.name}</span> permite
                  hasta <span className="font-semibold text-slate-100">{plan.agent_limit} agente{plan.agent_limit !== 1 ? "s" : ""}</span>.
                  Para añadir más agentes necesitas hacer upgrade.
                </p>

                {/* Current vs next */}
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Plan actual</span>
                    <span className="font-semibold text-slate-200">{plan.name} — {plan.agent_limit} agente{plan.agent_limit !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Próximo plan</span>
                    <span className="font-semibold text-orange-400">Más agentes + más minutos</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowUpgrade(false)}
                    className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                  >
                    Ahora no
                  </button>
                  <Link
                    href="/precios"
                    target="_blank"
                    onClick={() => setShowUpgrade(false)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-600 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 transition-colors"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Ver planes
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Outbound — Twilio BYOC ──────────────────────────────────────────── */}
      <OutboundPhoneCard token={token} orgId={orgId} planSlug={plan.slug} />
    </div>
  );
}

// ─── Outbound phone card (Twilio BYOC) ───────────────────────────────────────

function OutboundPhoneCard({ token, orgId, planSlug }: { token: string; orgId: string; planSlug: string }) {
  const qc = useQueryClient();
  const isAllowed = planSlug === "voz-business";

  const [number,    setNumber]    = useState("");
  const [sid,       setSid]       = useState("");
  const [authToken, setAuthToken] = useState("");

  const { data: phone, isLoading } = useQuery<OutboundPhoneStatus>({
    queryKey: ["outbound-phone", orgId],
    queryFn:  () => outboundApi.getPhone(token, orgId),
    enabled:  !!token && !!orgId,
    staleTime: 60_000,
  });

  const connectMutation = useMutation({
    mutationFn: () => outboundApi.connectPhone(token, orgId, { phone_number: number, account_sid: sid, auth_token: authToken }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outbound-phone", orgId] });
      setNumber(""); setSid(""); setAuthToken("");
      toast.success("Número Twilio conectado");
    },
    onError: (e: Error) => toast.error("Error al conectar", { description: e.message }),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => outboundApi.disconnectPhone(token, orgId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outbound-phone", orgId] });
      toast.success("Número Twilio desconectado");
    },
  });

  return (
    <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PhoneCall className="h-5 w-5 text-orange-400" />
          <div>
            <p className="text-sm font-semibold text-slate-100">Outbound — Twilio (BYOC)</p>
            <p className="text-xs text-slate-500">Conecta tu número Twilio para llamadas salientes del agente de voz</p>
          </div>
        </div>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
        ) : phone?.connected ? (
          <span className="rounded-full border border-green-700 bg-green-950/60 px-2.5 py-0.5 text-xs font-semibold text-green-400">Conectado</span>
        ) : (
          <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-0.5 text-xs font-semibold text-slate-500">Desconectado</span>
        )}
      </div>

      {phone?.connected ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="text-xs text-slate-500 mb-0.5">Número activo</p>
            <p className="font-mono text-sm text-slate-200">{phone.phone_number}</p>
          </div>
          <button
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
            className="flex items-center gap-2 text-xs text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            {disconnectMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PhoneOff className="h-3.5 w-3.5" />}
            Desconectar número
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Número de teléfono (E.164)</label>
            <Input placeholder="+15017122661" value={number} onChange={e => setNumber(e.target.value)} className="h-8 text-sm bg-slate-900 border-slate-700" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Twilio Account SID</label>
            <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={sid} onChange={e => setSid(e.target.value)} className="h-8 text-sm bg-slate-900 border-slate-700" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Twilio Auth Token</label>
            <Input type="password" placeholder="••••••••••••••••" value={authToken} onChange={e => setAuthToken(e.target.value)} className="h-8 text-sm bg-slate-900 border-slate-700" />
          </div>
          <Button
            size="sm"
            className="w-full bg-orange-600 hover:bg-orange-500 text-white gap-2"
            disabled={!number || !sid || !authToken || connectMutation.isPending}
            onClick={() => connectMutation.mutate()}
          >
            {connectMutation.isPending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Conectando…</>
              : <><PhoneCall className="h-3.5 w-3.5" /> Conectar número</>
            }
          </Button>
        </div>
      )}

      {/* Upgrade overlay */}
      {!isAllowed && (
        <div className="absolute inset-0 rounded-2xl bg-slate-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 p-6">
          <PhoneCall className="h-8 w-8 text-orange-400" />
          <p className="text-sm font-semibold text-slate-200 text-center">Outbound disponible en Voz Business</p>
          <p className="text-xs text-slate-400 text-center">Incluye setup de Twilio sin costo adicional.</p>
          <Link href="/precios" className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors">
            Ver plan Business →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Plans Tab ────────────────────────────────────────────────────────────────

interface PlansTabProps {
  token: string;
  orgId: string;
}

function PlansTab({ token, orgId }: PlansTabProps) {
  const [plans, setPlans] = useState<VoicePlanAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Partial<VoicePlanAdmin> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [apiError, setApiError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await voicePlansApi.listPlans(token, orgId);
      // DRF StandardPagination returns {count, results:[]} — extract the array
      setPlans(Array.isArray(data) ? data : (data as unknown as { results: VoicePlanAdmin[] }).results ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const flashStatus = (s: "success" | "error") => {
    setSaveStatus(s);
    setTimeout(() => setSaveStatus("idle"), 3000);
  };

  const openNew = () => {
    setSelected(null);
    setApiError("");
    setIsOpen(true);
  };

  const openEdit = (plan: VoicePlanAdmin) => {
    setSelected(plan);
    setApiError("");
    setIsOpen(true);
  };

  const handleSave = async (data: Partial<VoicePlanAdmin>) => {
    setSaving(true);
    setApiError("");
    try {
      if (selected?.id) {
        const updated = await voicePlansApi.updatePlan(token, orgId, selected.id, data);
        setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await voicePlansApi.createPlan(token, orgId, data);
        setPlans((prev) => [...prev, created]);
      }
      flashStatus("success");
      setIsOpen(false);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Error al guardar");
      flashStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setSaving(true);
    try {
      await voicePlansApi.deletePlan(token, orgId, id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
      setIsOpen(false);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-base font-bold text-slate-100">Planes de suscripción</h2>
        <p className="mt-1 text-xs text-slate-500">
          Planes recurrentes que aparecen en <code className="rounded bg-slate-800 px-1 text-slate-400">/voz-ia</code>.
        </p>
      </div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {plans.length} {plans.length === 1 ? "plan" : "planes"} configurados
        </p>
        <Button
          size="sm"
          onClick={openNew}
          className="gap-1.5 bg-orange-600 text-white hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-700 py-16">
          <Mic className="h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-400">No hay planes. Crea el primero.</p>
          <Button size="sm" onClick={openNew} className="gap-1.5 bg-orange-600 text-white hover:bg-orange-700">
            <Plus className="h-4 w-4" /> Nuevo plan
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...plans].sort((a, b) => a.sort_order - b.sort_order).map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-7 transition-all hover:-translate-y-0.5 ${
                plan.is_popular
                  ? "border-orange-500/60 bg-gradient-to-br from-slate-900 via-slate-950 to-orange-950/20 shadow-2xl shadow-orange-900/20"
                  : "border-slate-800 bg-slate-950 shadow-lg shadow-black/20"
              }`}
            >
              {plan.is_popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-orange-600 px-4 py-1 text-xs font-bold tracking-wide text-white shadow-lg shadow-orange-900/40">
                  Más popular
                </span>
              )}

              {/* Badges */}
              {!plan.is_active && (
                <div className="mb-3">
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                    Inactivo
                  </span>
                </div>
              )}

              {/* Name */}
              <h3 className="mb-4 text-xl font-black text-slate-100">{plan.name}</h3>

              {/* Price */}
              <div className="mb-1 flex items-end gap-1.5">
                <span className="text-5xl font-black text-white leading-none">
                  ${plan.price_monthly}
                </span>
                <span className="mb-1 text-sm text-slate-400">/mes</span>
              </div>
              <p className="mb-6 text-xs text-slate-500">
                ${plan.annual_price}/mes · facturación anual
              </p>

              {/* Key data row */}
              <div className="mb-6 grid grid-cols-3 gap-2 rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
                <div className="text-center">
                  <p className="text-xl font-black text-slate-100">{plan.agents}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Agentes</p>
                </div>
                <div className="text-center border-x border-slate-800/80">
                  <p className="text-xl font-black text-slate-100">{plan.minutes_included.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Minutos</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-slate-100">${plan.overage_per_minute}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Extra/min</p>
                </div>
              </div>

              {/* Features */}
              <ul className="mb-6 flex-1 space-y-2.5">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Check className={`mt-0.5 h-4 w-4 flex-shrink-0 ${plan.is_popular ? "text-orange-400" : "text-green-500"}`} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Edit button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEdit(plan)}
                className={`mt-auto gap-1.5 ${plan.is_popular ? "border-orange-600/50 text-orange-400 hover:bg-orange-600 hover:text-white hover:border-orange-600" : ""}`}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar plan
              </Button>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <PlanModal
          plan={selected}
          onClose={() => setIsOpen(false)}
          onSave={handleSave}
          onDelete={handleDelete}
          saving={saving}
          saveStatus={saveStatus}
          apiError={apiError}
        />
      )}

      {/* ── Setup tiers section ─────────────────────────────────────────────── */}
      <SetupSection token={token} orgId={orgId} />
    </div>
  );
}

// ─── FAQ modal ────────────────────────────────────────────────────────────────

interface FaqModalProps {
  faq: Partial<VoiceFAQAdmin> | null;
  onClose: () => void;
  onSave: (data: Partial<VoiceFAQAdmin>) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  saving: boolean;
  saveStatus: "idle" | "success" | "error";
  apiError: string;
}

const EMPTY_FAQ: Partial<VoiceFAQAdmin> = {
  question: "",
  answer: "",
  sort_order: 0,
  is_active: true,
};

function FaqModal({
  faq,
  onClose,
  onSave,
  onDelete,
  saving,
  saveStatus,
  apiError,
}: FaqModalProps) {
  const [form, setForm] = useState<Partial<VoiceFAQAdmin>>(
    faq ? { ...EMPTY_FAQ, ...faq } : { ...EMPTY_FAQ }
  );

  useEffect(() => {
    setForm(faq ? { ...EMPTY_FAQ, ...faq } : { ...EMPTY_FAQ });
  }, [faq]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof VoiceFAQAdmin>(k: K, v: VoiceFAQAdmin[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const isEdit = Boolean(faq?.id);

  const handleDelete = async () => {
    if (!faq?.id) return;
    if (!window.confirm("¿Eliminar esta FAQ? Esta acción no se puede deshacer.")) return;
    await onDelete?.(faq.id);
  };

  return (
    <>
      <Overlay onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400">
                <HelpCircle className="h-4 w-4" />
              </div>
              <h2 className="font-semibold text-slate-100">
                {isEdit ? "Editar FAQ" : "Nueva FAQ"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 p-6">
            <Field label="Pregunta">
              <textarea
                className={inputCls}
                rows={2}
                value={form.question ?? ""}
                onChange={(e) => set("question", e.target.value)}
                placeholder="¿Cuántos minutos incluye el plan básico?"
              />
            </Field>
            <Field label="Respuesta">
              <textarea
                className={inputCls}
                rows={4}
                value={form.answer ?? ""}
                onChange={(e) => set("answer", e.target.value)}
                placeholder="El plan básico incluye 100 minutos al mes..."
              />
            </Field>
            <div className="flex items-end gap-4">
              <div className="w-32">
                <Field label="Orden">
                  <input
                    type="number"
                    className={inputCls}
                    value={form.sort_order ?? 0}
                    onChange={(e) => set("sort_order", Number(e.target.value))}
                    min={0}
                  />
                </Field>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-slate-300">Estado</p>
                <Toggle
                  value={form.is_active ?? true}
                  onChange={(v) => set("is_active", v)}
                />
              </div>
            </div>

            {apiError && (
              <p className="rounded-lg bg-red-950/30 px-3 py-2 text-xs text-red-400">
                {apiError}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4">
            <div>
              {isEdit && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-950/30 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <SaveToast status={saveStatus} />
              <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={saving}
                onClick={() => onSave(form)}
                className="gap-1.5 bg-orange-600 text-white hover:bg-orange-700"
              >
                {saving ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Guardar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── FAQs tab ─────────────────────────────────────────────────────────────────

function FaqsTab({ token, orgId }: { token: string; orgId: string }) {
  const [faqs, setFaqs] = useState<VoiceFAQAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Partial<VoiceFAQAdmin> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [apiError, setApiError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await voicePlansApi.listFaqs(token, orgId);
      setFaqs(Array.isArray(data) ? data : (data as unknown as { results: VoiceFAQAdmin[] }).results ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const flashStatus = (s: "success" | "error") => {
    setSaveStatus(s);
    setTimeout(() => setSaveStatus("idle"), 3000);
  };

  const openNew = () => {
    setSelected(null);
    setApiError("");
    setIsOpen(true);
  };

  const openEdit = (faq: VoiceFAQAdmin) => {
    setSelected(faq);
    setApiError("");
    setIsOpen(true);
  };

  const handleSave = async (data: Partial<VoiceFAQAdmin>) => {
    setSaving(true);
    setApiError("");
    try {
      if (selected?.id) {
        const updated = await voicePlansApi.updateFaq(token, orgId, selected.id, data);
        setFaqs((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      } else {
        const created = await voicePlansApi.createFaq(token, orgId, data);
        setFaqs((prev) => [...prev, created]);
      }
      flashStatus("success");
      setIsOpen(false);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Error al guardar");
      flashStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setSaving(true);
    try {
      await voicePlansApi.deleteFaq(token, orgId, id);
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      setIsOpen(false);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
      </div>
    );
  }

  const sorted = [...faqs].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {faqs.length} {faqs.length === 1 ? "pregunta" : "preguntas"}
        </p>
        <Button
          size="sm"
          onClick={openNew}
          className="gap-1.5 bg-orange-600 text-white hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" />
          Nueva FAQ
        </Button>
      </div>

      {faqs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-700 py-16">
          <HelpCircle className="h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-400">No hay FAQs. Crea la primera.</p>
          <Button size="sm" onClick={openNew} className="gap-1.5 bg-orange-600 text-white hover:bg-orange-700">
            <Plus className="h-4 w-4" /> Nueva FAQ
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((faq) => (
            <div
              key={faq.id}
              className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 transition-colors hover:border-slate-700"
            >
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-medium text-slate-400">
                {faq.sort_order}
              </span>

              <p className="flex-1 truncate text-sm text-slate-200">{faq.question}</p>

              <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Toggle
                  value={faq.is_active}
                  onChange={async (v) => {
                    try {
                      const updated = await voicePlansApi.updateFaq(token, orgId, faq.id, {
                        is_active: v,
                      });
                      setFaqs((prev) =>
                        prev.map((f) => (f.id === updated.id ? updated : f))
                      );
                    } catch {
                      // silent
                    }
                  }}
                />
                <button
                  onClick={() => openEdit(faq)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-orange-400"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={async () => {
                    if (!window.confirm("¿Eliminar esta FAQ?")) return;
                    await handleDelete(faq.id);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-950/30 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex-shrink-0 opacity-100 group-hover:opacity-0 transition-opacity">
                <Toggle value={faq.is_active} onChange={() => {}} />
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <FaqModal
          faq={selected}
          onClose={() => setIsOpen(false)}
          onSave={handleSave}
          onDelete={handleDelete}
          saving={saving}
          saveStatus={saveStatus}
          apiError={apiError}
        />
      )}
    </div>
  );
}

// ─── Stat modal ───────────────────────────────────────────────────────────────

interface StatModalProps {
  stat: Partial<VoiceStatAdmin> | null;
  onClose: () => void;
  onSave: (data: Partial<VoiceStatAdmin>) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  saving: boolean;
  saveStatus: "idle" | "success" | "error";
  apiError: string;
}

const EMPTY_STAT: Partial<VoiceStatAdmin> = {
  value: "",
  label: "",
  sort_order: 0,
  is_active: true,
};

function StatModal({
  stat,
  onClose,
  onSave,
  onDelete,
  saving,
  saveStatus,
  apiError,
}: StatModalProps) {
  const [form, setForm] = useState<Partial<VoiceStatAdmin>>(
    stat ? { ...EMPTY_STAT, ...stat } : { ...EMPTY_STAT }
  );

  useEffect(() => {
    setForm(stat ? { ...EMPTY_STAT, ...stat } : { ...EMPTY_STAT });
  }, [stat]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof VoiceStatAdmin>(k: K, v: VoiceStatAdmin[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const isEdit = Boolean(stat?.id);

  const handleDelete = async () => {
    if (!stat?.id) return;
    if (!window.confirm("¿Eliminar esta estadística?")) return;
    await onDelete?.(stat.id);
  };

  return (
    <>
      <Overlay onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400">
                <BarChart3 className="h-4 w-4" />
              </div>
              <h2 className="font-semibold text-slate-100">
                {isEdit ? "Editar estadística" : "Nueva estadística"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 p-6">
            <Field label="Valor" hint='Ej: 24/7, <1s, +40%'>
              <input
                className={inputCls}
                value={form.value ?? ""}
                onChange={(e) => set("value", e.target.value)}
                placeholder="24/7"
              />
            </Field>
            <Field label="Etiqueta" hint="Descripción visible bajo el valor">
              <input
                className={inputCls}
                value={form.label ?? ""}
                onChange={(e) => set("label", e.target.value)}
                placeholder="Disponibilidad"
              />
            </Field>
            <div className="flex items-end gap-4">
              <div className="w-32">
                <Field label="Orden">
                  <input
                    type="number"
                    className={inputCls}
                    value={form.sort_order ?? 0}
                    onChange={(e) => set("sort_order", Number(e.target.value))}
                    min={0}
                  />
                </Field>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-slate-300">Estado</p>
                <Toggle
                  value={form.is_active ?? true}
                  onChange={(v) => set("is_active", v)}
                />
              </div>
            </div>

            {apiError && (
              <p className="rounded-lg bg-red-950/30 px-3 py-2 text-xs text-red-400">
                {apiError}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4">
            <div>
              {isEdit && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-950/30 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <SaveToast status={saveStatus} />
              <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={saving}
                onClick={() => onSave(form)}
                className="gap-1.5 bg-orange-600 text-white hover:bg-orange-700"
              >
                {saving ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Guardar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Stats tab ────────────────────────────────────────────────────────────────

function StatsTab({ token, orgId }: { token: string; orgId: string }) {
  const [stats, setStats] = useState<VoiceStatAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Partial<VoiceStatAdmin> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [apiError, setApiError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await voicePlansApi.listStats(token, orgId);
      setStats(Array.isArray(data) ? data : (data as unknown as { results: VoiceStatAdmin[] }).results ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const flashStatus = (s: "success" | "error") => {
    setSaveStatus(s);
    setTimeout(() => setSaveStatus("idle"), 3000);
  };

  const openNew = () => {
    setSelected(null);
    setApiError("");
    setIsOpen(true);
  };

  const openEdit = (stat: VoiceStatAdmin) => {
    setSelected(stat);
    setApiError("");
    setIsOpen(true);
  };

  const handleSave = async (data: Partial<VoiceStatAdmin>) => {
    setSaving(true);
    setApiError("");
    try {
      if (selected?.id) {
        const updated = await voicePlansApi.updateStat(token, orgId, selected.id, data);
        setStats((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await voicePlansApi.createStat(token, orgId, data);
        setStats((prev) => [...prev, created]);
      }
      flashStatus("success");
      setIsOpen(false);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Error al guardar");
      flashStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setSaving(true);
    try {
      await voicePlansApi.deleteStat(token, orgId, id);
      setStats((prev) => prev.filter((s) => s.id !== id));
      setIsOpen(false);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
      </div>
    );
  }

  const sorted = [...stats].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {stats.length} {stats.length === 1 ? "estadística" : "estadísticas"}
        </p>
        <Button
          size="sm"
          onClick={openNew}
          className="gap-1.5 bg-orange-600 text-white hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" />
          Nueva estadística
        </Button>
      </div>

      {stats.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-700 py-16">
          <BarChart3 className="h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-400">No hay estadísticas. Crea la primera.</p>
          <Button size="sm" onClick={openNew} className="gap-1.5 bg-orange-600 text-white hover:bg-orange-700">
            <Plus className="h-4 w-4" /> Nueva estadística
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sorted.map((stat) => (
            <button
              key={stat.id}
              onClick={() => openEdit(stat)}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center transition-colors hover:border-orange-500/50 hover:bg-orange-950/10"
            >
              <p className="text-4xl font-extrabold text-slate-100">{stat.value}</p>
              <p className="text-sm text-slate-400">{stat.label}</p>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    stat.is_active
                      ? "bg-green-900/40 text-green-400"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {stat.is_active ? "Activo" : "Inactivo"}
                </span>
                <span className="text-[10px] text-slate-600">#{stat.sort_order}</span>
              </div>
              <Pencil className="mt-1 h-3.5 w-3.5 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-orange-400" />
            </button>
          ))}
        </div>
      )}

      {isOpen && (
        <StatModal
          stat={selected}
          onClose={() => setIsOpen(false)}
          onSave={handleSave}
          onDelete={handleDelete}
          saving={saving}
          saveStatus={saveStatus}
          apiError={apiError}
        />
      )}
    </div>
  );
}

// ─── Setup Plans tab ──────────────────────────────────────────────────────────

interface SetupModalProps {
  plan: Partial<VoiceSetupPlanAdmin> | null;
  onClose: () => void;
  onSave: (data: Partial<VoiceSetupPlanAdmin>) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  saving: boolean;
  saveStatus: "idle" | "success" | "error";
  apiError: string;
}

const EMPTY_SETUP: Partial<VoiceSetupPlanAdmin> = {
  name: "",
  slug: "",
  tagline: "",
  price: "",
  days: "",
  features: [],
  cta_text: "Contratar",
  is_popular: false,
  is_active: true,
  sort_order: 0,
};

/** Features editor for {text, highlight}[] */
function SetupFeaturesEditor({
  value,
  onChange,
}: {
  value: { text: string; highlight: boolean }[];
  onChange: (v: { text: string; highlight: boolean }[]) => void;
}) {
  const addRow = () => onChange([...value, { text: "", highlight: false }]);
  const removeRow = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const setRow = (i: number, patch: Partial<{ text: string; highlight: boolean }>) =>
    onChange(value.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className={`${inputCls} flex-1`}
            value={row.text}
            onChange={(e) => setRow(i, { text: e.target.value })}
            placeholder="Descripción del feature"
          />
          <button
            type="button"
            onClick={() => setRow(i, { highlight: !row.highlight })}
            title="Resaltar"
            className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors ${
              row.highlight
                ? "border-orange-500/60 bg-orange-950/30 text-orange-400"
                : "border-slate-700 text-slate-500 hover:border-slate-500"
            }`}
          >
            ★
          </button>
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="flex-shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-red-950/30 hover:text-red-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-700 px-3 py-2 text-xs text-slate-400 hover:border-orange-500/50 hover:text-orange-400 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" /> Añadir feature
      </button>
      <p className="text-[11px] text-slate-500">★ naranja = feature destacado (negrita en la landing)</p>
    </div>
  );
}

function SetupModal({
  plan,
  onClose,
  onSave,
  onDelete,
  saving,
  saveStatus,
  apiError,
}: SetupModalProps) {
  const [form, setForm] = useState<Partial<VoiceSetupPlanAdmin>>(
    plan ? { ...EMPTY_SETUP, ...plan } : { ...EMPTY_SETUP }
  );

  useEffect(() => {
    setForm(plan ? { ...EMPTY_SETUP, ...plan } : { ...EMPTY_SETUP });
  }, [plan]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof VoiceSetupPlanAdmin>(k: K, v: VoiceSetupPlanAdmin[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const isEdit = Boolean(plan?.id);

  const handleDelete = async () => {
    if (!plan?.id) return;
    if (!window.confirm(`¿Eliminar el tier "${form.name}"? Esta acción no se puede deshacer.`)) return;
    await onDelete?.(plan.id);
  };

  return (
    <>
      <Overlay onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400">
              <Wrench className="h-4 w-4" />
            </div>
            <h2 className="font-semibold text-slate-100">
              {isEdit ? "Editar tier de Setup" : "Nuevo tier de Setup"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <input
                className={inputCls}
                value={form.name ?? ""}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Setup Starter"
              />
            </Field>
            <Field label="Slug">
              <input
                className={inputCls}
                value={form.slug ?? ""}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="starter"
              />
            </Field>
          </div>

          <Field label="Tagline" hint="Descripción corta bajo el nombre">
            <input
              className={inputCls}
              value={form.tagline ?? ""}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="Para empresas que quieren un agente operativo rápido."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Precio (USD)" hint='Dejar vacío para "A medida"'>
              <input
                type="number"
                className={inputCls}
                value={form.price ?? ""}
                onChange={(e) => set("price", e.target.value === "" ? null : e.target.value)}
                placeholder="299"
                min={0}
                step={0.01}
              />
            </Field>
            <Field label="Plazo de entrega">
              <input
                className={inputCls}
                value={form.days ?? ""}
                onChange={(e) => set("days", e.target.value)}
                placeholder="48 horas hábiles"
              />
            </Field>
          </div>

          <Field label="Texto del botón CTA">
            <input
              className={inputCls}
              value={form.cta_text ?? ""}
              onChange={(e) => set("cta_text", e.target.value)}
              placeholder="Contratar Setup Starter"
            />
          </Field>

          <Field label="Features" hint="Un feature por fila. ★ naranja = destacado.">
            <SetupFeaturesEditor
              value={form.features ?? []}
              onChange={(v) => set("features", v)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Orden (sort_order)">
              <input
                type="number"
                className={inputCls}
                value={form.sort_order ?? 0}
                onChange={(e) => set("sort_order", Number(e.target.value))}
                min={0}
              />
            </Field>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-300">Más popular</p>
              <Toggle
                value={form.is_popular ?? false}
                onChange={(v) => set("is_popular", v)}
                label={form.is_popular ? "Sí" : "No"}
              />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-300">Estado</p>
              <Toggle
                value={form.is_active ?? true}
                onChange={(v) => set("is_active", v)}
              />
            </div>
          </div>

          {apiError && (
            <p className="rounded-lg bg-red-950/30 px-3 py-2 text-xs text-red-400">{apiError}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-950/30 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SaveToast status={saveStatus} />
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={saving}
              onClick={() => onSave(form)}
              className="gap-1.5 bg-orange-600 text-white hover:bg-orange-700"
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function SetupSection({ token, orgId }: { token: string; orgId: string }) {
  const [tiers, setTiers]         = useState<VoiceSetupPlanAdmin[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Partial<VoiceSetupPlanAdmin> | null>(null);
  const [isOpen, setIsOpen]       = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [apiError, setApiError]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await voicePlansApi.listSetupPlans(token, orgId);
      setTiers(Array.isArray(data) ? data : (data as unknown as { results: VoiceSetupPlanAdmin[] }).results ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, orgId]);

  useEffect(() => { load(); }, [load]);

  const flashStatus = (s: "success" | "error") => {
    setSaveStatus(s);
    setTimeout(() => setSaveStatus("idle"), 3000);
  };

  const openNew  = () => { setSelected(null); setApiError(""); setIsOpen(true); };
  const openEdit = (t: VoiceSetupPlanAdmin) => { setSelected(t); setApiError(""); setIsOpen(true); };

  const handleSave = async (data: Partial<VoiceSetupPlanAdmin>) => {
    setSaving(true);
    setApiError("");
    try {
      if (selected?.id) {
        const updated = await voicePlansApi.updateSetupPlan(token, orgId, selected.id, data);
        setTiers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await voicePlansApi.createSetupPlan(token, orgId, data);
        setTiers((prev) => [...prev, created]);
      }
      flashStatus("success");
      setIsOpen(false);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Error al guardar");
      flashStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setSaving(true);
    try {
      await voicePlansApi.deleteSetupPlan(token, orgId, id);
      setTiers((prev) => prev.filter((t) => t.id !== id));
      setIsOpen(false);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
      </div>
    );
  }

  const sorted = [...tiers].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="mt-12 border-t border-slate-800 pt-10">
      <div className="mb-6">
        <h2 className="text-base font-bold text-slate-100">Servicios de implementación</h2>
        <p className="mt-1 text-xs text-slate-500">
          Tiers de setup único que aparecen en <code className="rounded bg-slate-800 px-1 text-slate-400">/servicios/voz-ia</code>.
        </p>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {tiers.length} {tiers.length === 1 ? "tier" : "tiers"} configurados
        </p>
        <Button size="sm" onClick={openNew} className="gap-1.5 bg-orange-600 text-white hover:bg-orange-700">
          <Plus className="h-4 w-4" /> Nuevo tier
        </Button>
      </div>

      {tiers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-700 py-16">
          <Wrench className="h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-400">No hay tiers. Crea el primero.</p>
          <Button size="sm" onClick={openNew} className="gap-1.5 bg-orange-600 text-white hover:bg-orange-700">
            <Plus className="h-4 w-4" /> Nuevo tier
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((tier) => (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-2xl border bg-slate-950 p-5 ${
                tier.is_popular ? "border-orange-500/60" : "border-slate-800"
              }`}
            >
              {/* Badges */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {tier.is_popular && (
                  <span className="rounded-full bg-orange-900/40 px-2.5 py-0.5 text-xs font-semibold text-orange-400">
                    Más popular
                  </span>
                )}
                {!tier.is_active && (
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                    Inactivo
                  </span>
                )}
              </div>

              <h3 className="mb-1 text-lg font-bold text-slate-100">{tier.name}</h3>
              <p className="mb-3 text-xs text-slate-400">{tier.tagline}</p>

              <div className="mb-1 flex items-end gap-1">
                {tier.price ? (
                  <>
                    <span className="text-3xl font-extrabold text-slate-100">${tier.price}</span>
                    <span className="text-sm text-slate-400 mb-0.5">USD</span>
                  </>
                ) : (
                  <span className="text-xl font-bold text-slate-400">A medida</span>
                )}
              </div>
              <p className="mb-4 text-xs text-slate-500">{tier.days}</p>

              <ul className="mb-5 flex-1 space-y-1.5">
                {tier.features.map((f, i) => (
                  <li key={i} className={`flex items-start gap-2 text-xs ${f.highlight ? "font-semibold text-slate-100" : "text-slate-300"}`}>
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                    {f.text}
                  </li>
                ))}
              </ul>

              <Button
                variant="outline"
                size="sm"
                onClick={() => openEdit(tier)}
                className="mt-auto gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <SetupModal
          plan={selected}
          onClose={() => setIsOpen(false)}
          onSave={handleSave}
          onDelete={handleDelete}
          saving={saving}
          saveStatus={saveStatus}
          apiError={apiError}
        />
      )}
    </div>
  );
}

// ─── My Plan Tab ──────────────────────────────────────────────────────────────

function MyPlanTab({ token, orgId }: { token: string; orgId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["voice-agents"],
    queryFn:  () => voiceWidgetApi.listAgents(token, orgId),
    enabled:  !!token && !!orgId,
  });

  const agents = data?.agents ?? [];
  const plan: VoiceAgentPlan = data?.plan ?? { slug: "starter", name: "Starter", agent_limit: 1 };

  const PLAN_DETAILS: Record<string, { minutes: number; overage: string; features: string[] }> = {
    starter: {
      minutes: 300, overage: "$0.10/min",
      features: ["1 agente de voz activo", "300 minutos incluidos", "Integración CRM básica", "Soporte por email"],
    },
    pro: {
      minutes: 1000, overage: "$0.09/min",
      features: ["3 agentes de voz activos", "1.000 minutos incluidos", "Escalado automático a humanos", "Agenda de citas integrada", "Dashboard de analíticas", "Soporte prioritario"],
    },
    business: {
      minutes: 5000, overage: "$0.08/min",
      features: ["10 agentes de voz activos", "5.000 minutos incluidos", "Voz personalizada de marca", "Integraciones avanzadas (API)", "Reportes personalizados", "Soporte dedicado + onboarding"],
    },
  };

  const details = PLAN_DETAILS[plan.slug] ?? PLAN_DETAILS.starter;
  const agentPct = Math.min((agents.length / plan.agent_limit) * 100, 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan card */}
      <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-orange-950/10 p-8 shadow-xl shadow-black/20">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="h-4 w-4 text-orange-400" />
              <span className="text-xs font-semibold uppercase tracking-wide text-orange-400">
                Plan activo
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-100">{plan.name}</h2>
          </div>
          <Link
            href="/precios"
            target="_blank"
            className="flex items-center gap-1.5 rounded-xl border border-orange-600 px-4 py-2 text-sm font-medium text-orange-400 hover:bg-orange-600 hover:text-white transition-colors"
          >
            <TrendingUp className="h-4 w-4" />
            Hacer upgrade
          </Link>
        </div>

        {/* Features */}
        <ul className="mb-6 space-y-2">
          {details.features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
              <Check className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
              {f}
            </li>
          ))}
        </ul>

        {/* Usage */}
        <div className="space-y-4 border-t border-slate-800 pt-5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-400">Agentes activos</span>
              <span className="text-xs font-semibold text-slate-200">
                {agents.length} / {plan.agent_limit}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${agentPct >= 100 ? "bg-red-500" : "bg-gradient-to-r from-orange-600 to-orange-400"}`}
                style={{ width: `${agentPct}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
              <p className="text-lg font-bold text-slate-100">{details.minutes.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Minutos incluidos/mes</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
              <p className="text-lg font-bold text-slate-100">{details.overage}</p>
              <p className="text-xs text-slate-500">Excedente por minuto</p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Para cambiar de plan contacta a soporte o visita la{" "}
        <Link href="/precios" className="text-orange-400 hover:text-orange-300">
          página de precios
        </Link>
        .
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Calls Tab ────────────────────────────────────────────────────────────────

function fmtDuration(secs: number): string {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-GT", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function ScoreBadge({ score }: { score?: number | null }) {
  if (score == null) return <span className="text-slate-600">—</span>;
  const s = Number(score);
  const color = s >= 7 ? "text-green-400 bg-green-950/50 border-green-800/60"
    : s >= 4 ? "text-yellow-400 bg-yellow-950/50 border-yellow-800/60"
    : "text-red-400 bg-red-950/50 border-red-800/60";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${color}`}>
      {s}/10
    </span>
  );
}

function SentimentIcon({ sentiment }: { sentiment: string }) {
  if (sentiment === "positive") return <ThumbsUp className="h-3.5 w-3.5 text-green-400" />;
  if (sentiment === "negative") return <ThumbsDown className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3.5 w-3.5 text-slate-500" />;
}

function InterestedBadge({ v }: { v?: boolean | null }) {
  if (v == null) return <span className="text-slate-600 text-xs">—</span>;
  return v
    ? <span className="rounded-full bg-green-950/60 border border-green-800/50 px-2 py-0.5 text-xs font-medium text-green-400">Sí</span>
    : <span className="rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-xs font-medium text-slate-400">No</span>;
}

// ─── Call detail drawer ───────────────────────────────────────────────────────

function CallDrawer({ call, onClose }: { call: VoiceCallRecord; token: string; orgId: string; onClose: () => void }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const so: VoiceCallStructuredOutput = call.structured_output ?? {};

  const callerDisplay = so.lead_name || call.caller_name || "Desconocido";

  const infoRows: { icon: React.ElementType; label: string; value?: string | null }[] = [
    { icon: User,          label: "Nombre",         value: so.lead_name },
    { icon: Mail,          label: "Email",           value: so.lead_email },
    { icon: Phone,         label: "Teléfono",        value: so.lead_phone || call.caller_phone },
    { icon: Building2,     label: "Empresa",         value: so.company },
    { icon: Target,        label: "Intención",       value: so.intent },
    { icon: DollarSign,    label: "Presupuesto",     value: so.budget_mentioned },
    { icon: Clock,         label: "Plazo",           value: so.timeline },
    { icon: ArrowRight,    label: "Siguiente paso",  value: so.follow_up_action },
  ].filter(r => r.value);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-slate-950 border-l border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-600/20 border border-orange-600/30">
              <PhoneCall className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-100 leading-none">{callerDisplay}</p>
              <p className="mt-0.5 text-xs text-slate-500">{fmtDate(call.ended_at || call.created_at)}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {fmtDuration(call.duration_seconds)}
            </span>
            <span className="flex items-center gap-1.5">
              <SentimentIcon sentiment={call.sentiment} />
              {call.sentiment === "positive" ? "Positivo" : call.sentiment === "negative" ? "Negativo" : "Neutral"}
            </span>
            <span className="flex items-center gap-1.5">
              Interesado: <InterestedBadge v={so.is_interested} />
            </span>
            <span className="flex items-center gap-1.5">
              Score: <ScoreBadge score={so.qualification_score} />
            </span>
            {call.agent_name && (
              <span className="flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5">
                <Mic className="h-3 w-3 text-orange-400" /> {call.agent_name}
              </span>
            )}
          </div>

          {/* Summary */}
          {(so.summary_es || call.summary) && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-orange-400" /> Resumen
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">{so.summary_es || call.summary}</p>
            </div>
          )}

          {/* Structured data */}
          {infoRows.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Datos extraídos</p>
              <div className="space-y-2">
                {infoRows.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 rounded-lg bg-slate-900/40 border border-slate-800/60 px-3 py-2.5">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="text-sm text-slate-200 break-words">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Objections */}
          {so.objections && so.objections.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" /> Objeciones
              </p>
              <div className="flex flex-wrap gap-2">
                {so.objections.map((o, i) => (
                  <span key={i} className="rounded-full border border-yellow-800/50 bg-yellow-950/30 px-2.5 py-1 text-xs text-yellow-300">
                    {o}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Lead link */}
          {call.lead_id && (
            <Link
              href={`/dashboard/leads?id=${call.lead_id}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-green-800/40 bg-green-950/20 px-4 py-3 text-sm font-medium text-green-400 hover:bg-green-950/40 transition-colors"
            >
              <span className="flex items-center gap-2"><User className="h-4 w-4" /> Ver lead en CRM</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}

          {/* Transcript */}
          {call.transcript && (
            <div>
              <button
                type="button"
                onClick={() => setShowTranscript(v => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Transcript completo</span>
                {showTranscript ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {showTranscript && (
                <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/30 p-4">
                  <pre className="whitespace-pre-wrap font-mono text-xs text-slate-400 leading-relaxed">{call.transcript}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Calls tab ────────────────────────────────────────────────────────────────

function CallsTab({ token, orgId }: { token: string; orgId: string }) {
  const [page,        setPage]        = useState(1);
  const [agentFilter, setAgentFilter] = useState("");
  const [selected,    setSelected]    = useState<VoiceCallRecord | null>(null);

  const { data: agentsData } = useQuery({
    queryKey: ["voice-agents"],
    queryFn:  () => voiceWidgetApi.listAgents(token, orgId),
    enabled:  !!token && !!orgId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["voice-calls", orgId, agentFilter, page],
    queryFn:  () => voiceCallsApi.list(token, orgId, { agentId: agentFilter || undefined, page }),
    enabled:  !!token && !!orgId,
    staleTime: 30_000,
  });

  // Fetch full detail (with transcript) when a row is clicked
  const { data: detailData } = useQuery({
    queryKey: ["voice-call-detail", selected?.id],
    queryFn:  () => voiceCallsApi.detail(token, orgId, selected!.id),
    enabled:  !!selected,
  });

  const calls       = data?.results ?? [];
  const totalPages  = data?.total_pages ?? 1;
  const count       = data?.count ?? 0;

  const agents = agentsData?.agents ?? [];

  return (
    <div>
      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-orange-500"
          value={agentFilter}
          onChange={e => { setAgentFilter(e.target.value); setPage(1); }}
        >
          <option value="">Todos los agentes</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <span className="text-xs text-slate-500">{count} llamada{count !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
        </div>
      ) : calls.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-800 py-20">
          <PhoneOff className="h-10 w-10 text-slate-700" />
          <p className="text-sm text-slate-500">No hay llamadas registradas aún</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 hidden sm:table-cell">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hidden sm:table-cell">Intención</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Score</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Interés</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 hidden md:table-cell">Duración</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 hidden md:table-cell">Sentimiento</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call, i) => {
                  const so = call.structured_output ?? {};
                  const name = so.lead_name || call.caller_name || "—";
                  return (
                    <tr
                      key={call.id}
                      onClick={() => setSelected(call)}
                      className={`cursor-pointer border-b border-slate-800/50 transition-colors hover:bg-slate-800/40 ${i % 2 === 0 ? "bg-slate-900/20" : ""}`}
                    >
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fmtDate(call.ended_at || call.created_at)}</td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        {call.direction === "outbound"
                          ? <span className="inline-flex items-center gap-1 rounded-full border border-blue-700 bg-blue-950/60 px-2 py-0.5 text-[10px] font-semibold text-blue-400">↗ Saliente</span>
                          : <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[10px] font-semibold text-slate-400">↙ Entrante</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-200 truncate max-w-[140px]">{name}</p>
                        {call.caller_phone && <p className="text-xs text-slate-500">{call.caller_phone}</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="truncate max-w-[160px] text-xs text-slate-400">{so.intent || "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-center"><ScoreBadge score={so.qualification_score} /></td>
                      <td className="px-4 py-3 text-center"><InterestedBadge v={so.is_interested} /></td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400 hidden md:table-cell">{fmtDuration(call.duration_seconds)}</td>
                      <td className="px-4 py-3 text-center hidden md:table-cell"><SentimentIcon sentiment={call.sentiment} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
              </button>
              <span className="text-xs text-slate-500">Pág. {page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail drawer */}
      {selected && (
        <CallDrawer
          call={detailData ?? selected}
          token={token}
          orgId={orgId}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

type Tab = "agents" | "myplan" | "plans" | "faqs" | "stats" | "calls";

const ALL_TABS: { id: Tab; label: string; icon: React.ElementType; staffOnly: boolean }[] = [
  { id: "agents", label: "Mis Agentes", icon: Mic,        staffOnly: false },
  { id: "calls",  label: "Llamadas",    icon: PhoneCall,  staffOnly: false },
  { id: "myplan", label: "Mi Plan",     icon: Crown,      staffOnly: false },
  { id: "plans",  label: "Precios",     icon: BarChart3,  staffOnly: true  },
  { id: "faqs",   label: "FAQs",        icon: HelpCircle, staffOnly: true  },
  { id: "stats",  label: "Estadísticas",icon: Zap,        staffOnly: true  },
];

export default function VoicePlansPage() {
  const { tokens, organization, setUser } = useAuthStore();
  const token  = tokens?.access ?? "";
  const orgId  = organization?.id ?? "";
  const [activeTab, setActiveTab] = useState<Tab>("agents");

  // Fetch fresh user data to get up-to-date is_staff (avoids stale Zustand cache)
  const { data: freshUser } = useQuery({
    queryKey: ["auth-me"],
    queryFn:  () => authApi.me(token, String(orgId)),
    enabled:  !!token,
    staleTime: 5 * 60 * 1000,
  });

  // Sync fresh user into the store so is_staff is available globally
  useEffect(() => {
    if (freshUser) setUser(freshUser);
  }, [freshUser, setUser]);

  const isStaff = freshUser?.is_staff === true;
  const visibleTabs = ALL_TABS.filter(t => !t.staffOnly || isStaff);

  return (
    <FeatureGate
      requireVoz
      featureName="Agente de Voz IA"
      featureDescription="Activa un agente de voz con IA que atiende llamadas 24/7, califica leads y agenda citas sin intervención humana."
      highlights={["Disponible 24/7 sin intervención humana", "Calificación automática de leads por voz", "Agendamiento de citas", "Escalación a agente humano cuando sea necesario"]}
      ctaHref="/voz-ia"
      ctaLabel="Ver planes de Voz IA"
    >
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardHeader title="Agente de Voz IA" />

      <div className="flex-1 overflow-y-auto bg-slate-900/30">
        <div className="mx-auto max-w-[1440px] px-8 py-10">

          {/* Page header — premium */}
          <div className="relative mb-10 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/20 px-8 py-8 shadow-2xl shadow-black/30">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-600/8 blur-3xl" />
            <div className="pointer-events-none absolute left-0 bottom-0 h-40 w-40 -translate-x-1/2 translate-y-1/2 rounded-full bg-orange-600/5 blur-2xl" />
            <div className="relative flex items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-600 shadow-xl shadow-orange-900/50 ring-1 ring-orange-500/40">
                  <Mic className="h-8 w-8 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="rounded-full border border-orange-700/50 bg-orange-950/60 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest text-orange-400">
                      Voz IA
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-green-400 font-medium">Activo</span>
                  </div>
                  <h1 className="text-2xl font-black text-slate-100 leading-tight">Agente de Voz IA</h1>
                  <p className="mt-1 text-sm text-slate-400 max-w-xl">
                    {isStaff
                      ? <>Gestiona agentes, planes y contenido de la landing <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300 font-mono">/voz-ia</code></>
                      : "Gestiona tus agentes de voz IA y consulta tu plan activo."}
                  </p>
                </div>
              </div>
              {isStaff && (
                <Link
                  href="/voz-ia"
                  target="_blank"
                  className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-orange-600 hover:bg-orange-950/30 hover:text-orange-400"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver landing
                </Link>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-8 flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
            {visibleTabs.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                    active
                      ? "bg-orange-600 text-white shadow-sm shadow-orange-900/40"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          {activeTab === "agents" && <AgentsTab   token={token} orgId={String(orgId)} />}
          {activeTab === "calls"  && <CallsTab    token={token} orgId={String(orgId)} />}
          {activeTab === "myplan" && <MyPlanTab   token={token} orgId={String(orgId)} />}
          {activeTab === "plans"  && isStaff && <PlansTab    token={token} orgId={String(orgId)} />}
          {activeTab === "faqs"   && isStaff && <FaqsTab     token={token} orgId={String(orgId)} />}
          {activeTab === "stats"  && isStaff && <StatsTab    token={token} orgId={String(orgId)} />}
        </div>
      </div>
    </div>
    </FeatureGate>
  );
}
