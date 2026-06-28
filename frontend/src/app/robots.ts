import { MetadataRoute } from "next";

const PRIVATE_ROUTES = ["/dashboard/", "/api/", "/register", "/login", "/forgot-password", "/widget-preview"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Crawlers de IA — permitir explícitamente en páginas públicas de marketing
      { userAgent: "GPTBot",          allow: ["/"], disallow: PRIVATE_ROUTES },
      { userAgent: "OAI-SearchBot",   allow: ["/"], disallow: PRIVATE_ROUTES },
      { userAgent: "ClaudeBot",       allow: ["/"], disallow: PRIVATE_ROUTES },
      { userAgent: "PerplexityBot",   allow: ["/"], disallow: PRIVATE_ROUTES },
      { userAgent: "Google-Extended", allow: ["/"], disallow: PRIVATE_ROUTES },
      // Regla general para el resto de crawlers
      { userAgent: "*",               allow: ["/"], disallow: PRIVATE_ROUTES },
    ],
    sitemap: "https://optimizacrm.com/sitemap.xml",
  };
}
