import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Target, Zap, Shield, Heart,
  BarChart3, Users, Brain, CheckCircle, Quote,
} from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const VALUES = [
  {
    icon: Target,
    title: "Obsesión por el resultado",
    description:
      "No construimos funcionalidades por construirlas. Cada decisión de producto se mide por su impacto real en el negocio del cliente.",
  },
  {
    icon: Brain,
    title: "IA con propósito",
    description:
      "La inteligencia artificial no es un adorno. La integramos donde realmente ahorra tiempo, reduce errores y aumenta ingresos.",
  },
  {
    icon: Shield,
    title: "Confianza ante todo",
    description:
      "Los datos de tus clientes son el activo más valioso de tu empresa. Seguridad empresarial desde el primer día, sin excepciones.",
  },
  {
    icon: Heart,
    title: "Hecho para LATAM",
    description:
      "Entendemos la realidad de las PYMEs latinoamericanas: equipos pequeños, recursos ajustados y necesidad de resultados rápidos.",
  },
];

const MILESTONES = [
  { year: "2024", label: "Idea y validación", detail: "Investigación de mercado con 40+ PYMEs en Guatemala y Centroamérica." },
  { year: "2025", label: "Desarrollo del MVP", detail: "Construcción del core: CRM, lead scoring con IA, pipeline y automatizaciones." },
  { year: "2026", label: "Lanzamiento", detail: "Primeros clientes beta. Iteración rápida basada en feedback real del mercado." },
  { year: "→",    label: "Escala regional", detail: "Expansión a México, Colombia y el resto de LATAM con verticales específicos." },
];

const STACK_ITEMS = [
  "Next.js 15",
  "Django 5",
  "PostgreSQL",
  "IA Generativa",
  "Railway",
  "Multi-tenant",
];

// ─── Metadata & JSON-LD ───────────────────────────────────────────────────────

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Conoce la historia de OptimizaCRM. Construido por Nelson Alvarez tras más de 8 años gestionando PYMEs en LATAM. Misión: democratizar el CRM para equipos de ventas latinoamericanos.",
  alternates: { canonical: "https://optimizacrm.com/nosotros" },
  openGraph: {
    url: "https://optimizacrm.com/nosotros",
    title: "Nosotros | OptimizaCRM",
    description:
      "Construido por alguien que vivió el problema. La historia detrás de OptimizaCRM y por qué existe.",
  },
};

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Nelson Alvarez",
  jobTitle: "Founder & Developer",
  worksFor: { "@type": "Organization", name: "OptimizaPro", url: "https://optimizacrm.com" },
  description:
    "Fundador de OptimizaCRM. Más de 8 años liderando equipos de ventas y operaciones en Real Estate, Hospitality y Retail en Guatemala y Centroamérica.",
  knowsAbout: ["CRM software", "Sales Management", "SaaS", "Artificial Intelligence", "Next.js", "Django"],
  nationality: { "@type": "Country", name: "Guatemala" },
};

const aboutPageSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "Nosotros — OptimizaCRM",
  description:
    "Historia, misión y valores de OptimizaCRM. Construido por Nelson Alvarez para democratizar el CRM con IA para PYMEs en Latinoamérica.",
  url: "https://optimizacrm.com/nosotros",
  about: {
    "@type": "Organization",
    name: "OptimizaCRM",
    foundingDate: "2024",
    foundingLocation: { "@type": "Place", name: "Guatemala" },
    founder: { "@type": "Person", name: "Nelson Alvarez" },
    mission:
      "Democratizar el CRM con inteligencia artificial para que cualquier PYME latinoamericana pueda competir con las herramientas de ventas más avanzadas del mundo.",
    knowsAbout: ["CRM software", "Lead Scoring", "Sales Automation", "LATAM SaaS"],
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageSchema) }} />
      <PublicHeader />

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 pb-28 pt-24 sm:px-12 lg:px-20">
          {/* Glow */}
          <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/4 translate-x-1/3 rounded-full bg-orange-600/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 -translate-x-1/3 rounded-full bg-green-600/8 blur-3xl" />

          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-800/50 bg-orange-950/40 px-4 py-1.5 text-sm font-medium text-orange-400">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              Nuestra historia
            </div>

            <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Construido por alguien que{" "}
              <span className="text-orange-500">vivió el problema</span>
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-slate-400">
              Más de 10 años gestionando negocios en LATAM nos enseñaron que las herramientas
              existentes son demasiado complejas, demasiado caras o simplemente no entienden
              nuestra realidad. OptimizaCRM nació para cambiar eso.
            </p>
          </div>
        </section>

        {/* ── El problema ──────────────────────────────────────────────── */}
        <section className="bg-slate-900 px-6 py-24 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-16 lg:grid-cols-2 lg:items-center">

              {/* Quote block */}
              <div className="relative">
                <div className="absolute -left-4 -top-4 text-orange-500/20">
                  <Quote className="h-24 w-24" />
                </div>
                <blockquote className="relative">
                  <p className="text-2xl font-bold leading-relaxed text-white sm:text-3xl">
                    "Las PYMEs de LATAM merecen las mismas herramientas de ventas que las grandes
                    empresas — sin la complejidad ni los precios en dólares."
                  </p>
                  <footer className="mt-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-orange-600 bg-orange-600">
                      <span className="text-sm font-black text-white">NA</span>
                    </div>
                    <div>
                      <p className="font-semibold text-white">Ing. Nelson Alvarez</p>
                      <p className="text-sm text-slate-400">Founder, OptimizaCRM</p>
                    </div>
                  </footer>
                </blockquote>
              </div>

              {/* Problem list */}
              <div className="space-y-5">
                {[
                  { icon: BarChart3, text: "Las herramientas líderes del mercado son potentes pero cuestan más que el salario de un vendedor." },
                  { icon: Users,     text: "Los CRM genéricos no entienden los ciclos de venta ni la cultura de negocios latinoamericana." },
                  { icon: Zap,       text: "La IA existe desde hace años en otros mercados. En LATAM sigue siendo un lujo." },
                  { icon: Shield,    text: "Muchas soluciones no cumplen estándares de seguridad ni dan control real de los datos." },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-orange-950/60">
                      <Icon className="h-4 w-4 text-orange-400" />
                    </div>
                    <p className="text-slate-300">{text}</p>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* ── Misión ───────────────────────────────────────────────────── */}
        <section className="px-6 py-24 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">Nuestra misión</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
              Democratizar la inteligencia comercial
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
              Creemos que cualquier PYME en Latinoamérica, sin importar su tamaño o sector,
              debería poder competir con las herramientas de ventas más avanzadas del mundo.
              Sin barreras de idioma, sin precios prohibitivos, sin complejidad innecesaria.
            </p>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {[
                { value: "8+",    label: "Años en gestión empresarial" },
                { value: "100%",  label: "Enfoque en resultados reales" },
                { value: "LATAM", label: "Mercado objetivo y corazón" },
              ].map(({ value, label }) => (
                <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <p className="text-4xl font-black text-orange-500">{value}</p>
                  <p className="mt-2 text-sm text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Valores ──────────────────────────────────────────────────── */}
        <section className="bg-slate-900 px-6 py-24 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">Principios</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Lo que nos guía
              </h2>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {VALUES.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="group rounded-2xl border border-slate-800 bg-slate-950/60 p-6 transition-all hover:-translate-y-1 hover:border-orange-800/60 hover:shadow-xl hover:shadow-orange-500/5"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-orange-950/40 p-3 text-orange-500 group-hover:bg-orange-950/60">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 font-bold text-white">{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-400">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Fundador ─────────────────────────────────────────────────── */}
        <section className="px-6 py-24 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">

              {/* Avatar & card */}
              <div className="flex justify-center lg:justify-start">
                <div className="relative">
                  {/* Glow ring */}
                  <div className="absolute -inset-4 rounded-3xl bg-orange-500/10 blur-2xl" />
                  <div className="relative rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center shadow-2xl shadow-black/40">
                    {/* Avatar */}
                    <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border-4 border-orange-600 bg-gradient-to-br from-orange-600 to-orange-800 shadow-lg shadow-orange-900/40">
                      <span className="text-3xl font-black text-white">NA</span>
                    </div>
                    <h3 className="text-xl font-black text-white">Nelson Alvarez</h3>
                    <p className="mt-1 text-sm font-medium text-orange-400">Founder & Developer</p>
                    <div className="mt-5 space-y-2">
                      {[
                        "8+ años en gestión empresarial",
                        "Fundador de OptimizaPro",
                        "Especialista en PYMEs LATAM",
                        "Full-stack · IA · SaaS",
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-sm text-slate-400">
                          <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-6">
                <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">El equipo</p>
                <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Una persona,<br />
                  <span className="text-orange-500">una visión clara</span>
                </h2>
                <div className="space-y-4 text-lg leading-relaxed text-slate-400">
                  <p>
                    Después de más de 8 años gestionando y asesorando negocios en Centroamérica,
                    vi de primera mano cómo las PYMEs perdían oportunidades por no tener las
                    herramientas adecuadas — o por tener herramientas que nadie sabía usar.
                  </p>
                  <p>
                    OptimizaCRM es la respuesta a ese problema. Construido desde cero con tecnología
                    moderna, inteligencia artificial nativa y un enfoque absoluto en la experiencia
                    del usuario latinoamericano.
                  </p>
                  <p>
                    No somos un equipo de 200 personas en Silicon Valley. Somos un proyecto
                    nacido en LATAM, para LATAM — y esa diferencia se nota en cada decisión
                    de producto.
                  </p>
                </div>

                {/* Stack pills */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Stack tecnológico</p>
                  <div className="flex flex-wrap gap-2">
                    {STACK_ITEMS.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Timeline ─────────────────────────────────────────────────── */}
        <section className="bg-slate-900 px-6 py-24 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">Trayectoria</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                De la idea al producto
              </h2>
            </div>

            <div className="relative mt-14">
              {/* Vertical line */}
              <div className="absolute left-8 top-0 hidden h-full w-px bg-gradient-to-b from-orange-600/60 via-orange-600/20 to-transparent sm:block" />

              <div className="space-y-8">
                {MILESTONES.map(({ year, label, detail }, i) => (
                  <div key={year} className="flex items-start gap-6">
                    {/* Year bubble */}
                    <div className={`relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border text-sm font-black ${
                      i === MILESTONES.length - 1
                        ? "border-slate-700 bg-slate-800 text-slate-400"
                        : i === 2
                        ? "border-orange-600 bg-orange-600 text-white shadow-lg shadow-orange-900/40"
                        : "border-slate-700 bg-slate-950 text-orange-400"
                    }`}>
                      {year}
                    </div>
                    <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                      <h3 className="font-bold text-white">{label}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-400">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-orange-600 px-6 py-24 sm:px-12 lg:px-20">
          <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 translate-x-1/3 translate-y-1/3 rounded-full bg-black/10" />
          <div className="pointer-events-none absolute left-0 top-0 h-48 w-48 -translate-x-1/3 -translate-y-1/2 rounded-full bg-black/10" />

          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
              ¿Listo para hacer crecer tu negocio?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-orange-100">
              Únete a los primeros equipos que están transformando sus ventas con OptimizaCRM.
              14 días gratis, sin tarjeta de crédito.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/register">
                <Button size="lg" className="gap-2 bg-black/20 px-8 text-base font-bold text-white hover:bg-black/30 border border-white/20">
                  Comenzar gratis <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contacto">
                <Button size="lg" variant="ghost" className="px-8 text-base font-bold text-white hover:bg-white/10">
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
