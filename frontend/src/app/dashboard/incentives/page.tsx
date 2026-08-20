"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth";
import { crmApi, type IncentiveProgram, type CustomerSegment } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  Plus, X, Loader2, Pencil, Trash2, Gift, Star,
  Percent, Coins, PackageCheck, Search, ToggleLeft, ToggleRight,
} from "lucide-react";

// ─── Constantes ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  points:   "Puntos",
  discount: "Descuento",
  gift:     "Regalo",
  cashback:  "Cashback",
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  points:   Coins,
  discount: Percent,
  gift:     Gift,
  cashback: PackageCheck,
};

const TYPE_COLORS: Record<string, string> = {
  points:   "text-blue-400 bg-blue-950/50 border-blue-700",
  discount: "text-green-400 bg-green-950/50 border-green-700",
  gift:     "text-purple-400 bg-purple-950/50 border-purple-700",
  cashback: "text-orange-400 bg-orange-950/50 border-orange-700",
};

const SEGMENT_LABELS: Record<string, string> = {
  all:      "Todos",
  basic:    "Básico",
  frequent: "Frecuente",
  vip:      "VIP",
  premium:  "Premium",
};

const selectCls = "w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-orange-500 focus:outline-none";

const EMPTY_FORM: Partial<IncentiveProgram> = {
  name:           "",
  description:    "",
  program_type:   "points",
  target_segment: "all",
  min_amount:     "0",
  reward_value:   "0",
  is_active:      true,
  start_date:     new Date().toISOString().slice(0, 10),
  end_date:       null,
};

// ─── Program Card ─────────────────────────────────────────────────────────────

