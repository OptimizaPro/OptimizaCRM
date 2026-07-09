import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import {
  Check, ArrowRight, Phone, MessageSquare, Brain, Zap,
  BarChart3, Clock, MapPin, FileText, ChevronDown,
  Mic, Users, Shield, Building2, Star, ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CmsGuatemala {
  hero_badge?: string;
  hero_headline?: string;
  hero_subheadline?: string;
  trust_signals?: string[];
  cta_primary_text?: string;
  cta_primary_href?: string;
  cta_secondary_text?: string;
  cta_secondary_href?: string;
  intro_headline?: string;
  intro_text?: string;
  crm_badge?: string;
  crm_headline?: string;
  crm_subheadline?: string;
  whatsapp_headline?: string;
  whatsapp_text?: string;
  whatsapp_features?: string[];
  voz_badge?: string;
  voz_headline?: string;
  voz_subheadline?: string;
  fel_headline?: string;
  fel_text?: string;
  fel_badges?: string[];
  faqs?: Array<{ q: string; a: string }>;
  cta_final_headline?: string;
  cta_final_subheadline?: string;
  cta_final_primary_text?: string;
  cta_final_primary_href?: string;
  cta_final_secondary_text?: string;
  cta_final_secondary_href?: string;
  cta_final_note?: string;
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function getCmsContent(): Promise<CmsGuatemala> {
  try {
    const res = await fetch(`${API}/content/guatemala/`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return {};
    const json = await res.json();
    return (json.data ?? json) as CmsGuatemala;
  } catch {
    return {};
  }
}

// ─── Static feature data (structural — no CMS needed) ─────────────────────────

const CRM_FEATURES = [
  { icon: Brain,        title: "Lead scoring con IA",           description: "La inteligencia artificial analiza cada lead y le asigna una puntuación de 0 a 100 según su probabilidad de cierre. Tu equipo sabe en quién enfocarse." },
  { icon: MessageSquare,title: "WhatsApp Business integrado",   description: "Gestiona todas las conversaciones de WhatsApp desde el CRM. Historial completo, respuestas automáticas y seguimientos sin salir de la plataforma." },
  { icon: BarChart3,    title: "Pipeline visual Kanban",        description: "Arrastra oportunidades entre etapas, visualiza tu embudo de ventas en tiempo real y detecta cuellos de botella antes de que afecten tus ingresos." },
  { icon: Zap,          title: "Automatizaciones sin código",   description: "Configura seguimientos automáticos, asignación de leads, notificaciones y tareas con un editor visual. Sin programación, sin IT." },
  { icon: FileText,     title: "Factura Electrónica FEL",       description: "Emite Facturas Electrónicas en Línea (FEL) directamente desde el CRM, cumpliendo con los requisitos de la SAT de Guatemala." },
  { icon: Shield,       title: "Seguridad empresarial",         description: "Datos alojados con cifrado de nivel bancario. Copias de seguridad automáticas y control de acceso por rol." },
];

const VOZ_FEATURES = [
  { icon: Clock,         title: "Disponible 24/7",               description: "Tu agente atiende llamadas a las 2 am, los fines de semana y días feriados en Guatemala. Nunca pierdas un lead por fuera de horario." },
  { icon: Brain,         title: "Español guatemalteco natural",  description: "Optimizado para el acento y vocabulario de Guatemala. Los clientes frecuentemente no detectan que hablan con una IA." },
  { icon: Users,         title: "Califica leads automáticamente",description: "El agente hace las preguntas clave de tu proceso de ventas y registra las respuestas directamente en tu pipeline del CRM." },
  { icon: MessageSquare, title: "Transfiere a WhatsApp o humano",description: "Cuando el cliente necesita atención humana, el agente escala automáticamente vía WhatsApp con un resumen completo de la conversación." },
];

const SECTORS = [
  { icon: Building2, sector: "Inmobiliarias y constructoras",   desc: "Gestiona prospectos, seguimiento de propiedades y cierre de ventas con pipeline visual y recordatorios automáticos." },
  { icon: Star,      sector: "Hoteles y restaurantes",          desc: "Reservaciones, eventos y seguimiento de clientes recurrentes. El agente de voz atiende solicitudes fuera de horario." },
  { icon: Users,     sector: "Empresas de servicios",           desc: "Bufetes, consultoras, agencias. CRM + WhatsApp + automatizaciones para equipos pequeños con alto volumen de contactos." },
  { icon: Zap,       sector: "Tecnología y startups",           desc: "Pipeline B2B, lead scoring con IA y reportes para equipos de ventas que necesitan datos en tiempo real." },
  { icon: Phone,     sector: "Distribuidoras y comercio",       desc: "Seguimiento de pedidos, cotizaciones y clientes recurrentes. Integración con WhatsApp para confirmar entregas." },
  { icon: Brain,     sector: "Clínicas y salud",                desc: "El agente de voz agenda citas automáticamente, califica pacientes y registra el historial en el CRM." },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border border-slate-800 rounded-xl overflow-hidden">
      <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none select-none hover:bg-slate-800/40 transition-colors">
        <span className="font-semibold text-slate-100 text-sm leading-snug">{q}</span>
        <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0 group-open:rotate-180 transition-transform duration-200" />
      </summary>
      <div className="px-6 pb-5 text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-4">
        {a}
      </div>
    </details>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function GuatemalaPage() {
  const cms = await getCmsContent();

  // Fallback defaults (por si la API no responde aún)
  const c = {
    hero_badge:          cms.hero_badge          ?? "Diseñado para empresas en Guatemala",
    hero_headline:       cms.hero_headline       ?? "CRM con Inteligencia Artificial para Guatemala",
    hero_subheadline:    cms.hero_subheadline    ?? "Gestiona leads, WhatsApp y tu pipeline de ventas con IA. Agente de voz 24/7 en español. Factura Electrónica FEL incluida.",
    trust_signals:       cms.trust_signals       ?? ["14 días gratis", "Sin tarjeta de crédito", "FEL para la SAT de Guatemala", "Soporte en español"],
    cta_primary_text:    cms.cta_primary_text    ?? "Empezar gratis — 14 días",
    cta_primary_href:    cms.cta_primary_href    ?? "/register",
    cta_secondary_text:  cms.cta_secondary_text  ?? "Ver precios →",
    cta_secondary_href:  cms.cta_secondary_href  ?? "/precios",
    intro_headline:      cms.intro_headline      ?? "El CRM con IA que entiende el mercado guatemalteco",
    intro_text:          cms.intro_text          ?? "La mayoría de los CRM están diseñados para EE.UU. o España. OptimizaCRM nació para Centroamérica y LATAM: precios accesibles para PYMEs, soporte en español, WhatsApp integrado y facturación FEL nativa.",
    crm_badge:           cms.crm_badge           ?? "CRM con IA · WhatsApp · Guatemala",
    crm_headline:        cms.crm_headline        ?? "Todo lo que necesitas para vender más en Guatemala",
    crm_subheadline:     cms.crm_subheadline     ?? "Desde el primer contacto en WhatsApp hasta la factura FEL, sin salir de una sola plataforma.",
    whatsapp_headline:   cms.whatsapp_headline   ?? "WhatsApp es el canal #1 en Guatemala. Úsalo en tu CRM.",
    whatsapp_text:       cms.whatsapp_text       ?? "Tus clientes ya están en WhatsApp. Con OptimizaCRM, cada mensaje llega a un inbox centralizado, vinculado al lead correspondiente y registrado en el historial del CRM. Sin cambiar entre apps.",
    whatsapp_features:   cms.whatsapp_features   ?? ["Responde desde el CRM sin abrir el celular", "Historial completo de conversaciones por cliente", "Automatiza respuestas a preguntas frecuentes", "Notifica a tu equipo cuando llega un lead nuevo", "El agente de voz IA transfiere a WhatsApp cuando necesitas escalación humana"],
    voz_badge:           cms.voz_badge           ?? "Agente de Voz IA · Guatemala",
    voz_headline:        cms.voz_headline        ?? "Tu recepcionista con inteligencia artificial que nunca duerme",
    voz_subheadline:     cms.voz_subheadline     ?? "Atiende llamadas, califica leads y agenda citas automáticamente, 24 horas al día. En español natural, sin que tus clientes noten la diferencia.",
    fel_headline:        cms.fel_headline        ?? "Factura Electrónica FEL incluida en todos los planes para Guatemala",
    fel_text:            cms.fel_text            ?? "OptimizaCRM emite Facturas Electrónicas en Línea (FEL) que cumplen con los requisitos de la SAT de Guatemala. Tus clientes reciben su factura automáticamente al cerrar una venta. Sin sistemas externos, sin costo extra.",
    fel_badges:          cms.fel_badges          ?? ["Régimen General SAT", "FEL conforme Acuerdo 49-2018", "Envío automático al cliente"],
    faqs:                cms.faqs               ?? [],
    cta_final_headline:       cms.cta_final_headline       ?? "Empieza a vender más con IA hoy mismo",
    cta_final_subheadline:    cms.cta_final_subheadline    ?? "14 días gratis. Sin tarjeta de crédito. CRM + WhatsApp + Agente de Voz IA + FEL.",
    cta_final_primary_text:   cms.cta_final_primary_text   ?? "Crear cuenta gratis",
    cta_final_primary_href:   cms.cta_final_primary_href   ?? "/register",
    cta_final_secondary_text: cms.cta_final_secondary_text ?? "Hablar con el equipo",
    cta_final_secondary_href: cms.cta_final_secondary_href ?? "/contacto",
    cta_final_note:           cms.cta_final_note           ?? "¿Preguntas? Escríbenos por WhatsApp o al formulario de contacto. Respuesta en menos de 24 h.",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PublicHeader />

      {/* ── Breadcrumb ── */}
      <div className="border-b border-slate-800/60 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-6 py-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-slate-300 transition-colors">Inicio</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-300">CRM para Guatemala</span>
          </nav>
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-slate-800/60">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-orange-500/5 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold text-orange-400">
            <MapPin className="h-3.5 w-3.5" />
            {c.hero_badge}
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            {c.hero_headline.includes("Inteligencia Artificial") ? (
              <>
                {c.hero_headline.split("Inteligencia Artificial")[0]}
                <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                  Inteligencia Artificial
                </span>
                {c.hero_headline.split("Inteligencia Artificial")[1]}
              </>
            ) : c.hero_headline}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">{c.hero_subheadline}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            {c.trust_signals.map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-green-500" />{s}
              </span>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="h-12 bg-orange-500 px-8 text-base font-semibold text-white hover:bg-orange-600">
              <Link href={c.cta_primary_href}>
                {c.cta_primary_text} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-12 border border-slate-700 px-8 text-base text-slate-300 hover:bg-slate-800">
              <Link href={c.cta_secondary_href}>{c.cta_secondary_text}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Intro ── */}
      <section className="border-b border-slate-800/60 bg-slate-900/30">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-bold text-white leading-snug">{c.intro_headline}</h2>
              <p className="mt-4 text-slate-400 leading-relaxed">{c.intro_text}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { val: "$19", lbl: "Desde por mes", sub: "por organización" },
                { val: "14", lbl: "Días gratis", sub: "sin tarjeta" },
                { val: "24/7", lbl: "Agente de voz", sub: "siempre activo" },
                { val: "FEL", lbl: "Facturación", sub: "cumple con la SAT" },
              ].map(({ val, lbl, sub }) => (
                <div key={lbl} className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-center">
                  <div className="text-3xl font-extrabold text-orange-400">{val}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-200">{lbl}</div>
                  <div className="text-xs text-slate-500">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CRM Features ── */}
      <section className="border-b border-slate-800/60" id="crm-guatemala">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <div className="mb-3 text-sm font-semibold uppercase tracking-widest text-orange-400">{c.crm_badge}</div>
            <h2 className="text-3xl font-bold text-white leading-snug">{c.crm_headline}</h2>
            <p className="mt-4 text-slate-400">{c.crm_subheadline}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CRM_FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 hover:border-orange-500/30 transition-colors">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <Icon className="h-5 w-5 text-orange-400" />
                </div>
                <h3 className="mb-2 font-semibold text-slate-100">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WhatsApp ── */}
      <section className="border-b border-slate-800/60 bg-slate-900/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <div className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-400">CRM con WhatsApp Guatemala</div>
              <h2 className="text-3xl font-bold text-white leading-snug">{c.whatsapp_headline}</h2>
              <p className="mt-5 text-slate-400 leading-relaxed">{c.whatsapp_text}</p>
              <ul className="mt-6 space-y-3">
                {c.whatsapp_features.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />{item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                  <Link href="/caracteristicas">Ver todas las integraciones <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
            {/* WhatsApp inbox mock */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/15">
                  <MessageSquare className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">Inbox WhatsApp · CRM</div>
                  <div className="text-xs text-slate-500">3 conversaciones nuevas hoy</div>
                </div>
              </div>
              {[
                { name: "Carlos Morales", msg: "Hola, quisiera información sobre sus planes", time: "09:14", status: "nuevo" },
                { name: "Ana Salazar",    msg: "¿Cuándo me mandan la cotización?",             time: "10:32", status: "seguimiento" },
                { name: "Roberto Pérez", msg: "Muchas gracias, ya me llega la factura FEL",   time: "11:05", status: "cerrado" },
              ].map(({ name, msg, time, status }) => (
                <div key={name} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950 p-4 mt-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">
                    {name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-100 truncate">{name}</span>
                      <span className="text-xs text-slate-600 flex-shrink-0">{time}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400 truncate">{msg}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    status === "nuevo" ? "bg-blue-500/15 text-blue-400" :
                    status === "seguimiento" ? "bg-orange-500/15 text-orange-400" :
                    "bg-green-500/15 text-green-400"
                  }`}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Agente de Voz IA ── */}
      <section className="border-b border-slate-800/60" id="agente-de-voz-guatemala">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <div className="mb-3 text-sm font-semibold uppercase tracking-widest text-purple-400">{c.voz_badge}</div>
            <h2 className="text-3xl font-bold text-white leading-snug">{c.voz_headline}</h2>
            <p className="mt-4 text-slate-400">{c.voz_subheadline}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-14">
            {VOZ_FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center hover:border-purple-500/30 transition-colors">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <Icon className="h-5 w-5 text-purple-400" />
                </div>
                <h3 className="mb-2 font-semibold text-slate-100 text-sm">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
          {/* ROI */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8">
            <h3 className="text-center text-lg font-bold text-white mb-8">
              Recepcionista humana vs. Agente de Voz IA en Guatemala
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-slate-500" />
                  <span className="font-semibold text-slate-400">Recepcionista humana</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li className="flex items-center gap-2"><span className="text-red-500">✗</span> Q6,000–Q9,000/mes (salario + prestaciones)</li>
                  <li className="flex items-center gap-2"><span className="text-red-500">✗</span> Solo disponible en horario laboral</li>
                  <li className="flex items-center gap-2"><span className="text-red-500">✗</span> Llamadas perdidas fuera de horario</li>
                  <li className="flex items-center gap-2"><span className="text-red-500">✗</span> Vacaciones, permisos, rotación</li>
                  <li className="flex items-center gap-2"><span className="text-red-500">✗</span> No registra datos al CRM automáticamente</li>
                </ul>
              </div>
              <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Mic className="h-5 w-5 text-purple-400" />
                  <span className="font-semibold text-purple-300">Agente de Voz IA</span>
                  <span className="ml-auto rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400 font-semibold">Recomendado</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> <strong>Desde $49 USD/mes</strong> (~Q380)</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> 24 horas, 7 días, feriados incluidos</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Cero llamadas perdidas</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Sin vacaciones ni permisos</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Leads directo al CRM con resumen de la llamada</li>
                </ul>
              </div>
            </div>
            <div className="mt-8 text-center">
              <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700 text-white">
                <Link href="/voz-ia">Conocer el Agente de Voz IA <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEL ── */}
      <section className="border-b border-slate-800/60 bg-slate-900/30">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-10">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <FileText className="h-7 w-7 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{c.fel_headline}</h2>
              <p className="mt-3 text-slate-400 leading-relaxed max-w-3xl">{c.fel_text}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {c.fel_badges.map((badge) => (
                  <span key={badge} className="inline-flex items-center gap-1.5 rounded-full border border-blue-800/50 bg-blue-950/40 px-3 py-1 text-xs text-blue-300">
                    <Check className="h-3 w-3" /> {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Precios CTA ── */}
      <section className="border-b border-slate-800/60" id="precios-guatemala">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <div className="mb-3 text-sm font-semibold uppercase tracking-widest text-orange-400">Precios para Guatemala</div>
          <h2 className="text-3xl font-bold text-white">Planes accesibles para PYMEs guatemaltecas</h2>
          <p className="mt-4 text-slate-400 max-w-xl mx-auto">Precios por organización, no por usuario. Sin permanencia. Sin letra pequeña. FEL incluida.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-400">
            {[
              "Desde $19/mes por organización",
              "14 días gratis sin tarjeta",
              "FEL incluida en todos los planes",
              "Cancela cuando quieras",
            ].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />{item}
              </span>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="h-12 bg-orange-500 px-10 text-base font-bold text-white hover:bg-orange-600">
              <Link href="/precios">
                Ver planes y precios <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-12 border border-slate-700 px-8 text-base text-slate-300 hover:bg-slate-800">
              <Link href="/register">Empezar gratis — 14 días</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Sectores ── */}
      <section className="border-b border-slate-800/60 bg-slate-900/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-2xl font-bold text-white">¿Para qué tipo de empresas en Guatemala?</h2>
            <p className="mt-3 text-slate-400">OptimizaCRM se adapta a múltiples industrias del mercado guatemalteco.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SECTORS.map(({ icon: Icon, sector, desc }) => (
              <div key={sector} className="rounded-xl border border-slate-800 bg-slate-900 p-6 hover:border-slate-700 transition-colors">
                <Icon className="mb-3 h-6 w-6 text-orange-400" />
                <h3 className="mb-2 font-semibold text-slate-100 text-sm">{sector}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      {c.faqs.length > 0 && (
        <section className="border-b border-slate-800/60" id="preguntas-frecuentes">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <div className="mb-3 text-sm font-semibold uppercase tracking-widest text-orange-400">Preguntas frecuentes</div>
              <h2 className="text-3xl font-bold text-white">Resolvemos tus dudas sobre el CRM con IA en Guatemala</h2>
            </div>
            <div className="space-y-3">
              {c.faqs.map(({ q, a }) => (
                <FaqItem key={q} q={q} a={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Final ── */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold text-orange-400">
            <MapPin className="h-3.5 w-3.5" />
            Disponible en Guatemala ahora
          </div>
          <h2 className="text-4xl font-extrabold text-white leading-tight">{c.cta_final_headline}</h2>
          <p className="mt-4 text-lg text-slate-400">{c.cta_final_subheadline}</p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="h-12 bg-orange-500 px-10 text-base font-bold text-white hover:bg-orange-600">
              <Link href={c.cta_final_primary_href}>
                {c.cta_final_primary_text} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-12 border border-slate-700 px-8 text-base text-slate-300 hover:bg-slate-800">
              <Link href={c.cta_final_secondary_href}>{c.cta_final_secondary_text}</Link>
            </Button>
          </div>
          {c.cta_final_note && (
            <p className="mt-6 text-sm text-slate-600">{c.cta_final_note}</p>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
