"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";
import { crmApi, PipelineTemplate, PipelineStage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft, Plus, Trash2, GripVertical, Pencil, ArrowRight,
  TrendingUp, Target, DollarSign, Trophy, AlertTriangle, Info,
} from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function KpiCards() {
  const { tokens, organization } = useAuthStore();

  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => crmApi.getDashboard(tokens!.access, organization!.id),
    enabled: !!tokens && !!organization,
  });

  const cards = [
    {
      label: "Leads activos",
      value: data?.sales.total_leads ?? "—",
      icon: TrendingUp,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      label: "Tasa de conversión",
      value: data ? `${data.conversion.lead_conversion_rate.toFixed(1)}%` : "—",
      icon: Target,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-950/40",
    },
    {
      label: "Valor del pipeline",
      value: data ? formatCurrency(data.revenue.pipeline_value) : "—",
      icon: DollarSign,
      color: "text-green-500",
      bg: "bg-green-50 dark:bg-green-950/40",
    },
    {
      label: "Cierres del mes",
      value: data?.sales.won_deals ?? "—",
      icon: Trophy,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-950/40",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div
          key={label}
          className="rounded-xl border border-slate-800 bg-slate-950 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-400">{label}</p>
            <div className={`rounded-lg p-2 ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── SLA helpers ──────────────────────────────────────────────────────────────

// Fallback hardcodeado si el stage no tiene sla_hours configurado
const SLA_FALLBACK: Record<string, number | null> = {
  new: 24, contacted: 48, qualified: 72,
  proposal: 72, negotiation: 48, won: null, lost: null,
};
const OPP_SLA_ACTION: Record<string, string> = {
  new: "Contactar", contacted: "Calificar", qualified: "Propuesta",
  proposal: "Seguimiento", negotiation: "Cerrar",
};

// slaMap: slug → sla_hours (construido desde los stages del pipeline activo)
function getOppSLA(opp: { stage: string; updated_at?: string; created_at?: string }, slaMap?: Record<string, number | null>) {
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

function KanbanSLABadge({ opp, slaMap }: { opp: { stage: string; updated_at?: string; created_at?: string }; slaMap?: Record<string, number | null> }) {
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
      {sla.light === "red"
        ? <AlertTriangle className="h-2.5 w-2.5" />
        : <Info className="h-2.5 w-2.5 opacity-70" />
      }
    </div>
  );
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────

const DEFAULT_STAGES = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];
const STAGE_LABELS: Record<string, string> = {
  new: "Nuevo", contacted: "Contactado", qualified: "Calificado",
  proposal: "Propuesta", negotiation: "Negociación", won: "Ganado", lost: "Perdido",
};

function KanbanBoard() {
  const { tokens, organization } = useAuthStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["pipeline-kanban"],
    queryFn: () => crmApi.getPipeline(tokens!.access, organization!.id),
    enabled: !!tokens && !!organization,
  });

  // Carga los pipelines para extraer sla_hours por slug de etapa
  const { data: pipelines } = useQuery({
    queryKey: ["pipelines"],
    queryFn: () => crmApi.getPipelines(tokens!.access, organization!.id),
    enabled: !!tokens && !!organization,
  });

  // Construye mapa slug → sla_hours desde el pipeline por defecto (o el primero disponible)
  const slaMap: Record<string, number | null> = {};
  const defaultPipeline = pipelines?.find(p => p.is_default) ?? pipelines?.[0];
  if (defaultPipeline) {
    for (const stage of defaultPipeline.stages) {
      slaMap[stage.slug] = stage.sla_hours ?? null;
    }
  }

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      crmApi.updateOpportunityStage(tokens!.access, organization!.id, id, stage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pipeline-kanban"] }),
  });

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex gap-3 min-w-max pb-4">
      {DEFAULT_STAGES.map((stage) => {
        const col = data?.[stage];
        const isWon = stage === "won";
        const isLost = stage === "lost";
        return (
          <div
            key={stage}
            className="w-64 flex-shrink-0 rounded-xl bg-slate-900 p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const oppId = e.dataTransfer.getData("oppId");
              if (oppId) moveMutation.mutate({ id: oppId, stage });
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className={`text-xs font-semibold uppercase tracking-wide ${
                isWon ? "text-green-600 dark:text-green-400" :
                isLost ? "text-red-500 dark:text-red-400" :
                "text-slate-300"
              }`}>
                {STAGE_LABELS[stage] ?? stage}
              </h3>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300 shadow-sm">
                {col?.count ?? 0}
              </span>
            </div>
            <p className="mb-3 text-xs text-slate-400">{formatCurrency(col?.total_amount ?? 0)}</p>
            <div className="space-y-2">
              {col?.opportunities.map((opp) => (
                <div
                  key={opp.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("oppId", String(opp.id))}
                  className="cursor-grab rounded-lg border border-slate-800 bg-slate-950 p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
                >
                  {/* Title */}
                  <p className="text-sm font-medium text-slate-200 leading-snug">{opp.title}</p>

                  {/* Customer */}
                  {opp.customer_name && (
                    <p className="mt-0.5 text-[10px] text-slate-500 truncate">{opp.customer_name}</p>
                  )}

                  {/* Amount + prob bar */}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-orange-500">{formatCurrency(parseFloat(String(opp.amount)))}</p>
                    <div className="flex items-center gap-1 cursor-help" title={`Probabilidad de cierre: ${opp.probability}%`}>
                      <div className="h-1 w-12 rounded-full bg-slate-800">
                        <div className="h-1 rounded-full bg-orange-500" style={{ width: `${opp.probability}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-500">{opp.probability}%</span>
                    </div>
                  </div>

                  {/* SLA badge */}
                  <div className="mt-2">
                    <KanbanSLABadge opp={opp} slaMap={slaMap} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
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
  const queryClient = useQueryClient();
  const [name, setName] = useState(stage.name);
  const [probability, setProbability] = useState(String(stage.probability ?? 0));
  const [slaHours, setSlaHours] = useState(stage.sla_hours != null ? String(stage.sla_hours) : "");
  const [color, setColor] = useState(stage.color);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<PipelineStage>) =>
      crmApi.updateStage(token, orgId, pipelineId, stage.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pipelines"] }),
  });

  const removeMutation = useMutation({
    mutationFn: () => crmApi.removeStage(token, orgId, pipelineId, stage.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pipelines"] }),
  });

  const save = useCallback(() => {
    const prob = Math.min(100, Math.max(0, parseInt(probability) || 0));
    const sla  = slaHours.trim() === "" ? null : Math.max(1, parseInt(slaHours) || 1);
    updateMutation.mutate({ name: name.trim() || stage.name, probability: prob, color, sla_hours: sla });
  }, [name, probability, slaHours, color, stage.name]);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={onDrop}
      className={`flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 transition-opacity ${
        draggingIdx === index ? "opacity-40" : ""
      }`}
    >
      {/* Drag handle */}
      <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-slate-600 active:cursor-grabbing" />

      {/* Stage number */}
      <span className="w-5 flex-shrink-0 text-xs font-semibold text-slate-400">{index + 1}</span>

      {/* Name */}
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        className="h-8 flex-1 text-sm"
      />

      {/* Probability */}
      <div className="flex items-center gap-1" title="Probabilidad de cierre por defecto">
        <Input
          type="number"
          min="0"
          max="100"
          value={probability}
          onChange={(e) => setProbability(e.target.value)}
          onBlur={save}
          className="h-8 w-16 text-center text-sm font-semibold text-orange-600"
        />
        <span className="text-xs text-slate-400">%</span>
      </div>

      {/* SLA */}
      <div className="flex items-center gap-1" title="Plazo máximo de atención (horas). Vacío = sin límite.">
        <Input
          type="number"
          min="1"
          value={slaHours}
          onChange={(e) => setSlaHours(e.target.value)}
          onBlur={save}
          placeholder="—"
          className="h-8 w-16 text-center text-sm font-semibold text-blue-400 placeholder:text-slate-600"
        />
        <span className="text-xs text-slate-400">h</span>
      </div>

      {/* Color */}
      <div className="flex items-center gap-1.5">
        <span className="h-4 w-4 rounded-full border border-slate-200" style={{ backgroundColor: color }} />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          onBlur={save}
          className="h-7 w-7 cursor-pointer rounded border border-slate-200 p-0.5"
          title="Color de etapa"
        />
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => removeMutation.mutate()}
        disabled={removeMutation.isPending}
        className="flex-shrink-0 text-slate-600 transition-colors hover:text-red-500"
        title="Eliminar etapa"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Stage Editor (drill-down view) ──────────────────────────────────────────

interface StageEditorProps {
  pipeline: PipelineTemplate;
  token: string;
  orgId: string;
  onBack: () => void;
}

function StageEditor({ pipeline, token, orgId, onBack }: StageEditorProps) {
  const queryClient = useQueryClient();
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>(pipeline.stages);

  // Keep local stages in sync when query refreshes
  const { data: freshPipeline } = useQuery({
    queryKey: ["pipelines"],
    queryFn: () => crmApi.getPipelines(token, orgId),
    select: (data) => data.find((p) => p.id === pipeline.id),
  });

  // Sync stages from server when pipeline data refreshes
  const currentStages = freshPipeline?.stages ?? stages;

  // Inline pipeline name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(freshPipeline?.name ?? pipeline.name);

  const renameMutation = useMutation({
    mutationFn: (name: string) => crmApi.updatePipeline(token, orgId, pipeline.id, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pipelines"] }),
  });

  const commitName = () => {
    setEditingName(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== (freshPipeline?.name ?? pipeline.name)) {
      renameMutation.mutate(trimmed);
    } else {
      setNameValue(freshPipeline?.name ?? pipeline.name);
    }
  };

  // New stage form
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6B7280");
  const [newProb, setNewProb] = useState("50");
  const [addError, setAddError] = useState("");

  const addMutation = useMutation({
    mutationFn: (data: Partial<PipelineStage>) =>
      crmApi.addStage(token, orgId, pipeline.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      setNewName("");
      setNewProb("50");
      setNewColor("#6B7280");
      setAddError("");
    },
    onError: (err: Error) => setAddError(err.message),
  });

  const handleAddStage = () => {
    if (!newName.trim()) { setAddError("El nombre es obligatorio."); return; }
    const prob = Math.min(100, Math.max(0, parseInt(newProb) || 0));
    addMutation.mutate({ name: newName.trim(), color: newColor, probability: prob });
  };

  // Drag-to-reorder (local visual only, persist on drop via order field if API supports)
  const handleDragStart = (_: React.DragEvent, idx: number) => setDraggingIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setOverIdx(idx); };
  const handleDrop = () => {
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
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Regresar
        </button>
        <span className="text-slate-600">/</span>
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setEditingName(false); setNameValue(freshPipeline?.name ?? pipeline.name); } }}
            className="rounded-md border border-orange-400 bg-slate-900 px-2 py-0.5 text-base font-semibold text-slate-100 outline-none ring-2 ring-orange-400/30"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="group flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-slate-800"
            title="Editar nombre"
          >
            <h2 className="text-base font-semibold text-slate-100">
              {freshPipeline?.name ?? pipeline.name}
            </h2>
            <Pencil className="h-3.5 w-3.5 text-slate-600 transition-colors group-hover:text-orange-500" />
          </button>
        )}
      </div>

      {/* Section label + column headers */}
      <div className="mb-2">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Etapas del proceso</p>
        <div className="flex items-center gap-3 px-4 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          <span className="w-4 shrink-0" />
          <span className="w-5 shrink-0">#</span>
          <span className="flex-1">Nombre</span>
          <span className="w-16 text-center">Prob.</span>
          <span className="w-16 text-center" title="Horas máximas de atención (SLA)">SLA (h)</span>
          <span className="w-16 text-center">Color</span>
          <span className="w-4" />
        </div>
      </div>

      {/* Stage list */}
      <div className="space-y-2 mb-4">
        {currentStages.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">No hay etapas. Añade la primera.</p>
        )}
        {currentStages.map((stage, idx) => (
          <StageRow
            key={stage.id}
            stage={stage}
            index={idx}
            token={token}
            orgId={orgId}
            pipelineId={pipeline.id}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            draggingIdx={draggingIdx}
          />
        ))}
      </div>

      {/* Add stage row */}
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900 px-4 py-3">
        <p className="mb-2 text-xs font-medium text-slate-400">Nueva etapa</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de la etapa"
            className="h-8 w-44 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleAddStage()}
          />
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="0"
              max="100"
              value={newProb}
              onChange={(e) => setNewProb(e.target.value)}
              className="h-8 w-16 text-center text-sm font-semibold text-orange-600"
            />
            <span className="text-xs text-slate-400">%</span>
          </div>
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded border border-slate-200 p-0.5"
          />
          <Button
            size="sm"
            onClick={handleAddStage}
            disabled={addMutation.isPending}
            className="h-8 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {addMutation.isPending ? "Añadiendo..." : "Añadir Etapa"}
          </Button>
        </div>
        {addError && <p className="mt-1.5 text-xs text-red-500">{addError}</p>}
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Regresar
        </button>
        <Button
          className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold"
          onClick={onBack}
        >
          Guardar Arquitectura
        </Button>
      </div>
    </div>
  );
}

