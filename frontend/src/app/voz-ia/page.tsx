"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Mic, Phone, Clock, Users, Zap, Check, ArrowRight,
  Building2, ShoppingBag, Hotel, Star, BarChart3, Headphones, Gift,
} from "lucide-react";
import { FaqSection } from "@/components/ui/faq-section";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ─── Default data (fallback si la API no responde) ────────────────────────────

const DEFAULT_PLANS = [
  {
    id: 1, slug: "voz-starter", name: "Voz Starter",
    price_monthly: "149.00", annual_price: 119,
    agents: 1, minutes_included: 300, overage_per_minute: "0.100",
    overage_display: "$0.10", is_popular: false, sort_order: 0,
    cta_text: "Empezar prueba gratis",
    features: [
      "1 agente de voz IA",
      "300 min/mes incluidos",
      "Base de conocimiento personalizada",
      "Captura de leads al CRM",
      "Agenda citas automáticamente",
      "Soporte por chat",
    ],
  },
  {
    id: 2, slug: "voz-pro", name: "Voz Pro",
    price_monthly: "129.00", annual_price: 103,
    agents: 3, minutes_included: 1000, overage_per_minute: "0.090",
    overage_display: "$0.09", is_popular: true, sort_order: 1,
    cta_text: "Empezar prueba gratis",
    features: [
      "3 agentes de voz IA",
      "1.000 min/mes incluidos",
      "Base de conocimiento avanzada",
      "Captura de leads al CRM",
      "Agenda citas automáticamente",
      "Transferencia a humano vía WhatsApp",
      "Analítica de llamadas",
      "Soporte prioritario",
    ],
  },
  {
    id: 3, slug: "voz-business", name: "Voz Business",
    price_monthly: "349.00", annual_price: 279,
    agents: 10, minutes_included: 5000, overage_per_minute: "0.080",
    overage_display: "$0.08", is_popular: false, sort_order: 2,
    cta_text: "Empezar prueba gratis",
    features: [
      "10 agentes de voz IA",
      "5.000 min/mes incluidos",
      "Múltiples bases de conocimiento",
      "Captura de leads al CRM",
      "Agenda citas automáticamente",
      "Transferencia a humano vía WhatsApp",
      "Analítica avanzada con transcripciones",
      "Agentes por departamento",
      "Onboarding dedicado",
      "SLA de respuesta 4h",
    ],
  },
];

const DEFAULT_FAQS = [
  { id: 1, question: "¿Necesito contratar algún servicio externo de voz o IA por separado?", answer: "No. OptimizaCRM gestiona toda la infraestructura por ti. Solo activas el agente, configuras su base de conocimiento y listo. Nos encargamos de toda la parte técnica.", sort_order: 0 },
  { id: 2, question: "¿El agente habla en español natural?", answer: "Sí. Integramos los mejores motores de síntesis de voz e IA del mercado, seleccionados específicamente para español latinoamericano. Los clientes frecuentemente no detectan que están hablando con una IA en las primeras interacciones.", sort_order: 1 },
  { id: 3, question: "¿Qué pasa cuando el agente no sabe responder algo?", answer: "El agente reconoce sus límites y transfiere automáticamente a un agente humano vía WhatsApp, incluyendo un resumen de la conversación para que el equipo tenga contexto completo.", sort_order: 2 },
  { id: 4, question: "¿Los leads que captura el agente van directo a mi CRM?", answer: "Sí. Cada lead calificado por el agente aparece automáticamente en tu pipeline de OptimizaCRM con nombre, email, teléfono, motivo de contacto y resumen de la conversación.", sort_order: 3 },
  { id: 5, question: "¿Puedo personalizar lo que dice el agente?", answer: "Completamente. Configuras el nombre del agente, su saludo inicial, despedida, información de tu empresa, productos, precios, horarios y preguntas de calificación. También puedes importar la KB desde una URL o PDF.", sort_order: 4 },
  { id: 6, question: "¿Qué sucede cuando se agotan los minutos del mes?", answer: "Recibes alertas al 80% y 100% del límite. Los minutos adicionales se cobran a $0.08–0.10/min según tu plan. Puedes actualizar a un plan superior en cualquier momento.", sort_order: 5 },
  { id: 7, question: "¿El agente de voz está incluido en los planes de CRM?", answer: "Durante los 14 días de prueba gratuita incluimos 1 agente con 100 minutos para que puedas probarlo. Pasado el trial, es un servicio adicional. Los planes de Voz-AI incluyen Voz Starter (1 agente y 300 minutos), Voz Pro (3 agentes, 1.000 min) y Voz Enterprise (5 agentes, 5.000 min).", sort_order: 6 },
];

