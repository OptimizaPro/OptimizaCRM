"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function WidgetPreviewInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    if (!token) return;
    // Inject widget script dynamically
    const existing = document.getElementById("ocw-script");
    if (existing) existing.remove();
    const s = document.createElement("script");
    s.id = "ocw-script";
    s.src = "/widget.js";
    s.setAttribute("data-token", token);
    s.setAttribute("data-api", apiUrl);
    s.async = true;
    document.body.appendChild(s);
    return () => { s.remove(); };
  }, [token, apiUrl]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-800 p-8">
      <div className="max-w-lg text-center">
        <h1 className="text-2xl font-bold text-white mb-3">Vista previa del widget</h1>
        <p className="text-slate-400 text-sm mb-6">
          Así verán el widget los visitantes de tu web. El botón flotante aparece en la esquina inferior derecha.
        </p>
        {/* Fake web page mockup */}
        <div className="rounded-2xl border border-slate-600 bg-slate-900 p-8 text-left shadow-xl">
          <div className="h-4 w-32 rounded bg-slate-700 mb-3" />
          <div className="h-3 w-full rounded bg-slate-700/60 mb-2" />
          <div className="h-3 w-4/5 rounded bg-slate-700/60 mb-2" />
          <div className="h-3 w-3/4 rounded bg-slate-700/60 mb-6" />
          <div className="h-3 w-full rounded bg-slate-700/60 mb-2" />
          <div className="h-3 w-5/6 rounded bg-slate-700/60" />
        </div>
        {!token && (
          <p className="mt-4 text-sm text-red-400">No se encontró token. Accede desde el panel de Integraciones.</p>
        )}
      </div>
    </div>
  );
}

export default function WidgetPreviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-800" />}>
      <WidgetPreviewInner />
    </Suspense>
  );
}
