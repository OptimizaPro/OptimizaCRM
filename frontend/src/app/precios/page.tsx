"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, XCircle, ArrowRight, Zap, Shield,
  Users, Brain, MessageCircle, BarChart3,
  UserPlus, GraduationCap, Workflow, Plug, LucideIcon, MapPin, Target, Phone, Headset,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Feature = { text: string; included: boolean; highlight: boolean };

type ApiAddOn = {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: string;
  price_display: string;
  period: string;
  icon: string;
  is_featured: boolean;
  sort_order: number;
};

type ApiPlan = {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  price_monthly: string;
  price_annual: string;
  currency: string;
  price_display: string;
  cta_text: string;
  features: Feature[];
  has_trial: boolean;
  trial_days: number;
  is_popular: boolean;
  sort_order: number;
  ai_credits_monthly: number;
};

// ─── Add-on icon map (slug → Lucide component) ────────────────────────────────

const ADDON_ICONS: Record<string, LucideIcon> = {
  "user-plus":      UserPlus,
  "graduation-cap": GraduationCap,
  "workflow":       Workflow,
  "zap":            Zap,
  "shield":         Shield,
  "brain":          Brain,
  "bar-chart-3":    BarChart3,
  "plug":           Plug,
  "target":         Target,
  "headset":        Headset,
};

// ─── Users per plan (matches comparison table) ────────────────────────────────

const PLAN_USERS: Record<string, number> = {
  basico:  2,
  pro:     6,
  equipo:  12,
};

// ─── UI helpers derivados del modelo ─────────────────────────────────────────

function planCardColor(slug: string, isPopular: boolean) {
  if (isPopular) return "border-orange-600 bg-slate-900 shadow-2xl shadow-orange-500/10";
  return "border-slate-700 bg-slate-900/50";
}

function planHref(slug: string) {
  return slug === "enterprise" ? "/contacto" : "/register";
}

function planBadge(isPopular: boolean) {
  return isPopular ? "Más popular" : null;
}

const COMPARISON: {
  feature: string;
  basico: boolean | string;
  pro: boolean | string;
  equipo: boolean | string;
  enterprise: boolean | string;
}[] = [
  { feature: "Usuarios",              basico: "2",         pro: "6",         equipo: "12",       enterprise: "A medida" },
  { feature: "Leads",                 basico: "500",       pro: "3.000",     equipo: "12.000",   enterprise: "A medida" },
  { feature: "Pipelines",             basico: "2",         pro: "5",         equipo: "10",       enterprise: "A medida" },
  { feature: "Lead Scoring IA",       basico: false,       pro: true,        equipo: true,       enterprise: true },
  { feature: "Automatizaciones",      basico: false,       pro: "10 reglas", equipo: "20 reglas", enterprise: "A medida" },
  { feature: "Widget web",            basico: true,        pro: true,        equipo: true,       enterprise: true },
  { feature: "Bandeja multicanal",    basico: false,       pro: true,        equipo: true,       enterprise: true },
  { feature: "Reportes avanzados",    basico: false,       pro: true,        equipo: true,       enterprise: true },
  { feature: "Previsión de ingresos", basico: false,       pro: true,        equipo: true,       enterprise: true },
  { feature: "Predicción de churn",   basico: false,       pro: false,       equipo: true,       enterprise: true },
  { feature: "Soporte",               basico: "Email",     pro: "Email",       equipo: "Prioritario", enterprise: "Dedicado + SLA" },
  { feature: "Onboarding",            basico: "Self-service", pro: "Self-service", equipo: "Self-service", enterprise: "Asistido" },
  { feature: "Facturación local",     basico: false,       pro: false,       equipo: false,      enterprise: true },
];

