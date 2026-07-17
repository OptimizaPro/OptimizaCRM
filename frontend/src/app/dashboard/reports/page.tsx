"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { crmApi, goalsApi, teamsApi, teamGoalApi, type TeamMember, type StageData, type CloseRateData, type SalesGoal, type TeamGoal_ } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";
import {
  TrendingUp, Users, Target, BarChart3, ChevronDown,
  Printer, Plus, Check, X, Pencil, ChevronUp,
  Crown, Shield, Trophy, AlertTriangle,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  new: "Nuevo", contacted: "Contactado", qualified: "Calificado",
  proposal: "Propuesta", negotiation: "Negociación", won: "Ganado", lost: "Perdido",
};

const STAGE_COLORS: Record<string, string> = {
  new: "#64748b", contacted: "#3b82f6", qualified: "#f59e0b",
  proposal: "#8b5cf6", negotiation: "#f97316", won: "#22c55e", lost: "#ef4444",
};

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function attainmentColor(pct: number | null) {
  if (pct === null) return "text-slate-500";
  if (pct >= 100) return "text-green-400";
  if (pct >= 70)  return "text-yellow-400";
  return "text-red-400";
}

function attainmentBar(pct: number | null) {
  const val = Math.min(pct ?? 0, 100);
  const color = (pct ?? 0) >= 100 ? "bg-green-500" : (pct ?? 0) >= 70 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-slate-800">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${val}%` }} />
      </div>
      <span className={`text-xs font-semibold ${attainmentColor(pct)}`}>
        {pct !== null ? `${pct}%` : "—"}
      </span>
    </div>
  );
}

// ─── Goal modal ───────────────────────────────────────────────────────────────

