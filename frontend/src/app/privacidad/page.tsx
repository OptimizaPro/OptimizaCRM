import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import {
  Database, Eye, Lock, Trash2, Download, Mail,
  Server, Cookie, UserCheck, Bell, ShieldCheck, Phone,
} from "lucide-react";

const LAST_UPDATED = "23 de junio de 2026";

export const metadata = {
  title: "Política de Privacidad | OptimizaCRM",
  description: "Cómo recopilamos, usamos y protegemos tus datos en OptimizaCRM.",
};

const RIGHTS = [
  { icon: Eye,      title: "Acceder",    desc: "Consulta qué datos tenemos sobre ti en cualquier momento." },
  { icon: UserCheck, title: "Rectificar", desc: "Corrige información incorrecta o incompleta." },
  { icon: Trash2,   title: "Eliminar",   desc: "Solicita la eliminación permanente de tu cuenta y datos." },
  { icon: Download, title: "Exportar",   desc: "Descarga todos tus datos en formato CSV o JSON." },
];

const THIRD_PARTIES = [
  { name: "Railway",   role: "Infraestructura y alojamiento",        icon: Server },
  { name: "Brevo",     role: "Email transaccional",                  icon: Mail },
  { name: "OpenAI",    role: "Funcionalidades de IA",                icon: Database },
  { name: "Anthropic", role: "Funcionalidades de IA (Claude)",       icon: Database },
];

const SECTIONS = [
  { id: "recopilamos",   label: "Información que recopilamos" },
  { id: "usamos",        label: "Cómo usamos tu información" },
  { id: "seguridad",     label: "Almacenamiento y seguridad" },
  { id: "retencion",     label: "Retención de datos" },
  { id: "terceros",      label: "Compartición con terceros" },
  { id: "cookies",       label: "Cookies" },
  { id: "derechos",      label: "Tus derechos" },
  { id: "menores",       label: "Menores de edad" },
  { id: "cambios",       label: "Cambios en esta política" },
  { id: "contacto",      label: "Contacto" },
];

