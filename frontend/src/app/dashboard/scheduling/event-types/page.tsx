"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { schedulingApi, type EventType, type EventTypeColor } from "@/lib/api";
import {
  Plus, X, Loader2, Pencil, Trash2, Copy, Check,
  CalendarDays, Clock, Users, ToggleLeft, ToggleRight, Link2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Color config ─────────────────────────────────────────────────────────────

const COLOR_OPTIONS: { value: EventTypeColor; label: string; dot: string; ring: string }[] = [
  { value: "slate",  label: "Gris",     dot: "bg-slate-400",  ring: "ring-slate-400"  },
  { value: "blue",   label: "Azul",     dot: "bg-blue-500",   ring: "ring-blue-500"   },
  { value: "green",  label: "Verde",    dot: "bg-green-500",  ring: "ring-green-500"  },
  { value: "orange", label: "Naranja",  dot: "bg-orange-500", ring: "ring-orange-500" },
  { value: "red",    label: "Rojo",     dot: "bg-red-500",    ring: "ring-red-500"    },
];

const DOT: Record<EventTypeColor, string> = {
  slate:  "bg-slate-400",
  blue:   "bg-blue-500",
  green:  "bg-green-500",
  orange: "bg-orange-500",
  red:    "bg-red-500",
};

// ─── Default form state ───────────────────────────────────────────────────────

type ETForm = {
  title: string;
  slug: string;
  description: string;
  duration_minutes: number;
  buffer_minutes: number;
  color: EventTypeColor;
  location: string;
  instructions: string;
  requires_confirmation: boolean;
  min_notice_hours: number;
  max_notice_days: number;
  is_active: boolean;
};

const DEFAULT_FORM: ETForm = {
  title: "",
  slug: "",
  description: "",
  duration_minutes: 30,
  buffer_minutes: 0,
  color: "blue",
  location: "",
  instructions: "",
  requires_confirmation: false,
  min_notice_hours: 1,
  max_notice_days: 60,
  is_active: true,
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

// ─── Slide-over form ──────────────────────────────────────────────────────────

function EventTypeForm({
  initial,
  onClose,
  onSave,
  saving,
}: {
  initial?: EventType;
  onClose: () => void;
  onSave: (data: Partial<EventType>) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<ETForm>(
    initial
      ? {
          title: initial.title,
          slug: initial.slug,
          description: initial.description,
          duration_minutes: initial.duration_minutes,
          buffer_minutes: initial.buffer_minutes,
          color: initial.color,
          location: initial.location,
          instructions: initial.instructions,
          requires_confirmation: initial.requires_confirmation,
          min_notice_hours: initial.min_notice_hours,
          max_notice_days: initial.max_notice_days,
          is_active: initial.is_active,
        }
      : DEFAULT_FORM
  );

  const set = <K extends keyof ETForm>(k: K, v: ETForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleTitleChange = (v: string) => {
    set("title", v);
    if (!initial) set("slug", slugify(v));
  };

  const inputCls =
    "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20";
  const selectCls =
    "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20";
  const labelCls = "mb-1 block text-xs font-medium text-slate-400";

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${checked ? "bg-orange-600" : "bg-slate-700"}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400">
              {initial ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            </div>
            <h2 className="font-semibold text-slate-100 text-sm">
              {initial ? "Editar tipo de evento" : "Nuevo tipo de evento"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Title + Slug */}
          <div>
            <label className={labelCls}>Título *</label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ej. Reunión de consulta, Demo del producto…"
              autoFocus
            />
          </div>
          <div>
            <label className={labelCls}>Slug (URL)</label>
            <input
              className={inputCls}
              value={form.slug}
              onChange={(e) => set("slug", slugify(e.target.value))}
              placeholder="reunion-de-consulta"
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe brevemente esta cita…"
            />
          </div>

          {/* Duration + Buffer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Duración</label>
              <select
                className={selectCls}
                value={form.duration_minutes}
                onChange={(e) => set("duration_minutes", Number(e.target.value))}
              >
                {[15, 30, 45, 60, 90].map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Pausa entre citas</label>
              <select
                className={selectCls}
                value={form.buffer_minutes}
                onChange={(e) => set("buffer_minutes", Number(e.target.value))}
              >
                {[0, 5, 10, 15].map((m) => (
                  <option key={m} value={m}>{m === 0 ? "Sin pausa" : `${m} min`}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Color */}
          <div>
            <label className={labelCls}>Color</label>
            <div className="flex gap-2 mt-1">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set("color", c.value)}
                  title={c.label}
                  className={`h-7 w-7 rounded-full ${c.dot} transition-all ${form.color === c.value ? `ring-2 ring-offset-2 ring-offset-slate-900 ${c.ring}` : "opacity-60 hover:opacity-100"}`}
                />
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className={labelCls}>Ubicación / enlace</label>
            <input
              className={inputCls}
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Google Meet, Zoom, Oficina…"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className={labelCls}>Instrucciones para el invitado</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={form.instructions}
              onChange={(e) => set("instructions", e.target.value)}
              placeholder="Ej. Por favor llega 5 minutos antes…"
            />
          </div>

          {/* Notice */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Aviso mínimo (horas)</label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={form.min_notice_hours}
                onChange={(e) => set("min_notice_hours", Number(e.target.value))}
              />
            </div>
            <div>
              <label className={labelCls}>Reserva máxima (días)</label>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={form.max_notice_days}
                onChange={(e) => set("max_notice_days", Number(e.target.value))}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Requiere confirmación</p>
                <p className="text-xs text-slate-500">Las reservas quedan pendientes hasta que las aceptes</p>
              </div>
              <Toggle
                checked={form.requires_confirmation}
                onChange={(v) => set("requires_confirmation", v)}
              />
            </div>
            <div className="h-px bg-slate-800" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Activo</p>
                <p className="text-xs text-slate-500">Los clientes pueden reservar este tipo de evento</p>
              </div>
              <Toggle
                checked={form.is_active}
                onChange={(v) => set("is_active", v)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-5 py-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={saving || !form.title.trim() || !form.slug.trim()}
            onClick={() => onSave(form)}
            className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {initial ? "Guardar cambios" : "Crear tipo de evento"}
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Event Type Card ──────────────────────────────────────────────────────────

function EventTypeCard({
  et,
  orgSlug,
  onEdit,
  onDelete,
  onToggle,
}: {
  et: EventType;
  orgSlug: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const bookingUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/booking/${orgSlug}/${et.slug}`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(bookingUrl).catch(() => {});
    setCopied(true);
    toast.success("Enlace copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 transition-all hover:border-slate-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className={`h-3 w-3 rounded-full flex-shrink-0 ${DOT[et.color]}`} />
          <h3 className="font-semibold text-slate-200">{et.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              et.is_active
                ? "bg-green-950/50 text-green-400"
                : "bg-slate-800 text-slate-500"
            }`}
          >
            {et.is_active ? "Activo" : "Inactivo"}
          </span>
        </div>
      </div>

      {et.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{et.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {et.duration_minutes} min
        </span>
        {et.location && (
          <span className="flex items-center gap-1">
            <Link2 className="h-3 w-3" />
            {et.location}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {et.bookings_count} reservas
        </span>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-slate-800/60">
        <button
          onClick={onToggle}
          title={et.is_active ? "Desactivar" : "Activar"}
          className="text-slate-500 hover:text-orange-400 transition-colors"
        >
          {et.is_active ? <ToggleRight className="h-4 w-4 text-green-400" /> : <ToggleLeft className="h-4 w-4" />}
        </button>
        <button
          onClick={handleCopy}
          title="Copiar enlace"
          className="text-slate-500 hover:text-orange-400 transition-colors"
        >
          {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
        </button>
        <button
          onClick={onEdit}
          title="Editar"
          className="text-slate-500 hover:text-orange-400 transition-colors"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          title="Eliminar"
          className="ml-auto text-slate-600 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventTypesPage() {
  const { tokens, organization } = useAuthStore();
  const token = tokens?.access ?? "";
  const orgId = String(organization?.id ?? "");
  const orgSlug = organization?.slug ?? "";
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<EventType | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: eventTypes, isLoading } = useQuery({
    queryKey: ["scheduling-event-types", orgId],
    queryFn: () => schedulingApi.listEventTypes(token, orgId),
    enabled: !!token,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["scheduling-event-types"] });

  const createMutation = useMutation({
    mutationFn: (data: Partial<EventType>) => schedulingApi.createEventType(token, orgId, data),
    onSuccess: () => { invalidate(); setShowForm(false); toast.success("Tipo de evento creado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EventType> }) =>
      schedulingApi.updateEventType(token, orgId, id, data),
    onSuccess: () => { invalidate(); setEditTarget(null); toast.success("Tipo de evento actualizado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => schedulingApi.deleteEventType(token, orgId, id),
    onSuccess: () => { invalidate(); toast.success("Tipo de evento eliminado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSaveNew = async (data: Partial<EventType>) => {
    setSaving(true);
    try { await createMutation.mutateAsync(data); }
    finally { setSaving(false); }
  };

  const handleSaveEdit = async (data: Partial<EventType>) => {
    if (!editTarget) return;
    setSaving(true);
    try { await updateMutation.mutateAsync({ id: editTarget.id, data }); }
    finally { setSaving(false); }
  };

  const handleToggle = (et: EventType) => {
    updateMutation.mutate({ id: et.id, data: { is_active: !et.is_active } });
  };

  const handleDelete = (et: EventType) => {
    if (!confirm(`¿Eliminar "${et.title}"? Esta acción no se puede deshacer.`)) return;
    deleteMutation.mutate(et.id);
  };

  const list = eventTypes ?? [];

  return (
    <>
      <DashboardHeader title="Tipos de evento" />

      <div className="flex-1 overflow-y-auto bg-slate-900/30 p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-5">

          {/* Top bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-950/40 text-blue-400">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-100">Tipos de evento</h1>
                <p className="text-xs text-slate-500">{list.length} tipo{list.length !== 1 ? "s" : ""} configurado{list.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/30"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo tipo de evento</span>
            </Button>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-16 text-center">
              <CalendarDays className="mx-auto mb-3 h-10 w-10 text-slate-700" />
              <h3 className="font-semibold text-slate-400 mb-1">Sin tipos de evento</h3>
              <p className="text-sm text-slate-600 mb-4">
                Crea tu primer tipo de evento para que tus clientes puedan reservar citas.
              </p>
              <Button
                size="sm"
                onClick={() => setShowForm(true)}
                className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white"
              >
                <Plus className="h-4 w-4" />
                Crear tipo de evento
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((et) => (
                <EventTypeCard
                  key={et.id}
                  et={et}
                  orgSlug={orgSlug}
                  onEdit={() => setEditTarget(et)}
                  onDelete={() => handleDelete(et)}
                  onToggle={() => handleToggle(et)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Forms */}
      {showForm && (
        <EventTypeForm
          onClose={() => setShowForm(false)}
          onSave={handleSaveNew}
          saving={saving}
        />
      )}
      {editTarget && (
        <EventTypeForm
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSaveEdit}
          saving={saving}
        />
      )}
    </>
  );
}
