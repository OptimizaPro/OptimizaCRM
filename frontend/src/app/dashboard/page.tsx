"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { DashboardKPIs } from "@/components/dashboard/kpi-cards";
import { RevenueChart, FunnelChartWidget } from "@/components/dashboard/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth";
import { crmApi, type DashboardPeriod, type DashboardCompare } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { CalendarDays, TrendingUp, BarChart2, ArrowLeftRight, BarChart } from "lucide-react";

// ─── Selectors ────────────────────────────────────────────────────────────────

const PERIODS: { key: DashboardPeriod; label: string; icon: React.ElementType }[] = [
  { key: "month",   label: "Este mes",  icon: CalendarDays },
  { key: "quarter", label: "Trimestre", icon: BarChart2    },
  { key: "year",    label: "Este año",  icon: TrendingUp   },
];

const COMPARES: { key: DashboardCompare; label: string; short: string }[] = [
  { key: "previous", label: "vs. período anterior",          short: "Per. anterior" },
  { key: "yoy",      label: "vs. mismo período año anterior", short: "Año anterior"  },
];

function PeriodTabs({
  value, onChange,
}: {
  value:    DashboardPeriod;
  onChange: (v: DashboardPeriod) => void;
}) {
  return (
    <div className="flex items-stretch overflow-x-auto scrollbar-hide">
      {PERIODS.map((p, i) => {
        const Icon    = p.icon;
        const active  = value === p.key;
        return (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            className={`
              group relative flex items-center gap-2 px-3 sm:px-5 py-2.5 sm:py-3 text-sm font-medium transition-all duration-150 whitespace-nowrap
              ${i > 0 ? "border-l border-slate-800/60" : ""}
              ${active
                ? "text-slate-100"
                : "text-slate-500 hover:text-slate-300"
              }
            `}
          >
            <Icon className={`h-3.5 w-3.5 flex-shrink-0 transition-colors ${active ? "text-orange-400" : "text-slate-600 group-hover:text-slate-400"}`} />
            {p.label}
            {/* Active indicator bar */}
            <span className={`absolute bottom-0 left-3 right-3 h-[2px] rounded-full transition-all duration-200 ${active ? "bg-orange-500 opacity-100" : "opacity-0"}`} />
          </button>
        );
      })}
    </div>
  );
}

function CompareSegment({
  value, onChange,
}: {
  value:    DashboardCompare;
  onChange: (v: DashboardCompare) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-slate-900 border border-slate-800 p-0.5">
      {COMPARES.map(c => (
        <button
          key={c.key}
          onClick={() => onChange(c.key)}
          title={c.label}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150 whitespace-nowrap ${
            value === c.key
              ? "bg-slate-700 text-slate-100 shadow-sm"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {c.key === "previous" ? <ArrowLeftRight className="h-3 w-3 flex-shrink-0" /> : <BarChart className="h-3 w-3 flex-shrink-0" />}
          {c.short}
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { tokens, organization, logout } = useAuthStore();
  const [period,  setPeriod]  = useState<DashboardPeriod>("month");
  const [compare, setCompare] = useState<DashboardCompare>("previous");

  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ["dashboard", period, compare],
    queryFn:  () => crmApi.getDashboard(tokens!.access, String(organization!.id), period, compare),
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
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 backdrop-blur-sm shadow-xl shadow-black/20 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">

                {/* Period tabs */}
                <PeriodTabs value={period} onChange={setPeriod} />

                {/* Divider + compare + label */}
                <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-800 px-4 py-2.5">
                  <CompareSegment value={compare} onChange={setCompare} />
                  <div className="hidden lg:block text-right">
                    <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold">Comparando</p>
                    <p className="text-xs text-slate-400 leading-tight">
                      <span className="text-slate-200 font-medium">{dashboard.period_label}</span>
                      {" "}<span className="text-slate-600">·</span>{" "}
                      <span className="text-orange-400">{dashboard.compare_label}</span>
                    </p>
                  </div>
                </div>

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

            <div className="grid gap-6 lg:grid-cols-2">
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
                      <div key={a.id} className="flex items-center justify-between border-b border-slate-800 pb-3 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-slate-200">{a.subject}</p>
                          <p className="text-xs text-slate-400">{a.user__email} · {a.activity_type}</p>
                        </div>
                        <span className="text-xs text-slate-500">{formatDate(a.created_at)}</span>
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
