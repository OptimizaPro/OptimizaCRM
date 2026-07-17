"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cmsApi } from "@/lib/api";

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/verify-email", "/accept-invite"];

/**
 * Reads website_widget_token from CMS general settings and injects
 * hub-widget.js — the unified multi-channel contact hub (form, WhatsApp,
 * Voice AI, Chatbot RAG) using a single FAB button.
 * Add this once to PublicFooter — it covers all landing pages.
 */
export function PublicWidgetLoader() {
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);

  const isAuthPage = AUTH_PATHS.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (isAuthPage) return;
    cmsApi.getSection("general")
      .then(({ data }) => {
        const t = data?.website_widget_token || data?.website_voice_widget_token;
        if (typeof t === "string" && t.length > 0) setToken(t);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!token || isAuthPage) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

    ["ocw-widget-script", "ocw-voice-widget-script", "ocw-hub-script"].forEach((id) =>
      document.getElementById(id)?.remove()
    );
    ["optimiza-crm-widget", "optimiza-voice-widget", "optimiza-hub-widget"].forEach((id) =>
      document.getElementById(id)?.remove()
    );

    const s = document.createElement("script");
    s.id = "ocw-hub-script";
    s.src = "/hub-widget.js";
    s.setAttribute("data-token", token);
    s.setAttribute("data-api", apiUrl);
    s.async = true;
    document.body.appendChild(s);

    return () => {
      document.getElementById("ocw-hub-script")?.remove();
      document.getElementById("optimiza-hub-widget")?.remove();
    };
  }, [token]);

  return null;
}
