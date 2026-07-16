"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { WebWidgetPanel } from "@/components/dashboard/web-widget-panel";
import { widgetApi, chatbotApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { FeatureGate } from "@/components/dashboard/feature-gate";
import {
  LayoutGrid, Users, MessageCircle, Mic, ExternalLink,
  Copy, Check, Zap, Globe, TrendingUp, ChevronDown, ChevronUp, Bot,
} from "lucide-react";
import Link from "next/link";

// ─── Snippet copy ─────────────────────────────────────────────────────────────

function TokenCopy({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const short = `${token.slice(0, 8)}…${token.slice(-4)}`;

  const copy = () => {
    const origin  = typeof window !== "undefined" ? window.location.origin : "";
    const apiUrl  = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
    const snippet = `<script\n  src="${origin}/hub-widget.js"\n  data-token="${token}"\n  data-api="${apiUrl}"\n  async\n></script>`;
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={copy}
      className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-400 hover:border-orange-500/40 hover:text-orange-400 transition-colors font-mono"
      title="Copiar snippet de embed"
    >
      <span>{short}</span>
      {copied
        ? <Check className="h-3.5 w-3.5 text-green-400" />
        : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Channel badge ────────────────────────────────────────────────────────────

function ChannelBadge({
  icon: Icon,
  label,
  active,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
      active
        ? "bg-green-900/30 text-green-400 border border-green-800/40"
        : "bg-slate-800 text-slate-500 border border-slate-700"
    }`}>
      <Icon className="h-3 w-3" />
      {label}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HubPage() {
  const { tokens, organization } = useAuthStore();
  const [configOpen, setConfigOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["web-widget"],
    queryFn:  () => widgetApi.get(tokens!.access, organization!.id),
    enabled:  !!tokens && !!organization,
  });

  const { data: chatbotData } = useQuery({
    queryKey: ["chatbot-manage", organization?.id],
    queryFn:  () => chatbotApi.get(tokens!.access, organization!.id),
    enabled:  !!tokens && !!organization,
  });

  const widget         = data?.widget ?? null;
  const cfg            = widget?.config ?? {};
  const formActive     = Boolean(widget?.is_active);
  const waActive       = Boolean(cfg.whatsapp_enabled) && Boolean(cfg.whatsapp_number);
  const chatbotActive  = Boolean(chatbotData?.widget?.is_active);
  const activeChannels = [formActive, waActive, chatbotActive].filter(Boolean).length;

  return (
    <FeatureGate
      minPlan="pro"
      featureName="Hub de Contacto"
      featureDescription="Gestiona todos tus canales de comunicación en un solo lugar: WhatsApp, email, chat web y más."
      highlights={["Vista unificada de todos los canales", "Asignación de conversaciones a agentes", "Etiquetas y prioridades", "Historial completo por contacto"]}
    >
    <div className="flex h-full flex-col overflow-hidden">
      <DashboardHeader title="Hub de Contacto" />

      <div className="flex-1 overflow-y-auto bg-slate-900/30">
        <div className="mx-auto max-w-6xl px-6 py-8">

          {/* ── Page header ─────────────────────────────────────────────────── */}
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-100">Hub de Contacto</h1>
              <p className="mt-1 text-sm text-slate-400">
                Widget flotante multicanal — un único script que unifica Formulario, WhatsApp y Voz IA.
              </p>
            </div>
            {widget && (
              <a
                href={`/hub-preview?token=${widget.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 hover:border-orange-500/40 hover:text-orange-400 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Vista previa
              </a>
            )}
          </div>

          {/* ── Stat cards ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
            {[
              {
                label: "Leads captados",
                value: isLoading ? "—" : String(widget?.lead_count ?? 0),
                icon: Zap,
                color: "text-orange-400",
                bg:    "bg-orange-950/30",
              },
              {
                label: "Canales activos",
                value: isLoading ? "—" : `${activeChannels}/4`,
                icon: LayoutGrid,
                color: "text-sky-400",
                bg:    "bg-sky-950/30",
              },
              {
                label: "Formulario",
                value: isLoading ? "—" : formActive ? "Activo" : "Inactivo",
                icon: Users,
                color: formActive ? "text-green-400" : "text-slate-500",
                bg:    formActive ? "bg-green-950/30" : "bg-slate-800/50",
              },
              {
                label: "WhatsApp",
                value: isLoading ? "—" : waActive ? "Activo" : "Inactivo",
                icon: MessageCircle,
                color: waActive ? "text-green-400" : "text-slate-500",
                bg:    waActive ? "bg-green-950/30" : "bg-slate-800/50",
              },
              {
                label: "Chatbot RAG",
                value: isLoading ? "—" : chatbotActive ? "Activo" : "Inactivo",
                icon: Bot,
                color: chatbotActive ? "text-sky-400" : "text-slate-500",
                bg:    chatbotActive ? "bg-sky-950/30" : "bg-slate-800/50",
              },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex flex-col gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg} ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-100">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Hub status card ──────────────────────────────────────────────── */}
          {widget ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-950/40 text-orange-400">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-100">Widget activo</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {widget.lead_count} leads · {activeChannels} canal{activeChannels !== 1 ? "es" : ""} configurado{activeChannels !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Channels */}
                <div className="flex items-center gap-2 flex-wrap">
                  <ChannelBadge icon={Users}         label="Formulario"  active={formActive}    />
                  <ChannelBadge icon={MessageCircle} label="WhatsApp"    active={waActive}      />
                  <ChannelBadge icon={Bot}           label="Chatbot RAG" active={chatbotActive} />
                  <Link href="/dashboard/voice-plans">
                    <ChannelBadge icon={Mic} label="Voz IA" active={false} />
                  </Link>
                </div>
              </div>

              {/* Token + copy snippet */}
              <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-1">Token de embed</p>
                  <TokenCopy token={widget.token} />
                </div>
                <a
                  href={`/hub-preview?token=${widget.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:border-orange-500/40 hover:text-orange-400 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Previsualizar
                </a>
              </div>

              {/* Auto-channels hint */}
              <p className="mt-3 text-xs text-slate-500">
                <span className="text-slate-400">Voz IA</span> se activa desde{" "}
                <Link href="/dashboard/voice-plans" className="text-orange-400 hover:text-orange-300 underline underline-offset-2">
                  Agente de Voz IA
                </Link>
                {" "}·{" "}
                <span className="text-slate-400">Chatbot RAG</span> se activa desde{" "}
                <Link href="/dashboard/chatbot" className="text-orange-400 hover:text-orange-300 underline underline-offset-2">
                  Chatbot RAG
                </Link>
                {" "}— el widget los detecta automáticamente.
              </p>
            </div>
          ) : !isLoading && (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-8 mb-6 flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-500">
                <Globe className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-300">Aún no tienes un hub creado</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Configura los canales a continuación y pulsa <strong className="text-slate-400">Crear widget</strong> para generar tu hub.
              </p>
            </div>
          )}

          {/* ── Configuration accordion ──────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
            <button
              onClick={() => setConfigOpen((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-900/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="font-semibold text-slate-100">Configurar canales</span>
                {widget && (
                  <span className="rounded-full bg-orange-950/40 px-2.5 py-0.5 text-xs font-medium text-orange-400">
                    {activeChannels} activo{activeChannels !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {configOpen
                ? <ChevronUp   className="h-4 w-4 text-slate-400" />
                : <ChevronDown className="h-4 w-4 text-slate-400" />
              }
            </button>

            {configOpen && (
              <div className="border-t border-slate-800 p-5">
                <WebWidgetPanel />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
    </FeatureGate>
  );
}
