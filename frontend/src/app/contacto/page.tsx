"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail, MessageCircle, Clock, CheckCircle,
  ArrowRight, Send, Building2, User, Loader2,
} from "lucide-react";
import { cmsApi } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = "idle" | "sending" | "success" | "error";

type CmsData = {
  badge:           string;
  headline:        string;
  subheadline:     string;
  email:           string;
  email_detail:    string;
  whatsapp:        string;
  whatsapp_href:   string;
  whatsapp_detail: string;
  response_time:   string;
  form_headline:   string;
  form_subtext:    string;
  contact_reasons: string[];
  faq_headline:    string;
  faqs:            { q: string; a: string }[];
  demo_headline:   string;
  demo_text:       string;
  demo_cta_text:   string;
  demo_cta_href:   string;
};

const FALLBACK: CmsData = {
  badge:           "Hablemos",
  headline:        "¿Tienes preguntas? Estamos aquí",
  subheadline:     "Cuéntanos sobre tu negocio y te ayudamos a evaluar si OptimizaCRM es la herramienta que necesitas. Sin presión, sin ventas agresivas.",
  email:           "hola@optimizacrm.com",
  email_detail:    "Respuesta en menos de 24 h",
  whatsapp:        "+502 XXXX XXXX",
  whatsapp_href:   "https://wa.me/502XXXXXXXX",
  whatsapp_detail: "Lunes a viernes · 9h–18h",
  response_time:   "< 24 horas",
  form_headline:   "Envíanos un mensaje",
  form_subtext:    "Te respondemos en menos de 24 horas hábiles.",
  contact_reasons: [
    "Quiero probar OptimizaCRM en mi empresa",
    "Tengo dudas sobre precios o planes",
    "Necesito una demo personalizada",
    "Soy partner o quiero revenderte",
    "Tengo una pregunta técnica",
    "Otro",
  ],
  faq_headline: "Preguntas frecuentes",
  faqs: [
    { q: "¿Cuánto tiempo tarda la configuración inicial?", a: "Menos de 5 minutos. Creas tu cuenta, invitas a tu equipo y empiezas a registrar leads de inmediato. No necesitas contratar un consultor." },
    { q: "¿Mis datos están seguros?",                      a: "Sí. Cada organización tiene sus datos completamente aislados (arquitectura multi-tenant). Usamos JWT, HTTPS y cumplimiento OWASP desde el primer día." },
    { q: "¿Puedo migrar desde otro CRM?",                  a: "Ofrecemos importación de contactos y leads vía CSV. Para migraciones más complejas, contáctanos y lo gestionamos juntos." },
    { q: "¿Hay soporte en español?",                       a: "100%. El producto está diseñado para LATAM y todo el soporte se da en español. Sin bots, sin respuestas genéricas en inglés." },
  ],
  demo_headline:   "¿Prefieres ver el producto en acción?",
  demo_text:       "Agenda una demo personalizada de 30 minutos y te mostramos cómo OptimizaCRM puede adaptarse a tu equipo.",
  demo_cta_text:   "Probar gratis 14 días",
  demo_cta_href:   "/register",
};

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
        <span className={`mt-0.5 flex-shrink-0 text-orange-400 transition-transform ${open ? "rotate-45" : ""}`}>
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
      {open && (
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{a}</p>
      )}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const { data: cms } = useQuery<CmsData>({
    queryKey:  ["cms", "contacto"],
    queryFn:   () => cmsApi.getSection("contacto").then((r) => r.data as CmsData),
    staleTime: 5 * 60 * 1000,
  });

  const d = cms ?? FALLBACK;

  const channels = [
    {
      icon:   Mail,
      label:  "Email directo",
      value:  d.email,
      detail: d.email_detail,
      href:   `mailto:${d.email}`,
      color:  "text-blue-400",
      bg:     "bg-blue-950/40 border-blue-900/50",
    },
    {
      icon:   MessageCircle,
      label:  "WhatsApp",
      value:  d.whatsapp,
      detail: d.whatsapp_detail,
      href:   d.whatsapp_href,
      color:  "text-green-400",
      bg:     "bg-green-950/40 border-green-900/50",
    },
    {
      icon:   Clock,
      label:  "Tiempo de respuesta",
      value:  d.response_time,
      detail: "Garantizado en días hábiles",
      href:   null as string | null,
      color:  "text-orange-400",
      bg:     "bg-orange-950/40 border-orange-900/50",
    },
  ];

  const [form, setForm] = useState({ name: "", email: "", company: "", reason: "", message: "" });
  const [state, setState] = useState<FormState>("idle");

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    // Simulated send — wire to your backend endpoint when ready
    await new Promise((r) => setTimeout(r, 1400));
    setState("success");
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <PublicHeader />

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 pb-20 pt-24 sm:px-12 lg:px-20">
          <div className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] -translate-y-1/4 translate-x-1/3 rounded-full bg-orange-600/10 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-800/50 bg-orange-950/40 px-4 py-1.5 text-sm font-medium text-orange-400">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              {d.badge}
            </div>
            <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl">
              {d.headline}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
              {d.subheadline}
            </p>
          </div>
        </section>

        {/* ── Contact channels ─────────────────────────────────────────── */}
        <section className="px-6 pb-16 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-4 sm:grid-cols-3">
              {channels.map(({ icon: Icon, label, value, detail, href, color, bg }) => {
                const content = (
                  <div className={`flex items-start gap-4 rounded-xl border p-5 transition-all ${bg} ${href ? "hover:scale-[1.02]" : ""}`}>
                    <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 ${color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
                      <p className={`mt-0.5 font-bold ${color}`}>{value}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
                    </div>
                  </div>
                );
                return href ? (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer">{content}</a>
                ) : (
                  <div key={label}>{content}</div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Form + FAQ ───────────────────────────────────────────────── */}
        <section className="bg-slate-900 px-6 py-20 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-16 lg:grid-cols-2">

              {/* Contact form */}
              <div>
                <h2 className="text-3xl font-black text-white">{d.form_headline}</h2>
                <p className="mt-2 text-slate-400">{d.form_subtext}</p>

                {state === "success" ? (
                  <div className="mt-8 rounded-2xl border border-green-800/50 bg-green-950/30 p-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-500 bg-green-950">
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">¡Mensaje enviado!</h3>
                    <p className="mt-2 text-slate-400">
                      Gracias por contactarnos. Te responderemos a{" "}
                      <span className="font-medium text-slate-200">{form.email}</span> en breve.
                    </p>
                    <Button
                      onClick={() => { setState("idle"); setForm({ name: "", email: "", company: "", reason: "", message: "" }); }}
                      className="mt-6 bg-orange-600 hover:bg-orange-500 text-white"
                    >
                      Enviar otro mensaje
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                          <User className="h-3.5 w-3.5" /> Nombre completo *
                        </label>
                        <Input
                          placeholder="Nelson Alvarez"
                          value={form.name}
                          onChange={(e) => set("name", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                          <Mail className="h-3.5 w-3.5" /> Email *
                        </label>
                        <Input
                          type="email"
                          placeholder="tu@empresa.com"
                          value={form.email}
                          onChange={(e) => set("email", e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                        <Building2 className="h-3.5 w-3.5" /> Empresa
                      </label>
                      <Input
                        placeholder="Nombre de tu empresa"
                        value={form.company}
                        onChange={(e) => set("company", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">
                        ¿En qué podemos ayudarte? *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(d.contact_reasons ?? []).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => set("reason", r)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                              form.reason === r
                                ? "border-orange-600 bg-orange-950/60 text-orange-400"
                                : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">
                        Mensaje *
                      </label>
                      <textarea
                        rows={5}
                        placeholder="Cuéntanos sobre tu empresa, cuántas personas hay en tu equipo de ventas y qué problema quieres resolver..."
                        value={form.message}
                        onChange={(e) => set("message", e.target.value)}
                        required
                        className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    {state === "error" && (
                      <p className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-2.5 text-sm text-red-400">
                        Ocurrió un error. Por favor escríbenos directamente a {d.email}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={state === "sending" || !form.name || !form.email || !form.message}
                      className="w-full gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold"
                    >
                      {state === "sending" ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                      ) : (
                        <><Send className="h-4 w-4" /> Enviar mensaje</>
                      )}
                    </Button>

                    <p className="text-center text-xs text-slate-500">
                      Tu información es confidencial. Nunca la compartimos con terceros.
                    </p>
                  </form>
                )}
              </div>

              {/* FAQ */}
              <div>
                <h2 className="text-3xl font-black text-white">{d.faq_headline}</h2>
                <p className="mt-2 text-slate-400">Respuestas rápidas a las dudas más comunes.</p>

                <div className="mt-8 space-y-3">
                  {(d.faqs ?? []).map((faq) => (
                    <FaqItem key={faq.q} q={faq.q} a={faq.a} />
                  ))}
                </div>

                {/* Demo CTA */}
                <div className="mt-8 rounded-2xl border border-orange-800/40 bg-orange-950/20 p-6">
                  <h3 className="font-bold text-white">{d.demo_headline}</h3>
                  <p className="mt-1 text-sm text-slate-400">{d.demo_text}</p>
                  <Link href={d.demo_cta_href ?? "/register"} className="mt-4 inline-block">
                    <Button className="gap-2 bg-orange-600 hover:bg-orange-500 text-white">
                      {d.demo_cta_text} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
