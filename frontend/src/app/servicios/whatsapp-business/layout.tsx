import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup WhatsApp Business API — Configuración e Integración",
  description:
    "Servicio de configuración e integración de WhatsApp Business API para tu CRM. Precio fijo $199. Sin sorpresas. Incluye verificación Meta, número dedicado y conexión a OptimizaCRM.",
  alternates: { canonical: "https://optimizacrm.com/servicios/whatsapp-business" },
  openGraph: {
    url: "https://optimizacrm.com/servicios/whatsapp-business",
    title: "Setup WhatsApp Business API — $199 precio fijo | OptimizaCRM",
    description:
      "Configuración completa de WhatsApp Business API integrada a tu CRM. Precio fijo $199. Incluye verificación Meta y onboarding.",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Inicio",
      item: "https://optimizacrm.com",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Servicios",
      item: "https://optimizacrm.com/servicios",
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "Setup WhatsApp Business",
      item: "https://optimizacrm.com/servicios/whatsapp-business",
    },
  ],
};

export default function WhatsAppBusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