function GoalModal({
  member, goals, year, month, onClose,
}: {
  member: TeamMember;
  goals: SalesGoal[];
  year: number;
  month: number;
  onClose: () => void;
}) {
  const { tokens, organization } = useAuthStore();
  const queryClient = useQueryClient();
  const existing = goals.find(
    (g) => g.user === member.user_id && g.year === year && g.month === month
  );
  const [revenue, setRevenue] = useState(existing ? String(existing.target_revenue) : "");
  const [deals, setDeals]     = useState(existing ? String(existing.target_deals) : "");

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        user: member.user_id, period: "monthly" as const,
        year, month, target_revenue: revenue, target_deals: Number(deals),
      };
      return existing
        ? goalsApi.update(tokens!.access, organization!.id, existing.id, payload)
        : goalsApi.create(tokens!.access, organization!.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-performance"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-semibold text-slate-100">Meta de {member.name}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-4 text-xs text-slate-500">{MONTHS[month - 1]} {year}</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Objetivo de ingresos (USD)</label>
            <input
              type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} placeholder="5000"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Objetivo de tratos cerrados</label>
            <input
              type="number" value={deals} onChange={(e) => setDeals(e.target.value)} placeholder="5"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
            />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button onClick={onClose} variant="outline" className="flex-1 border-slate-700 text-slate-400">Cancelar</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !revenue}
            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white"
          >
            {saveMutation.isPending ? "Guardando…" : "Guardar meta"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Team Goal Modal ──────────────────────────────────────────────────────────

function TeamGoalModal({
  teamId, teamName, existing, year, month, onClose,
}: {
  teamId:   string;
  teamName: string;
  existing: TeamGoal_ | null;
  year:     number;
  month:    number;
  onClose:  () => void;
}) {
  const { tokens, organization } = useAuthStore();
  const queryClient = useQueryClient();
  const [revenue, setRevenue] = useState(existing ? String(existing.target_revenue) : "");
  const [deals,   setDeals]   = useState(existing ? String(existing.target_deals)   : "");

  const saveMutation = useMutation({
    mutationFn: () =>
      teamGoalApi.upsert(tokens!.access, organization!.id, {
        team_id:        teamId,
        year, month,
        target_revenue: Number(revenue),
        target_deals:   Number(deals),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-performance"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold text-slate-100">Meta del equipo</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-1 text-xs text-orange-400 font-medium">{teamName}</p>
        <p className="mb-5 text-xs text-slate-500">{MONTHS[month - 1]} {year} · Independiente de las metas individuales</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Meta de ingresos del equipo (USD)</label>
            <input
              type="number" value={revenue} onChange={e => setRevenue(e.target.value)} placeholder="25000"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Meta de tratos cerrados del equipo</label>
            <input
              type="number" value={deals} onChange={e => setDeals(e.target.value)} placeholder="10"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
            />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button onClick={onClose} variant="outline" className="flex-1 border-slate-700 text-slate-400">Cancelar</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !revenue}
            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white"
          >
            {saveMutation.isPending ? "Guardando…" : "Guardar meta"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card className="border-slate-800 bg-slate-950">
      <CardHeader className="border-b border-slate-800 pb-4">
        <CardTitle className="flex items-center gap-2 text-base text-slate-100">
          <Icon className="h-4 w-4 text-orange-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { tokens, organization } = useAuthStore();
  const now   = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [teamId, setTeamId] = useState<string>("");
  const [goalTarget, setGoalTarget]             = useState<TeamMember | null>(null);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [showTeamGoalModal, setShowTeamGoalModal] = useState(false);

  const { data: stages }  = useQuery({
    queryKey: ["stages-summary"],
    queryFn:  () => crmApi.getStagesSummary(tokens!.access, organization!.id),
    enabled:  !!tokens && !!organization,
  });

  const { data: revenue } = useQuery({
    queryKey: ["revenue-analytics"],
    queryFn:  () => crmApi.getRevenueAnalytics(tokens!.access, organization!.id),
    enabled:  !!tokens && !!organization,
  });

  const { data: teamData } = useQuery({
    queryKey: ["team-performance", year, month, teamId],
    queryFn:  () => crmApi.getTeamPerformance(tokens!.access, organization!.id, year, month, teamId || undefined),
    enabled:  !!tokens && !!organization,
  });

  const { data: teamsData } = useQuery({
    queryKey: ["teams", organization?.id],
    queryFn:  () => teamsApi.list(tokens!.access, String(organization!.id)),
    enabled:  !!tokens && !!organization,
    staleTime: 60_000,
  });

  const { data: goalsData } = useQuery({
    queryKey: ["goals"],
    queryFn:  () => goalsApi.getAll(tokens!.access, organization!.id),
    enabled:  !!tokens && !!organization,
  });

  const team  = teamData?.team ?? [];
  const goals = goalsData?.results ?? [];

  const totalPipelineValue    = stages?.stages.filter(s => !["won","lost"].includes(s.stage)).reduce((a, s) => a + s.value, 0) ?? 0;
  const weightedForecast      = stages?.stages.filter(s => !["won","lost"].includes(s.stage)).reduce((a, s) => a + s.weighted_value, 0) ?? 0;
  const openDeals             = stages?.stages.filter(s => !["won","lost"].includes(s.stage)).reduce((a, s) => a + s.count, 0) ?? 0;

  return (
    <>
      <DashboardHeader title="Informes y análisis" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6 print:p-4">

        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <p className="text-sm text-slate-400">Datos en tiempo real de tu organización.</p>
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="gap-2 border-slate-700 text-slate-300 hover:border-orange-600 hover:bg-orange-600 hover:text-white"
          >
            <Printer className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>

        {/* ── KPI strip ───────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Valor en pipeline",       value: formatCurrency(totalPipelineValue), sub: `${openDeals} oportunidades abiertas`,     icon: BarChart3 },
            { label: "Previsión ponderada",      value: formatCurrency(weightedForecast),   sub: "Valor × probabilidad por etapa",          icon: TrendingUp },
            { label: "Tasa de cierre global",    value: `${stages?.win_rate ?? 0}%`,        sub: "Ganados / (Ganados + Perdidos)",          icon: Target },
            { label: "Colaboradores activos",    value: String(team.length),                sub: "Con acceso a la organización",            icon: Users },
          ].map(({ label, value, sub, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-400">{label}</p>
                <div className="rounded-lg bg-orange-950/40 p-1.5 text-orange-400"><Icon className="h-3.5 w-3.5" /></div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-100">{value}</p>
              <p className="mt-1 text-xs text-slate-500">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Pipeline by stage ───────────────────────────────────────── */}
        <Section title="Pipeline por etapa" icon={BarChart3}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="pb-3 text-left">Etapa</th>
                  <th className="pb-3 text-right">Oportunidades</th>
                  <th className="pb-3 text-right">Valor total</th>
                  <th className="pb-3 text-right">Ticket medio</th>
                  <th className="pb-3 text-right">Prob. media</th>
                  <th className="pb-3 text-right">Valor ponderado</th>
                </tr>
              </thead>
              <tbody>
                {(stages?.stages ?? []).map((s: StageData) => (
                  <tr key={s.stage} className="border-t border-slate-800 hover:bg-slate-900">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: STAGE_COLORS[s.stage] }} />
                        <span className="font-medium text-slate-200">{STAGE_LABELS[s.stage]}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-slate-300">{s.count}</td>
                    <td className="py-3 text-right text-slate-300">{formatCurrency(s.value)}</td>
                    <td className="py-3 text-right text-slate-400">{s.count ? formatCurrency(s.avg_deal_size) : "—"}</td>
                    <td className="py-3 text-right text-slate-400">{s.count ? `${s.avg_probability}%` : "—"}</td>
                    <td className="py-3 text-right font-semibold text-orange-400">{s.count ? formatCurrency(s.weighted_value) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bar chart */}
          <div className="mt-6 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(stages?.stages ?? []).filter(s => !["won","lost"].includes(s.stage))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="stage" tickFormatter={(v) => STAGE_LABELS[v] ?? v} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }}
                  labelFormatter={(v) => STAGE_LABELS[v as string] ?? v}
                  formatter={(val: number, name: string) => [formatCurrency(val), name === "value" ? "Valor total" : "Valor ponderado"]}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} formatter={(v) => v === "value" ? "Valor total" : "Valor ponderado"} />
                <Bar dataKey="value"          fill="#f97316" opacity={0.4} radius={[4,4,0,0]} />
                <Bar dataKey="weighted_value" fill="#f97316"               radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* ── Close rate trend ────────────────────────────────────────── */}
        <Section title="Tasa de cierre mensual (últimos 6 meses)" icon={TrendingUp}>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stages?.close_rates ?? []} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="period" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis yAxisId="left"  tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }}
                  formatter={(val: number, name: string) => [
                    name === "close_rate" ? `${val}%` : val,
                    name === "close_rate" ? "Tasa de cierre" : name === "new_leads" ? "Leads nuevos" : "Tratos ganados",
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} formatter={(v) => v === "close_rate" ? "Tasa de cierre %" : v === "new_leads" ? "Leads nuevos" : "Tratos ganados"} />
                <Bar yAxisId="left" dataKey="new_leads" fill="#1e293b" radius={[2,2,0,0]} />
                <Line yAxisId="left"  type="monotone" dataKey="deals_won"   stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e" }} />
                <Line yAxisId="right" type="monotone" dataKey="close_rate"  stroke="#f97316" strokeWidth={2} dot={{ fill: "#f97316" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(stages?.close_rates ?? []).slice(-3).map((r: CloseRateData) => (
              <div key={r.period} className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-center">
                <p className="text-[10px] text-slate-500">{r.period}</p>
                <p className="mt-1 text-lg font-black text-orange-400">{r.close_rate}%</p>
                <p className="text-[10px] text-slate-500">{r.deals_won} cerrados / {r.new_leads} leads</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Revenue trend ───────────────────────────────────────────── */}
        <Section title="Tendencia de ingresos (12 meses)" icon={TrendingUp}>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenue?.data ?? []} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="period" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }}
                  formatter={(val: number) => [formatCurrency(val), "Ingresos"]}
                />
                <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} dot={{ fill: "#f97316" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* ── Team performance vs goal ─────────────────────────────────── */}
        <Section title="Rendimiento del equipo vs meta" icon={Users}>

          {/* Filters row */}
          <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
            {/* Team selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 flex-shrink-0">Equipo</label>
              <div className="relative">
                <select
                  value={teamId}
                  onChange={e => setTeamId(e.target.value)}
                  className="appearance-none rounded-lg border border-slate-700 bg-slate-900 py-1.5 pl-3 pr-7 text-sm text-slate-200 focus:border-orange-400 focus:outline-none max-w-[160px]"
                >
                  <option value="">Todos los colaboradores</option>
                  {(teamsData ?? []).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              </div>
            </div>
            {/* Period */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 flex-shrink-0">Mes</label>
              <div className="relative">
                <select value={month} onChange={e => setMonth(Number(e.target.value))}
                  className="appearance-none rounded-lg border border-slate-700 bg-slate-900 py-1.5 pl-3 pr-7 text-sm text-slate-200 focus:border-orange-400 focus:outline-none">
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 flex-shrink-0">Año</label>
              <div className="relative">
                <select value={year} onChange={e => setYear(Number(e.target.value))}
                  className="appearance-none rounded-lg border border-slate-700 bg-slate-900 py-1.5 pl-3 pr-7 text-sm text-slate-200 focus:border-orange-400 focus:outline-none">
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              </div>
            </div>
          </div>

          {/* ── Team totals ── */}
          {team.length > 0 && (() => {
            const totalRev      = team.reduce((a, m) => a + m.revenue_month, 0);
            const totalDeals    = team.reduce((a, m) => a + m.deals_won_month, 0);
            // Use independent team goal when a team is selected; fall back to sum of individual goals otherwise
            const teamGoal      = teamData?.team_goal ?? null;
            const goalRev       = teamGoal ? teamGoal.target_revenue : team.reduce((a, m) => a + m.target_revenue, 0);
            const goalDeals     = teamGoal ? teamGoal.target_deals   : team.reduce((a, m) => a + m.target_deals, 0);
            const teamAttPct    = goalRev > 0 ? Math.round(totalRev / goalRev * 100) : null;
            return (
              <>
                <div className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Ingresos del equipo", value: formatCurrency(totalRev),  goal: goalRev   ? `Meta: ${formatCurrency(goalRev)}`  : null, color: "text-slate-100" },
                    { label: "Tratos cerrados",      value: String(totalDeals),         goal: goalDeals ? `Meta: ${goalDeals}`               : null, color: "text-orange-400" },
                    { label: "Leads asignados",      value: String(team.reduce((a,m) => a + m.leads_assigned, 0)), goal: null, color: "text-blue-400" },
                    { label: "% logro del equipo",   value: teamAttPct !== null ? `${teamAttPct}%` : "—", goal: null, color: teamAttPct === null ? "text-slate-500" : teamAttPct >= 100 ? "text-green-400" : teamAttPct >= 70 ? "text-yellow-400" : "text-red-400" },
                  ].map(({ label, value, goal, color }) => (
                    <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className={`mt-1.5 text-xl font-black ${color}`}>{value}</p>
                      {goal && <p className="mt-0.5 text-[11px] text-slate-600">{goal}</p>}
                    </div>
                  ))}
                </div>

                {/* ── Team total progress bar ── */}
                {goalRev > 0 && (() => {
                  const pct   = Math.min(Math.round(totalRev / goalRev * 100), 100);
                  const color = pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-red-500";
                  return (
                    <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-300">Progreso del equipo vs meta de ingresos</p>
                        <div className="flex items-center gap-3">
                          {teamId && (
                            <button
                              onClick={() => setShowTeamGoalModal(true)}
                              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-400 hover:border-orange-500 hover:text-orange-400 transition-colors print:hidden"
                            >
                              <Pencil className="h-2.5 w-2.5" /> Editar meta del equipo
                            </button>
                          )}
                          <span className={`text-sm font-black ${pct >= 100 ? "text-green-400" : pct >= 70 ? "text-yellow-400" : "text-red-400"}`}>{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-800">
                        <div className={`h-2.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                        <span>{formatCurrency(totalRev)} logrado</span>
                        <span>{formatCurrency(goalRev)} meta {teamGoal ? "del equipo" : "suma individual"}</span>
                      </div>
                    </div>
                  );
                })()}
              </>
            );
          })()}

          {/* ── Individual member cards ── */}
          {team.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Users className="mx-auto h-10 w-10 text-slate-700 mb-3" />
              No hay colaboradores{teamId ? " en este equipo" : " activos"}.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {team
                .slice()
                .sort((a, b) => (b.attainment_pct ?? -1) - (a.attainment_pct ?? -1))
                .map((m, idx) => {
                  const initials = m.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
                  const pct      = m.attainment_pct;
                  const barColor = pct === null ? "bg-slate-700" : pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-red-500";
                  const textColor = attainmentColor(pct);
                  const isTop    = idx === 0 && team.length > 1 && (pct ?? 0) > 0;

                  return (
                    <div key={m.user_id} className="relative rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-lg">

                      {/* Top performer crown */}
                      {isTop && (
                        <div className="absolute -top-2.5 right-4 flex items-center gap-1 rounded-full bg-amber-950/70 border border-amber-700/50 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
                          <Trophy className="h-2.5 w-2.5" /> Top
                        </div>
                      )}

                      {/* Avatar + name */}
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-orange-600 text-sm font-black text-white shadow-md shadow-orange-900/30">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-100 truncate">{m.name}</p>
                          <p className="text-[11px] capitalize text-slate-500">{m.role.replace(/_/g, " ")}</p>
                        </div>
                        <button onClick={() => setGoalTarget(m)} className="flex-shrink-0 rounded-lg p-1.5 text-slate-600 hover:bg-slate-800 hover:text-orange-400 transition-colors" title="Editar meta">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Revenue progress */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] text-slate-500">Ingresos</span>
                          <span className={`text-xs font-bold ${textColor}`}>
                            {pct !== null ? `${pct}%` : "Sin meta"}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-800">
                          <div className={`h-1.5 rounded-full transition-all ${barColor}`}
                            style={{ width: `${Math.min(pct ?? 0, 100)}%` }} />
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-slate-600">
                          <span>{formatCurrency(m.revenue_month)}</span>
                          <span>{m.target_revenue ? formatCurrency(m.target_revenue) : "—"}</span>
                        </div>
                      </div>

                      {/* KPI grid */}
                      <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                        {[
                          { label: "Leads",       value: m.leads_assigned,   color: "text-blue-400" },
                          { label: "Convertidos", value: m.leads_converted,  color: "text-violet-400" },
                          { label: "Tratos",      value: m.deals_won_month,  color: "text-orange-400" },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="text-center">
                            <p className={`text-lg font-black ${color}`}>{value}</p>
                            <p className="text-[10px] text-slate-600">{label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Deals goal */}
                      {m.target_deals > 0 && (
                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className="text-slate-500">Meta tratos</span>
                          {m.deals_won_month >= m.target_deals ? (
                            <span className="flex items-center gap-1 text-green-400 font-semibold">
                              <Check className="h-3 w-3" /> {m.deals_won_month}/{m.target_deals} ✓
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-slate-400">
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              {m.deals_won_month}/{m.target_deals}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
              })}
            </div>
          )}

          {/* Assign goals picker */}
          <div className="relative mt-5 inline-block print:hidden">
            <button
              onClick={() => setShowMemberPicker(v => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-400 transition-colors"
            >
              <Plus className="h-3 w-3" /> Asignar metas
              {showMemberPicker ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showMemberPicker && (
              <div className="absolute bottom-7 left-0 z-20 w-52 rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl shadow-black/40">
                {team.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-500">No hay colaboradores activos.</p>
                ) : (
                  team.map(m => (
                    <button key={m.user_id}
                      onClick={() => { setGoalTarget(m); setShowMemberPicker(false); }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-800">
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-600 text-[9px] font-bold text-white">
                        {m.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-200">{m.name}</p>
                        <p className="text-[10px] capitalize text-slate-500">{m.role.replace("_", " ")}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </Section>

      </div>

      {/* Goal modal */}
      {goalTarget && (
        <GoalModal
          member={goalTarget}
          goals={goals}
          year={year}
          month={month}
          onClose={() => setGoalTarget(null)}
        />
      )}

      {showTeamGoalModal && teamId && (() => {
        const selectedTeam = (teamsData ?? []).find(t => t.id === teamId);
        return (
          <TeamGoalModal
            teamId={teamId}
            teamName={selectedTeam?.name ?? "Equipo"}
            existing={teamData?.team_goal ?? null}
            year={year}
            month={month}
            onClose={() => setShowTeamGoalModal(false)}
          />
        );
      })()}
    </>
  );
}
