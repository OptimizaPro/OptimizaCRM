"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { cmsApi } from "@/lib/api";
import {
  Save, CheckCircle, AlertCircle, RefreshCw,
  FileText, DollarSign, Zap, Settings2,
  ExternalLink, Upload, X, ImageIcon,
  Users, Mail, Shield, ScrollText, Plus, GripVertical,
  MessageCircle, Rocket, Mic, Wrench,
} from "lucide-react";

// ─── Default content (mirrors backend apps/content/models.py DEFAULT_CONTENT) ──

const DEFAULT_CONTENT = {
  hero: {
    badge:            "Plataforma CRM con IA",
    headline:         "Cierra más negocios con Inteligencia Artificial",
    subheadline:      "Optimiza-CRM combina capacidades CRM empresariales con IA de vanguardia para ayudar a tu equipo de ventas a trabajar de forma más inteligente, cerrar más rápido y aumentar los ingresos.",
    cta_primary:      "Empieza Gratis",
    cta_primary_href: "/register",
    cta_secondary:    "Ver Características",
    cta_secondary_href: "/features",
    trust_signals:    ["Sin tarjeta de crédito", "Prueba gratuita 14 días", "Seguridad empresarial"],
    features_headline:    "Todo lo que necesitas para escalar tus ventas",
    features_subheadline: "Diseñado para equipos que exigen rendimiento, seguridad e inteligencia.",
    feature_cards: [
      { title: "Lead Scoring con IA",   description: "Puntúa y prioriza leads automáticamente con reglas inteligentes y modelos de IA." },
      { title: "Gestión de Pipeline",   description: "Tableros kanban visuales con etapas personalizables y arrastrar y soltar." },
      { title: "Previsión de Ingresos", description: "Predicciones de ingresos con IA y niveles de confianza." },
      { title: "SaaS multicliente",     description: "Multiusuarios empresarial con aislamiento completo de datos." },
      { title: "Automatización",        description: "Automatiza tareas repetitivas y céntrate en cerrar negocios." },
      { title: "Seguridad Empresarial", description: "Cumplimiento con leyes de protección de datos en LATAM (LGPD, Ley 25.326, Ley 1581) y estándares internacionales como el RGPD, con cifrado de extremo a extremo." },
    ],
    cta_section_headline: "¿Listo para transformar tus ventas?",
    cta_section_text:     "Únete a los equipos de ventas que ya usan Optimiza-CRM para cerrar más negocios.",
    cta_section_button:   "Comenzar Gratis",
  },
  pricing: {
    badge:                    "Sin permanencia · Cancela cuando quieras",
    headline:                 "Precios pensados para LATAM",
    headline_highlight:       "LATAM",
    headline_highlight_color: "orange",
    subheadline:              "Gestiona leads, automatiza seguimientos y cierra más negocios. Precio fijo por organización, con IA integrable y 14 días de prueba gratis.",
  },
  features_page: {
    headline:    "Funcionalidades potentes para equipos de ventas modernos",
    subheadline: "Todo lo que necesitas para gestionar leads, cerrar negocios y aumentar ingresos.",
    modules: [
      { title: "Gestión de Leads",         items: ["Captura de leads", "Lead scoring", "Nutrición de leads", "Segmentación"] },
      { title: "Gestión de Oportunidades", items: ["Etapas de pipeline", "Seguimiento de negocios", "Análisis de ganados/perdidos", "Previsión"] },
      { title: "Módulo IA",               items: ["Predicción de churn", "Previsión de ingresos", "Análisis de sentimiento", "Follow-up IA"] },
      { title: "Analítica e Informes",    items: ["Informes de ingresos", "Rendimiento del equipo", "Pipeline analytics", "Dashboards personalizados"] },
      { title: "Tareas y Calendario",     items: ["Gestión de tareas", "Sincronización de calendario", "Recordatorios", "Programador de reuniones"] },
      { title: "Comunicación",            items: ["Integración de email", "WhatsApp", "Bandeja de entrada unificada", "Plantillas de mensajes"] },
    ],
  },
  general: {
    site_name:     "Optimiza-CRM",
    tagline:       "El CRM con IA que cierra más negocios.",
    contact_email: "hola@optimizapro.com",
    support_email: "soporte@optimizapro.com",
    social_links: [
      { name: "Twitter / X", url: "" },
      { name: "LinkedIn",    url: "" },
    ],
  },

  nosotros: {
    badge:       "Nuestra historia",
    headline:    "Construido por alguien que vivió el problema",
    subheadline: "Más de 10 años gestionando negocios en LATAM nos enseñaron que las herramientas existentes son demasiado complejas, demasiado caras o simplemente no entienden nuestra realidad. OptimizaCRM nació para cambiar eso.",
    quote_text:   "Las PYMEs de LATAM merecen las mismas herramientas de ventas que las grandes empresas. Sin la complejidad ni los precios prohibitivos.",
    quote_author: "Nelson Alvarez",
    quote_role:   "Founder, OptimizaPro",
    mission_label:       "Nuestra misión",
    mission_headline:    "Democratizar el CRM para PYMEs latinoamericanas",
    mission_subheadline: "Creemos que cualquier empresa, sin importar su tamaño, merece tener acceso a herramientas de ventas inteligentes que realmente funcionen.",
    mission_stats: [
      { value: "40+",   label: "PYMEs investigadas" },
      { value: "2026",  label: "Año de lanzamiento" },
      { value: "LATAM", label: "Mercado objetivo" },
    ],
    values_label:    "Lo que nos guía",
    values_headline: "Nuestros valores",
    values: [
      { title: "Obsesión por el resultado", description: "No construimos funcionalidades por construirlas. Cada decisión de producto se mide por su impacto real en el negocio del cliente." },
      { title: "IA con propósito",          description: "La inteligencia artificial no es un adorno. La integramos donde realmente ahorra tiempo, reduce errores y aumenta ingresos." },
      { title: "Confianza ante todo",       description: "Los datos de tus clientes son el activo más valioso de tu empresa. Seguridad empresarial desde el primer día, sin excepciones." },
      { title: "Hecho para LATAM",          description: "Entendemos la realidad de las PYMEs latinoamericanas: equipos pequeños, recursos ajustados y necesidad de resultados rápidos." },
    ],
    founder_name: "Nelson Alvarez",
    founder_role: "Founder & Developer, OptimizaPro",
    founder_bio: [
      "Más de 8 años liderando equipos de ventas y operaciones en sectores como Real Estate, Hospitality y Retail en Guatemala y Centroamérica.",
      "Esa experiencia en el mundo real —con CRMs que no encajaban, procesos manuales y datos dispersos— fue el catalizador para construir OptimizaCRM.",
    ],
    founder_stack: ["Next.js 15", "Django 5", "PostgreSQL", "IA Generativa", "Railway", "Multi-tenant"],
    milestones: [
      { year: "2024", label: "Idea y validación",  detail: "Investigación de mercado con 40+ PYMEs en Guatemala y Centroamérica." },
      { year: "2025", label: "Desarrollo del MVP", detail: "Construcción del core: CRM, lead scoring con IA, pipeline y automatizaciones." },
      { year: "2026", label: "Lanzamiento",        detail: "Primeros clientes beta. Iteración rápida basada en feedback real del mercado." },
      { year: "→",    label: "Escala regional",    detail: "Expansión a México, Colombia y el resto de LATAM con verticales específicos." },
    ],
    cta_headline:       "¿Listo para transformar tus ventas?",
    cta_text:           "Únete a los primeros equipos que están cerrando más negocios con OptimizaCRM.",
    cta_primary:        "Empezar gratis",
    cta_primary_href:   "/register",
    cta_secondary:      "Ver características",
    cta_secondary_href: "/features",
  },

  contacto: {
    badge:       "Hablemos",
    headline:    "¿Tienes preguntas? Estamos aquí",
    subheadline: "Cuéntanos sobre tu negocio y te ayudamos a evaluar si OptimizaCRM es la herramienta que necesitas. Sin presión, sin ventas agresivas.",
    email:           "hola@optimizacrm.com",
    email_detail:    "Respuesta en menos de 24 h",
    whatsapp:        "+502 XXXX XXXX",
    whatsapp_href:   "https://wa.me/502XXXXXXXX",
    whatsapp_detail: "Lunes a viernes · 9h–18h",
    response_time:   "< 24 horas",
    form_headline: "Envíanos un mensaje",
    form_subtext:  "Te respondemos en menos de 24 horas hábiles.",
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
    demo_headline: "¿Prefieres ver el producto en acción?",
    demo_text:     "Agenda una demo personalizada de 30 minutos y te mostramos cómo OptimizaCRM puede adaptarse a tu equipo.",
    demo_cta_text: "Probar gratis 14 días",
    demo_cta_href: "/register",
  },

  privacidad: {
    headline:        "Política de Privacidad",
    last_updated:    "23 de junio de 2026",
    commitment_text: "Compromiso simple: tus datos son tuyos. No los vendemos, no los usamos para publicidad de terceros y puedes eliminarlos cuando quieras. Esta política explica exactamente qué recopilamos y por qué.",
    section_recopilamos: "Recopilamos la información que nos proporcionas al registrarte (nombre, email, empresa), los datos que introduces en la plataforma (leads, clientes, actividades) y datos de uso técnico (IP, navegador, páginas visitadas) para mejorar el servicio.",
    section_usamos:      "Usamos tu información exclusivamente para prestar el servicio, enviarte comunicaciones relacionadas con tu cuenta, mejorar la plataforma y cumplir con obligaciones legales. Nunca usamos tus datos para publicidad de terceros.",
    section_seguridad:   "Tus datos se almacenan en servidores seguros con cifrado en tránsito (HTTPS/TLS) y en reposo. Seguimos las mejores prácticas OWASP y realizamos auditorías de seguridad periódicas.",
    section_retencion:   "Conservamos tus datos mientras mantengas una cuenta activa. Al cancelar, tus datos permanecen disponibles para exportar durante 30 días, después de los cuales se eliminan permanentemente.",
    section_terceros:    "Compartimos datos únicamente con proveedores de infraestructura (Railway), email transaccional (Brevo) e IA (OpenAI, Anthropic) bajo contratos de procesamiento de datos. Nunca vendemos datos a terceros.",
    section_cookies:     "Usamos cookies estrictamente necesarias para la autenticación y funcionamiento del servicio. No usamos cookies de seguimiento ni publicidad.",
    section_derechos:    "Tienes derecho a acceder, rectificar, eliminar y exportar tus datos en cualquier momento desde la configuración de tu cuenta o contactándonos.",
    section_menores:     "OptimizaCRM no está dirigido a menores de 18 años. No recopilamos conscientemente datos de menores. Si detectamos un registro de menor de edad, eliminaremos la cuenta.",
    section_cambios:     "Te notificaremos por email con 15 días de antelación ante cambios materiales en esta política. El uso continuado del servicio tras la notificación implica aceptación.",
    legal_email: "legal@optimizacrm.com",
  },

  servicios_whatsapp: {
    hero: {
      badge: "Servicio de configuración profesional",
      headline: "WhatsApp Business API",
      headline_highlight: "sin complicaciones",
      subheadline: "La configuración de Meta Business Suite puede ser engorrosa — verificaciones, documentos, tokens, webhooks... Nosotros lo hacemos por ti. Tu empresa lista en **48–72 horas**.",
    },
    price_card: { price: 199 },
    includes: [],
    for_whom: {},
    faqs: [],
    cta: {},
  },
  servicios_implementacion: {
    hero: {
      badge: "Servicios de implementación",
      headline: "La diferencia entre instalar un CRM y",
      headline_highlight: "adoptarlo de verdad.",
    },
    tiers: [],
    steps: [],
    comparison: [],
    faqs: [],
    cta: {},
  },
  servicios_implementacion_voz: {
    hero: {
      badge: "Servicio de configuración profesional",
      headline: "Tu Agente de Voz IA",
      headline_highlight: "listo en 48 horas",
      subheadline: "Configuramos tu agente desde cero — base de conocimiento, flujos de calificación, voz personalizada e integración con tu CRM. Tú solo tienes que encenderlo.",
      cta_primary:        "Ver planes",
      cta_primary_href:   "#planes",
      cta_secondary:      "Hablar con el equipo",
      cta_secondary_href: "/contacto",
    },
    tiers: [],
    includes: [],
    trust_strip: [],
    faqs: [],
    cta: {
      headline:       "Tu agente de voz operativo esta misma semana.",
      subheadline:    "Configúralo hoy y empieza a capturar leads desde el primer día — sin que tu equipo intervenga.",
      primary_label:  "Contratar Setup Pro",
      primary_href:   "/contacto?servicio=voz-pro",
      secondary_label: "Tengo dudas, hablemos",
      secondary_href:  "/contacto",
    },
  },
  voz_ia: {
    hero_badge:          "Nuevo · Agente de Voz IA",
    hero_headline:       "Tu recepcionista con IA que nunca duerme",
    hero_subheadline:    "Atiende llamadas, califica leads y agenda citas en automático las 24 horas, los 7 días de la semana. Integrado directo a tu CRM.",
    cta_primary_text:    "Comenzar gratis",
    cta_primary_href:    "/register",
    cta_secondary_text:  "Ver planes",
    cta_secondary_href:  "/voz-ia#pricing",
    trial_note:          "14 días gratis · Sin tarjeta de crédito",
    pricing_badge:       "Sin permanencia · Cancela cuando quieras",
    pricing_headline:    "Planes de Agente de Voz IA",
    pricing_subheadline: "Agrega un agente de voz a tu CRM. Paga solo los minutos que usas. Escala cuando lo necesites.",
    annual_discount_pct: 20,
    roi_human_salary:    "$519/mes",
    roi_human_benefits:  "$200/mes",
    roi_human_vacation:  "$100/mes",
    roi_human_total:     "~$820/mes",
    roi_multiplier:      "16×",
  },

  terminos: {
    headline:     "Términos y Condiciones",
    last_updated: "23 de junio de 2026",
    key_cards: [
      { emoji: "✅", title: "Prueba gratis",     desc: "14 días sin tarjeta de crédito." },
      { emoji: "🔓", title: "Sin permanencia",   desc: "Cancela cuando quieras, sin penalización." },
      { emoji: "🇬🇹", title: "Ley guatemalteca", desc: "Jurisdicción: Ciudad de Guatemala." },
    ],
    section_servicio:  "OptimizaCRM es una plataforma SaaS de gestión de relaciones con clientes (CRM) con inteligencia artificial, diseñada para equipos de ventas de PYMEs en LATAM. El servicio incluye gestión de leads, pipeline de ventas, automatizaciones, comunicaciones multicanal y funcionalidades de IA.",
    section_cuenta: [
      "Debes proporcionar información veraz y actualizada al registrarte.",
      "Eres responsable de mantener la confidencialidad de tus credenciales.",
      "Debes notificarnos de inmediato ante cualquier uso no autorizado de tu cuenta.",
      "Una cuenta representa una organización. No puedes transferirla a terceros sin nuestro consentimiento.",
      "Debes ser mayor de 18 años o tener autorización de tu empresa para aceptar estos términos.",
    ],
    section_pagos:     "Los precios vigentes se publican en /precios. Todos los planes de pago se facturan en USD por adelantado al inicio de cada período.",
    section_reembolso: "Ofrecemos 14 días de prueba gratuita sin tarjeta de crédito. Una vez iniciada la suscripción de pago, no ofrecemos reembolsos por períodos ya facturados, salvo fallo técnico imputable a OptimizaCRM que impida el uso por más de 48 horas o cobro duplicado.",
    section_uso_prohibido: [
      "Usar el servicio para actividades ilegales o fraudulentas.",
      "Enviar spam o comunicaciones no solicitadas a través de la plataforma.",
      "Intentar acceder a datos de otras organizaciones o vulnerar la seguridad.",
      "Realizar ingeniería inversa o copiar el software.",
      "Revender o sublicenciar el acceso sin autorización expresa.",
      "Sobrecargar la infraestructura (DDoS, scraping masivo, etc.).",
    ],
    section_responsabilidad: [
      "Pérdidas de negocio o ingresos derivadas del uso o imposibilidad de uso del servicio.",
      "Decisiones de negocio tomadas basándose en las funcionalidades de IA.",
      "Daños indirectos, incidentales o consecuentes.",
    ],
    legal_email:   "legal@optimizacrm.com",
    support_email: "soporte@optimizacrm.com",
  },
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionKey =
  | "hero"
  | "pricing"
  | "features_page"
  | "nosotros"
  | "contacto"
  | "privacidad"
  | "terminos"
  | "general"
  | "servicios_whatsapp"
  | "servicios_implementacion"
  | "servicios_implementacion_voz"
  | "voz_ia";

interface SectionMeta {
  key: SectionKey;
  label: string;
  description: string;
  icon: React.ElementType;
}

const SECTIONS: SectionMeta[] = [
  {
    key: "hero",
    label: "Inicio",
    description: "Hero, CTAs y tarjetas de la página principal",
    icon: FileText,
  },
  {
    key: "pricing",
    label: "Precios",
    description: "Planes, precios y características",
    icon: DollarSign,
  },
  {
    key: "features_page",
    label: "Características",
    description: "Módulos y funciones de /features",
    icon: Zap,
  },
  {
    key: "nosotros",
    label: "Nosotros",
    description: "Misión, equipo y valores de /about",
    icon: Users,
  },
  {
    key: "contacto",
    label: "Contacto",
    description: "Datos de contacto y formulario de /contact",
    icon: Mail,
  },
  {
    key: "privacidad",
    label: "Privacidad",
    description: "Política de privacidad de /privacy",
    icon: Shield,
  },
  {
    key: "terminos",
    label: "Términos",
    description: "Términos y condiciones de /terms",
    icon: ScrollText,
  },
  {
    key: "general",
    label: "General",
    description: "Logo, datos del sitio y redes",
    icon: Settings2,
  },
  {
    key: "servicios_whatsapp",
    label: "Setup WhatsApp",
    description: "Landing /servicios/whatsapp-business",
    icon: MessageCircle,
  },
  {
    key: "servicios_implementacion",
    label: "Implementación CRM",
    description: "Landing /servicios/implementacion",
    icon: Rocket,
  },
  {
    key: "servicios_implementacion_voz",
    label: "Setup Agente de Voz IA",
    description: "Landing /servicios/voz-ia",
    icon: Wrench,
  },
  {
    key: "voz_ia",
    label: "Agente de Voz IA",
    description: "Landing /voz-ia — hero, precios y ROI",
    icon: Mic,
  },
];

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-300">{label}</label>
      {hint && <p className="mb-1.5 text-xs text-slate-400">{hint}</p>}
      {children}
    </div>
  );
}

