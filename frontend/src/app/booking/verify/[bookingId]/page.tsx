"use client";

import { useState, useEffect } from "react";
import { publicBookingApi } from "@/lib/api";
import {
  CalendarCheck, Clock, MapPin, CheckCircle2, XCircle,
  Loader2, AlertTriangle, FileText, User, Mail, BookOpen, ExternalLink, Video, Info,
} from "lucide-react";

// ─── Meeting link detection ────────────────────────────────────────────────────

function isUrl(str: string) {
  try { return Boolean(new URL(str)); } catch { return false; }
}

type MeetingPlatform = {
  name:    string;
  label:   string;
  bg:      string;
  text:    string;
  border:  string;
  dot:     string;
};

// Detects platform from a URL string
function detectPlatformFromUrl(url: string): MeetingPlatform {
  const lower = url.toLowerCase();
  if (lower.includes("meet.google.com"))
    return { name:"Google Meet", label:"Unirse con Google Meet", bg:"bg-blue-950/40",   text:"text-blue-300",   border:"border-blue-600/30",   dot:"bg-blue-400"   };
  if (lower.includes("zoom.us"))
    return { name:"Zoom",        label:"Unirse a Zoom",          bg:"bg-sky-950/40",    text:"text-sky-300",    border:"border-sky-600/30",    dot:"bg-sky-400"    };
  if (lower.includes("teams.microsoft.com") || lower.includes("teams.live.com"))
    return { name:"Teams",       label:"Unirse a Teams",         bg:"bg-slate-800/60",  text:"text-slate-300",  border:"border-slate-600/30",  dot:"bg-slate-400"  };
  if (lower.includes("whereby.com"))
    return { name:"Whereby",     label:"Unirse con Whereby",     bg:"bg-teal-950/40",   text:"text-teal-300",   border:"border-teal-600/30",   dot:"bg-teal-400"   };
  if (lower.includes("meet.jit.si"))
    return { name:"Jitsi",       label:"Unirse con Jitsi",       bg:"bg-slate-800/60",  text:"text-slate-300",  border:"border-slate-600/30",  dot:"bg-slate-400"  };
  return   { name:"Reunión",     label:"Unirse a la reunión",    bg:"bg-orange-950/30", text:"text-orange-300", border:"border-orange-600/30", dot:"bg-orange-400" };
}

// Detects platform from a plain-text name (e.g. "Google Meet", "Zoom")
const PLATFORM_NAMES: Record<string, MeetingPlatform> = {
  "google meet": { name:"Google Meet", label:"Unirse con Google Meet", bg:"bg-blue-950/40",   text:"text-blue-300",   border:"border-blue-600/30",   dot:"bg-blue-400"   },
  "meet":        { name:"Google Meet", label:"Unirse con Google Meet", bg:"bg-blue-950/40",   text:"text-blue-300",   border:"border-blue-600/30",   dot:"bg-blue-400"   },
  "zoom":        { name:"Zoom",        label:"Unirse a Zoom",          bg:"bg-sky-950/40",    text:"text-sky-300",    border:"border-sky-600/30",    dot:"bg-sky-400"    },
  "teams":       { name:"Teams",       label:"Unirse a Teams",         bg:"bg-slate-800/60",  text:"text-slate-300",  border:"border-slate-600/30",  dot:"bg-slate-400"  },
  "microsoft teams": { name:"Teams",   label:"Unirse a Teams",         bg:"bg-slate-800/60",  text:"text-slate-300",  border:"border-slate-600/30",  dot:"bg-slate-400"  },
  "whereby":     { name:"Whereby",     label:"Unirse con Whereby",     bg:"bg-teal-950/40",   text:"text-teal-300",   border:"border-teal-600/30",   dot:"bg-teal-400"   },
  "jitsi":       { name:"Jitsi",       label:"Unirse con Jitsi",       bg:"bg-slate-800/60",  text:"text-slate-300",  border:"border-slate-600/30",  dot:"bg-slate-400"  },
};

