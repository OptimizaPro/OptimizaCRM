"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Users, Target, DollarSign, CheckCircle, UserPlus, Trophy } from "lucide-react";
import type { DashboardData, PeriodMetric } from "@/lib/api";

// ─── KPI Card base ────────────────────────────────────────────────────────────

interface KPICardProps {
  title:       string;
  value:       string | number;
  metric?:     PeriodMetric;
  prevLabel?:  string;        // "mes anterior" | "trimestre anterior" | "año anterior"
  icon:        React.ReactNode;
  iconBg?:     string;
  iconColor?:  string;
}

function KPICard({
  title, value, metric, prevLabel = "período anterior",
  icon, iconBg = "bg-orange-500/20", iconColor = "text-orange-400",
}: KPICardProps) {
  const change = metric?.change ?? null;
  const trend  = metric?.trend  ?? "neutral";

  return (
    <Card className="bg-slate-950">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
        <div className={`rounded-full p-2.5 ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {metric && (
          <p className={`mt-1 flex items-center gap-1 text-xs ${
            trend === "up"   ? "text-green-400" :
            trend === "down" ? "text-red-400"   :
                               "text-slate-500"
          }`}>
            {trend === "up"   ? <TrendingUp  className="h-3 w-3" /> :
             trend === "down" ? <TrendingDown className="h-3 w-3" /> :
                                <Minus        className="h-3 w-3" />}
            {change !== null
              ? <>{Math.abs(change)}% vs. {prevLabel}</>
              : <>Sin datos del {prevLabel}</>
            }
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Dashboard KPIs grid ──────────────────────────────────────────────────────

export function DashboardKPIs({ revenue, sales, conversion, customers, tasks, compareLabel }: {
  revenue:      DashboardData["revenue"];
  sales:        DashboardData["sales"];
  conversion:   DashboardData["conversion"];
  customers:    DashboardData["customers"];
  tasks:        DashboardData["tasks"];
  compareLabel: string;
}) {
  const prevLabel = compareLabel;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Ingresos totales"
        value={formatCurrency(revenue.total)}
        icon={<DollarSign className="h-4 w-4" />}
        iconBg="bg-green-500/20" iconColor="text-green-400"
      />
      <KPICard
        title="Ingresos del período"
        value={formatCurrency(revenue.period.value)}
        metric={revenue.period}
        prevLabel={prevLabel}
        icon={<TrendingUp className="h-4 w-4" />}
        iconBg="bg-blue-500/20" iconColor="text-blue-400"
      />
      <KPICard
        title="Valor del pipeline"
        value={formatCurrency(revenue.pipeline_value)}
        icon={<Target className="h-4 w-4" />}
        iconBg="bg-orange-500/20" iconColor="text-orange-400"
      />
      <KPICard
        title="Leads nuevos"
        value={sales.period_leads.value}
        metric={sales.period_leads}
        prevLabel={prevLabel}
        icon={<Users className="h-4 w-4" />}
        iconBg="bg-purple-500/20" iconColor="text-purple-400"
      />
      <KPICard
        title="Negocios ganados"
        value={sales.period_won.value}
        metric={sales.period_won}
        prevLabel={prevLabel}
        icon={<Trophy className="h-4 w-4" />}
        iconBg="bg-yellow-500/20" iconColor="text-yellow-400"
      />
      <KPICard
        title="Tasa de cierre"
        value={`${conversion.period_conversion.value}%`}
        metric={conversion.period_conversion}
        prevLabel={prevLabel}
        icon={<CheckCircle className="h-4 w-4" />}
        iconBg="bg-emerald-500/20" iconColor="text-emerald-400"
      />
      <KPICard
        title="Nuevos clientes"
        value={customers.period_new.value}
        metric={customers.period_new}
        prevLabel={prevLabel}
        icon={<UserPlus className="h-4 w-4" />}
        iconBg="bg-cyan-500/20" iconColor="text-cyan-400"
      />
      <KPICard
        title="Tareas completadas"
        value={tasks.period_done.value}
        metric={tasks.period_done}
        prevLabel={prevLabel}
        icon={<CheckCircle className="h-4 w-4" />}
        iconBg="bg-red-500/20" iconColor="text-red-400"
      />
    </div>
  );
}