// ─── Base input styles ────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 transition-colors focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20";
const textareaCls = `${inputCls} resize-none`;

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      className={inputCls}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function TextArea({ value, onChange, rows = 3, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <textarea
      className={textareaCls}
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function JsonArea({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const [raw, setRaw] = useState(JSON.stringify(value, null, 2));
  const [err, setErr] = useState(false);

  useEffect(() => {
    setRaw(JSON.stringify(value, null, 2));
  }, [value]);

  const handleChange = (text: string) => {
    setRaw(text);
    try {
      onChange(JSON.parse(text));
      setErr(false);
    } catch {
      setErr(true);
    }
  };

  return (
    <div>
      <textarea
        className={`${textareaCls} font-mono text-xs ${err ? "border-red-400 ring-2 ring-red-400/20" : ""}`}
        rows={14}
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
      />
      {err && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3" /> JSON inválido — corrige antes de guardar
        </p>
      )}
    </div>
  );
}

// ─── Logo Upload ──────────────────────────────────────────────────────────────

const MAX_SIZE_BYTES = 600 * 1024; // 600 KB

function LogoUpload({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const processFile = (file: File) => {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Solo se admiten archivos de imagen (PNG, SVG, WebP, JPG).");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(`El archivo supera el límite de 600 KB (${(file.size / 1024).toFixed(0)} KB).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="space-y-3">
      {/* Preview */}
      {value ? (
        <div className="relative inline-flex items-center gap-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Logo actual" className="h-14 max-w-[200px] object-contain" />
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-slate-300">Logo actual</p>
            <p className="text-xs text-slate-400">
              {value.startsWith("data:") ? `Base64 · ${(value.length * 0.75 / 1024).toFixed(0)} KB` : "URL externa"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChange("")}
              className="h-7 gap-1 text-xs text-red-400 hover:border-red-700 hover:bg-red-950/30"
            >
              <X className="h-3 w-3" /> Eliminar
            </Button>
          </div>
        </div>
      ) : null}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragging
            ? "border-orange-400 bg-orange-950/20"
            : "border-slate-700 bg-slate-900 hover:border-orange-700 hover:bg-orange-950/10"
        }`}
      >
        <div className={`rounded-xl p-3 ${dragging ? "bg-orange-900/40 text-orange-400" : "bg-slate-800 text-slate-400"}`}>
          <ImageIcon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-300">
            {dragging ? "Suelta para subir" : "Arrastra tu logo aquí"}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">o haz clic para seleccionar — PNG, SVG, WebP, JPG · máx. 600 KB</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 border-orange-800 text-orange-400 hover:bg-orange-950/30"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        >
          <Upload className="h-3.5 w-3.5" /> Seleccionar archivo
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={handleInput}
      />

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {error}
        </p>
      )}

      <p className="text-xs text-slate-400">
        El logo se almacena en formato base64 y se renderiza automáticamente en el header, footer y demás secciones de la web.
      </p>
    </div>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────

function Divider({ label }: { label: string }) {
  return (
    <div className="border-t border-slate-800 pt-5">
      <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-orange-500">{label}</p>
    </div>
  );
}

// ─── Section editors ─────────────────────────────────────────────────────────

function HeroEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const set = (key: string, val: unknown) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Badge" hint="Texto pequeño sobre el titular"><TextInput value={String(data.badge ?? "")} onChange={(v) => set("badge", v)} placeholder="Plataforma CRM · IA Nativa" /></Field>
        <Field label="CTA principal — texto"><TextInput value={String(data.cta_primary ?? "")} onChange={(v) => set("cta_primary", v)} placeholder="Comenzar gratis" /></Field>
      </div>
      <Field label="Titular principal (H1)">
        <TextInput value={String(data.headline ?? "")} onChange={(v) => set("headline", v)} placeholder="Cierra más ventas con Inteligencia Artificial" />
      </Field>
      <Field label="Subtítulo">
        <TextArea value={String(data.subheadline ?? "")} onChange={(v) => set("subheadline", v)} placeholder="Describe tu propuesta de valor…" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CTA principal — enlace"><TextInput value={String(data.cta_primary_href ?? "")} onChange={(v) => set("cta_primary_href", v)} placeholder="/register" /></Field>
        <Field label="CTA secundario — texto"><TextInput value={String(data.cta_secondary ?? "")} onChange={(v) => set("cta_secondary", v)} placeholder="Ver características" /></Field>
        <Field label="CTA secundario — enlace"><TextInput value={String(data.cta_secondary_href ?? "")} onChange={(v) => set("cta_secondary_href", v)} placeholder="/features" /></Field>
      </div>
      <Field label="Señales de confianza" hint='Array JSON — ej. ["Sin tarjeta de crédito", "14 días gratis"]'>
        <JsonArea value={data.trust_signals} onChange={(v) => set("trust_signals", v)} />
      </Field>

      <Divider label="Sección de características" />
      <Field label="Título de la sección"><TextInput value={String(data.features_headline ?? "")} onChange={(v) => set("features_headline", v)} /></Field>
      <Field label="Subtítulo de la sección"><TextArea value={String(data.features_subheadline ?? "")} onChange={(v) => set("features_subheadline", v)} /></Field>
      <Field label="Tarjetas de características" hint='Array JSON — objetos {title, description}'>
        <JsonArea value={data.feature_cards} onChange={(v) => set("feature_cards", v)} />
      </Field>

      <Divider label="Banner CTA inferior" />
      <Field label="Título"><TextInput value={String(data.cta_section_headline ?? "")} onChange={(v) => set("cta_section_headline", v)} /></Field>
      <Field label="Texto"><TextArea value={String(data.cta_section_text ?? "")} onChange={(v) => set("cta_section_text", v)} rows={2} /></Field>
      <Field label="Texto del botón"><TextInput value={String(data.cta_section_button ?? "")} onChange={(v) => set("cta_section_button", v)} /></Field>
    </div>
  );
}

const HIGHLIGHT_COLOR_OPTIONS = [
  { value: "orange", label: "Naranja (branding)", preview: "text-orange-500" },
  { value: "green",  label: "Verde",              preview: "text-green-400"  },
  { value: "white",  label: "Blanco",             preview: "text-white"      },
  { value: "none",   label: "Sin color (hereda)", preview: "text-slate-300"  },
];

function PricingEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const set = (key: string, val: unknown) => onChange({ ...data, [key]: val });
  const selectedColor = String(data.headline_highlight_color ?? "orange");
  const previewClass = HIGHLIGHT_COLOR_OPTIONS.find((o) => o.value === selectedColor)?.preview ?? "text-orange-500";
  return (
    <div className="space-y-5">
      <Field label="Badge" hint="Texto pequeño sobre el titular — ej. «Sin permanencia · Cancela cuando quieras»">
        <TextInput value={String(data.badge ?? "")} onChange={(v) => set("badge", v)} placeholder="Sin permanencia · Cancela cuando quieras" />
      </Field>
      <Field label="Título de la página" hint="Incluye la palabra o frase que quieres destacar en color">
        <TextInput value={String(data.headline ?? "")} onChange={(v) => set("headline", v)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Palabra destacada en el título" hint="Texto exacto dentro del titular que se coloreará">
          <TextInput
            value={String(data.headline_highlight ?? "")}
            onChange={(v) => set("headline_highlight", v)}
            placeholder="LATAM"
          />
        </Field>
        <Field label="Color del destaque">
          <select
            value={selectedColor}
            onChange={(e) => set("headline_highlight_color", e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-orange-500 focus:outline-none"
          >
            {HIGHLIGHT_COLOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {data.headline_highlight && (
            <p className="mt-1.5 text-xs text-slate-500">
              Vista previa:{" "}
              <span className={previewClass + " font-semibold"}>
                {String(data.headline_highlight)}
              </span>
            </p>
          )}
        </Field>
      </div>
      <Field label="Subtítulo">
        <TextArea value={String(data.subheadline ?? "")} onChange={(v) => set("subheadline", v)} />
      </Field>
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-xs text-slate-400">
        Los planes y precios se gestionan en <span className="font-medium text-slate-300">Configuración → Suscripción</span> y se cargan dinámicamente desde la API de billing. No se editan aquí.
      </div>
    </div>
  );
}

function FeaturesEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const set = (key: string, val: unknown) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-5">
      <Field label="Título de la página"><TextInput value={String(data.headline ?? "")} onChange={(v) => set("headline", v)} /></Field>
      <Field label="Subtítulo"><TextArea value={String(data.subheadline ?? "")} onChange={(v) => set("subheadline", v)} /></Field>
      <Field label="Módulos" hint='Array JSON. Cada módulo: {title, icon, items[]}'>
        <JsonArea value={data.modules} onChange={(v) => set("modules", v)} />
      </Field>
    </div>
  );
}

function NosotrosEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const set = (key: string, val: unknown) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Badge"><TextInput value={String(data.badge ?? "")} onChange={(v) => set("badge", v)} placeholder="Nuestra historia" /></Field>
        <Field label="Titular (H1)"><TextInput value={String(data.headline ?? "")} onChange={(v) => set("headline", v)} /></Field>
      </div>
      <Field label="Subtítulo">
        <TextArea value={String(data.subheadline ?? "")} onChange={(v) => set("subheadline", v)} rows={3} />
      </Field>

      <Divider label="Cita destacada" />
      <Field label="Texto de la cita">
        <TextArea value={String(data.quote_text ?? "")} onChange={(v) => set("quote_text", v)} rows={3} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Autor de la cita"><TextInput value={String(data.quote_author ?? "")} onChange={(v) => set("quote_author", v)} placeholder="Nelson Alvarez" /></Field>
        <Field label="Rol del autor"><TextInput value={String(data.quote_role ?? "")} onChange={(v) => set("quote_role", v)} placeholder="Founder, OptimizaPro" /></Field>
      </div>

      <Divider label="Sección de misión" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Etiqueta"><TextInput value={String(data.mission_label ?? "")} onChange={(v) => set("mission_label", v)} placeholder="Nuestra misión" /></Field>
        <Field label="Titular"><TextInput value={String(data.mission_headline ?? "")} onChange={(v) => set("mission_headline", v)} /></Field>
      </div>
      <Field label="Subtítulo de misión">
        <TextArea value={String(data.mission_subheadline ?? "")} onChange={(v) => set("mission_subheadline", v)} rows={2} />
      </Field>
      <Field label="Stats de misión" hint='Array JSON — ej. [{value: "40+", label: "PYMEs investigadas"}]'>
        <JsonArea value={data.mission_stats ?? []} onChange={(v) => set("mission_stats", v)} />
      </Field>

      <Divider label="Sección de valores" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Etiqueta"><TextInput value={String(data.values_label ?? "")} onChange={(v) => set("values_label", v)} placeholder="Lo que nos guía" /></Field>
        <Field label="Titular"><TextInput value={String(data.values_headline ?? "")} onChange={(v) => set("values_headline", v)} placeholder="Nuestros valores" /></Field>
      </div>
      <Field label="Valores" hint='Array JSON — ej. [{title: "Transparencia", description: "..."}]'>
        <JsonArea value={data.values ?? []} onChange={(v) => set("values", v)} />
      </Field>

      <Divider label="Fundador" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre"><TextInput value={String(data.founder_name ?? "")} onChange={(v) => set("founder_name", v)} placeholder="Nelson Alvarez" /></Field>
        <Field label="Rol"><TextInput value={String(data.founder_role ?? "")} onChange={(v) => set("founder_role", v)} placeholder="Founder & Developer, OptimizaPro" /></Field>
      </div>
      <Field label="Bio del fundador" hint='Array JSON de párrafos — ej. ["Párrafo 1…", "Párrafo 2…"]'>
        <JsonArea value={data.founder_bio ?? []} onChange={(v) => set("founder_bio", v)} />
      </Field>
      <Field label="Stack tecnológico" hint='Array JSON de strings — ej. ["Next.js 15", "Django 5"]'>
        <JsonArea value={data.founder_stack ?? []} onChange={(v) => set("founder_stack", v)} />
      </Field>

      <Divider label="Hitos / Timeline" />
      <Field label="Hitos" hint='Array JSON — ej. [{year: "2024", label: "Idea", detail: "..."}]'>
        <JsonArea value={data.milestones ?? []} onChange={(v) => set("milestones", v)} />
      </Field>

      <Divider label="Banner CTA" />
      <Field label="Titular CTA"><TextInput value={String(data.cta_headline ?? "")} onChange={(v) => set("cta_headline", v)} /></Field>
      <Field label="Texto CTA"><TextArea value={String(data.cta_text ?? "")} onChange={(v) => set("cta_text", v)} rows={2} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Botón primario — texto"><TextInput value={String(data.cta_primary ?? "")} onChange={(v) => set("cta_primary", v)} /></Field>
        <Field label="Botón primario — enlace"><TextInput value={String(data.cta_primary_href ?? "")} onChange={(v) => set("cta_primary_href", v)} /></Field>
        <Field label="Botón secundario — texto"><TextInput value={String(data.cta_secondary ?? "")} onChange={(v) => set("cta_secondary", v)} /></Field>
        <Field label="Botón secundario — enlace"><TextInput value={String(data.cta_secondary_href ?? "")} onChange={(v) => set("cta_secondary_href", v)} /></Field>
      </div>
    </div>
  );
}

function ContactoEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const set = (key: string, val: unknown) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Badge"><TextInput value={String(data.badge ?? "")} onChange={(v) => set("badge", v)} placeholder="Hablemos" /></Field>
        <Field label="Titular (H1)"><TextInput value={String(data.headline ?? "")} onChange={(v) => set("headline", v)} placeholder="¿Tienes preguntas? Estamos aquí" /></Field>
      </div>
      <Field label="Subtítulo">
        <TextArea value={String(data.subheadline ?? "")} onChange={(v) => set("subheadline", v)} rows={2} placeholder="Cuéntanos sobre tu negocio…" />
      </Field>

      <Divider label="Datos de contacto" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email"><TextInput value={String(data.email ?? "")} onChange={(v) => set("email", v)} placeholder="hola@optimizacrm.com" /></Field>
        <Field label="Detalle del email" hint="Ej. «Respuesta en menos de 24 h»"><TextInput value={String(data.email_detail ?? "")} onChange={(v) => set("email_detail", v)} /></Field>
        <Field label="WhatsApp (número visible)"><TextInput value={String(data.whatsapp ?? "")} onChange={(v) => set("whatsapp", v)} placeholder="+502 XXXX XXXX" /></Field>
        <Field label="WhatsApp (enlace wa.me)"><TextInput value={String(data.whatsapp_href ?? "")} onChange={(v) => set("whatsapp_href", v)} placeholder="https://wa.me/502XXXXXXXX" /></Field>
        <Field label="Horario WhatsApp"><TextInput value={String(data.whatsapp_detail ?? "")} onChange={(v) => set("whatsapp_detail", v)} placeholder="Lunes a viernes · 9h–18h" /></Field>
        <Field label="Tiempo de respuesta"><TextInput value={String(data.response_time ?? "")} onChange={(v) => set("response_time", v)} placeholder="&lt; 24 horas" /></Field>
      </div>

      <Divider label="Formulario de contacto" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titular del formulario"><TextInput value={String(data.form_headline ?? "")} onChange={(v) => set("form_headline", v)} placeholder="Envíanos un mensaje" /></Field>
        <Field label="Texto de apoyo"><TextInput value={String(data.form_subtext ?? "")} onChange={(v) => set("form_subtext", v)} placeholder="Te respondemos en menos de 24 horas hábiles." /></Field>
      </div>
      <Field label="Razones de contacto (selector)" hint='Array JSON de strings — ej. ["Quiero probar OptimizaCRM", "Tengo dudas sobre precios"]'>
        <JsonArea value={data.contact_reasons ?? []} onChange={(v) => set("contact_reasons", v)} />
      </Field>

      <Divider label="Preguntas frecuentes (FAQ)" />
      <Field label="Titular FAQ"><TextInput value={String(data.faq_headline ?? "")} onChange={(v) => set("faq_headline", v)} placeholder="Preguntas frecuentes" /></Field>
      <Field label="FAQs" hint='Array JSON — ej. [{q: "¿Cuánto tarda?", a: "Menos de 5 minutos."}]'>
        <JsonArea value={data.faqs ?? []} onChange={(v) => set("faqs", v)} />
      </Field>

      <Divider label="Banner de demo" />
      <Field label="Titular"><TextInput value={String(data.demo_headline ?? "")} onChange={(v) => set("demo_headline", v)} /></Field>
      <Field label="Texto"><TextArea value={String(data.demo_text ?? "")} onChange={(v) => set("demo_text", v)} rows={2} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Texto del botón"><TextInput value={String(data.demo_cta_text ?? "")} onChange={(v) => set("demo_cta_text", v)} placeholder="Probar gratis 14 días" /></Field>
        <Field label="Enlace del botón"><TextInput value={String(data.demo_cta_href ?? "")} onChange={(v) => set("demo_cta_href", v)} placeholder="/register" /></Field>
      </div>
    </div>
  );
}

function PrivacidadEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const set = (key: string, val: unknown) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titular">
          <TextInput value={String(data.headline ?? "")} onChange={(v) => set("headline", v)} placeholder="Política de Privacidad" />
        </Field>
        <Field label="Última actualización" hint="Formato libre — ej. 23 de junio de 2026">
          <TextInput value={String(data.last_updated ?? "")} onChange={(v) => set("last_updated", v)} placeholder="23 de junio de 2026" />
        </Field>
      </div>
      <Field label="Texto de compromiso" hint="Párrafo introductorio que aparece destacado al inicio del documento">
        <TextArea value={String(data.commitment_text ?? "")} onChange={(v) => set("commitment_text", v)} rows={3} />
      </Field>

      <Divider label="Secciones del documento" />
      <Field label="¿Qué información recopilamos?">
        <TextArea value={String(data.section_recopilamos ?? "")} onChange={(v) => set("section_recopilamos", v)} rows={3} />
      </Field>
      <Field label="¿Cómo usamos tu información?">
        <TextArea value={String(data.section_usamos ?? "")} onChange={(v) => set("section_usamos", v)} rows={3} />
      </Field>
      <Field label="Almacenamiento y seguridad">
        <TextArea value={String(data.section_seguridad ?? "")} onChange={(v) => set("section_seguridad", v)} rows={3} />
      </Field>
      <Field label="Retención de datos">
        <TextArea value={String(data.section_retencion ?? "")} onChange={(v) => set("section_retencion", v)} rows={3} />
      </Field>
      <Field label="Compartición con terceros">
        <TextArea value={String(data.section_terceros ?? "")} onChange={(v) => set("section_terceros", v)} rows={3} />
      </Field>
      <Field label="Cookies">
        <TextArea value={String(data.section_cookies ?? "")} onChange={(v) => set("section_cookies", v)} rows={2} />
      </Field>
      <Field label="Tus derechos">
        <TextArea value={String(data.section_derechos ?? "")} onChange={(v) => set("section_derechos", v)} rows={3} />
      </Field>
      <Field label="Menores de edad">
        <TextArea value={String(data.section_menores ?? "")} onChange={(v) => set("section_menores", v)} rows={2} />
      </Field>
      <Field label="Cambios en esta política">
        <TextArea value={String(data.section_cambios ?? "")} onChange={(v) => set("section_cambios", v)} rows={2} />
      </Field>

      <Divider label="Contacto legal" />
      <Field label="Email legal">
        <TextInput value={String(data.legal_email ?? "")} onChange={(v) => set("legal_email", v)} placeholder="legal@optimizacrm.com" />
      </Field>
    </div>
  );
}

function TerminosEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const set = (key: string, val: unknown) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titular">
          <TextInput value={String(data.headline ?? "")} onChange={(v) => set("headline", v)} placeholder="Términos y Condiciones" />
        </Field>
        <Field label="Última actualización" hint="Formato libre — ej. 23 de junio de 2026">
          <TextInput value={String(data.last_updated ?? "")} onChange={(v) => set("last_updated", v)} placeholder="23 de junio de 2026" />
        </Field>
      </div>
      <Field label="Tarjetas de resumen" hint='Array JSON — ej. [{emoji: "✅", title: "Prueba gratis", desc: "14 días sin tarjeta."}]'>
        <JsonArea value={data.key_cards ?? []} onChange={(v) => set("key_cards", v)} />
      </Field>

      <Divider label="Secciones del documento" />
      <Field label="Descripción del servicio">
        <TextArea value={String(data.section_servicio ?? "")} onChange={(v) => set("section_servicio", v)} rows={3} />
      </Field>
      <Field label="Registro y cuenta" hint='Array JSON de obligaciones — ej. ["Debes proporcionar información veraz…"]'>
        <JsonArea value={data.section_cuenta ?? []} onChange={(v) => set("section_cuenta", v)} />
      </Field>
      <Field label="Planes y pagos">
        <TextArea value={String(data.section_pagos ?? "")} onChange={(v) => set("section_pagos", v)} rows={2} />
      </Field>
      <Field label="Política de reembolso">
        <TextArea value={String(data.section_reembolso ?? "")} onChange={(v) => set("section_reembolso", v)} rows={3} />
      </Field>
      <Field label="Uso prohibido" hint='Array JSON de prohibiciones — ej. ["Usar el servicio para actividades ilegales."]'>
        <JsonArea value={data.section_uso_prohibido ?? []} onChange={(v) => set("section_uso_prohibido", v)} />
      </Field>
      <Field label="Limitación de responsabilidad" hint='Array JSON de exclusiones de responsabilidad'>
        <JsonArea value={data.section_responsabilidad ?? []} onChange={(v) => set("section_responsabilidad", v)} />
      </Field>

      <Divider label="Contacto legal" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email legal">
          <TextInput value={String(data.legal_email ?? "")} onChange={(v) => set("legal_email", v)} placeholder="legal@optimizacrm.com" />
        </Field>
        <Field label="Email de soporte">
          <TextInput value={String(data.support_email ?? "")} onChange={(v) => set("support_email", v)} placeholder="soporte@optimizacrm.com" />
        </Field>
      </div>
    </div>
  );
}

// ─── Social links editor ──────────────────────────────────────────────────────

interface SocialLink { name: string; url: string }

const SOCIAL_SUGGESTIONS = [
  "Facebook", "Instagram", "YouTube", "TikTok", "Twitter / X",
  "LinkedIn", "WhatsApp", "Telegram", "Pinterest", "Threads",
];

function SocialLinksEditor({
  value,
  onChange,
}: {
  value: SocialLink[];
  onChange: (v: SocialLink[]) => void;
}) {
  const updateRow = (i: number, field: keyof SocialLink, val: string) => {
    const next = value.map((row, idx) => (idx === i ? { ...row, [field]: val } : row));
    onChange(next);
  };

  const removeRow = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const addRow = () => onChange([...value, { name: "", url: "" }]);

  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          {/* Drag handle (visual only) */}
          <GripVertical className="h-4 w-4 flex-shrink-0 text-slate-600" />

          {/* Network name — with datalist suggestions */}
          <div className="w-44 flex-shrink-0">
            <input
              list={`social-suggestions-${i}`}
              className={inputCls}
              value={row.name}
              placeholder="Red social"
              onChange={(e) => updateRow(i, "name", e.target.value)}
            />
            <datalist id={`social-suggestions-${i}`}>
              {SOCIAL_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          {/* URL */}
          <input
            className={`${inputCls} flex-1`}
            value={row.url}
            placeholder="https://..."
            type="url"
            onChange={(e) => updateRow(i, "url", e.target.value)}
          />

          {/* Remove */}
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-500 transition-colors hover:border-red-700 hover:bg-red-950/30 hover:text-red-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-2 rounded-xl border border-dashed border-slate-700 px-4 py-2.5 text-sm text-slate-400 transition-colors hover:border-orange-700 hover:bg-orange-950/10 hover:text-orange-400"
      >
        <Plus className="h-4 w-4" /> Añadir red social
      </button>

      <p className="text-xs text-slate-500">
        Escribe el nombre o selecciónalo de la lista. El enlace debe ser la URL completa del perfil.
      </p>
    </div>
  );
}

function GeneralEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const set = (key: string, val: unknown) => onChange({ ...data, [key]: val });

  const socialLinks: SocialLink[] = Array.isArray(data.social_links)
    ? (data.social_links as SocialLink[])
    : [];

  return (
    <div className="space-y-6">
      {/* Logo upload — first and prominent */}
      <Field
        label="Logo del sitio"
        hint="Se mostrará en el header, footer y demás secciones públicas"
      >
        <LogoUpload
          value={String(data.logo_url ?? "")}
          onChange={(v) => set("logo_url", v)}
        />
      </Field>

      <Divider label="Información del sitio" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del sitio"><TextInput value={String(data.site_name ?? "")} onChange={(v) => set("site_name", v)} placeholder="OptimizaCRM" /></Field>
        <Field label="Tagline"><TextInput value={String(data.tagline ?? "")} onChange={(v) => set("tagline", v)} placeholder="CRM con IA para equipos de ventas" /></Field>
        <Field label="Email de contacto"><TextInput value={String(data.contact_email ?? "")} onChange={(v) => set("contact_email", v)} placeholder="hola@optimizacrm.com" /></Field>
        <Field label="Email de soporte"><TextInput value={String(data.support_email ?? "")} onChange={(v) => set("support_email", v)} placeholder="soporte@optimizacrm.com" /></Field>
      </div>

      <Divider label="Redes sociales" />
      <SocialLinksEditor
        value={socialLinks}
        onChange={(v) => set("social_links", v)}
      />
    </div>
  );
}

function ServiciosWhatsappEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const hero    = (data.hero    as Record<string, unknown>) ?? {};
  const pc      = (data.price_card as Record<string, unknown>) ?? {};
  const forWhom = (data.for_whom as Record<string, unknown>) ?? {};
  const cta     = (data.cta     as Record<string, unknown>) ?? {};

  const setHero    = (k: string, v: unknown) => onChange({ ...data, hero:       { ...hero,    [k]: v } });
  const setPc      = (k: string, v: unknown) => onChange({ ...data, price_card: { ...pc,      [k]: v } });
  const setForWhom = (k: string, v: unknown) => onChange({ ...data, for_whom:   { ...forWhom, [k]: v } });
  const setCta     = (k: string, v: unknown) => onChange({ ...data, cta:        { ...cta,     [k]: v } });

  return (
    <div className="space-y-5">
      <Divider label="Hero" />
      <Field label="Badge"><TextInput value={String(hero.badge ?? "")} onChange={(v) => setHero("badge", v)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titular H1"><TextInput value={String(hero.headline ?? "")} onChange={(v) => setHero("headline", v)} /></Field>
        <Field label="Titular — parte verde (highlight)"><TextInput value={String(hero.headline_highlight ?? "")} onChange={(v) => setHero("headline_highlight", v)} /></Field>
      </div>
      <Field label="Subtítulo" hint="Usa **texto** para negritas"><TextArea value={String(hero.subheadline ?? "")} onChange={(v) => setHero("subheadline", v)} /></Field>
      <Field label="Señales de confianza (trust strip)" hint='Array JSON — [{icon, text}]'>
        <JsonArea value={(hero.trust_strip ?? [])} onChange={(v) => setHero("trust_strip", v)} />
      </Field>

      <Divider label="Tarjeta de precio" />
      <Field label="Precio (USD)" hint="Solo el número — ej. 199">
        <TextInput value={String(pc.price ?? "")} onChange={(v) => setPc("price", Number(v) || v)} placeholder="199" />
      </Field>
      <Field label="Etiqueta del precio"><TextInput value={String(pc.label ?? "")} onChange={(v) => setPc("label", v)} placeholder="Precio del servicio" /></Field>
      <Field label="Ítems incluidos en la tarjeta" hint='Array JSON de strings — ej. ["Setup completo de Meta Business Suite"]'>
        <JsonArea value={(pc.bullets ?? [])} onChange={(v) => setPc("bullets", v)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Texto del botón de compra"><TextInput value={String(pc.cta_label ?? "")} onChange={(v) => setPc("cta_label", v)} placeholder="Contratar ahora" /></Field>
        <Field label="Texto cargando"><TextInput value={String(pc.cta_loading ?? "")} onChange={(v) => setPc("cta_loading", v)} placeholder="Redirigiendo…" /></Field>
      </div>

      <Divider label="Qué incluye" />
      <Field label="Servicios incluidos" hint='Array JSON — [{icon, title, desc}] — iconos: Shield, Phone, Key, Webhook, TestTube, FileText'>
        <JsonArea value={(data.includes ?? [])} onChange={(v) => onChange({ ...data, includes: v })} />
      </Field>

      <Divider label="Para quién es" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titular"><TextInput value={String(forWhom.headline ?? "")} onChange={(v) => setForWhom("headline", v)} /></Field>
        <Field label="Titular — highlight verde"><TextInput value={String(forWhom.headline_highlight ?? "")} onChange={(v) => setForWhom("headline_highlight", v)} /></Field>
      </div>
      <Field label="Lista de destinatarios" hint='Array JSON de strings'>
        <JsonArea value={(forWhom.items ?? [])} onChange={(v) => setForWhom("items", v)} />
      </Field>
      <Field label="Título de la garantía"><TextInput value={String(forWhom.guarantee_title ?? "")} onChange={(v) => setForWhom("guarantee_title", v)} /></Field>
      <Field label="Texto de garantía"><TextArea value={String(forWhom.guarantee_text ?? "")} onChange={(v) => setForWhom("guarantee_text", v)} rows={3} /></Field>
      <Field label="Nota destacada (recuadro verde)"><TextInput value={String(forWhom.guarantee_note ?? "")} onChange={(v) => setForWhom("guarantee_note", v)} /></Field>

      <Divider label="Preguntas frecuentes" />
      <Field label="FAQs" hint='Array JSON — [{q, a}]'>
        <JsonArea value={(data.faqs ?? [])} onChange={(v) => onChange({ ...data, faqs: v })} />
      </Field>

      <Divider label="Banner CTA final" />
      <Field label="Titular" hint="Usa \n para salto de línea"><TextArea value={String(cta.headline ?? "")} onChange={(v) => setCta("headline", v)} rows={2} /></Field>
      <Field label="Subtítulo"><TextInput value={String(cta.subheadline ?? "")} onChange={(v) => setCta("subheadline", v)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Botón secundario — texto"><TextInput value={String(cta.secondary_label ?? "")} onChange={(v) => setCta("secondary_label", v)} /></Field>
        <Field label="Botón secundario — enlace"><TextInput value={String(cta.secondary_href ?? "")} onChange={(v) => setCta("secondary_href", v)} /></Field>
      </div>
    </div>
  );
}

function ServiciosImplementacionEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const hero = (data.hero as Record<string, unknown>) ?? {};
  const cta  = (data.cta  as Record<string, unknown>) ?? {};

  const setHero = (k: string, v: unknown) => onChange({ ...data, hero: { ...hero, [k]: v } });
  const setCta  = (k: string, v: unknown) => onChange({ ...data, cta:  { ...cta,  [k]: v } });

  return (
    <div className="space-y-5">
      <Divider label="Hero" />
      <Field label="Badge"><TextInput value={String(hero.badge ?? "")} onChange={(v) => setHero("badge", v)} /></Field>
      <Field label="Titular H1 — primera línea"><TextInput value={String(hero.headline ?? "")} onChange={(v) => setHero("headline", v)} /></Field>
      <Field label="Titular — parte naranja (highlight)"><TextInput value={String(hero.headline_highlight ?? "")} onChange={(v) => setHero("headline_highlight", v)} /></Field>
      <Field label="Subtítulo"><TextArea value={String(hero.subheadline ?? "")} onChange={(v) => setHero("subheadline", v)} rows={3} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CTA principal — texto"><TextInput value={String(hero.cta_primary ?? "")} onChange={(v) => setHero("cta_primary", v)} /></Field>
        <Field label="CTA principal — enlace"><TextInput value={String(hero.cta_primary_href ?? "")} onChange={(v) => setHero("cta_primary_href", v)} /></Field>
        <Field label="CTA secundario — texto"><TextInput value={String(hero.cta_secondary ?? "")} onChange={(v) => setHero("cta_secondary", v)} /></Field>
        <Field label="CTA secundario — enlace"><TextInput value={String(hero.cta_secondary_href ?? "")} onChange={(v) => setHero("cta_secondary_href", v)} /></Field>
      </div>

      <Divider label="Por qué importa" />
      <Field label="Tarjetas de argumento" hint='Array JSON — [{icon, title, desc}] — iconos: TrendingUp, Clock, Users'>
        <JsonArea value={(data.why_cards ?? [])} onChange={(v) => onChange({ ...data, why_cards: v })} />
      </Field>

      <Divider label="Planes (tiers)" />
      <Field label="Tiers" hint='Array JSON — [{key, name, tagline, price, days, popular, cta, features:[{text, highlight}]}]'>
        <JsonArea value={(data.tiers ?? [])} onChange={(v) => onChange({ ...data, tiers: v })} />
      </Field>
      <Field label="Trust strip" hint='Array JSON — [{icon, text}] — iconos: Shield, MessageCircle, Globe, Zap'>
        <JsonArea value={(data.trust_strip ?? [])} onChange={(v) => onChange({ ...data, trust_strip: v })} />
      </Field>

      <Divider label="Tabla comparativa" />
      <Field label="Filas de comparación" hint='Array JSON — [{item, arranque, impulso, escala}]'>
        <JsonArea value={(data.comparison ?? [])} onChange={(v) => onChange({ ...data, comparison: v })} />
      </Field>

      <Divider label="Cómo funciona (pasos)" />
      <Field label="Pasos" hint='Array JSON — [{icon, title, desc}] — iconos: CalendarCheck, Settings, Rocket, CheckCircle'>
        <JsonArea value={(data.steps ?? [])} onChange={(v) => onChange({ ...data, steps: v })} />
      </Field>

      <Divider label="Preguntas frecuentes" />
      <Field label="FAQs" hint='Array JSON — [{q, a}]'>
        <JsonArea value={(data.faqs ?? [])} onChange={(v) => onChange({ ...data, faqs: v })} />
      </Field>

      <Divider label="Banner CTA final" />
      <Field label="Titular"><TextInput value={String(cta.headline ?? "")} onChange={(v) => setCta("headline", v)} /></Field>
      <Field label="Subtítulo"><TextInput value={String(cta.subheadline ?? "")} onChange={(v) => setCta("subheadline", v)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Botón primario — texto"><TextInput value={String(cta.primary_label ?? "")} onChange={(v) => setCta("primary_label", v)} /></Field>
        <Field label="Botón primario — enlace"><TextInput value={String(cta.primary_href ?? "")} onChange={(v) => setCta("primary_href", v)} /></Field>
        <Field label="Botón secundario — texto"><TextInput value={String(cta.secondary_label ?? "")} onChange={(v) => setCta("secondary_label", v)} /></Field>
        <Field label="Botón secundario — enlace"><TextInput value={String(cta.secondary_href ?? "")} onChange={(v) => setCta("secondary_href", v)} /></Field>
      </div>
    </div>
  );
}

function VozIaEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const set = (key: string, val: unknown) => onChange({ ...data, [key]: val });
  return (
    <div className="space-y-5">
      {/* Info card — plans/FAQs/stats are managed in Django admin */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-800/50 bg-blue-950/20 px-4 py-3 text-xs text-blue-300">
        <Mic className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
        <div>
          <p className="font-medium text-blue-200">Datos estructurados en Django Admin</p>
          <p className="mt-0.5 text-blue-300/80">
            Los <span className="font-medium">planes de voz</span>, <span className="font-medium">FAQs</span> y{" "}
            <span className="font-medium">estadísticas</span> se gestionan en el Admin de Django bajo{" "}
            <span className="font-mono">Agente de Voz IA</span>. Este editor cubre únicamente los textos editoriales de la landing.
          </p>
        </div>
      </div>

      <Divider label="Hero" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Badge" hint='Ej. "Nuevo · Agente de Voz IA"'>
          <TextInput value={String(data.hero_badge ?? "")} onChange={(v) => set("hero_badge", v)} placeholder="Nuevo · Agente de Voz IA" />
        </Field>
        <Field label="Nota de prueba gratuita" hint='Ej. "14 días gratis · Sin tarjeta de crédito"'>
          <TextInput value={String(data.trial_note ?? "")} onChange={(v) => set("trial_note", v)} placeholder="14 días gratis · Sin tarjeta de crédito" />
        </Field>
      </div>
      <Field label="Titular (H1)">
        <TextInput value={String(data.hero_headline ?? "")} onChange={(v) => set("hero_headline", v)} placeholder="Tu recepcionista con IA que nunca duerme" />
      </Field>
      <Field label="Subtítulo">
        <TextArea value={String(data.hero_subheadline ?? "")} onChange={(v) => set("hero_subheadline", v)} rows={3} placeholder="Atiende llamadas, califica leads y agenda citas en automático…" />
      </Field>

      <Divider label="CTAs del hero" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CTA principal — texto"><TextInput value={String(data.cta_primary_text ?? "")} onChange={(v) => set("cta_primary_text", v)} placeholder="Comenzar gratis" /></Field>
        <Field label="CTA principal — enlace"><TextInput value={String(data.cta_primary_href ?? "")} onChange={(v) => set("cta_primary_href", v)} placeholder="/register" /></Field>
        <Field label="CTA secundario — texto"><TextInput value={String(data.cta_secondary_text ?? "")} onChange={(v) => set("cta_secondary_text", v)} placeholder="Ver planes" /></Field>
        <Field label="CTA secundario — enlace"><TextInput value={String(data.cta_secondary_href ?? "")} onChange={(v) => set("cta_secondary_href", v)} placeholder="/voz-ia#pricing" /></Field>
      </div>

      <Divider label="Sección de precios" />
      <Field label="Badge">
        <TextInput value={String(data.pricing_badge ?? "")} onChange={(v) => set("pricing_badge", v)} placeholder="Sin permanencia · Cancela cuando quieras" />
      </Field>
      <Field label="Titular">
        <TextInput value={String(data.pricing_headline ?? "")} onChange={(v) => set("pricing_headline", v)} placeholder="Planes de Agente de Voz IA" />
      </Field>
      <Field label="Subtítulo">
        <TextArea value={String(data.pricing_subheadline ?? "")} onChange={(v) => set("pricing_subheadline", v)} rows={2} />
      </Field>
      <Field label="Descuento anual (%)" hint="Solo el número — ej. 20 para 20 % de descuento">
        <TextInput value={String(data.annual_discount_pct ?? "20")} onChange={(v) => set("annual_discount_pct", Number(v) || v)} placeholder="20" />
      </Field>

      <Divider label="ROI — Comparativa de costes" />
      <p className="text-xs text-slate-400">Estos valores aparecen en la tabla &quot;Sin agente vs Con agente de voz&quot;. Ajusta si cambian el salario mínimo o los valores de referencia.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Salario mensual recepcionista" hint='Ej. "$519/mes"'>
          <TextInput value={String(data.roi_human_salary ?? "")} onChange={(v) => set("roi_human_salary", v)} placeholder="$519/mes" />
        </Field>
        <Field label="Prestaciones y seguros" hint='Ej. "$200/mes"'>
          <TextInput value={String(data.roi_human_benefits ?? "")} onChange={(v) => set("roi_human_benefits", v)} placeholder="$200/mes" />
        </Field>
        <Field label="Vacaciones y ausentismo" hint='Ej. "$100/mes"'>
          <TextInput value={String(data.roi_human_vacation ?? "")} onChange={(v) => set("roi_human_vacation", v)} placeholder="$100/mes" />
        </Field>
        <Field label="Total coste humano" hint='Ej. "~$820/mes"'>
          <TextInput value={String(data.roi_human_total ?? "")} onChange={(v) => set("roi_human_total", v)} placeholder="~$820/mes" />
        </Field>
      </div>
      <Field label="Multiplicador de ROI" hint='Número de veces más económico — ej. "16×"'>
        <TextInput value={String(data.roi_multiplier ?? "")} onChange={(v) => set("roi_multiplier", v)} placeholder="16×" />
      </Field>
    </div>
  );
}

function ServiciosImplementacionVozEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const hero = (data.hero as Record<string, unknown>) ?? {};
  const cta  = (data.cta  as Record<string, unknown>) ?? {};

  const setHero = (k: string, v: unknown) => onChange({ ...data, hero: { ...hero, [k]: v } });
  const setCta  = (k: string, v: unknown) => onChange({ ...data, cta:  { ...cta,  [k]: v } });

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-blue-800/50 bg-blue-950/20 px-4 py-3 text-xs text-blue-300">
        <Wrench className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
        <div>
          <p className="font-medium text-blue-200">Página pública</p>
          <p className="mt-0.5 text-blue-300/80">
            Este editor gestiona los textos de <span className="font-mono">/servicios/voz-ia</span>.
            Los pasos del proceso están definidos en código (estructurales). Los tiers, includes y FAQs
            se editan en los campos JSON de abajo y se reflejan en la web al guardar.
          </p>
        </div>
      </div>

      <Divider label="Hero" />
      <Field label="Badge"><TextInput value={String(hero.badge ?? "")} onChange={(v) => setHero("badge", v)} placeholder="Servicio de configuración profesional" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titular H1 — primera línea"><TextInput value={String(hero.headline ?? "")} onChange={(v) => setHero("headline", v)} placeholder="Tu Agente de Voz IA" /></Field>
        <Field label="Titular — parte naranja (highlight)"><TextInput value={String(hero.headline_highlight ?? "")} onChange={(v) => setHero("headline_highlight", v)} placeholder="listo en 48 horas" /></Field>
      </div>
      <Field label="Subtítulo"><TextArea value={String(hero.subheadline ?? "")} onChange={(v) => setHero("subheadline", v)} rows={3} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CTA principal — texto"><TextInput value={String(hero.cta_primary ?? "")} onChange={(v) => setHero("cta_primary", v)} placeholder="Ver planes" /></Field>
        <Field label="CTA principal — enlace"><TextInput value={String(hero.cta_primary_href ?? "")} onChange={(v) => setHero("cta_primary_href", v)} placeholder="#planes" /></Field>
        <Field label="CTA secundario — texto"><TextInput value={String(hero.cta_secondary ?? "")} onChange={(v) => setHero("cta_secondary", v)} placeholder="Hablar con el equipo" /></Field>
        <Field label="CTA secundario — enlace"><TextInput value={String(hero.cta_secondary_href ?? "")} onChange={(v) => setHero("cta_secondary_href", v)} placeholder="/contacto" /></Field>
      </div>
      <Field label="Trust strip del hero" hint='Array JSON — [{icon, text}] — iconos: Shield, Clock, MessageCircle'>
        <JsonArea value={(hero.trust_strip ?? [])} onChange={(v) => setHero("trust_strip", v)} />
      </Field>

      <Divider label="¿Qué incluye?" />
      <Field label="Cards de includes" hint='Array JSON — [{icon, title, desc}] — iconos: Mic, Brain, Target, Plug, Calendar, TestTube'>
        <JsonArea value={(data.includes ?? [])} onChange={(v) => onChange({ ...data, includes: v })} />
      </Field>

      <Divider label="Planes (tiers)" />
      <Field label="Tiers" hint='Array JSON — [{key, name, tagline, price, days, popular, cta, features:[{text, highlight}]}]'>
        <JsonArea value={(data.tiers ?? [])} onChange={(v) => onChange({ ...data, tiers: v })} />
      </Field>
      <Field label="Trust strip de planes" hint='Array JSON — [{icon, text}] — iconos: Shield, MessageCircle, Globe, Zap'>
        <JsonArea value={(data.trust_strip ?? [])} onChange={(v) => onChange({ ...data, trust_strip: v })} />
      </Field>

      <Divider label="Preguntas frecuentes" />
      <Field label="FAQs" hint='Array JSON — [{q, a}]'>
        <JsonArea value={(data.faqs ?? [])} onChange={(v) => onChange({ ...data, faqs: v })} />
      </Field>

      <Divider label="Banner CTA final" />
      <Field label="Titular"><TextInput value={String(cta.headline ?? "")} onChange={(v) => setCta("headline", v)} /></Field>
      <Field label="Subtítulo"><TextInput value={String(cta.subheadline ?? "")} onChange={(v) => setCta("subheadline", v)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Botón primario — texto"><TextInput value={String(cta.primary_label ?? "")} onChange={(v) => setCta("primary_label", v)} placeholder="Contratar Setup Pro" /></Field>
        <Field label="Botón primario — enlace"><TextInput value={String(cta.primary_href ?? "")} onChange={(v) => setCta("primary_href", v)} placeholder="/contacto?servicio=voz-pro" /></Field>
        <Field label="Botón secundario — texto"><TextInput value={String(cta.secondary_label ?? "")} onChange={(v) => setCta("secondary_label", v)} placeholder="Tengo dudas, hablemos" /></Field>
        <Field label="Botón secundario — enlace"><TextInput value={String(cta.secondary_href ?? "")} onChange={(v) => setCta("secondary_href", v)} placeholder="/contacto" /></Field>
      </div>
    </div>
  );
}

const EDITORS: Record<SectionKey, React.ComponentType<{ data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }>> = {
  hero:                      HeroEditor,
  pricing:                   PricingEditor,
  features_page:             FeaturesEditor,
  nosotros:                  NosotrosEditor,
  contacto:                  ContactoEditor,
  privacidad:                PrivacidadEditor,
  terminos:                  TerminosEditor,
  general:                   GeneralEditor,
  servicios_whatsapp:           ServiciosWhatsappEditor,
  servicios_implementacion:     ServiciosImplementacionEditor,
  servicios_implementacion_voz: ServiciosImplementacionVozEditor,
  voz_ia:                       VozIaEditor,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CmsPage() {
  const { tokens, organization } = useAuthStore();
  const token = tokens?.access ?? "";
  const orgId = organization?.id ?? "";

  const [activeSection, setActiveSection] = useState<SectionKey>("hero");
  const [content, setContent] = useState<Record<SectionKey, Record<string, unknown>>>(
    DEFAULT_CONTENT as unknown as Record<SectionKey, Record<string, unknown>>
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cmsApi.getAll();
      setContent({
        ...(DEFAULT_CONTENT as unknown as Record<SectionKey, Record<string, unknown>>),
        ...(data as Record<string, Record<string, unknown>>),
      });
    } catch {
      // fallback: defaults from landing pages
      setContent(DEFAULT_CONTENT as unknown as Record<SectionKey, Record<string, unknown>>);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadContent(); }, [loadContent]);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      await cmsApi.updateSection(token, activeSection, content[activeSection], orgId);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const Editor = EDITORS[activeSection];
  const activeMeta = SECTIONS.find((s) => s.key === activeSection)!;
  const ActiveIcon = activeMeta.icon;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardHeader title="Contenido Web" />

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ────────────────────────────────────────────── */}
        <aside className="flex w-64 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-950">

          {/* Sidebar header */}
          <div className="border-b border-slate-800 px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Secciones</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Los cambios se reflejan en la web al instante.
            </p>
          </div>

          {/* Section nav */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {SECTIONS.map(({ key, label, description, icon: Icon }) => {
              const active = activeSection === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active
                      ? "bg-orange-950/30"
                      : "hover:bg-slate-800/50"
                  }`}
                >
                  <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                    active
                      ? "bg-orange-900/40 text-orange-400"
                      : "bg-slate-800 text-slate-400 group-hover:bg-slate-700"
                  }`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium leading-none ${active ? "text-orange-400" : "text-slate-300"}`}>
                      {label}
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-slate-400">{description}</p>
                  </div>
                  {active && (
                    <div className="ml-auto mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* View site link */}
          <div className="border-t border-slate-800 p-3">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-800 hover:text-orange-400"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver sitio público
            </Link>
          </div>
        </aside>

        {/* ── Editor area ────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Editor top bar */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400">
                <ActiveIcon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100">{activeMeta.label}</h2>
                <p className="text-xs text-slate-400">{activeMeta.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {saveStatus === "success" && (
                <div className="flex items-center gap-1.5 rounded-lg bg-green-950/40 px-3 py-1.5 text-xs font-medium text-green-400">
                  <CheckCircle className="h-3.5 w-3.5" /> Cambios guardados
                </div>
              )}
              {saveStatus === "error" && (
                <div className="flex items-center gap-1.5 rounded-lg bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" /> Error al guardar
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={loadContent}
                disabled={loading}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Recargar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || loading}
                className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </div>

          {/* Form body */}
          <div className="flex-1 overflow-y-auto bg-slate-900/30 p-6">
            {loading ? (
              <div className="mx-auto max-w-3xl space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`h-${i === 0 ? "10" : "24"} w-full animate-pulse rounded-xl bg-slate-800`} />
                ))}
              </div>
            ) : (
              <div className="mx-auto max-w-3xl">
                {/* Section card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-sm">
                  <Editor
                    data={content[activeSection] ?? {}}
                    onChange={(d) => setContent((prev) => ({ ...prev, [activeSection]: d }))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
