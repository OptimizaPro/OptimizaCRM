"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell,
} from "recharts";

const COLORS = ["#EA580C", "#166534", "#16A34A", "#F97316", "#D946EF", "#0284C7", "#EF4444"];

const STAGE_LABELS: Record<string, string> = {
  new: "Nuevo", contacted: "Contactado", qualified: "Calificado",
  proposal: "Propuesta", negotiation: "Negociación", won: "Ganado", lost: "Perdido",
};

function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-slate-300">{label}</p>
      <p className="text-xs text-slate-400">Ingresos: <span className="font-bold text-white">{new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(payload[0].value)}</span></p>
    </div>
  );
}

export function RevenueChart({ data }: { data: Array<{ period: string; revenue: number }> }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <Card className="bg-slate-950">
      <CardHeader>
        <CardTitle>Tendencia de ingresos</CardTitle>
      </CardHeader>
      <CardContent>
        {mounted && (
          <ResponsiveContainer width="100%" height={300} minWidth={0}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="period" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip content={<RevenueTooltip />} />
              <Line type="monotone" dataKey="revenue" stroke="#EA580C" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function FunnelTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-slate-300">{label}</p>
      <p className="text-xs text-slate-400">Oportunidades: <span className="font-bold text-white">{payload[0].value}</span></p>
    </div>
  );
}

export function FunnelChartWidget({ data }: { data: Array<{ stage: string; count: number; value: number }> }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const chartData = data.map((d, i) => ({
    name:  STAGE_LABELS[d.stage] ?? d.stage,
    value: d.count,
    fill:  COLORS[i % COLORS.length],
  }));

  return (
    <Card className="bg-slate-950">
      <CardHeader>
        <CardTitle>Embudo de ventas</CardTitle>
      </CardHeader>
      <CardContent>
        {mounted && (
          <ResponsiveContainer width="100%" height={300} minWidth={0}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={90} className="text-xs" />
              <Tooltip content={<FunnelTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function PipelineBarChart({ data }: { data: Array<{ stage: string; count: number; value: number }> }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <Card className="bg-slate-950">
      <CardHeader>
        <CardTitle>Pipeline por etapa</CardTitle>
      </CardHeader>
      <CardContent>
        {mounted && (
          <ResponsiveContainer width="100%" height={300} minWidth={0}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="count" fill="#EA580C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
