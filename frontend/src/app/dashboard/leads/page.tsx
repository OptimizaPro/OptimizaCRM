"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, type Row } from "@tanstack/react-table";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { useAuthStore } from "@/store/auth";
import { crmApi, aiApi, csvApi, outboundApi, voiceWidgetApi, settingsApi, type Lead, type MembershipDetail } from "@/lib/api";
import { DriveDocumentsPanel } from "@/components/dashboard/drive-documents-panel";
import {
  Plus, Brain, Search, ChevronDown, ChevronUp, Loader2,
  Upload, Download, X, Pencil, Trash2, Phone, Mail,
  Building2, Tag, BarChart2, User, Clock, AlertTriangle, Info,
  MousePointerClick, Eye, AtSign, Filter, PhoneCall, ShieldCheck,
  UserCircle2, Target, UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  new:       "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  converted: "Convertido",
  lost:      "Perdido",
};

const SOURCE_LABELS: Record<string, string> = {
  web:         "Sitio web",
  referral:    "Referido",
  cold_call:   "Llamada fría",
  social:      "Redes sociales",
  event:       "Evento",
  voice_agent: "Agente de voz",
  chatbot:     "Chatbot IA",
  other:       "Otro",
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS);

const PIPELINE_STAGE_LABELS: Record<string, string> = {
  new:         "Nuevo",
  contacted:   "Contactado",
  qualified:   "Calificado",
  proposal:    "Propuesta",
  negotiation: "Negociación",
  won:         "Ganado",
  lost:        "Perdido",
};
const SOURCE_OPTIONS = Object.entries(SOURCE_LABELS);

const selectCls = "rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 focus:border-orange-500 focus:outline-none";

const EMPTY_FORM = {
  first_name: "", last_name: "", email: "", phone: "",
  company: "", title: "", source: "web", status: "new", notes: "",
};

// ─── SLA por etapa (horas desde última actualización) ─────────────────────────
const SLA_HOURS: Record<string, number | null> = {
  new:       24,   // contactar en 24 h
  contacted: 48,   // calificar en 48 h
  qualified: 72,   // enviar propuesta en 72 h
  converted: null, // cerrado, sin deadline
  lost:      null, // cerrado, sin deadline
};

const SLA_LABEL: Record<string, string> = {
  new:       "Contactar en",
  contacted: "Calificar en",
  qualified: "Propuesta en",
};

interface SLAInfo {
  light: "green" | "yellow" | "red";
  label: string;           // tiempo restante formateado
  tooltip: string;         // fecha exacta de vencimiento
  hoursLeft: number;
}

