"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, ArrowRight, Shield, Clock, MessageCircle,
  Globe, Zap, Mic, Brain, Target, Plug, Calendar, TestTube,
  Phone, Settings, Rocket,
} from "lucide-react";
import { cmsApi } from "@/lib/api";
import { FaqSection } from "@/components/ui/faq-section";

// ─── Icon map ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Shield, Clock, MessageCircle, Globe, Zap, Mic, Brain, Target,
  Plug, Calendar, TestTube, Phone, Settings, Rocket, CheckCircle, ArrowRight,
};

function DynIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Zap;
  return <Icon className={className} />;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface TierFeature { text: string; highlight: boolean }
interface Tier {
  key: string; name: string; tagline: string;
  price: number | null; days: string; popular: boolean; cta: string;
  features: TierFeature[];
}
interface IncludeItem { icon: string; title: string; desc: string }
interface Faq         { q: string; a: string }
interface TrustItem   { icon: string; text: string }

interface PageData {
  hero: {
    badge: string; headline: string; headline_highlight: string;
    subheadline: string; cta_primary: string; cta_primary_href: string;
    cta_secondary: string; cta_secondary_href: string;
    trust_strip: TrustItem[];
  };
  tiers:       Tier[];
  includes:    IncludeItem[];
  faqs:        Faq[];
  trust_strip: TrustItem[];
  cta: {
    headline: string; subheadline: string;
    primary_label: string; primary_href: string;
    secondary_label: string; secondary_href: string;
  };
}

// ─── Fallback steps (structural, not from CMS) ───────────────────────────────

