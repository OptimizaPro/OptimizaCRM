"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import {
  schedulingApi, publicBookingApi,
  type Booking, type BookingStatus, type EventType, type TimeSlot,
} from "@/lib/api";
import {
  BookOpen, Loader2, CheckCircle2, XCircle, Clock, CalendarCheck,
  User, Mail, X, Plus, ChevronLeft, ChevronRight, Copy, Check,
  Phone, FileText, Calendar, ArrowRight, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: "all",       label: "Todos" },
  { key: "pending",   label: "Pendientes" },
  { key: "confirmed", label: "Confirmadas" },
  { key: "cancelled", label: "Canceladas" },
  { key: "completed", label: "Completadas" },
];

const STATUS_META: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: "Pendiente",   color: "text-amber-400",  bg: "bg-amber-950/50"  },
  confirmed: { label: "Confirmada",  color: "text-green-400",  bg: "bg-green-950/50"  },
  cancelled: { label: "Cancelada",   color: "text-slate-500",  bg: "bg-slate-800"     },
  completed: { label: "Completada",  color: "text-blue-400",   bg: "bg-blue-950/50"   },
};

// ─── Calendar helpers ─────────────────────────────────────────────────────────

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function calDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const total = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { weekday:"short", day:"numeric", month:"short", year:"numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour:"2-digit", minute:"2-digit" });
}

function fmtTimeFull(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
}

// ─── New Booking Panel ────────────────────────────────────────────────────────

type Step = "event" | "date" | "slot" | "form" | "done";

