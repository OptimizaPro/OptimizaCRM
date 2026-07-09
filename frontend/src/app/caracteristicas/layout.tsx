import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lead Scoring, Pipeline y IA: Todas las Funciones de OptimizaCRM",
  description:
    "Lead scoring con IA, pipeline Kanban, automatizaciones, inbox multicanal (WhatsApp + Email), predicción de churn y previsión de ingresos. CRM con inteligencia artificial para PYMEs en Guatemala y LATAM.",
  keywords: [
    "CRM con IA Guatemala",
    "CRM con inteligencia artificial Guatemala",
    "CRM WhatsApp Guatemala",
    "lead scoring Guatemala",
    "pipeline ventas Guatemala",
    "automatización ventas Guatemala",
    "CRM funciones Guatemala",
    "software CRM Guatemala",
  ],
  alternates: { canonical: "https://optimizacrm.com/caracteristicas" },
  openGraph: {
    url: "https://optimizacrm.com/caracteristicas",
    title: "Funciones CRM con IA para Guatemala y LATAM | OptimizaCRM",
    description:
      "Lead scoring con IA, pipeline Kanban, WhatsApp integrado, automatizaciones y más. El CRM con inteligencia artificial para PYMEs en Guatemala.",
  },
};

const itemListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Funcionalidades de OptimizaCRM",
  description:
    "Módulos y características principales de OptimizaCRM, el CRM con IA para equipos de ventas de PYMEs en Latinoamérica.",
  url: "https://optimizacrm.com/caracteristicas",
  numberOfItems: 8,
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Gestión de Leads con IA",
      description:
        "Captura, importación CSV, acciones masivas, reglas de asignación automática y lead scoring automático con IA (rango 0–100).",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Pipeline de Ventas Kanban",
      description:
        "Tablero Kanban visual con drag & drop, etapas personalizables, seguimiento de oportunidades y análisis de ganadas/perdidas.",
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "Inteligencia Artificial integrada",
      description:
        "Lead scoring automático, predicción de churn (riesgo de abandono), previsión de ingresos, generación de emails con IA y análisis de sentimiento.",
    },
    {
      "@type": "ListItem",
      position: 4,
      name: "Analítica y Reportes",
      description:
        "KPIs en tiempo real, exportación PDF/Excel, informes programados y métricas de rendimiento del equipo de ventas.",
    },
    {
      "@type": "ListItem",
      position: 5,
      name: "Inbox Multicanal Unificado",
      description:
        "Gestión de WhatsApp Business, Email y otros canales desde una sola bandeja de entrada. Historial de contacto unificado por cliente.",
    },
    {
      "@type": "ListItem",
      position: 6,
      name: "Automatizaciones de Ventas",
      description:
        "Reglas trigger-acción para seguimientos automáticos, cambios de estado, notificaciones al equipo y tareas programadas.",
    },
    {
      "@type": "ListItem",
      position: 7,
      name: "Widget Web Embebible",
      description:
        "Widget JavaScript embebible en cualquier sitio web para captura de leads directamente en el CRM.",
    },
    {
      "@type": "ListItem",
      position: 8,
      name: "Multi-tenant y Seguridad Empresarial",
      description:
        "Arquitectura multi-tenant con aislamiento completo de datos por organización. HTTPS, JWT, cumplimiento OWASP y soporte GDPR.",
    },
  ],
};

const webPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Características de OptimizaCRM",
  description:
    "Todas las funcionalidades de OptimizaCRM: CRM, IA, automatización, pipeline de ventas, inbox multicanal y más.",
  url: "https://optimizacrm.com/caracteristicas",
  about: {
    "@type": "SoftwareApplication",
    name: "OptimizaCRM",
    applicationCategory: "BusinessApplication",
    url: "https://optimizacrm.com",
  },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: "https://optimizacrm.com" },
      { "@type": "ListItem", position: 2, name: "Características", item: "https://optimizacrm.com/caracteristicas" },
    ],
  },
};

export default function CaracteristicasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      {children}
    </>
  );
}
