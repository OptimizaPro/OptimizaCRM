"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { schedulingApi, type AvailabilitySlot } from "@/lib/api";
import { Clock, Loader2, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

// ─── Day structure ────────────────────────────────────────────────────────────

const DAYS = [
  { day_of_week: 0, label: "Lunes" },
  { day_of_week: 1, label: "Martes" },
  { day_of_week: 2, label: "Miércoles" },
  { day_of_week: 3, label: "Jueves" },
  { day_of_week: 4, label: "Viernes" },
  { day_of_week: 5, label: "Sábado" },
  { day_of_week: 6, label: "Domingo" },
];

type DayState = {
  day_of_week: number;
  label: string;
  is_active: boolean;
  start_time: string;
  end_time: string;
};

function toHHMM(timeStr: string) {
  // "HH:MM:SS" → "HH:MM"
  return timeStr.slice(0, 5);
}

function toHHMMSS(timeStr: string) {
  // "HH:MM" → "HH:MM:SS"
  return `${timeStr}:00`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AvailabilityPage() {
  const { tokens, organization } = useAuthStore();
  const token = tokens?.access ?? "";
  const orgId = String(organization?.id ?? "");

  const [days, setDays] = useState<DayState[]>(
    DAYS.map((d) => ({
      ...d,
      is_active: d.day_of_week < 5, // Mon-Fri active by default
      start_time: "09:00",
      end_time: "18:00",
    }))
  );

  const { data: slots, isLoading } = useQuery({
    queryKey: ["scheduling-availability", orgId],
    queryFn: () => schedulingApi.listAvailability(token, orgId),
    enabled: !!token,
  });

  // Hydrate local state from fetched slots
  useEffect(() => {
    if (!slots || slots.length === 0) return;
    setDays((prev) =>
      prev.map((day) => {
        const slot = slots.find((s: AvailabilitySlot) => s.day_of_week === day.day_of_week);
        if (!slot) return day;
        return {
          ...day,
          is_active: slot.is_active,
          start_time: toHHMM(slot.start_time),
          end_time: toHHMM(slot.end_time),
        };
      })
    );
  }, [slots]);

  const saveMutation = useMutation({
    mutationFn: () =>
      schedulingApi.bulkUpdateAvailability(
        token,
        orgId,
        days.map((d) => ({
          day_of_week: d.day_of_week,
          is_active: d.is_active,
          start_time: toHHMMSS(d.start_time),
          end_time: toHHMMSS(d.end_time),
        }))
      ),
    onSuccess: () => toast.success("Disponibilidad guardada"),
    onError: (e: Error) => toast.error(e.message),
  });

  const setDay = (dow: number, patch: Partial<DayState>) =>
    setDays((prev) =>
      prev.map((d) => (d.day_of_week === dow ? { ...d, ...patch } : d))
    );

  const inputCls =
    "rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <>
      <DashboardHeader title="Disponibilidad" />

      <div className="flex-1 overflow-y-auto bg-slate-900/30 p-4 sm:p-6">
        <div className="mx-auto max-w-2xl space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-950/40 text-green-400">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-100">Disponibilidad semanal</h1>
                <p className="text-xs text-slate-500">
                  Configura los días y horarios en que aceptas reservas
                </p>
              </div>
            </div>
            <Button
              size="sm"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Guardar disponibilidad
            </Button>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
              {days.map((day, i) => (
                <div
                  key={day.day_of_week}
                  className={`flex items-center gap-4 px-5 py-4 ${i < days.length - 1 ? "border-b border-slate-800/60" : ""}`}
                >
                  {/* Toggle */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={day.is_active}
                    onClick={() => setDay(day.day_of_week, { is_active: !day.is_active })}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${day.is_active ? "bg-green-600" : "bg-slate-700"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${day.is_active ? "translate-x-4" : "translate-x-0"}`}
                    />
                  </button>

                  {/* Day icon visual */}
                  <div className="flex items-center gap-1.5">
                    {day.is_active ? (
                      <ToggleRight className="h-4 w-4 text-green-400 hidden sm:block" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-slate-600 hidden sm:block" />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`w-24 flex-shrink-0 text-sm font-medium ${day.is_active ? "text-slate-200" : "text-slate-600"}`}
                  >
                    {day.label}
                  </span>

                  {/* Time inputs */}
                  {day.is_active ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        className={inputCls}
                        value={day.start_time}
                        onChange={(e) => setDay(day.day_of_week, { start_time: e.target.value })}
                      />
                      <span className="text-slate-600 text-xs">—</span>
                      <input
                        type="time"
                        className={inputCls}
                        value={day.end_time}
                        onChange={(e) => setDay(day.day_of_week, { end_time: e.target.value })}
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600 italic">No disponible</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Info note */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-400">Nota:</strong> Los horarios que configures aquí definen cuándo pueden reservar tus clientes.
            Asegúrate de que coincidan con tu disponibilidad real para evitar conflictos.
            Cada tipo de evento también puede tener reglas de aviso mínimo y máximo.
          </div>
        </div>
      </div>
    </>
  );
}
