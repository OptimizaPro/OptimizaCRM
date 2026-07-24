"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";
import {
  crmApi,
  type Opportunity,
  type OppStage,
  type PipelineTemplate,
  type PipelineStage,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  Plus, Search, X, LayoutGrid, List, DollarSign, TrendingUp,
  Trophy, XCircle, Pencil, Trash2, Filter, ChevronLeft, ChevronRight,
  RefreshCw, Loader2, AlertTriangle, Info, GripVertical, ArrowLeft,
  ArrowRight, Settings, UserCheck,
} from "lucide-react";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STAGE_KEYS: OppStage[] = [
  "new", "contacted", "qualified", "proposal", "negotiation", "won", "lost",
];

const STAGE_META: Record<OppStage, {
  label: string; color: string; border: string; dot: string; bg: string;
}> = {
  new:         { label: "Nuevo",       color: "text-slate-400",   border: "border-slate-700",     dot: "bg-slate-500",  bg: "bg-slate-800/60"  },
  contacted:   { label: "Contactado",  color: "text-blue-400",    border: "border-blue-700/50",   dot: "bg-blue-400",   bg: "bg-blue-950/40"   },
  qualified:   { label: "Calificado",  color: "text-indigo-400",  border: "border-indigo-700/50", dot: "bg-indigo-400", bg: "bg-indigo-950/40" },
  proposal:    { label: "Propuesta",   color: "text-purple-400",  border: "border-purple-700/50", dot: "bg-purple-400", bg: "bg-purple-950/40" },
  negotiation: { label: "Negociación", color: "text-yellow-400",  border: "border-yellow-700/50", dot: "bg-yellow-400", bg: "bg-yellow-950/40" },
  won:         { label: "Ganado",      color: "text-green-400",   border: "border-green-700/50",  dot: "bg-green-400",  bg: "bg-green-950/40"  },
  lost:        { label: "Perdido",     color: "text-red-400",     border: "border-red-800/30",    dot: "bg-red-500",    bg: "bg-red-950/40"    },
};

const inputCls  = "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20";
const selectCls = "rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 focus:border-orange-500 focus:outline-none";

const TAB_ITEMS = [
  { id: "board"  as const, label: "Pipeline Board", icon: LayoutGrid },
  { id: "config" as const, label: "Configuración",  icon: Settings   },
];

// ─── SLA helpers ──────────────────────────────────────────────────────────────

const SLA_FALLBACK: Record<string, number | null> = {
  new: 24, contacted: 48, qualified: 72,
  proposal: 72, negotiation: 48, won: null, lost: null,
};
const OPP_SLA_ACTION: Record<string, string> = {
  new: "Contactar", contacted: "Calificar", qualified: "Propuesta",
  proposal: "Seguimiento", negotiation: "Cerrar",
};

function getOppSLA(
  opp: { stage: string; updated_at?: string; created_at?: string },
  slaMap?: Record<string, number | null>,
) {
  const slaH = slaMap ? (slaMap[opp.stage] ?? null) : SLA_FALLBACK[opp.stage];
  if (slaH == null) return null;
  const ref      = new Date((opp.updated_at || opp.created_at) as string);
  const deadline = new Date(ref.getTime() + slaH * 3600 * 1000);
  const diffH    = (deadline.getTime() - Date.now()) / 3600000;
  const fmt = (h: number) => {
    if (h <= 0) {
      const a = Math.abs(h);
      return a < 1 ? `${Math.ceil(a * 60)}min venc.` : a < 24 ? `${Math.floor(a)}h venc.` : `${Math.floor(a / 24)}d venc.`;
    }
    if (h < 1)  return `${Math.ceil(h * 60)}min`;
    if (h < 24) return `${Math.floor(h)}h ${Math.round((h % 1) * 60)}min`;
    const d = Math.floor(h / 24), r = Math.floor(h % 24);
    return r > 0 ? `${d}d ${r}h` : `${d}d`;
  };
  const deadlineStr = deadline.toLocaleString("es-GT", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
  return {
    light:   diffH < 0 ? "red" : diffH <= 3 ? "yellow" : "green",
    label:   fmt(diffH),
    tooltip: `${OPP_SLA_ACTION[opp.stage]} · Vence: ${deadlineStr}`,
  } as const;
}

function KanbanSLABadge({ opp, slaMap }: {
  opp: { stage: string; updated_at?: string; created_at?: string };
  slaMap?: Record<string, number | null>;
}) {
  const sla = getOppSLA(opp, slaMap);
  if (!sla) return null;
  const cfg = {
    green:  { dot: "bg-green-400",  text: "text-green-400",  bg: "bg-green-950/70",  ring: "border-green-800"  },
    yellow: { dot: "bg-yellow-400", text: "text-yellow-300", bg: "bg-yellow-950/70", ring: "border-yellow-700" },
    red:    { dot: "bg-red-500",    text: "text-red-400",    bg: "bg-red-950/70",    ring: "border-red-800"    },
  }[sla.light];
  return (
    <div title={sla.tooltip}
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium cursor-help ${cfg.ring} ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot} ${sla.light === "red" ? "animate-pulse" : ""}`} />
      {sla.label}
      {sla.light === "red" ? <AlertTriangle className="h-2.5 w-2.5" /> : <Info className="h-2.5 w-2.5 opacity-70" />}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
}

function isOverdue(iso: string | null) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, total, onPage }: {
  page: number; totalPages: number; total: number; onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to   = Math.min(page * PAGE_SIZE, total);
  return (
    <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3 bg-slate-900/40">
      <p className="text-xs text-slate-500">{from}–{to} de {total} oportunidades</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" /> Anterior
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | "…")[]>((acc, p, i, arr) => {
            if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
            acc.push(p); return acc;
          }, [])
          .map((p, i) =>
            p === "…"
              ? <span key={`e-${i}`} className="px-1.5 text-xs text-slate-600">…</span>
              : <button key={p} onClick={() => onPage(p as number)}
                  className={`min-w-[28px] rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                    p === page ? "bg-orange-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}>{p}</button>
          )
        }
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          Siguiente <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Opp Form Modal ───────────────────────────────────────────────────────────

