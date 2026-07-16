import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Implementación CRM — Migración de Datos y Capacitación",
  description:
    "Servicio de implementación guiada de OptimizaCRM. Migración de datos, configuración de pipelines, capacitación del equipo y acompañamiento post-lanzamiento.",
  alternates: { canonical: "https://optimizacrm.com/servicios/implementacion" },
  openGraph: {
    url: "https://optimizacrm.com/servicios/implementacion",
    title: "Implementación CRM con IA — Migración y Capacitación | OptimizaCRM",
    description:
      "Implementación guiada de OptimizaCRM. Migración de datos, pipelines y capacitación del equipo incluidos.",
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
      name: "Implementación CRM",
      item: "https://optimizacrm.com/servicios/implementacion",
    },
  ],
};

export default function ImplementacionLayout({ children }: { children: React.ReactNode }) {
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
