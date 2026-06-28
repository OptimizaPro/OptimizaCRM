"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { DashboardKPIs } from "@/components/dashboard/kpi-cards";
import { RevenueChart, FunnelChartWidget } from "@/components/dashboard/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth";
import { crmApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const { tokens, organization, logout } = useAuthStore();

  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => crmApi.getDashboard(tokens!.access, organization!.id),
    enabled: !!tokens && !!organization,
    retry: false,
  });

  const { data: revenue } = useQuery({
    queryKey: ["revenue-analytics"],
    queryFn: () => crmApi.getRevenueAnalytics(tokens!.access, organization!.id),
    enabled: !!tokens && !!organization,
    retry: false,
  });

  const { data: pipeline } = useQuery({
    queryKey: ["pipeline-analytics"],
    queryFn: () => crmApi.getPipelineAnalytics(tokens!.access, organization!.id),
    enabled: !!tokens && !!organization,
    retry: false,
  });

  // Redirect to login on auth errors
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
            <DashboardKPIs
              revenue={dashboard.revenue}
              sales={dashboard.sales}
              conversion={dashboard.conversion}
              customers={dashboard.customers}
              tasks={dashboard.tasks}
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
