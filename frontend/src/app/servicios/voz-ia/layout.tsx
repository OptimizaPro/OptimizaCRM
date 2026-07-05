import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup Agente de Voz IA | OptimizaCRM",
  description:
    "Configuramos tu agente de voz desde cero — base de conocimiento, flujos de calificación, voz personalizada e integración con tu CRM. Operativo en 48 horas.",
  alternates: { canonical: "https://optimizacrm.com/servicios/voz-ia" },
  openGraph: {
    url: "https://optimizacrm.com/servicios/voz-ia",
    title: "Setup Agente de Voz IA — Operativo en 48 horas | OptimizaCRM",
    description:
      "Servicio de configuración profesional del Agente de Voz IA. Base de conocimiento, flujos de calificación, integración CRM y prueba funcional incluidos. Desde $299 pago único.",
  },
};

export default function VozIaSetupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
