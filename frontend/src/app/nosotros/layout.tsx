const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Nelson Alvarez",
  jobTitle: "Founder & CEO",
  worksFor: {
    "@type": "Organization",
    name: "OptimizaCRM",
  },
  url: "https://optimizacrm.com/nosotros",
  knowsAbout: ["CRM", "Inteligencia Artificial", "SaaS", "PYMEs", "Ventas"],
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "OptimizaCRM",
  url: "https://optimizacrm.com",
  logo: "https://optimizacrm.com/logo.png",
  foundingDate: "2024",
  foundingLocation: {
    "@type": "Place",
    addressCountry: "GT",
    addressLocality: "Guatemala",
  },
  description:
    "CRM SaaS con inteligencia artificial para PYMEs en Latinoamérica. Pipeline visual, lead scoring automático, agente de voz IA 24/7 y WhatsApp integrado.",
  areaServed: ["GT", "MX", "CO", "PE", "CL", "AR"],
  sameAs: ["https://optimizacrm.com"],
};

export default function NosotrosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      {children}
    </>
  );
}
