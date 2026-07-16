import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import {
  FileText, CreditCard, ShieldCheck, Ban, Database,
  Code2, Activity, XCircle, Scale, Phone, Bell, RefreshCw,
} from "lucide-react";

const LAST_UPDATED = "23 de junio de 2026";

export const metadata = {
  title: "Términos y Condiciones",
  description: "Términos y condiciones de uso de OptimizaCRM.",
  alternates: { canonical: "https://optimizacrm.com/terminos" },
};

const SECTIONS = [
  { id: "servicio",       label: "Descripción del servicio" },
  { id: "cuenta",         label: "Registro y cuenta" },
  { id: "pagos",          label: "Planes y pagos" },
  { id: "reembolso",      label: "Política de reembolso" },
  { id: "uso-aceptable",  label: "Uso aceptable" },
  { id: "datos",          label: "Propiedad de los datos" },
  { id: "ip",             label: "Propiedad intelectual" },
  { id: "sla",            label: "Disponibilidad y SLA" },
  { id: "responsabilidad", label: "Limitación de responsabilidad" },
  { id: "cancelacion",    label: "Cancelación" },
  { id: "modificaciones", label: "Modificaciones" },
  { id: "legislacion",    label: "Legislación aplicable" },
];

const PROHIBITED = [
  "Usar el servicio para actividades ilegales o fraudulentas.",
  "Enviar spam o comunicaciones no solicitadas a través de la plataforma.",
  "Intentar acceder a datos de otras organizaciones o vulnerar la seguridad.",
  "Realizar ingeniería inversa o copiar el software.",
  "Revender o sublicenciar el acceso sin autorización expresa.",
  "Sobrecargar la infraestructura (DDoS, scraping masivo, etc.).",
];

