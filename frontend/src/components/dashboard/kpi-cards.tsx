"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Users, Target, DollarSign, CheckCircle } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
}

export function KPICard({ title, value, change, icon, iconBg = "bg-orange-500/20", iconColor = "text-orange-400" }: KPICardProps) {
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
        {change !== undefined && (
          <p className={`mt-1 flex items-center text-xs ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
            {change >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
            {Math.abs(change)}% vs. mes anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardKPIs({
  revenue,
  sales,
  conversion,
  customers,
  tasks,
}: {
  revenue: { total: number; monthly: number; pipeline_value: number };
  sales: { total_leads: number; open_opportunities: number; won_deals: number };
  conversion: { lead_conversion_rate: number; win_rate: number };
  customers: { total: number; active: number; at_risk: number };
  tasks: { pending: number; overdue: number };
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard title="Ingresos totales"   value={formatCurrency(revenue.total)}         change={12} icon={<DollarSign className="h-4 w-4" />} iconBg="bg-green-500/20"  iconColor="text-green-400" />
      <KPICard title="Ingresos del mes"   value={formatCurrency(revenue.monthly)}        change={8}  icon={<TrendingUp className="h-4 w-4" />} iconBg="bg-blue-500/20"   iconColor="text-blue-400" />
      <KPICard title="Valor del pipeline" value={formatCurrency(revenue.pipeline_value)}             icon={<Target className="h-4 w-4" />}     iconBg="bg-orange-500/20" iconColor="text-orange-400" />
      <KPICard title="Total de leads"     value={sales.total_leads}                      change={5}  icon={<Users className="h-4 w-4" />}      iconBg="bg-purple-500/20" iconColor="text-purple-400" />
      <KPICard title="Negocios abiertos"  value={sales.open_opportunities}                           icon={<Target className="h-4 w-4" />}     iconBg="bg-yellow-500/20" iconColor="text-yellow-400" />
      <KPICard title="Tasa de cierre"     value={`${conversion.win_rate}%`}                          icon={<CheckCircle className="h-4 w-4" />} iconBg="bg-emerald-500/20" iconColor="text-emerald-400" />
      <KPICard title="Clientes activos"   value={customers.active}                                   icon={<Users className="h-4 w-4" />}      iconBg="bg-cyan-500/20"   iconColor="text-cyan-400" />
      <KPICard title="Tareas pendientes"  value={tasks.pending}                                      icon={<CheckCircle className="h-4 w-4" />} iconBg="bg-red-500/20"    iconColor="text-red-400" />
    </div>
  );
}
