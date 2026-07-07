"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import {
  Brain, Users, BarChart3, Mail, BellRing,
  ShieldCheck, ArrowRight, Check, Zap, Kanban, Globe, Phone,
} from "lucide-react";
import { cmsApi } from "@/lib/api";

const ICON_MAP: Record<string, React.ElementType> = {
  Users, Brain, BarChart3, Mail, BellRing, ShieldCheck, Kanban, Globe, Phone,
};

const DEFAULTS = {
  headline: "Todo lo que necesitas para vender más y mejor",
  subheadline:
    "OptimizaCRM reúne en una sola plataforma las herramientas de ventas, IA y comunicación que tu equipo necesita para crecer.",
  modules: [
    {
      icon: "Users",
      title: "Gestión de Leads",
      items: [
        "Importación/exportación CSV",
        "Acciones masivas",
        "Reglas de asignación automática",
        "Lead Scoring con IA",
      ],
    },
    {
      icon: "Kanban",
      title: "Pipeline de Ventas",
      items: [
        "Tablero Kanban drag & drop",
        "Seguimiento de oportunidades",
        "Análisis de ganadas/perdidas",
        "Seguimiento de ingresos",
      ],
    },
    {
      icon: "Brain",
      title: "Inteligencia Artificial",
      items: [
        "Lead Scoring (XGBoost)",
        "Detección de clientes en riesgo",
        "Previsión de ingresos",
        "Generación de emails con IA",
        "Análisis de sentimiento",
      ],
    },
    {
      icon: "BarChart3",
      title: "Analítica y Reportes",
      items: [
        "KPIs en tiempo real",
        "Exportación PDF/Excel",
        "Informes programados",
        "Rendimiento del equipo",
      ],
    },
    {
      icon: "Mail",
      title: "Comunicaciones",
      items: [
        "Bandeja de entrada multicanal",
        "WhatsApp, Email y más",
        "Historial de contacto unificado",
        "Respuesta rápida desde el CRM",
      ],
    },
    {
      icon: "BellRing",
      title: "Automatizaciones",
      items: [
        "Reglas trigger → acción",
        "Seguimientos automáticos",
        "Cambios de estado automáticos",
        "Notificaciones al equipo",
      ],
    },
    {
      icon: "Globe",
      title: "Widget Web Embebible",
      items: [
        "Formulario de contacto flotante",
        "Botón de WhatsApp integrado",
        "Captura de leads directa al CRM",
        "Personalización de color y textos",
      ],
    },
    {
      icon: "ShieldCheck",
      title: "Seguridad Empresarial",
      items: [
        "Aislamiento por organización",
        "Permisos por rol de usuario",
        "Gestión de equipos",
        "Protección contra accesos no autorizados",
      ],
    },
  ],
};

type Module = { icon?: string; title: string; items: string[] };

export default function FeaturesPage() {
  const [data, setData] = useState<typeof DEFAULTS>(DEFAULTS);

  useEffect(() => {
    cmsApi.getSection("features_page").then((res) => {
      if (res?.data && Object.keys(res.data).length > 0) {
        const remote = res.data as Partial<typeof DEFAULTS>;
        setData({
          ...DEFAULTS,
          ...remote,
          modules: DEFAULTS.modules,
        });
      }
    }).catch(() => {});
  }, []);

  const modules: Module[] = Array.isArray(data.modules) ? data.modules : DEFAULTS.modules;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-slate-800 bg-slate-900 px-4 pb-16 pt-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-orange-800/50 bg-orange-950/40 px-3 py-1 text-xs font-semibold text-orange-400">
              <Zap className="h-3 w-3" />
              Características
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
              {data.headline}
            </h1>
            <p className="mt-5 max-w-5xl text-lg leading-relaxed text-slate-400">
              {data.subheadline}
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link href="/register">
                <Button className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white">
                  Empezar gratis <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href="/precios">
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:border-orange-600 hover:text-orange-400 bg-transparent">
                  Ver precios
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Modules grid — 4 cols × 2 rows */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {modules.map((mod) => {
                const Icon = (mod.icon && ICON_MAP[mod.icon]) || Zap;
                return (
                  <div
                    key={mod.title}
                    className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition-all hover:-translate-y-0.5 hover:border-orange-800/60 hover:shadow-lg hover:shadow-orange-500/5"
                  >
                    <div className="mb-4 inline-flex rounded-xl bg-orange-950/40 p-3 text-orange-500 transition-colors group-hover:bg-orange-950/60">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-white">{mod.title}</h3>
                    <ul className="mt-3 space-y-2">
                      {(mod.items as string[]).map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-slate-400">
                          <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Voz IA CTA strip */}
        <section className="border-y border-slate-800 bg-slate-900 px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-green-900/40 text-green-400">
              <Phone className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-green-400">Complemento disponible</p>
              <h3 className="mt-1 text-2xl font-black text-white">
                ¿Tu CRM también debería atender llamadas?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                El Agente de Voz IA atiende llamadas entrantes, califica leads y agenda citas en
                automático las 24h — integrado directamente en tu CRM, sin personal adicional.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-col items-center gap-2">
              <Link href="/voz-ia">
                <Button className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold whitespace-nowrap">
                  Ver Agente de Voz <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <p className="text-xs text-slate-500">Desde $49/mes · 14 días gratis</p>
            </div>
          </div>
        </section>

        {/* CTA banner */}
        <section className="relative overflow-hidden bg-orange-600 px-4 py-20 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-black/10" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-black/10" />
          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-black text-white sm:text-4xl">
              ¿Listo para transformar tus ventas?
            </h2>
            <p className="mt-4 text-lg text-orange-100">
              14 días gratis con acceso completo. Sin tarjeta de crédito.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link href="/register">
                <Button className="gap-1.5 bg-black/20 hover:bg-black/30 text-white border border-white/20">
                  Comenzar gratis <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href="/precios">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent">
                  Ver precios
                </Button>
              </Link>
            </div>
            <p className="mt-5 text-sm text-orange-200">
              Sin tarjeta de crédito · 14 días gratis · Cancela cuando quieras
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