function detectPlatformFromText(text: string): MeetingPlatform | null {
  return PLATFORM_NAMES[text.trim().toLowerCase()] ?? null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtWeekday(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { weekday: "long" });
}
function fmtDayMonth(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingDetail {
  booking_id:            string;
  status:                "pending" | "confirmed" | "cancelled" | "completed";
  booker_name:           string;
  booker_email:          string;
  start_time:            string;
  end_time:              string;
  event_type:            string;
  duration_minutes:      number;
  location:              string;
  instructions:          string;
  org_name:              string;
  requires_confirmation: boolean;
}

const STATUS_META = {
  pending:   { label: "Pendiente de confirmación", dot: "bg-amber-400",  ring: "border-amber-500/30 bg-amber-950/30", text: "text-amber-300" },
  confirmed: { label: "Confirmada",                dot: "bg-green-400",  ring: "border-green-500/30 bg-green-950/30", text: "text-green-300" },
  cancelled: { label: "Cancelada",                 dot: "bg-slate-500",  ring: "border-slate-600/30 bg-slate-800/30", text: "text-slate-400" },
  completed: { label: "Completada",                dot: "bg-blue-400",   ring: "border-blue-500/30 bg-blue-950/30",  text: "text-blue-300"  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookingVerifyPage({ params }: { params: { bookingId: string } }) {
  const { bookingId } = params;

  const [booking,      setBooking]      = useState<BookingDetail | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [notFound,     setNotFound]     = useState(false);
  const [confirming,   setConfirming]   = useState(false);
  const [confirmed,    setConfirmed]    = useState(false);
  const [confirmError, setConfirmError] = useState("");

  useEffect(() => {
    publicBookingApi
      .getBooking(bookingId)
      .then((data) => {
        if (data.detail) setNotFound(true);
        else             setBooking(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const handleConfirm = async () => {
    setConfirming(true);
    setConfirmError("");
    try {
      const res = await publicBookingApi.confirmBooking(bookingId);
      if (res.status === "confirmed") {
        setConfirmed(true);
        setBooking((b) => b ? { ...b, status: "confirmed" } : b);
      } else {
        setConfirmError(res.detail || "No se pudo confirmar la reserva.");
      }
    } catch {
      setConfirmError("Error de red. Intenta de nuevo.");
    } finally {
      setConfirming(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  // ── Not found ──
  if (notFound || !booking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800">
              <AlertTriangle className="h-7 w-7 text-amber-400" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-slate-100">Reserva no encontrada</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            El enlace puede ser incorrecto o la reserva fue eliminada.
          </p>
        </div>
      </div>
    );
  }

  const meta      = STATUS_META[booking.status] ?? STATUS_META.pending;
  const isPending = booking.status === "pending" && booking.requires_confirmation && !confirmed;
  const currentStatus = confirmed ? "confirmed" : booking.status;
  const currentMeta   = STATUS_META[currentStatus] ?? STATUS_META.confirmed;

  return (
    <div className="min-h-screen bg-slate-950">

      {/* Top bar */}
      <div className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-600/15">
            <BookOpen className="h-3.5 w-3.5 text-orange-400" />
          </div>
          <span className="text-sm font-semibold text-slate-300">{booking.org_name}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-16">

        {/* Status badge */}
        <div className="mb-8 flex items-center gap-2.5">
          <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium ${currentMeta.ring} ${currentMeta.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${currentMeta.dot}`} />
            {currentMeta.label}
          </span>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">

          {/* ── LEFT: Event card (3 cols) ── */}
          <div className="md:col-span-3 space-y-4">

            {/* Hero card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              {/* Accent strip */}
              <div className="h-1.5 bg-gradient-to-r from-orange-600 to-orange-400" />

              <div className="p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-orange-400 mb-2">
                  {booking.org_name}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 leading-tight mb-6">
                  {booking.event_type}
                </h1>

                {/* Date & time block */}
                <div className="flex items-start gap-4 py-5 border-y border-slate-800">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-orange-600/10 border border-orange-600/20">
                    <CalendarCheck className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Fecha y hora</p>
                    <p className="text-lg font-bold text-slate-100 capitalize">
                      {fmtWeekday(booking.start_time)}
                    </p>
                    <p className="text-sm text-slate-300">
                      {fmtDayMonth(booking.start_time)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold text-slate-200">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {fmtTime(booking.start_time)} – {fmtTime(booking.end_time)}
                      </span>
                      <span className="text-xs text-slate-500">{booking.duration_minutes} min</span>
                    </div>
                  </div>
                </div>

                {/* Location — URL, platform name, or plain text */}
                {booking.location && (() => {
                  const locationIsUrl = isUrl(booking.location);
                  const platform      = locationIsUrl
                    ? detectPlatformFromUrl(booking.location)
                    : detectPlatformFromText(booking.location);
                  const isConfirmed   = currentStatus === "confirmed" || currentStatus === "completed";

                  return (
                    <div className="flex items-start gap-4 py-5 border-b border-slate-800">
                      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${platform && isConfirmed ? platform.bg + " border " + platform.border : "bg-slate-800"}`}>
                        {platform
                          ? <Video className={`h-5 w-5 ${isConfirmed ? platform.text : "text-slate-600"}`} />
                          : <MapPin className="h-5 w-5 text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                          {platform ? "Videollamada" : "Ubicación"}
                        </p>
                        {platform ? (
                          isConfirmed ? (
                            <>
                              <p className="text-sm font-semibold text-slate-200 mb-2">{platform.name}</p>
                              {locationIsUrl ? (
                                <a
                                  href={booking.location}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all hover:brightness-110 ${platform.bg} ${platform.border} ${platform.text}`}
                                >
                                  <span className={`h-2 w-2 rounded-full ${platform.dot}`} />
                                  {platform.label}
                                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                                </a>
                              ) : (
                                <span className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${platform.bg} ${platform.border} ${platform.text}`}>
                                  <span className={`h-2 w-2 rounded-full ${platform.dot}`} />
                                  {platform.name}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-semibold text-slate-500 mb-2">{platform.name}</p>
                              <div className="flex items-start gap-2">
                                <Info className="h-3.5 w-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-slate-400 leading-relaxed">
                                  El link de acceso se compartirá una vez que la reserva sea confirmada.
                                </p>
                              </div>
                            </>
                          )
                        ) : (
                          <p className="text-sm font-medium text-slate-200">{booking.location}</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Instructions */}
                {booking.instructions && (
                  <div className="flex items-start gap-4 pt-5">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-800">
                      <FileText className="h-5 w-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Instrucciones</p>
                      <p className="text-sm text-slate-400 leading-relaxed">{booking.instructions}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Participant + action (2 cols) ── */}
          <div className="md:col-span-2 space-y-4">

            {/* Participant card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Participante</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 flex-shrink-0">
                  <User className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-100 truncate">{booking.booker_name}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-500 truncate">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    {booking.booker_email}
                  </p>
                </div>
              </div>
            </div>

            {/* Action card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">

              {/* Pending → confirm CTA */}
              {isPending && (
                <>
                  <div>
                    <p className="text-sm font-semibold text-slate-200 mb-1">Confirma tu asistencia</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      El organizador está esperando tu confirmación. Al confirmar, la cita quedará fijada en el calendario.
                    </p>
                  </div>
                  {confirmError && (
                    <p className="text-xs text-red-400">{confirmError}</p>
                  )}
                  <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-60 px-4 py-3.5 text-sm font-bold text-white transition-all"
                  >
                    {confirming
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <CheckCircle2 className="h-4 w-4" />}
                    Confirmar asistencia
                  </button>
                  <p className="text-center text-[11px] text-slate-600">
                    Sin cargo. Solo confirma tu presencia.
                  </p>
                </>
              )}

              {/* Confirmed / just-confirmed */}
              {(currentStatus === "confirmed" || confirmed) && (
                <div className="flex flex-col items-center text-center gap-3 py-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-950/60 border border-green-700/30">
                    <CheckCircle2 className="h-7 w-7 text-green-400" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-100">¡Estás confirmado!</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Tu asistencia ha sido registrada. Te esperamos en la cita.
                    </p>
                  </div>
                </div>
              )}

              {/* Cancelled */}
              {currentStatus === "cancelled" && (
                <div className="flex flex-col items-center text-center gap-3 py-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 border border-slate-700/40">
                    <XCircle className="h-7 w-7 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-300">Reserva cancelada</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Esta cita fue cancelada. Contacta con nosotros si deseas reagendar.
                    </p>
                  </div>
                </div>
              )}

              {/* Completed */}
              {currentStatus === "completed" && (
                <div className="flex flex-col items-center text-center gap-3 py-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-950/50 border border-blue-700/30">
                    <CalendarCheck className="h-7 w-7 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-100">Cita completada</p>
                    <p className="text-xs text-slate-500 mt-1">¡Gracias por tu asistencia!</p>
                  </div>
                </div>
              )}
            </div>

            {/* Booking ID */}
            <p className="text-center text-[11px] text-slate-700">
              ID {booking.booking_id.slice(0, 8).toUpperCase()}
            </p>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800/40 py-6 text-center">
        <p className="text-xs text-slate-700">Gestionado por OptimizaCRM</p>
      </div>

    </div>
  );
}
