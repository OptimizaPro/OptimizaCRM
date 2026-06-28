import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Habla con el equipo de OptimizaCRM. Respuesta en menos de 24 h. Demo personalizada, soporte en español y sin presión de ventas.",
  alternates: { canonical: "https://optimizacrm.com/contacto" },
  openGraph: {
    url: "https://optimizacrm.com/contacto",
    title: "Contacto | OptimizaCRM",
    description: "Habla con el equipo de OptimizaCRM. Demo personalizada y soporte en español.",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Qué es OptimizaCRM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "OptimizaCRM es un CRM SaaS con inteligencia artificial diseñado para equipos de ventas de PYMEs en Latinoamérica. Incluye lead scoring automático, predicción de churn, pipeline visual, automatizaciones y soporte completo en español.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuánto tiempo tarda la configuración inicial de OptimizaCRM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Menos de 5 minutos. Creas tu cuenta, invitas a tu equipo y empiezas a registrar leads de inmediato. No necesitas contratar un consultor ni pasar por un proceso de implementación complejo.",
      },
    },
    {
      "@type": "Question",
      name: "¿Mis datos están seguros en OptimizaCRM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. Cada organización tiene sus datos completamente aislados gracias a la arquitectura multi-tenant. Usamos JWT, HTTPS y cumplimiento OWASP desde el primer día. Tus datos son tuyos y puedes exportarlos en cualquier momento.",
      },
    },
    {
      "@type": "Question",
      name: "¿Puedo migrar desde otro CRM a OptimizaCRM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. Ofrecemos importación de contactos y leads vía CSV. Para migraciones más complejas desde HubSpot, Pipedrive u otro CRM, contáctanos y lo gestionamos juntos sin coste adicional.",
      },
    },
    {
      "@type": "Question",
      name: "¿OptimizaCRM tiene soporte en español?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "100%. El producto está diseñado para el mercado latinoamericano y todo el soporte se da en español. Sin bots, sin respuestas genéricas en inglés. Respondemos en menos de 24 horas hábiles.",
      },
    },
    {
      "@type": "Question",
      name: "¿OptimizaCRM se integra con WhatsApp?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. OptimizaCRM incluye integración con WhatsApp Business en los planes Pro, Equipo y Enterprise. Puedes gestionar conversaciones de WhatsApp y Email desde una bandeja de entrada unificada.",
      },
    },
    {
      "@type": "Question",
      name: "¿Qué diferencia a OptimizaCRM de HubSpot para PYMEs en LATAM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "OptimizaCRM está diseñado específicamente para PYMEs latinoamericanas: precios desde $19/mes (vs cientos de dólares en HubSpot), configuración en minutos sin consultor, IA incluida sin coste adicional y soporte completo en español. HubSpot está pensado para empresas con equipos dedicados de implementación y presupuestos mayores.",
      },
    },
  ],
};

export default function ContactoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  );
}
