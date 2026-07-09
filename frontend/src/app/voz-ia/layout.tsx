import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agente de Voz IA 24/7 para Ventas — Califica Leads en Automático",
  description:
    "Agente de voz con inteligencia artificial para Guatemala y LATAM. Atiende llamadas, califica leads y agenda citas 24/7 en español. Tu recepcionista con IA que nunca duerme. Desde $49/mes.",
  keywords: [
    "agente de voz Guatemala",
    "agente de voz IA Guatemala",
    "agente de voz con inteligencia artificial Guatemala",
    "recepcionista virtual Guatemala",
    "agente de voz IA ventas",
    "atención de llamadas con IA Guatemala",
    "agente de voz AI Guatemala",
  ],
  alternates: { canonical: "https://optimizacrm.com/voz-ia" },
  openGraph: {
    url: "https://optimizacrm.com/voz-ia",
    title: "Agente de Voz con IA para Guatemala — Atiende llamadas 24/7 | OptimizaCRM",
    description:
      "Recepcionista virtual con inteligencia artificial en español. Califica leads, agenda citas y transfiere a WhatsApp. Para empresas en Guatemala. Desde $49/mes.",
    images: [{ url: "/og-voz-ia.png", width: 1200, height: 630, alt: "Agente de Voz IA para Guatemala — OptimizaCRM" }],
  },
};

export default function VozIaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
