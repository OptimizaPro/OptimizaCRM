"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import {
  integrationsApi,
  whatsappTemplatesApi,
  type WhatsAppTemplate,
  type TemplateComponent,
} from "@/lib/api";
import Link from "next/link";
import {
  Plus, X, Pencil, Trash2, Send, AlertTriangle,
  WifiOff, ExternalLink, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Tab navigation (shared with conversations page) ──────────────────────────

function WhatsAppTabs() {
  const pathname = usePathname();
  const tabs = [
    { label: "Conversaciones", href: "/dashboard/whatsapp" },
    { label: "Plantillas",     href: "/dashboard/whatsapp/plantillas" },
  ];
  return (
    <nav className="flex border-b border-slate-800 bg-slate-950 px-4">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-orange-500 text-orange-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Not-connected card ───────────────────────────────────────────────────────

function NotConnectedCard() {
  return (
    <div className="mx-4 my-3 flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3.5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-800">
        <WifiOff className="h-4 w-4 text-slate-400" />
      </div>
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <p className="text-sm font-semibold text-slate-200">WhatsApp no está conectado</p>
        <p className="text-xs text-slate-400">
          Conecta tu integración de WhatsApp Business para gestionar plantillas.
        </p>
      </div>
      <Link
        href="/dashboard/integrations"
        className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors"
      >
        Ir a Integraciones
        <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ─── Status / category badges ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: WhatsAppTemplate["status"] }) {
  const map: Record<WhatsAppTemplate["status"], { label: string; cls: string }> = {
    draft:    { label: "Borrador",   cls: "bg-slate-700 text-slate-200" },
    pending:  { label: "Pendiente",  cls: "bg-yellow-600/30 text-yellow-300" },
    approved: { label: "Aprobada",   cls: "bg-green-600/30 text-green-300" },
    rejected: { label: "Rechazada",  cls: "bg-red-600/30 text-red-300" },
    paused:   { label: "Pausada",    cls: "bg-gray-600/30 text-gray-300" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-slate-700 text-slate-300" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function CategoryBadge({ category }: { category: WhatsAppTemplate["category"] }) {
  const map: Record<WhatsAppTemplate["category"], { label: string; cls: string }> = {
    MARKETING:      { label: "Marketing",    cls: "bg-purple-600/30 text-purple-300" },
    UTILITY:        { label: "Utilidad",     cls: "bg-blue-600/30 text-blue-300" },
    AUTHENTICATION: { label: "Autenticación",cls: "bg-orange-600/30 text-orange-300" },
  };
  const { label, cls } = map[category] ?? { label: category, cls: "bg-slate-700 text-slate-300" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ─── WhatsApp preview bubble ──────────────────────────────────────────────────

function WhatsAppPreview({
  header, body, footer, buttons,
}: {
  header?: string;
  body?: string;
  footer?: string;
  buttons?: { type: "QUICK_REPLY" | "URL"; text: string; url?: string }[];
}) {
  const renderBody = (text: string) =>
    text.replace(/\{\{(\d+)\}\}/g, (_: string, n: string) => `[variable ${n}]`);

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-[#0B141A] p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2 font-medium">Vista previa</p>
      <div className="flex justify-end">
        <div className="max-w-[90%] rounded-lg overflow-hidden shadow-md">
          {header && (
            <div className="bg-[#005C4B] px-3 py-2">
              <p className="text-white font-semibold text-sm">{header}</p>
            </div>
          )}
          <div className="bg-[#202C33] px-3 py-2">
            {body ? (
              <p className="text-slate-100 text-sm whitespace-pre-wrap leading-relaxed">
                {renderBody(body)}
              </p>
            ) : (
              <p className="text-slate-500 text-sm italic">Escribe el cuerpo del mensaje...</p>
            )}
            {footer && <p className="text-slate-400 text-xs mt-1">{footer}</p>}
            <p className="text-slate-500 text-[10px] text-right mt-1">14:35</p>
          </div>
          {buttons && buttons.length > 0 && (
            <div className="bg-[#202C33] border-t border-[#2A3942]">
              {buttons.map((btn, i) => (
                <button key={i} className="w-full text-center text-[#00A884] text-sm py-2 border-b border-[#2A3942] last:border-b-0">
                  {btn.text || "Botón"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface ButtonDef { type: "QUICK_REPLY" | "URL"; text: string; url: string }

interface FormState {
  name: string;
  category: WhatsAppTemplate["category"];
  language: string;
  header: string;
  body: string;
  footer: string;
  buttons: ButtonDef[];
}

const DEFAULT_FORM: FormState = {
  name: "", category: "MARKETING", language: "es",
  header: "", body: "", footer: "", buttons: [],
};

function buildComponents(form: FormState): TemplateComponent[] {
  const c: TemplateComponent[] = [];
  if (form.header.trim()) c.push({ type: "HEADER", format: "TEXT", text: form.header.trim() });
  if (form.body.trim())   c.push({ type: "BODY",   text: form.body.trim() });
  if (form.footer.trim()) c.push({ type: "FOOTER", text: form.footer.trim() });
  if (form.buttons.length > 0) {
    c.push({
      type: "BUTTONS",
      buttons: form.buttons.map((b) => ({
        type: b.type, text: b.text,
        ...(b.type === "URL" && b.url ? { url: b.url } : {}),
      })),
    });
  }
  return c;
}

function parseComponents(components: TemplateComponent[]): Partial<FormState> {
  const p: Partial<FormState> = { header: "", body: "", footer: "", buttons: [] };
  for (const c of components) {
    if (c.type === "HEADER")  p.header  = c.text ?? "";
    if (c.type === "BODY")    p.body    = c.text ?? "";
    if (c.type === "FOOTER")  p.footer  = c.text ?? "";
    if (c.type === "BUTTONS") p.buttons = (c.buttons ?? []).map((b) => ({ type: b.type, text: b.text, url: b.url ?? "" }));
  }
  return p;
}

// ─── Template panel (create / edit) ──────────────────────────────────────────

function TemplatePanel({
  editing, hasWabaId, onClose, onSaveDraft, onSaveAndSubmit, isSaving,
}: {
  editing: WhatsAppTemplate | null;
  hasWabaId: boolean;
  onClose: () => void;
  onSaveDraft: (data: Partial<WhatsAppTemplate>) => void;
  onSaveAndSubmit: (data: Partial<WhatsAppTemplate>) => void;
  isSaving: boolean;
}) {
  const initial: FormState = editing
    ? { name: editing.name, category: editing.category, language: editing.language, ...parseComponents(editing.components) } as FormState
    : DEFAULT_FORM;

  const [form, setForm] = useState<FormState>(initial);
  const [nameError, setNameError] = useState("");

  const set = (key: keyof FormState, val: unknown) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const validateName = (val: string) => {
    if (!/^[a-z0-9_]*$/.test(val)) {
      setNameError("Solo minúsculas, números y guiones bajos.");
    } else {
      setNameError("");
    }
  };

  const toPayload = (): Partial<WhatsAppTemplate> => ({
    name: form.name, category: form.category,
    language: form.language, components: buildComponents(form),
  });

  const canSubmit = form.name && !nameError && form.body.trim();

  const labelClass = "block text-xs font-medium text-slate-400 mb-1";
  const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30";

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-4xl flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="font-semibold text-slate-100">
            {editing ? "Editar plantilla" : "Nueva plantilla"}
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — form + preview side by side */}
        <div className="flex flex-1 overflow-hidden">

          {/* Form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">

            {/* Name */}
            <div>
              <label className={labelClass}>Nombre *</label>
              <input
                className={inputClass}
                value={form.name}
                placeholder="recordatorio_cita"
                onChange={(e) => { set("name", e.target.value); validateName(e.target.value); }}
              />
              {nameError
                ? <p className="mt-1 text-xs text-red-400">{nameError}</p>
                : <p className="mt-1 text-xs text-slate-500">Solo minúsculas, números y guiones bajos. Ej: recordatorio_cita</p>
              }
            </div>

            {/* Category + Language */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Categoría *</label>
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(e) => set("category", e.target.value as WhatsAppTemplate["category"])}
                >
                  <option value="MARKETING">Marketing</option>
                  <option value="UTILITY">Utilidad</option>
                  <option value="AUTHENTICATION">Autenticación</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Idioma *</label>
                <select
                  className={inputClass}
                  value={form.language}
                  onChange={(e) => set("language", e.target.value)}
                >
                  <option value="es">Español (es)</option>
                  <option value="en_US">Inglés US (en_US)</option>
                  <option value="es_ES">Español ES (es_ES)</option>
                  <option value="pt_BR">Portugués BR (pt_BR)</option>
                </select>
              </div>
            </div>

            {/* Header */}
            <div>
              <label className={labelClass}>Encabezado <span className="text-slate-600">(opcional)</span></label>
              <input
                className={inputClass}
                value={form.header}
                maxLength={60}
                placeholder="Confirmación de cita"
                onChange={(e) => set("header", e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">Aparece en negrita sobre el cuerpo. Máx. 60 caracteres.</p>
            </div>

            {/* Body */}
            <div>
              <label className={labelClass}>Cuerpo *</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={5}
                value={form.body}
                maxLength={1024}
                placeholder={"Hola {{1}}, tu cita para el {{2}} está confirmada."}
                onChange={(e) => set("body", e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Usa {"{{"}<span>1</span>{"}},"} {"{{"}<span>2</span>{"}}"}... para variables. {form.body.length}/1024
              </p>
            </div>

            {/* Footer */}
            <div>
              <label className={labelClass}>Pie de página <span className="text-slate-600">(opcional)</span></label>
              <input
                className={inputClass}
                value={form.footer}
                maxLength={60}
                placeholder="OptimizaCRM"
                onChange={(e) => set("footer", e.target.value)}
              />
            </div>

            {/* Buttons */}
            <div>
              <label className={labelClass}>Botones <span className="text-slate-600">(opcional, máx. 3)</span></label>
              <div className="space-y-2">
                {form.buttons.map((btn, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <select
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-200 focus:border-orange-500 focus:outline-none"
                      value={btn.type}
                      onChange={(e) => {
                        const updated = [...form.buttons];
                        updated[i] = { ...btn, type: e.target.value as "QUICK_REPLY" | "URL" };
                        set("buttons", updated);
                      }}
                    >
                      <option value="QUICK_REPLY">Respuesta rápida</option>
                      <option value="URL">URL</option>
                    </select>
                    <input
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                      placeholder="Texto del botón"
                      value={btn.text}
                      onChange={(e) => {
                        const updated = [...form.buttons];
                        updated[i] = { ...btn, text: e.target.value };
                        set("buttons", updated);
                      }}
                    />
                    {btn.type === "URL" && (
                      <input
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                        placeholder="https://..."
                        value={btn.url}
                        onChange={(e) => {
                          const updated = [...form.buttons];
                          updated[i] = { ...btn, url: e.target.value };
                          set("buttons", updated);
                        }}
                      />
                    )}
                    <button
                      onClick={() => set("buttons", form.buttons.filter((_, j) => j !== i))}
                      className="mt-2 text-slate-500 hover:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {form.buttons.length < 3 && (
                  <button
                    onClick={() => set("buttons", [...form.buttons, { type: "QUICK_REPLY", text: "", url: "" }])}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-orange-400 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Añadir botón
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="hidden lg:flex w-72 flex-shrink-0 flex-col border-l border-slate-800 p-5">
            <WhatsAppPreview
              header={form.header}
              body={form.body}
              footer={form.footer}
              buttons={form.buttons}
            />
            {!hasWabaId && (
              <div className="mt-4 rounded-lg border border-amber-800/40 bg-amber-950/20 p-3">
                <p className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  WABA ID no configurado
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Necesario para enviar a Meta. Añádelo en{" "}
                  <Link href="/dashboard/integrations" className="text-orange-400 hover:underline">
                    Integraciones
                  </Link>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!canSubmit || isSaving}
            onClick={() => onSaveDraft(toPayload())}
          >
            {isSaving ? "Guardando..." : "Guardar borrador"}
          </Button>
          <Button
            size="sm"
            disabled={!canSubmit || !hasWabaId || isSaving}
            onClick={() => onSaveAndSubmit(toPayload())}
            className="bg-orange-600 hover:bg-orange-500 text-white"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {isSaving ? "Enviando..." : "Enviar para aprobación"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlantillasPage() {
  const { tokens, organization } = useAuthStore();
  const qc = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<WhatsAppTemplate | null>(null);

  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => integrationsApi.list(tokens!.access, String(organization!.id)),
    enabled: !!tokens && !!organization,
  });

  const waIntegration = integrations?.find(
    (i: { channel_type: string; status: string }) => i.channel_type === "whatsapp"
  );
  const isConnected = waIntegration?.status === "connected";
  const hasWabaId   = !!(waIntegration as { config?: { waba_id?: string } } | undefined)?.config?.waba_id;

  const { data: templatesData, isLoading } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: () => whatsappTemplatesApi.getWhatsAppTemplates(tokens!.access, String(organization!.id)),
    enabled: !!tokens && !!organization,
  });

  const templates: WhatsAppTemplate[] = Array.isArray(templatesData)
    ? templatesData
    : (templatesData as { results?: WhatsAppTemplate[] } | undefined)?.results ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["whatsapp-templates"] });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<WhatsAppTemplate> }) =>
      id
        ? whatsappTemplatesApi.updateWhatsAppTemplate(tokens!.access, String(organization!.id), id, data)
        : whatsappTemplatesApi.createWhatsAppTemplate(tokens!.access, String(organization!.id), data),
    onSuccess: () => { invalidate(); setPanelOpen(false); setEditing(null); },
  });

  const submitMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Partial<WhatsAppTemplate> }) => {
      let template: WhatsAppTemplate;
      if (id) {
        template = await whatsappTemplatesApi.updateWhatsAppTemplate(tokens!.access, String(organization!.id), id, data);
      } else {
        template = await whatsappTemplatesApi.createWhatsAppTemplate(tokens!.access, String(organization!.id), data);
      }
      return whatsappTemplatesApi.submitWhatsAppTemplate(tokens!.access, String(organization!.id), template.id);
    },
    onSuccess: () => { invalidate(); setPanelOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      whatsappTemplatesApi.deleteWhatsAppTemplate(tokens!.access, String(organization!.id), id),
    onSuccess: invalidate,
  });

  const submitDirectMutation = useMutation({
    mutationFn: (id: string) =>
      whatsappTemplatesApi.submitWhatsAppTemplate(tokens!.access, String(organization!.id), id),
    onSuccess: invalidate,
  });

  const openNew  = () => { setEditing(null); setPanelOpen(true); };
  const openEdit = (t: WhatsAppTemplate) => { setEditing(t); setPanelOpen(true); };

  const isSaving = saveMutation.isPending || submitMutation.isPending;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardHeader title="WhatsApp" />
      <WhatsAppTabs />

      {!isConnected && <NotConnectedCard />}

      <div className="flex-1 overflow-y-auto p-6">
        {/* Header row */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Plantillas de mensaje</h2>
            <p className="text-sm text-slate-400">
              Plantillas aprobadas por Meta para iniciar conversaciones.
            </p>
          </div>
          <Button
            size="sm"
            onClick={openNew}
            className="bg-orange-600 hover:bg-orange-500 text-white gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Nueva plantilla
          </Button>
        </div>

        {/* Error banner */}
        {(saveMutation.error || submitMutation.error || submitDirectMutation.error) && (
          <div className="mb-4 rounded-lg border border-red-800/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {((saveMutation.error || submitMutation.error || submitDirectMutation.error) as Error)?.message}
          </div>
        )}

        {/* WABA ID warning */}
        {isConnected && !hasWabaId && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-800/40 bg-amber-950/20 px-4 py-3">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-400" />
            <p className="text-sm text-amber-300">
              Añade el <strong>WABA ID</strong> en tu integración de WhatsApp para poder enviar plantillas a Meta.{" "}
              <Link href="/dashboard/integrations" className="underline">Ir a Integraciones →</Link>
            </p>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 py-20 text-center">
            <p className="text-sm font-medium text-slate-400">No hay plantillas todavía</p>
            <p className="mt-1 text-xs text-slate-500">Crea tu primera plantilla para empezar.</p>
            <Button size="sm" className="mt-4 bg-orange-600 hover:bg-orange-500 text-white gap-1.5" onClick={openNew}>
              <Plus className="h-4 w-4" />
              Nueva plantilla
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((t) => {
              const bodyComp = t.components.find((c) => c.type === "BODY");
              return (
                <div key={t.id} className="flex flex-col rounded-xl border border-slate-800 bg-slate-950 p-4 gap-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-sm font-medium text-orange-400 truncate">{t.name}</p>
                    <StatusBadge status={t.status} />
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    <CategoryBadge category={t.category} />
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300">
                      {t.language}
                    </span>
                  </div>

                  {/* Body preview */}
                  {bodyComp?.text && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {bodyComp.text}
                    </p>
                  )}

                  {/* Rejection reason */}
                  {t.status === "rejected" && t.rejection_reason && (
                    <p className="text-xs text-red-400">
                      <strong>Rechazada:</strong> {t.rejection_reason}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-auto flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => openEdit(t)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    {(t.status === "draft" || t.status === "rejected") && (
                      <button
                        onClick={() => submitDirectMutation.mutate(t.id)}
                        disabled={!hasWabaId || submitDirectMutation.isPending}
                        className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors disabled:opacity-40"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Enviar a Meta
                      </button>
                    )}
                    {t.status === "draft" && (
                      <button
                        onClick={() => { if (confirm("¿Eliminar esta plantilla?")) deleteMutation.mutate(t.id); }}
                        className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {panelOpen && (
        <TemplatePanel
          editing={editing}
          hasWabaId={hasWabaId}
          onClose={() => { setPanelOpen(false); setEditing(null); }}
          onSaveDraft={(data) => saveMutation.mutate({ id: editing?.id, data })}
          onSaveAndSubmit={(data) => submitMutation.mutate({ id: editing?.id, data })}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
