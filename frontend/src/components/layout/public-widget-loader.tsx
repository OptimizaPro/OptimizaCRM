"use client";

import { useEffect, useState } from "react";
import { cmsApi } from "@/lib/api";

/**
 * Reads website_widget_token and website_voice_widget_token from CMS general
 * settings and dynamically injects widget.js / voice-widget.js into the page.
 * Add this once to PublicFooter — it covers all landing pages.
 */
export function PublicWidgetLoader() {
  const [webToken, setWebToken] = useState<string | null>(null);
  const [voiceToken, setVoiceToken] = useState<string | null>(null);

  useEffect(() => {
    cmsApi.getSection("general")
      .then(({ data }) => {
        const wt = data?.website_widget_token;
        const vt = data?.website_voice_widget_token;
        if (typeof wt === "string" && wt.length > 0) setWebToken(wt);
        if (typeof vt === "string" && vt.length > 0) setVoiceToken(vt);
      })
      .catch(() => {});
  }, []);

  // ── Web (form/WhatsApp) widget ────────────────────────────────────────────
  useEffect(() => {
    if (!webToken) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

    document.getElementById("ocw-widget-script")?.remove();
    document.getElementById("optimiza-crm-widget")?.remove();

    const s = document.createElement("script");
    s.id = "ocw-widget-script";
    s.src = "/widget.js";
    s.setAttribute("data-token", webToken);
    s.setAttribute("data-api", apiUrl);
    s.async = true;
    document.body.appendChild(s);

    return () => {
      document.getElementById("ocw-widget-script")?.remove();
      document.getElementById("optimiza-crm-widget")?.remove();
    };
  }, [webToken]);

  // ── Voice AI widget ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!voiceToken) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

    document.getElementById("ocw-voice-widget-script")?.remove();
    document.getElementById("optimiza-voice-widget")?.remove();

    const s = document.createElement("script");
    s.id = "ocw-voice-widget-script";
    s.src = "/voice-widget.js";
    s.setAttribute("data-token", voiceToken);
    s.setAttribute("data-api", apiUrl);
    s.async = true;
    document.body.appendChild(s);

    return () => {
      document.getElementById("ocw-voice-widget-script")?.remove();
      document.getElementById("optimiza-voice-widget")?.remove();
    };
  }, [voiceToken]);

  return null;
}
