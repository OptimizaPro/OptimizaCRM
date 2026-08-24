"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { DashboardKPIs } from "@/components/dashboard/kpi-cards";
import { RevenueChart, FunnelChartWidget } from "@/components/dashboard/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth";
import { crmApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { CalendarDays, ArrowLeftRight } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  status_change: "Cambio de etapa",
  note:          "Nota",
  call:          "Llamada",
  email:         "Email",
  meeting:       "Reunión",
  task:          "Tarea",
  conversion:    "Conversión",
  assignment:    "Asignación",
};

// ─── MonthYearPicker ─────────────────────────────────────────────────────────

function MonthYearPicker({
  label,
  month,
  year,
  onMonthChange,
  onYearChange,
  accent = false,
}: {
  label:         string;
  month:         number;
  year:          number;
  onMonthChange: (m: number) => void;
  onYearChange:  (y: number) => void;
  accent?:       boolean;
}) {
  const currentYear = new Date().getFullYear();
  // Show years from 3 years ago up to current year
  const years = Array.from({ length: currentYear - 2022 }, (_, i) => 2023 + i);

  const selectClass = `
    appearance-none bg-slate-900 border border-slate-700 rounded-lg
    px-3 py-1.5 text-sm font-medium text-slate-200
    focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30
    hover:border-slate-600 transition-colors cursor-pointer
  `;

  return (
    <div className="flex flex-col gap-1.5">
      <span className={`text-[10px] uppercase tracking-widest font-semibold ${accent ? "text-orange-500" : "text-slate-500"}`}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <select
          value={month}
          onChange={e => onMonthChange(Number(e.target.value))}
          className={selectClass}
        >
          {MONTHS_ES.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={e => onYearChange(Number(e.target.value))}
          className={selectClass}
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { tokens, organization, logout } = useAuthStore();

  // Selected period (defaults to current month/year)
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selYear,  setSelYear]  = useState(now.getFullYear());

  // Comparison period (defaults to previous month)
  const [cmpMonth, setCmpMonth] = useState(now.getMonth() > 0 ? now.getMonth() : 12);
  const [cmpYear,  setCmpYear]  = useState(now.getMonth() > 0 ? now.getFullYear() : now.getFullYear() - 1);

  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ["dashboard", selYear, selMonth, cmpYear, cmpMonth],
    queryFn:  () => crmApi.getDashboard(tokens!.access, String(organization!.id), selYear, selMonth, cmpYear, cmpMonth),
    enabled:  !!tokens && !!organization,
    retry:    false,
  });

  const { data: revenue } = useQuery({
    queryKey: ["revenue-analytics"],
    queryFn:  () => crmApi.getRevenueAnalytics(tokens!.access, String(organization!.id)),
    enabled:  !!tokens && !!organization,
    retry:    false,
  });

  const { data: pipeline } = useQuery({
    queryKey: ["pipeline-analytics"],
    queryFn:  () => crmApi.getPipelineAnalytics(tokens!.access, String(organization!.id)),
    enabled:  !!tokens && !!organization,
    retry:    false,
  });

  useEffect(() => {
    if (error) {
      const msg = (error as Error).message;
      if (msg.includes("401") || msg.includes("403") || msg.toLowerCase().includes("unauthorized")) {
        logout();
        router.replace("/login");
      }
    }
  }, [error, logout, router]);

  return (
    <>
      <DashboardHeader title="Dashboard" />
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium text-red-600">Error al cargar el dashboard</p>
            <p className="text-xs text-slate-500">{(error as Error).message}</p>
          </div>
        ) : dashboard ? (
          <div className="space-y-6">

            {/* ── Period + Compare selectors ── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 backdrop-blur-sm shadow-xl shadow-black/20 p-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">

                {/* Selected period */}
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-500 flex-shrink-0 mb-0.5" />
                  <MonthYearPicker
                    label="Período"
                    month={selMonth}
                    year={selYear}
                    onMonthChange={setSelMonth}
                    onYearChange={setSelYear}
                    accent
                  />
                </div>

                {/* VS divider */}
                <div className="flex items-center gap-2 text-slate-600 pb-1">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold uppercase tracking-widest">vs</span>
                </div>

                {/* Comparison period */}
                <MonthYearPicker
                  label="Comparar con"
                  month={cmpMonth}
                  year={cmpYear}
                  onMonthChange={setCmpMonth}
                  onYearChange={setCmpYear}
                />

                {/* Live label */}
                {dashboard && (
                  <div className="hidden lg:flex flex-col justify-end ml-auto text-right pb-1">
                    <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold">Analizando</p>
                    <p className="text-xs text-slate-400 leading-tight">
                      <span className="text-slate-200 font-medium">{dashboard.period_label}</span>
                      {" "}<span className="text-slate-600">·</span>{" "}
                      <span className="text-orange-400">{dashboard.compare_label}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DashboardKPIs
              revenue={dashboard.revenue}
              sales={dashboard.sales}
              conversion={dashboard.conversion}
              customers={dashboard.customers}
              tasks={dashboard.tasks}
              compareLabel={dashboard.compare_label}
            />

            <div className="grid gap-6 md:grid-cols-2">
              {revenue && <RevenueChart data={revenue.data} />}
              {pipeline && <FunnelChartWidget data={pipeline.funnel} />}
            </div>

            <Card className="bg-slate-950">
              <CardHeader>
                <CardTitle>Actividad reciente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.recent_activities.length === 0 ? (
                    <p className="text-sm text-slate-400">Sin actividad reciente</p>
                  ) : (
                    dashboard.recent_activities.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-200 truncate">{a.subject}</p>
                          <p className="text-xs text-slate-400 truncate">{a.user__email} · {ACTIVITY_TYPE_LABELS[a.activity_type] ?? a.activity_type}</p>
                        </div>
                        <span className="text-xs text-slate-500 flex-shrink-0">{formatDate(a.created_at)}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </>
  );
}
