import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";

// ─── JSON-LD schemas ──────────────────────────────────────────────────────────

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "OptimizaCRM",
  description:
    "CRM con inteligencia artificial para equipos de ventas de PYMEs en Latinoamérica. Lead scoring automático, predicción de churn, pipeline visual, automatizaciones y soporte completo en español.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://optimizacrm.com",
  inLanguage: "es",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: "19",
    highPrice: "95",
    offerCount: "4",
  },
  featureList: [
    "Lead Scoring con IA",
    "Predicción de Churn con IA",
    "Pipeline Kanban visual",
    "Automatización de ventas",
    "Inbox multicanal Email y WhatsApp",
    "Previsión de ingresos con IA",
    "Widget web embebible",
    "Multi-tenant SaaS",
    "Soporte en español",
  ],
  audience: {
    "@type": "Audience",
    audienceType: "PYMEs y equipos de ventas en Latinoamérica",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "OptimizaCRM",
  legalName: "OptimizaPro",
  url: "https://optimizacrm.com",
  logo: "https://optimizacrm.com/logo.png",
  email: "hola@optimizacrm.com",
  contactPoint: {
    "@type": "ContactPoint",
    email: "hola@optimizacrm.com",
    contactType: "sales",
    availableLanguage: "Spanish",
  },
  sameAs: [
    "https://linkedin.com/company/optimizacrm",
    "https://x.com/optimizacrm",
  ],
  knowsAbout: [
    "CRM software",
    "Lead Scoring",
    "Sales Automation",
    "Artificial Intelligence for Sales",
    "LATAM SaaS",
    "PYMEs",
  ],
};

// WebSite — habilita Sitelinks Search Box en Google y define la estructura del sitio para crawlers de IA
const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "OptimizaCRM",
  url: "https://optimizacrm.com",
  description:
    "CRM con inteligencia artificial para equipos de ventas de PYMEs en Latinoamérica.",
  inLanguage: "es",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://optimizacrm.com/caracteristicas?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://optimizacrm.com"),
  title: {
    default: "OptimizaCRM · CRM con IA para PYMEs",
    template: "%s | OptimizaCRM",
  },
  description:
    "Plataforma CRM con inteligencia artificial para equipos de ventas. Lead scoring, pipeline visual, WhatsApp integrado y previsión de ingresos.",
  keywords: [
    "CRM para PYMEs",
    "CRM con IA",
    "CRM con WhatsApp",
    "pipeline de ventas",
    "lead scoring",
    "software CRM español",
    "WhatsApp CRM",
  ],
  authors: [{ name: "OptimizaPro", url: "https://optimizacrm.com" }],
  creator: "OptimizaPro",
  publisher: "OptimizaPro",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://optimizacrm.com",
    siteName: "OptimizaCRM",
    title: "OptimizaCRM · CRM con IA para PYMEs",
    description:
      "Gestiona leads, pipeline y ventas con IA. WhatsApp, Email y más canales. Prueba gratis 14 días sin tarjeta.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OptimizaCRM - CRM con IA para PYMEs" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OptimizaCRM · CRM con IA para PYMEs",
    description: "Gestiona leads, pipeline y ventas con inteligencia artificial.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://optimizacrm.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full dark`}>
      <body className="min-h-full font-sans antialiased" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
        />
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
