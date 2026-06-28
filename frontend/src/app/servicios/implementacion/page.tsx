"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, ArrowRight, Zap, Users, Settings, Brain,
  BarChart3, MessageCircle, Clock, Shield, ChevronDown,
  Rocket, TrendingUp, Globe, CalendarCheck,
} from "lucide-react";
import { cmsApi } from "@/lib/api";

// ─── Icon map ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp, Clock, Users, CalendarCheck, Settings, Rocket,
  CheckCircle, Shield, MessageCircle, Globe, Zap, Brain, BarChart3,
};

function DynIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Zap;
  return <Icon className={className} />;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TierFeature { text: string; highlight: boolean }
interface Tier {
  key: string; name: string; tagline: string;
  price: number | null; days: string; popular: boolean; cta: string;
  features: TierFeature[];
}
interface Step      { icon: string; title: string; desc: string }
interface CompRow   { item: string; arranque: string; impulso: string; escala: string }
interface Faq       { q: string; a: string }
interface TrustItem { icon: string; text: string }
interface WhyCard   { icon: string; title: string; desc: string }

interface PageData {
  hero:         { badge: string; headline: string; headline_highlight?: string; subheadline: string; cta_primary: string; cta_primary_href: string; cta_secondary: string; cta_secondary_href: string };
  why_cards:    WhyCard[];
  tiers:        Tier[];
  steps:        Step[];
  comparison:   CompRow[];
  faqs:         Faq[];
  trust_strip:  TrustItem[];
  cta:          { headline: string; subheadline: string; primary_label: string; primary_href: string; secondary_label: string; secondary_href: string };
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: Faq) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="w-full text-left rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4 transition-all hover:border-slate-700"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="font-semibold text-white">{q}</span>
        <ChevronDown className={`mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </div>
      {open && <p className="mt-3 text-sm leading-relaxed text-slate-400">{a}</p>}
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-800 ${className}`} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImplementacionPage() {
  const { data: section, isLoading } = useQuery({
    queryKey: ["content", "servicios_implementacion"],
    queryFn:  () => cmsApi.getSection("servicios_implementacion"),
    staleTime: 5 * 60 * 1000,
  });

  const d = section?.data as PageData | undefined;

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
              <Rocket className="h-3.5 w-3.5" />
              {d?.hero.badge ?? "Servicios de implementación"}
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
                  {d?.hero.headline}{" "}
                  {d?.hero.headline_highlight && (
                    <span className="text-orange-500">{d.hero.headline_highlight}</span>
                  )}
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
                  {d?.hero.subheadline}
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
          </div>
        </section>

        {/* ── Por qué importa ───────────────────────────────────────────── */}
        <section className="px-6 pb-20 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-4 sm:grid-cols-3">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 rounded-2xl" />
                  ))
                : (d?.why_cards ?? []).map(({ icon, title, desc }) => (
                    <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                      <div className="mb-4 inline-flex rounded-xl bg-orange-950/40 p-3 text-orange-400">
                        <DynIcon name={icon} className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-white">{title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">{desc}</p>
                    </div>
                  ))}
            </div>
          </div>
        </section>

        {/* ── Planes ────────────────────────────────────────────────────── */}
        <section id="planes" className="px-6 pb-20 sm:px-12 lg:px-20 scroll-mt-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-4xl font-black text-white sm:text-5xl">Elige tu nivel</h2>
              <p className="mt-4 text-slate-400">Pago único. Sin suscripción adicional. Sin letra pequeña.</p>
            </div>

            {isLoading ? (
              <div className="grid gap-6 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[520px] rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                {(d?.tiers ?? []).map((tier) => {
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
                            <CheckCircle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${f.highlight ? "text-orange-400" : "text-green-500"}`} />
                            <span className={f.highlight ? "font-semibold text-orange-300" : "text-slate-300"}>
                              {f.text}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <Link
                        href={tier.price ? `/contacto?servicio=${tier.key}` : "/contacto"}
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
              {(d?.trust_strip ?? [
                { icon: "Shield",        text: "Garantía de entrega" },
                { icon: "MessageCircle", text: "Soporte en español" },
                { icon: "Globe",         text: "Servicio remoto en LATAM" },
                { icon: "Zap",           text: "Sin permanencia adicional" },
              ]).map(({ icon, text }) => (
                <div key={text} className="flex flex-col items-center gap-2">
                  <DynIcon name={icon} className="h-5 w-5 text-orange-400" />
                  <span className="text-sm font-medium text-slate-300">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comparativa ───────────────────────────────────────────────── */}
        <section className="bg-slate-900 px-6 py-20 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-black text-white sm:text-4xl">¿Qué incluye cada nivel?</h2>
              <p className="mt-3 text-slate-400">Comparativa detallada para que elijas sin dudas.</p>
            </div>

            {isLoading ? (
              <Skeleton className="h-80 rounded-2xl" />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-800 bg-slate-950">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Entregable</th>
                      <th className="px-4 py-4 text-center text-sm font-bold text-slate-300">Arranque</th>
                      <th className="px-4 py-4 text-center text-sm font-bold text-orange-400">Impulso</th>
                      <th className="px-4 py-4 text-center text-sm font-bold text-slate-300">Escala</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(d?.comparison ?? []).map((row, i) => (
                      <tr key={row.item} className={`border-t border-slate-800 ${i % 2 === 0 ? "bg-slate-900/30" : ""}`}>
                        <td className="px-6 py-3.5 font-medium text-slate-300">{row.item}</td>
                        <td className="px-4 py-3.5 text-center text-slate-400">
                          {row.arranque === "—" ? <span className="text-slate-700">—</span> : row.arranque}
                        </td>
                        <td className="px-4 py-3.5 text-center font-medium text-slate-200">
                          {row.impulso === "—" ? <span className="text-slate-700">—</span> : row.impulso}
                        </td>
                        <td className="px-4 py-3.5 text-center text-orange-300 font-medium">
                          {row.escala === "—" ? <span className="text-slate-700">—</span> : row.escala}
                        </td>
                      </tr>
                    ))}
                    {/* Investment row — pulled from tiers data */}
                    <tr className="border-t border-slate-800 bg-slate-950">
                      <td className="px-6 py-4 font-bold text-white">Inversión</td>
                      {(d?.tiers ?? []).map((t) => (
                        <td key={t.key} className={`px-4 py-4 text-center text-lg font-black ${t.popular ? "text-orange-400" : "text-white"}`}>
                          {t.price ? `$${t.price}` : "A medida"}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ── Cómo funciona ─────────────────────────────────────────────── */}
        <section className="px-6 py-20 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-black text-white sm:text-4xl">Cómo funciona</h2>
              <p className="mt-3 text-slate-400">Del pago a tu <span className="text-orange-400">equipo operativo</span> en días, no semanas.</p>
            </div>

            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {(d?.steps ?? []).map(({ icon, title, desc }) => (
                  <div key={title} className="relative flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                    <div className="mb-4 inline-flex rounded-xl bg-orange-950/40 p-3 text-orange-400">
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

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section className="bg-slate-900 px-6 py-20 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-black text-white sm:text-4xl">Preguntas frecuentes</h2>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {(d?.faqs ?? []).map((faq) => (
                  <FaqItem key={faq.q} {...faq} />
                ))}
              </div>
            )}
            <p className="mt-8 text-center text-slate-500">
              ¿Tienes una duda específica?{" "}
              <Link href="/contacto" className="font-semibold text-orange-400 hover:text-orange-300">
                Escríbenos directamente
              </Link>
            </p>
          </div>
        </section>

        {/* ── CTA final ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-orange-600 px-6 py-20 sm:px-12 lg:px-20">
          <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 translate-x-1/3 translate-y-1/3 rounded-full bg-black/10" />
          <div className="pointer-events-none absolute left-0 top-0 h-48 w-48 -translate-x-1/3 -translate-y-1/2 rounded-full bg-black/10" />
          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-black text-white sm:text-5xl">
              {d?.cta.headline ?? "Tu equipo operativo esta misma semana."}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-orange-100">
              {d?.cta.subheadline ?? "Reserva tu implementación hoy y en 7 días hábiles tienes el CRM configurado, tu equipo formado y listo para cerrar más ventas."}
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href={d?.cta.primary_href ?? "/contacto?servicio=impulso"}>
                <Button size="lg" className="gap-2 bg-black/20 px-8 text-base font-bold text-white hover:bg-black/30 border border-white/20">
                  {d?.cta.primary_label ?? "Empezar con Impulso"} <ArrowRight className="h-4 w-4" />
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