const PRICING_FAQS = [
  {
    q: "¿Cómo funciona el precio por usuario?",
    a: "Cada plan tiene un precio por usuario al mes y un tamaño de equipo incluido. Por ejemplo, si el plan cuesta $19.50/usuario e incluye 2 usuarios, el total mensual es $39. Así puedes comparar directamente con cualquier otro CRM del mercado.",
  },
  {
    q: "¿Qué pasa al terminar los 14 días de prueba?",
    a: "Tu prueba expira y la cuenta queda suspendida hasta que actives un plan. No te cobramos nada automáticamente ni necesitamos tarjeta para iniciar el periodo de prueba.",
  },
  {
    q: "¿Puedo cambiar de plan en cualquier momento?",
    a: "Sí. Puedes subir o bajar de plan cuando quieras. Si subes, el cambio es inmediato. Si bajas, aplica al siguiente ciclo de facturación.",
  },
  {
    q: "¿Qué ocurre si necesito más usuarios de los incluidos en mi plan?",
    a: "Sube al siguiente plan y obtienes más usuarios al mismo precio por persona. Si tu equipo supera el plan Equipo, contáctanos para una oferta Enterprise con el número exacto que necesites.",
  },
  {
    q: "¿Aceptan pago en moneda local?",
    a: "Actualmente cobramos en USD via tarjeta de crédito/débito. Para clientes Enterprise ofrecemos facturación local según el país. Estamos trabajando en métodos de pago locales para el resto de planes.",
  },
  {
    q: "¿Hay descuento para startups o ONGs?",
    a: "Sí. Contáctanos directamente y evaluamos tu caso. Queremos que más organizaciones en LATAM accedan a estas herramientas.",
  },
];

// ─── FAQ Item ─────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="w-full text-left rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4 transition-all hover:border-slate-700"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="font-semibold text-white">{q}</span>
        <span className={`mt-0.5 flex-shrink-0 text-orange-400 transition-transform duration-200 ${open ? "rotate-45" : ""}`}>
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
      {open && <p className="mt-3 text-sm leading-relaxed text-slate-400">{a}</p>}
    </button>
  );
}

// ─── Cell helper ──────────────────────────────────────────────────────────────

