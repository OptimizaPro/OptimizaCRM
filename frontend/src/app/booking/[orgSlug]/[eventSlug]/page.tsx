"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { publicBookingApi, type PublicEventType, type TimeSlot } from "@/lib/api";
import {
  Clock, MapPin, ChevronLeft, ChevronRight, Loader2,
  CalendarClock, User, Mail, Phone, FileText, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Calendar helpers ─────────────────────────────────────────────────────────

const WEEKDAYS_SHORT = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface BookingForm {
  booker_name: string;
  booker_email: string;
  booker_phone: string;
  booker_notes: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Step = "calendar" | "slots" | "form" | "submitting";

interface OrgSchedule {
  org_name?: string;
  error?: string;
}

interface EventTypeDetail extends PublicEventType {
  host_name: string;
}

interface SlotsResponse {
  event_type?: EventTypeDetail;
  slots?: TimeSlot[];
  error?: string;
}

export default function EventBookingPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = use(params);
  const router = useRouter();

  const [orgName, setOrgName] = useState<string>("");
  const [eventType, setEventType] = useState<EventTypeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar state
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Slots state
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Form state
  const [step, setStep] = useState<Step>("calendar");
  const [form, setForm] = useState<BookingForm>({
    booker_name: "",
    booker_email: "",
    booker_phone: "",
    booker_notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load org + event type info
  useEffect(() => {
    Promise.all([
      publicBookingApi.getOrgSchedule(orgSlug) as Promise<OrgSchedule>,
      publicBookingApi.getEventTypeSlots(orgSlug, eventSlug) as Promise<SlotsResponse>,
    ])
      .then(([orgData, etData]) => {
        if (orgData.error) throw new Error(orgData.error);
        if (etData.error) throw new Error(etData.error);
        setOrgName(orgData.org_name ?? "");
        if (etData.event_type) setEventType(etData.event_type);
      })
      .catch((e: Error) => setError(e.message || "No se pudo cargar la información"))
      .finally(() => setLoading(false));
  }, [orgSlug, eventSlug]);

  // Load slots when a date is selected
  const handleSelectDate = async (date: Date) => {
    const dateKey = toDateKey(date);
    setSelectedDate(dateKey);
    setSelectedSlot(null);
    setSlots([]);
    setLoadingSlots(true);
    try {
      const res = await publicBookingApi.getEventTypeSlots(orgSlug, eventSlug, dateKey) as SlotsResponse;
      setSlots(res.slots ?? []);
      setStep("slots");
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep("form");
  };

  const handleSubmit = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await publicBookingApi.createBooking(orgSlug, eventSlug, {
        booker_name: form.booker_name,
        booker_email: form.booker_email,
        booker_phone: form.booker_phone || undefined,
        booker_notes: form.booker_notes || undefined,
        start_time: selectedSlot.start,
      }) as { id?: string; status?: string; error?: string };
      if (res.error) throw new Error(res.error);
      // Redirect to confirm page with params
      const qs = new URLSearchParams({
        event: eventType?.title ?? "",
        start: selectedSlot.start,
        end: selectedSlot.end,
        name: form.booker_name,
        requires_confirmation: String(eventType?.requires_confirmation ?? false),
      });
      router.push(`/booking/${orgSlug}/${eventSlug}/confirm?${qs}`);
    } catch (e: unknown) {
      setSubmitError((e as Error).message || "No se pudo completar la reserva");
      setSubmitting(false);
    }
  };

  const setFormField = <K extends keyof BookingForm>(k: K, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20";
  const labelCls = "mb-1 block text-xs font-medium text-slate-600";

  const days = getCalendarDays(cursor.year, cursor.month);

  const isPast = (d: Date) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return d < today;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !eventType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center max-w-sm">
          <CalendarClock className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <h2 className="font-semibold text-slate-700 mb-1">Evento no encontrado</h2>
          <p className="text-sm text-slate-500 mb-4">{error ?? "Este tipo de evento no existe."}</p>
          <Link href={`/booking/${orgSlug}`} className="text-sm text-orange-600 hover:underline">
            ← Ver todos los eventos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="mx-auto max-w-4xl flex items-center gap-2">
          <Link
            href={`/booking/${orgSlug}`}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-orange-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {orgName}
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <span className="text-sm font-medium text-slate-700">{eventType.title}</span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

          {/* Left — event info */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div>
                <p className="text-xs text-slate-500 font-medium">{orgName}</p>
                <h1 className="text-xl font-bold text-slate-900 mt-0.5">{eventType.title}</h1>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  {eventType.duration_minutes} minutos
                </div>
                {eventType.location && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    {eventType.location}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  {eventType.host_name}
                </div>
              </div>

              {eventType.description && (
                <p className="text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
                  {eventType.description}
                </p>
              )}

              {eventType.requires_confirmation && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                  Esta reunión requiere confirmación manual antes de ser válida.
                </div>
              )}

              {/* Steps indicator */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2">
                  {[
                    { key: "calendar", label: "Fecha" },
                    { key: "slots",    label: "Hora" },
                    { key: "form",     label: "Datos" },
                  ].map((s, i) => {
                    const current = step === s.key || (step === "submitting" && s.key === "form");
                    const done =
                      (s.key === "calendar" && (step === "slots" || step === "form" || step === "submitting")) ||
                      (s.key === "slots" && (step === "form" || step === "submitting"));
                    return (
                      <div key={s.key} className="flex items-center gap-2">
                        {i > 0 && <div className={`h-px w-4 ${done ? "bg-orange-400" : "bg-slate-200"}`} />}
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${current ? "bg-orange-600 text-white" : done ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-400"}`}>
                          {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                        </div>
                        <span className={`text-xs ${current ? "font-semibold text-slate-700" : "text-slate-400"}`}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right — calendar / slots / form */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              {/* STEP 1 — Calendar */}
              {(step === "calendar" || step === "slots") && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-slate-800">
                      {MONTHS[cursor.month]} {cursor.year}
                    </h2>
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          setCursor((c) =>
                            c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          setCursor((c) =>
                            c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 mb-2">
                    {WEEKDAYS_SHORT.map((d) => (
                      <div key={d} className="py-1 text-center text-[11px] font-semibold text-slate-400">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {days.map((day, i) => {
                      if (!day) return <div key={i} />;
                      const key = toDateKey(day);
                      const past = isPast(day);
                      const isSelected = key === selectedDate;
                      return (
                        <button
                          key={i}
                          disabled={past}
                          onClick={() => handleSelectDate(day)}
                          className={`h-9 w-full rounded-xl text-sm font-medium transition-all ${
                            isSelected
                              ? "bg-orange-600 text-white shadow-md"
                              : past
                              ? "text-slate-300 cursor-not-allowed"
                              : "text-slate-700 hover:bg-orange-50 hover:text-orange-700"
                          }`}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>

                  {/* Slots section */}
                  {step === "slots" && selectedDate && (
                    <div className="mt-6 border-t border-slate-100 pt-5">
                      <h3 className="font-semibold text-slate-800 mb-3 text-sm">
                        {fmtDateLong(selectedDate + "T12:00:00")}
                      </h3>
                      {loadingSlots ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
                        </div>
                      ) : slots.length === 0 ? (
                        <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                          No hay horarios disponibles para esta fecha.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {slots.map((slot, i) => (
                            <button
                              key={i}
                              onClick={() => handleSelectSlot(slot)}
                              className="rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700"
                            >
                              {fmtTime(slot.start)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* STEP 2 — Form */}
              {step === "form" && selectedSlot && (
                <>
                  <div className="mb-5">
                    <h2 className="font-semibold text-slate-800 mb-1">Completa tu reserva</h2>
                    <p className="text-xs text-slate-500">
                      {fmtDateLong(selectedSlot.start)} · {fmtTime(selectedSlot.start)} — {fmtTime(selectedSlot.end)}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>
                        <User className="inline h-3 w-3 mr-1" />
                        Nombre completo *
                      </label>
                      <input
                        className={inputCls}
                        value={form.booker_name}
                        onChange={(e) => setFormField("booker_name", e.target.value)}
                        placeholder="Tu nombre completo"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className={labelCls}>
                        <Mail className="inline h-3 w-3 mr-1" />
                        Email *
                      </label>
                      <input
                        type="email"
                        className={inputCls}
                        value={form.booker_email}
                        onChange={(e) => setFormField("booker_email", e.target.value)}
                        placeholder="tu@email.com"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>
                        <Phone className="inline h-3 w-3 mr-1" />
                        Teléfono (opcional)
                      </label>
                      <input
                        type="tel"
                        className={inputCls}
                        value={form.booker_phone}
                        onChange={(e) => setFormField("booker_phone", e.target.value)}
                        placeholder="+502 1234-5678"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>
                        <FileText className="inline h-3 w-3 mr-1" />
                        Notas adicionales (opcional)
                      </label>
                      <textarea
                        className={`${inputCls} resize-none`}
                        rows={3}
                        value={form.booker_notes}
                        onChange={(e) => setFormField("booker_notes", e.target.value)}
                        placeholder="¿Hay algo que debamos saber antes de la reunión?"
                      />
                    </div>

                    {submitError && (
                      <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                        {submitError}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setStep("slots"); setSelectedSlot(null); }}
                        disabled={submitting}
                        className="text-slate-600"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Volver
                      </Button>
                      <Button
                        size="sm"
                        disabled={submitting || !form.booker_name.trim() || !form.booker_email.trim()}
                        onClick={handleSubmit}
                        className="flex-1 bg-orange-600 hover:bg-orange-500 text-white gap-1.5"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Confirmar reserva
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 text-center">
        <p className="text-xs text-slate-400">
          Powered by{" "}
          <Link href="/" className="font-semibold text-orange-600 hover:underline">
            OptimizaCRM
          </Link>
        </p>
      </div>
    </div>
  );
}