function getSLA(lead: Lead): SLAInfo | null {
  const slaHours = SLA_HOURS[lead.status];
  if (slaHours == null) return null;

  // updated_at es el mejor proxy de cuándo cambió el estado por última vez
  const ref      = new Date(lead.updated_at || lead.created_at);
  const deadline = new Date(ref.getTime() + slaHours * 60 * 60 * 1000);
  const now      = new Date();
  const diffMs   = deadline.getTime() - now.getTime();
  const diffH    = diffMs / (1000 * 60 * 60);

  const formatRemaining = (h: number) => {
    if (h <= 0) {
      const absH = Math.abs(h);
      if (absH < 1) return `${Math.ceil(absH * 60)} min vencido`;
      if (absH < 24) return `${Math.floor(absH)}h vencido`;
      return `${Math.floor(absH / 24)}d vencido`;
    }
    if (h < 1) return `${Math.ceil(h * 60)} min`;
    if (h < 24) return `${Math.floor(h)}h ${Math.round((h % 1) * 60)}min`;
    const d = Math.floor(h / 24);
    const rem = Math.floor(h % 24);
    return rem > 0 ? `${d}d ${rem}h` : `${d}d`;
  };

  const deadlineStr = deadline.toLocaleString("es-GT", {
    timeZone: "America/Guatemala", weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
  const action = SLA_LABEL[lead.status] ?? "Actuar en";

  return {
    light:    diffH < 0 ? "red" : diffH <= 3 ? "yellow" : "green",
    label:    formatRemaining(diffH),
    tooltip:  `${action} ${slaHours}h · Vence: ${deadlineStr}`,
    hoursLeft: diffH,
  };
}

const GT = "America/Guatemala";

function formatRelativeDate(iso: string): string {
  const d     = new Date(iso);
  const now   = new Date();
  const diffH = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
  if (diffH < 1)  return `hace ${Math.round(diffH * 60)} min`;
  if (diffH < 24) return `hace ${Math.floor(diffH)}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)  return `hace ${diffD}d`;
  return d.toLocaleDateString("es-GT", { timeZone: GT, day: "numeric", month: "short", year: diffD > 365 ? "numeric" : undefined });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString("es-GT", {
    timeZone: GT, dateStyle: "medium", timeStyle: "short",
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusVariant = (s: string): "default" | "success" | "warning" | "destructive" | "secondary" => ({
  new: "secondary", contacted: "default", qualified: "warning",
  converted: "success", lost: "destructive",
} as Record<string, "default" | "success" | "warning" | "destructive" | "secondary">)[s] ?? "secondary";

const scoreColor = (n: number) =>
  n >= 70 ? "text-green-400" : n >= 40 ? "text-yellow-400" : "text-red-400";

const qualityColor = (q: string) =>
  q === "hot" ? "text-red-400" : q === "warm" ? "text-orange-400" : q === "moderate" ? "text-yellow-400" : "text-slate-400";

// ─── SLA Badge component ──────────────────────────────────────────────────────

function SLABadge({ lead }: { lead: Lead }) {
  const sla = getSLA(lead);
  if (!sla) return <span className="text-slate-600 text-xs">—</span>;

  const colors = {
    green:  { dot: "bg-green-400",  ring: "border-green-800",  text: "text-green-400",  bg: "bg-green-950/60"  },
    yellow: { dot: "bg-yellow-400", ring: "border-yellow-700", text: "text-yellow-400", bg: "bg-yellow-950/60" },
    red:    { dot: "bg-red-500",    ring: "border-red-800",    text: "text-red-400",    bg: "bg-red-950/60"    },
  }[sla.light];

  return (
    <div title={sla.tooltip}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${colors.ring} ${colors.bg} ${colors.text} cursor-help`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${colors.dot} ${sla.light === "red" ? "animate-pulse" : ""}`} />
      {sla.label}
      {sla.light === "red"
        ? <AlertTriangle className="h-3 w-3" />
        : <Info className="h-3 w-3 opacity-70" />
      }
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoreFactor {
  label: string; value: string | null; pts: number; max: number;
  detail?: { email: number; phone: number; company: number };
}
interface ScoreResult {
  score: number; quality: string; quality_es: string;
  conversion_probability: number; factors: Record<string, ScoreFactor>;
}

// ─── Score breakdown ──────────────────────────────────────────────────────────

function ScoreBreakdown({ result }: { result: ScoreResult }) {
  const { score, quality_es, conversion_probability, factors } = result;
  const barColor =
    score >= 80 ? "bg-red-500" : score >= 60 ? "bg-orange-500"
    : score >= 40 ? "bg-yellow-500" : "bg-slate-500";
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-slate-700">
          <div className={`h-2 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${score}%` }} />
        </div>
        <span className={`text-sm font-bold ${scoreColor(score)}`}>{score}/100</span>
        <span className={`text-xs font-semibold ${qualityColor(result.quality)}`}>{quality_es}</span>
        <span className="text-xs text-slate-400">{Math.round(conversion_probability * 100)}% conv.</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.values(factors).map((f) => (
          <div key={f.label} className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5">
            <span className="text-xs text-slate-400">{f.label}:</span>
            {f.value && <span className="text-xs text-slate-200">{f.value}</span>}
            <span className={`text-xs font-semibold ${f.pts > 0 ? "text-orange-400" : "text-slate-500"}`}>+{f.pts}</span>
            <span className="text-xs text-slate-500">/{f.max}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Lead panel (detalle + edición) ──────────────────────────────────────────

function LeadPanel({
  lead, onClose, onSave, onDelete, isSaving, isDeleting,
}: {
  lead: Lead;
  onClose: () => void;
  onSave: (data: Partial<Lead>) => void;
  onDelete: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  const { tokens, organization, user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = organization?.role === "org_admin" || user?.is_staff === true;
  const [editing, setEditing] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [form, setForm] = useState({
    first_name: lead.first_name ?? "",
    last_name:  lead.last_name  ?? "",
    email:      lead.email      ?? "",
    phone:      lead.phone      ?? "",
    company:    lead.company    ?? "",
    title:      lead.title      ?? "",
    source:     lead.source     ?? "web",
    status:     lead.status     ?? "new",
    notes:      lead.notes      ?? "",
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [calling, setCalling] = useState(false);
  // Local optimistic state for consent (so toggle responds immediately)
  const [consent, setConsent] = useState<boolean>(lead.outbound_consent ?? false);
  const [consentDate, setConsentDate] = useState<string | null>(lead.consent_date ?? null);
  const [convertingOpp,      setConvertingOpp]      = useState(false);
  const [convertingCustomer, setConvertingCustomer] = useState(false);

  const auth = { token: tokens!.access, orgId: String(organization!.id) };

  // Members for reassignment dropdown
  const { data: members = [] } = useQuery<MembershipDetail[]>({
    queryKey: ["members", organization?.id],
    queryFn:  () => settingsApi.getMembers(auth.token, auth.orgId),
    enabled:  !!tokens && !!organization && isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  // Check org voice plan for outbound access
  const { data: agentsData } = useQuery({
    queryKey: ["voice-agents"],
    queryFn:  () => voiceWidgetApi.listAgents(auth.token, auth.orgId),
    enabled:  !!tokens && !!organization,
    staleTime: 5 * 60 * 1000,
  });
  const voicePlanSlug = (agentsData?.plan as { slug?: string })?.slug ?? "";
  const hasOutbound   = voicePlanSlug === "voz-business";

  const consentMutation = useMutation({
    mutationFn: (newConsent: boolean) =>
      crmApi.updateLead(auth.token, auth.orgId, lead.id, {
        outbound_consent: newConsent,
        ...(newConsent ? { consent_date: new Date().toISOString() } : { consent_date: null }),
      } as Partial<Lead>),
    onMutate: (newConsent) => {
      // Optimistic update
      setConsent(newConsent);
      setConsentDate(newConsent ? new Date().toISOString() : null);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
    onError: () => {
      // Revert on failure
      setConsent(lead.outbound_consent ?? false);
      setConsentDate(lead.consent_date ?? null);
      toast.error("Error al actualizar el consentimiento");
    },
  });

  async function handleCall() {
    if (!lead.phone) { toast.error("Este lead no tiene teléfono registrado"); return; }
    if (!consent) { toast.error("Activa el consentimiento antes de llamar"); return; }
    setCalling(true);
    try {
      await outboundApi.call(auth.token, auth.orgId, lead.id);
      toast.success(`Llamando a ${lead.full_name || lead.phone}…`);
      queryClient.invalidateQueries({ queryKey: ["voice-calls"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al iniciar llamada";
      if (msg.includes("plan_required"))   toast.error("Outbound disponible solo en Voz Business");
      else if (msg.includes("no_phone"))   toast.error("El lead no tiene teléfono registrado");
      else if (msg.includes("no_consent")) toast.error("Activa el consentimiento antes de llamar");
      else if (msg.includes("no_assistant")) toast.error("El agente de voz no está configurado. Guarda el agente primero.");
      else if (msg.includes("phone_number")) toast.error("Conecta primero tu número de llamadas en Agente de Voz IA");
      else toast.error(msg, { duration: 8000 });
    } finally {
      setCalling(false);
    }
  }

  async function handleConvertToOpportunity() {
    setConvertingOpp(true);
    try {
      await crmApi.convertToOpportunity(auth.token, auth.orgId, lead.id);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead convertido a oportunidad y añadido al Pipeline");
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      if (msg.includes("ya tiene")) toast.error("Este lead ya tiene una oportunidad vinculada");
      else toast.error("Error al convertir a oportunidad");
    } finally {
      setConvertingOpp(false);
    }
  }

  async function handleConvertToCustomer() {
    setConvertingCustomer(true);
    try {
      const res = await crmApi.convertToCustomer(auth.token, auth.orgId, lead.id);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(res.created ? "Lead convertido a cliente" : "Cliente actualizado con los datos del lead");
      onClose();
    } catch (e) {
      toast.error("Error al convertir a cliente");
    } finally {
      setConvertingCustomer(false);
    }
  }

  const field = (key: keyof typeof form) => (
    <Input
      value={form[key]}
      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
      disabled={!editing}
      className="h-8 text-sm disabled:opacity-70 disabled:cursor-default"
    />
  );

  const select = (key: "status" | "source", options: [string, string][]) => (
    <select
      value={form[key]}
      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
      disabled={!editing}
      className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200 disabled:opacity-70 disabled:cursor-default"
    >
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex h-full w-full sm:max-w-md flex-col bg-slate-950 border-l border-slate-800 shadow-2xl overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-100">{lead.full_name || lead.email}</h2>
            <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
              {lead.lead_ref_id && (
                <>
                  <span className="text-slate-500">ID de Lead:</span>
                  <span className="font-mono font-semibold text-orange-400">{lead.lead_ref_id}</span>
                  <span className="text-slate-700">·</span>
                </>
              )}
              <span className="text-slate-500">Empresa:</span>
              <span className="text-slate-300">{lead.company || "—"}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <Button size="sm" variant="outline" className="gap-1.5 border-slate-700 text-slate-300 hover:border-orange-500 hover:text-orange-400"
                onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" className="border-slate-700 text-slate-400"
                  onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-500 text-white"
                  disabled={isSaving} onClick={() => onSave(form)}>
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar"}
                </Button>
              </>
            )}
            <button onClick={onClose} className="ml-1 text-slate-500 hover:text-slate-300">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 p-5">

          {/* Meta row: registro + SLA */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-400">Registro:</span>
              <span className="text-xs text-slate-200" title={formatFullDate(lead.created_at)}>
                {formatRelativeDate(lead.created_at)}
              </span>
            </div>
            {(() => {
              const sla = getSLA(lead);
              if (!sla) return null;
              return <SLABadge lead={lead} />;
            })()}
          </div>

          {/* Score badge */}
          {lead.score > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
              <BarChart2 className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-slate-400">Score IA:</span>
              <span className={`text-sm font-bold ${scoreColor(lead.score)}`}>{lead.score}/100</span>
            </div>
          )}

          {/* Engagement counters */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Engagement</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-0.5 rounded-lg border border-slate-800 bg-slate-900 py-2.5">
                <AtSign className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-base font-bold text-white">{lead.email_opens ?? 0}</span>
                <span className="text-[10px] text-slate-500">Aperturas</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 rounded-lg border border-slate-800 bg-slate-900 py-2.5">
                <MousePointerClick className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-base font-bold text-white">{lead.link_clicks ?? 0}</span>
                <span className="text-[10px] text-slate-500">Clics</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 rounded-lg border border-slate-800 bg-slate-900 py-2.5">
                <Eye className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-base font-bold text-white">{lead.page_visits ?? 0}</span>
                <span className="text-[10px] text-slate-500">Visitas</span>
              </div>
            </div>
            <p className="mt-1 text-[10px] text-slate-600">
              Engagement score: <span className="text-slate-400 font-medium">{lead.engagement_score ?? 0}/15 pts</span>
              {" · "}Se actualiza automáticamente con integraciones de email y web.
            </p>
          </div>

          {/* Campos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Nombre</label>
              {field("first_name")}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Apellido</label>
              {field("last_name")}
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Mail className="h-3 w-3" /> Email
            </label>
            {field("email")}
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Phone className="h-3 w-3" /> Teléfono
            </label>
            {field("phone")}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Building2 className="h-3 w-3" /> Empresa
              </label>
              {field("company")}
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <User className="h-3 w-3" /> Cargo
              </label>
              {field("title")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Tag className="h-3 w-3" /> Estado
              </label>
              {select("status", STATUS_OPTIONS)}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Fuente</label>
              {select("source", SOURCE_OPTIONS)}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              disabled={!editing}
              rows={4}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 disabled:opacity-70 disabled:cursor-default resize-none"
            />
          </div>

          {/* Asignado a */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
              <UserCircle2 className="h-3.5 w-3.5 text-orange-400" /> Asignado a
            </p>
            {!reassigning ? (
              <div className="flex items-center justify-between gap-2">
                {lead.assigned_to_detail ? (
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-orange-950/60 border border-orange-800/40 flex items-center justify-center text-[10px] font-bold text-orange-400 shrink-0">
                      {(lead.assigned_to_detail.first_name?.[0] ?? "").toUpperCase()}{(lead.assigned_to_detail.last_name?.[0] ?? "").toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {lead.assigned_to_detail.first_name} {lead.assigned_to_detail.last_name}
                      </p>
                      <p className="text-[10px] text-slate-500">{lead.assigned_to_detail.email}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-slate-500">Sin asignar</span>
                )}
                {isAdmin && (
                  <button
                    onClick={() => setReassigning(true)}
                    className="text-xs text-slate-500 hover:text-orange-400 transition-colors shrink-0"
                  >
                    {lead.assigned_to_detail ? "Reasignar" : "Asignar"}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-orange-500 focus:outline-none"
                  defaultValue={lead.assigned_to ?? ""}
                  onChange={(e) => {
                    onSave({ assigned_to: e.target.value || null } as Partial<Lead>);
                    setReassigning(false);
                  }}
                >
                  <option value="">Sin asignar</option>
                  {members.filter(m => m.is_active).map(m => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.first_name} {m.user.last_name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setReassigning(false)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* ── Conversión ── */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-orange-400" /> Acciones de conversión
            </p>

            {/* Convert to Opportunity */}
            {!lead.opportunity_id ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2 border-slate-700 text-slate-300 hover:border-orange-500 hover:text-orange-400"
                disabled={convertingOpp}
                onClick={handleConvertToOpportunity}
              >
                {convertingOpp
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Target className="h-3.5 w-3.5" />}
                Convertir a Oportunidad
              </Button>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                <Target className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-300">En el Pipeline</p>
                  {lead.opportunity_stage && (
                    <p className="text-[10px] text-slate-500">Etapa: {PIPELINE_STAGE_LABELS[lead.opportunity_stage] ?? lead.opportunity_stage}</p>
                  )}
                </div>
                <Link
                  href="/dashboard/pipeline"
                  className="text-[10px] text-orange-400 hover:text-orange-300 shrink-0"
                >
                  Ver →
                </Link>
              </div>
            )}

            {/* Convert to Customer */}
            {lead.status === "converted" ? (
              <div className="flex items-center gap-2 rounded-lg border border-green-900/40 bg-green-950/20 px-3 py-2">
                <UserCheck className="h-3.5 w-3.5 text-green-400 shrink-0" />
                <p className="text-xs font-medium text-green-400">Convertido a cliente</p>
              </div>
            ) : !lead.opportunity_id ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                <UserCheck className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                <p className="text-xs text-slate-600">Convierte a Oportunidad primero</p>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2 border-slate-700 text-slate-300 hover:border-green-500 hover:text-green-400"
                disabled={convertingCustomer}
                onClick={handleConvertToCustomer}
              >
                {convertingCustomer
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <UserCheck className="h-3.5 w-3.5" />}
                Convertir a Cliente
              </Button>
            )}
          </div>

          {/* Outbound voice AI */}
          <div className="relative rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
              <PhoneCall className="h-3.5 w-3.5 text-orange-400" /> Voz IA — Outbound
            </p>

            {/* Consent toggle */}
            <button
              onClick={() => consentMutation.mutate(!consent)}
              disabled={consentMutation.isPending || !hasOutbound}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-left transition-colors hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className={`h-4 w-4 shrink-0 ${consent ? "text-green-400" : "text-slate-500"}`} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-300">Consentimiento de contacto</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {consentMutation.isPending
                      ? "Guardando…"
                      : consent
                        ? `Activo${consentDate ? ` · ${new Date(consentDate).toLocaleDateString("es-GT", { timeZone: "America/Guatemala" })}` : ""}`
                        : "Toca para activar"}
                  </p>
                </div>
              </div>
              {/* Switch visual */}
              <div className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${consent ? "bg-green-600" : "bg-slate-600"}`}>
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${consent ? "translate-x-5" : "translate-x-0"}`} />
              </div>
            </button>

            {/* Call button */}
            <Button
              size="sm"
              className="w-full gap-2 bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50"
              disabled={calling || !lead.phone || !consent || consentMutation.isPending || !hasOutbound}
              onClick={handleCall}
            >
              {calling
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Iniciando llamada…</>
                : <><PhoneCall className="h-3.5 w-3.5" /> Llamar a {lead.full_name || lead.phone || "este lead"}</>
              }
            </Button>
            {!lead.phone && hasOutbound && (
              <p className="text-[10px] text-slate-500 text-center">Añade un teléfono para habilitar llamadas outbound</p>
            )}

            {/* Upgrade overlay — shown when not on Voz Business */}
            {!hasOutbound && (
              <div className="absolute inset-0 rounded-xl bg-slate-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 p-4">
                <PhoneCall className="h-6 w-6 text-orange-400" />
                <p className="text-xs font-semibold text-slate-200 text-center">Disponible en Voz Business</p>
                <Link
                  href="/dashboard/voice-plans"
                  className="inline-flex items-center gap-1 rounded-lg bg-orange-600 hover:bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                >
                  Ver planes →
                </Link>
              </div>
            )}
          </div>

          {/* Google Drive documents */}
          <DriveDocumentsPanel entityType="lead" entityId={lead.id} />
        </div>

        {/* Footer — eliminar */}
        <div className="border-t border-slate-800 px-5 py-4">
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 text-xs text-red-500 hover:text-red-400 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Eliminar lead
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">¿Confirmar eliminación?</span>
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-400 h-7 text-xs"
                onClick={() => setConfirmDelete(false)}>No</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white h-7 text-xs"
                disabled={isDeleting} onClick={onDelete}>
                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sí, eliminar"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const { tokens, organization } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [showForm, setShowForm]       = useState(false);
  const [showImport, setShowImport]   = useState(false);
  const [importFile, setImportFile]   = useState<File | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [scoreResults, setScoreResults] = useState<Record<string, ScoreResult>>({});
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const hasFilters = !!(search || statusFilter || sourceFilter);
  const clearFilters = () => { setSearch(""); setStatusFilter(""); setSourceFilter(""); };

  const { data, isLoading } = useQuery({
    queryKey: ["leads", search, statusFilter, sourceFilter],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (search)       qs.set("search", search);
      if (statusFilter) qs.set("status", statusFilter);
      if (sourceFilter) qs.set("source", sourceFilter);
      const q = qs.toString();
      return crmApi.getLeads(tokens!.access, organization!.id, q || undefined);
    },
    enabled: !!tokens && !!organization,
  });

  const createMutation = useMutation({
    mutationFn: (d: Partial<Lead>) => crmApi.createLead(tokens!.access, organization!.id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) =>
      crmApi.updateLead(tokens!.access, organization!.id, id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setSelectedLead(updated);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteLead(tokens!.access, organization!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setSelectedLead(null);
    },
  });

  const scoreMutation = useMutation({
    mutationFn: (leadId: string) => aiApi.scoreLead(tokens!.access, organization!.id, leadId),
    onSuccess: (result, leadId) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setScoreResults((prev) => ({ ...prev, [leadId]: result as unknown as ScoreResult }));
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => csvApi.importLeads(tokens!.access, organization!.id, file),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setImportResult(`${res.imported} leads importados correctamente.`);
      setImportFile(null);
    },
    onError: (err: Error) => setImportResult(`Error: ${err.message}`),
  });

  const columns: ColumnDef<Lead, unknown>[] = [
    {
      accessorKey: "full_name",
      header: "Nombre",
      cell: ({ getValue, row }) => (
        <button type="button" onClick={() => setSelectedLead(row.original)}
          className="text-left space-y-0.5">
          <span className="block font-medium text-slate-200 hover:text-orange-400 transition-colors">
            {getValue() as string}
          </span>
          {row.original.lead_ref_id && (
            <span className="inline-block rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-400 font-mono">
              {row.original.lead_ref_id}
            </span>
          )}
        </button>
      ),
    },
    {
      accessorKey: "company",
      header: "Empresa",
      cell: ({ getValue }) => <span className="text-slate-400">{(getValue() as string) || "—"}</span>,
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ getValue, row }) => (
        <div className="flex flex-col gap-1">
          <Badge variant={statusVariant(getValue() as string)}>
            {STATUS_LABELS[getValue() as string] ?? getValue() as string}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Registro",
      cell: ({ getValue }) => (
        <span className="flex items-center gap-1 text-xs text-slate-400 cursor-help" title={formatFullDate(getValue() as string)}>
          <Clock className="h-3 w-3 shrink-0" />
          {formatRelativeDate(getValue() as string)}
          <Info className="h-3 w-3 opacity-60" />
        </span>
      ),
    },
    {
      id: "sla",
      header: "Atención",
      enableSorting: false,
      cell: ({ row }) => <SLABadge lead={row.original} />,
    },
    {
      id: "assigned_to",
      header: "Asignado a",
      enableSorting: false,
      cell: ({ row }) => {
        const d = row.original.assigned_to_detail;
        if (!d) return <span className="text-slate-600 text-xs">—</span>;
        const initials = `${d.first_name?.[0] ?? ""}${d.last_name?.[0] ?? ""}`.toUpperCase();
        const name = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || d.email;
        return (
          <div className="flex items-center gap-1.5" title={name}>
            <div className="h-6 w-6 rounded-full bg-orange-950/60 border border-orange-800/40 flex items-center justify-center text-[10px] font-bold text-orange-400 shrink-0">
              {initials || "?"}
            </div>
            <span className="text-xs text-slate-300 truncate max-w-[80px]">{name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "score",
      header: "Score",
      cell: ({ getValue, row }) => {
        const score = getValue() as number;
        const hasBreakdown = !!scoreResults[row.original.id];
        const isExpanded = row.getIsExpanded();
        if (!score) return <span className="text-slate-500">—</span>;
        return (
          <button type="button" onClick={() => hasBreakdown && row.toggleExpanded()}
            className={`flex items-center gap-1 font-bold ${scoreColor(score)} ${hasBreakdown ? "hover:opacity-80" : "cursor-default"}`}>
            {score}
            {hasBreakdown && (isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
          </button>
        );
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const isScoring = scoreMutation.isPending && scoreMutation.variables === row.original.id;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" title="Calcular score IA"
              onClick={() => scoreMutation.mutate(row.original.id)} disabled={isScoring}
              className="gap-1 text-xs text-slate-400 hover:text-white px-2">
              {isScoring ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
              {isScoring ? "..." : "Score"}
            </Button>
            <Button variant="ghost" size="sm" title="Editar"
              onClick={() => setSelectedLead(row.original)}
              className="px-2 text-slate-400 hover:text-orange-400">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" title="Eliminar"
              onClick={() => { setSelectedLead(row.original); }}
              className="px-2 text-slate-400 hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DashboardHeader title="Leads" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9 w-full sm:w-52" placeholder="Buscar leads..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Filter className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
              <option value="">Todos los estados</option>
              {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className={selectCls}>
              <option value="">Todas las fuentes</option>
              {SOURCE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {hasFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2.5 text-xs text-slate-400 hover:border-red-700 hover:text-red-400 transition-colors">
                <X className="h-3.5 w-3.5" /> Limpiar
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => { setShowImport(!showImport); setShowForm(false); setImportResult(null); }}
              className="gap-2 border-slate-700 text-slate-300 hover:border-orange-600 hover:bg-orange-600 hover:text-white">
              <Upload className="h-4 w-4" /><span className="hidden sm:inline">Importar</span>
            </Button>
            <Button variant="outline" onClick={() => csvApi.exportLeads(tokens!.access, organization!.id)}
              className="gap-2 border-slate-700 text-slate-300 hover:border-orange-600 hover:bg-orange-600 hover:text-white">
              <Download className="h-4 w-4" /><span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button onClick={() => { setShowForm(!showForm); setShowImport(false); }}
              className="gap-2 bg-orange-600 hover:bg-orange-500 text-white">
              <Plus className="h-4 w-4" /> Añadir Lead
            </Button>
          </div>
        </div>

        {/* Import panel */}
        {showImport && (
          <Card className="mb-6 bg-slate-950">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Importar leads desde CSV</p>
                  <p className="text-xs text-slate-500 mt-0.5">Columnas: first_name, last_name, email, phone, company, source, status</p>
                </div>
                <button onClick={() => { setShowImport(false); setImportResult(null); setImportFile(null); }} className="text-slate-500 hover:text-slate-300">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <input type="file" accept=".csv"
                  onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportResult(null); }}
                  className="flex-1 text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-300 hover:file:bg-slate-700"
                />
                <Button onClick={() => importFile && importMutation.mutate(importFile)}
                  disabled={!importFile || importMutation.isPending} className="bg-orange-600 hover:bg-orange-500 text-white">
                  {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Importar"}
                </Button>
              </div>
              {importResult && (
                <p className={`mt-3 text-xs ${importResult.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
                  {importResult}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create form */}
        {showForm && (
          <Card className="mb-6 bg-slate-950">
            <CardContent className="pt-6">
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form }); }}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input placeholder="Nombre *" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
                <Input placeholder="Apellido" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input placeholder="Empresa" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200">
                  {SOURCE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Lead"}
                </Button>
                <Button type="button" variant="outline" className="border-slate-700 text-slate-300"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>
                  Cancelar
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Mobile card list */}
        <div className="md:hidden space-y-2 mb-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-800 bg-slate-950 p-4 animate-pulse">
                  <div className="h-4 w-32 rounded bg-slate-700 mb-2" />
                  <div className="h-3 w-24 rounded bg-slate-800" />
                </div>
              ))}
            </div>
          ) : (data?.results ?? []).length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No hay leads. Crea el primero arriba.</p>
          ) : (
            (data?.results ?? []).map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => setSelectedLead(lead)}
                className="w-full text-left rounded-xl border border-slate-800 bg-slate-950 p-4 hover:border-orange-500/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100 truncate">{lead.full_name || lead.email}</p>
                    {lead.company && <p className="text-xs text-slate-400 truncate mt-0.5">{lead.company}</p>}
                    {lead.lead_ref_id && (
                      <span className="inline-block mt-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-400 font-mono">
                        {lead.lead_ref_id}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <Badge variant={statusVariant(lead.status)}>
                      {STATUS_LABELS[lead.status] ?? lead.status}
                    </Badge>
                    {lead.score > 0 && (
                      <span className={`text-xs font-bold ${scoreColor(lead.score)}`}>{lead.score}/100</span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <SLABadge lead={lead} />
                  <span className="text-xs text-slate-500">{formatRelativeDate(lead.created_at)}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <DataTable
            columns={columns}
            data={data?.results ?? []}
            isLoading={isLoading}
            emptyMessage="No hay leads. Crea el primero arriba."
            renderSubRow={(row: Row<Lead>) =>
              scoreResults[row.original.id] ? <ScoreBreakdown result={scoreResults[row.original.id]} /> : null
            }
          />
        </div>

        {/* Legends row */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {/* Score legend */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Criterios del score</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
              <span>Fuente <span className="font-medium text-slate-200">max 25 pts</span></span>
              <span>Estado <span className="font-medium text-slate-200">max 30 pts</span></span>
              <span>Contacto <span className="font-medium text-slate-200">+30 pts</span></span>
              <span className="h-3 w-px bg-slate-700" />
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /><span className="font-medium text-red-400">&ge;80 Caliente</span></span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-400" /><span className="font-medium text-orange-400">&ge;60 Tibio</span></span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400" /><span className="font-medium text-yellow-400">&ge;40 Moderado</span></span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-500" /><span className="text-slate-400">&lt;40 Frio</span></span>
            </div>
          </div>

          {/* SLA legend */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Semáforo de atención (SLA)</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-400" /><span className="text-green-400 font-medium">Verde</span> — dentro del plazo</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400" /><span className="text-yellow-400 font-medium">Amarillo</span> — menos de 3h</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /><span className="text-red-400 font-medium">Rojo</span> — plazo vencido</span>
              <span className="h-3 w-px bg-slate-700" />
              <span><span className="font-medium text-slate-200">Nuevo</span> 24h · <span className="font-medium text-slate-200">Contactado</span> 48h · <span className="font-medium text-slate-200">Calificado</span> 72h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lead panel */}
      {selectedLead && (
        <LeadPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onSave={(d) => updateMutation.mutate({ id: selectedLead.id, data: d })}
          onDelete={() => deleteMutation.mutate(selectedLead.id)}
          isSaving={updateMutation.isPending}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </>
  );
}
