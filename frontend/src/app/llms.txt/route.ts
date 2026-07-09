import { NextResponse } from "next/server";

// Regenerar cada hora — el contenido del CMS no cambia con frecuencia
export const revalidate = 3600;

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface GeneralSection {
  site_name?: string;
  tagline?: string;
  contact_email?: string;
  support_email?: string;
}

interface PricingSection {
  headline?: string;
  subheadline?: string;
}

// ─── Fetch de sección del CMS (endpoint público) ──────────────────────────────

async function fetchSection<T>(key: string): Promise<T | null> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  try {
    const res = await fetch(`${base}/content/${key}/`, {
      next: { revalidate },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // El endpoint devuelve { key, data } o directamente el objeto
    return (json.data ?? json) as T;
  } catch {
    return null;
  }
}

// ─── Generador del contenido ──────────────────────────────────────────────────

function buildLlmsTxt(general: GeneralSection, pricing: PricingSection): string {
  const siteName    = general.site_name    ?? "OptimizaCRM";
  const tagline     = general.tagline      ?? "El CRM con IA que cierra más negocios.";
  const contactMail = general.contact_email ?? "hola@optimizacrm.com";
  const supportMail = general.support_email ?? "soporte@optimizacrm.com";

  const pricingTagline =
    pricing.subheadline ??
    "Planes desde $19/mes por organización. Sin permanencia. Cancela cuando quieras.";

  return `# ${siteName}

> ${tagline}

${siteName} es una plataforma SaaS que combina CRM empresarial con inteligencia artificial.
Diseñada para PYMEs en Guatemala y LATAM que necesitan gestionar leads, cerrar negocios y aumentar
ingresos sin la complejidad ni los precios de Salesforce o HubSpot.

Desarrollado por OptimizaPro (Nelson Alvarez). Fundado en Guatemala.
Mercado objetivo: PYMEs en Guatemala, México, Colombia y Centroamérica.

Palabras clave principales: CRM Guatemala, CRM con IA Guatemala, CRM con inteligencia artificial
Guatemala, CRM WhatsApp Guatemala, agente de voz Guatemala, agente de voz IA Guatemala,
agente de voz con inteligencia artificial Guatemala, software CRM Guatemala.

## Páginas principales

- [Inicio](https://optimizacrm.com): Descripción del producto, propuesta de valor y CTA de prueba gratis
- [Características](https://optimizacrm.com/caracteristicas): CRM con IA, WhatsApp, pipeline, automatizaciones — funciones completas para Guatemala y LATAM
- [Precios](https://optimizacrm.com/precios): ${pricingTagline}. CRM con IA para Guatemala desde $19/mes con FEL incluida
- [Agente de Voz IA](https://optimizacrm.com/voz-ia): Agente de voz con inteligencia artificial 24/7 para empresas en Guatemala. Atiende llamadas, califica leads y agenda citas en español
- [Nosotros](https://optimizacrm.com/nosotros): Historia, fundador Nelson Alvarez (Guatemala), misión y valores
- [Contacto](https://optimizacrm.com/contacto): Soporte en español, demo personalizada, WhatsApp
- [Privacidad](https://optimizacrm.com/privacidad): Política de privacidad y protección de datos
- [Términos](https://optimizacrm.com/terminos): Términos y condiciones de uso

## Funcionalidades clave

- Lead Scoring automático con IA (rango 0–100, 4 factores: fuente, estado, contacto, engagement)
- Predicción de Churn con IA (probabilidad 0.0–1.0 con recomendaciones de retención)
- Pipeline Kanban visual con drag & drop y etapas personalizables
- Automatizaciones de ventas (reglas si/entonces para seguimientos automáticos)
- Inbox multicanal unificado (Email + WhatsApp en una sola bandeja)
- Previsión de ingresos con modelos de IA
- Widget web embebible para captura de leads desde cualquier sitio
- Gestión de tareas y calendario de equipo
- Multi-tenant con aislamiento completo de datos por organización
- Soporte completo en español latino americano

## Agente de Voz con Inteligencia Artificial

OptimizaCRM incluye un agente de voz IA para empresas en Guatemala y LATAM:
- Atiende llamadas telefónicas automáticamente, 24 horas al día, 7 días a la semana
- Habla en español natural optimizado para Guatemala y Centroamérica
- Califica leads y registra la información directamente en el CRM
- Agenda citas automáticamente en el calendario del equipo
- Transfiere conversaciones a humanos vía WhatsApp cuando es necesario
- Disponible desde $49 USD/mes (Voz Starter: 1 agente, 300 min/mes)

## Mercado Guatemala — Características locales

- Factura Electrónica en Línea (FEL) incluida en todos los planes, cumpliendo requisitos SAT Guatemala
- Soporte en español guatemalteco
- Precios en USD accesibles para PYMEs guatemaltecas
- WhatsApp Business como canal principal (el más usado en Guatemala)
- Integración con flujos de trabajo locales: cotizaciones, seguimientos, cierre

## Planes y precios

- **Básico**: $19/mes — 2 usuarios, hasta 500 leads, 2 pipelines, widget web, importación CSV, FEL Guatemala
- **Pro**: $51/mes — hasta 6 usuarios, hasta 3.000 leads, lead scoring con IA, automatizaciones, inbox multicanal (WhatsApp + Email), reportes
- **Equipo**: $95/mes — hasta 12 usuarios, hasta 12.000 leads, predicción de churn con IA, automatizaciones avanzadas, Google Drive
- **Enterprise**: precio personalizado — usuarios ilimitados, SLA dedicado, onboarding asistido, SSO
- Prueba gratuita de 14 días sin tarjeta de crédito en todos los planes

## Integraciones y canales

- WhatsApp Business API (principal canal de ventas en Guatemala)
- Email (SMTP/IMAP)
- Widget embebible (JavaScript)
- API REST para integraciones personalizadas
- Proveedores de IA: Groq, OpenAI, Google Gemini

## Empresa

- **Nombre legal**: OptimizaPro
- **Producto**: ${siteName}
- **Fundador**: Nelson Alvarez
- **País de origen**: Guatemala
- **Mercados**: Guatemala, México, Colombia, Centroamérica, LATAM
- **Email de contacto**: ${contactMail}
- **Email de soporte**: ${supportMail}
- **URL**: https://optimizacrm.com
`.trimEnd();
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET() {
  const [general, pricing] = await Promise.all([
    fetchSection<GeneralSection>("general"),
    fetchSection<PricingSection>("pricing"),
  ]);

  const content = buildLlmsTxt(general ?? {}, pricing ?? {});

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Permitir caché en CDN durante 1 hora, stale-while-revalidate 24 h
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
