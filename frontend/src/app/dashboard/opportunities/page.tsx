"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useAuthStore } from "@/store/auth";
import { crmApi, csvApi, type Opportunity } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Download, Plus, X, Pencil, Trash2, ChevronRight,
  DollarSign, Percent, CalendarDays, AlertCircle,
  Clock, AlertTriangle, Info, Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

// ── Labels ─────────────────────────────────────────────────────────────────────
const STAGE_LABELS: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  proposal: "Propuesta",
  negotiation: "Negociación",
  won: "Ganado",
  lost: "Perdido",
};

const STAGE_VARIANT: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  new: "secondary",
  contacted: "default",
  qualified: "warning",
  proposal: "default",
  negotiation: "warning",
  won: "success",
  lost: "destructive",
};

// ── Opportunity Panel (slide-over) ────────────────────────────────────────────
interface OpportunityPanelProps {
  opp: Opportunity;
  onClose: () => void;
  onSave: (id: number, data: Partial<Opportunity>) => void;
  onDelete: (id: number) => void;
  isSaving: boolean;
  isDeleting: boolean;
}

function OpportunityPanel({ opp, onClose, onSave, onDelete, isSaving, isDeleting }: OpportunityPanelProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Opportunity>>({
    title: opp.title,
    stage: opp.stage,
    amount: opp.amount,
    probability: opp.probability,
    expected_close_date: opp.expected_close_date ?? "",
    description: opp.description ?? "",
    lost_reason: opp.lost_reason ?? "",
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const field = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSave = () => {
    onSave(opp.id, form);
    setEditing(false);
  };

  const handleCancel = () => {
    setForm({
      title: opp.title,
      stage: opp.stage,
      amount: opp.amount,
      probability: opp.probability,
      expected_close_date: opp.expected_close_date ?? "",
      description: opp.description ?? "",
      lost_reason: opp.lost_reason ?? "",
    });
    setEditing(false);
  };

  const inputCls = "w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-orange-500 focus:outline-none";
  const labelCls = "mb-1 block text-xs font-medium text-slate-400 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* panel */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-slate-900 shadow-2xl border-l border-slate-800">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex-1 min-w-0 pr-3">
            {editing ? (
              <input className={inputCls} value={form.title as string} onChange={field("title")} />
            ) : (
              <h2 className="text-base font-semibold text-slate-100 truncate">{opp.title}</h2>
            )}
            <p className="mt-0.5 text-xs text-slate-400">{opp.customer_name ?? "Sin cliente"}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Registro + SLA */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs text-slate-400 cursor-help" title={new Date(opp.created_at).toLocaleString("es-GT")}>
              <Clock className="h-3.5 w-3.5" /> Registro: <span className="text-slate-200">{formatRelativeDate(opp.created_at)}</span>
              <Info className="h-3 w-3 opacity-60" />
            </span>
            <OppSLABadge opp={opp} />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-slate-800 p-3 text-center">
              <DollarSign className="mx-auto mb-1 h-4 w-4 text-orange-400" />
              <p className="text-xs text-slate-400">Importe</p>
              <p className="text-sm font-semibold text-slate-100">{formatCurrency(parseFloat(String(opp.amount ?? 0)))}</p>
            </div>
            <div className="rounded-lg bg-slate-800 p-3 text-center">
              <Percent className="mx-auto mb-1 h-4 w-4 text-blue-400" />
              <p className="text-xs text-slate-400">Probabilidad</p>
              <p className="text-sm font-semibold text-slate-100">{opp.probability}%</p>
            </div>
            <div className="rounded-lg bg-slate-800 p-3 text-center">
              <CalendarDays className="mx-auto mb-1 h-4 w-4 text-purple-400" />
              <p className="text-xs text-slate-400">Cierre</p>
              <p className="text-sm font-semibold text-slate-100">{opp.expected_close_date ? formatDate(opp.expected_close_date) : "—"}</p>
            </div>
          </div>

          {/* Stage */}
          <div>
            <label className={labelCls}>Etapa</label>
            {editing ? (
              <select className={inputCls} value={form.stage as string} onChange={field("stage")}>
                {Object.entries(STAGE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            ) : (
              <Badge variant={STAGE_VARIANT[opp.stage]}>{STAGE_LABELS[opp.stage] ?? opp.stage}</Badge>
            )}
          </div>

          {/* Probability bar (view only) */}
          {!editing && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-slate-400">Probabilidad de cierre</span>
                <span className="text-xs font-medium text-slate-300">{opp.probability}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-700">
                <div
                  className="h-2 rounded-full bg-orange-500 transition-all"
                  style={{ width: `${opp.probability}%` }}
                />
              </div>
            </div>
          )}

          {editing && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Importe ($)</label>
                  <input type="number" className={inputCls} value={form.amount as number} onChange={field("amount")} />
                </div>
                <div>
                  <label className={labelCls}>Probabilidad (%)</label>
                  <input type="number" min={0} max={100} className={inputCls} value={form.probability as number} onChange={field("probability")} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Fecha de cierre estimada</label>
                <input type="date" className={inputCls} value={form.expected_close_date as string} onChange={field("expected_close_date")} />
              </div>
            </>
          )}

          {/* Description */}
          <div>
            <label className={labelCls}>Descripción</label>
            {editing ? (
              <textarea rows={3} className={inputCls} value={form.description as string} onChange={field("description")} placeholder="Notas sobre la oportunidad..." />
            ) : (
              <p className="text-sm text-slate-300">{opp.description || <span className="text-slate-500 italic">Sin descripción</span>}</p>
            )}
          </div>

          {/* Lost reason */}
          {(editing || opp.lost_reason) && (
            <div>
              <label className={labelCls}>Motivo de pérdida</label>
              {editing ? (
                <input className={inputCls} value={form.lost_reason as string} onChange={field("lost_reason")} placeholder="¿Por qué se perdió?" />
              ) : (
                <p className="text-sm text-slate-300">{opp.lost_reason}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-5 py-4">
          {confirmDelete ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" />
                ¿Eliminar esta oportunidad? Esta acción no se puede deshacer.
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" className="flex-1" onClick={() => onDelete(opp.id)} disabled={isDeleting}>
                  {isDeleting ? "Eliminando..." : "Confirmar eliminación"}
                </Button>
                <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : editing ? (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" onClick={handleCancel}>
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white" onClick={() => setEditing(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
              </Button>
              <Button variant="outline" size="sm" className="border-red-900 text-red-400 hover:bg-red-950" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SLA por etapa de oportunidad ──────────────────────────────────────────────
const OPP_SLA_HOURS: Record<string, number | null> = {
  new:         24,   // contactar en 24 h
  contacted:   48,   // calificar en 48 h
  qualified:   72,   // enviar propuesta en 72 h
  proposal:    72,   // hacer seguimiento en 72 h
  negotiation: 48,   // cerrar en 48 h (etapa caliente)
  won:         null,
  lost:        null,
};

const OPP_SLA_LABEL: Record<string, string> = {
  new:         "Contactar en",
  contacted:   "Calificar en",
  qualified:   "Propuesta en",
  proposal:    "Seguimiento en",
  negotiation: "Cerrar en",
};

interface SLAInfo {
  light: "green" | "yellow" | "red";
  label: string;
  tooltip: string;
  hoursLeft: number;
}

function getOppSLA(opp: Opportunity): SLAInfo | null {
  const slaHours = OPP_SLA_HOURS[opp.stage];
  if (slaHours == null) return null;

  const ref      = new Date(opp.updated_at || opp.created_at);
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
  const action = OPP_SLA_LABEL[opp.stage] ?? "Actuar en";

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

function OppSLABadge({ opp }: { opp: Opportunity }) {
  const sla = getOppSLA(opp);
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

// ── Probabilidad por defecto según etapa ──────────────────────────────────────
const STAGE_DEFAULT_PROB: Record<string, number> = {
  new: 10, contacted: 25, qualified: 50,
  proposal: 70, negotiation: 85, won: 100, lost: 0,
};

// ── Empty form ─────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  title: "",
  stage: "new",
  amount: "",
  probability: STAGE_DEFAULT_PROB["new"],
  expected_close_date: "",
  description: "",
  lost_reason: "",
};

// ── Page ───────────────────────────────────────────────────────────────────────
export default function OpportunitiesPage() {
  const { tokens, organization } = useAuthStore();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["opportunities", search],
    queryFn: () => crmApi.getOpportunities(tokens!.access, organization!.id, search ? `search=${search}` : ""),
    enabled: !!tokens && !!organization,
  });

  const createMut = useMutation({
    mutationFn: (d: typeof form) => crmApi.createOpportunity(tokens!.access, organization!.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opportunities"] }); setCreating(false); setForm({ ...EMPTY_FORM }); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Opportunity> }) =>
      crmApi.updateOpportunity(tokens!.access, organization!.id, id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opportunities"] }); setSelected(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => crmApi.deleteOpportunity(tokens!.access, organization!.id, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opportunities"] }); setSelected(null); },
  });

  const field = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const inputCls = "w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-orange-500 focus:outline-none";
  const labelCls = "mb-1 block text-xs font-medium text-slate-400 uppercase tracking-wide";

  const columns: ColumnDef<Opportunity, unknown>[] = [
    {
      accessorKey: "title",
      header: "Título",
      cell: ({ row }) => (
        <button
          className="flex items-center gap-1 font-medium text-slate-100 hover:text-orange-400 transition-colors text-left"
          onClick={() => setSelected(row.original)}
        >
          {row.original.title}
          <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
        </button>
      ),
    },
    {
      accessorKey: "customer_name",
      header: "Cliente",
      cell: ({ getValue }) => <span className="text-slate-400">{(getValue() as string) || "—"}</span>,
    },
    {
      accessorKey: "stage",
      header: "Etapa",
      cell: ({ getValue }) => {
        const s = getValue() as string;
        return <Badge variant={STAGE_VARIANT[s]}>{STAGE_LABELS[s] ?? s}</Badge>;
      },
    },
    {
      accessorKey: "amount",
      header: "Importe",
      cell: ({ getValue }) => formatCurrency(parseFloat(String(getValue() ?? 0))),
    },
    {
      accessorKey: "probability",
      header: "Prob.",
      cell: ({ getValue }) => {
        const v = getValue() as number;
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 rounded-full bg-slate-700">
              <div className="h-1.5 rounded-full bg-orange-500 transition-all" style={{ width: `${v}%` }} />
            </div>
            <span className="text-xs text-slate-500">{v}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: "expected_close_date",
      header: "Cierre estimado",
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        return <span className="text-slate-400">{v ? formatDate(v) : "—"}</span>;
      },
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
      header: "Atención",
      enableSorting: false,
      cell: ({ row }) => <OppSLABadge opp={row.original} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <button
            className="rounded p-1 text-slate-500 hover:text-orange-400 transition-colors"
            onClick={(e) => { e.stopPropagation(); setSelected(row.original); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded p-1 text-slate-500 hover:text-red-400 transition-colors"
            onClick={(e) => { e.stopPropagation(); deleteMut.mutate(row.original.id); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DashboardHeader title="Oportunidades" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Buscar oportunidades..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 border-slate-700 text-slate-300 hover:border-orange-600 hover:bg-orange-600 hover:text-white"
              onClick={() => csvApi.exportOpportunities(tokens!.access, organization!.id)}
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button
              className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => setCreating(true)}
            >
              <Plus className="h-4 w-4" /> Añadir Oportunidad
            </Button>
          </div>
        </div>

        {/* Create form */}
        {creating && (
          <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/60 p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-200">Nueva oportunidad</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Título *</label>
                <input className={inputCls} value={form.title} onChange={field("title")} placeholder="Ej. Implementación CRM" />
              </div>
              <div>
                <label className={labelCls}>Etapa</label>
                <select className={inputCls} value={form.stage}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    stage: e.target.value,
                    probability: STAGE_DEFAULT_PROB[e.target.value] ?? prev.probability,
                  }))}>
                  {Object.entries(STAGE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Importe ($)</label>
                <input type="number" className={inputCls} value={form.amount} onChange={field("amount")} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>Probabilidad (%)</label>
                <input type="number" min={0} max={100} className={inputCls} value={form.probability} onChange={field("probability")} />
              </div>
              <div>
                <label className={labelCls}>Fecha de cierre estimada</label>
                <input type="date" className={inputCls} value={form.expected_close_date} onChange={field("expected_close_date")} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Descripción</label>
                <textarea rows={2} className={inputCls} value={form.description} onChange={field("description")} placeholder="Notas sobre la oportunidad..." />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => createMut.mutate(form)}
                disabled={!form.title || createMut.isPending}
              >
                {createMut.isPending ? "Creando..." : "Crear oportunidad"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-300"
                onClick={() => { setCreating(false); setForm({ ...EMPTY_FORM }); }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          emptyMessage="No hay oportunidades aún."
        />

        {/* SLA legend */}
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Semáforo de atención (SLA)</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-400" /><span className="text-green-400 font-medium">Verde</span> — dentro del plazo</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400" /><span className="text-yellow-400 font-medium">Amarillo</span> — menos de 3h</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /><span className="text-red-400 font-medium">Rojo</span> — plazo vencido</span>
            <span className="h-3 w-px bg-slate-700" />
            <span><span className="font-medium text-slate-200">Nuevo</span> 24h · <span className="font-medium text-slate-200">Contactado</span> 48h · <span className="font-medium text-slate-200">Calificado / Propuesta</span> 72h · <span className="font-medium text-slate-200">Negociación</span> 48h</span>
          </div>
        </div>
      </div>

      {/* Slide-over panel */}
      {selected && (
        <OpportunityPanel
          opp={selected}
          onClose={() => setSelected(null)}
          onSave={(id, d) => updateMut.mutate({ id, data: d })}
          onDelete={(id) => deleteMut.mutate(id)}
          isSaving={updateMut.isPending}
          isDeleting={deleteMut.isPending}
        />
      )}
    </>
  );
}