function OppFormModal({ initial, defaultStage = "new", onClose, onSave, saving, error }: {
  initial?: Opportunity; defaultStage?: OppStage;
  onClose: () => void; onSave: (d: Partial<Opportunity>) => Promise<void>;
  saving: boolean; error: string;
}) {
  const [form, setForm] = useState({
    title:               initial?.title               ?? "",
    amount:              initial?.amount              ? parseFloat(initial.amount).toString() : "0",
    probability:         String(initial?.probability  ?? 50),
    stage:               (initial?.stage              ?? defaultStage) as OppStage,
    expected_close_date: initial?.expected_close_date ?? "",
    description:         initial?.description         ?? "",
  });
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400">
                {initial ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </div>
              <h2 className="font-semibold text-slate-100">
                {initial ? "Editar oportunidad" : "Nueva oportunidad"}
              </h2>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Título *</label>
              <input className={inputCls} value={form.title}
                onChange={e => set("title", e.target.value)} placeholder="Nombre de la oportunidad" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Valor ($)</label>
                <input className={inputCls} type="number" min="0" step="0.01" value={form.amount}
                  onChange={e => set("amount", e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Probabilidad (%)</label>
                <input className={inputCls} type="number" min="0" max="100" value={form.probability}
                  onChange={e => set("probability", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Etapa</label>
                <select className={`${selectCls} w-full`} value={form.stage}
                  onChange={e => set("stage", e.target.value as OppStage)}>
                  {STAGE_KEYS.map(s => (
                    <option key={s} value={s}>{STAGE_META[s].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Cierre estimado</label>
                <input className={inputCls} type="date" value={form.expected_close_date ?? ""}
                  onChange={e => set("expected_close_date", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Descripción</label>
              <textarea className={`${inputCls} resize-none`} rows={2} value={form.description}
                onChange={e => set("description", e.target.value)} placeholder="Detalles opcionales…" />
            </div>
            {error && <p className="rounded-lg bg-red-950/30 px-3 py-2 text-xs text-red-400">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button size="sm" disabled={saving || !form.title.trim()}
              onClick={() => onSave({
                title:               form.title,
                amount:              form.amount || "0",
                probability:         parseInt(form.probability) || 0,
                stage:               form.stage,
                expected_close_date: form.expected_close_date || null,
                description:         form.description,
              })}
              className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
              {initial ? "Guardar cambios" : "Crear oportunidad"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Opp Kanban Card ──────────────────────────────────────────────────────────

function OppKanbanCard({ opp, slaMap, onEdit, onDelete, onDragStart, deleting, onConvertToCustomer, convertingCustomer }: {
  opp: Opportunity;
  slaMap: Record<string, number | null>;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  deleting: boolean;
  onConvertToCustomer?: () => void;
  convertingCustomer?: boolean;
}) {
  const amount      = parseFloat(String(opp.amount));
  const closeOver   = opp.stage !== "won" && opp.stage !== "lost" && isOverdue(opp.expected_close_date);

  return (
    <div draggable onDragStart={onDragStart}
      className={`group cursor-grab rounded-xl border bg-slate-950 p-3.5 shadow-sm transition-all hover:shadow-md hover:border-slate-600 active:cursor-grabbing ${
        opp.stage === "lost" ? "border-slate-800 opacity-70" : closeOver ? "border-red-800/40" : "border-slate-800"
      }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={`text-sm font-medium leading-snug ${opp.stage === "lost" ? "line-through text-slate-500" : "text-slate-200"}`}>
          {opp.title}
        </p>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={onEdit} className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-orange-400">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} disabled={deleting}
            className="rounded p-1 text-slate-500 hover:bg-red-950/30 hover:text-red-400 disabled:opacity-40">
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {opp.customer_name && (
        <p className="text-[11px] text-slate-500 mb-2 truncate">{opp.customer_name}</p>
      )}

      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-sm font-bold text-orange-500">{formatCurrency(amount)}</span>
        <div className="flex items-center gap-1.5" title={`Probabilidad: ${opp.probability}%`}>
          <div className="h-1 w-14 rounded-full bg-slate-800">
            <div className="h-1 rounded-full bg-orange-500" style={{ width: `${opp.probability}%` }} />
          </div>
          <span className="text-[10px] text-slate-500">{opp.probability}%</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <KanbanSLABadge opp={opp} slaMap={slaMap} />
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {opp.expected_close_date && (
            <span className={`text-[10px] flex items-center gap-0.5 ${closeOver ? "text-red-400" : "text-slate-600"}`}>
              {closeOver && <AlertTriangle className="h-2.5 w-2.5" />}
              {fmtDate(opp.expected_close_date)}
            </span>
          )}
          {opp.assigned_to_detail && (
            <div
              title={opp.assigned_to_detail.full_name || `${opp.assigned_to_detail.first_name} ${opp.assigned_to_detail.last_name}`}
              className="h-5 w-5 rounded-full bg-orange-950/70 border border-orange-800/40 flex items-center justify-center text-[9px] font-bold text-orange-400"
            >
              {(opp.assigned_to_detail.first_name?.[0] ?? "").toUpperCase()}{(opp.assigned_to_detail.last_name?.[0] ?? "").toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {opp.stage === "won" && opp.lead && onConvertToCustomer && (
        <button
          onClick={e => { e.stopPropagation(); onConvertToCustomer(); }}
          disabled={convertingCustomer}
          className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg border border-green-800/40 bg-green-950/30 px-3 py-1.5 text-[11px] font-semibold text-green-400 hover:bg-green-950/60 disabled:opacity-50 transition-colors"
        >
          {convertingCustomer
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <UserCheck className="h-3 w-3" />}
          Convertir a Cliente
        </button>
      )}
    </div>
  );
}

// ─── Stage editor row ─────────────────────────────────────────────────────────

interface StageRowProps {
  stage: PipelineStage;
  index: number;
  token: string;
  orgId: string;
  pipelineId: string;
  onDragStart: (e: React.DragEvent, idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDrop: () => void;
  draggingIdx: number | null;
}

function StageRow({ stage, index, token, orgId, pipelineId, onDragStart, onDragOver, onDrop, draggingIdx }: StageRowProps) {
  const qc = useQueryClient();
  const [name, setName]           = useState(stage.name);
  const [probability, setProb]    = useState(String(stage.probability ?? 0));
  const [slaHours, setSla]        = useState(stage.sla_hours != null ? String(stage.sla_hours) : "");
  const [color, setColor]         = useState(stage.color);

  const save = useCallback(() => {
    const prob = Math.min(100, Math.max(0, parseInt(probability) || 0));
    const sla  = slaHours.trim() === "" ? null : Math.max(1, parseInt(slaHours) || 1);
    crmApi.updateStage(token, orgId, pipelineId, stage.id, { name: name.trim() || stage.name, probability: prob, color, sla_hours: sla })
      .then(() => qc.invalidateQueries({ queryKey: ["pipelines"] }))
      .catch(() => {});
  }, [name, probability, slaHours, color, stage.name, token, orgId, pipelineId, stage.id, qc]);

  const handleDelete = () => {
    crmApi.removeStage(token, orgId, pipelineId, stage.id)
      .then(() => qc.invalidateQueries({ queryKey: ["pipelines"] }))
      .catch(() => {});
  };

  return (
    <div draggable onDragStart={e => onDragStart(e, index)} onDragOver={e => onDragOver(e, index)} onDrop={onDrop}
      className={`flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 transition-opacity ${draggingIdx === index ? "opacity-40" : ""}`}>
      <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-slate-600 active:cursor-grabbing" />
      <span className="w-5 flex-shrink-0 text-xs font-semibold text-slate-400">{index + 1}</span>
      <Input value={name} onChange={e => setName(e.target.value)} onBlur={save} className="h-8 flex-1 text-sm" />
      <div className="flex items-center gap-1" title="Probabilidad de cierre por defecto">
        <Input type="number" min="0" max="100" value={probability}
          onChange={e => setProb(e.target.value)} onBlur={save}
          className="h-8 w-16 text-center text-sm font-semibold text-orange-600" />
        <span className="text-xs text-slate-400">%</span>
      </div>
      <div className="flex items-center gap-1" title="Plazo máximo de atención (horas). Vacío = sin límite.">
        <Input type="number" min="1" value={slaHours}
          onChange={e => setSla(e.target.value)} onBlur={save}
          placeholder="—" className="h-8 w-16 text-center text-sm font-semibold text-blue-400 placeholder:text-slate-600" />
        <span className="text-xs text-slate-400">h</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-4 w-4 rounded-full border border-slate-200" style={{ backgroundColor: color }} />
        <input type="color" value={color} onChange={e => setColor(e.target.value)} onBlur={save}
          className="h-7 w-7 cursor-pointer rounded border border-slate-200 p-0.5" title="Color de etapa" />
      </div>
      <button type="button" onClick={handleDelete}
        className="flex-shrink-0 text-slate-600 transition-colors hover:text-red-500" title="Eliminar etapa">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Stage Editor ─────────────────────────────────────────────────────────────

interface StageEditorProps {
  pipeline: PipelineTemplate;
  token: string;
  orgId: string;
  onBack: () => void;
}

function StageEditor({ pipeline, token, orgId, onBack }: StageEditorProps) {
  const qc = useQueryClient();
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx]         = useState<number | null>(null);
  const [stages, setStages]           = useState<PipelineStage[]>(pipeline.stages);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName]         = useState("");
  const [newColor, setNewColor]       = useState("#6B7280");
  const [newProb, setNewProb]         = useState("50");
  const [addError, setAddError]       = useState("");
  const [addPending, setAddPending]   = useState(false);

  const { data: freshPipeline } = useQuery({
    queryKey: ["pipelines"],
    queryFn: () => crmApi.getPipelines(token, orgId),
    select: data => data.find(p => p.id === pipeline.id),
  });

  const currentStages = freshPipeline?.stages ?? stages;
  const [nameValue, setNameValue] = useState(freshPipeline?.name ?? pipeline.name);

  const commitName = () => {
    setEditingName(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== (freshPipeline?.name ?? pipeline.name)) {
      crmApi.updatePipeline(token, orgId, pipeline.id, { name: trimmed })
        .then(() => qc.invalidateQueries({ queryKey: ["pipelines"] }))
        .catch(() => {});
    } else {
      setNameValue(freshPipeline?.name ?? pipeline.name);
    }
  };

  const handleAddStage = async () => {
    if (!newName.trim()) { setAddError("El nombre es obligatorio."); return; }
    const prob = Math.min(100, Math.max(0, parseInt(newProb) || 0));
    setAddPending(true);
    try {
      await crmApi.addStage(token, orgId, pipeline.id, { name: newName.trim(), color: newColor, probability: prob });
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      setNewName(""); setNewProb("50"); setNewColor("#6B7280"); setAddError("");
    } catch (e) { setAddError((e as Error).message); }
    finally { setAddPending(false); }
  };

  const handleDragStart = (_: React.DragEvent, idx: number) => setDraggingIdx(idx);
  const handleDragOver  = (e: React.DragEvent, idx: number) => { e.preventDefault(); setOverIdx(idx); };
  const handleDrop      = () => {
    if (draggingIdx === null || overIdx === null || draggingIdx === overIdx) {
      setDraggingIdx(null); setOverIdx(null); return;
    }
    const reordered = [...currentStages];
    const [moved] = reordered.splice(draggingIdx, 1);
    reordered.splice(overIdx, 0, moved);
    setStages(reordered);
    setDraggingIdx(null); setOverIdx(null);
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <button type="button" onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-100">
          <ArrowLeft className="h-4 w-4" /> Regresar
        </button>
        <span className="text-slate-600">/</span>
        {editingName ? (
          <input autoFocus value={nameValue} onChange={e => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setEditingName(false); setNameValue(freshPipeline?.name ?? pipeline.name); } }}
            className="rounded-md border border-orange-400 bg-slate-900 px-2 py-0.5 text-base font-semibold text-slate-100 outline-none ring-2 ring-orange-400/30" />
        ) : (
          <button type="button" onClick={() => setEditingName(true)}
            className="group flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-slate-800" title="Editar nombre">
            <h2 className="text-base font-semibold text-slate-100">{freshPipeline?.name ?? pipeline.name}</h2>
            <Pencil className="h-3.5 w-3.5 text-slate-600 transition-colors group-hover:text-orange-500" />
          </button>
        )}
      </div>

      <div className="mb-2">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Etapas del proceso</p>
        <div className="hidden sm:flex items-center gap-3 px-4 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          <span className="w-4 shrink-0" /><span className="w-5 shrink-0">#</span>
          <span className="flex-1">Nombre</span><span className="w-16 text-center">Prob.</span>
          <span className="w-16 text-center" title="Horas máximas de atención (SLA)">SLA (h)</span>
          <span className="w-16 text-center">Color</span><span className="w-4" />
        </div>
      </div>

      <div className="overflow-x-auto">
      <div className="space-y-2 mb-4 min-w-[480px]">
        {currentStages.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">No hay etapas. Añade la primera.</p>
        )}
        {currentStages.map((stage, idx) => (
          <StageRow key={stage.id} stage={stage} index={idx}
            token={token} orgId={orgId} pipelineId={pipeline.id}
            onDragStart={handleDragStart} onDragOver={handleDragOver}
            onDrop={handleDrop} draggingIdx={draggingIdx} />
        ))}
      </div>
      </div>

      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900 px-4 py-3">
        <p className="mb-2 text-xs font-medium text-slate-400">Nueva etapa</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Nombre de la etapa" className="h-8 w-44 text-sm"
            onKeyDown={e => e.key === "Enter" && handleAddStage()} />
          <div className="flex items-center gap-1">
            <Input type="number" min="0" max="100" value={newProb}
              onChange={e => setNewProb(e.target.value)}
              className="h-8 w-16 text-center text-sm font-semibold text-orange-600" />
            <span className="text-xs text-slate-400">%</span>
          </div>
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded border border-slate-200 p-0.5" />
          <Button size="sm" onClick={handleAddStage} disabled={addPending}
            className="h-8 bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="h-3.5 w-3.5 mr-1" />
            {addPending ? "Añadiendo..." : "Añadir etapa"}
          </Button>
        </div>
        {addError && <p className="mt-1.5 text-xs text-red-500">{addError}</p>}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button type="button" onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-100">
          <ArrowLeft className="h-4 w-4" /> Regresar
        </button>
        <Button className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold" onClick={onBack}>
          Guardar arquitectura
        </Button>
      </div>
    </div>
  );
}

// ─── Create Pipeline Modal ────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: "sales"     as const, label: "Ventas"         },
  { value: "post_sale" as const, label: "Post-Venta"     },
  { value: "loyalty"   as const, label: "Fidelización"   },
  { value: "custom"    as const, label: "Personalizado"  },
];

function CreatePipelineModal({ token, orgId, onClose }: { token: string; orgId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName]             = useState("");
  const [description, setDesc]      = useState("");
  const [pipelineType, setType]     = useState<PipelineTemplate["pipeline_type"]>("sales");
  const [color, setColor]           = useState("#EA580C");
  const [error, setError]           = useState("");
  const [pending, setPending]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("El nombre es obligatorio."); return; }
    setError(""); setPending(true);
    try {
      await crmApi.createPipeline(token, orgId, { name: name.trim(), description, pipeline_type: pipelineType, color });
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      onClose();
    } catch (e) { setError((e as Error).message); }
    finally { setPending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <h2 className="mb-4 text-base font-semibold text-slate-100">Nuevo pipeline</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Nombre</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Pipeline de Ventas B2B" autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Tipo</label>
            <Select value={pipelineType} onValueChange={v => setType(v as PipelineTemplate["pipeline_type"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Descripción</label>
            <Input value={description} onChange={e => setDesc(e.target.value)} placeholder="Descripción opcional" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border border-slate-700" />
              <span className="text-xs text-slate-400">{color}</span>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={pending} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
              {pending ? "Creando..." : "Crear pipeline"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Config Tab ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  sales: "Ventas", post_sale: "Post-Venta", loyalty: "Fidelización", custom: "Personalizado",
};

function ConfigTab({ onEditPipeline }: { onEditPipeline: (p: PipelineTemplate) => void }) {
  const { tokens, organization } = useAuthStore();
  const qc = useQueryClient();
  const [showCreate, setShowCreate]     = useState(false);
  const [confirmDelete, setConfirmDel]  = useState<string | null>(null);
  const [deletePending, setDelPending]  = useState(false);

  const { data: pipelines, isLoading, error } = useQuery({
    queryKey: ["pipelines"],
    queryFn: () => crmApi.getPipelines(tokens!.access, organization!.id),
    enabled: !!tokens && !!organization,
  });

  const handleDelete = async (id: string) => {
    setDelPending(true);
    try {
      await crmApi.deletePipeline(tokens!.access, organization!.id, id);
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      setConfirmDel(null);
    } finally { setDelPending(false); }
  };

  if (!tokens || !organization) return null;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Gestiona las arquitecturas de pipeline para estructurar tu proceso de ventas.
        </p>
        <Button onClick={() => setShowCreate(true)} className="bg-orange-600 hover:bg-orange-700 text-white" size="sm">
          <Plus className="h-4 w-4 mr-1.5" /> Nuevo pipeline
        </Button>
      </div>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-sm text-red-400">
          Error al cargar los pipelines.
        </div>
      )}
      {!isLoading && !error && (!pipelines || pipelines.length === 0) && (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950 p-16 text-center">
          <p className="text-sm text-slate-400">No hay pipelines creados. Crea el primero.</p>
        </div>
      )}
      {!isLoading && pipelines && pipelines.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pipelines.map(pipeline => (
            <div key={pipeline.id} onClick={() => onEditPipeline(pipeline)}
              className="group relative rounded-2xl border border-slate-800 bg-slate-950 p-5 transition-all hover:border-orange-500/50 hover:shadow-lg cursor-pointer">
              <span className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full" style={{ backgroundColor: pipeline.color }} />
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-lg font-black uppercase tracking-tight text-white">{pipeline.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {pipeline.stages.length} etapa{pipeline.stages.length !== 1 ? "s" : ""} activa{pipeline.stages.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); setConfirmDel(pipeline.id); }}
                  className="text-slate-500 transition-colors hover:text-red-400" title="Eliminar pipeline">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs bg-slate-400 text-slate-900 border-slate-700">
                  {TYPE_LABELS[pipeline.pipeline_type]}
                </Badge>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-orange-400 transition-colors" />
              </div>
              {pipeline.stages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {pipeline.stages.slice(0, 4).map(s => (
                    <span key={s.id} className="h-1.5 flex-1 min-w-4 rounded-full" style={{ backgroundColor: s.color }} title={s.name} />
                  ))}
                  {pipeline.stages.length > 4 && <span className="text-xs text-slate-500">+{pipeline.stages.length - 4}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDel(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-semibold text-slate-100">¿Eliminar pipeline?</h3>
            <p className="mb-4 text-sm text-slate-400">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1" disabled={deletePending}
                onClick={() => handleDelete(confirmDelete)}>
                {deletePending ? "Eliminando..." : "Eliminar"}
              </Button>
              <Button variant="outline" onClick={() => setConfirmDel(null)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
      {showCreate && <CreatePipelineModal token={tokens.access} orgId={organization.id} onClose={() => setShowCreate(false)} />}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = "kanban" | "list";
type ActiveTab = "board" | "config";
type AppView = { type: "board" } | { type: "stage-editor"; pipeline: PipelineTemplate };

const OPEN_STAGES: OppStage[] = ["new", "contacted", "qualified", "proposal", "negotiation"];

export default function PipelinePage() {
  const { tokens, organization } = useAuthStore();
  const token = tokens?.access ?? "";
  const orgId = String(organization?.id ?? "");
  const qc    = useQueryClient();

  const [appView,            setAppView]      = useState<AppView>({ type: "board" });
  const [activeTab,          setActiveTab]    = useState<ActiveTab>("board");
  const [view,               setView]         = useState<ViewMode>("kanban");
  const [stageFilter,        setStageFilter]  = useState("");
  const [search,             setSearch]       = useState("");
  const [page,               setPage]         = useState(1);
  const [showCreate,         setShowCreate]   = useState(false);
  const [createDefaultStage, setDefaultStage] = useState<OppStage>("new");
  const [editOpp,            setEditOpp]      = useState<Opportunity | null>(null);
  const [formError,          setFormError]    = useState("");
  const [formSaving,         setFormSaving]   = useState(false);
  const [deleting,           setDeleting]     = useState<string | null>(null);
  const [convertingCust,     setConvertingCust] = useState<string | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["pipeline-kanban"] });
    qc.invalidateQueries({ queryKey: ["opportunities-list"] });
    qc.invalidateQueries({ queryKey: ["leads"] });
  };

  // ── Kanban query: all opps grouped by stage ──────────────────────────────
  const kanbanQ = useQuery({
    queryKey: ["pipeline-kanban"],
    queryFn:  () => crmApi.getPipeline(token, orgId),
    enabled:  !!token,
  });

  // ── List query: paginated + filtered ────────────────────────────────────
  const listQ = useQuery({
    queryKey: ["opportunities-list", page, stageFilter, search],
    queryFn:  () => crmApi.getOpportunities(token, orgId, {
      stage:     stageFilter || undefined,
      search:    search      || undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    enabled: !!token && view === "list",
  });

  // ── Pipelines query: for SLA map ────────────────────────────────────────
  const pipelinesQ = useQuery({
    queryKey: ["pipelines"],
    queryFn:  () => crmApi.getPipelines(token, orgId),
    enabled:  !!token,
  });

  const slaMap = useMemo<Record<string, number | null>>(() => {
    const def = pipelinesQ.data?.find(p => p.is_default) ?? pipelinesQ.data?.[0];
    if (!def) return {};
    return Object.fromEntries(def.stages.map(s => [s.slug, s.sla_hours ?? null]));
  }, [pipelinesQ.data]);

  const kanbanData  = kanbanQ.data ?? {};
  const listOpps    = listQ.data?.results ?? [];
  const listTotal   = listQ.data?.count   ?? 0;
  const totalPages  = Math.ceil(listTotal / PAGE_SIZE);
  const isFetching  = view === "kanban" ? kanbanQ.isFetching : listQ.isFetching;
  const isLoading   = view === "kanban" ? kanbanQ.isLoading  : listQ.isLoading;

  // Stats from kanban data
  const stats = useMemo(() => ({
    pipelineValue: OPEN_STAGES.reduce((s, k) => s + (kanbanData[k]?.total_amount ?? 0), 0),
    openCount:     OPEN_STAGES.reduce((s, k) => s + (kanbanData[k]?.count ?? 0), 0),
    wonCount:      kanbanData["won"]?.count  ?? 0,
    wonValue:      kanbanData["won"]?.total_amount ?? 0,
    lostCount:     kanbanData["lost"]?.count ?? 0,
    totalCount:    STAGE_KEYS.reduce((s, k) => s + (kanbanData[k]?.count ?? 0), 0),
  }), [kanbanData]);

  const hasFilters = search || stageFilter;
  const clearFilters = () => { setSearch(""); setStageFilter(""); setPage(1); };
  const applyStage  = (v: string) => { setStageFilter(v); setPage(1); };
  const applySearch = (v: string) => { setSearch(v);      setPage(1); };

  // ── Mutations ────────────────────────────────────────────────────────────

  const handleCreate = async (data: Partial<Opportunity>) => {
    setFormSaving(true); setFormError("");
    try {
      await crmApi.createOpportunity(token, orgId, data);
      invalidate(); setShowCreate(false); toast.success("Oportunidad creada");
    } catch (e) { setFormError((e as Error).message); }
    finally { setFormSaving(false); }
  };

  const handleEdit = async (data: Partial<Opportunity>) => {
    if (!editOpp) return;
    setFormSaving(true); setFormError("");
    try {
      await crmApi.updateOpportunity(token, orgId, editOpp.id, data);
      invalidate(); setEditOpp(null); toast.success("Oportunidad actualizada");
    } catch (e) { setFormError((e as Error).message); }
    finally { setFormSaving(false); }
  };

  const handleDelete = (opp: Opportunity) => {
    toast(`¿Eliminar "${opp.title}"?`, {
      description: "Esta acción no se puede deshacer.",
      action: { label: "Sí, eliminar", onClick: async () => {
        setDeleting(opp.id);
        try { await crmApi.deleteOpportunity(token, orgId, opp.id); invalidate(); toast.success("Oportunidad eliminada"); }
        catch (e) { toast.error((e as Error).message); }
        finally { setDeleting(null); }
      }},
      cancel: { label: "Cancelar", onClick: () => {} },
      duration: 8000,
    });
  };

  const handleMoveStage = async (id: string, stage: string) => {
    try { await crmApi.updateOpportunityStage(token, orgId, id, stage); invalidate(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const handleConvertToCustomer = async (opp: Opportunity) => {
    if (!opp.lead) { toast.error("Esta oportunidad no tiene un lead vinculado"); return; }
    setConvertingCust(opp.id);
    try {
      const res = await crmApi.convertToCustomer(token, orgId, opp.lead);
      invalidate();
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success(res.created ? "Cliente creado correctamente" : "Cliente actualizado con los datos del lead");
    } catch {
      toast.error("Error al convertir a cliente");
    } finally {
      setConvertingCust(null);
    }
  };

  const handleEditPipeline = useCallback((pipeline: PipelineTemplate) => {
    setAppView({ type: "stage-editor", pipeline });
  }, []);

  // ── Stage editor full-page view ──────────────────────────────────────────
  if (appView.type === "stage-editor" && tokens && organization) {
    return (
      <>
        <DashboardHeader title="Pipeline" />
        <div className="flex-1 overflow-y-auto p-6">
          <StageEditor pipeline={appView.pipeline} token={tokens.access} orgId={orgId}
            onBack={() => setAppView({ type: "board" })} />
        </div>
      </>
    );
  }

  // ── Main page ────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardHeader title="Pipeline" />

      <div className="flex-1 overflow-y-auto bg-slate-900/30">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 py-6 sm:py-8">

          {/* Page header banner */}
          <div className="relative mb-8 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/10 px-4 sm:px-8 py-5 sm:py-7 shadow-2xl shadow-black/30">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-600/5 blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-600 shadow-xl shadow-orange-900/50 ring-1 ring-orange-500/40">
                  <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-100 leading-tight">Pipeline</h1>
                  <p className="mt-0.5 text-sm text-slate-400">{stats.totalCount} oportunidades en total</p>
                </div>
              </div>
              {activeTab === "board" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
                    <button onClick={() => setView("kanban")}
                      className={`rounded-lg p-2 transition-all ${view === "kanban" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                      title="Kanban">
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button onClick={() => setView("list")}
                      className={`rounded-lg p-2 transition-all ${view === "list" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                      title="Lista">
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => invalidate()} disabled={isFetching}
                    className="gap-1.5 border-slate-700 text-slate-400 hover:border-orange-600 hover:text-orange-400">
                    <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                  </Button>
                  <Button size="sm"
                    onClick={() => { setDefaultStage("new"); setFormError(""); setShowCreate(true); }}
                    className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/30">
                    <Plus className="h-4 w-4" /> Nueva oportunidad
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Stats cards — board tab only */}
          {activeTab === "board" && (
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Valor pipeline",  value: formatCurrency(stats.pipelineValue), icon: DollarSign, color: "text-orange-400", bg: "bg-orange-950/40",  border: "border-orange-800/30"  },
                { label: "Abiertas",        value: stats.openCount,                     icon: TrendingUp,  color: "text-blue-400",   bg: "bg-blue-950/40",    border: "border-blue-800/30"    },
                { label: "Ganadas",         value: stats.wonCount,                      icon: Trophy,      color: "text-green-400",  bg: "bg-green-950/40",   border: "border-green-800/30"   },
                { label: "Perdidas",        value: stats.lostCount,                     icon: XCircle,     color: "text-red-400",    bg: "bg-red-950/40",     border: "border-red-800/30"     },
              ].map(({ label, value, icon: Icon, color, bg, border }) => (
                <div key={label} className={`rounded-2xl border ${border} bg-slate-950 p-5 flex flex-col gap-3 shadow-lg`}>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-100 leading-none">{value}</p>
                    <p className="text-xs text-slate-500 mt-1">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tabs — voice-plans style */}
          <div className="mb-6 flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
            {TAB_ITEMS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                    active
                      ? "bg-orange-600 text-white shadow-sm shadow-orange-900/40"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}>
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* ── Board tab ── */}
          {activeTab === "board" && (
            <>
              {/* Toolbar */}
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {view === "list" && (
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input value={search} onChange={e => applySearch(e.target.value)}
                      placeholder="Buscar oportunidades…"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                    {search && (
                      <button onClick={() => applySearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
                <div className={`flex items-center gap-2 ${view === "kanban" ? "w-full justify-end" : ""}`}>
                  <Filter className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  {view === "list" && (
                    <select value={stageFilter} onChange={e => applyStage(e.target.value)} className={selectCls}>
                      <option value="">Todas las etapas</option>
                      {STAGE_KEYS.map(s => (
                        <option key={s} value={s}>{STAGE_META[s].label}</option>
                      ))}
                    </select>
                  )}
                  {hasFilters && (
                    <button onClick={clearFilters}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2.5 text-xs text-slate-400 hover:border-red-700 hover:text-red-400 transition-colors">
                      <X className="h-3.5 w-3.5" /> Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Loading */}
              {isLoading ? (
                <div className="flex items-center justify-center py-32">
                  <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
                </div>
              ) : view === "kanban" ? (

                /* ── KANBAN ── */
                <>
                {/* Mobile card list — replaces kanban on small screens */}
                <div className="md:hidden space-y-3">
                  {STAGE_KEYS.flatMap(stageKey => {
                    const col  = kanbanData[stageKey];
                    const meta = STAGE_META[stageKey];
                    if (!col || col.opportunities.length === 0) return [];
                    return col.opportunities.map(opp => {
                      const amount    = parseFloat(String(opp.amount));
                      const closeOver = opp.stage !== "won" && opp.stage !== "lost" && isOverdue(opp.expected_close_date);
                      return (
                        <div key={opp.id}
                          onClick={() => { setFormError(""); setEditOpp(opp); }}
                          className={`rounded-xl border bg-slate-950 p-4 cursor-pointer transition-colors hover:border-slate-600 ${
                            opp.stage === "lost" ? "border-slate-800 opacity-70" : closeOver ? "border-red-800/40" : "border-slate-800"
                          }`}>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className={`font-medium text-sm leading-snug ${opp.stage === "lost" ? "line-through text-slate-500" : "text-slate-100"}`}>
                              {opp.title}
                            </p>
                            <span className={`flex items-center gap-1.5 shrink-0 text-xs font-semibold ${meta.color}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                          </div>
                          {opp.customer_name && (
                            <p className="text-xs text-slate-500 mb-2 truncate">{opp.customer_name}</p>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-orange-500">{formatCurrency(amount)}</span>
                            <div className="flex items-center gap-2">
                              <KanbanSLABadge opp={opp} slaMap={slaMap} />
                              <div className="flex items-center gap-1.5">
                                <div className="h-1 w-12 rounded-full bg-slate-800">
                                  <div className="h-1 rounded-full bg-orange-500" style={{ width: `${opp.probability}%` }} />
                                </div>
                                <span className="text-[10px] text-slate-500">{opp.probability}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            {opp.expected_close_date ? (
                              <p className={`text-xs flex items-center gap-1 ${closeOver ? "text-red-400" : "text-slate-600"}`}>
                                {closeOver && <AlertTriangle className="h-3 w-3" />}
                                Cierre: {fmtDate(opp.expected_close_date)}
                              </p>
                            ) : <span />}
                            {opp.assigned_to_detail && (
                              <div
                                title={opp.assigned_to_detail.full_name || `${opp.assigned_to_detail.first_name} ${opp.assigned_to_detail.last_name}`}
                                className="h-5 w-5 rounded-full bg-orange-950/70 border border-orange-800/40 flex items-center justify-center text-[9px] font-bold text-orange-400"
                              >
                                {(opp.assigned_to_detail.first_name?.[0] ?? "").toUpperCase()}{(opp.assigned_to_detail.last_name?.[0] ?? "").toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })}
                  {STAGE_KEYS.every(k => !kanbanData[k] || kanbanData[k]!.opportunities.length === 0) && (
                    <div className="flex flex-col items-center gap-3 py-16">
                      <TrendingUp className="h-10 w-10 text-slate-700" />
                      <p className="text-slate-400 text-sm">No hay oportunidades.</p>
                      <Button size="sm" onClick={() => { setDefaultStage("new"); setFormError(""); setShowCreate(true); }}
                        className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white">
                        <Plus className="h-4 w-4" /> Nueva oportunidad
                      </Button>
                    </div>
                  )}
                </div>

                {/* Desktop kanban — hidden on mobile */}
                <div className="hidden md:block overflow-x-auto pb-4">
                  <div className="flex gap-3" style={{ minWidth: `${STAGE_KEYS.length * 272}px` }}>
                    {STAGE_KEYS.map(stageKey => {
                      const col  = kanbanData[stageKey];
                      const meta = STAGE_META[stageKey];
                      return (
                        <div key={stageKey} className={`w-64 flex-shrink-0 rounded-2xl border ${meta.border} bg-slate-950/60`}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => {
                            e.preventDefault();
                            const id = e.dataTransfer.getData("oppId");
                            if (id) handleMoveStage(id, stageKey);
                          }}>
                          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                              <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                              <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-400 font-medium">
                                {col?.count ?? 0}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-600">{formatCurrency(col?.total_amount ?? 0)}</span>
                              <button
                                onClick={() => { setDefaultStage(stageKey); setFormError(""); setShowCreate(true); }}
                                className="rounded-lg p-1 text-slate-600 hover:bg-slate-800 hover:text-orange-400 transition-colors">
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div className="p-3 space-y-2.5 min-h-[120px]">
                            {!col || col.opportunities.length === 0
                              ? <p className="py-8 text-center text-xs text-slate-700">Sin oportunidades</p>
                              : col.opportunities.map(opp => (
                                  <OppKanbanCard key={opp.id} opp={opp} slaMap={slaMap}
                                    onEdit={() => { setFormError(""); setEditOpp(opp); }}
                                    onDelete={() => handleDelete(opp)}
                                    onDragStart={e => e.dataTransfer.setData("oppId", String(opp.id))}
                                    deleting={deleting === opp.id}
                                    onConvertToCustomer={() => handleConvertToCustomer(opp)}
                                    convertingCustomer={convertingCust === opp.id}
                                  />
                                ))
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p className="hidden md:block lg:hidden mt-2 text-center text-xs text-slate-500">
                  ← Desliza horizontalmente para ver todas las etapas →
                </p>
                </>

              ) : (

                /* ── LIST ── */
                <div className="rounded-2xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden">
                  {listOpps.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-24">
                      <TrendingUp className="h-10 w-10 text-slate-700" />
                      <p className="text-slate-400">{hasFilters ? "Sin resultados para los filtros aplicados." : "No hay oportunidades."}</p>
                      {hasFilters
                        ? <button onClick={clearFilters} className="text-xs text-orange-400 hover:text-orange-300">Limpiar filtros</button>
                        : <Button size="sm" onClick={() => { setDefaultStage("new"); setShowCreate(true); }}
                            className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white">
                            <Plus className="h-4 w-4" /> Nueva oportunidad
                          </Button>
                      }
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead className="border-b border-slate-800 bg-slate-900/80">
                          <tr>
                            <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Título</th>
                            <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Etapa</th>
                            <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Valor</th>
                            <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Prob.</th>
                            <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cierre estimado</th>
                            <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</th>
                            <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {listOpps.map(opp => {
                            const meta    = STAGE_META[opp.stage];
                            const amount  = parseFloat(String(opp.amount));
                            const over    = opp.stage !== "won" && opp.stage !== "lost" && isOverdue(opp.expected_close_date);
                            return (
                              <tr key={opp.id} className="hover:bg-slate-900/40 transition-colors group">
                                <td className="px-4 py-3.5 max-w-[220px]">
                                  <p className={`font-medium truncate ${opp.stage === "lost" ? "line-through text-slate-500" : "text-slate-200"}`}>
                                    {opp.title}
                                  </p>
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className={`flex items-center gap-1.5 text-xs font-medium ${meta.color}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className="text-sm font-bold text-orange-500">{formatCurrency(amount)}</span>
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-1 w-12 rounded-full bg-slate-800">
                                      <div className="h-1 rounded-full bg-orange-500" style={{ width: `${opp.probability}%` }} />
                                    </div>
                                    <span className="text-xs text-slate-500">{opp.probability}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5">
                                  {opp.expected_close_date
                                    ? <span className={`flex items-center gap-1 text-xs ${over ? "text-red-400" : "text-slate-500"}`}>
                                        {over && <AlertTriangle className="h-3 w-3" />}
                                        {fmtDate(opp.expected_close_date)}
                                      </span>
                                    : <span className="text-slate-700">—</span>}
                                </td>
                                <td className="px-4 py-3.5">
                                  {opp.customer_name
                                    ? <span className="text-xs text-slate-400 truncate max-w-[120px] block">{opp.customer_name}</span>
                                    : <span className="text-slate-700">—</span>}
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center justify-end gap-1">
                                    {opp.stage === "won" && opp.lead && (
                                      <button onClick={() => handleConvertToCustomer(opp)} disabled={convertingCust === opp.id}
                                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-green-400 hover:bg-green-950/30 hover:text-green-300 disabled:opacity-40 transition-colors">
                                        {convertingCust === opp.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                                        <span className="hidden sm:inline">A Cliente</span>
                                      </button>
                                    )}
                                    <button onClick={() => { setFormError(""); setEditOpp(opp); }}
                                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-orange-400 transition-colors">
                                      <Pencil className="h-3.5 w-3.5" />
                                      <span className="hidden sm:inline">Editar</span>
                                    </button>
                                    <button onClick={() => handleDelete(opp)} disabled={deleting === opp.id}
                                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-red-950/30 hover:text-red-400 disabled:opacity-40 transition-colors">
                                      {deleting === opp.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                      <span className="hidden sm:inline">Eliminar</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      </div>
                      <Pagination page={page} totalPages={totalPages} total={listTotal} onPage={setPage} />
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Config tab ── */}
          {activeTab === "config" && (
            <ConfigTab onEditPipeline={handleEditPipeline} />
          )}

        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <OppFormModal defaultStage={createDefaultStage} onClose={() => setShowCreate(false)}
          onSave={handleCreate} saving={formSaving} error={formError} />
      )}
      {editOpp && (
        <OppFormModal initial={editOpp} onClose={() => setEditOpp(null)}
          onSave={handleEdit} saving={formSaving} error={formError} />
      )}
    </div>
  );
}
