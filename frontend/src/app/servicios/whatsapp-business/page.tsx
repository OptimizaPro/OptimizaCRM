"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, ArrowRight, Shield, Clock, MessageCircle,
  Phone, Key, Webhook, TestTube, FileText, Star, AlertCircle,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const INCLUDES = [
  {
    icon: Shield,
    title: "Creación y verificación de Meta Business Suite",
    desc: "Te guiamos en la creación de tu cuenta empresarial y el proceso de verificación oficial con Meta.",
  },
  {
    icon: Phone,
    title: "Registro del número de teléfono",
    desc: "Configuramos el número dedicado a WhatsApp Business. El número no puede tener WhatsApp personal activo.",
  },
  {
    icon: Key,
    title: "Obtención de credenciales permanentes",
    desc: "Phone Number ID y Access Token de larga duración. Sin tokens temporales de 24h que caducan.",
  },
  {
    icon: Webhook,
    title: "Configuración del webhook con el CRM",
    desc: "Conectamos Meta con tu cuenta de OptimizaCRM para recibir y enviar mensajes en tiempo real.",
  },
  {
    icon: TestTube,
    title: "Prueba completa de envío y recepción",
    desc: "Verificamos que la integración funciona correctamente antes de darlo por finalizado.",
  },
  {
    icon: FileText,
    title: "Documentación para tu equipo",
    desc: "Recibes un resumen del proceso y los datos de configuración para tu referencia futura.",
  },
];

