"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { Mic } from "lucide-react";

function VoiceWidgetPreviewInner() {
  const params = useSearchParams();
  const token  = params.get("token");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    if (!token) return;

    document.getElementById("ocw-voice-script")?.remove();
    document.getElementById("optimiza-voice-widget")?.remove();

    const s = document.createElement("script");
    s.id  = "ocw-voice-script";
    s.src = "/voice-widget.js";
    s.setAttribute("data-token", token);
    s.setAttribute("data-api",   apiUrl);
    s.async = true;
    document.body.appendChild(s);

    return () => {
      document.getElementById("ocw-voice-script")?.remove();
      document.getElementById("optimiza-voice-widget")?.remove();
    };
  }, [token, apiUrl]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-800 p-8">
      <div className="w-full max-w-lg text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Mic className="h-5 w-5 text-orange-400" />
          <h1 className="text-2xl font-bold text-white">Vista previa — Agente de Voz IA</h1>
        </div>
        <p className="mb-8 text-sm text-slate-400">
          El botón flotante del agente de voz aparece en la esquina inferior derecha.
          Haz clic en el micrófono para iniciar una llamada de prueba.
        </p>

        {/* Fake web page mockup */}
        <div className="rounded-2xl border border-slate-600 bg-slate-900 p-8 text-left shadow-xl">
          <div className="mb-3 h-4 w-40 rounded bg-slate-700" />
          <div className="mb-2 h-3 w-full rounded bg-slate-700/60" />
          <div className="mb-2 h-3 w-4/5 rounded bg-slate-700/60" />
          <div className="mb-6 h-3 w-3/4 rounded bg-slate-700/60" />
          <div className="mb-2 h-3 w-full rounded bg-slate-700/60" />
          <div className="mb-2 h-3 w-5/6 rounded bg-slate-700/60" />
          <div className="h-3 w-2/3 rounded bg-slate-700/60" />
        </div>

        {!token && (
          <p className="mt-6 text-sm text-red-400">
            No se encontró token. Accede desde el panel de Integraciones → Agente de Voz IA.
          </p>
        )}
      </div>
    </div>
  );
}

export default function VoiceWidgetPreviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-800" />}>
      <VoiceWidgetPreviewInner />
    </Suspense>
  );
}
