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
import { crmApi, aiApi, csvApi, organizationApi, type Customer, type ConsumptionRecord, type ConsumptionSummaryComparison } from "@/lib/api";
import type { CustomerSegment } from "@/lib/api";
import { DriveDocumentsPanel } from "@/components/dashboard/drive-documents-panel";
import { formatCurrency } from "@/lib/utils";
import {
  Plus, Brain, Upload, Download, X, Loader2,
  Pencil, Trash2, Mail, Phone, Building2, MapPin, User,
  Clock, AlertTriangle, Info, Search, Filter, Star, Receipt, Trash, HelpCircle,
  ChevronDown, ChevronUp, ShieldCheck, TrendingUp, TrendingDown,
  Users, Layers, CheckCircle2, RotateCcw, ArrowLeftRight, BarChart3,
  ChevronsUpDown, ArrowUp, ArrowDown, Activity,
} from "lucide-react";

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  active:   "Activo",
  inactive: "Inactivo",
  churned:  "Perdido",
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS);

// ─── Segmentos (defaults + override desde org.settings) ──────────────────────

export interface OrgSegment {
  key: string;
  label: string;
  color: "slate" | "blue" | "green" | "orange" | "yellow" | "purple" | "pink" | "red";
  min_ltv: number;
}

export const DEFAULT_SEGMENTS: OrgSegment[] = [
  { key: "basic",    label: "Básico",    color: "slate",  min_ltv: 0    },
  { key: "frequent", label: "Frecuente", color: "blue",   min_ltv: 500  },
  { key: "vip",      label: "VIP",       color: "orange", min_ltv: 2000 },
  { key: "premium",  label: "Premium",   color: "yellow", min_ltv: 5000 },
];

const COLOR_CLASSES: Record<OrgSegment["color"], string> = {
  slate:  "border-slate-600 text-slate-400 bg-slate-900",
  blue:   "border-blue-700 text-blue-400 bg-blue-950/50",
  green:  "border-green-700 text-green-400 bg-green-950/50",
  orange: "border-orange-600 text-orange-400 bg-orange-950/50",
  yellow: "border-yellow-500 text-yellow-400 bg-yellow-950/50",
  purple: "border-purple-700 text-purple-400 bg-purple-950/50",
  pink:   "border-pink-700 text-pink-400 bg-pink-950/50",
  red:    "border-red-700 text-red-400 bg-red-950/50",
};

function useOrgSegments(): OrgSegment[] {
  const { organization } = useAuthStore();
  const custom = (organization?.settings as Record<string, unknown> | undefined)?.customer_segments;
  if (Array.isArray(custom) && custom.length > 0) return custom as OrgSegment[];
  return DEFAULT_SEGMENTS;
}

function segmentColor(seg: OrgSegment | undefined): string {
  return COLOR_CLASSES[seg?.color ?? "slate"] ?? COLOR_CLASSES.slate;
}

const CATEGORY_LABELS: Record<string, string> = {
  purchase: "Compra",
  service:  "Servicio",
  recharge: "Recarga",
  other:    "Otro",
};

function SegmentBadge({ segment, auto, segments }: { segment: string; auto: boolean; segments?: OrgSegment[] }) {
  const list = segments ?? DEFAULT_SEGMENTS;
  const def  = list.find(s => s.key === segment) ?? { key: segment, label: segment, color: "slate" as const, min_ltv: 0 };
  const isTop = list.indexOf(def) >= list.length - 2; // últimos dos = niveles altos
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${segmentColor(def)}`}
      title={auto ? "Segmento asignado automáticamente por valor de vida" : "Segmento asignado manualmente"}>
      {isTop ? <Star className="h-2.5 w-2.5" /> : null}
      {def.label}
    </span>
  );
}

// ─── Churn Risk Tooltip ───────────────────────────────────────────────────────

function ChurnRiskCell({ risk }: { risk: number | null }) {
  const r = risk ?? 0;
  const pct = (r * 100).toFixed(0);
  const color = r >= 0.7 ? "text-red-400" : r >= 0.4 ? "text-yellow-400" : "text-green-400";
  const level = r >= 0.7 ? "Alto" : r >= 0.4 ? "Medio" : "Bajo";
  const tooltip = `Riesgo de abandono: ${level} (${pct}%)\n\nPredicción de IA basada en actividad reciente,\nfrecuencia de compra y comportamiento histórico.\n\n• Verde  < 40% — cliente estable\n• Amarillo 40-70% — requiere atención\n• Rojo   > 70% — intervención urgente`;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${color}`} title={tooltip}>
      {pct}%
      <HelpCircle className="h-3 w-3 opacity-50 cursor-help" />
    </span>
  );
}

// ─── Churn breakdown ──────────────────────────────────────────────────────────

interface ChurnResult {
  churn_risk: number;
  retention_probability: number;
  risk_level: "low" | "medium" | "high";
  recommendation: string;
}

const RISK_LEVEL_ES: Record<string, string> = {
  low:    "Bajo",
  medium: "Medio",
  high:   "Alto",
};
const RISK_LEVEL_COLOR: Record<string, string> = {
  low:    "text-green-400",
  medium: "text-yellow-400",
  high:   "text-red-400",
};
const RISK_BAR_COLOR: Record<string, string> = {
  low:    "bg-green-500",
  medium: "bg-yellow-500",
  high:   "bg-red-500",
};