export default function TerminosPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <PublicHeader />

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-slate-900 px-6 pb-16 pt-20 sm:px-12 lg:px-20">
          <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 -translate-y-1/4 translate-x-1/3 rounded-full bg-orange-600/8 blur-3xl" />
          <div className="mx-auto max-w-4xl">
            <div className="flex items-start gap-5">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-950/60 text-orange-400">
                <FileText className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">Legal</p>
                <h1 className="mt-1 text-4xl font-black text-white sm:text-5xl">Términos y Condiciones</h1>
                <p className="mt-3 text-slate-400">
                  Última actualización: <span className="text-slate-300">{LAST_UPDATED}</span>
                </p>
              </div>
            </div>

            {/* Key cards */}
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { emoji: "✅", title: "Prueba gratis", desc: "14 días sin tarjeta de crédito." },
                { emoji: "🔓", title: "Sin permanencia", desc: "Cancela cuando quieras, sin penalización." },
                { emoji: "🇬🇹", title: "Ley guatemalteca", desc: "Jurisdicción: Ciudad de Guatemala." },
              ].map(({ emoji, title, desc }) => (
                <div key={title} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                  <span className="text-xl">{emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{title}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <section className="px-6 py-16 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-6xl">
            <div className="flex gap-12">

              {/* Sticky sidebar */}
              <aside className="hidden w-56 flex-shrink-0 lg:block">
                <div className="sticky top-24 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Contenido</p>
                  <nav className="space-y-1">
                    {SECTIONS.map((s) => (
                      <a
                        key={s.id}
                        href={`#${s.id}`}
                        className="block rounded-lg px-3 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-orange-400"
                      >
                        {s.label}
                      </a>
                    ))}
                  </nav>
                  <div className="mt-4 border-t border-slate-800 pt-4">
                    <Link href="/privacidad" className="block rounded-lg px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-orange-400">
                      → Política de Privacidad
                    </Link>
                  </div>
                </div>
              </aside>

              {/* Main content */}
              <div className="min-w-0 flex-1 space-y-12">

                {/* 1. Servicio */}
                <div id="servicio">
                  <SectionTitle number="01" title="Descripción del servicio" icon={Activity} />
                  <p className="mt-4 text-sm leading-relaxed text-slate-400">
                    OptimizaCRM es una plataforma SaaS de gestión de relaciones con clientes (CRM)
                    con inteligencia artificial, diseñada para equipos de ventas de PYMEs en LATAM.
                    El servicio incluye gestión de leads, pipeline de ventas, automatizaciones,
                    comunicaciones multicanal y funcionalidades de IA.
                  </p>
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <RefreshCw className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
                    <p className="text-sm text-slate-400">
                      Nos reservamos el derecho de modificar, suspender o discontinuar cualquier parte
                      del servicio con <strong className="text-slate-300">previo aviso de 30 días</strong>,
                      excepto en casos de emergencia de seguridad.
                    </p>
                  </div>
                </div>

                {/* 2. Cuenta */}
                <div id="cuenta">
                  <SectionTitle number="02" title="Registro y cuenta" icon={ShieldCheck} />
                  <div className="mt-4 grid gap-2">
                    {[
                      "Debes proporcionar información veraz y actualizada al registrarte.",
                      "Eres responsable de mantener la confidencialidad de tus credenciales.",
                      "Debes notificarnos de inmediato ante cualquier uso no autorizado de tu cuenta.",
                      "Una cuenta representa una organización. No puedes transferirla a terceros sin nuestro consentimiento.",
                      "Debes ser mayor de 18 años o tener autorización de tu empresa para aceptar estos términos.",
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-orange-950/60 text-[10px] font-bold text-orange-400">
                          {i + 1}
                        </span>
                        <p className="text-sm text-slate-400">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Pagos */}
                <div id="pagos">
                  <SectionTitle number="03" title="Planes y pagos" icon={CreditCard} />
                  <p className="mt-4 text-sm leading-relaxed text-slate-400">
                    Los precios vigentes se publican en{" "}
                    <Link href="/precios" className="text-orange-400 hover:text-orange-300">/precios</Link>.
                    Todos los planes de pago se facturan en USD por adelantado al inicio de cada período.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {[
                      { title: "Facturación anticipada", desc: "Se cobra al inicio de cada período mensual o anual." },
                      { title: "Renovación automática", desc: "Las suscripciones se renuevan salvo que canceles antes del fin del período." },
                      { title: "Impuestos locales", desc: "Los precios no incluyen IVA u otros impuestos aplicables en tu país." },
                    ].map(({ title, desc }) => (
                      <div key={title} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                        <p className="text-sm font-semibold text-slate-200">{title}</p>
                        <p className="mt-1 text-xs text-slate-400">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Reembolso */}
                <div id="reembolso">
                  <SectionTitle number="04" title="Política de reembolso" icon={RefreshCw} />
                  <p className="mt-4 text-sm leading-relaxed text-slate-400">
                    Ofrecemos 14 días de prueba gratuita sin tarjeta de crédito. Una vez iniciada
                    la suscripción de pago, no ofrecemos reembolsos por períodos ya facturados, salvo en estos casos:
                  </p>
                  <div className="mt-4 space-y-3">
                    {[
                      { emoji: "⚠️", text: "Fallo técnico imputable a OptimizaCRM que impida el uso por más de 48 horas consecutivas." },
                      { emoji: "💳", text: "Cobro duplicado por error en nuestra facturación." },
                    ].map(({ emoji, text }) => (
                      <div key={text} className="flex items-start gap-3 rounded-xl border border-green-900/40 bg-green-950/10 p-4">
                        <span className="text-lg">{emoji}</span>
                        <p className="text-sm leading-relaxed text-slate-400">{text}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-slate-400">
                    Solicitudes de reembolso a{" "}
                    <a href="mailto:soporte@optimizacrm.com" className="text-orange-400 hover:text-orange-300">
                      soporte@optimizacrm.com
                    </a>{" "}
                    dentro de los <strong className="text-slate-300">7 días</strong> siguientes al cargo.
                  </p>
                </div>

                {/* 5. Uso aceptable */}
                <div id="uso-aceptable">
                  <SectionTitle number="05" title="Uso aceptable" icon={Ban} />
                  <p className="mt-4 text-sm text-slate-400">Al usar OptimizaCRM te comprometes a no:</p>
                  <div className="mt-4 grid gap-2">
                    {PROHIBITED.map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-xl border border-red-900/20 bg-red-950/10 px-4 py-3">
                        <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                        <p className="text-sm text-slate-400">{item}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-800/30 bg-red-950/20 p-4">
                    <span className="text-lg">🚨</span>
                    <p className="text-sm text-slate-400">
                      El incumplimiento puede resultar en{" "}
                      <strong className="text-red-400">suspensión inmediata</strong> de la cuenta sin derecho a reembolso.
                    </p>
                  </div>
                </div>

                {/* 6. Propiedad datos */}
                <div id="datos">
                  <SectionTitle number="06" title="Propiedad de los datos" icon={Database} />
                  <div className="mt-4 flex items-start gap-4 rounded-xl border border-green-800/40 bg-green-950/15 p-5">
                    <span className="text-2xl">🔑</span>
                    <div>
                      <p className="font-semibold text-green-300">Tus datos son tuyos, siempre.</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">
                        OptimizaCRM no reivindica ningún derecho de propiedad sobre los datos que introduces
                        (leads, clientes, comunicaciones, etc.). Te concedemos una licencia limitada y revocable
                        para procesarlos únicamente con el fin de prestarte el servicio.
                        Puedes exportar tus datos en cualquier momento.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 7 & 8 */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div id="ip" className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <SectionTitle number="07" title="Propiedad intelectual" icon={Code2} />
                    <p className="mt-3 text-sm leading-relaxed text-slate-400">
                      El software, diseño, marca y logotipos de OptimizaCRM son propiedad de OptimizaPro.
                      Nada en estos términos te transfiere derechos de propiedad intelectual sobre el servicio.
                    </p>
                  </div>
                  <div id="sla" className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <SectionTitle number="08" title="Disponibilidad" icon={Activity} />
                    <div className="mt-3 flex items-center gap-3">
                      <div className="rounded-xl border border-green-800/40 bg-green-950/20 px-3 py-1.5">
                        <span className="text-lg font-black text-green-400">99.5%</span>
                      </div>
                      <p className="text-sm text-slate-400">disponibilidad mensual objetivo en planes de pago.</p>
                    </div>
                    <p className="mt-3 text-sm text-slate-400">
                      El mantenimiento programado se anuncia con 24h de antelación.
                      Los planes Enterprise incluyen SLA específico.
                    </p>
                  </div>
                </div>

                {/* 9. Responsabilidad */}
                <div id="responsabilidad">
                  <SectionTitle number="09" title="Limitación de responsabilidad" icon={Scale} />
                  <p className="mt-4 text-sm text-slate-400">OptimizaPro no será responsable de:</p>
                  <div className="mt-4 space-y-2">
                    {[
                      "Pérdidas de negocio o ingresos derivadas del uso o imposibilidad de uso del servicio.",
                      "Decisiones de negocio tomadas basándose en las funcionalidades de IA.",
                      "Daños indirectos, incidentales o consecuentes.",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-600" />
                        <p className="text-sm text-slate-400">{item}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
                    <Scale className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
                    <p className="text-sm text-slate-400">
                      La responsabilidad máxima no superará el importe pagado en los{" "}
                      <strong className="text-slate-300">3 meses anteriores</strong> al evento que origine la reclamación.
                    </p>
                  </div>
                </div>

                {/* 10. Cancelación */}
                <div id="cancelacion">
                  <SectionTitle number="10" title="Cancelación" icon={XCircle} />
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                      <p className="text-sm font-semibold text-slate-200">Tú cancelas</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">
                        Desde la configuración de tu cuenta en cualquier momento.
                        Efecto al final del período en curso.
                        Tus datos disponibles <strong className="text-slate-300">30 días</strong> para exportar.
                      </p>
                    </div>
                    <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-5">
                      <p className="text-sm font-semibold text-slate-200">Nosotros cancelamos</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">
                        Por incumplimiento de estos términos, con o sin previo aviso
                        según la gravedad del caso.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 11 & 12 */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div id="modificaciones" className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <SectionTitle number="11" title="Modificaciones" icon={Bell} />
                    <div className="mt-3 flex items-start gap-2">
                      <Bell className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
                      <p className="text-sm leading-relaxed text-slate-400">
                        Notificamos cambios materiales con{" "}
                        <strong className="text-slate-300">15 días de antelación</strong> por email.
                        Continuar usando el servicio implica aceptar los nuevos términos.
                      </p>
                    </div>
                  </div>
                  <div id="legislacion" className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <SectionTitle number="12" title="Legislación" icon={Scale} />
                    <div className="mt-3 flex items-center gap-3">
                      <span className="text-2xl">🇬🇹</span>
                      <p className="text-sm leading-relaxed text-slate-400">
                        Estos términos se rigen por las leyes de la República de Guatemala.
                        Jurisdicción: tribunales de la ciudad de Guatemala.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contacto */}
                <div className="rounded-2xl border border-orange-800/30 bg-orange-950/10 p-6">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-orange-400" />
                    <h2 className="text-lg font-bold text-white">¿Preguntas sobre estos términos?</h2>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">
                    Escríbenos a{" "}
                    <a href="mailto:legal@optimizacrm.com" className="font-medium text-orange-400 hover:text-orange-300">
                      legal@optimizacrm.com
                    </a>{" "}
                    o visita nuestra{" "}
                    <Link href="/contacto" className="font-medium text-orange-400 hover:text-orange-300">
                      página de contacto
                    </Link>.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href="/privacidad" className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-orange-600 hover:text-orange-400">
                      Política de Privacidad →
                    </Link>
                    <Link href="/" className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-orange-600 hover:text-orange-400">
                      Volver al inicio →
                    </Link>
                  </div>
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

function SectionTitle({ number, title, icon: Icon }: { number: string; title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-black text-orange-500/60">{number}</span>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-orange-400" />
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
    </div>
  );
}
