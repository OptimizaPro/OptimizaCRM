"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { cmsApi, voicePlansPublicApi } from "@/lib/api";
import {
  ArrowRight, CheckCircle, Brain, Target, BarChart3,
  Users, Zap, Shield, Mail, Smartphone,
  TrendingUp, Send, Phone,
} from "lucide-react";

// ─── Brand SVG icons ───────────────────────────────────────────────────────────

function IconWhatsApp({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function IconInstagram({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function IconFacebook({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

// ─── Default content ───────────────────────────────────────────────────────────

const DEFAULTS = {
  badge: "Plataforma CRM · IA Nativa",
  headline: "Cierra más negocios con Inteligencia Artificial",
  subheadline: "OptimizaCRM combina la gestión de clientes empresarial con IA para que tu equipo de ventas priorice leads, prediga churn y acelere el cierre de negocios.",
  cta_primary: "Comenzar gratis",
  cta_primary_href: "/register",
  cta_secondary: "Ver características",
  cta_secondary_href: "/caracteristicas",
  trust_signals: ["Sin tarjeta de crédito", "14 días gratis", "Seguridad empresarial"],
  features_headline: "Todo lo que necesitas para escalar tus ventas",
  features_subheadline: "Diseñado para equipos que exigen rendimiento, seguridad e inteligencia.",
  feature_cards: [
    { title: "Lead Scoring con IA", description: "Prioriza leads automáticamente usando modelos de machine learning." },
    { title: "Pipeline Visual", description: "Tableros Kanban con arrastrar y soltar para gestionar oportunidades." },
    { title: "Previsión de Ingresos", description: "Predicciones de revenue basadas en IA con intervalos de confianza." },
    { title: "SaaS multicliente", description: "Aislamiento completo de datos a nivel empresarial." },
    { title: "Automatización", description: "Seguimientos automáticos y generación de emails con IA." },
    { title: "Seguridad Empresarial", description: "RBAC, JWT, auditoría completa y cumplimiento con normativas de protección de datos en LATAM y estándares internacionales." },
  ],
  cta_section_headline: "¿Listo para transformar tus ventas?",
  cta_section_text: "Únete a cientos de equipos que ya usan OptimizaCRM para cerrar más negocios.",
  cta_section_button: "Comenzar gratis",
};

const ICON_MAP: Record<string, React.ElementType> = {
  0: Brain, 1: Target, 2: BarChart3, 3: Users, 4: Zap, 5: Shield,
};

const STATS = [
  { value: "100%", label: "Datos del negocio" },
  { value: "40%",  label: "Más conversiones" },
  { value: "2.4×", label: "Retorno de inversión" },
  { value: "< 10′", label: "Tiempo de configuración" },
];

const CHANNELS = [
  { icon: Mail,           label: "Email",     color: "#60A5FA", bg: "bg-blue-950/50"   },
  { icon: IconWhatsApp,   label: "WhatsApp",  color: "#25D366", bg: "bg-green-950/50"  },
  { icon: Smartphone,     label: "SMS",       color: "#C084FC", bg: "bg-purple-950/50" },
  { icon: IconFacebook,   label: "Facebook",  color: "#1877F2", bg: "bg-indigo-950/50" },
  { icon: IconInstagram,  label: "Instagram", color: "#E1306C", bg: "bg-pink-950/50"   },
  { icon: Send,           label: "Telegram",  color: "#38BDF8", bg: "bg-sky-950/50"    },
];

// ─── Dashboard Mockup ─────────────────────────────────────────────────────────//

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-lg lg:max-w-none pb-6 pr-4 sm:pb-0 sm:pr-0">
      <div className="absolute -inset-4 rounded-3xl bg-orange-500/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-500 shadow-2xl shadow-black/40">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 border-b border-slate-700 bg-slate-800 px-4 py-3">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          <div className="mx-3 flex-1 rounded-md bg-slate-700 py-1">
            <div className="mx-auto h-1.5 w-24 rounded bg-slate-600" />
          </div>
        </div>
        {/* App UI */}
        <div className="flex h-72 overflow-hidden">
          {/* Sidebar */}
          <div className="flex w-10 flex-col items-center gap-3 border-r border-slate-800 bg-black py-4">
            <div className="h-6 w-6 rounded-md bg-orange-500" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`h-5 w-5 rounded-md ${i === 0 ? "bg-orange-500/30" : "bg-slate-800"}`} />
            ))}
          </div>
          {/* Main */}
          <div className="flex-1 overflow-hidden bg-slate-700 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-slate-500" />
              <div className="h-6 w-16 rounded-lg bg-orange-500" />
            </div>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {[
                { v: "$84K", c: "text-green-400" },
                { v: "248",  c: "text-blue-400" },
                { v: "92%",  c: "text-orange-400" },
              ].map(({ v, c }) => (
                <div key={v} className="rounded-lg border border-slate-600 bg-slate-800 p-2">
                  <div className="h-1.5 w-8 rounded bg-slate-600" />
                  <p className={`mt-1.5 text-xs font-bold ${c}`}>{v}</p>
                </div>
              ))}
            </div>
            <div className="mb-3 rounded-lg border border-slate-600 bg-slate-800 p-2">
              <div className="mb-2 h-1.5 w-16 rounded bg-slate-600" />
              <div className="flex items-end gap-1 h-14">
                {[30, 50, 40, 70, 55, 80, 65, 90, 75, 85].map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm ${i === 9 ? "bg-orange-500" : "bg-orange-500/30"}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {["Leads", "Propuestas", "Cerrados"].map((s, i) => (
                <div key={s} className="rounded-lg border border-slate-600 bg-slate-800 p-1.5">
                  <p className="text-[8px] font-semibold text-slate-500">{s}</p>
                  {[...Array(i === 0 ? 3 : i === 1 ? 2 : 1)].map((_, j) => (
                    <div key={j} className="mt-1 h-1.5 rounded bg-slate-600" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Floating badge */}
      <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 shadow-lg">
        <TrendingUp className="h-4 w-4 text-orange-500" />
        <div>
          <p className="text-[10px] font-semibold text-slate-300">Ingresos de este mes</p>
          <p className="text-xs font-bold text-orange-400">+38% vs anterior</p>
        </div>
      </div>
      {/* Floating AI badge */}
      <div className="absolute -right-4 top-8 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 shadow-lg">
        <Brain className="h-4 w-4 text-green-400" />
        <div>
          <p className="text-[10px] font-semibold text-slate-300">Lead Score</p>
          <p className="text-xs font-bold text-green-400">94 / 100 · Alta prioridad</p>
        </div>
      </div>
      {/* WhatsApp floating card */}
      <div className="absolute -bottom-4 -right-4 w-52 rounded-xl border border-green-800/40 bg-slate-900 p-3 shadow-xl shadow-green-900/10">
        <div className="flex items-center gap-2 mb-2">
          {/* WhatsApp icon */}
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-green-400 leading-none">WhatsApp</p>
            <p className="text-[9px] text-slate-500 leading-none mt-0.5">hace 2 segundos</p>
          </div>
          <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
        </div>
        <p className="text-[10px] text-slate-300 italic leading-snug">
          "Hola, me interesa el servicio, ¿tienen disponibilidad?"
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <div className="h-px flex-1 bg-green-800/40" />
          <p className="text-[9px] font-semibold text-green-400">✓ Lead capturado al CRM</p>
        </div>
      </div>
    </div>
  );
}

// ─── Channels Hub ─────────────────────────────────────────────────────────────//

function ChannelsHub() {
  const n = CHANNELS.length;
  const R = 37;

  const items = CHANNELS.map((ch, i) => {
    const angleDeg = (i * 360) / n - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      ...ch,
      x: 50 + R * Math.cos(angleRad),
      y: 50 + R * Math.sin(angleRad),
      dur: 1.8 + i * 0.35,
    };
  });

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[540px] select-none">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="lineGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#EA580C" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#EA580C" stopOpacity="0.05" />
          </radialGradient>
        </defs>
        {items.map((item) => (
          <g key={item.label}>
            <line x1="50" y1="50" x2={item.x} y2={item.y} stroke="url(#lineGrad)" strokeWidth="0.5" strokeDasharray="2 1.5" />
            <circle r="0.85" fill="#EA580C">
              <animateMotion dur={`${item.dur}s`} repeatCount="indefinite" path={`M50,50 L${item.x},${item.y}`} />
              <animate attributeName="opacity" values="0;1;0" dur={`${item.dur}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
      </svg>

      {/* Center logo */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-32 w-32 rounded-full border border-orange-500/20 animate-ping" style={{ animationDuration: "2.5s" }} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-44 w-44 rounded-full border border-orange-500/10 animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.6s" }} />
        <div className="relative flex h-[86px] w-[86px] items-center justify-center rounded-full border-[3px] border-orange-600 bg-slate-950 shadow-xl shadow-orange-500/20">
          <div className="absolute inset-1.5 rounded-full border-2 border-dashed border-orange-800/40" />
          <div className="relative text-center leading-tight">
            <div className="text-[12px] font-black leading-none tracking-tight text-orange-500">Optimiza</div>
            <div className="text-[12px] font-black leading-none tracking-tight text-green-400">CRM</div>
          </div>
        </div>
      </div>

      {/* Channel nodes */}
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
          >
            <div className={`group flex flex-col items-center gap-1.5 rounded-2xl border border-slate-700 ${item.bg} px-4 py-3 shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-lg`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: item.color + "20" }}>
                <Icon className="h-5 w-5" style={{ color: item.color }} />
              </div>
              <span className="text-[11px] font-bold text-slate-300">{item.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Voice Agent Mockup ──────────────────────────────────────────────────────//

function VoiceAgentMockup() {
  return (
    <div className="relative mx-auto w-[240px]">
      <div className="absolute -inset-10 rounded-full bg-green-500/8 blur-3xl" />
      {/* Phone frame */}
      <div className="relative rounded-[2.5rem] border-[3px] border-slate-700 bg-slate-900 px-4 pb-6 pt-5 shadow-2xl shadow-black/60">
        <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-slate-700" />
        {/* Call screen */}
        <div className="rounded-2xl bg-slate-800 p-5 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-900/50 ring-2 ring-green-500/30">
            <Phone className="h-6 w-6 text-green-400" />
          </div>
          <p className="text-[11px] text-slate-500">Llamada entrante</p>
          <p className="mt-0.5 text-base font-bold text-white">Carlos Méndez</p>
          <p className="text-xs text-green-400">Calificando lead…</p>
          {/* Waveform */}
          <div className="mt-4 flex h-8 items-center justify-center gap-0.5">
            {[2, 5, 8, 4, 9, 6, 8, 3, 7, 5, 4, 7].map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-green-400/70 animate-pulse"
                style={{ height: `${h * 3}px`, animationDelay: `${i * 0.08}s` }}
              />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">03:12 · En curso</p>
        </div>
        {/* CRM sync */}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2.5">
          <div className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-green-400" />
          <p className="text-[10px] text-slate-400">Guardando en CRM automáticamente</p>
        </div>
        <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-slate-700" />
      </div>
      {/* Floating badges */}
      <div className="absolute -left-12 top-10 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-center shadow-xl">
        <p className="text-[10px] text-slate-500">Respuesta</p>
        <p className="text-sm font-black text-green-400">&lt;1 seg</p>
      </div>
      <div className="absolute -right-12 bottom-14 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-center shadow-xl">
        <p className="text-[10px] text-slate-500">Disponible</p>
        <p className="text-sm font-black text-orange-400">24 / 7</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────//

export default function HomePage() {
  const [data, setData] = useState(DEFAULTS);
  const [vozStarterPrice, setVozStarterPrice] = useState<string | null>(null);

  useEffect(() => {
    cmsApi.getSection("hero").then(({ data: d }) => {
      setData((prev) => ({ ...prev, ...d as typeof DEFAULTS }));
    }).catch(() => {});

    voicePlansPublicApi.list().then((plans) => {
      const sorted = [...plans].sort((a, b) => a.sort_order - b.sort_order);
      if (sorted.length > 0) {
        setVozStarterPrice(`$${Math.round(parseFloat(sorted[0].price_monthly))}`);
      }
    }).catch(() => {});
  }, []);

  const features = (data.feature_cards as typeof DEFAULTS.feature_cards) ?? DEFAULTS.feature_cards;
  const trust    = (data.trust_signals as string[]) ?? DEFAULTS.trust_signals;

  return (
    <div className="flex min-h-screen flex-col bg-slate-700">
      <PublicHeader />
      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 pt-20 pb-24 sm:px-12 lg:px-20 xl:px-28">
          {/* Glow blobs */}
          <div className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] -translate-y-1/4 translate-x-1/4 rounded-full bg-orange-600/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-32 bottom-0 h-64 w-64 rounded-full bg-green-600/8 blur-3xl" />

          <div className="relative mx-auto max-w-7xl">
            <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">

              {/* Left */}
              <div className="w-full lg:w-[55%] text-center lg:text-left">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-800/50 bg-orange-950/40 px-4 py-1.5 text-sm font-medium text-orange-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  {data.badge}
                </div>

                <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl sm:text-6xl lg:text-[3.75rem] xl:text-7xl">
                  Cierra más negocios<br />
                  <span className="text-orange-500">con Inteligencia Artificial</span>
                </h1>

                <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-400 lg:mx-0">
                  {data.subheadline}
                </p>

                <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                  <Link href={data.cta_primary_href as string}>
                    <Button size="lg" className="gap-2 bg-orange-600 hover:bg-orange-500 px-8 text-base text-white">
                      {data.cta_primary} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={data.cta_secondary_href as string}>
                    <Button size="lg" variant="outline" className="px-8 text-base border-slate-700 text-slate-300 hover:border-orange-600 hover:text-orange-400 bg-slate-900">
                      {data.cta_secondary}
                    </Button>
                  </Link>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-5 lg:justify-start">
                  {trust.map((t) => (
                    <span key={t} className="flex items-center gap-1.5 text-sm text-slate-500">
                      <CheckCircle className="h-4 w-4 text-green-500" /> {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right */}
              <div className="w-full flex-1 lg:max-w-[520px]">
                <DashboardMockup />
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats bar ────────────────────────────────────────────────── */}
        <section className="border-y border-slate-800 bg-slate-900 px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {STATS.map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-3xl font-black text-orange-500 sm:text-4xl">{value}</p>
                  <p className="mt-1 text-sm text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────── */}
        <section className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">Funcionalidades</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                {data.features_headline}
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
                {data.features_subheadline}
              </p>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => {
                const Icon = ICON_MAP[i] ?? Zap;
                return (
                  <div
                    key={f.title}
                    className="group relative rounded-2xl border border-slate-800 bg-slate-900 p-7 transition-all hover:-translate-y-1 hover:border-orange-800/60 hover:shadow-xl hover:shadow-orange-500/5"
                  >
                    <div className="mb-5 inline-flex rounded-xl bg-orange-950/40 p-3 text-orange-500 group-hover:bg-orange-950/60">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Channels Hub ─────────────────────────────────────────────── */}
        <section className="border-y border-slate-800 bg-slate-900 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
              <div className="flex-1 text-center lg:text-left">
                <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">Canales conectados</p>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Todos tus canales,<br />
                  <span className="text-orange-500">una sola plataforma</span>
                </h2>
                <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-400">
                  Gestiona Email, WhatsApp, SMS, Facebook, Instagram y Telegram desde una única bandeja de entrada inteligente. Sin cambiar de pestaña.
                </p>
                <ul className="mt-8 space-y-3">
                  {[
                    "Bandeja unificada multicanal",
                    "Historial de conversaciones centralizado",
                    "Respuesta rápida con plantillas IA",
                    "Nuevos canales se activan con un clic",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-slate-400">
                      <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/caracteristicas" className="mt-8 inline-block">
                  <Button variant="outline" className="gap-1.5 border-slate-700 text-slate-300 hover:border-orange-600 hover:text-orange-400 bg-transparent hover:bg-orange-800/50 px-6 text-base font-bold">
                    Ver todas las integraciones <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
              <div className="flex-1 w-full">
                <ChannelsHub />
              </div>
            </div>
          </div>
        </section>

        {/* ── Voz IA ───────────────────────────────────────────────────── */}
        <section className="px-4 py-24 sm:px-6 lg:px-8 bg-slate-950">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-center gap-14 lg:flex-row-reverse lg:items-center lg:gap-16">
              {/* Visual */}
              <div className="flex flex-1 justify-center">
                <VoiceAgentMockup />
              </div>
              {/* Copy */}
              <div className="flex-1 text-center lg:text-left">
                <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-green-800/50 bg-green-950/40 px-3 py-1 text-xs font-semibold text-green-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                  Nuevo · Agente de Voz IA
                </div>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                  <span className="whitespace-nowrap">Tu recepcionista con IA</span><br />
                  <span className="text-orange-500">que nunca duerme</span>
                </h2>
                <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-400">
                  Atiende llamadas, califica leads y agenda citas en automático las 24 h.
                  En español perfecto, sin costes de personal adicional.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-3">
                  {[
                    { value: "24/7",  label: "Siempre disponible" },
                    { value: "<1 s",  label: "Tiempo de respuesta" },
                    { value: "+40%",  label: "Más leads capturados" },
                  ].map(({ value, label }) => (
                    <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
                      <p className="text-2xl font-black text-orange-500">{value}</p>
                      <p className="mt-1 text-xs text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
                <ul className="mt-8 space-y-2.5">
                  {[
                    "Atiende llamadas en español natural",
                    "Califica y registra leads en el CRM",
                    "Agenda citas directamente en tu calendario",
                    "Escala a agente humano cuando es necesario",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-slate-400">
                      <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                  <Link href="/voz-ia">
                    <Button className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold">
                      Conocer Agente de Voz <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Link href="/voz-ia#pricing">
                    <Button variant="outline" className="border-slate-700 text-slate-300 hover:border-orange-600 hover:text-orange-400 bg-transparent">
                      Ver precios · Desde {vozStarterPrice ?? "$149"}/mes
                    </Button>
                  </Link>
                </div>
                <p className="mt-4 text-xs text-slate-600">14 días gratis · Sin tarjeta de crédito</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Banner ───────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-orange-600 px-4 py-20 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-black/10" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 -translate-x-1/3 translate-y-1/2 rounded-full bg-black/10" />
          <div className="relative mx-auto max-w-4xl text-center">
            <h2 className="text-5xl font-black leading-tight text-white sm:text-5xl">
              {data.cta_section_headline}
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg text-orange-100">
              {data.cta_section_text}
            </p>
            <Link href="/register" className="mt-10 inline-block">
              <Button size="lg" className="gap-2 bg-black/20 hover:bg-black/30 px-10 text-base font-bold text-white border border-white/20">
                {data.cta_section_button} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

      </main>
      <PublicFooter />
    </div>
  );
}