export default function PrivacidadPage() {
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
                <Lock className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">Legal</p>
                <h1 className="mt-1 text-4xl font-black text-white sm:text-5xl">Política de Privacidad</h1>
                <p className="mt-3 text-slate-400">
                  Última actualización: <span className="text-slate-300">{LAST_UPDATED}</span>
                </p>
              </div>
            </div>

            {/* Key promise card */}
            <div className="mt-8 flex items-start gap-4 rounded-2xl border border-green-800/40 bg-green-950/20 p-5">
              <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
              <p className="text-sm leading-relaxed text-green-300">
                <strong>Compromiso simple:</strong> tus datos son tuyos. No los vendemos, no los usamos
                para publicidad de terceros y puedes eliminarlos cuando quieras.
                Esta política explica exactamente qué recopilamos y por qué.
              </p>
            </div>
          </div>
        </section>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <section className="px-6 py-16 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-6xl">
            <div className="flex gap-12">

              {/* Sticky sidebar nav */}
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
                    <Link href="/terminos" className="block rounded-lg px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-orange-400">
                      → Términos y Condiciones
                    </Link>
                  </div>
                </div>
              </aside>

              {/* Main content */}
              <div className="min-w-0 flex-1 space-y-12">

                {/* 1. Información que recopilamos */}
                <div id="recopilamos">
                  <SectionTitle number="01" title="Información que recopilamos" icon={Database} />
                  <p className="mt-4 leading-relaxed text-slate-400">
                    Recopilamos información cuando te registras, usas la plataforma o contactas con nosotros:
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "Datos de cuenta", desc: "Nombre, correo electrónico, empresa y contraseña cifrada." },
                      { label: "Datos de uso", desc: "Acciones dentro de la plataforma, páginas visitadas y funcionalidades utilizadas." },
                      { label: "Datos de negocio", desc: "Leads, oportunidades, clientes y comunicaciones que introduces en el CRM." },
                      { label: "Datos técnicos", desc: "Dirección IP, tipo de navegador, sistema operativo y zona horaria." },
                    ].map(({ label, desc }) => (
                      <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                        <p className="text-sm font-semibold text-slate-200">{label}</p>
                        <p className="mt-1 text-sm text-slate-400">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Cómo usamos */}
                <div id="usamos">
                  <SectionTitle number="02" title="Cómo usamos tu información" icon={Eye} />
                  <ul className="mt-4 space-y-3">
                    {[
                      "Proporcionar, mantener y mejorar los servicios de OptimizaCRM.",
                      "Gestionar tu cuenta y procesar pagos.",
                      "Enviarte comunicaciones de servicio y actualizaciones relevantes.",
                      "Detectar y prevenir fraudes o accesos no autorizados.",
                      "Cumplir con obligaciones legales aplicables.",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-slate-400">
                        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
                        <span className="text-sm leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 flex items-start gap-3 rounded-xl border border-orange-800/30 bg-orange-950/20 p-4">
                    <span className="mt-0.5 text-lg">🚫</span>
                    <p className="text-sm leading-relaxed text-orange-300">
                      <strong>No vendemos tus datos</strong> a terceros ni los utilizamos para publicidad de otras empresas, bajo ninguna circunstancia.
                    </p>
                  </div>
                </div>

                {/* 3. Seguridad */}
                <div id="seguridad">
                  <SectionTitle number="03" title="Almacenamiento y seguridad" icon={Lock} />
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {[
                      { emoji: "🔒", title: "Cifrado HTTPS/TLS", desc: "Todos los datos en tránsito viajan cifrados." },
                      { emoji: "🏗️", title: "Multi-tenant", desc: "Aislamiento completo entre organizaciones." },
                      { emoji: "⚡", title: "Notificación 72h", desc: "Te avisamos ante cualquier brecha de seguridad." },
                    ].map(({ emoji, title, desc }) => (
                      <div key={title} className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
                        <div className="text-2xl">{emoji}</div>
                        <p className="mt-2 text-sm font-semibold text-slate-200">{title}</p>
                        <p className="mt-1 text-xs text-slate-400">{desc}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-400">
                    El acceso interno está restringido al personal autorizado bajo política de mínimo privilegio.
                    Realizamos copias de seguridad periódicas de todos los datos.
                  </p>
                </div>

                {/* 4. Retención */}
                <div id="retencion">
                  <SectionTitle number="04" title="Retención de datos" icon={Trash2} />
                  <div className="mt-4 flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-orange-600 bg-orange-950 text-sm font-black text-orange-400">30</div>
                    <div>
                      <p className="font-semibold text-slate-200">30 días tras cancelación</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-400">
                        Conservamos tus datos mientras tu cuenta esté activa. Al cancelar, tus datos permanecen
                        disponibles 30 días para que puedas exportarlos. Transcurrido ese período se eliminan
                        de forma permanente, salvo que la ley exija conservación adicional.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5. Terceros */}
                <div id="terceros">
                  <SectionTitle number="05" title="Compartición con terceros" icon={Server} />
                  <p className="mt-4 text-sm leading-relaxed text-slate-400">
                    Solo compartimos datos con proveedores esenciales para operar el servicio.
                    Todos están sujetos a acuerdos de confidencialidad.
                  </p>
                  <div className="mt-5 overflow-hidden rounded-xl border border-slate-800">
                    {THIRD_PARTIES.map(({ name, role, icon: Icon }, i) => (
                      <div key={name} className={`flex items-center gap-4 px-5 py-3.5 ${i > 0 ? "border-t border-slate-800" : ""}`}>
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-slate-200">{name}</span>
                          <span className="ml-2 text-sm text-slate-400">— {role}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6. Cookies */}
                <div id="cookies">
                  <SectionTitle number="06" title="Cookies" icon={Cookie} />
                  <p className="mt-4 text-sm leading-relaxed text-slate-400">
                    Usamos <strong className="text-slate-300">únicamente cookies esenciales</strong> para
                    el funcionamiento de la sesión y la autenticación. No utilizamos cookies de rastreo
                    publicitario de terceros.
                  </p>
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <span className="text-lg">🍪</span>
                    <p className="text-sm text-slate-400">
                      Puedes configurar tu navegador para rechazar cookies, aunque algunas
                      funciones de la plataforma (como mantener la sesión iniciada) pueden verse afectadas.
                    </p>
                  </div>
                </div>

                {/* 7. Tus derechos */}
                <div id="derechos">
                  <SectionTitle number="07" title="Tus derechos" icon={UserCheck} />
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {RIGHTS.map(({ icon: Icon, title, desc }) => (
                      <div key={title} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-orange-950/60 text-orange-400">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{title}</p>
                          <p className="mt-0.5 text-sm text-slate-400">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
                    <Mail className="h-4 w-4 flex-shrink-0 text-orange-400" />
                    <p className="text-sm text-slate-400">
                      Ejerce tus derechos escribiendo a{" "}
                      <a href="mailto:privacidad@optimizacrm.com" className="font-medium text-orange-400 hover:text-orange-300">
                        privacidad@optimizacrm.com
                      </a>
                      {" "}— respondemos en máximo 30 días hábiles.
                    </p>
                  </div>
                </div>

                {/* 8 & 9 */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div id="menores" className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-500">08</p>
                    <h2 className="mt-1 text-lg font-bold text-white">Menores de edad</h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-400">
                      OptimizaCRM está dirigido a empresas y profesionales mayores de 18 años.
                      No recopilamos datos de menores. Si detectamos lo contrario, los eliminamos de inmediato.
                    </p>
                  </div>
                  <div id="cambios" className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-500">09</p>
                    <h2 className="mt-1 text-lg font-bold text-white">Cambios en esta política</h2>
                    <div className="mt-3 flex items-start gap-2">
                      <Bell className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
                      <p className="text-sm leading-relaxed text-slate-400">
                        Te notificaremos por email con <strong className="text-slate-300">al menos 15 días</strong> de
                        antelación ante cambios materiales.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 10. Contacto */}
                <div id="contacto" className="rounded-2xl border border-orange-800/30 bg-orange-950/10 p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-orange-500">10</p>
                  <h2 className="mt-1 text-lg font-bold text-white">Contacto</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">
                    Para cualquier consulta sobre privacidad escríbenos a{" "}
                    <a href="mailto:privacidad@optimizacrm.com" className="font-medium text-orange-400 hover:text-orange-300">
                      privacidad@optimizacrm.com
                    </a>{" "}
                    o visita nuestra{" "}
                    <Link href="/contacto" className="font-medium text-orange-400 hover:text-orange-300">
                      página de contacto
                    </Link>.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href="/terminos" className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-orange-600 hover:text-orange-400">
                      Términos y Condiciones →
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