function Cell({ value }: { value: boolean | string }) {
  if (value === true)  return <CheckCircle className="mx-auto h-4 w-4 text-green-500" />;
  if (value === false) return <XCircle className="mx-auto h-4 w-4 text-slate-700" />;
  return <span className="text-sm font-medium text-slate-300">{value}</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function PricingPage() {
  const [annual, setAnnual]         = useState(false);
  const [plans, setPlans]           = useState<ApiPlan[]>([]);
  const [addons, setAddons]         = useState<ApiAddOn[]>([]);
  const [loading, setLoading]       = useState(true);
  const [addonLoading, setAddonLoading] = useState<string | null>(null);
  const [voiceStarterPrice, setVoiceStarterPrice] = useState<string | null>(null);
  const [implStarterPrice, setImplStarterPrice]   = useState<number | null>(null);
  const [cms, setCms]         = useState({
    badge:                    "Sin permanencia · Cancela cuando quieras",
    headline:                 "Precios pensados para LATAM",
    headline_highlight:       "LATAM",
    headline_highlight_color: "orange",
    subheadline:              "Gestiona leads, automatiza seguimientos y cierra más negocios. Precio claro por usuario, facturado por equipo, con IA integrable y 14 días de prueba gratis.",
  });

  useEffect(() => {
    fetch(`${API_URL}/billing/plans/`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: ApiPlan[]) => setPlans(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch(`${API_URL}/content/pricing/`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(({ data }) => setCms((prev) => ({ ...prev, ...data })))
      .catch(() => {});

    fetch(`${API_URL}/billing/addons/`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: ApiAddOn[]) => setAddons(data))
      .catch(() => {});

    fetch(`${API_URL}/voice/plans/`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: { price_monthly: string; sort_order: number }[]) => {
        const sorted = [...data].sort((a, b) => a.sort_order - b.sort_order);
        if (sorted.length > 0) setVoiceStarterPrice(sorted[0].price_monthly);
      })
      .catch(() => {});

    fetch(`${API_URL}/content/servicios_implementacion/`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(({ data }) => {
        const tiers = (data?.tiers ?? []) as { price: number | null }[];
        const prices = tiers.map((t) => t.price).filter((p): p is number => p !== null);
        if (prices.length > 0) setImplStarterPrice(Math.min(...prices));
      })
      .catch(() => {});
  }, []);

  const paidPlans = plans.filter((p) => p.slug !== "enterprise");

  async function handleAddonCheckout(slug: string) {
    setAddonLoading(slug);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      if (!token) {
        window.location.href = `/login?redirect=/precios`;
        return;
      }
      const res = await fetch(`${API_URL}/billing/addon-checkout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slug }),
      });
      if (res.status === 401) {
        window.location.href = `/login?redirect=/precios`;
        return;
      }
      const data = await res.json();
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch {
      // silently fail — user stays on page
    } finally {
      setAddonLoading(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <PublicHeader />

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 pb-20 pt-24 sm:px-12 lg:px-20">
          <div className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] -translate-y-1/4 translate-x-1/3 rounded-full bg-orange-600/10 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-800/50 bg-orange-950/40 px-4 py-1.5 text-sm font-medium text-orange-400">
              <Zap className="h-3.5 w-3.5" />
              {cms.badge}
            </div>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl sm:text-6xl">
              {cms.headline_highlight && cms.headline.includes(cms.headline_highlight)
                ? <>
                    {cms.headline.split(cms.headline_highlight)[0]}
                    <span className={
                      cms.headline_highlight_color === "orange" ? "text-orange-500" :
                      cms.headline_highlight_color === "green"  ? "text-green-400"  :
                      cms.headline_highlight_color === "white"  ? "text-white"      :
                      ""
                    }>
                      {cms.headline_highlight}
                    </span>
                    {cms.headline.split(cms.headline_highlight)[1]}
                  </>
                : cms.headline}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
              {cms.subheadline}
            </p>

            {/* Toggle mensual / anual */}
            <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-slate-700 bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => setAnnual(false)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                  !annual ? "bg-orange-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Mensual
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                  annual ? "bg-orange-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Anual
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${annual ? "bg-white/20 text-white" : "bg-green-900/60 text-green-400"}`}>
                  −20%
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ── Plans ────────────────────────────────────────────────────── */}
        <section className="px-6 pb-20 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-7xl">

            {/* Loading skeleton */}
            {loading && (
              <div className="grid gap-6 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[520px] animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50" />
                ))}
              </div>
            )}

            {/* Paid plans from API */}
            {!loading && (
              <div className="grid gap-6 lg:grid-cols-3">
                {paidPlans.map((plan) => {
                  const color  = planCardColor(plan.slug, plan.is_popular);
                  const badge  = planBadge(plan.is_popular);
                  const href   = planHref(plan.slug);
                  const monthly = parseFloat(plan.price_monthly);
                  const annual_ = parseFloat(plan.price_annual);
                  const saving  = annual_ > 0 ? Math.round((monthly - annual_) * 12) : 0;

                  return (
                    <div
                      key={plan.slug}
                      className={`relative flex flex-col rounded-2xl border p-8 transition-all hover:-translate-y-1 ${color}`}
                    >
                      {badge && (
                        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-orange-600 px-4 py-1 text-xs font-bold tracking-wide text-white shadow-lg shadow-orange-900/40">
                          {badge}
                        </span>
                      )}

                      <div>
                        <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                        <p className="mt-1 text-sm text-slate-400">{plan.tagline}</p>

                        {(() => {
                          const pricePerUser = annual && annual_ > 0 ? annual_ : monthly;
                          const users        = PLAN_USERS[plan.slug] ?? 1;
                          const total        = (pricePerUser * users).toFixed(2).replace(/\.00$/, "");
                          const billing      = annual && annual_ > 0 ? "facturación anual" : "facturación mensual";
                          return (
                            <>
                              <div className="mt-6 flex items-end gap-1.5">
                                <span className="text-5xl font-black text-white">
                                  ${pricePerUser % 1 === 0 ? pricePerUser.toFixed(0) : pricePerUser.toFixed(2)}
                                </span>
                                <div className="mb-1.5 leading-tight">
                                  <p className="text-xs text-slate-500">/usuario/mes</p>
                                </div>
                              </div>
                              <p className="mt-1 text-sm text-slate-400">
                                {users} usuario{users !== 1 ? "s" : ""} incluido{users !== 1 ? "s" : ""}
                              </p>
                              <p className="mt-0.5 text-sm text-slate-400">
                                ${total}/mes · {billing}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">+ impuestos según aplique</p>
                              {annual && saving > 0 && (
                                <p className="mt-1 text-[11px] font-medium text-green-400">Ahorras ${saving}/año</p>
                              )}
                            </>
                          );
                        })()}

                        {plan.has_trial && plan.trial_days > 0 && (
                          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-green-800/50 bg-green-950/40 px-3 py-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                            <span className="text-[11px] font-semibold text-green-400">
                              {plan.trial_days} días gratis · sin tarjeta
                            </span>
                          </div>
                        )}
                      </div>

                      <ul className="mt-8 flex-1 space-y-2.5">
                        {plan.ai_credits_monthly > 0 && (
                          <li className="flex items-start gap-2.5 text-sm">
                            <Brain className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
                            <span className="font-semibold text-orange-300">
                              {plan.ai_credits_monthly} créditos IA / mes
                            </span>
                          </li>
                        )}
                        {plan.features.map((f) => (
                          <li key={f.text} className={`flex items-start gap-2.5 text-sm ${!f.included ? "opacity-40" : ""}`}>
                            {f.included ? (
                              <CheckCircle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${f.highlight ? "text-orange-400" : "text-green-500"}`} />
                            ) : (
                              <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-600" />
                            )}
                            <span className={
                              !f.included ? "text-slate-500 line-through"
                              : f.highlight ? "font-semibold text-orange-300"
                              : "text-slate-300"
                            }>
                              {f.text}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <Link href={href} className="mt-8 block">
                        <Button
                          className={`w-full gap-1.5 font-bold ${
                            plan.is_popular
                              ? "bg-orange-600 hover:bg-orange-500 text-white"
                              : "border-slate-700 bg-transparent text-slate-300 hover:border-slate-500 hover:text-slate-900"
                          }`}
                          variant={plan.is_popular ? "default" : "outline"}
                        >
                          {plan.cta_text}
                          {plan.is_popular && <ArrowRight className="h-3.5 w-3.5" />}
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Enterprise banner — hardcodeado: no pasa por Recurrente */}
            <div className="mt-6 flex flex-col items-start gap-6 rounded-2xl border border-slate-700 bg-slate-900/50 p-8 sm:flex-row sm:items-center">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">Enterprise</h2>
                <p className="mt-1 text-sm text-slate-400">Para empresas con equipos grandes, múltiples sedes o necesidades específicas.</p>
                <ul className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                  {[
                    { text: "Usuarios adicionales a medida",  highlight: false },
                    { text: "Todo lo del plan Equipo",         highlight: false },
                    { text: "Leads y pipelines a medida",      highlight: false },
                    { text: "Automatizaciones a medida",       highlight: true  },
                    { text: "Predicción de ingresos avanzada", highlight: false },
                    { text: "Integraciones personalizadas",    highlight: false },
                    { text: "Onboarding asistido",             highlight: false },
                    { text: "Soporte dedicado + SLA",          highlight: true  },
                    { text: "Acceso por roles y permisos avanzados", highlight: false },
                    { text: "Facturación local disponible",    highlight: false },
                  ].map((f) => (
                    <li key={f.text} className="flex items-start gap-2 text-sm">
                      <CheckCircle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${f.highlight ? "text-orange-400" : "text-green-500"}`} />
                      <span className={f.highlight ? "font-semibold text-orange-300" : "text-slate-300"}>{f.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-shrink-0">
                <p className="mb-1 text-right text-2xl font-black text-white">A medida</p>
                <p className="mb-3 text-right text-[11px] text-slate-500">+ impuestos según aplique</p>
                <Link href="/contacto">
                  <Button className="gap-1.5 border-slate-600 bg-transparent font-bold text-slate-300 hover:border-orange-600 hover:bg-orange-600 hover:text-white" variant="outline">
                    Hablar con el equipo <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Trust strip */}
            <div className="mt-10 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:grid-cols-4 text-center">
              {[
                { icon: Shield,        text: "Sin tarjeta de crédito" },
                { icon: Zap,           text: "14 días de prueba" },
                { icon: Users,         text: "Precio por usuario" },
                { icon: MessageCircle, text: "Soporte en español" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex flex-col items-center gap-2">
                  <Icon className="h-5 w-5 text-orange-400" />
                  <span className="text-sm font-medium text-slate-300">{text}</span>
                </div>
              ))}
            </div>
            {/* Trust strip */}

            {/* Guatemala local billing callout */}
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-900/40 bg-blue-950/20 px-5 py-3.5">
              <MapPin className="h-4 w-4 flex-shrink-0 text-blue-400" />
              <p className="text-sm text-slate-400">
                <span className="font-semibold text-slate-200">¿Tu empresa está en Guatemala?</span>{" "}
                Emitimos <span className="text-blue-300 font-medium">Factura Electrónica en Línea (FEL)</span> para todos los planes.{" "}
                <Link href="/contacto" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Contáctanos para coordinar →
                </Link>
              </p>
            </div>

          </div>
        </section>

        {/* ── Add-ons ──────────────────────────────────────────────────── */}
        <section className="px-6 pb-20 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8">
              <div className="mb-8 flex items-center gap-3">
                <span className="rounded-full border border-orange-800/50 bg-orange-950/40 px-3 py-1 text-xs font-semibold text-orange-400">
                  Add-ons
                </span>
                <p className="text-sm text-slate-400">Complementos opcionales disponibles en cualquier plan de pago.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {addons.map((addon) => {
                  const Icon = ADDON_ICONS[addon.icon] ?? Zap;
                  return (
                    <div
                      key={addon.slug}
                      className={`relative flex flex-col gap-4 rounded-xl border p-5 ${
                        addon.is_featured
                          ? "border-orange-600 bg-slate-900 shadow-lg shadow-orange-500/10"
                          : "border-slate-700 bg-slate-900"
                      }`}
                    >
                      {addon.is_featured && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-600 px-3 py-0.5 text-[10px] font-bold tracking-wide text-white shadow-md shadow-orange-900/40">
                          Recomendado
                        </span>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div className="rounded-lg bg-orange-950/40 p-2 text-orange-400">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black text-white">{addon.price_display}</span>
                          <p className="text-[11px] text-slate-500">{addon.period}</p>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-100">{addon.name}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-400">{addon.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddonCheckout(addon.slug)}
                        disabled={addonLoading === addon.slug}
                        className={`mt-auto w-full rounded-lg border py-2 text-sm font-semibold transition-all ${
                          addon.is_featured
                            ? "border-orange-600 bg-orange-600 text-white hover:bg-orange-500 hover:border-orange-500"
                            : "border-slate-600 bg-transparent text-slate-300 hover:border-orange-600 hover:bg-orange-600 hover:text-white"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {addonLoading === addon.slug ? "Procesando…" : "Añadir al plan"}
                      </button>
                    </div>
                  );
                })}
              </div>

              <p className="mt-6 text-xs text-slate-500">
                Los add-ons se activan desde el panel de configuración una vez suscrito a un plan.
                Para volúmenes elevados contacta con nosotros para un precio personalizado.
              </p>
            </div>
          </div>
        </section>

        {/* ── Voz IA upsell ────────────────────────────────────────────── */}
        <section className="px-6 pb-12 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-2xl border border-green-700/30 bg-gradient-to-br from-green-950/40 via-slate-900 to-slate-900 px-8 py-10 shadow-xl shadow-green-900/10">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-green-600/8 blur-3xl" />
              <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-green-900/40 text-green-400 ring-1 ring-green-700/40">
                  <Phone className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-green-700/50 bg-green-950/60 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-green-400">
                    Complemento · No incluido en el plan
                  </span>
                  <h3 className="mt-3 text-2xl font-black text-white">
                    Agrega un Agente de Voz IA a tu CRM
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    Atiende llamadas, califica leads y agenda citas en automático las 24h.
                    Compatible con todos los planes — se activa en 24 h, sin cambiar tu suscripción actual.
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-slate-500 sm:justify-start">
                    <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> 1 agente incluido en prueba</span>
                    <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> 100 minutos gratis</span>
                    <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> Integración CRM directa</span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 flex-col items-center gap-2 sm:items-end">
                  <Link href="/voz-ia">
                    <Button size="lg" className="gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold whitespace-nowrap shadow-lg shadow-orange-900/30">
                      Ver planes de Voz <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <p className="text-xs text-slate-500">
                    Desde <span className="font-semibold text-slate-300">
                      {voiceStarterPrice ? `$${voiceStarterPrice}/mes` : "…"}
                    </span> · prueba gratis
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Comparison table ─────────────────────────────────────────── */}
        <section className="bg-slate-900 px-6 py-20 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-black text-white sm:text-4xl">Comparativa completa</h2>
              <p className="mt-3 text-slate-400">Todo lo que incluye cada plan, sin letra pequeña.</p>
            </div>

            <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-800 bg-slate-950">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Funcionalidad</th>
                    {paidPlans.map((p) => (
                      <th key={p.slug} className={`px-4 py-4 text-center text-sm font-bold ${p.is_popular ? "text-orange-400" : "text-slate-300"}`}>
                        {p.name}
                      </th>
                    ))}
                    <th className="px-4 py-4 text-center text-sm font-bold text-slate-300">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row, i) => (
                    <tr key={row.feature} className={`border-t border-slate-800 ${i % 2 === 0 ? "bg-slate-900/30" : ""}`}>
                      <td className="px-6 py-3.5 font-medium text-slate-300">{row.feature}</td>
                      <td className="px-4 py-3.5 text-center"><Cell value={row.basico} /></td>
                      <td className="px-4 py-3.5 text-center"><Cell value={row.pro} /></td>
                      <td className="px-4 py-3.5 text-center"><Cell value={row.equipo} /></td>
                      <td className="px-4 py-3.5 text-center"><Cell value={row.enterprise} /></td>
                    </tr>
                  ))}
                  {/* Créditos IA — fila dinámica desde la API */}
                  {paidPlans.length > 0 && (
                    <tr className="border-t border-slate-800">
                      <td className="px-6 py-3.5 font-medium text-slate-300 flex items-center gap-2">
                        <Brain className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
                        Créditos IA / mes
                      </td>
                      {paidPlans.map((p) => (
                        <td key={p.slug} className="px-4 py-3.5 text-center">
                          <span className="text-sm font-semibold text-orange-300">
                            {p.ai_credits_monthly > 0 ? p.ai_credits_monthly : "—"}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-sm font-medium text-slate-300">A medida</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Pricing philosophy ───────────────────────────────────────── */}
        <section className="px-6 py-20 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">Nuestra filosofía</p>
                <h2 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Precio claro.<br />
                  <span className="text-orange-500">Sin letra pequeña.</span>
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-slate-400">
                  Sabes exactamente lo que cuesta cada usuario de tu equipo. Sin tarifas ocultas,
                  sin cargos sorpresa y sin que el precio cambie a mitad de camino.
                </p>
                <p className="mt-4 text-lg leading-relaxed text-slate-400">
                  Cada plan incluye un equipo de usuarios a ese precio por persona.
                  Cuando necesites más, subes de plan — y sabes de antemano cuánto vas a pagar.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { icon: Users,     title: "Precio por usuario",       desc: "Comparas manzanas con manzanas. Cada plan muestra el coste real por persona en tu equipo." },
                  { icon: Brain,     title: "IA a tu medida",           desc: "Conecta tu propia clave de IA y activa el lead scoring y las automatizaciones inteligentes." },
                  { icon: BarChart3, title: "Factura predecible",       desc: "Sabes exactamente lo que pagas cada mes. Sin cargos variables ni sorpresas." },
                  { icon: Shield,    title: "Sin permanencia",          desc: "Cancela cuando quieras. El plan anual se factura anticipado pero con garantía de devolución." },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <div className="mb-3 inline-flex rounded-lg bg-orange-950/40 p-2 text-orange-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-white">{title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing FAQ ──────────────────────────────────────────────── */}
        <section className="bg-slate-900 px-6 py-20 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <h2 className="text-3xl font-black text-white sm:text-4xl">Dudas sobre precios</h2>
              <p className="mt-3 text-slate-400">Las preguntas más comunes sobre nuestros planes.</p>
            </div>
            <div className="mt-10 space-y-3">
              {PRICING_FAQS.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
            <p className="mt-8 text-center text-slate-500">
              ¿Tienes otra pregunta?{" "}
              <Link href="/contacto" className="font-semibold text-orange-400 hover:text-orange-300">
                Escríbenos directamente
              </Link>
            </p>
          </div>
        </section>

        {/* ── CTA implementación ───────────────────────────────────────── */}
        <section className="px-6 py-16 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-4xl">
            <div className="relative overflow-hidden rounded-2xl border border-orange-700/40 bg-gradient-to-br from-orange-950/60 via-slate-900 to-slate-900 px-8 py-10 shadow-xl shadow-orange-900/10">
              {/* Glow decorativo */}
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-600/10 blur-3xl" />

              <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
                {/* Icono */}
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-600/15 text-orange-400 ring-1 ring-orange-700/40">
                  <Zap className="h-7 w-7" />
                </div>

                <div className="flex-1">
                  {/* Badge */}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-700/50 bg-orange-950/60 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-orange-400">
                    Servicio de implementación
                  </span>
                  <h3 className="mt-3 text-2xl font-black text-white">
                    ¿Quieres que lo configuremos nosotros?
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    Nuestro equipo implementa OptimizaCRM a medida de tu negocio — pipelines,
                    integraciones, automatizaciones y capacitación incluida.
                    Tu equipo operativo en días, no semanas.
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-slate-500 sm:justify-start">
                    <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> Pago único, sin permanencia</span>
                    <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> Garantía de entrega</span>
                    <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> Soporte en español</span>
                  </div>
                </div>

                <div className="flex flex-shrink-0 flex-col items-center gap-2 sm:items-end">
                  <Link href="/servicios/implementacion">
                    <Button size="lg" className="gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold whitespace-nowrap shadow-lg shadow-orange-900/30">
                      Ver planes <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <p className="text-xs text-slate-500">Desde <span className="font-semibold text-slate-300">{implStarterPrice ? `$${implStarterPrice}` : "…"}</span> · pago único</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-orange-600 px-6 py-20 sm:px-12 lg:px-20">
          <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 translate-x-1/3 translate-y-1/3 rounded-full bg-black/10" />
          <div className="pointer-events-none absolute left-0 top-0 h-48 w-48 -translate-x-1/3 -translate-y-1/2 rounded-full bg-black/10" />
          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-black text-white sm:text-5xl">
              Pruébalo 14 días gratis
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-orange-100">
              Acceso completo al plan Pro sin tarjeta de crédito.
              Si no es para ti, no nos guardamos nada.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/register">
                <Button size="lg" className="gap-2 bg-black/20 px-8 text-base font-bold text-white hover:bg-black/30 border border-white/20">
                  Iniciar prueba gratuita <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contacto">
                <Button size="lg" variant="ghost" className="px-8 text-base font-bold text-white hover:bg-white hover:text-orange-600">
                  Hablar con el equipo
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