const FAQS = [
  {
    q: "¿Qué necesito tener antes de contratar?",
    a: "Un número de teléfono que NO tenga WhatsApp instalado (puede ser un número nuevo o una línea fija). Si ya usas ese número con WhatsApp personal, habría que desvincularlo primero.",
  },
  {
    q: "¿Cuánto tarda el proceso?",
    a: "Entre 48 y 72 horas hábiles desde que recibes la confirmación de pago. La verificación de Meta puede tomar más tiempo si hay documentación pendiente — en ese caso te acompañamos hasta completarla.",
  },
  {
    q: "¿Qué pasa si Meta rechaza la verificación de mi empresa?",
    a: "Es poco frecuente si la documentación está en orden. Si ocurre, te indicamos exactamente qué se necesita y lo reintentamos sin coste adicional. Si finalmente no es posible completarlo, te devolvemos el importe íntegro.",
  },
  {
    q: "¿Necesito tener ya una cuenta en OptimizaCRM?",
    a: "Sí, la integración final se realiza sobre tu cuenta activa del CRM. Si aún no tienes una, puedes iniciar la prueba gratuita de 14 días antes de contratar este servicio.",
  },
  {
    q: "¿Incluye el número de teléfono?",
    a: "No. El número debe ser tuyo (puede ser una línea móvil nueva o un número fijo). Nosotros nos encargamos de registrarlo y configurarlo en Meta Business.",
  },
  {
    q: "¿Qué ocurre después de la configuración?",
    a: "Tu equipo podrá gestionar conversaciones de WhatsApp directamente desde la bandeja unificada del CRM. Si en el futuro necesitas cambiar algo, el proceso queda documentado.",
  },
];

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
        <span className={`mt-0.5 flex-shrink-0 text-green-400 transition-transform duration-200 ${open ? "rotate-45" : ""}`}>
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
      {open && <p className="mt-3 text-sm leading-relaxed text-slate-400">{a}</p>}
    </button>
  );
}

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#25D366]">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function WhatsAppSetupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const { useAuthStore } = await import("@/store/auth");
      const { tokens, organization } = useAuthStore.getState();

      if (!tokens?.access || !organization?.id) {
        window.location.href = `/login?redirect=/servicios/whatsapp-business`;
        return;
      }

      const res = await fetch(`${API_URL}/billing/addon-checkout/`, {
        method:  "POST",
        headers: {
          "Content-Type":    "application/json",
          "Authorization":   `Bearer ${tokens.access}`,
          "X-Organization-ID": organization.id,
        },
        body: JSON.stringify({ slug: "whatsapp-setup" }),
      });

      if (res.status === 401) {
        window.location.href = `/login?redirect=/servicios/whatsapp-business`;
        return;
      }

      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setError("No se pudo iniciar el pago. Inténtalo de nuevo o contáctanos.");
      }
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <PublicHeader />

      <main className="flex-1">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 pb-20 pt-24 sm:px-12 lg:px-20">
          <div className="pointer-events-none absolute left-0 top-0 h-[500px] w-[500px] -translate-x-1/3 -translate-y-1/4 rounded-full bg-green-600/8 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-[300px] w-[300px] translate-x-1/3 -translate-y-1/4 rounded-full bg-green-600/5 blur-3xl" />

          <div className="relative mx-auto max-w-4xl">
            <div className="flex flex-col items-center text-center lg:flex-row lg:items-start lg:text-left lg:gap-16">

              {/* Left — copy */}
              <div className="flex-1">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-green-800/50 bg-green-950/40 px-4 py-1.5 text-sm font-medium text-green-400">
                  <WhatsAppIcon />
                  Servicio de configuración profesional
                </div>

                <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                  WhatsApp Business API<br />
                  <span className="text-green-400">sin complicaciones</span>
                </h1>

                <p className="mt-6 text-lg leading-relaxed text-slate-400 max-w-xl mx-auto lg:mx-0">
                  La configuración de Meta Business Suite puede ser engorrosa — verificaciones, documentos, tokens, webhooks...
                  Nosotros lo hacemos por ti. Tu empresa lista en <strong className="text-slate-200">48–72 horas</strong>.
                </p>

                <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-4 text-sm text-slate-400">
                  {[
                    { icon: Shield,       text: "Garantía de devolución" },
                    { icon: Clock,        text: "48–72 h hábiles" },
                    { icon: MessageCircle, text: "Soporte durante el proceso" },
                  ].map(({ icon: Icon, text }) => (
                    <span key={text} className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4 text-green-500" /> {text}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right — price card */}
              <div className="mt-10 lg:mt-0 w-full max-w-sm flex-shrink-0">
                <div className="rounded-2xl border border-green-800/40 bg-slate-900 p-8 shadow-2xl shadow-green-900/10">
                  <p className="text-sm font-medium text-slate-400">Precio del servicio</p>
                  <div className="mt-2 flex items-end gap-1.5">
                    <span className="text-6xl font-black text-white">$199</span>
                    <span className="mb-2 text-sm text-slate-500">USD · pago único</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">+ impuestos según aplique</p>

                  <ul className="mt-6 space-y-2.5">
                    {[
                      "Setup completo de Meta Business Suite",
                      "Webhook conectado a tu CRM",
                      "Prueba funcional incluida",
                      "Documentación entregada",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="mt-7 w-full gap-2 bg-green-600 hover:bg-green-500 text-white font-bold text-base py-6 disabled:opacity-60"
                  >
                    {loading ? "Redirigiendo…" : <>Contratar ahora <ArrowRight className="h-4 w-4" /></>}
                  </Button>

                  {error && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-red-400">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {error}
                    </p>
                  )}

                  <p className="mt-4 text-center text-xs text-slate-500">
                    ¿Tienes dudas antes de contratar?{" "}
                    <Link href="/contacto" className="text-green-400 hover:text-green-300 font-medium">
                      Escríbenos →
                    </Link>
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Qué incluye ───────────────────────────────────────────────── */}
        <section className="bg-slate-900 px-6 py-20 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-black text-white sm:text-4xl">¿Qué incluye el servicio?</h2>
              <p className="mt-3 text-slate-400">Todo lo necesario para dejar WhatsApp Business funcionando desde el primer día.</p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {INCLUDES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-xl border border-slate-800 bg-slate-950 p-6">
                  <div className="mb-4 inline-flex rounded-lg bg-green-950/40 p-2.5 text-green-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-100">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Para quién es ─────────────────────────────────────────────── */}
        <section className="px-6 py-20 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-3xl font-black text-white sm:text-4xl">
                  ¿Para quién es<br />
                  <span className="text-green-400">este servicio?</span>
                </h2>
                <ul className="mt-8 space-y-4">
                  {[
                    "No tienes cuenta verificada en Meta Business Suite y no sabes por dónde empezar.",
                    "Intentaste configurarlo y te perdiste entre apps, permisos y tokens de Meta.",
                    "Prefieres que alguien lo haga bien desde el principio y dedicar tu tiempo al negocio.",
                    "Tu equipo de ventas necesita WhatsApp integrado en el CRM cuanto antes.",
                  ].map((text) => (
                    <li key={text} className="flex items-start gap-3 text-slate-300">
                      <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Guarantee card */}
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-950/50 text-green-400">
                    <Star className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-white text-lg">Garantía de resultado</h3>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Si al finalizar el servicio la integración de WhatsApp con tu CRM no está funcionando,
                  te <strong className="text-slate-200">devolvemos el importe íntegro</strong>.
                  Sin preguntas, sin burocracia.
                </p>
                <p className="mt-4 text-slate-400 leading-relaxed">
                  Si Meta requiere documentación adicional de tu empresa para la verificación,
                  te acompañamos en cada paso hasta completarlo, sin coste adicional.
                </p>
                <div className="mt-6 rounded-xl border border-green-800/30 bg-green-950/20 px-4 py-3">
                  <p className="text-sm text-green-300 font-medium">
                    ¿Ya tienes OptimizaCRM? Escríbenos por el chat y empezamos hoy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section className="bg-slate-900 px-6 py-20 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <h2 className="text-3xl font-black text-white sm:text-4xl">Preguntas frecuentes</h2>
              <p className="mt-3 text-slate-400">Todo lo que necesitas saber antes de contratar.</p>
            </div>
            <div className="mt-10 space-y-3">
              {FAQS.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA final ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-green-700 px-6 py-20 sm:px-12 lg:px-20">
          <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 translate-x-1/3 translate-y-1/3 rounded-full bg-black/10" />
          <div className="pointer-events-none absolute left-0 top-0 h-48 w-48 -translate-x-1/3 -translate-y-1/2 rounded-full bg-black/10" />
          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-black text-white sm:text-5xl">
              Tu equipo en WhatsApp<br />en menos de 72 horas
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-green-100">
              Pago único. Sin suscripción. Sin sorpresas.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                onClick={handleCheckout}
                disabled={loading}
                className="gap-2 bg-black/20 px-8 text-base font-bold text-white hover:bg-black/30 border border-white/20 disabled:opacity-60"
              >
                {loading ? "Redirigiendo…" : <>Contratar por $199 <ArrowRight className="h-4 w-4" /></>}
              </Button>
              <Link href="/contacto">
                <Button size="lg" variant="ghost" className="px-8 text-base font-bold text-white bg-slate-800 hover:bg-white hover:text-green-700">
                  Tengo una pregunta
                </Button>
              </Link>
            </div>  
            {error && (
              <p className="mt-4 text-sm text-green-200 opacity-80">{error}</p>
            )}
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