interface BookingForm {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

function NewBookingPanel({
  eventTypes,
  orgSlug,
  onClose,
  onCreated,
}: {
  eventTypes: EventType[];
  orgSlug: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<Step>("event");
  const [selectedET, setSelectedET] = useState<EventType | null>(null);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [form, setForm] = useState<BookingForm>({ name: "", email: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<{ start_time: string; end_time: string; event_type: string; status: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Load slots when date selected
  useEffect(() => {
    if (!selectedDate || !selectedET) return;
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    publicBookingApi
      .getEventTypeSlots(orgSlug, selectedET.slug, toDateKey(selectedDate))
      .then((res) => { setSlots(res.slots ?? []); })
      .catch(() => { toast.error("No se pudieron cargar los horarios"); })
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, selectedET, orgSlug]);

  const handleSubmit = async () => {
    if (!selectedET || !selectedSlot) return;
    setSubmitting(true);
    try {
      const res = await publicBookingApi.createBooking(orgSlug, selectedET.slug, {
        booker_name:  form.name,
        booker_email: form.email,
        booker_phone: form.phone,
        booker_notes: form.notes,
        start_time:   selectedSlot.start,
      });
      if (res.booking_id) {
        setCreatedBooking(res);
        setStep("done");
        onCreated();
      } else {
        toast.error(res.detail || "Error al crear la reserva");
      }
    } catch {
      toast.error("Error al crear la reserva");
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmation message to copy
  const confirmationText = createdBooking
    ? `Hola ${form.name}, tu cita está confirmada:\n\n📅 ${fmtTimeFull(createdBooking.start_time)}\n🕐 ${fmtTime(createdBooking.start_time)} – ${fmtTime(createdBooking.end_time)}\n📌 ${selectedET?.title}${selectedET?.location ? `\n📍 ${selectedET.location}` : ""}\n\n${createdBooking.status === "pending" ? "⚠️ Pendiente de confirmación — te contactaremos pronto." : "✅ Confirmada."}`
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(confirmationText).catch(() => {});
    setCopied(true);
    toast.success("Mensaje copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  const inputCls = "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20";

  const cells = calDays(calYear, calMonth);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400">
              <Plus className="h-3.5 w-3.5" />
            </div>
            <h2 className="font-semibold text-slate-100 text-sm">Nueva reserva</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator */}
        {step !== "done" && (
          <div className="flex items-center gap-1 px-5 pt-4 pb-2 flex-shrink-0">
            {(["event","date","slot","form"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`h-1.5 w-6 rounded-full transition-colors ${
                  step === s ? "bg-orange-500" :
                  ["event","date","slot","form"].indexOf(step) > i ? "bg-orange-700/50" : "bg-slate-800"
                }`} />
              </div>
            ))}
            <span className="ml-2 text-xs text-slate-500">
              {step === "event" && "1. Tipo de evento"}
              {step === "date"  && "2. Elige una fecha"}
              {step === "slot"  && "3. Elige un horario"}
              {step === "form"  && "4. Datos del cliente"}
            </span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* STEP 1 — Event type */}
          {step === "event" && (
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-500">Selecciona el tipo de cita que quieres agendar:</p>
              {eventTypes.filter(et => et.is_active).map((et) => (
                <button
                  key={et.id}
                  onClick={() => { setSelectedET(et); setStep("date"); }}
                  className="w-full flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 text-left transition-all hover:border-orange-600/50 hover:bg-slate-900/80"
                >
                  <span className={`h-3 w-3 rounded-full flex-shrink-0 ${
                    et.color === "blue"   ? "bg-blue-500"   :
                    et.color === "green"  ? "bg-green-500"  :
                    et.color === "orange" ? "bg-orange-500" :
                    et.color === "red"    ? "bg-red-500"    : "bg-slate-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-200 text-sm">{et.title}</p>
                    <p className="text-xs text-slate-500">{et.duration_minutes} min{et.location ? ` · ${et.location}` : ""}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                </button>
              ))}
              {eventTypes.filter(et => et.is_active).length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
                  <p className="text-sm text-slate-500">No hay tipos de evento activos.</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Date picker */}
          {step === "date" && (
            <div className="p-5 space-y-4">
              {selectedET && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2">
                  <Calendar className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-sm text-slate-300 font-medium">{selectedET.title}</span>
                  <span className="text-xs text-slate-500 ml-auto">{selectedET.duration_minutes} min</span>
                </div>
              )}

              {/* Calendar */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                {/* Nav */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => {
                      if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); }
                      else setCalMonth(m => m-1);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-semibold text-slate-200">
                    {MONTHS[calMonth]} {calYear}
                  </span>
                  <button
                    onClick={() => {
                      if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); }
                      else setCalMonth(m => m+1);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 mb-2">
                  {WEEKDAYS.map(d => (
                    <div key={d} className="text-center text-[10px] font-semibold text-slate-600 py-1">{d}</div>
                  ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-0.5">
                  {cells.map((d, i) => {
                    if (!d) return <div key={i} />;
                    const isPast = d < today;
                    const isSelected = selectedDate && toDateKey(d) === toDateKey(selectedDate);
                    const isToday = toDateKey(d) === toDateKey(today);
                    return (
                      <button
                        key={i}
                        disabled={isPast}
                        onClick={() => { setSelectedDate(d); setStep("slot"); }}
                        className={`aspect-square w-full flex items-center justify-center rounded-lg text-sm transition-all ${
                          isPast
                            ? "text-slate-700 cursor-not-allowed"
                            : isSelected
                            ? "bg-orange-600 text-white font-semibold"
                            : isToday
                            ? "border border-orange-600/40 text-orange-300 hover:bg-slate-800"
                            : "text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => setStep("event")}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="h-3 w-3" /> Cambiar tipo de evento
              </button>
            </div>
          )}

          {/* STEP 3 — Slot */}
          {step === "slot" && (
            <div className="p-5 space-y-4">
              {selectedDate && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2">
                  <Calendar className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-sm text-slate-300 font-medium">{fmtDate(selectedDate.toISOString())}</span>
                  <button
                    onClick={() => setStep("date")}
                    className="text-xs text-slate-500 hover:text-orange-400 ml-auto transition-colors"
                  >
                    Cambiar
                  </button>
                </div>
              )}

              {loadingSlots ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
                </div>
              ) : slots.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center">
                  <Clock className="mx-auto mb-2 h-8 w-8 text-slate-700" />
                  <p className="text-sm text-slate-500">No hay horarios disponibles para este día.</p>
                  <button
                    onClick={() => setStep("date")}
                    className="mt-3 text-xs text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    Elegir otra fecha
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.start === slot.start;
                    return (
                      <button
                        key={slot.start}
                        onClick={() => { setSelectedSlot(slot); setStep("form"); }}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                          isSelected
                            ? "border-orange-600 bg-orange-600/20 text-orange-300"
                            : "border-slate-700 bg-slate-900 text-slate-300 hover:border-orange-600/50 hover:text-orange-300"
                        }`}
                      >
                        {fmtTime(slot.start)}
                        <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                          hasta {fmtTime(slot.end)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 4 — Form */}
          {step === "form" && (
            <div className="p-5 space-y-4">
              {/* Summary */}
              {selectedET && selectedSlot && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-1">
                  <p className="text-xs font-semibold text-slate-300">{selectedET.title}</p>
                  <p className="text-xs text-slate-500">
                    {fmtDate(selectedSlot.start)} · {fmtTime(selectedSlot.start)} – {fmtTime(selectedSlot.end)}
                  </p>
                  {selectedET.location && (
                    <p className="text-xs text-slate-500">📍 {selectedET.location}</p>
                  )}
                  <button
                    onClick={() => setStep("slot")}
                    className="text-[11px] text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    Cambiar horario
                  </button>
                </div>
              )}

              {/* Client fields */}
              <div className="space-y-3">
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <User className="h-3 w-3" /> Nombre del cliente *
                  </label>
                  <input
                    className={inputCls}
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nombre completo"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <Mail className="h-3 w-3" /> Email *
                  </label>
                  <input
                    type="email"
                    className={inputCls}
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="cliente@email.com"
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <Phone className="h-3 w-3" /> Teléfono (opcional)
                  </label>
                  <input
                    className={inputCls}
                    value={form.phone}
                    onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+502 1234 5678"
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <FileText className="h-3 w-3" /> Notas (opcional)
                  </label>
                  <textarea
                    className={`${inputCls} resize-none`}
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Información adicional sobre la cita…"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP done — Confirmation */}
          {step === "done" && createdBooking && (
            <div className="p-5 space-y-4">
              {/* Success header */}
              <div className="flex flex-col items-center text-center py-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-950/60 border border-green-700/40 mb-3">
                  <CheckCircle2 className="h-7 w-7 text-green-400" />
                </div>
                <h3 className="font-bold text-slate-100 text-base">¡Reserva creada!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {createdBooking.status === "pending"
                    ? "Pendiente de confirmación — puedes confirmarla desde la lista de reservas."
                    : "La reserva está confirmada y aparece en el calendario."}
                </p>
              </div>

              {/* Details */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente</span>
                  <span className="text-slate-200 font-medium">{form.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email</span>
                  <span className="text-slate-300">{form.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Evento</span>
                  <span className="text-slate-300">{selectedET?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fecha</span>
                  <span className="text-slate-300">{fmtDate(createdBooking.start_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hora</span>
                  <span className="text-slate-300">{fmtTime(createdBooking.start_time)} – {fmtTime(createdBooking.end_time)}</span>
                </div>
              </div>

              {/* Copyable message */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-xs font-semibold text-slate-300">Mensaje listo para enviar al cliente</span>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                  <pre className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed font-sans">
                    {confirmationText}
                  </pre>
                </div>
                <button
                  onClick={handleCopy}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all ${
                    copied
                      ? "border-green-700/50 bg-green-950/30 text-green-400"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-orange-600/50 hover:text-orange-400"
                  }`}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "¡Copiado!" : "Copiar mensaje"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "form" && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-5 py-4 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => setStep("slot")} disabled={submitting}>
              Atrás
            </Button>
            <Button
              size="sm"
              disabled={submitting || !form.name.trim() || !form.email.trim()}
              onClick={handleSubmit}
              className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white"
            >
              {submitting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <CheckCircle2 className="h-3.5 w-3.5" />}
              Crear reserva
            </Button>
          </div>
        )}

        {step === "done" && (
          <div className="border-t border-slate-800 px-5 py-4 flex-shrink-0">
            <Button
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200"
              onClick={onClose}
            >
              Cerrar
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Cancel dialog ────────────────────────────────────────────────────────────

function CancelDialog({
  booking, onClose, onConfirm, loading,
}: {
  booking: Booking; onClose: () => void; onConfirm: (r: string) => void; loading: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-400" />
              <h2 className="font-semibold text-slate-100 text-sm">Cancelar reserva</h2>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-400">
              Vas a cancelar la reserva de <strong className="text-slate-200">{booking.booker_name}</strong>.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Motivo (opcional)</label>
              <textarea
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none resize-none"
                rows={3} value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej. Conflicto de agenda…"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Volver</Button>
            <Button size="sm" disabled={loading} onClick={() => onConfirm(reason)} className="gap-1.5 bg-red-700 hover:bg-red-600 text-white">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Confirmar cancelación
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const { tokens, organization } = useAuthStore();
  const token  = tokens?.access ?? "";
  const orgId  = String(organization?.id ?? "");
  const orgSlug = organization?.slug ?? "";
  const qc = useQueryClient();

  const [activeTab,    setActiveTab]    = useState("all");
  const [showNewPanel, setShowNewPanel] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelling,   setCancelling]   = useState(false);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["scheduling-bookings", orgId, activeTab],
    queryFn: () => schedulingApi.listBookings(token, orgId, activeTab !== "all" ? { status: activeTab } : undefined),
    enabled: !!token,
  });

  const { data: eventTypes } = useQuery({
    queryKey: ["scheduling-event-types", orgId],
    queryFn: () => schedulingApi.listEventTypes(token, orgId),
    enabled: !!token && showNewPanel,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["scheduling-bookings"] });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => schedulingApi.confirmBooking(token, orgId, id),
    onSuccess: () => { invalidate(); toast.success("Reserva confirmada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      schedulingApi.cancelBooking(token, orgId, id, reason),
    onSuccess: () => { invalidate(); setCancelTarget(null); toast.success("Reserva cancelada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCancel = async (reason: string) => {
    if (!cancelTarget) return;
    setCancelling(true);
    try { await cancelMutation.mutateAsync({ id: cancelTarget.id, reason }); }
    finally { setCancelling(false); }
  };

  const list = bookings ?? [];

  return (
    <>
      <DashboardHeader title="Reservas" />

      <div className="flex-1 overflow-y-auto bg-slate-900/30 p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-950/40 text-orange-400">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-100">Reservas</h1>
                <p className="text-xs text-slate-500">Gestiona y crea citas para tus clientes</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowNewPanel(true)}
              disabled={!orgSlug}
              className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva reserva
            </Button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === tab.key
                    ? "bg-orange-600 text-white"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table / empty */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-16 text-center">
              <CalendarCheck className="mx-auto mb-3 h-10 w-10 text-slate-700" />
              <h3 className="font-semibold text-slate-400 mb-1">Sin reservas</h3>
              <p className="text-sm text-slate-600 mb-4">
                {activeTab === "all"
                  ? "Aún no hay ninguna reserva. Crea una manualmente o comparte tu enlace de reserva."
                  : `No hay reservas con estado "${STATUS_TABS.find(t => t.key === activeTab)?.label}".`}
              </p>
              {activeTab === "all" && orgSlug && (
                <Button size="sm" onClick={() => setShowNewPanel(true)} className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white">
                  <Plus className="h-3.5 w-3.5" /> Nueva reserva
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800/60">
                      {["Cliente", "Tipo de evento", "Fecha y hora", "Duración", "Estado", "Acciones"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((booking, i) => {
                      const st = STATUS_META[booking.status];
                      return (
                        <tr key={booking.id} className={`${i < list.length-1 ? "border-b border-slate-800/40" : ""} hover:bg-slate-900/40 transition-colors`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                                <User className="h-3.5 w-3.5" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-200">{booking.booker_name}</p>
                                <p className="flex items-center gap-1 text-[11px] text-slate-500">
                                  <Mail className="h-2.5 w-2.5" />{booking.booker_email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><span className="text-sm text-slate-300">{booking.event_type_title}</span></td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-slate-300">{fmtDate(booking.start_time)}</p>
                            <p className="text-xs text-slate-500">{fmtTime(booking.start_time)} — {fmtTime(booking.end_time)}</p>
                          </td>
                          <td className="px-4 py-3"><span className="text-sm text-slate-400">{booking.event_type_duration} min</span></td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.bg} ${st.color}`}>{st.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {booking.status === "pending" && (
                                <button onClick={() => confirmMutation.mutate(booking.id)} disabled={confirmMutation.isPending}
                                  className="flex items-center gap-1 rounded-lg bg-green-950/50 px-2 py-1 text-[11px] font-semibold text-green-400 hover:bg-green-900/50 disabled:opacity-40">
                                  <CheckCircle2 className="h-3 w-3" /> Confirmar
                                </button>
                              )}
                              {(booking.status === "pending" || booking.status === "confirmed") && (
                                <button onClick={() => setCancelTarget(booking)}
                                  className="flex items-center gap-1 rounded-lg bg-red-950/40 px-2 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-900/50">
                                  <XCircle className="h-3 w-3" /> Cancelar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-slate-800/60">
                {list.map((booking) => {
                  const st = STATUS_META[booking.status];
                  return (
                    <div key={booking.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-200 text-sm">{booking.booker_name}</p>
                          <p className="text-xs text-slate-500">{booking.booker_email}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.bg} ${st.color}`}>{st.label}</span>
                      </div>
                      <p className="text-xs text-slate-400">{booking.event_type_title} · {booking.event_type_duration} min</p>
                      <p className="text-xs text-slate-500">
                        <Clock className="inline h-3 w-3 mr-0.5" />
                        {fmtDate(booking.start_time)} · {fmtTime(booking.start_time)}
                      </p>
                      <div className="flex gap-2 pt-1">
                        {booking.status === "pending" && (
                          <button onClick={() => confirmMutation.mutate(booking.id)} disabled={confirmMutation.isPending}
                            className="flex items-center gap-1 rounded-lg bg-green-950/50 px-2.5 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-900/50 disabled:opacity-40">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar
                          </button>
                        )}
                        {(booking.status === "pending" || booking.status === "confirmed") && (
                          <button onClick={() => setCancelTarget(booking)}
                            className="flex items-center gap-1 rounded-lg bg-red-950/40 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-900/50">
                            <XCircle className="h-3.5 w-3.5" /> Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewPanel && (
        <NewBookingPanel
          eventTypes={eventTypes ?? []}
          orgSlug={orgSlug}
          onClose={() => setShowNewPanel(false)}
          onCreated={() => { invalidate(); }}
        />
      )}

      {cancelTarget && (
        <CancelDialog
          booking={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleCancel}
          loading={cancelling}
        />
      )}
    </>
  );
}