// ─── Create Pipeline Form (modal) ─────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: "sales" as const,     label: "Ventas" },
  { value: "post_sale" as const, label: "Post-Venta" },
  { value: "loyalty" as const,   label: "Fidelización" },
  { value: "custom" as const,    label: "Personalizado" },
];

interface CreatePipelineModalProps {
  token: string;
  orgId: string;
  onClose: () => void;
}

function CreatePipelineModal({ token, orgId, onClose }: CreatePipelineModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pipelineType, setPipelineType] = useState<PipelineTemplate["pipeline_type"]>("sales");
  const [color, setColor] = useState("#EA580C");
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: Partial<PipelineTemplate>) => crmApi.createPipeline(token, orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("El nombre es obligatorio."); return; }
    setError("");
    createMutation.mutate({ name: name.trim(), description, pipeline_type: pipelineType, color });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <h2 className="mb-4 text-base font-semibold text-slate-100">Nuevo Pipeline</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Nombre</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Pipeline de Ventas B2B"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Tipo</label>
            <Select value={pipelineType} onValueChange={(v) => setPipelineType(v as PipelineTemplate["pipeline_type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Descripción</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border border-slate-700"
              />
              <span className="text-xs text-slate-400">{color}</span>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {createMutation.isPending ? "Creando..." : "Crear Pipeline"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Configuración Tab ────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  sales: "Ventas", post_sale: "Post-Venta", loyalty: "Fidelización", custom: "Personalizado",
};

interface ConfigTabProps {
  onEditPipeline: (pipeline: PipelineTemplate) => void;
}

function ConfigTab({ onEditPipeline }: ConfigTabProps) {
  const { tokens, organization } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: pipelines, isLoading, error } = useQuery({
    queryKey: ["pipelines"],
    queryFn: () => crmApi.getPipelines(tokens!.access, organization!.id),
    enabled: !!tokens && !!organization,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deletePipeline(tokens!.access, organization!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      setConfirmDelete(null);
    },
  });

  if (!tokens || !organization) return null;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Gestiona las arquitecturas de pipeline para estructurar tu proceso de ventas.
        </p>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Nuevo Pipeline
        </Button>
      </div>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Error al cargar los pipelines.
        </div>
      )}

      {!isLoading && !error && (!pipelines || pipelines.length === 0) && (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950 p-16 text-center">
          <p className="text-sm text-slate-400">
            No hay pipelines creados. Crea el primero con el botón de arriba.
          </p>
        </div>
      )}

      {!isLoading && pipelines && pipelines.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pipelines.map((pipeline) => (
            <div
              key={pipeline.id}
              className="group relative rounded-2xl border border-slate-800 bg-slate-950 p-5 transition-all hover:border-orange-500/50 hover:shadow-lg cursor-pointer"
              onClick={() => onEditPipeline(pipeline)}
            >
              {/* Color accent */}
              <span
                className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full"
                style={{ backgroundColor: pipeline.color }}
              />

              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-lg font-black uppercase tracking-tight text-white">
                    {pipeline.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {pipeline.stages.length} etapa{pipeline.stages.length !== 1 ? "s" : ""} activa{pipeline.stages.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(pipeline.id); }}
                  className="text-slate-500 transition-colors hover:text-red-400"
                  title="Eliminar pipeline"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs bg-slate-400 text-slate-900 border-slate-700">
                  {TYPE_LABELS[pipeline.pipeline_type]}
                </Badge>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-orange-400 transition-colors" />
              </div>

              {/* Stage pills */}
              {pipeline.stages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {pipeline.stages.slice(0, 4).map((s) => (
                    <span
                      key={s.id}
                      className="h-1.5 flex-1 min-w-4 rounded-full"
                      style={{ backgroundColor: s.color }}
                      title={s.name}
                    />
                  ))}
                  {pipeline.stages.length > 4 && (
                    <span className="text-xs text-slate-500">+{pipeline.stages.length - 4}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDelete(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-semibold text-slate-100">¿Eliminar pipeline?</h3>
            <p className="mb-4 text-sm text-slate-400">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(confirmDelete)}
              >
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <CreatePipelineModal
          token={tokens.access}
          orgId={organization.id}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "kanban" | "config";
type View = { type: "tabs" } | { type: "stage-editor"; pipeline: PipelineTemplate };

export default function PipelinePage() {
  const [activeTab, setActiveTab] = useState<Tab>("kanban");
  const [view, setView] = useState<View>({ type: "tabs" });
  const { tokens, organization } = useAuthStore();

  const handleEditPipeline = useCallback((pipeline: PipelineTemplate) => {
    setView({ type: "stage-editor", pipeline });
  }, []);

  const handleBack = useCallback(() => {
    setView({ type: "tabs" });
  }, []);

  if (view.type === "stage-editor" && tokens && organization) {
    return (
      <>
        <DashboardHeader title="Pipeline" />
        <div className="flex-1 overflow-y-auto p-6">
          <StageEditor
            pipeline={view.pipeline}
            token={tokens.access}
            orgId={organization.id}
            onBack={handleBack}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader title="Pipeline" />
      <div className="flex-1 overflow-x-auto p-6">
        <KpiCards />

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 w-fit dark:border-slate-700 dark:bg-slate-800">
          {(["kanban", "config"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab === "kanban" ? "Pipeline Board" : "Configuración"}
            </button>
          ))}
        </div>

        {activeTab === "kanban" && <KanbanBoard />}
        {activeTab === "config" && <ConfigTab onEditPipeline={handleEditPipeline} />}
      </div>
    </>
  );
}