function ProgramCard({
  program, onEdit, onDelete, onToggle,
}: {
  program: IncentiveProgram;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const Icon = TYPE_ICONS[program.program_type] ?? Gift;
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Card className="bg-slate-950 border-slate-800 hover:border-slate-700 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${TYPE_COLORS[program.program_type]}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-100 truncate">{program.name}</h3>
              {program.description && (
                <p className="text-xs text-slate-500 truncate mt-0.5">{program.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onToggle} title={program.is_active ? "Desactivar" : "Activar"}
              className={`transition-colors ${program.is_active ? "text-green-400 hover:text-green-300" : "text-slate-600 hover:text-slate-400"}`}>
              {program.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
            </button>
            <button onClick={onEdit} className="text-slate-500 hover:text-orange-400 transition-colors p-1">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setConfirmDelete(true)} className="text-slate-500 hover:text-red-400 transition-colors p-1">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[program.program_type]}`}>
            <Icon className="h-3 w-3" /> {TYPE_LABELS[program.program_type]}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-400">
            <Star className="h-3 w-3" /> {SEGMENT_LABELS[program.target_segment] ?? program.target_segment}
          </span>
          <Badge variant={program.is_active ? "success" : "secondary"}>
            {program.is_active ? "Activo" : "Inactivo"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-slate-800 bg-slate-900 px-2 py-1.5">
            <p className="text-slate-500">Consumo mínimo</p>
            <p className="font-medium text-slate-200 mt-0.5">{formatCurrency(parseFloat(program.min_amount))}</p>
          </div>
          <div className="rounded border border-slate-800 bg-slate-900 px-2 py-1.5">
            <p className="text-slate-500">Valor del beneficio</p>
            <p className="font-medium text-slate-200 mt-0.5">
              {program.program_type === "discount" || program.program_type === "cashback"
                ? `${program.reward_value}%`
                : formatCurrency(parseFloat(program.reward_value))}
            </p>
          </div>
        </div>

        <div className="mt-2 text-xs text-slate-600">
          {new Date(program.start_date).toLocaleDateString("es-GT")}
          {program.end_date ? ` → ${new Date(program.end_date).toLocaleDateString("es-GT")}` : " → Sin fecha fin"}
        </div>

        {confirmDelete && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-900 bg-red-950/30 px-3 py-2">
            <span className="flex-1 text-xs text-red-400">¿Eliminar programa?</span>
            <Button size="sm" variant="outline" className="h-6 border-slate-700 text-slate-400 text-xs"
              onClick={() => setConfirmDelete(false)}>No</Button>
            <Button size="sm" className="h-6 bg-red-600 hover:bg-red-700 text-white text-xs"
              onClick={onDelete}>Sí</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function ProgramForm({
  initial, onSave, onClose, isSaving,
}: {
  initial: Partial<IncentiveProgram>;
  onSave: (data: Partial<IncentiveProgram>) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<Partial<IncentiveProgram>>(initial);

  const set = (key: keyof IncentiveProgram, val: unknown) =>
    setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-100">
            {initial.id ? "Editar programa" : "Nuevo programa de incentivos"}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Nombre *</label>
            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="Nombre del programa" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Descripción</label>
            <textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)}
              rows={2} placeholder="Descripción breve del programa..."
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 resize-none focus:border-orange-500 focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Tipo de incentivo</label>
              <select value={form.program_type} onChange={(e) => set("program_type", e.target.value)} className={selectCls}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Segmento objetivo</label>
              <select value={form.target_segment} onChange={(e) => set("target_segment", e.target.value as "all" | CustomerSegment)} className={selectCls}>
                {Object.entries(SEGMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Consumo mínimo para calificar</label>
              <Input type="number" step="0.01" value={form.min_amount ?? "0"}
                onChange={(e) => set("min_amount", e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Valor del beneficio {form.program_type === "discount" || form.program_type === "cashback" ? "(%)" : "(Q)"}
              </label>
              <Input type="number" step="0.01" value={form.reward_value ?? "0"}
                onChange={(e) => set("reward_value", e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Fecha inicio *</label>
              <input type="date" value={form.start_date ?? ""} onChange={(e) => set("start_date", e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-orange-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Fecha fin (opcional)</label>
              <input type="date" value={form.end_date ?? ""} onChange={(e) => set("end_date", e.target.value || null)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-orange-500 focus:outline-none" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active ?? true}
              onChange={(e) => set("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-orange-500" />
            <span className="text-sm text-slate-300">Programa activo</span>
          </label>
        </div>

        <div className="flex gap-2 mt-6">
          <Button className="bg-orange-600 hover:bg-orange-500 text-white"
            disabled={!form.name || !form.start_date || isSaving}
            onClick={() => onSave(form)}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar programa"}
          </Button>
          <Button variant="outline" className="border-slate-700 text-slate-300" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IncentivesPage() {
  const { tokens, organization } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch]           = useState("");
  const [typeFilter, setTypeFilter]   = useState("");
  const [showForm, setShowForm]       = useState(false);
  const [editing, setEditing]         = useState<IncentiveProgram | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["incentives", search, typeFilter],
    queryFn:  () => {
      const qs = new URLSearchParams();
      if (search)     qs.set("search",       search);
      if (typeFilter) qs.set("program_type", typeFilter);
      const q = qs.toString();
      return crmApi.getIncentives(tokens!.access, organization!.id, q || undefined);
    },
    enabled: !!tokens && !!organization,
  });

  const createMutation = useMutation({
    mutationFn: (d: Partial<IncentiveProgram>) => crmApi.createIncentive(tokens!.access, organization!.id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["incentives"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IncentiveProgram> }) =>
      crmApi.updateIncentive(tokens!.access, organization!.id, id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["incentives"] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteIncentive(tokens!.access, organization!.id, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incentives"] }),
  });

  const programs = data?.results ?? [];

  return (
    <>
      <DashboardHeader title="Programas de Incentivos" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9 w-full sm:w-52" placeholder="Buscar programas..." value={search}
                onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-300">
              <option value="">Todos los tipos</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}
            className="gap-2 bg-orange-600 hover:bg-orange-500 text-white">
            <Plus className="h-4 w-4" /> Nuevo programa
          </Button>
        </div>

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(TYPE_LABELS).map(([type, label]) => {
            const count = programs.filter(p => p.program_type === type && p.is_active).length;
            const Icon  = TYPE_ICONS[type];
            return (
              <div key={type} className={`rounded-xl border p-3 ${TYPE_COLORS[type]}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs opacity-70">activos</p>
              </div>
            );
          })}
        </div>

        {/* Programs grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 rounded-xl border border-slate-800 bg-slate-950 animate-pulse" />
            ))}
          </div>
        ) : programs.length === 0 ? (
          <div className="py-20 text-center">
            <Gift className="mx-auto h-12 w-12 text-slate-700 mb-3" />
            <p className="text-slate-400 font-medium">Sin programas de incentivos</p>
            <p className="text-sm text-slate-600 mt-1">Crea tu primer programa para fidelizar clientes</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map(program => (
              <ProgramCard key={program.id} program={program}
                onEdit={() => { setEditing(program); setShowForm(true); }}
                onDelete={() => deleteMutation.mutate(program.id)}
                onToggle={() => updateMutation.mutate({ id: program.id, data: { is_active: !program.is_active } })}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <ProgramForm
          initial={editing ?? EMPTY_FORM}
          onClose={() => { setShowForm(false); setEditing(null); }}
          isSaving={createMutation.isPending || updateMutation.isPending}
          onSave={(d) => {
            if (editing) {
              updateMutation.mutate({ id: editing.id, data: d });
            } else {
              createMutation.mutate(d);
            }
          }}
        />
      )}
    </>
  );
}
