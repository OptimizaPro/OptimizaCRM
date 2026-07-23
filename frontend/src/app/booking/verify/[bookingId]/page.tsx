"use client";

import { useState, useEffect } from "react";
import { publicBookingApi } from "@/lib/api";
import {
  CalendarCheck, Clock, MapPin, CheckCircle2, XCircle,
  Loader2, AlertTriangle, BookOpen, FileText,
} from "lucide-react";

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

interface BookingDetail {
  booking_id: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  booker_name: string;
  booker_email: string;
  start_time: string;
  end_time: string;
  event_type: string;
  duration_minutes: number;
  location: string;
  instructions: string;
  org_name: string;
  requires_confirmation: boolean;
}

const STATUS_META = {
  pending:   { label: "Pendiente de confirmación", color: "text-amber-400",  bg: "bg-amber-950/40 border-amber-700/30",  icon: Clock },
  confirmed: { label: "Confirmada",                color: "text-green-400",  bg: "bg-green-950/40 border-green-700/30",  icon: CheckCircle2 },
  cancelled: { label: "Cancelada",                 color: "text-slate-400",  bg: "bg-slate-800/60 border-slate-700/30",  icon: XCircle },
  completed: { label: "Completada",                color: "text-blue-400",   bg: "bg-blue-950/40 border-blue-700/30",    icon: CalendarCheck },
};

export default function BookingVerifyPage({ params }: { params: { bookingId: string } }) {
  const { bookingId } = params;

  const [booking, setBooking]     = useState<BookingDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  useEffect(() => {
    publicBookingApi
      .getBooking(bookingId)
      .then((data) => {
        if (data.detail) { setNotFound(true); }
        else             { setBooking(data); }
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
              <AlertTriangle className="h-8 w-8 text-amber-400" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-slate-100">Reserva no encontrada</h1>
          <p className="text-sm text-slate-500">
            El enlace puede ser incorrecto o la reserva ha sido eliminada.
          </p>
        </div>
      </div>
    );
  }

  const meta       = STATUS_META[booking.status] ?? STATUS_META.pending;
  const StatusIcon = meta.icon;
  const isPending  = booking.status === "pending" && booking.requires_confirmation && !confirmed;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-950/40">
              <BookOpen className="h-6 w-6 text-orange-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Tu reserva</h1>
          <p className="text-sm text-slate-500">{booking.org_name}</p>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-2.5 rounded-2xl border p-4 ${meta.bg}`}>
          <StatusIcon className={`h-5 w-5 flex-shrink-0 ${meta.color}`} />
          <div>
            <p className={`font-semibold text-sm ${meta.color}`}>{meta.label}</p>
            {booking.status === "pending" && booking.requires_confirmation && !confirmed && (
              <p className="text-xs text-slate-500 mt-0.5">
                Confirma tu asistencia con el botón de abajo.
              </p>
            )}
            {confirmed && (
              <p className="text-xs text-green-400/80 mt-0.5">¡Has confirmado tu asistencia!</p>
            )}
          </div>
        </div>

        {/* Booking details */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
          <div className="px-5 py-4 space-y-1">
            <p className="text-xs text-slate-500">Tipo de cita</p>
            <p className="font-semibold text-slate-100">{booking.event_type}</p>
            <p className="text-xs text-slate-500">{booking.duration_minutes} minutos</p>
          </div>

          <div className="px-5 py-4 flex items-start gap-3">
            <CalendarCheck className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-200 capitalize">
                {fmtDateLong(booking.start_time)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {fmtTime(booking.start_time)} – {fmtTime(booking.end_time)}
              </p>
            </div>
          </div>

          {booking.location && (
            <div className="px-5 py-4 flex items-start gap-3">
              <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300">{booking.location}</p>
            </div>
          )}

          <div className="px-5 py-4 space-y-1">
            <p className="text-xs text-slate-500">Participante</p>
            <p className="text-sm font-medium text-slate-200">{booking.booker_name}</p>
            <p className="text-xs text-slate-500">{booking.booker_email}</p>
          </div>
        </div>

        {/* Instructions */}
        {booking.instructions && (
          <div className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <FileText className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">{booking.instructions}</p>
          </div>
        )}

        {/* Confirm CTA */}
        {isPending && (
          <div className="space-y-2">
            {confirmError && (
              <p className="text-xs text-red-400 text-center">{confirmError}</p>
            )}
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-orange-600 hover:bg-orange-500 disabled:opacity-60 px-4 py-3.5 text-sm font-semibold text-white transition-all"
            >
              {confirming
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CheckCircle2 className="h-4 w-4" />}
              Confirmar mi asistencia
            </button>
            <p className="text-center text-xs text-slate-600">
              Al confirmar, aceptas que la cita quede registrada.
            </p>
          </div>
        )}

        {/* Already confirmed/completed success */}
        {(booking.status === "confirmed" || booking.status === "completed" || confirmed) && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-green-700/30 bg-green-950/20 p-4">
            <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-300">
              {booking.status === "completed"
                ? "Esta cita ya se completó. ¡Gracias!"
                : "Tu asistencia está confirmada. ¡Te esperamos!"}
            </p>
          </div>
        )}

        {/* Cancelled */}
        {booking.status === "cancelled" && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-slate-700/40 bg-slate-800/40 p-4">
            <XCircle className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <p className="text-sm text-slate-400">
              Esta reserva ha sido cancelada. Contacta con nosotros si necesitas reagendar.
            </p>
          </div>
        )}

        <p className="text-center text-[11px] text-slate-700 pb-4">
          Gestionado por OptimizaCRM
        </p>
      </div>
    </div>
  );
}