const DEFAULT_STATS = [
  { id: 1, value: "24/7",  label: "Disponibilidad sin interrupciones", sort_order: 0 },
  { id: 2, value: "<1s",   label: "Tiempo de respuesta promedio",       sort_order: 1 },
  { id: 3, value: "60%",   label: "Reducción en llamadas perdidas",      sort_order: 2 },
  { id: 4, value: "$800",  label: "Ahorro mensual vs recepcionista",     sort_order: 3 },
];

const DEFAULT_CMS = {
  hero_badge:           "Agente de Voz IA — disponible ahora",
  hero_headline:        "Tu recepcionista con IA que nunca descansa",
  hero_subheadline:     "Atiende llamadas, califica leads y agenda citas en automático las 24 horas. En español natural. Sin fricción. Integrado directo a tu CRM.",
  cta_primary_text:     "Probar gratis 14 días",
  cta_primary_href:     "/register",
  cta_secondary_text:   "Ver demo en vivo",
  trial_note:           "Sin tarjeta de crédito · 1 agente + 100 min incluidos en el trial",
  pricing_badge:        "Planes de Voz IA",
  pricing_headline:     "Precio fijo, sin sorpresas",
  pricing_subheadline:  "Minutos extra: $0.08–0.10/min según plan. Sin contratos anuales obligatorios.",
  annual_discount_pct:  20,
  roi_human_salary:     "$519/mes",
  roi_human_benefits:   "$200/mes",
  roi_human_vacation:   "$100/mes",
  roi_human_total:      "~$820/mes",
  roi_multiplier:       "7×",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type VoicePlan = typeof DEFAULT_PLANS[0];
type VoiceFAQ  = typeof DEFAULT_FAQS[0];
type VoiceStat = typeof DEFAULT_STATS[0];
type CmsData   = typeof DEFAULT_CMS;

// ─── Use cases (estructural, no cambia) ──────────────────────────────────────

const USE_CASES = [
  {
    icon: Hotel,
    sector: "Hoteles y Restaurantes",
    bg: "bg-amber-950/30 border-amber-800/40",
    iconBg: "bg-amber-600",
    examples: [
      "Consultas de disponibilidad y tarifas",
      "Reservas y confirmaciones automáticas",
      "Información de menú, horarios y ubicación",
      "Gestión de quejas con escalado a gerencia",
    ],
  },
  {
    icon: Building2,
    sector: "Inmobiliarias",
    bg: "bg-blue-950/30 border-blue-800/40",
    iconBg: "bg-blue-600",
    examples: [
      "Calificación de compradores y arrendatarios",
      "Agenda de visitas a propiedades",
      "Información de precios y características",
      "Seguimiento de leads inactivos",
    ],
  },
  {
    icon: ShoppingBag,
    sector: "Retail y E-commerce",
    bg: "bg-green-950/30 border-green-800/40",
    iconBg: "bg-green-600",
    examples: [
      "Estado de pedidos y seguimiento",
      "Consultas de producto y disponibilidad",
      "Gestión de devoluciones",
      "Soporte post-venta 24/7",
    ],
  },
  {
    icon: Headphones,
    sector: "Servicios profesionales",
    bg: "bg-orange-950/30 border-orange-800/40",
    iconBg: "bg-orange-700",
    examples: [
      "Calificación inicial de consultas",
      "Agenda de reuniones y asesorías",
      "Cotizaciones y presupuestos básicos",
      "Derivación al especialista correcto",
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VozIaPage() {
  const [annualBilling, setAnnualBilling] = useState(false);

  const [plans, setPlans]           = useState<VoicePlan[]>(DEFAULT_PLANS);
  const [faqs, setFaqs]             = useState<VoiceFAQ[]>(DEFAULT_FAQS);
  const [stats, setStats]           = useState<VoiceStat[]>(DEFAULT_STATS);
  const [cms, setCms]               = useState<CmsData>(DEFAULT_CMS);
  const [implStarterPrice, setImplStarterPrice] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API}/voice/plans/`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: VoicePlan[]) => { if (data.length) setPlans(data); })
      .catch(() => {});

    fetch(`${API}/voice/faqs/`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: VoiceFAQ[]) => { if (data.length) setFaqs(data); })
      .catch(() => {});

    fetch(`${API}/voice/stats/`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: VoiceStat[]) => { if (data.length) setStats(data); })
      .catch(() => {});

    fetch(`${API}/content/voz_ia/`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(({ data }) => { if (data) setCms((prev) => ({ ...prev, ...data })); })
      .catch(() => {});

    fetch(`${API}/content/servicios_implementacion_voz/`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(({ data }) => {
        const tiers = (data?.tiers ?? []) as { price: number | null }[];
        const prices = tiers.map((t) => t.price).filter((p): p is number => p !== null);
        if (prices.length > 0) setImplStarterPrice(Math.min(...prices));
      })
      .catch(() => {});
  }, []);

  const price = (plan: VoicePlan) =>
    annualBilling ? plan.annual_price : Math.round(parseFloat(plan.price_monthly));

  const discountPct = cms.annual_discount_pct ?? 20;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PublicHeader />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-slate-950">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-orange-600/10 blur-[120px]" />
          <div className="absolute top-20 right-0 h-[400px] w-[400px] rounded-full bg-green-600/8 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-700/50 bg-orange-950/60 px-4 py-1.5 text-sm font-medium text-orange-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-orange-400" />
              {cms.hero_badge}
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              {cms.hero_headline.split("que nunca descansa")[0]}
              <br />
              <span className="bg-gradient-to-r from-orange-400 to-orange-400 bg-clip-text text-transparent">
                que nunca descansa
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
              {cms.hero_subheadline}
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href={cms.cta_primary_href}>
                <Button size="lg" className="h-12 gap-2 bg-orange-600 px-8 text-base font-semibold hover:bg-orange-500 text-white">
                  <Mic className="h-4 w-4" />
                  {cms.cta_primary_text}
                </Button>
              </Link>
              <Link href="#demo">
                <Button size="lg" variant="outline" className="h-12 gap-2 border-slate-700 px-8 text-base text-slate-300 hover:bg-slate-800 hover:text-white">
                  <Phone className="h-4 w-4" />
                  {cms.cta_secondary_text}
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-sm text-slate-500">{cms.trial_note}</p>
          </div>

          {/* Hero visual */}
          <div className="mt-20 mx-auto max-w-4xl">
            <div className="relative rounded-2xl border border-slate-700/60 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-600">
                  <Mic className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Agente Eugenia — OptimizaCRM</p>
                  <p className="text-xs text-green-400">● Llamada activa — 00:43</p>
                </div>
                <div className="ml-auto flex gap-1">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="w-1 rounded-full bg-orange-400 animate-pulse"
                      style={{ height: `${8 + (i % 3) * 10}px`, animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <span className="shrink-0 rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">Agente</span>
                  <p className="text-slate-300">"Hola, gracias por llamar a Inmobiliaria Horizonte. Soy Eugenia, ¿en qué puedo ayudarte hoy?"</p>
                </div>
                <div className="flex gap-3">
                  <span className="shrink-0 rounded-full bg-orange-900/50 px-2 py-0.5 text-xs text-orange-300">Cliente</span>
                  <p className="text-slate-400">"Busco un apartamento de 2 habitaciones en zona 10, con presupuesto de unos $1,500 al mes."</p>
                </div>
                <div className="flex gap-3">
                  <span className="shrink-0 rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">Agente</span>
                  <p className="text-slate-300">"Perfecto. Tenemos varias opciones en zona 10 dentro de ese rango. ¿Cuándo te gustaría agendar una visita?"</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-green-800/40 bg-green-950/20 px-4 py-2.5">
                <Check className="h-4 w-4 text-green-400 shrink-0" />
                <p className="text-xs text-green-300">Lead capturado en CRM — Cita agendada para el viernes 10:00 AM</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map(({ id, value, label }) => (
              <div key={id} className="text-center">
                <p className="text-3xl font-bold text-white lg:text-4xl">{value}</p>
                <p className="mt-1 text-sm text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pain points ───────────────────────────────────────────────────── */}
      <section className="border-b border-slate-800 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-orange-400">El problema</p>
              <h2 className="mt-3 text-3xl font-bold text-white lg:text-4xl">
                Cada llamada perdida es un cliente que se va a la competencia
              </h2>
              <div className="mt-8 space-y-5">
                {[
                  { icon: Phone,    text: "El 62% de las llamadas a PYMEs no reciben respuesta fuera del horario laboral." },
                  { icon: Clock,    text: "Un lead tarda en promedio 47 horas en ser contactado. Para entonces, ya habló con 3 competidores." },
                  { icon: Users,    text: `Contratar un recepcionista a tiempo completo cuesta entre ${cms.roi_human_salary} y $1,200/mes más prestaciones.` },
                  { icon: BarChart3,text: "El 78% de los clientes compra del primer proveedor que les responde." },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex gap-4">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-950/40 border border-red-800/40">
                      <Icon className="h-4 w-4 text-red-400" />
                    </div>
                    <p className="text-slate-300 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-orange-800/40 bg-orange-950/20 p-8">
              <p className="text-sm font-semibold uppercase tracking-widest text-orange-300">La solución</p>
              <h3 className="mt-3 text-2xl font-bold text-white">
                Un agente IA que atiende en segundos, califica leads y los agenda — sin que nadie de tu equipo intervenga
              </h3>
              <div className="mt-6 space-y-4">
                {[
                  "Responde al instante, sin importar la hora",
                  "Habla en español latinoamericano natural",
                  "Captura datos del lead directo a tu CRM",
                  "Agenda citas en el calendario del equipo",
                  "Transfiere a humano cuando el cliente lo necesita",
                  `Cuesta ${cms.roi_multiplier} menos que un recepcionista humano`,
                ].map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="border-b border-slate-800 py-20 bg-slate-900/30" id="demo">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest text-orange-400">Cómo funciona</p>
            <h2 className="mt-3 text-3xl font-bold text-white lg:text-4xl">
              Activo en menos de 15 minutos
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: "01", title: "Configura tu agente",  icon: Zap,   desc: "Dale un nombre, carga la información de tu empresa (o importa desde tu web o un PDF) y define las preguntas de calificación." },
              { step: "02", title: "Actívalo en tu canal", icon: Phone, desc: "Copia el código del widget y pégalo en tu web. Tus visitantes pueden iniciar una llamada de voz directamente desde el botón flotante." },
              { step: "03", title: "Recibe leads calificados", icon: Users, desc: "Cada conversación genera un lead en tu CRM con nombre, contacto, necesidad detectada y cita agendada si corresponde." },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="relative rounded-2xl border border-slate-700 bg-slate-900 p-7">
                <span className="absolute -top-4 left-6 rounded-full border border-orange-700 bg-orange-950 px-3 py-1 text-xs font-bold text-orange-300">
                  {step}
                </span>
                <div className="mt-2 mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-900/50 border border-orange-700/50">
                  <Icon className="h-6 w-6 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ─────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-800 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest text-orange-400">Casos de uso</p>
            <h2 className="mt-3 text-3xl font-bold text-white lg:text-4xl">Diseñado para tu sector</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {USE_CASES.map(({ icon: Icon, sector, bg, iconBg, examples }) => (
              <div key={sector} className={cn("rounded-2xl border p-7", bg)}>
                <div className="flex items-center gap-3 mb-5">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconBg)}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white">{sector}</h3>
                </div>
                <ul className="space-y-2.5">
                  {examples.map(ex => (
                    <li key={ex} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <Check className="h-3.5 w-3.5 shrink-0 text-green-400" />
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROI Comparison ────────────────────────────────────────────────── */}
      <section className="border-b border-slate-800 py-20 bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest text-orange-400">ROI real</p>
            <h2 className="mt-3 text-3xl font-bold text-white lg:text-4xl">¿Cuánto te cuesta no tenerlo?</h2>
          </div>
          <div className="mx-auto max-w-4xl grid gap-6 md:grid-cols-2">
            {/* Human */}
            <div className="rounded-2xl border border-red-800/30 bg-red-950/10 p-8">
              <div className="flex items-center gap-2 mb-6">
                <Users className="h-5 w-5 text-red-400" />
                <h3 className="font-semibold text-red-300">Recepcionista humano</h3>
              </div>
              <div className="space-y-3 text-sm">
                {[
                  ["Salario base",          cms.roi_human_salary],
                  ["Prestaciones y seguro", cms.roi_human_benefits],
                  ["Vacaciones y bajas",    cms.roi_human_vacation],
                  ["Horas cubiertas",       "8h/día, lun–vie"],
                  ["Llamadas simultáneas",  "1"],
                  ["Disponibilidad 24/7",   "No"],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-400">{label}</span>
                    <span className="font-medium text-slate-200">{val}</span>
                  </div>
                ))}
                <div className="border-t border-red-800/30 pt-3 flex justify-between">
                  <span className="font-semibold text-white">Total mensual</span>
                  <span className="font-bold text-red-400 text-base">{cms.roi_human_total}</span>
                </div>
              </div>
            </div>

            {/* AI */}
            <div className="rounded-2xl border border-orange-700/50 bg-orange-950/20 p-8 relative">
              <div className="absolute -top-3 right-6 rounded-full bg-orange-600 px-3 py-1 text-xs font-bold text-white">
                {cms.roi_multiplier} más económico
              </div>
              <div className="flex items-center gap-2 mb-6">
                <Mic className="h-5 w-5 text-orange-400" />
                <h3 className="font-semibold text-orange-300">Agente de Voz IA</h3>
              </div>
              <div className="space-y-3 text-sm">
                {[
                  ["Plan Voz Starter",      `$${Math.round(parseFloat(plans[0]?.price_monthly ?? "149"))}/mes`],
                  ["Prestaciones",          "$0"],
                  ["Vacaciones y bajas",    "$0"],
                  ["Horas cubiertas",       "24h/día, 7 días"],
                  ["Llamadas simultáneas",  "Ilimitadas"],
                  ["Disponibilidad 24/7",   "Sí"],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-400">{label}</span>
                    <span className="font-medium text-slate-200">{val}</span>
                  </div>
                ))}
                <div className="border-t border-orange-700/50 pt-3 flex justify-between">
                  <span className="font-semibold text-white">Total mensual</span>
                  <span className="font-bold text-orange-300 text-base">desde ${Math.round(parseFloat(plans[0]?.price_monthly ?? "149"))}/mes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-800 py-20" id="precios">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-orange-400">{cms.pricing_badge}</p>
            <h2 className="mt-3 text-3xl font-bold text-white lg:text-4xl">{cms.pricing_headline}</h2>
            <p className="mt-4 text-slate-400">{cms.pricing_subheadline}</p>
          </div>

          {/* Billing toggle */}
          <div className="flex justify-center mb-10">
            <div className="flex items-center gap-3 rounded-full border border-slate-700 bg-slate-900 p-1">
              <button
                onClick={() => setAnnualBilling(false)}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-medium transition-all",
                  !annualBilling ? "bg-orange-600 text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Mensual
              </button>
              <button
                onClick={() => setAnnualBilling(true)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all",
                  annualBilling ? "bg-orange-600 text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Anual
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  annualBilling ? "bg-white/20 text-white" : "bg-green-900/50 text-green-400"
                )}>
                  −{discountPct}%
                </span>
              </button>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.slug}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-8 transition-all",
                  plan.is_popular
                    ? "border-orange-600 bg-orange-950/30 shadow-xl shadow-orange-900/20"
                    : "border-slate-700 bg-slate-900"
                )}
              >
                {plan.is_popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-orange-600 px-4 py-1.5 text-xs font-bold text-white flex items-center gap-1.5">
                    <Star className="h-3 w-3" /> Más popular
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">${price(plan)}</span>
                    <span className="mb-1 text-slate-400">/mes</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    {annualBilling ? "facturación anual" : "facturación mensual"}
                  </p>
                  {annualBilling && (
                    <p className="text-xs text-green-400 mt-0.5">Antes ${Math.round(parseFloat(plan.price_monthly))}/mes</p>
                  )}
                  <p className="mt-0.5 text-xs text-slate-500">+ impuestos según aplique</p>
                  <div className="mt-4 flex gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1"><Mic className="h-3.5 w-3.5" /> {plan.agents} agente{plan.agents > 1 ? "s" : ""}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {plan.minutes_included.toLocaleString()} min</span>
                  </div>
                </div>

                <ul className="mt-7 flex-1 space-y-3">
                  {(plan.features as string[]).map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className={cn("mt-0.5 h-4 w-4 shrink-0", plan.is_popular ? "text-orange-400" : "text-green-400")} />
                      <span className="text-slate-300">{f}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2.5 text-sm text-slate-500">
                    <span className="mt-0.5 h-4 w-4 shrink-0 text-center text-xs">+</span>
                    <span>Min. extra a {plan.overage_display}/min</span>
                  </li>
                </ul>

                <Link href="/register" className="mt-8 block">
                  <Button
                    className={cn(
                      "w-full font-semibold",
                      plan.is_popular
                        ? "bg-orange-600 hover:bg-orange-500 text-white"
                        : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-600"
                    )}
                  >
                    {plan.cta_text}
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            ¿Necesitas más de 10 agentes o volumen superior a 5.000 min?{" "}
            <Link href="/contacto" className="text-orange-400 hover:text-orange-300 underline underline-offset-4">
              Contáctanos para un plan Enterprise a medida.
            </Link>
          </p>

          {/* ── Bundle CRM discount banner ─────────────────────────────────── */}
          <div className="mt-10 rounded-2xl border border-green-700/40 bg-green-950/20 p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-700/40 border border-green-600/40">
                  <Gift className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">
                    ¿Ya tienes un plan CRM activo? La implementación de Agente de Voz IA está bonificada.
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Nuestro equipo configura tu Agente de Voz IA completo — base de conocimiento, flujos de calificación y
                    conexión al CRM — sin coste adicional de implementación al contratar ambos servicios juntos.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-400" /> Setup + configuración incluidos</span>
                    <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-400" /> Integración al CRM desde día 1</span>
                    <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-400" /> Onboarding en español</span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                <Link href="/servicios/voz-ia">
                  <Button className="gap-2 bg-green-700 hover:bg-green-600 text-white font-semibold whitespace-nowrap">
                    Solicitar <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <p className="text-xs text-slate-500">
                  Servicio de implementación desde{" "}
                  <span className="font-semibold text-slate-300">
                    {implStarterPrice ? `$${implStarterPrice}` : "…"}
                  </span>{" "}
                  · bonificado con CRM activo
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trial CTA ─────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-800 py-14 bg-slate-900/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-orange-700/50 bg-gradient-to-br from-orange-950/60 to-slate-900 p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600">
              <Mic className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Pruébalo gratis durante 14 días
            </h2>
            <p className="mt-3 text-slate-400">
              Tu trial incluye 1 agente de voz IA con 100 minutos para que lo pruebes con clientes reales.
              Sin tarjeta de crédito.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/register">
                <Button size="lg" className="h-12 gap-2 bg-orange-600 px-8 font-semibold hover:bg-orange-500 text-white">
                  Activar mi agente gratis <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contacto">
                <Button size="lg" variant="outline" className="h-12 border-slate-700 px-8 text-slate-300 hover:bg-slate-800 hover:text-white">
                  Hablar con ventas
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <FaqSection
        headline="Preguntas frecuentes"
        subheadline="Todo lo que necesitas saber sobre el Agente de Voz IA antes de empezar."
        items={faqs.map((f) => ({ q: f.question, a: f.answer }))}
        ctaText="Escríbenos directamente"
        className="border-b border-slate-800"
      />

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-orange-700/10 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white sm:text-5xl">
            Tu próxima llamada perdida
            <br />
            <span className="text-orange-400">podría ser la última</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-400">
            Activa tu agente de voz IA hoy. En 15 minutos estará atendiendo leads, calificando clientes y agendando citas por ti.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/register">
              <Button size="lg" className="h-13 gap-2 bg-orange-600 px-10 text-base font-bold hover:bg-orange-500 text-white">
                <Mic className="h-5 w-5" />
                Activar agente gratis
              </Button>
            </Link>
            <Link href="#precios">
              <Button size="lg" variant="outline" className="h-13 border-slate-700 px-8 text-slate-300 hover:bg-slate-800 hover:text-white">
                Ver planes <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="mt-5 text-sm text-slate-500">14 días gratis · Sin tarjeta de crédito · Cancela cuando quieras</p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
