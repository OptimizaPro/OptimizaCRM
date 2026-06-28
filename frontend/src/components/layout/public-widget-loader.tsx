"use client";

import { useEffect, useState } from "react";
import { cmsApi } from "@/lib/api";

/**
 * Reads the website_widget_token from CMS general settings
 * and dynamically injects widget.js into the page.
 * Add this once to PublicFooter — it covers all landing pages.
 */
export function PublicWidgetLoader() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    cmsApi.getSection("general")
      .then(({ data }) => {
        const t = data?.website_widget_token;
        if (typeof t === "string" && t.length > 0) setToken(t);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

    // Remove any previously injected instance
    document.getElementById("ocw-widget-script")?.remove();
    document.getElementById("optimiza-crm-widget")?.remove();

    const s = document.createElement("script");
    s.id = "ocw-widget-script";
    s.src = "/widget.js";
    s.setAttribute("data-token", token);
    s.setAttribute("data-api", apiUrl);
    s.async = true;
    document.body.appendChild(s);

    return () => {
      document.getElementById("ocw-widget-script")?.remove();
      document.getElementById("optimiza-crm-widget")?.remove();
    };
  }, [token]);

  return null;
}