function ChurnBreakdown({ result }: { result: ChurnResult }) {
  const { churn_risk, retention_probability, risk_level, recommendation } = result;
  const riskPct = Math.round(churn_risk * 100);
  const retPct  = Math.round(retention_probability * 100);
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-3">
      {/* Bar + numbers */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-slate-700">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${RISK_BAR_COLOR[risk_level]}`}
            style={{ width: `${riskPct}%` }}
          />
        </div>
        <span className={`text-sm font-bold ${RISK_LEVEL_COLOR[risk_level]}`}>
          {riskPct}% riesgo
        </span>
        <span className={`text-xs font-semibold ${RISK_LEVEL_COLOR[risk_level]}`}>
          {RISK_LEVEL_ES[risk_level]}
        </span>
      </div>

      {/* Metric pills */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5">
          <TrendingDown className="h-3.5 w-3.5 text-red-400" />
          <span className="text-xs text-slate-400">Riesgo abandono:</span>
          <span className={`text-xs font-semibold ${RISK_LEVEL_COLOR[risk_level]}`}>{riskPct}%</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-green-400" />
          <span className="text-xs text-slate-400">Probabilidad retención:</span>
          <span className="text-xs font-semibold text-green-400">{retPct}%</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-orange-400" />
          <span className="text-xs text-slate-400">Modelo:</span>
          <span className="text-xs font-medium text-slate-300">IA Reglas v1</span>
        </div>
      </div>

      {/* Recommendation */}
      <div className="flex items-start gap-2 rounded-lg border border-orange-800/40 bg-orange-950/30 px-3 py-2.5">
        <Brain className="h-3.5 w-3.5 text-orange-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-orange-200">{recommendation}</p>
      </div>
    </div>
  );
}

// ─── Churn level badge (columna independiente, igual que SLA) ────────────────

const CHURN_LEVEL_CONFIG = {
  high:   {
    label: "Alto",
    hint:  "Contacto inmediato",
    dot:   "bg-red-500 animate-pulse",
    ring:  "border-red-800",
    text:  "text-red-400",
    bg:    "bg-red-950/60",
  },
  medium: {
    label: "Medio",
    hint:  "Atención requerida",
    dot:   "bg-yellow-400",
    ring:  "border-yellow-700",
    text:  "text-yellow-400",
    bg:    "bg-yellow-950/60",
  },
  low:    {
    label: "Bajo",
    hint:  "Cliente estable",
    dot:   "bg-green-400",
    ring:  "border-green-800",
    text:  "text-green-400",
    bg:    "bg-green-950/60",
  },
};

function ChurnLevelBadge({ risk }: { risk: number | null }) {
  const r = risk ?? 0;
  if (r === 0) return <span className="text-slate-600 text-xs">—</span>;

  const key = r >= 0.7 ? "high" : r >= 0.4 ? "medium" : "low";
  const { label, hint, dot, ring, text, bg } = CHURN_LEVEL_CONFIG[key];

  return (
    <div
      title={`Riesgo de abandono: ${Math.round(r * 100)}%\n${hint}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium cursor-help ${ring} ${bg} ${text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
      {label}
      <span className="opacity-70">· {hint}</span>
    </div>
  );
}

const selectCls = "rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 focus:border-orange-500 focus:outline-none";

const EMPTY_FORM = { name: "", email: "", phone: "", company: "", status: "active", address: "", notes: "" };

const statusVariant = (s: string): "default" | "success" | "warning" | "destructive" | "secondary" =>
  ({ active: "success", inactive: "secondary", churned: "destructive" } as Record<string, "default" | "success" | "warning" | "destructive" | "secondary">)[s] ?? "secondary";

const churnColor = (r: number) =>
  r >= 0.7 ? "text-red-400" : r >= 0.4 ? "text-yellow-400" : "text-green-400";

// ─── SLA por estado de cliente ────────────────────────────────────────────────
const CUSTOMER_SLA_HOURS: Record<string, number | null> = {
  active:   null, // cliente sano, sin deadline urgente
  inactive: 48,   // reactivar en 48 h
  churned:  24,   // intentar recuperación en 24 h
};

const CUSTOMER_SLA_LABEL: Record<string, string> = {
  inactive: "Reactivar en",
  churned:  "Recuperar en",
};

interface SLAInfo {
  light: "green" | "yellow" | "red";
  label: string;
  tooltip: string;
  hoursLeft: number;
}

function getCustomerSLA(c: Customer): SLAInfo | null {
  const slaHours = CUSTOMER_SLA_HOURS[c.status];
  if (slaHours == null) return null;

  const ref      = new Date(c.updated_at || c.created_at);
  const deadline = new Date(ref.getTime() + slaHours * 60 * 60 * 1000);
  const now      = new Date();
  const diffH    = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  const fmt = (h: number) => {
    if (h <= 0) {
      const a = Math.abs(h);
      return a < 1 ? `${Math.ceil(a * 60)} min vencido` : a < 24 ? `${Math.floor(a)}h vencido` : `${Math.floor(a / 24)}d vencido`;
    }
    if (h < 1)  return `${Math.ceil(h * 60)} min`;
    if (h < 24) return `${Math.floor(h)}h ${Math.round((h % 1) * 60)}min`;
    const d = Math.floor(h / 24); const r = Math.floor(h % 24);
    return r > 0 ? `${d}d ${r}h` : `${d}d`;
  };

  const deadlineStr = deadline.toLocaleString("es-GT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const action = CUSTOMER_SLA_LABEL[c.status] ?? "Actuar en";

  return {
    light:    diffH < 0 ? "red" : diffH <= 3 ? "yellow" : "green",
    label:    fmt(diffH),
    tooltip:  `${action} ${slaHours}h · Vence: ${deadlineStr}`,
    hoursLeft: diffH,
  };
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso); const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
  if (diffH < 1)  return `hace ${Math.round(diffH * 60)} min`;
  if (diffH < 24) return `hace ${Math.floor(diffH)}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)  return `hace ${diffD}d`;
  return d.toLocaleDateString("es-GT", { day: "numeric", month: "short", year: diffD > 365 ? "numeric" : undefined });
}

function CustomerSLABadge({ customer }: { customer: Customer }) {
  const sla = getCustomerSLA(customer);
  if (!sla) return <span className="text-slate-600 text-xs">—</span>;

  const colors = {
    green:  { dot: "bg-green-400",  ring: "border-green-800",  text: "text-green-400",  bg: "bg-green-950/60"  },
    yellow: { dot: "bg-yellow-400", ring: "border-yellow-700", text: "text-yellow-400", bg: "bg-yellow-950/60" },
    red:    { dot: "bg-red-500",    ring: "border-red-800",    text: "text-red-400",    bg: "bg-red-950/60"    },
  }[sla.light];

  return (
    <div title={sla.tooltip}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium cursor-help ${colors.ring} ${colors.bg} ${colors.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${colors.dot} ${sla.light === "red" ? "animate-pulse" : ""}`} />
      {sla.label}
      {sla.light === "red"
        ? <AlertTriangle className="h-3 w-3" />
        : <Info className="h-3 w-3 opacity-70" />
      }
    </div>
  );
}

// ─── Consumption analysis helpers ────────────────────────────────────────────

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const CATEGORY_COLORS: Record<string, string> = {
  purchase: "bg-orange-500",
  service:  "bg-blue-500",
  recharge: "bg-green-500",
  other:    "bg-slate-500",
};

function PeriodPicker({
  label, month, year, onMonthChange, onYearChange, accent,
}: {
  label: string; month: number; year: number;
  onMonthChange: (m: number) => void; onYearChange: (y: number) => void;
  accent?: boolean;
}) {
  const curYear = new Date().getFullYear();
  const years   = Array.from({ length: curYear - 2022 }, (_, i) => 2023 + i);
  const cls     = "appearance-none bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-orange-500 cursor-pointer";
  return (
    <div className="flex flex-col gap-1">
      <span className={`text-[10px] uppercase tracking-widest font-semibold ${accent ? "text-orange-500" : "text-slate-500"}`}>{label}</span>
      <div className="flex gap-1.5">
        <select value={month} onChange={e => onMonthChange(Number(e.target.value))} className={cls}>
          {MONTHS_ES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => onYearChange(Number(e.target.value))} className={cls}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

function ConsumptionAnalysis({ data }: { data: ConsumptionSummaryComparison }) {
  const { current, compare, delta_pct, trend } = data;
  const trendColor = trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-slate-400";
  const TrendIcon  = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : ArrowLeftRight;
  const maxCat     = Math.max(...Object.values(current.by_category), ...Object.values(compare.by_category), 1);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-2.5">
          <p className="text-[10px] text-slate-500 mb-0.5">{current.label}</p>
          <p className="text-sm font-bold text-slate-100">{formatCurrency(current.total)}</p>
          <p className="text-[10px] text-slate-500">{current.count} registros</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-2.5">
          <p className="text-[10px] text-slate-500 mb-0.5">{compare.label}</p>
          <p className="text-sm font-bold text-slate-400">{formatCurrency(compare.total)}</p>
          <p className="text-[10px] text-slate-500">{compare.count} registros</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 flex flex-col items-center justify-center">
          <TrendIcon className={`h-4 w-4 mb-0.5 ${trendColor}`} />
          <p className={`text-sm font-bold ${trendColor}`}>
            {delta_pct !== null ? `${delta_pct > 0 ? "+" : ""}${delta_pct}%` : "—"}
          </p>
          <p className="text-[10px] text-slate-500">variación</p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Por categoría</p>
        {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
          const curVal = current.by_category[cat] ?? 0;
          const cmpVal = compare.by_category[cat] ?? 0;
          if (curVal === 0 && cmpVal === 0) return null;
          return (
            <div key={cat} className="space-y-0.5">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{label}</span>
                <span className="text-slate-300 font-medium">{formatCurrency(curVal)}</span>
              </div>
              <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-slate-800">
                <div
                  className={`${CATEGORY_COLORS[cat]} rounded-full transition-all`}
                  style={{ width: `${(curVal / maxCat) * 100}%` }}
                />
              </div>
              {cmpVal > 0 && (
                <div className="flex gap-1 h-1 rounded-full overflow-hidden bg-slate-800/50">
                  <div
                    className={`${CATEGORY_COLORS[cat]} opacity-40 rounded-full`}
                    style={{ width: `${(cmpVal / maxCat) * 100}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
        <p className="text-[10px] text-slate-600 pt-0.5">Barra oscura = período comparado</p>
      </div>
    </div>
  );
}

// ─── Panel lateral ────────────────────────────────────────────────────────────

type PanelTab = "info" | "consumo";

function CustomerPanel({
  customer, onClose, onSave, onDelete, isSaving, isDeleting,
}: {
  customer: Customer;
  onClose: () => void;
  onSave: (data: Partial<Customer>) => void;
  onDelete: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  const { tokens, organization } = useAuthStore();
  const queryClient = useQueryClient();
  const segments = useOrgSegments();
  const [activeTab, setActiveTab]   = useState<PanelTab>("info");
  const [editing, setEditing]       = useState(false);
  const [form, setForm] = useState({
    name:    customer.name    ?? "",
    email:   customer.email   ?? "",
    phone:   customer.phone   ?? "",
    company: customer.company ?? "",
    status:  customer.status  ?? "active",
    address: customer.address ?? "",
    notes:   customer.notes   ?? "",
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ── Consumption state ──────────────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [newRecord, setNewRecord] = useState({ amount: "", date: new Date().toISOString().slice(0, 10), description: "", category: "purchase", reference: "" });
  const [showAddRecord, setShowAddRecord] = useState(false);

  // ── Consumption analysis (period comparison) ───────────────────────────────
  const nowD = new Date();
  const [anaMonth,    setAnaMonth]    = useState(nowD.getMonth() + 1);
  const [anaYear,     setAnaYear]     = useState(nowD.getFullYear());
  const [anaCmpMonth, setAnaCmpMonth] = useState(nowD.getMonth() > 0 ? nowD.getMonth() : 12);
  const [anaCmpYear,  setAnaCmpYear]  = useState(nowD.getMonth() > 0 ? nowD.getFullYear() : nowD.getFullYear() - 1);

  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: ["consumption-summary", customer.id, anaYear, anaMonth, anaCmpYear, anaCmpMonth],
    queryFn:  () => crmApi.getConsumptionSummary(tokens!.access, organization!.id, customer.id, anaYear, anaMonth, anaCmpYear, anaCmpMonth),
    enabled:  activeTab === "consumo" && !!tokens && !!organization,
  });

  const { data: consumptionData, isLoading: loadingConsumption } = useQuery({
    queryKey: ["consumption", customer.id, dateFrom, dateTo],
    queryFn:  () => crmApi.getConsumption(tokens!.access, organization!.id, customer.id, { date_from: dateFrom || undefined, date_to: dateTo || undefined }),
    enabled:  activeTab === "consumo" && !!tokens && !!organization,
  });

  const addRecordMutation = useMutation({
    mutationFn: (data: Partial<ConsumptionRecord>) => crmApi.addConsumption(tokens!.access, organization!.id, customer.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consumption", customer.id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setNewRecord({ amount: "", date: new Date().toISOString().slice(0, 10), description: "", category: "purchase", reference: "" });
      setShowAddRecord(false);
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (recordId: string) => crmApi.deleteConsumption(tokens!.access, organization!.id, customer.id, recordId),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ["consumption", customer.id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const segmentMutation = useMutation({
    mutationFn: (segment: string) => crmApi.updateSegment(tokens!.access, organization!.id, customer.id, segment as CustomerSegment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });

  const field = (key: keyof typeof form, placeholder = "") => (
    <Input value={form[key]} placeholder={placeholder}
      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
      disabled={!editing} className="h-8 text-sm disabled:opacity-70 disabled:cursor-default" />
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex h-full w-full sm:max-w-md flex-col bg-slate-950 border-l border-slate-800 shadow-2xl overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-100">{customer.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-slate-500">{customer.company || "Sin empresa"}</p>
              <SegmentBadge segment={customer.segment} auto={customer.segment_auto} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "info" && !editing && (
              <Button size="sm" variant="outline" className="gap-1.5 border-slate-700 text-slate-300 hover:border-orange-500 hover:text-orange-400"
                onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            )}
            {activeTab === "info" && editing && (
              <>
                <Button size="sm" variant="outline" className="border-slate-700 text-slate-400"
                  onClick={() => setEditing(false)}>Cancelar</Button>
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

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          {(["info", "consumo"] as PanelTab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${activeTab === tab ? "border-b-2 border-orange-500 text-orange-400" : "text-slate-500 hover:text-slate-300"}`}>
              {tab === "info" ? "Información" : "Historial de Consumos"}
            </button>
          ))}
        </div>

        {/* Registro + SLA */}
        {activeTab === "info" && (
          <div className="flex items-center gap-3 flex-wrap border-b border-slate-800 px-5 py-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-400 cursor-help" title={new Date(customer.created_at).toLocaleString("es-GT")}>
              <Clock className="h-3.5 w-3.5" /> Registro: <span className="text-slate-200">{formatRelativeDate(customer.created_at)}</span>
              <Info className="h-3 w-3 opacity-60" />
            </span>
            <CustomerSLABadge customer={customer} />
          </div>
        )}

        {/* ── TAB: Info ──────────────────────────────────────────────────────── */}
        {activeTab === "info" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 border-b border-slate-800 px-5 py-4">
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                <p className="text-xs text-slate-500">Valor de vida</p>
                <p className="mt-0.5 font-bold text-slate-100">{formatCurrency(parseFloat(customer.lifetime_value))}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                <p className="text-xs text-slate-500">Riesgo abandono</p>
                <p className={`mt-0.5 font-bold ${churnColor(customer.churn_risk ?? 0)}`}>
                  {((customer.churn_risk ?? 0) * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Segment selector */}
            <div className="border-b border-slate-800 px-5 py-3">
              <p className="mb-2 text-xs font-medium text-slate-500">Segmento de cliente</p>
              <div className="flex flex-wrap gap-1.5">
                {segments.map((s) => (
                  <button key={s.key} onClick={() => segmentMutation.mutate(s.key)}
                    disabled={segmentMutation.isPending}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      customer.segment === s.key ? segmentColor(s) + " ring-1 ring-current" : "border-slate-700 text-slate-500 hover:border-slate-500"
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
              {customer.segment_auto && (
                <p className="mt-1.5 text-xs text-slate-600">Auto-asignado por valor de vida</p>
              )}
            </div>

            {/* Campos */}
            <div className="flex-1 space-y-4 p-5">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <User className="h-3 w-3" /> Nombre
                </label>
                {field("name")}
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
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Building2 className="h-3 w-3" /> Empresa
                </label>
                {field("company")}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Estado</label>
                <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  disabled={!editing}
                  className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200 disabled:opacity-70 disabled:cursor-default">
                  {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <MapPin className="h-3 w-3" /> Dirección
                </label>
                {field("address")}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  disabled={!editing} rows={4} placeholder="Notas internas..."
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 disabled:opacity-70 disabled:cursor-default resize-none" />
              </div>

              {/* Google Drive documents */}
              <DriveDocumentsPanel entityType="customer" entityId={customer.id} />
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800 px-5 py-4">
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-2 text-xs text-red-500 hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar cliente
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
          </>
        )}

        {/* ── TAB: Consumos ──────────────────────────────────────────────────── */}
        {activeTab === "consumo" && (
          <div className="flex-1 p-5 space-y-4">

            {/* ── Análisis comparativo de períodos ── */}
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3 space-y-3">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-orange-400" />
                <p className="text-xs font-semibold text-slate-200">Análisis por período</p>
              </div>
              <div className="flex items-end gap-2 flex-wrap">
                <PeriodPicker
                  label="Período"
                  month={anaMonth} year={anaYear}
                  onMonthChange={setAnaMonth} onYearChange={setAnaYear}
                  accent
                />
                <span className="text-slate-600 pb-2 text-xs font-bold">vs</span>
                <PeriodPicker
                  label="Comparar con"
                  month={anaCmpMonth} year={anaCmpYear}
                  onMonthChange={setAnaCmpMonth} onYearChange={setAnaCmpYear}
                />
              </div>
              {loadingSummary ? (
                <div className="h-20 rounded-lg bg-slate-800 animate-pulse" />
              ) : summaryData ? (
                <ConsumptionAnalysis data={summaryData} />
              ) : null}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                <p className="text-xs text-slate-500">Total consumido</p>
                <p className="mt-0.5 font-bold text-slate-100">
                  {loadingConsumption ? "..." : formatCurrency(consumptionData?.total ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                <p className="text-xs text-slate-500">Transacciones</p>
                <p className="mt-0.5 font-bold text-slate-100">
                  {loadingConsumption ? "..." : consumptionData?.count ?? 0}
                </p>
              </div>
            </div>

            {/* Date filter */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-slate-500">Desde</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200" />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-slate-500">Hasta</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200" />
              </div>
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className="mt-5 text-slate-500 hover:text-red-400">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Add record */}
            <div>
              <button onClick={() => setShowAddRecord(!showAddRecord)}
                className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Registrar consumo
              </button>
              {showAddRecord && (
                <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900 p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Monto *</label>
                      <Input type="number" step="0.01" placeholder="0.00" value={newRecord.amount}
                        onChange={(e) => setNewRecord(p => ({ ...p, amount: e.target.value }))}
                        className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Fecha *</label>
                      <input type="date" value={newRecord.date}
                        onChange={(e) => setNewRecord(p => ({ ...p, date: e.target.value }))}
                        className="h-8 w-full rounded-md border border-slate-700 bg-slate-800 px-2 text-xs text-slate-200" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Categoría</label>
                    <select value={newRecord.category} onChange={(e) => setNewRecord(p => ({ ...p, category: e.target.value }))}
                      className="h-8 w-full rounded-md border border-slate-700 bg-slate-800 px-2 text-xs text-slate-200">
                      {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <Input placeholder="Descripción" value={newRecord.description}
                    onChange={(e) => setNewRecord(p => ({ ...p, description: e.target.value }))}
                    className="h-8 text-sm" />
                  <Input placeholder="# Referencia / factura" value={newRecord.reference}
                    onChange={(e) => setNewRecord(p => ({ ...p, reference: e.target.value }))}
                    className="h-8 text-sm" />
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-500 text-white"
                      disabled={!newRecord.amount || addRecordMutation.isPending}
                      onClick={() => addRecordMutation.mutate({
                        amount: newRecord.amount, date: newRecord.date,
                        description: newRecord.description, category: newRecord.category as ConsumptionRecord["category"],
                        reference: newRecord.reference,
                      })}>
                      {addRecordMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Guardar"}
                    </Button>
                    <Button size="sm" variant="outline" className="border-slate-700 text-slate-400"
                      onClick={() => setShowAddRecord(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Records list */}
            {loadingConsumption ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 rounded-lg bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : (consumptionData?.records ?? []).length === 0 ? (
              <div className="py-10 text-center">
                <Receipt className="mx-auto h-8 w-8 text-slate-700 mb-2" />
                <p className="text-sm text-slate-500">Sin registros de consumo</p>
              </div>
            ) : (
              <div className="space-y-2">
                {consumptionData!.records.map((rec) => (
                  <div key={rec.id} className="flex items-start justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-100">{formatCurrency(parseFloat(rec.amount))}</span>
                        <span className="rounded-full border border-slate-700 px-1.5 py-0.5 text-xs text-slate-500">
                          {CATEGORY_LABELS[rec.category]}
                        </span>
                      </div>
                      {rec.description && <p className="text-xs text-slate-400 truncate mt-0.5">{rec.description}</p>}
                      <p className="text-xs text-slate-600 mt-0.5">
                        {new Date(rec.date).toLocaleDateString("es-GT")}
                        {rec.reference && ` · ${rec.reference}`}
                      </p>
                    </div>
                    <button onClick={() => deleteRecordMutation.mutate(rec.id)}
                      className="ml-2 shrink-0 text-slate-700 hover:text-red-400 transition-colors">
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Production tab ───────────────────────────────────────────────────────────

type SortKey   = "total" | "share_pct" | "name" | "count";
type SortDir   = "asc" | "desc";

function ProductionTab({ onOpenCustomer }: { onOpenCustomer: (id: string) => void }) {
  const { tokens, organization } = useAuthStore();
  const segments = useOrgSegments();
  const nowD     = new Date();

  const [prodMonth, setProdMonth] = useState(nowD.getMonth() + 1);
  const [prodYear,  setProdYear]  = useState(nowD.getFullYear());
  const [sortKey,   setSortKey]   = useState<SortKey>("total");
  const [sortDir,   setSortDir]   = useState<SortDir>("desc");

  const { data, isLoading } = useQuery({
    queryKey: ["production-summary", prodYear, prodMonth],
    queryFn:  () => crmApi.getProductionSummary(tokens!.access, organization!.id, prodYear, prodMonth),
    enabled:  !!tokens && !!organization,
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const sorted = [...(data?.customers ?? [])].sort((a, b) => {
    const mult = sortDir === "desc" ? -1 : 1;
    if (sortKey === "name") return mult * a.name.localeCompare(b.name);
    return mult * (a[sortKey] - b[sortKey]);
  });

  const maxShare = Math.max(...(data?.customers ?? []).map(c => c.share_pct), 1);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 text-slate-600" />;
    return sortDir === "desc"
      ? <ArrowDown className="h-3 w-3 text-orange-400" />
      : <ArrowUp className="h-3 w-3 text-orange-400" />;
  }

  const thCls = "px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors";

  return (
    <div className="space-y-5">
      {/* Period picker */}
      <div className="flex items-end gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
        <Activity className="h-4 w-4 text-orange-400 mb-2 flex-shrink-0" />
        <PeriodPicker
          label="Período de análisis"
          month={prodMonth} year={prodYear}
          onMonthChange={setProdMonth} onYearChange={setProdYear}
          accent
        />
        {data && (
          <div className="ml-auto text-right hidden sm:block">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold">Analizando</p>
            <p className="text-sm font-bold text-slate-200">{data.period_label}</p>
          </div>
        )}
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-slate-900 animate-pulse" />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs text-slate-500 mb-1">Total cartera</p>
            <p className="text-xl font-bold text-slate-100">{formatCurrency(data.total)}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{data.period_label}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs text-slate-500 mb-1">Clientes activos</p>
            <p className="text-xl font-bold text-slate-100">{data.customer_count}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">con consumo en el período</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs text-slate-500 mb-1">Promedio</p>
            <p className="text-xl font-bold text-slate-100">{formatCurrency(data.avg_per_client)}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">por cliente</p>
          </div>
        </div>
      ) : null}

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
        {isLoading ? (
          <div className="space-y-px">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-slate-900 animate-pulse" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center">
            <BarChart3 className="mx-auto h-8 w-8 text-slate-700 mb-2" />
            <p className="text-sm text-slate-500">Sin registros de consumo para {data?.period_label ?? "este período"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/60">
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 w-8">#</th>
                  <th className={thCls} onClick={() => toggleSort("name")}>
                    <span className="flex items-center gap-1">Cliente <SortIcon col="name" /></span>
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Segmento</th>
                  <th className={thCls} onClick={() => toggleSort("total")}>
                    <span className="flex items-center gap-1">Producción <SortIcon col="total" /></span>
                  </th>
                  <th className={thCls} onClick={() => toggleSort("count")}>
                    <span className="flex items-center gap-1">Transacciones <SortIcon col="count" /></span>
                  </th>
                  <th className={thCls} onClick={() => toggleSort("share_pct")}>
                    <span className="flex items-center gap-1">% del total <SortIcon col="share_pct" /></span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sorted.map((row, idx) => {
                  const seg  = segments.find(s => s.key === row.segment);
                  const barW = Math.max((row.share_pct / maxShare) * 100, 1);
                  return (
                    <tr key={row.id} className="hover:bg-slate-900/40 transition-colors">
                      {/* Rank */}
                      <td className="px-3 py-3 text-xs text-slate-600 font-mono">{idx + 1}</td>
                      {/* Cliente */}
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => onOpenCustomer(row.id)}
                          className="text-left group"
                          title="Ver detalles del cliente"
                        >
                          <p className="font-medium text-slate-200 group-hover:text-orange-400 transition-colors leading-tight underline-offset-2 group-hover:underline">
                            {row.name}
                          </p>
                          {row.company && (
                            <p className="text-[11px] text-slate-500 truncate max-w-[140px]">{row.company}</p>
                          )}
                        </button>
                      </td>
                      {/* Segmento */}
                      <td className="px-3 py-3">
                        {seg ? (
                          <SegmentBadge segment={row.segment} auto={false} segments={segments} />
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      {/* Producción */}
                      <td className="px-3 py-3">
                        <span className="font-semibold text-slate-100">{formatCurrency(row.total)}</span>
                      </td>
                      {/* # registros */}
                      <td className="px-3 py-3 text-slate-400 text-xs">{row.count}</td>
                      {/* % share con barra */}
                      <td className="px-3 py-3 min-w-[130px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-1.5 rounded-full bg-orange-500 transition-all duration-300"
                              style={{ width: `${barW}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold tabular-nums ${
                            row.share_pct >= 20 ? "text-orange-400" :
                            row.share_pct >= 10 ? "text-yellow-400" : "text-slate-400"
                          }`}>
                            {row.share_pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Total row */}
              {data && (
                <tfoot className="border-t border-slate-700 bg-slate-900/60">
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-xs font-semibold text-slate-400">
                      Total — {data.customer_count} clientes
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-100">{formatCurrency(data.total)}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs" title="Total de transacciones en el período">
                      {data.customers.reduce((s, c) => s + c.count, 0)}
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-slate-400">100%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageTab = "lista" | "segmentacion" | "produccion";

export default function CustomersPage() {
  const { tokens, organization, setOrganization } = useAuthStore();
  const queryClient = useQueryClient();
  const segments = useOrgSegments();
  const [pageTab, setPageTab]           = useState<PageTab>("lista");
  const [showForm, setShowForm]         = useState(false);
  const [showImport, setShowImport]     = useState(false);
  const [importFile, setImportFile]     = useState<File | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [selected, setSelected]           = useState<Customer | null>(null);
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("");
  const [segmentFilter, setSegmentFilter] = useState("");
  const [churnResults, setChurnResults]   = useState<Record<string, ChurnResult>>({});

  // ── Segment editor state ──────────────────────────────────────────────────
  const [segmentsForm, setSegmentsForm] = useState<OrgSegment[]>(
    (organization?.settings?.customer_segments as OrgSegment[]) ?? DEFAULT_SEGMENTS
  );
  const [segmentsMsg, setSegmentsMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const saveSegmentsMutation = useMutation({
    mutationFn: (segs: OrgSegment[]) =>
      organizationApi.update(tokens!.access, organization!.id, {
        settings: { ...(organization?.settings ?? {}), customer_segments: segs },
      }),
    onSuccess: (updated) => {
      setOrganization({ ...organization!, ...updated });
      setSegmentsMsg({ type: "ok", text: "Segmentación guardada correctamente." });
      setTimeout(() => setSegmentsMsg(null), 4000);
    },
    onError: (e: Error) => setSegmentsMsg({ type: "err", text: e.message }),
  });

  const hasFilters = !!(search || statusFilter || segmentFilter);
  const clearFilters = () => { setSearch(""); setStatusFilter(""); setSegmentFilter(""); };

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search, statusFilter, segmentFilter],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (search)        qs.set("search",   search);
      if (statusFilter)  qs.set("status",   statusFilter);
      if (segmentFilter) qs.set("segment",  segmentFilter);
      const q = qs.toString();
      return crmApi.getCustomers(tokens!.access, organization!.id, q || undefined);
    },
    enabled: !!tokens && !!organization,
  });

  const createMutation = useMutation({
    mutationFn: (d: Partial<Customer>) => crmApi.createCustomer(tokens!.access, organization!.id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["customers"] }); setShowForm(false); setForm(EMPTY_FORM); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      crmApi.updateCustomer(tokens!.access, organization!.id, id, data),
    onSuccess: (updated) => { queryClient.invalidateQueries({ queryKey: ["customers"] }); setSelected(updated); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteCustomer(tokens!.access, organization!.id, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["customers"] }); setSelected(null); },
  });

  const churnMutation = useMutation({
    mutationFn: (id: string) => aiApi.predictChurn(tokens!.access, organization!.id, id),
    onSuccess: (result, id) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setChurnResults((prev) => ({ ...prev, [id]: result as unknown as ChurnResult }));
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => csvApi.importCustomers(tokens!.access, organization!.id, file),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setImportResult(`${res.imported} clientes importados correctamente.`);
      setImportFile(null);
    },
    onError: (err: Error) => setImportResult(`Error: ${err.message}`),
  });

  const columns: ColumnDef<Customer, unknown>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ getValue, row }) => (
        <button type="button" onClick={() => setSelected(row.original)}
          className="font-medium text-slate-200 hover:text-orange-400 transition-colors text-left">
          {getValue() as string}
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
      cell: ({ getValue }) => (
        <Badge variant={statusVariant(getValue() as string)}>
          {STATUS_LABELS[getValue() as string] ?? getValue() as string}
        </Badge>
      ),
    },
    {
      accessorKey: "segment",
      header: "Segmento",
      cell: ({ row }) => <SegmentBadge segment={row.original.segment} auto={row.original.segment_auto} segments={segments} />,
    },
    {
      accessorKey: "created_at",
      header: "Registro",
      cell: ({ getValue }) => (
        <span className="flex items-center gap-1 text-xs text-slate-400 cursor-help" title={new Date(getValue() as string).toLocaleString("es-GT")}>
          <Clock className="h-3 w-3 shrink-0" />
          {formatRelativeDate(getValue() as string)}
          <Info className="h-3 w-3 opacity-60" />
        </span>
      ),
    },
    {
      id: "sla",
      header: "Atención (SLA)",
      enableSorting: false,
      cell: ({ row }) => <CustomerSLABadge customer={row.original} />,
    },
    {
      id: "churn_level",
      header: "Riesgo abandono",
      enableSorting: false,
      cell: ({ row }) => <ChurnLevelBadge risk={row.original.churn_risk} />,
    },
    {
      accessorKey: "lifetime_value",
      header: "Valor de vida",
      cell: ({ getValue }) => <span className="font-medium text-slate-200">{formatCurrency(parseFloat(getValue() as string))}</span>,
    },
    {
      accessorKey: "churn_risk",
      header: () => (
        <span className="inline-flex items-center gap-1">
          % Abandono
          <HelpCircle className="h-3.5 w-3.5 text-slate-500" title="Probabilidad exacta de abandono calculada por IA. Haz clic en el % para ver el análisis completo." />
        </span>
      ),
      cell: ({ getValue, row }) => {
        const hasBreakdown = !!churnResults[row.original.id];
        const isExpanded   = row.getIsExpanded();
        return (
          <button
            type="button"
            onClick={() => hasBreakdown && row.toggleExpanded()}
            className={`inline-flex items-center gap-1 ${hasBreakdown ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
          >
            <ChurnRiskCell risk={getValue() as number} />
            {hasBreakdown && (isExpanded
              ? <ChevronUp className="h-3 w-3 text-slate-400" />
              : <ChevronDown className="h-3 w-3 text-slate-400" />
            )}
          </button>
        );
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const isPredicting = churnMutation.isPending && churnMutation.variables === row.original.id;
        const hasBreakdown = !!churnResults[row.original.id];
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" title="Predecir abandono con IA"
              onClick={() => {
                churnMutation.mutate(row.original.id);
                if (hasBreakdown) row.toggleExpanded();
              }}
              disabled={isPredicting}
              className="gap-1 text-xs text-slate-400 hover:text-white px-2">
              {isPredicting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
              {isPredicting ? "..." : hasBreakdown ? "Re-analizar" : "Analizar"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(row.original)}
              className="px-2 text-slate-400 hover:text-orange-400">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(row.original)}
              className="px-2 text-slate-400 hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  // ── Segment color options (shared with settings) ──────────────────────────
  const SEGMENT_COLOR_OPTIONS = [
    { value: "slate",  label: "Gris",     dot: "bg-slate-500" },
    { value: "blue",   label: "Azul",     dot: "bg-blue-500" },
    { value: "green",  label: "Verde",    dot: "bg-green-500" },
    { value: "orange", label: "Naranja",  dot: "bg-orange-500" },
    { value: "yellow", label: "Amarillo", dot: "bg-yellow-400" },
    { value: "purple", label: "Morado",   dot: "bg-purple-500" },
    { value: "pink",   label: "Rosa",     dot: "bg-pink-500" },
    { value: "red",    label: "Rojo",     dot: "bg-red-500" },
  ];

  return (
    <>
      <DashboardHeader title="Clientes" />

      {/* ── Page tabs ── */}
      <div className="flex border-b border-slate-800 bg-slate-950 px-4 sm:px-6">
        {([
          { id: "lista",        label: "Clientes",    icon: <Users className="h-4 w-4" /> },
          { id: "produccion",   label: "Producción",  icon: <BarChart3 className="h-4 w-4" /> },
          { id: "segmentacion", label: "Segmentación", icon: <Layers className="h-4 w-4" /> },
        ] as { id: PageTab; label: string; icon: React.ReactNode }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setPageTab(t.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              pageTab === t.id
                ? "border-orange-500 text-orange-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">

        {/* ── PRODUCCIÓN TAB ── */}
        {pageTab === "produccion" && (
          <ProductionTab onOpenCustomer={async (id) => {
            setPageTab("lista");
            try {
              const customer = await crmApi.getCustomer(tokens!.access, organization!.id, id);
              setSelected(customer);
            } catch { /* silently ignore — panel simply won't open */ }
          }} />
        )}

        {/* ── SEGMENTACIÓN TAB ── */}
        {pageTab === "segmentacion" && (
          <div className="mx-auto max-w-2xl space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
              <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Segmentación de clientes</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define los niveles de tu base de clientes según tu industria
                  </p>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Alert */}
                {segmentsMsg && (
                  <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
                    segmentsMsg.type === "ok"
                      ? "border-green-800/50 bg-green-950/40 text-green-300"
                      : "border-red-800/50 bg-red-950/40 text-red-300"
                  }`}>
                    {segmentsMsg.type === "ok"
                      ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                      : <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />}
                    {segmentsMsg.text}
                  </div>
                )}

                {/* Column headers */}
                <div className="grid grid-cols-12 gap-2 px-1">
                  <span className="col-span-3 text-xs text-slate-500">Clave</span>
                  <span className="col-span-3 text-xs text-slate-500">Etiqueta</span>
                  <span className="col-span-3 text-xs text-slate-500">Color</span>
                  <span className="col-span-2 text-xs text-slate-500">LTV mín. (Q)</span>
                  <span className="col-span-1" />
                </div>

                {/* Segment rows */}
                {segmentsForm.map((seg, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                    {/* Key */}
                    <div className="col-span-3">
                      <input
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                        placeholder="ej. vip"
                        value={seg.key}
                        onChange={(e) => setSegmentsForm((prev) =>
                          prev.map((s, i) => i === idx ? { ...s, key: e.target.value.toLowerCase().replace(/\s+/g, "_") } : s)
                        )}
                      />
                    </div>
                    {/* Label */}
                    <div className="col-span-3">
                      <input
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        placeholder="ej. VIP"
                        value={seg.label}
                        onChange={(e) => setSegmentsForm((prev) =>
                          prev.map((s, i) => i === idx ? { ...s, label: e.target.value } : s)
                        )}
                      />
                    </div>
                    {/* Color dots */}
                    <div className="col-span-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {SEGMENT_COLOR_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            title={opt.label}
                            onClick={() => setSegmentsForm((prev) =>
                              prev.map((s, i) => i === idx ? { ...s, color: opt.value as OrgSegment["color"] } : s)
                            )}
                            className={`h-5 w-5 rounded-full transition-all ${opt.dot} ${
                              seg.color === opt.value
                                ? "ring-2 ring-white ring-offset-1 ring-offset-slate-900 scale-110"
                                : "opacity-50 hover:opacity-90"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {SEGMENT_COLOR_OPTIONS.find(o => o.value === seg.color)?.label ?? seg.color}
                      </p>
                    </div>
                    {/* Min LTV */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        value={seg.min_ltv}
                        onChange={(e) => setSegmentsForm((prev) =>
                          prev.map((s, i) => i === idx ? { ...s, min_ltv: Number(e.target.value) } : s)
                        )}
                      />
                    </div>
                    {/* Delete */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setSegmentsForm((prev) => prev.filter((_, i) => i !== idx))}
                        className="rounded p-1.5 text-slate-500 hover:bg-red-950/30 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add row */}
                <button
                  type="button"
                  onClick={() => setSegmentsForm((prev) => [
                    ...prev,
                    { key: "", label: "", color: "slate" as OrgSegment["color"], min_ltv: 0 },
                  ])}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-700 py-2.5 text-xs text-slate-400 hover:border-orange-600/50 hover:text-orange-400 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Añadir segmento
                </button>

                {/* Info */}
                <p className="text-xs text-slate-500 leading-relaxed">
                  El campo <code className="rounded bg-slate-800 px-1 text-slate-300">LTV mín.</code> es el valor de vida mínimo
                  para asignar este segmento automáticamente. Los segmentos se evalúan de mayor a menor LTV.
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setSegmentsForm(DEFAULT_SEGMENTS)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restaurar predeterminados
                  </button>
                  <Button
                    className="bg-orange-600 hover:bg-orange-500 text-white"
                    onClick={() => saveSegmentsMutation.mutate(segmentsForm)}
                    disabled={saveSegmentsMutation.isPending || segmentsForm.some(s => !s.key || !s.label)}
                  >
                    {saveSegmentsMutation.isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Guardando…</>
                      : "Guardar segmentación"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
              <div className="border-b border-slate-800 px-6 py-4">
                <h3 className="text-sm font-semibold text-slate-100">Vista previa</h3>
                <p className="text-xs text-slate-500 mt-0.5">Así lucirán los badges en la tabla de clientes</p>
              </div>
              <div className="flex flex-wrap gap-2 px-6 py-4">
                {segmentsForm.filter(s => s.key && s.label).map((s) => (
                  <SegmentBadge key={s.key} segment={s.key} auto={true} segments={segmentsForm} />
                ))}
                {segmentsForm.filter(s => s.key && s.label).length === 0 && (
                  <p className="text-xs text-slate-600">Añade segmentos para ver la vista previa</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── LISTA TAB ── */}
        {pageTab === "lista" && (
        <>
        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9 w-full sm:w-52" placeholder="Buscar clientes..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Filter className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
              <option value="">Todos los estados</option>
              {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={segmentFilter} onChange={(e) => setSegmentFilter(e.target.value)} className={selectCls}>
              <option value="">Todos los segmentos</option>
              {segments.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
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
            <Button variant="outline" onClick={() => csvApi.exportCustomers(tokens!.access, organization!.id)}
              className="gap-2 border-slate-700 text-slate-300 hover:border-orange-600 hover:bg-orange-600 hover:text-white">
              <Download className="h-4 w-4" /><span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button onClick={() => { setShowForm(!showForm); setShowImport(false); }}
              className="gap-2 bg-orange-600 hover:bg-orange-500 text-white">
              <Plus className="h-4 w-4" /> Añadir Cliente
            </Button>
          </div>
        </div>

        {/* Import panel */}
        {showImport && (
          <Card className="mb-6 bg-slate-950">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Importar clientes desde CSV</p>
                  <p className="text-xs text-slate-500 mt-0.5">Columnas: name, email, phone, company, status</p>
                </div>
                <button onClick={() => { setShowImport(false); setImportResult(null); setImportFile(null); }} className="text-slate-500 hover:text-slate-300">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <input type="file" accept=".csv"
                  onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportResult(null); }}
                  className="flex-1 text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-300 hover:file:bg-slate-700" />
                <Button onClick={() => importFile && importMutation.mutate(importFile)}
                  disabled={!importFile || importMutation.isPending} className="bg-orange-600 hover:bg-orange-500 text-white">
                  {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Importar"}
                </Button>
              </div>
              {importResult && (
                <p className={`mt-3 text-xs ${importResult.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>{importResult}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create form */}
        {showForm && (
          <Card className="mb-6 bg-slate-950">
            <CardContent className="pt-6">
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input placeholder="Nombre *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input placeholder="Empresa" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200">
                  {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="bg-orange-600 hover:bg-orange-500 text-white" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Crear Cliente"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="border-slate-700 text-slate-300"
                    onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>
                    Cancelar
                  </Button>
                </div>
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
            <p className="py-10 text-center text-sm text-slate-500">No hay clientes aún.</p>
          ) : (
            (data?.results ?? []).map((customer) => (
              <button key={customer.id} type="button" onClick={() => setSelected(customer)}
                className="w-full text-left rounded-xl border border-slate-800 bg-slate-950 p-4 hover:border-orange-500/40 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="font-semibold text-slate-100 truncate">{customer.name}</p>
                  <Badge variant={statusVariant(customer.status)} className="flex-shrink-0 text-xs">
                    {STATUS_LABELS[customer.status] ?? customer.status}
                  </Badge>
                </div>
                {customer.company && (
                  <p className="text-xs text-slate-400 truncate mb-1">{customer.company}</p>
                )}
                <p className="text-xs text-slate-500 truncate mb-2">{customer.email || "—"}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3 shrink-0" />
                    {formatRelativeDate(customer.created_at)}
                  </span>
                  <CustomerSLABadge customer={customer} />
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
            emptyMessage="No hay clientes aún."
            renderSubRow={(row: Row<Customer>) =>
              churnResults[row.original.id]
                ? <ChurnBreakdown result={churnResults[row.original.id]} />
                : null
            }
          />
        </div>

        {/* Legends */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Semáforo de atención (SLA)</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-400" /><span className="text-green-400 font-medium">Verde</span> — dentro del plazo</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400" /><span className="text-yellow-400 font-medium">Amarillo</span> — menos de 3h</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /><span className="text-red-400 font-medium">Rojo</span> — plazo vencido</span>
              <span className="w-full mt-0.5"><span className="font-medium text-slate-200">Inactivo</span> 48h · <span className="font-medium text-slate-200">Perdido</span> 24h · <span className="font-medium text-slate-200">Activo</span> sin deadline</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Riesgo de abandono (IA)</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-400" /><span className="text-green-400 font-medium">Bajo</span> — &lt; 40%</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400" /><span className="text-yellow-400 font-medium">Medio</span> — 40–70%</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /><span className="text-red-400 font-medium">Alto</span> — &gt; 70% (parpadea)</span>
              <span className="w-full mt-0.5">Usa el botón <span className="font-medium text-slate-200">Analizar</span> para calcular. El % exacto se muestra en la columna <span className="font-medium text-slate-200">% Abandono</span>.</span>
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      {selected && (
        <CustomerPanel
          customer={selected}
          onClose={() => setSelected(null)}
          onSave={(d) => updateMutation.mutate({ id: selected.id, data: d })}
          onDelete={() => deleteMutation.mutate(selected.id)}
          isSaving={updateMutation.isPending}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </>
  );
}