const STEPS = [
  {
    icon: Phone,
    step: "01",
    title: "Kickoff",
    desc: "Agendamos una llamada de 30 min para entender tu negocio, el perfil de tus clientes y las preguntas clave que el agente debe hacer.",
  },
  {
    icon: Brain,
    step: "02",
    title: "Configuración",
    desc: "Construimos la base de conocimiento, definimos el flujo de conversación y conectamos el agente a tu CRM y calendario.",
  },
  {
    icon: TestTube,
    step: "03",
    title: "Prueba real",
    desc: "Realizamos llamadas de prueba y ajustamos respuestas, tono y flujos hasta que el agente funcione exactamente como esperas.",
  },
  {
    icon: Rocket,
    step: "04",
    title: "Activación",
    desc: "Publicamos el widget en tu web, entregamos la documentación y dejamos el agente operativo para tu equipo.",
  },
];

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-800 ${className}`} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VozIaSetupPage() {
  const { data: section, isLoading } = useQuery({
    queryKey: ["content", "servicios_implementacion_voz"],
    queryFn:  () => cmsApi.getSection("servicios_implementacion_voz"),
    staleTime: 5 * 60 * 1000,
  });

  const d = section?.data as PageData | undefined;

  const trustItems: TrustItem[] = d?.trust_strip ?? [
    { icon: "Shield",        text: "Garantía de funcionamiento" },
    { icon: "MessageCircle", text: "Soporte en español" },
    { icon: "Globe",         text: "Servicio remoto en LATAM" },
    { icon: "Zap",           text: "Sin permanencia adicional" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <PublicHeader />

      <main className="flex-1">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 pb-20 pt-24 sm:px-12 lg:px-20">
          <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/4 translate-x-1/3 rounded-full bg-orange-600/8 blur-3xl" />
          <div className="pointer-events-none absolute left-0 bottom-0 h-[300px] w-[300px] translate-y-1/3 -translate-x-1/3 rounded-full bg-orange-600/5 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-800/50 bg-orange-950/40 px-4 py-1.5 text-sm font-medium text-orange-400">
              <Mic className="h-3.5 w-3.5" />
              {d?.hero.badge ?? "Servicio de configuración profesional"}
            </div>

            {isLoading ? (
              <>
                <Skeleton className="mx-auto h-16 w-3/4 mb-3" />
                <Skeleton className="mx-auto h-16 w-1/2 mb-6" />
                <Skeleton className="mx-auto h-6 w-2/3" />
              </>
            ) : (
              <>
                <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl">
                  {d?.hero.headline ?? "Tu Agente de Voz IA"}{" "}
                  {d?.hero.headline_highlight && (
                    <span className="text-orange-500">{d.hero.headline_highlight}</span>
                  )}
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
                  {d?.hero.subheadline ?? "Configuramos tu agente desde cero — base de conocimiento, flujos de calificación, voz personalizada e integración con tu CRM. Tú solo tienes que encenderlo."}
                </p>
              </>
            )}

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href={d?.hero.cta_primary_href ?? "#planes"}>
                <Button size="lg" className="gap-2 bg-orange-600 hover:bg-orange-500 px-8 text-base font-bold text-white">
                  {d?.hero.cta_primary ?? "Ver planes"} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={d?.hero.cta_secondary_href ?? "/contacto"}>
                <Button size="lg" variant="ghost" className="px-8 text-base font-bold text-slate-300 bg-slate-400/80 hover:bg-slate-500/50 hover:text-white">
                  {d?.hero.cta_secondary ?? "Hablar con el equipo"}
                </Button>
              </Link>
            </div>

            {/* Trust strip inline */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
              {(d?.hero.trust_strip ?? trustItems).map(({ icon, text }) => (
                <span key={text} className="flex items-center gap-1.5">
                  <DynIcon name={icon} className="h-4 w-4 text-orange-400" />
                  {text}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── ¿Qué incluye? ─────────────────────────────────────────────── */}
        <section className="bg-slate-900/50 px-6 pb-20 pt-16 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-black text-white sm:text-4xl">¿Qué incluye el servicio?</h2>
              <p className="mt-3 text-slate-400">Todo lo que necesita tu agente para funcionar desde el primer día.</p>
            </div>

            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-36 rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {(d?.includes ?? [
                  { icon: "Mic",      title: "Configuración del agente",  desc: "Nombre, personalidad, saludo, despedida y tono de voz. El agente suena como parte de tu equipo." },
                  { icon: "Brain",    title: "Base de conocimiento",      desc: "Importamos la información de tu empresa desde tu web, PDFs o documentos." },
                  { icon: "Target",   title: "Flujo de calificación",     desc: "Preguntas clave para identificar leads de calidad y filtrar consultas que no aplican." },
                  { icon: "Plug",     title: "Integración al CRM",        desc: "Cada conversación genera un lead automático directo a tu pipeline." },
                  { icon: "Calendar", title: "Agenda de citas",           desc: "Conectamos el agente con tu calendario para que las citas se registren automáticamente." },
                  { icon: "TestTube", title: "Prueba y ajuste fino",      desc: "Probamos con llamadas reales antes de activar. Ajustamos hasta que quede perfecto." },
                ]).map(({ icon, title, desc }) => (
                  <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <div className="mb-4 inline-flex rounded-xl bg-orange-950/40 border border-orange-900/40 p-3 text-orange-400">
                      <DynIcon name={icon} className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Planes ────────────────────────────────────────────────────── */}
        <section id="planes" className="px-6 py-20 sm:px-12 lg:px-20 scroll-mt-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-4xl font-black text-white sm:text-5xl">Elige tu nivel</h2>
              <p className="mt-4 text-slate-400">Pago único. Sin suscripción adicional. Sin letra pequeña.</p>
            </div>

            {isLoading ? (
              <div className="grid gap-6 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[540px] rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                {(d?.tiers ?? [
                  {
                    key: "starter", name: "Setup Starter", popular: false, price: 299, days: "48 horas hábiles",
                    tagline: "Para empresas que quieren un agente operativo rápido con lo esencial configurado.",
                    cta: "Contratar Setup Starter",
                    features: [
                      { text: "Configuración completa de 1 agente de voz",          highlight: false },
                      { text: "Base de conocimiento desde tu web o documento",       highlight: true },
                      { text: "Saludo, despedida y flujo de conversación inicial",   highlight: false },
                      { text: "Hasta 5 preguntas de calificación de leads",          highlight: false },
                      { text: "Integración con CRM (captura de leads automática)",  highlight: true },
                      { text: "Prueba funcional y ajuste fino",                      highlight: false },
                      { text: "Documentación de configuración entregada",            highlight: false },
                    ],
                  },
                  {
                    key: "pro", name: "Setup Pro", popular: true, price: 599, days: "5 días hábiles",
                    tagline: "Para equipos que necesitan múltiples agentes, flujos avanzados y experiencia de marca.",
                    cta: "Contratar Setup Pro",
                    features: [
                      { text: "Todo lo del Setup Starter",                                       highlight: false },
                      { text: "Hasta 3 agentes configurados",                                    highlight: true },
                      { text: "Múltiples bases de conocimiento",                                 highlight: false },
                      { text: "Flujos de calificación avanzados a medida",                      highlight: true },
                      { text: "Escalado automático a humano vía WhatsApp configurado",          highlight: true },
                      { text: "Agenda de citas integrada con tu calendario",                     highlight: false },
                      { text: "1 sesión de ajuste post-lanzamiento (15 días)",                   highlight: true },
                    ],
                  },
                  {
                    key: "enterprise", name: "Setup Enterprise", popular: false, price: null, days: "A convenir",
                    tagline: "Para empresas con múltiples departamentos, flujos complejos o más de 3 agentes activos.",
                    cta: "Solicitar propuesta",
                    features: [
                      { text: "Todo lo del Setup Pro",                                      highlight: false },
                      { text: "Agentes ilimitados según plan contratado",                    highlight: false },
                      { text: "Voz personalizada de marca",                                  highlight: true },
                      { text: "Flujos multi-departamento y multi-idioma",                    highlight: false },
                      { text: "Integraciones avanzadas (ERP, e-commerce, sistema propio)", highlight: true },
                      { text: "Capacitación al equipo operativo",                            highlight: false },
                      { text: "Acompañamiento de adopción 30 días",                         highlight: true },
                    ],
                  },
                ]).map((tier) => {
                  const cardColor = tier.popular
                    ? "border-orange-600 bg-slate-900 shadow-2xl shadow-orange-500/10"
                    : "border-slate-700 bg-slate-900/50";
                  return (
                    <div
                      key={tier.key}
                      className={`relative flex flex-col rounded-2xl border p-8 transition-all hover:-translate-y-1 ${cardColor}`}
                    >
                      {tier.popular && (
                        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-orange-600 px-4 py-1 text-xs font-bold tracking-wide text-white shadow-lg shadow-orange-900/40">
                          Más elegido
                        </span>
                      )}

                      <div>
                        <h2 className={`text-2xl font-black ${tier.popular ? "text-orange-400" : "text-white"}`}>
                          {tier.name}
                        </h2>
                        <p className="mt-2 text-sm text-slate-400">{tier.tagline}</p>

                        <div className="mt-6">
                          {tier.price ? (
                            <>
                              <div className="flex items-end gap-1.5">
                                <span className="text-5xl font-black text-white">${tier.price}</span>
                                <span className="mb-1.5 text-sm text-slate-500">pago único</span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">+ impuestos según aplique</p>
                            </>
                          ) : (
                            <>
                              <p className="text-3xl font-black text-white">A medida</p>
                              <p className="mt-1 text-xs text-slate-500">Según alcance del proyecto</p>
                            </>
                          )}
                        </div>

                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span className="text-[11px] font-medium text-slate-400">{tier.days}</span>
                        </div>
                      </div>

                      <ul className="mt-8 flex-1 space-y-3">
                        {tier.features.map((f) => (
                          <li key={f.text} className="flex items-start gap-2.5 text-sm">
                            <CheckCircle
                              className={`mt-0.5 h-4 w-4 flex-shrink-0 ${f.highlight ? "text-orange-400" : "text-green-500"}`}
                            />
                            <span className={f.highlight ? "font-semibold text-orange-300" : "text-slate-300"}>
                              {f.text}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <Link
                        href={tier.price ? `/contacto?servicio=voz-${tier.key}` : "/contacto"}
                        className="mt-8 block"
                      >
                        <Button
                          className={`w-full gap-1.5 font-bold ${
                            tier.popular
                              ? "bg-orange-600 hover:bg-orange-500 text-white"
                              : "border-slate-600 bg-transparent text-slate-300 hover:border-orange-600 hover:bg-orange-600 hover:text-white"
                          }`}
                          variant={tier.popular ? "default" : "outline"}
                        >
                          {tier.cta}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Trust strip */}
            <div className="mt-8 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:grid-cols-4 text-center">
              {trustItems.map(({ icon, text }) => (
                <div key={text} className="flex flex-col items-center gap-2">
                  <DynIcon name={icon} className="h-5 w-5 text-orange-400" />
                  <span className="text-sm font-medium text-slate-300">{text}</span>
                </div>
              ))}
            </div>

            {/* Bundle CRM note */}
            <div className="mt-6 rounded-xl border border-green-700/40 bg-green-950/20 px-6 py-4 text-center text-sm text-slate-400">
              <span className="font-semibold text-green-400">¿Ya tienes un plan CRM activo?</span>{" "}
              El setup está bonificado al contratar ambos servicios juntos.{" "}
              <Link href="/contacto" className="font-semibold text-orange-400 hover:text-orange-300 underline underline-offset-4">
                Solicitar →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Cómo funciona ─────────────────────────────────────────────── */}
        <section className="bg-slate-900 px-6 py-20 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-black text-white sm:text-4xl">Cómo funciona</h2>
              <p className="mt-3 text-slate-400">
                Del pago a tu agente <span className="text-orange-400">operativo</span> en horas, no semanas.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(({ icon: Icon, step, title, desc }) => (
                <div key={step} className="relative rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                  <span className="absolute -top-3.5 left-5 rounded-full border border-orange-700/60 bg-orange-950 px-2.5 py-0.5 text-xs font-bold text-orange-300">
                    {step}
                  </span>
                  <div className="mb-4 mt-1 inline-flex rounded-xl bg-orange-950/40 border border-orange-900/40 p-3 text-orange-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        {isLoading ? (
          <section className="px-6 py-20 sm:px-12 lg:px-20">
            <div className="mx-auto max-w-6xl space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          </section>
        ) : (
          <FaqSection
            badge="FAQ"
            headline="Preguntas frecuentes"
            subheadline="Todo lo que necesitas saber antes de contratar el setup de tu agente."
            items={(d?.faqs ?? [
              { q: "¿Necesito tener ya un plan de Agente de Voz IA activo?", a: "Sí, la configuración se realiza sobre tu cuenta activa. Puedes iniciar la prueba gratuita de 14 días y contratar el setup simultáneamente — los días de trial no corren hasta que actives el agente." },
              { q: "¿Cuánto tarda el proceso?", a: "El Setup Starter está listo en 48 horas hábiles. El Setup Pro en 5 días hábiles. Para Enterprise el plazo lo acordamos en el kickoff según la complejidad." },
              { q: "¿Qué necesito preparar antes de empezar?", a: "Idealmente: información de tu empresa (web, PDF, documento Word), las preguntas clave que quieres que haga el agente y acceso al calendario si quieres agenda automática. Si no tienes todo perfecto, lo construimos juntos en el kickoff." },
              { q: "¿El agente puede atender en varios idiomas?", a: "Sí, en el Setup Enterprise configuramos agentes multi-idioma. Para Starter y Pro el agente se configura en un idioma principal (español latinoamericano por defecto)." },
              { q: "¿Qué garantía tienen?", a: "Si al finalizar el setup el agente no responde correctamente según lo acordado, lo ajustamos sin coste adicional hasta que funcione como se espera." },
            ]).map((f) => ({ q: f.q, a: f.a }))}
            ctaText="Escríbenos directamente"
            ctaHref="/contacto"
            className="bg-slate-950"
          />
        )}

        {/* ── CTA final ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-orange-600 px-6 py-20 sm:px-12 lg:px-20">
          <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 translate-x-1/3 translate-y-1/3 rounded-full bg-black/10" />
          <div className="pointer-events-none absolute left-0 top-0 h-48 w-48 -translate-x-1/3 -translate-y-1/2 rounded-full bg-black/10" />
          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-black text-white sm:text-5xl">
              {d?.cta.headline ?? "Tu agente de voz operativo esta misma semana."}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-orange-100">
              {d?.cta.subheadline ?? "Configúralo hoy y empieza a capturar leads desde el primer día — sin que tu equipo intervenga."}
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href={d?.cta.primary_href ?? "/contacto?servicio=voz-pro"}>
                <Button size="lg" className="gap-2 bg-black/20 px-8 text-base font-bold text-white hover:bg-black/30 border border-white/20">
                  {d?.cta.primary_label ?? "Contratar Setup Pro"} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={d?.cta.secondary_href ?? "/contacto"}>
                <Button size="lg" variant="ghost" className="px-8 text-base font-bold text-white bg-black/80 hover:bg-white hover:text-orange-600">
                  {d?.cta.secondary_label ?? "Tengo dudas, hablemos"}
                </Button>
              </Link>
            </div>
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
