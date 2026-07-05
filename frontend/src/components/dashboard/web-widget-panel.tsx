"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Code2, Copy, Check, Zap, MessageCircle,
  ToggleLeft, ToggleRight, ExternalLink, Users, Rocket,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { widgetApi, cmsApi, type WebWidget } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500";

// ─── Snippet ──────────────────────────────────────────────────────────────────

function SnippetBox({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const snippet = `<script\n  src="${origin}/hub-widget.js"\n  data-token="${token}"\n  data-api="${apiUrl}"\n  async\n></script>`;

  const copy = () => {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs text-slate-300">
      <pre className="overflow-x-auto whitespace-pre">{snippet}</pre>
      <button
        onClick={copy}
        className="absolute right-3 top-3 rounded-md border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:text-orange-400 transition-colors"
        title="Copiar snippet"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

// ─── Channel section wrapper ──────────────────────────────────────────────────

function ChannelSection({
  icon: Icon,
  title,
  description,
  active,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  active: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn(
      "rounded-xl border transition-colors",
      active ? "border-slate-700 bg-slate-900/60" : "border-slate-800 bg-slate-900/20",
    )}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            active ? "bg-orange-950/50 text-orange-400" : "bg-slate-800 text-slate-500",
          )}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className={cn("text-sm font-semibold", active ? "text-slate-200" : "text-slate-400")}>{title}</p>
            <p className="text-[11px] text-slate-500">{description}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="text-slate-400 hover:text-orange-400 transition-colors"
          title={active ? `Desactivar ${title}` : `Activar ${title}`}
        >
          {active
            ? <ToggleRight className="h-6 w-6 text-orange-500" />
            : <ToggleLeft className="h-6 w-6" />}
        </button>
      </div>

      {active && children && (
        <div className="border-t border-slate-800 px-4 pb-4 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function WebWidgetPanel() {
  const { tokens, organization } = useAuthStore();
  const qc = useQueryClient();
  const auth = { token: tokens!.access, orgId: organization!.id };

  const { data, isLoading } = useQuery({
    queryKey: ["web-widget"],
    queryFn: () => widgetApi.get(auth.token, auth.orgId),
    enabled: !!tokens && !!organization,
  });

  const widget = data?.widget ?? null;

  const [form, setForm] = useState<Partial<WebWidget>>({});
  const [dirty, setDirty] = useState(false);

  const defaultConfig = {
    color:             "#EA580C",
    title:             "¿Podemos ayudarte?",
    subtitle:          "Escríbenos y te contactamos pronto",
    button_text:       "Enviar mensaje",
    success_message:   "¡Gracias! Nos pondremos en contacto pronto.",
    contact_reasons:   [] as string[],
    whatsapp_enabled:  false,
    whatsapp_number:   "",
    whatsapp_message:  "Hola, me gustaría más información",
  };

  const current: WebWidget = widget ?? {
    id: "", token: "", mode: "form", is_active: true, lead_count: 0,
    config: defaultConfig,
  };

  const merged: WebWidget = {
    ...current,
    ...form,
    config: { ...defaultConfig, ...current.config, ...(form.config ?? {}) },
  };

  const patch = (key: keyof WebWidget, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };
  const patchCfg = (key: string, value: unknown) => {
    setForm((f) => ({ ...f, config: { ...(f.config ?? {}), [key]: value } }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => widgetApi.save(auth.token, auth.orgId, merged),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["web-widget"] });
      setForm({});
      setDirty(false);
    },
  });

  const [publishedOnWeb, setPublishedOnWeb] = useState(false);
  const [publishError, setPublishError] = useState("");
  const publishMutation = useMutation({
    mutationFn: async (widgetToken: string) => {
      const existing = await cmsApi.getSection("general").catch(() => ({ data: {} }));
      return cmsApi.updateSection(auth.token, "general", {
        ...(existing?.data ?? {}),
        website_widget_token: widgetToken,
      }, auth.orgId);
    },
    onSuccess: () => { setPublishedOnWeb(true); setPublishError(""); },
    onError: (e: Error) => setPublishError(e.message || "Error al publicar"),
  });

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-slate-800" />;
  }

  const cfg = merged.config;
  const whatsappEnabled = Boolean(cfg.whatsapp_enabled);
  const formEnabled = Boolean(merged.is_active);

  return (
    <Card className="rounded-2xl border border-slate-700 bg-slate-950">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-base">Hub de Contacto</CardTitle>
          </div>
          {widget && (
            <div className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1">
              <Zap className="h-3 w-3 text-orange-400" />
              <span className="text-xs font-semibold text-slate-300">{widget.lead_count} leads captados</span>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Gestiona los canales del widget flotante de forma independiente. Cada canal tiene su propio toggle.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">

        {/* ── Canal: Formulario de contacto ─────────────────────────────────── */}
        <ChannelSection
          icon={Users}
          title="Formulario de contacto"
          description="Captura leads directamente en tu CRM"
          active={formEnabled}
          onToggle={() => patch("is_active", !merged.is_active)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Título del widget</label>
              <Input
                className={inputCls}
                value={cfg.title ?? ""}
                onChange={(e) => patchCfg("title", e.target.value)}
                placeholder="¿Podemos ayudarte?"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Subtítulo</label>
              <Input
                className={inputCls}
                value={cfg.subtitle ?? ""}
                onChange={(e) => patchCfg("subtitle", e.target.value)}
                placeholder="Escríbenos y te contactamos pronto"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Texto del botón enviar</label>
              <Input
                className={inputCls}
                value={cfg.button_text ?? ""}
                onChange={(e) => patchCfg("button_text", e.target.value)}
                placeholder="Enviar mensaje"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Mensaje de éxito</label>
              <Input
                className={inputCls}
                value={cfg.success_message ?? ""}
                onChange={(e) => patchCfg("success_message", e.target.value)}
                placeholder="¡Gracias! Nos contactamos pronto."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Razones de contacto
                <span className="ml-1 text-slate-500">(una por línea, dejar vacío para ocultar)</span>
              </label>
              <textarea
                rows={4}
                className={inputCls + " resize-none"}
                value={(cfg.contact_reasons ?? []).join("\n")}
                onChange={(e) => {
                  const lines = e.target.value.split("\n").map((l) => l.trimStart());
                  patchCfg("contact_reasons", lines);
                }}
                placeholder={"Quiero una demo\nTengo dudas sobre precios\nSoy partner\nOtro"}
              />
            </div>
          </div>
        </ChannelSection>

        {/* ── Canal: WhatsApp ───────────────────────────────────────────────── */}
        <ChannelSection
          icon={MessageCircle}
          title="WhatsApp"
          description="Redirige al visitante directamente a tu WhatsApp"
          active={whatsappEnabled}
          onToggle={() => patchCfg("whatsapp_enabled", !whatsappEnabled)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Número de WhatsApp</label>
              <Input
                className={inputCls}
                value={cfg.whatsapp_number ?? ""}
                onChange={(e) => patchCfg("whatsapp_number", e.target.value)}
                placeholder="502XXXXXXXX (con código de país, sin +)"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Mensaje predefinido</label>
              <Input
                className={inputCls}
                value={cfg.whatsapp_message ?? ""}
                onChange={(e) => patchCfg("whatsapp_message", e.target.value)}
                placeholder="Hola, me gustaría más información"
              />
            </div>
            {!cfg.whatsapp_number && (
              <p className="sm:col-span-2 text-xs text-amber-400/80">
                Ingresa un número para activar el botón de WhatsApp en el widget.
              </p>
            )}
          </div>
        </ChannelSection>

        {/* ── Color general ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-800 px-4 py-3">
          <label className="mb-2 block text-xs font-medium text-slate-400">Color principal del widget</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={cfg.color ?? "#EA580C"}
              onChange={(e) => patchCfg("color", e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-lg border border-slate-700 bg-slate-800 p-0.5"
            />
            <Input
              className={cn(inputCls, "font-mono")}
              value={cfg.color ?? "#EA580C"}
              onChange={(e) => patchCfg("color", e.target.value)}
              placeholder="#EA580C"
              maxLength={7}
            />
          </div>
        </div>

        {/* ── Guardar ───────────────────────────────────────────────────────── */}
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={(!dirty && !!widget) || saveMutation.isPending}
          className="bg-orange-600 hover:bg-orange-500 text-white"
        >
          {saveMutation.isPending ? "Guardando…" : widget ? "Guardar cambios" : "Crear widget"}
        </Button>

        {/* ── Snippet y publicación ─────────────────────────────────────────── */}
        {widget && (
          <div className="space-y-2 border-t border-slate-800 pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-400">Código para embeber el widget</p>
              <a
                href={`/hub-preview?token=${widget.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"
              >
                <ExternalLink className="h-3 w-3" /> Vista previa
              </a>
            </div>
            <SnippetBox token={widget.token} />
            <p className="text-[11px] text-slate-500">
              Un solo script unifica todos los canales activos: Formulario, WhatsApp y Agente de Voz IA.
            </p>

            {publishError && (
              <p className="mt-3 text-xs text-red-400">{publishError}</p>
            )}
            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-slate-200">Activar en optimizacrm.com</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Publica este widget en todas las páginas de tu landing</p>
              </div>
              <Button
                size="sm"
                onClick={() => publishMutation.mutate(widget.token)}
                disabled={publishMutation.isPending || publishedOnWeb}
                className={cn(
                  "gap-1.5 text-xs",
                  publishedOnWeb
                    ? "bg-green-700 hover:bg-green-700 text-white cursor-default"
                    : "bg-orange-600 hover:bg-orange-500 text-white"
                )}
              >
                {publishedOnWeb ? (
                  <><Check className="h-3 w-3" /> Publicado</>
                ) : (
                  <><Rocket className="h-3 w-3" /> {publishMutation.isPending ? "Publicando…" : "Publicar"}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
