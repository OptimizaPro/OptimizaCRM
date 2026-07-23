"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { schedulingApi, type Booking, type BookingStatus } from "@/lib/api";
import {
  BookOpen, Loader2, CheckCircle2, XCircle, Clock,
  CalendarCheck, User, Mail, X,
} from "lucide-react";
import { toast } from "sonner";

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_TABS: { key: string; label: string }[] = [
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

// ─── Cancel dialog ────────────────────────────────────────────────────────────

function CancelDialog({
  booking,
  onClose,
  onConfirm,
  loading,
}: {
  booking: Booking;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
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
              Vas a cancelar la reserva de{" "}
              <strong className="text-slate-200">{booking.booker_name}</strong>.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Motivo de cancelación (opcional)
              </label>
              <textarea
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none resize-none"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej. Conflicto de agenda, fuera del servicio…"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={loading}
              onClick={() => onConfirm(reason)}
              className="gap-1.5 bg-red-700 hover:bg-red-600 text-white"
            >
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
  const token = tokens?.access ?? "";
  const orgId = String(organization?.id ?? "");
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("all");
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["scheduling-bookings", orgId, activeTab],
    queryFn: () =>
      schedulingApi.listBookings(
        token,
        orgId,
        activeTab !== "all" ? { status: activeTab } : undefined
      ),
    enabled: !!token,
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

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <DashboardHeader title="Reservas" />

      <div className="flex-1 overflow-y-auto bg-slate-900/30 p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-5">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-950/40 text-orange-400">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100">Reservas entrantes</h1>
              <p className="text-xs text-slate-500">
                Gestiona las reservas de tus clientes
              </p>
            </div>
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

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-16 text-center">
              <CalendarCheck className="mx-auto mb-3 h-10 w-10 text-slate-700" />
              <h3 className="font-semibold text-slate-400 mb-1">Sin reservas</h3>
              <p className="text-sm text-slate-600">
                {activeTab === "all"
                  ? "Aún no has recibido ninguna reserva."
                  : `No hay reservas con estado "${STATUS_TABS.find(t => t.key === activeTab)?.label}".`}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800/60">
                      {["Cliente", "Tipo de evento", "Fecha y hora", "Duración", "Estado", "Acciones"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((booking, i) => {
                      const status = STATUS_META[booking.status];
                      return (
                        <tr
                          key={booking.id}
                          className={`${i < list.length - 1 ? "border-b border-slate-800/40" : ""} hover:bg-slate-900/40 transition-colors`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                                <User className="h-3.5 w-3.5" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-200">{booking.booker_name}</p>
                                <p className="flex items-center gap-1 text-[11px] text-slate-500">
                                  <Mail className="h-2.5 w-2.5" />
                                  {booking.booker_email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-300">{booking.event_type_title}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-slate-300">{fmtDate(booking.start_time)}</p>
                            <p className="text-xs text-slate-500">
                              {fmtTime(booking.start_time)} — {fmtTime(booking.end_time)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-400">
                              {booking.event_type_duration} min
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.bg} ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {booking.status === "pending" && (
                                <button
                                  onClick={() => confirmMutation.mutate(booking.id)}
                                  disabled={confirmMutation.isPending}
                                  title="Confirmar"
                                  className="flex items-center gap-1 rounded-lg bg-green-950/50 px-2 py-1 text-[11px] font-semibold text-green-400 transition-all hover:bg-green-900/50 disabled:opacity-40"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Confirmar
                                </button>
                              )}
                              {(booking.status === "pending" || booking.status === "confirmed") && (
                                <button
                                  onClick={() => setCancelTarget(booking)}
                                  title="Cancelar"
                                  className="flex items-center gap-1 rounded-lg bg-red-950/40 px-2 py-1 text-[11px] font-semibold text-red-400 transition-all hover:bg-red-900/50"
                                >
                                  <XCircle className="h-3 w-3" />
                                  Cancelar
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

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-800/60">
                {list.map((booking) => {
                  const status = STATUS_META[booking.status];
                  return (
                    <div key={booking.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-200 text-sm">{booking.booker_name}</p>
                          <p className="text-xs text-slate-500">{booking.booker_email}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{booking.event_type_title} · {booking.event_type_duration} min</p>
                      <p className="text-xs text-slate-500">
                        <Clock className="inline h-3 w-3 mr-0.5" />
                        {fmtDate(booking.start_time)} · {fmtTime(booking.start_time)}
                      </p>
                      <div className="flex gap-2 pt-1">
                        {booking.status === "pending" && (
                          <button
                            onClick={() => confirmMutation.mutate(booking.id)}
                            disabled={confirmMutation.isPending}
                            className="flex items-center gap-1 rounded-lg bg-green-950/50 px-2.5 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-900/50 disabled:opacity-40"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Confirmar
                          </button>
                        )}
                        {(booking.status === "pending" || booking.status === "confirmed") && (
                          <button
                            onClick={() => setCancelTarget(booking)}
                            className="flex items-center gap-1 rounded-lg bg-red-950/40 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-900/50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Cancelar
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
