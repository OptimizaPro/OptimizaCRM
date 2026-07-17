"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import {
  calendarApi,
  settingsApi,
  type CalendarEvent,
  type CalendarEventType,
  type CalendarEventStatus,
  type MembershipDetail,
} from "@/lib/api";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Plus, X, Loader2, Pencil, Trash2, Clock, MapPin,
  Phone, Users, RefreshCw, CheckCircle2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const EVENT_TYPES: { value: CalendarEventType; label: string; color: string; dot: string; icon: React.ElementType }[] = [
  { value: "meeting",   label: "Reunión",       color: "bg-blue-900/60 text-blue-300 border-blue-700/50",    dot: "bg-blue-400",   icon: Users      },
  { value: "call",      label: "Llamada",        color: "bg-orange-900/60 text-orange-300 border-orange-700/50", dot: "bg-orange-400", icon: Phone      },
  { value: "follow_up", label: "Seguimiento",    color: "bg-violet-900/60 text-violet-300 border-violet-700/50", dot: "bg-violet-400", icon: RefreshCw  },
  { value: "task",      label: "Tarea",          color: "bg-green-900/60 text-green-300 border-green-700/50",   dot: "bg-green-400",  icon: CheckCircle2 },
];

const STATUS_META: Record<CalendarEventStatus, { label: string; color: string }> = {
  confirmed:            { label: "Confirmado",           color: "text-green-400"  },
  pending_confirmation: { label: "Pendiente confirmación", color: "text-amber-400" },
  cancelled:            { label: "Cancelado",            color: "text-slate-500"  },
};

function getEventTypeMeta(type: CalendarEventType) {
  return EVENT_TYPES.find(e => e.value === type) ?? EVENT_TYPES[0];
}

// ─── Grid helpers ─────────────────────────────────────────────────────────────

