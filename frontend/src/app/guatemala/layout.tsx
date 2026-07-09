import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CRM con IA para Guatemala — WhatsApp, Agente de Voz y Pipeline",
  description:
    "El CRM con inteligencia artificial diseñado para empresas en Guatemala. Integración con WhatsApp, agente de voz IA 24/7, pipeline visual y lead scoring. FEL incluida. Desde $19/mes.",
  alternates: { canonical: "https://optimizacrm.com/guatemala" },
  keywords: [
    "CRM Guatemala",
    "CRM con IA Guatemala",
    "CRM con inteligencia artificial Guatemala",
    "CRM con WhatsApp Guatemala",
    "agente de voz Guatemala",
    "agente de voz IA Guatemala",
    "agente de voz con inteligencia artificial Guatemala",
    "software CRM Guatemala",
    "CRM para PYMEs Guatemala",
    "CRM con AI Guatemala",
  ],
  openGraph: {
    url: "https://optimizacrm.com/guatemala",
    title: "CRM con IA para Empresas en Guatemala | OptimizaCRM",
    description:
      "Gestiona leads, WhatsApp y ventas con inteligencia artificial. Agente de voz IA 24/7 en español. Factura Electrónica FEL incluida. Prueba gratis 14 días.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "CRM con IA para Guatemala — OptimizaCRM" }],
  },
};

// ─── Schema: LocalBusiness + FAQPage + BreadcrumbList ─────────────────────────

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://optimizacrm.com/#organization-gt",
  name: "OptimizaCRM Guatemala",
  alternateName: "OptimizaCRM",
  description:
    "Plataforma CRM con inteligencia artificial para empresas y PYMEs en Guatemala. Pipeline de ventas visual, WhatsApp integrado, agente de voz IA 24/7 y automatizaciones. Factura Electrónica FEL incluida.",
  url: "https://optimizacrm.com/guatemala",
  telephone: "+502",
  email: "hola@optimizacrm.com",
  address: {
    "@type": "PostalAddress",
    addressCountry: "GT",
    addressRegion: "Guatemala",
    addressLocality: "Ciudad de Guatemala",
  },
  areaServed: [
    { "@type": "Country", name: "Guatemala" },
    { "@type": "AdministrativeArea", name: "Ciudad de Guatemala" },
    { "@type": "AdministrativeArea", name: "Quetzaltenango" },
    { "@type": "AdministrativeArea", name: "Antigua Guatemala" },
  ],
  currenciesAccepted: "USD",
  paymentAccepted: "Credit Card, Bank Transfer",
  priceRange: "$19 - $95 USD/mes",
  openingHours: "Mo-Su 00:00-23:59",
  sameAs: ["https://optimizacrm.com"],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "CRM con IA y Agente de Voz para Guatemala",
    itemListElement: [
      {
        "@type": "Offer",
        name: "CRM con IA — Plan Básico Guatemala",
        description: "CRM con IA, pipeline visual, WhatsApp integrado y FEL para Guatemala. Desde $19/mes por organización.",
        price: "19.00",
        priceCurrency: "USD",
        url: "https://optimizacrm.com/precios",
      },
      {
        "@type": "Offer",
        name: "Agente de Voz IA para Guatemala",
        description: "Recepcionista con inteligencia artificial que atiende llamadas, califica leads y agenda citas 24/7 en español guatemalteco.",
        price: "49.00",
        priceCurrency: "USD",
        url: "https://optimizacrm.com/voz-ia",
      },
    ],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Qué es un CRM con inteligencia artificial para Guatemala?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Un CRM con IA es un software de gestión de clientes que usa inteligencia artificial para calificar leads automáticamente, predecir qué contactos tienen más probabilidad de cerrar, y automatizar seguimientos. OptimizaCRM está diseñado específicamente para el mercado guatemalteco: emite Factura Electrónica FEL, soporta el equipo comercial en español y tiene precios en USD accesibles para PYMEs.",
      },
    },
    {
      "@type": "Question",
      name: "¿El CRM se integra con WhatsApp en Guatemala?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. OptimizaCRM incluye un inbox multicanal con WhatsApp Business integrado. Puedes recibir, responder y gestionar conversaciones de WhatsApp directamente desde el CRM, con historial de conversaciones vinculado a cada lead o cliente. No necesitas cambiar entre apps.",
      },
    },
    {
      "@type": "Question",
      name: "¿Qué es un agente de voz con inteligencia artificial y para qué sirve en Guatemala?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Un agente de voz IA es una recepcionista virtual que atiende llamadas telefónicas de forma automática, 24 horas al día, 7 días a la semana. Habla en español natural, responde preguntas sobre tu empresa, califica leads y agenda citas. Es ideal para empresas guatemaltecas que no quieren perder llamadas fuera de horario laboral.",
      },
    },
    {
      "@type": "Question",
      name: "¿OptimizaCRM emite Factura Electrónica FEL en Guatemala?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. Todos los planes de OptimizaCRM incluyen emisión de Factura Electrónica en Línea (FEL) para clientes en Guatemala, cumpliendo con los requisitos de la SAT (Superintendencia de Administración Tributaria). No necesitas un sistema contable externo para tu facturación.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuánto cuesta un CRM con IA en Guatemala?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "OptimizaCRM tiene planes desde $19 USD/mes por organización (no por usuario), lo que lo hace accesible para PYMEs guatemaltecas. Los planes incluyen CRM completo con IA, WhatsApp integrado y FEL. El agente de voz IA está disponible desde $49 USD/mes adicionales.",
      },
    },
    {
      "@type": "Question",
      name: "¿El agente de voz IA entiende el español guatemalteco?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. El agente de voz de OptimizaCRM está optimizado para el español latinoamericano, incluyendo el acento y vocabulario guatemalteco. Responde de forma natural y los clientes frecuentemente no detectan que están hablando con una IA en las primeras interacciones.",
      },
    },
    {
      "@type": "Question",
      name: "¿Puedo probar el CRM gratis en Guatemala?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. OptimizaCRM ofrece 14 días de prueba gratuita sin necesidad de tarjeta de crédito. Incluye acceso completo al CRM, pipeline visual, WhatsApp, lead scoring con IA y 100 minutos del agente de voz.",
      },
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Inicio", item: "https://optimizacrm.com" },
    { "@type": "ListItem", position: 2, name: "CRM para Guatemala", item: "https://optimizacrm.com/guatemala" },
  ],
};

export default function GuatemalaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {children}
    </>
  );
}
