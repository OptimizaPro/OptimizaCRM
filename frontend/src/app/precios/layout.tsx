import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Precios",
  description:
    "Planes desde $19/mes por organización. Básico, Pro, Equipo y Enterprise. 14 días gratis sin tarjeta de crédito. CRM con IA para PYMEs en LATAM.",
  alternates: { canonical: "https://optimizacrm.com/precios" },
  openGraph: {
    url: "https://optimizacrm.com/precios",
    title: "Precios | OptimizaCRM",
    description: "Planes desde $19/mes. 14 días gratis sin tarjeta. CRM con IA para PYMEs en LATAM.",
  },
};

const faqPreciosSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Cuánto cuesta OptimizaCRM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "OptimizaCRM tiene 4 planes: Básico ($19/mes, 2 usuarios), Pro ($51/mes, hasta 6 usuarios), Equipo ($95/mes, hasta 12 usuarios) y Enterprise (precio personalizado). Todos incluyen 14 días de prueba gratis sin tarjeta de crédito. El precio es por organización, no por usuario.",
      },
    },
    {
      "@type": "Question",
      name: "¿OptimizaCRM tiene prueba gratuita?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. Todos los planes incluyen 14 días de prueba gratuita sin tarjeta de crédito. Puedes empezar en segundos y cancelar cuando quieras sin penalización.",
      },
    },
    {
      "@type": "Question",
      name: "¿El precio de OptimizaCRM es por usuario o por organización?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "El precio es por organización, no por usuario. El plan Básico incluye hasta 2 usuarios, el Pro hasta 6 usuarios y el Equipo hasta 12 usuarios. No pagas más si agregas usuarios dentro del límite de tu plan.",
      },
    },
    {
      "@type": "Question",
      name: "¿Qué incluye el plan Pro de OptimizaCRM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "El plan Pro ($51/mes) incluye hasta 6 usuarios, hasta 3.000 leads, hasta 5 pipelines, lead scoring con IA, automatizaciones de ventas (hasta 10 reglas), bandeja de entrada multicanal (Email + WhatsApp), reportes avanzados y previsión de ventas.",
      },
    },
    {
      "@type": "Question",
      name: "¿Puedo cancelar mi suscripción a OptimizaCRM en cualquier momento?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. Sin permanencia ni penalización. Puedes cancelar desde la configuración de tu cuenta en cualquier momento. El acceso se mantiene hasta el fin del período ya pagado y tus datos estarán disponibles para exportar durante 30 días adicionales.",
      },
    },
    {
      "@type": "Question",
      name: "¿La IA de OptimizaCRM tiene un coste adicional?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. El lead scoring con IA está incluido desde el plan Básico. La predicción de churn con IA está incluida en el plan Equipo. No hay costes ocultos por usar las funcionalidades de inteligencia artificial.",
      },
    },
  ],
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "OptimizaCRM",
  description:
    "CRM SaaS con inteligencia artificial para equipos de ventas de PYMEs en Latinoamérica.",
  brand: { "@type": "Brand", name: "OptimizaPro" },
  offers: [
    {
      "@type": "Offer",
      name: "Plan Básico",
      price: "19",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "19",
        priceCurrency: "USD",
        unitCode: "MON",
      },
      eligibleQuantity: { "@type": "QuantitativeValue", maxValue: 2, unitText: "usuarios" },
      availability: "https://schema.org/InStock",
      url: "https://optimizacrm.com/precios",
    },
    {
      "@type": "Offer",
      name: "Plan Pro",
      price: "51",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "51",
        priceCurrency: "USD",
        unitCode: "MON",
      },
      eligibleQuantity: { "@type": "QuantitativeValue", maxValue: 6, unitText: "usuarios" },
      availability: "https://schema.org/InStock",
      url: "https://optimizacrm.com/precios",
    },
    {
      "@type": "Offer",
      name: "Plan Equipo",
      price: "95",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "95",
        priceCurrency: "USD",
        unitCode: "MON",
      },
      eligibleQuantity: { "@type": "QuantitativeValue", maxValue: 12, unitText: "usuarios" },
      availability: "https://schema.org/InStock",
      url: "https://optimizacrm.com/precios",
    },
  ],
};

export default function PreciosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPreciosSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      {children}
    </>
  );
}
