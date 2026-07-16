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

function buildLlmsTxt(_general: GeneralSection, _pricing: PricingSection): string {
  return `# OptimizaCRM

> CRM con inteligencia artificial para equipos de ventas de PYMEs en Guatemala y LATAM.
> Pipeline visual, lead scoring automático, WhatsApp integrado, agente de voz IA 24/7.
> Precios desde $19/mes. Sin tarjeta de crédito. Prueba gratuita 14 días.

## Producto
- [Características](https://optimizacrm.com/caracteristicas): Pipeline Kanban, lead scoring con IA, inbox multicanal, automatizaciones de ventas, Factura Electrónica FEL.
- [Precios](https://optimizacrm.com/precios): Planes desde $19/mes (Básico), $51/mes (Pro), $95/mes (Equipo). Sin permanencia.
- [Agente de Voz IA](https://optimizacrm.com/voz-ia): Agente conversacional 24/7. Califica leads, agenda citas, escala a humano. Starter $149/mes.
- [Guatemala CRM](https://optimizacrm.com/guatemala): CRM con IA para empresas en Guatemala. FEL, soporte en español, precios en USD.

## Empresa
- [Nosotros](https://optimizacrm.com/nosotros): OptimizaPro, fundada en Guatemala. Plataforma SaaS de optimización empresarial para PYMEs.
- [Contacto](https://optimizacrm.com/contacto): Consultas comerciales y soporte técnico.

## Servicios de implementación
- [Setup WhatsApp Business](https://optimizacrm.com/servicios/whatsapp-business): Configuración e integración de WhatsApp Business API. Precio fijo $199.
- [Implementación CRM](https://optimizacrm.com/servicios/implementacion): Implementación guiada del CRM con migración de datos y capacitación.

> Optional

## Legal
- [Política de Privacidad](https://optimizacrm.com/privacidad)
- [Términos y Condiciones](https://optimizacrm.com/terminos)`.trimEnd();
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