function getCalendarDays(year: number, month: number): Date[] {
  const firstDay    = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;   // Monday-based
  const days: Date[] = [];
  for (let i = -startOffset; i < 42 - startOffset; i++) {
    days.push(new Date(year, month, 1 + i));
  }
  while (days.length > 35 && days.slice(-7).every(d => d.getMonth() !== month)) {
    days.splice(-7);
  }
  return days;
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtDatetimeLocal(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

interface EventForm {
  title:       string;
  description: string;
  event_type:  CalendarEventType;
  status:      CalendarEventStatus;
  start_time:  string;
  end_time:    string;
  location:    string;
  is_all_day:  boolean;
  assigned_to: string;
}

function EventModal({ initial, defaultDate, token, orgId, onClose, onSave, onDelete, saving, deleting }: {
  initial?:    CalendarEvent;
  defaultDate: string;           // "YYYY-MM-DD"
  token:       string;
  orgId:       string;
  onClose:  () => void;
  onSave:   (d: Partial<CalendarEvent>) => Promise<void>;
  onDelete?: () => Promise<void>;
  saving:   boolean;
  deleting: boolean;
}) {
  const defaultStart = initial
    ? fmtDatetimeLocal(initial.start_time)
    : `${defaultDate}T09:00`;
  const defaultEnd = initial
    ? fmtDatetimeLocal(initial.end_time)
    : `${defaultDate}T10:00`;

  const [form, setForm] = useState<EventForm>({
    title:       initial?.title       ?? "",
    description: initial?.description ?? "",
    event_type:  initial?.event_type  ?? "meeting",
    status:      initial?.status      ?? "confirmed",
    start_time:  defaultStart,
    end_time:    defaultEnd,
    location:    initial?.location    ?? "",
    is_all_day:  initial?.is_all_day  ?? false,
    assigned_to: initial?.user        ?? "",
  });

  const { data: membersData } = useQuery({
    queryKey: ["org-members", orgId],
    queryFn:  () => settingsApi.getMembers(token, orgId),
    enabled:  !!token && !!orgId,
    staleTime: 1000 * 60 * 5,
  });
  const members: MembershipDetail[] = membersData ?? [];

  const set = <K extends keyof EventForm>(k: K, v: EventForm[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const inputCls = "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20";
  const selectCls = "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400">
                {initial ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </div>
              <h2 className="font-semibold text-slate-100 text-sm">
                {initial ? "Editar evento" : "Nuevo evento"}
              </h2>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body — no scroll: compact layout */}
          <div className="p-5 space-y-3.5">

            {/* Event type — pill selector */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Tipo de evento</label>
              <div className="flex gap-1.5 flex-wrap">
                {EVENT_TYPES.map(et => (
                  <button
                    key={et.value}
                    type="button"
                    onClick={() => set("event_type", et.value)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all
                      ${form.event_type === et.value
                        ? et.color
                        : "border-slate-700 bg-slate-900 text-slate-500 hover:border-slate-600 hover:text-slate-300"}
                    `}
                  >
                    <et.icon className="h-3 w-3" />
                    {et.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Título *</label>
              <input
                className={inputCls}
                value={form.title}
                onChange={e => set("title", e.target.value)}
                placeholder="Ej. Reunión con cliente, Llamada de seguimiento…"
                autoFocus
              />
            </div>

            {/* All-day toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.is_all_day}
                onClick={() => set("is_all_day", !form.is_all_day)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none
                  ${form.is_all_day ? "bg-orange-600" : "bg-slate-700"}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200
                  ${form.is_all_day ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>
              <span className="text-xs text-slate-400">Todo el día</span>
            </div>

            {/* Dates */}
            {!form.is_all_day ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Inicio</label>
                  <input type="datetime-local" className={inputCls} value={form.start_time}
                    onChange={e => set("start_time", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Fin</label>
                  <input type="datetime-local" className={inputCls} value={form.end_time}
                    onChange={e => set("end_time", e.target.value)} />
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Fecha</label>
                <input type="date" className={inputCls}
                  value={form.start_time.slice(0, 10)}
                  onChange={e => {
                    set("start_time", `${e.target.value}T00:00`);
                    set("end_time",   `${e.target.value}T23:59`);
                  }}
                />
              </div>
            )}

            {/* Location + Responsable (side by side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Lugar</label>
                <input className={inputCls} value={form.location} onChange={e => set("location", e.target.value)}
                  placeholder="Oficina, Meet, Teléfono…" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Responsable</label>
                <select
                  className={selectCls}
                  value={form.assigned_to}
                  onChange={e => set("assigned_to", e.target.value)}
                >
                  <option value="">Sin asignar</option>
                  {members.map(m => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.full_name || `${m.user.first_name} ${m.user.last_name}`.trim() || m.user.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes + Status (side by side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Notas</label>
                <textarea className={`${inputCls} resize-none`} rows={2} value={form.description}
                  onChange={e => set("description", e.target.value)} placeholder="Agenda, contexto…" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Estado</label>
                <select
                  className={selectCls}
                  value={form.status}
                  onChange={e => set("status", e.target.value as CalendarEventStatus)}
                >
                  <option value="confirmed">Confirmado</option>
                  <option value="pending_confirmation">Pendiente de confirmación</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3.5">
            <div>
              {onDelete && (
                <button
                  onClick={onDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-red-950/30 hover:text-red-400 disabled:opacity-40 transition-colors"
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Eliminar
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
              <Button
                size="sm"
                disabled={saving || !form.title.trim()}
                onClick={() => {
                  const payload: Partial<CalendarEvent> = {
                    title:       form.title,
                    description: form.description,
                    event_type:  form.event_type,
                    status:      form.status,
                    start_time:  new Date(form.start_time).toISOString(),
                    end_time:    new Date(form.end_time).toISOString(),
                    location:    form.location,
                    is_all_day:  form.is_all_day,
                    ...(form.assigned_to ? { user: form.assigned_to } : {}),
                  };
                  onSave(payload);
                }}
                className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarIcon className="h-3.5 w-3.5" />}
                {initial ? "Guardar cambios" : "Crear evento"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Event chip (on calendar cell) ───────────────────────────────────────────

function EventChip({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const meta = getEventTypeMeta(event.event_type);
  const cancelled = event.status === "cancelled";

  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={`group w-full flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-left transition-all hover:brightness-110
        ${meta.color} ${cancelled ? "opacity-40 line-through" : ""}
      `}
    >
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${meta.dot}`} />
      <span className="truncate text-[11px] font-semibold leading-none">
        {!event.is_all_day && `${fmtTime(event.start_time)} `}{event.title}
      </span>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { tokens, organization } = useAuthStore();
  const token = tokens?.access ?? "";
  const orgId = String(organization?.id ?? "");
  const qc    = useQueryClient();

  const now   = new Date();
  const today = now.toDateString();

  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [modalDate,  setModalDate]  = useState<string | null>(null);    // "YYYY-MM-DD" for new event
  const [editEvent,  setEditEvent]  = useState<CalendarEvent | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const prevMonth = () =>
    setCursor(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 });
  const nextMonth = () =>
    setCursor(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 });
  const goToday = () => setCursor({ year: now.getFullYear(), month: now.getMonth() });

  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();

  // Month range for API
  const rangeStart = new Date(cursor.year, cursor.month, 1).toISOString();
  const rangeEnd   = new Date(cursor.year, cursor.month + 1, 0, 23, 59, 59).toISOString();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["calendar", cursor.year, cursor.month],
    queryFn:  () => calendarApi.list(token, orgId, rangeStart, rangeEnd),
    enabled:  !!token,
  });

  const events = data?.results ?? [];

  // Group events by date key
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const key = toDateKey(new Date(ev.start_time));
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const days = getCalendarDays(cursor.year, cursor.month);

  const monthLabel = new Date(cursor.year, cursor.month, 1)
    .toLocaleDateString("es-ES", { month: "long", year: "numeric" })
    .replace(/^\w/, c => c.toUpperCase());

  // ── Mutations ────────────────────────────────────────────────────────────

  const invalidate = () => qc.invalidateQueries({ queryKey: ["calendar"] });

  const createMutation = useMutation({
    mutationFn: (data: Partial<CalendarEvent>) => calendarApi.create(token, orgId, data),
    onSuccess: () => { invalidate(); setModalDate(null); toast.success("Evento creado"); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CalendarEvent>) => calendarApi.update(token, orgId, editEvent!.id, data),
    onSuccess: () => { invalidate(); setEditEvent(null); toast.success("Evento actualizado"); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => calendarApi.delete(token, orgId, editEvent!.id),
    onSuccess: () => { invalidate(); setEditEvent(null); toast.success("Evento eliminado"); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const handleSaveNew = async (data: Partial<CalendarEvent>) => {
    setSaving(true);
    try { await createMutation.mutateAsync(data); }
    finally { setSaving(false); }
  };

  const handleSaveEdit = async (data: Partial<CalendarEvent>) => {
    setSaving(true);
    try { await updateMutation.mutateAsync(data); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await deleteMutation.mutateAsync(); }
    finally { setDeleting(false); }
  };

  // ── Summary sidebar stats ─────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:    events.length,
    meetings: events.filter(e => e.event_type === "meeting").length,
    calls:    events.filter(e => e.event_type === "call").length,
    today:    events.filter(e => new Date(e.start_time).toDateString() === now.toDateString()).length,
  }), [events]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <DashboardHeader title="Calendario" />

      <div className="flex-1 overflow-y-auto bg-slate-900/30 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-4">

          {/* ── Top bar ─────────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600/15 text-orange-500">
                <CalendarIcon className="h-4 w-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">{monthLabel}</h2>
              {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-600" />}
            </div>
            <div className="flex items-center gap-2">
              {!isCurrentMonth && (
                <button onClick={goToday}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:border-orange-600 hover:text-orange-400 transition-colors">
                  Hoy
                </button>
              )}
              <button onClick={prevMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={nextMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
              <Button size="sm"
                onClick={() => setModalDate(toDateKey(now))}
                className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/30">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo evento</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">

            {/* ── Calendar grid ───────────────────────────────────────── */}
            <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40 overflow-hidden">

              {/* Weekday headers */}
              <div className="grid grid-cols-7 border-b border-slate-800/60">
                {WEEKDAYS.map((d, i) => (
                  <div key={d} className={`py-2 sm:py-3 text-center text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider sm:tracking-widest
                    ${i >= 5 ? "text-slate-600" : "text-slate-500"}`}>
                    {d.slice(0, 1)}<span className="hidden sm:inline">{d.slice(1)}</span>
                  </div>
                ))}
              </div>

              {/* Day cells */}
              {isLoading ? (
                <div className="flex items-center justify-center py-32">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
                </div>
              ) : (
                <div className="grid grid-cols-7">
                  {days.map((date, i) => {
                    const isToday   = date.toDateString() === today;
                    const inMonth   = date.getMonth() === cursor.month;
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const isLastRow = i >= days.length - 7;
                    const isLastCol = (i + 1) % 7 === 0;
                    const dateKey   = toDateKey(date);
                    const dayEvents = eventsByDay[dateKey] ?? [];

                    return (
                      <div
                        key={i}
                        onClick={() => inMonth && setModalDate(dateKey)}
                        className={`
                          relative min-h-[60px] sm:min-h-[100px] p-1.5 sm:p-2 transition-colors cursor-pointer group
                          ${!isLastRow ? "border-b border-slate-800/50" : ""}
                          ${!isLastCol ? "border-r border-slate-800/50" : ""}
                          ${isToday
                            ? "bg-gradient-to-br from-orange-950/50 via-orange-900/20 to-slate-950"
                            : isWeekend && inMonth
                              ? "bg-slate-950/40 hover:bg-slate-900/50"
                              : !inMonth
                                ? "bg-slate-950/20 cursor-default"
                                : "hover:bg-slate-900/50"
                          }
                        `}
                      >
                        {/* Today accent bar */}
                        {isToday && (
                          <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600/50" />
                        )}

                        {/* Date number + add button */}
                        <div className="flex items-center justify-between mb-1">
                          {isToday ? (
                            <span className="flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-orange-600 text-[10px] sm:text-xs font-black text-white shadow-lg shadow-orange-900/50 ring-2 ring-orange-400/30">
                              {date.getDate()}
                            </span>
                          ) : (
                            <span className={`text-[10px] sm:text-sm font-medium
                              ${!inMonth  ? "text-slate-700"
                              : isWeekend ? "text-slate-500"
                              :             "text-slate-400"}
                            `}>
                              {date.getDate()}
                            </span>
                          )}
                          {inMonth && (
                            <button
                              onClick={e => { e.stopPropagation(); setModalDate(dateKey); }}
                              className="hidden sm:flex opacity-0 group-hover:opacity-100 h-5 w-5 items-center justify-center rounded-full text-slate-600 hover:bg-orange-600 hover:text-white transition-all"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        {/* Events — desktop shows chips, mobile shows dot count */}
                        <div className="space-y-0.5">
                          {/* Mobile: dot indicators only */}
                          {dayEvents.length > 0 && (
                            <div className="sm:hidden flex gap-0.5 flex-wrap">
                              {dayEvents.slice(0, 3).map(ev => {
                                const m = getEventTypeMeta(ev.event_type);
                                return <span key={ev.id} className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${m.dot}`} />;
                              })}
                              {dayEvents.length > 3 && (
                                <span className="text-[8px] text-slate-600">+{dayEvents.length - 3}</span>
                              )}
                            </div>
                          )}
                          {/* Desktop: full chips */}
                          <div className="hidden sm:block space-y-1">
                            {dayEvents.slice(0, 3).map(ev => (
                              <EventChip key={ev.id} event={ev} onClick={() => setEditEvent(ev)} />
                            ))}
                            {dayEvents.length > 3 && (
                              <p className="text-[10px] font-medium text-slate-600 pl-1">
                                +{dayEvents.length - 3} más
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Mobile agenda (below calendar, above sidebar) ───────── */}
            {events.length > 0 && (
              <div className="sm:hidden rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Este mes</p>
                <div className="space-y-2">
                  {events.slice(0, 8).map(ev => {
                    const meta = getEventTypeMeta(ev.event_type);
                    return (
                      <button key={ev.id} onClick={() => setEditEvent(ev)}
                        className="w-full flex items-start gap-3 text-left group">
                        <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${meta.dot}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-200 group-hover:text-orange-400 transition-colors">
                            {ev.title}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {new Date(ev.start_time).toLocaleDateString("es-GT", { weekday: "short", day: "numeric", month: "short" })}
                            {!ev.is_all_day && ` · ${fmtTime(ev.start_time)}`}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-semibold ${meta.color.split(" ")[1]}`}>{meta.label}</span>
                      </button>
                    );
                  })}
                  {events.length > 8 && (
                    <p className="text-xs text-slate-600 text-center">+{events.length - 8} eventos más</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Sidebar ─────────────────────────────────────────────── */}
            <div className="w-full lg:w-56 lg:flex-shrink-0 space-y-3">

              {/* This month stats */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-3">Este mes</p>
                <div className="grid grid-cols-2 gap-2 lg:block lg:space-y-3">
                {[
                  { label: "Total eventos", value: stats.total,    color: "text-slate-300" },
                  { label: "Hoy",           value: stats.today,    color: "text-orange-400" },
                  { label: "Reuniones",     value: stats.meetings, color: "text-blue-400"   },
                  { label: "Llamadas",      value: stats.calls,    color: "text-orange-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between lg:flex">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className={`text-sm font-bold ${color}`}>{value}</span>
                  </div>
                ))}
                </div>
              </div>

              {/* Legend */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tipos</p>
                {EVENT_TYPES.map(et => (
                  <div key={et.value} className="flex items-center gap-2">
                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${et.dot}`} />
                    <span className="text-xs text-slate-400">{et.label}</span>
                  </div>
                ))}
              </div>

              {/* Today's events */}
              {isCurrentMonth && (() => {
                const todayEvents = eventsByDay[toDateKey(now)] ?? [];
                if (todayEvents.length === 0) return null;
                return (
                  <div className="rounded-2xl border border-orange-800/30 bg-orange-950/20 p-4 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-500">Hoy</p>
                    {todayEvents.map(ev => {
                      const meta = getEventTypeMeta(ev.event_type);
                      return (
                        <button
                          key={ev.id}
                          onClick={() => setEditEvent(ev)}
                          className="w-full text-left group"
                        >
                          <div className="flex items-start gap-2">
                            <span className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${meta.dot}`} />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-slate-200 group-hover:text-orange-400 transition-colors">
                                {ev.title}
                              </p>
                              {!ev.is_all_day && (
                                <p className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  {fmtTime(ev.start_time)} – {fmtTime(ev.end_time)}
                                </p>
                              )}
                              {ev.location && (
                                <p className="flex items-center gap-1 text-[10px] text-slate-600 mt-0.5">
                                  <MapPin className="h-2.5 w-2.5" />
                                  {ev.location}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Status legend */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Estado</p>
                {(Object.entries(STATUS_META) as [CalendarEventStatus, { label: string; color: string }][]).map(([key, meta]) => (
                  <div key={key} className="flex items-center gap-2">
                    {key === "confirmed"            && <CheckCircle2  className={`h-3 w-3 ${meta.color}`} />}
                    {key === "pending_confirmation" && <AlertCircle   className={`h-3 w-3 ${meta.color}`} />}
                    {key === "cancelled"            && <X             className={`h-3 w-3 ${meta.color}`} />}
                    <span className={`text-xs ${meta.color}`}>{meta.label}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {modalDate && (
        <EventModal
          defaultDate={modalDate}
          token={token}
          orgId={orgId}
          onClose={() => setModalDate(null)}
          onSave={handleSaveNew}
          saving={saving}
          deleting={false}
        />
      )}
      {editEvent && (
        <EventModal
          initial={editEvent}
          defaultDate={toDateKey(new Date(editEvent.start_time))}
          token={token}
          orgId={orgId}
          onClose={() => setEditEvent(null)}
          onSave={handleSaveEdit}
          onDelete={handleDelete}
          saving={saving}
          deleting={deleting}
        />
      )}
    </>
  );
}
