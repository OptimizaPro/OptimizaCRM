"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { schedulingApi, type AvailabilitySlot } from "@/lib/api";
import { Clock, Loader2, Save, Plus, Trash2, Info } from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeRange = {
  id: string;           // local key for React
  start_time: string;   // "HH:MM"
  end_time: string;     // "HH:MM"
};

type DayState = {
  day_of_week: number;
  label: string;
  short: string;
  is_active: boolean;
  ranges: TimeRange[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS: Pick<DayState, "day_of_week" | "label" | "short">[] = [
  { day_of_week: 0, label: "Lunes",     short: "Lu" },
  { day_of_week: 1, label: "Martes",    short: "Ma" },
  { day_of_week: 2, label: "Miércoles", short: "Mi" },
  { day_of_week: 3, label: "Jueves",    short: "Ju" },
  { day_of_week: 4, label: "Viernes",   short: "Vi" },
  { day_of_week: 5, label: "Sábado",    short: "Sá" },
  { day_of_week: 6, label: "Domingo",   short: "Do" },
];

const DEFAULT_RANGES: TimeRange[] = [
  { id: "default-1", start_time: "09:00", end_time: "18:00" },
];

let _uid = 0;
const uid = () => `r-${++_uid}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toHHMM(t: string) { return t.slice(0, 5); }
function toHHMMSS(t: string) { return `${t}:00`; }

/** Given existing ranges, suggest a sensible start for a new one */
function suggestNextRange(ranges: TimeRange[]): TimeRange {
  if (ranges.length === 0) return { id: uid(), start_time: "09:00", end_time: "18:00" };
  const last = ranges[ranges.length - 1];
  const [h, m] = last.end_time.split(":").map(Number);
  const totalMin = h * 60 + m + 30; // 30-min gap after last slot
  const nh = Math.floor(totalMin / 60) % 24;
  const nm = totalMin % 60;
  const start = `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
  const endMin = totalMin + 60; // 1 hour duration by default
  const eh = Math.floor(endMin / 60) % 24;
  const em = endMin % 60;
  const end = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  return { id: uid(), start_time: start, end_time: end };
}

/** Format a range for display: "09:00 – 18:00  (9h)" */
function rangeSummary(r: TimeRange) {
  const [sh, sm] = r.start_time.split(":").map(Number);
  const [eh, em] = r.end_time.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return r.start_time + " – " + r.end_time;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  const dur = h > 0 && m > 0 ? `${h}h ${m}min` : h > 0 ? `${h}h` : `${m}min`;
  return `${r.start_time} – ${r.end_time}  (${dur})`;
}

// ─── RangeRow ─────────────────────────────────────────────────────────────────

function RangeRow({
  range,
  canDelete,
  onChange,
  onDelete,
}: {
  range: TimeRange;
  canDelete: boolean;
  onChange: (patch: Partial<TimeRange>) => void;
  onDelete: () => void;
}) {
  const inputCls =
    "rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm text-slate-200 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 w-[6.5rem]";

  const invalid =
    range.start_time >= range.end_time && range.end_time !== "00:00";

  return (
    <div className={`flex items-center gap-2 ${invalid ? "opacity-80" : ""}`}>
      <input
        type="time"
        className={`${inputCls} ${invalid ? "border-red-600" : ""}`}
        value={range.start_time}
        onChange={(e) => onChange({ start_time: e.target.value })}
      />
      <span className="text-slate-600 text-xs select-none">—</span>
      <input
        type="time"
        className={`${inputCls} ${invalid ? "border-red-600" : ""}`}
        value={range.end_time}
        onChange={(e) => onChange({ end_time: e.target.value })}
      />
      {invalid && (
        <span className="text-xs text-red-400">fin &lt; inicio</span>
      )}
      <button
        type="button"
        onClick={onDelete}
        disabled={!canDelete}
        title="Eliminar franja"
        className="ml-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-red-950/40 hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── DayRow ───────────────────────────────────────────────────────────────────

function DayRow({
  day,
  onToggle,
  onAddRange,
  onChangeRange,
  onDeleteRange,
}: {
  day: DayState;
  onToggle: () => void;
  onAddRange: () => void;
  onChangeRange: (id: string, patch: Partial<TimeRange>) => void;
  onDeleteRange: (id: string) => void;
}) {
  return (
    <div className="px-5 py-4 border-b border-slate-800/60 last:border-b-0">
      <div className="flex items-start gap-4">

        {/* Toggle + label */}
        <div className="flex items-center gap-3 w-36 flex-shrink-0 pt-1">
          <button
            type="button"
            role="switch"
            aria-checked={day.is_active}
            onClick={onToggle}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
              day.is_active ? "bg-green-600" : "bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                day.is_active ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium select-none ${
              day.is_active ? "text-slate-200" : "text-slate-600"
            }`}
          >
            {day.label}
          </span>
        </div>

        {/* Ranges or "no disponible" */}
        {day.is_active ? (
          <div className="flex flex-col gap-2 flex-1">
            {day.ranges.map((r) => (
              <RangeRow
                key={r.id}
                range={r}
                canDelete={day.ranges.length > 1}
                onChange={(patch) => onChangeRange(r.id, patch)}
                onDelete={() => onDeleteRange(r.id)}
              />
            ))}

            {/* Add range */}
            <button
              type="button"
              onClick={onAddRange}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-400 transition-colors mt-0.5 w-fit"
            >
              <Plus className="h-3 w-3" />
              Añadir franja
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-600 italic pt-1.5">No disponible</span>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function buildDefault(): DayState[] {
  return DAYS.map((d) => ({
    ...d,
    is_active: d.day_of_week < 5,
    ranges: DEFAULT_RANGES.map((r) => ({ ...r, id: uid() })),
  }));
}

export default function AvailabilityPage() {
  const { tokens, organization } = useAuthStore();
  const token = tokens?.access ?? "";
  const orgId = String(organization?.id ?? "");

  const [days, setDays] = useState<DayState[]>(buildDefault);

  const { data: slots, isLoading } = useQuery({
    queryKey: ["scheduling-availability", orgId],
    queryFn: () => schedulingApi.listAvailability(token, orgId),
    enabled: !!token,
  });

  // Hydrate from API — group multiple slots per day_of_week
  useEffect(() => {
    if (!slots) return;
    if (slots.length === 0) return;

    setDays((prev) =>
      prev.map((day) => {
        const daySlots = slots.filter(
          (s: AvailabilitySlot) => s.day_of_week === day.day_of_week
        );
        if (daySlots.length === 0) return { ...day, is_active: false };

        const anyActive = daySlots.some((s) => s.is_active);
        return {
          ...day,
          is_active: anyActive,
          ranges: daySlots.map((s) => ({
            id: uid(),
            start_time: toHHMM(s.start_time),
            end_time: toHHMM(s.end_time),
          })),
        };
      })
    );
  }, [slots]);

  const saveMutation = useMutation({
    mutationFn: () => {
      // Flatten all active days + all their ranges into the slot array
      const payload = days.flatMap((day) => {
        if (!day.is_active) return [];
        return day.ranges.map((r) => ({
          day_of_week: day.day_of_week,
          is_active: true,
          start_time: toHHMMSS(r.start_time),
          end_time: toHHMMSS(r.end_time),
        }));
      });
      return schedulingApi.bulkUpdateAvailability(token, orgId, payload);
    },
    onSuccess: () => toast.success("Disponibilidad guardada"),
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutators
  const toggleDay = (dow: number) =>
    setDays((prev) =>
      prev.map((d) =>
        d.day_of_week === dow ? { ...d, is_active: !d.is_active } : d
      )
    );

  const addRange = (dow: number) =>
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_of_week !== dow) return d;
        return { ...d, ranges: [...d.ranges, suggestNextRange(d.ranges)] };
      })
    );

  const changeRange = (dow: number, id: string, patch: Partial<TimeRange>) =>
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_of_week !== dow) return d;
        return {
          ...d,
          ranges: d.ranges.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        };
      })
    );

  const deleteRange = (dow: number, id: string) =>
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_of_week !== dow) return d;
        return { ...d, ranges: d.ranges.filter((r) => r.id !== id) };
      })
    );

  // Quick summary for the header
  const activeDays = days.filter((d) => d.is_active).length;
  const totalRanges = days
    .filter((d) => d.is_active)
    .reduce((acc, d) => acc + d.ranges.length, 0);

  return (
    <>
      <DashboardHeader title="Disponibilidad" />

      <div className="flex-1 overflow-y-auto bg-slate-900/30 p-4 sm:p-6">
        <div className="mx-auto max-w-2xl space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-950/40 text-green-400 flex-shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-100">
                  Disponibilidad semanal
                </h1>
                <p className="text-xs text-slate-500">
                  {activeDays > 0
                    ? `${activeDays} días activos · ${totalRanges} franja${totalRanges !== 1 ? "s" : ""} en total`
                    : "Ningún día activo — activa al menos uno"}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="flex-shrink-0 gap-1.5 bg-orange-600 hover:bg-orange-500 text-white"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Guardar
            </Button>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
              {days.map((day) => (
                <DayRow
                  key={day.day_of_week}
                  day={day}
                  onToggle={() => toggleDay(day.day_of_week)}
                  onAddRange={() => addRange(day.day_of_week)}
                  onChangeRange={(id, patch) =>
                    changeRange(day.day_of_week, id, patch)
                  }
                  onDeleteRange={(id) => deleteRange(day.day_of_week, id)}
                />
              ))}
            </div>
          )}

          {/* Info note */}
          <div className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <Info className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-500 leading-relaxed space-y-1">
              <p>
                <strong className="text-slate-400">Múltiples franjas por día:</strong> puedes añadir varias franjas para reflejar pausas como la comida. Ej: 8:00–12:00 y 14:00–18:00.
              </p>
              <p>
                <strong className="text-slate-400">Pausa entre citas:</strong> cada tipo de evento tiene su propia "pausa entre citas" (buffer). Si una cita de 45 min acaba a las 8:45 y el buffer es 15 min, el siguiente slot disponible será a las 9:00.
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
