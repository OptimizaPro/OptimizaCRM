import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://optimizacrm.com";
  const now = new Date();

  return [
    { url: base,                      lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/caracteristicas`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/precios`,         lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/voz-ia`,                          lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/servicios/implementacion`,         lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/servicios/whatsapp-business`,      lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/servicios/voz-ia`,                 lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/guatemala`,                          lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/nosotros`,                         lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contacto`,        lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/privacidad`,      lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/terminos`,        lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];
}
