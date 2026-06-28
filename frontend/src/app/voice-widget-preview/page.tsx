"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

// ─── Widget mockup rendered directly in React — no dependency on voice-widget.js ─

interface WidgetConfig {
  agent_name: string;
  color: string;
  greeting: string;
}

const DEFAULT_CFG: WidgetConfig = {
  agent_name: "Asistente",
  color:      "#EA580C",
  greeting:   "Hola, ¿en qué puedo ayudarte hoy?",
};

function MicIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4zm-2 4a2 2 0 0 1 4 0v6a2 2 0 0 1-4 0V5zm-5 6a1 1 0 0 1 1 1 6 6 0 0 0 12 0 1 1 0 1 1 2 0 8 8 0 0 1-7 7.93V21h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.07A8 8 0 0 1 4 12a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function WidgetPreview({ cfg }: { cfg: WidgetConfig }) {
  const [open, setOpen] = useState(false);

  const gradient = `linear-gradient(135deg, ${cfg.color} 0%, ${darken(cfg.color)} 100%)`;

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 99999, fontFamily: "system-ui,sans-serif" }}>
      {/* Panel */}
      {open && (
        <div style={{
          position: "absolute", bottom: 72, right: 0, width: 300,
          background: "#1e293b", borderRadius: 16,
          boxShadow: "0 8px 40px rgba(0,0,0,.5)", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ padding: "16px 18px 14px", background: gradient, position: "relative" }}>
            <button
              onClick={() => setOpen(false)}
              style={{
                position: "absolute", top: 12, right: 12,
                background: "rgba(255,255,255,.2)", border: "none", borderRadius: "50%",
                width: 24, height: 24, cursor: "pointer", color: "#fff", fontSize: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{cfg.agent_name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.8)", marginTop: 3 }}>Vista previa del agente</div>
          </div>
          {/* Body */}
          <div style={{ padding: "20px 18px" }}>
            <p style={{ fontSize: 12, color: "#64748b", textAlign: "center", marginBottom: 14, fontStyle: "italic" }}>
              {cfg.greeting}
            </p>
            {/* Waveform bars */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, height: 48, marginBottom: 16 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 6, height: 8, borderRadius: 4,
                  background: cfg.color, opacity: 0.4,
                }} />
              ))}
            </div>
            <div style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>
              Haz clic en el micrófono para iniciar
            </div>
            <div style={{
              fontSize: 11, color: "#475569", textAlign: "center",
              padding: "8px 12px", background: "rgba(255,255,255,.04)",
              borderRadius: 8, border: "1px solid #334155",
            }}>
              En producción iniciará una llamada real con tu agente de IA
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={`Hablar con ${cfg.agent_name}`}
        style={{
          width: 60, height: 60, borderRadius: "50%", border: "none",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,.35)",
          background: cfg.color,
          transition: "transform .2s",
        }}
      >
        <MicIcon size={28} />
      </button>
    </div>
  );
}

// ─── Main inner component ─────────────────────────────────────────────────────

function VoiceWidgetPreviewInner() {
  const params = useSearchParams();
  const token  = params.get("token");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  const [cfg, setCfg] = useState<WidgetConfig>(DEFAULT_CFG);

  // Try to load real config (agent name + color) from the backend.
  // If it fails for any reason the mockup still renders with defaults.
  useEffect(() => {
    if (!token) return;
    fetch(`${apiUrl}/voice-widget/config/?token=${token}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        setCfg({
          agent_name: data.config?.agent_name || DEFAULT_CFG.agent_name,
          color:      data.config?.color      || DEFAULT_CFG.color,
          greeting:   data.config?.greeting   || `Hola, soy ${data.config?.agent_name || DEFAULT_CFG.agent_name}. ¿En qué puedo ayudarte?`,
        });
      })
      .catch(() => {});
  }, [token, apiUrl]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-800 p-8">
      <div className="w-full max-w-lg text-center">
        <h1 className="mb-2 text-2xl font-bold text-white">Vista previa — Agente de Voz IA</h1>
        <p className="mb-8 text-sm text-slate-400">
          El botón flotante aparece en la esquina inferior derecha.
          Haz clic en el micrófono para ver el panel del agente.
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

      {/* Widget rendered directly — always visible */}
      <WidgetPreview cfg={cfg} />
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

// ─── Helper ───────────────────────────────────────────────────────────────────

function darken(hex: string): string {
  try {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - 50);
    const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - 30);
    const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - 20);
    return "#" + [r, g, b].map((n) => ("0" + n.toString(16)).slice(-2)).join("");
  } catch { return "#" + hex; }
}
