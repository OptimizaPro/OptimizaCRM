"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { useAuthStore } from "@/store/auth";
import {
  integrationsApi,
  whatsappTemplatesApi,
  type WhatsAppTemplate,
  type TemplateComponent,
  type Integration,
} from "@/lib/api";
import {
  Pencil,
  Trash2,
  Send,
  Plus,
  X,
  AlertTriangle,
  CheckCircle2,
  Link,
} from "lucide-react";

// ─── Status / category badge helpers ─────────────────────────────────────────

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
    MARKETING:      { label: "Marketing",      cls: "bg-purple-600/30 text-purple-300" },
    UTILITY:        { label: "Utilidad",        cls: "bg-blue-600/30 text-blue-300" },
    AUTHENTICATION: { label: "Autenticación",   cls: "bg-orange-600/30 text-orange-300" },
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
  header,
  body,
  footer,
  buttons,
}: {
  header?: string;
  body?: string;
  footer?: string;
  buttons?: { type: "QUICK_REPLY" | "URL"; text: string; url?: string }[];
}) {
  const renderBody = (text: string) =>
    text.replace(/\{\{(\d+)\}\}/g, (_, n: string) => `[variable ${n}]`);

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-[#0B141A] p-3">
      <div className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">
        Vista previa
      </div>
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
            {footer && (
              <p className="text-slate-400 text-xs mt-1">{footer}</p>
            )}
            <p className="text-slate-500 text-[10px] text-right mt-1">14:35</p>
          </div>
          {buttons && buttons.length > 0 && (
            <div className="bg-[#202C33] border-t border-[#2A3942]">
              {buttons.map((btn, i) => (
                <button
                  key={i}
                  className="w-full text-center text-[#00A884] text-sm py-2 border-b border-[#2A3942] last:border-b-0 hover:bg-[#2A3942] transition-colors"
                >
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

// ─── Template form / panel ────────────────────────────────────────────────────

interface ButtonDef {
  type: "QUICK_REPLY" | "URL";
  text: string;
  url: string;
}

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
  name:     "",
  category: "MARKETING",
  language: "es",
  header:   "",
  body:     "",
  footer:   "",
  buttons:  [],
};

function buildComponents(form: FormState): TemplateComponent[] {
  const components: TemplateComponent[] = [];
  if (form.header.trim()) {
    components.push({ type: "HEADER", format: "TEXT", text: form.header.trim() });
  }
  if (form.body.trim()) {
    components.push({ type: "BODY", text: form.body.trim() });
  }
  if (form.footer.trim()) {
    components.push({ type: "FOOTER", text: form.footer.trim() });
  }
  if (form.buttons.length > 0) {
    components.push({
      type: "BUTTONS",
      buttons: form.buttons.map((b) => ({
        type: b.type,
        text: b.text,
        ...(b.type === "URL" && b.url ? { url: b.url } : {}),
      })),
    });
  }
  return components;
}

function parseComponents(components: TemplateComponent[]): Partial<FormState> {
  const partial: Partial<FormState> = { header: "", body: "", footer: "", buttons: [] };
  for (const c of components) {
    if (c.type === "HEADER")  partial.header  = c.text ?? "";
    if (c.type === "BODY")    partial.body    = c.text ?? "";
    if (c.type === "FOOTER")  partial.footer  = c.text ?? "";
    if (c.type === "BUTTONS") {
      partial.buttons = (c.buttons ?? []).map((b) => ({
        type: b.type,
        text: b.text,
        url:  b.url ?? "",
      }));
    }
  }
  return partial;
}

interface TemplatePanelProps {
  editing: WhatsAppTemplate | null;
  hasWabaId: boolean;
  onClose: () => void;
  onSaveDraft: (data: Partial<WhatsAppTemplate>) => void;
  onSaveAndSubmit: (data: Partial<WhatsAppTemplate>) => void;
  isSaving: boolean;
}

function TemplatePanel({
  editing,
  hasWabaId,
  onClose,
  onSaveDraft,
  onSaveAndSubmit,
  isSaving,
}: TemplatePanelProps) {
  const initial: FormState = editing
    ? {
        name:     editing.name,
        category: editing.category,
        language: editing.language,
        ...(parseComponents(editing.components) as Pick<FormState, "header" | "body" | "footer" | "buttons">),
      }
    : { ...DEFAULT_FORM };

  const [form, setForm] = useState<FormState>(initial);
  const [nameError, setNameError] = useState("");

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const validateName = (v: string) => {
    if (!/^[a-z0-9_]*$/.test(v)) {
      setNameError("Solo minúsculas, números y guiones bajos.");
    } else {
      setNameError("");
    }
  };

  const handleNameChange = (v: string) => {
    set("name", v);
    validateName(v);
  };

  const addButton = () => {
    if (form.buttons.length >= 3) return;
    set("buttons", [...form.buttons, { type: "QUICK_REPLY", text: "", url: "" }]);
  };

  const removeButton = (idx: number) =>
    set("buttons", form.buttons.filter((_, i) => i !== idx));

  const updateButton = (idx: number, key: keyof ButtonDef, val: string) =>
    set(
      "buttons",
      form.buttons.map((b, i) => (i === idx ? { ...b, [key]: val } : b)),
    );

  const isValid = form.name.trim() && !nameError && form.body.trim();

  const payload = (): Partial<WhatsAppTemplate> => ({
    name:       form.name.trim(),
    category:   form.category,
    language:   form.language,
    components: buildComponents(form),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      {/* Panel */}
      <div className="relative w-full max-w-[880px] h-full bg-slate-950 border-l border-slate-800 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <h2 className="text-lg font-semibold text-slate-100">
            {editing ? "Editar plantilla" : "Nueva plantilla"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: form + preview side by side */}
        <div className="flex flex-1 overflow-hidden">
          {/* Form */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Nombre <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="recordatorio_cita"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
              {nameError && (
                <p className="text-red-400 text-xs mt-1">{nameError}</p>
              )}
              <p className="text-slate-500 text-xs mt-1">
                Solo minúsculas, números y guiones bajos. Ej: recordatorio_cita
              </p>
            </div>

            {/* Categoría + Idioma */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Categoría</label>
                <select
                  value={form.category}
                  onChange={(e) => set("category", e.target.value as WhatsAppTemplate["category"])}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="MARKETING">Marketing</option>
                  <option value="UTILITY">Utilidad</option>
                  <option value="AUTHENTICATION">Autenticación</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Idioma</label>
                <select
                  value={form.language}
                  onChange={(e) => set("language", e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="es">Español (es)</option>
                  <option value="en_US">Inglés US (en_US)</option>
                  <option value="es_ES">Español ES (es_ES)</option>
                </select>
              </div>
            </div>

            {/* Encabezado */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Encabezado <span className="text-slate-500">(opcional)</span>
              </label>
              <input
                type="text"
                maxLength={60}
                value={form.header}
                onChange={(e) => set("header", e.target.value)}
                placeholder="Tu encabezado aquí"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <p className="text-slate-500 text-xs mt-1">
                Aparece en negrita sobre el mensaje. Máx. 60 caracteres.
              </p>
            </div>

            {/* Cuerpo */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Cuerpo <span className="text-red-400">*</span>
              </label>
              <textarea
                maxLength={1024}
                rows={5}
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                placeholder={"Hola {{1}}, tu cita es el {{2}}."}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-slate-500 text-xs">
                  Usa {"{{"} 1 {"}}"}, {"{{"} 2 {"}}"} ... para variables.
                </p>
                <span className="text-slate-500 text-xs">
                  {form.body.length}/1024
                </span>
              </div>
            </div>

            {/* Pie de página */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Pie de página <span className="text-slate-500">(opcional)</span>
              </label>
              <input
                type="text"
                maxLength={60}
                value={form.footer}
                onChange={(e) => set("footer", e.target.value)}
                placeholder="Tu empresa · Sin responder"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            {/* Botones */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">
                  Botones <span className="text-slate-500">(opcional, máx. 3)</span>
                </label>
                {form.buttons.length < 3 && (
                  <button
                    type="button"
                    onClick={addButton}
                    className="text-orange-400 hover:text-orange-300 text-xs flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Añadir botón
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {form.buttons.map((btn, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">Botón {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeButton(idx)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={btn.type}
                        onChange={(e) => updateButton(idx, "type", e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                      >
                        <option value="QUICK_REPLY">Respuesta rápida</option>
                        <option value="URL">URL</option>
                      </select>
                      <input
                        type="text"
                        value={btn.text}
                        onChange={(e) => updateButton(idx, "text", e.target.value)}
                        placeholder="Texto del botón"
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    {btn.type === "URL" && (
                      <input
                        type="url"
                        value={btn.url}
                        onChange={(e) => updateButton(idx, "url", e.target.value)}
                        placeholder="https://ejemplo.com"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preview — hidden on small screens */}
          <div className="w-72 shrink-0 border-l border-slate-800 p-5 overflow-y-auto hidden lg:block">
            <WhatsAppPreview
              header={form.header}
              body={form.body}
              footer={form.footer}
              buttons={form.buttons}
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 shrink-0 bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSaveDraft(payload())}
            disabled={!isValid || isSaving}
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Guardando..." : "Guardar borrador"}
          </button>
          {hasWabaId && (
            <button
              type="button"
              onClick={() => onSaveAndSubmit(payload())}
              disabled={!isValid || isSaving}
              className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isSaving ? "Enviando..." : "Enviar para aprobación"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const { tokens, organization } = useAuthStore();
  const token  = tokens?.access ?? "";
  const orgId  = organization?.id ?? "";
  const qc     = useQueryClient();

  const [panelOpen, setPanelOpen]   = useState(false);
  const [editing, setEditing]       = useState<WhatsAppTemplate | null>(null);
  const [errorMsg, setErrorMsg]     = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ── Queries ──────────────────────────────────────────────────────────────────
  const integrationsQuery = useQuery({
    queryKey: ["integrations", orgId],
    queryFn:  () => integrationsApi.getAll(token, orgId),
    enabled:  !!token && !!orgId,
  });

  const templatesQuery = useQuery({
    queryKey: ["whatsapp-templates", orgId],
    queryFn:  () => whatsappTemplatesApi.getWhatsAppTemplates(token, orgId),
    enabled:  !!token && !!orgId,
  });

  const integrations: Integration[] = integrationsQuery.data?.results ?? [];
  const waIntegration = integrations.find(
    (i) => i.channel_type === "whatsapp" && i.status === "connected",
  );
  const templates: WhatsAppTemplate[] = templatesQuery.data?.results ?? [];
  const hasWabaId = !!(waIntegration?.config?.waba_id);

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ["whatsapp-templates", orgId] });

  const createMut = useMutation({
    mutationFn: (data: Partial<WhatsAppTemplate>) =>
      whatsappTemplatesApi.createWhatsAppTemplate(token, orgId, data),
    onSuccess: () => {
      invalidate();
      setPanelOpen(false);
      setEditing(null);
      setSuccessMsg("Plantilla guardada.");
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WhatsAppTemplate> }) =>
      whatsappTemplatesApi.updateWhatsAppTemplate(token, orgId, id, data),
    onSuccess: () => {
      invalidate();
      setPanelOpen(false);
      setEditing(null);
      setSuccessMsg("Plantilla actualizada.");
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => whatsappTemplatesApi.deleteWhatsAppTemplate(token, orgId, id),
    onSuccess: () => { invalidate(); setSuccessMsg("Plantilla eliminada."); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const submitMut = useMutation({
    mutationFn: (id: string) => whatsappTemplatesApi.submitWhatsAppTemplate(token, orgId, id),
    onSuccess: () => { invalidate(); setSuccessMsg("Plantilla enviada a Meta para aprobación."); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const isSaving = createMut.isPending || updateMut.isPending;

  // ── Panel helpers ─────────────────────────────────────────────────────────────
  const openNew  = () => { setEditing(null); setErrorMsg(""); setPanelOpen(true); };
  const openEdit = (t: WhatsAppTemplate) => { setEditing(t); setErrorMsg(""); setPanelOpen(true); };
  const closePanel = () => { setPanelOpen(false); setEditing(null); };

  const handleSaveDraft = (data: Partial<WhatsAppTemplate>) => {
    setErrorMsg("");
    if (editing) {
      updateMut.mutate({ id: editing.id, data });
    } else {
      createMut.mutate(data);
    }
  };

  const handleSaveAndSubmit = (data: Partial<WhatsAppTemplate>) => {
    setErrorMsg("");
    if (editing) {
      updateMut.mutate(
        { id: editing.id, data },
        { onSuccess: () => submitMut.mutate(editing.id) },
      );
    } else {
      createMut.mutate(data, {
        onSuccess: (created) => submitMut.mutate(created.id),
      });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar esta plantilla?")) return;
    deleteMut.mutate(id);
  };

  const handleSubmit = (id: string) => {
    submitMut.mutate(id);
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <DashboardHeader title="WhatsApp" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Error / success toasts */}
        {errorMsg && (
          <div className="flex items-start gap-3 bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} className="ml-auto text-red-400 hover:text-red-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {successMsg && (
          <div className="flex items-start gap-3 bg-green-900/30 border border-green-700 rounded-xl px-4 py-3 text-green-300 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg("")} className="ml-auto text-green-400 hover:text-green-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Not connected empty state */}
        {!integrationsQuery.isLoading && !waIntegration && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-[#25D366]">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">
              WhatsApp no está conectado
            </h3>
            <p className="text-slate-400 text-sm mb-6 max-w-sm">
              Conecta tu integración de WhatsApp Business para gestionar plantillas.
            </p>
            <a
              href="/dashboard/integrations"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Link className="w-4 h-4" />
              Ir a Integraciones
            </a>
          </div>
        )}

        {/* Connected state */}
        {waIntegration && (
          <>
            {/* Status bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
                <div>
                  <p className="text-slate-200 font-medium text-sm">WhatsApp Business conectado</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Phone ID: {waIntegration.config?.phone_number_id || "—"}
                  </p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-600/20 text-green-300 border border-green-700/40">
                  Conectado
                </span>
              </div>
              <button
                onClick={openNew}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                Nueva plantilla
              </button>
            </div>

            {/* WABA ID warning */}
            {!hasWabaId && (
              <div className="flex items-start gap-3 bg-yellow-900/20 border border-yellow-700/40 rounded-xl px-4 py-3 text-yellow-300 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>WABA ID no configurado.</strong> Añade el WABA ID en la configuración de la integración de WhatsApp para poder enviar plantillas a Meta.
                </span>
              </div>
            )}

            {/* Template list */}
            {templatesQuery.isLoading ? (
              <div className="text-center py-16 text-slate-500 text-sm">Cargando plantillas...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-slate-400 text-sm mb-3">No hay plantillas todavía.</p>
                <button
                  onClick={openNew}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Crear primera plantilla
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {templates.map((tpl) => {
                  const bodyComp = tpl.components.find((c) => c.type === "BODY");
                  return (
                    <div
                      key={tpl.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <code className="text-orange-400 font-mono text-sm">{tpl.name}</code>
                          <CategoryBadge category={tpl.category} />
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300">
                            {tpl.language}
                          </span>
                          <StatusBadge status={tpl.status} />
                        </div>
                        {tpl.rejection_reason && (
                          <p className="text-red-400 text-xs mt-1">
                            Motivo de rechazo: {tpl.rejection_reason}
                          </p>
                        )}
                        {tpl.submitted_at && (
                          <p className="text-slate-500 text-xs mt-1">
                            Enviada: {new Date(tpl.submitted_at).toLocaleDateString("es")}
                          </p>
                        )}
                        {bodyComp?.text && (
                          <p className="text-slate-400 text-xs mt-2 line-clamp-2">
                            {bodyComp.text.replace(/\{\{(\d+)\}\}/g, "[var $1]")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Edit */}
                        <button
                          onClick={() => openEdit(tpl)}
                          title="Editar"
                          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {/* Submit — only if draft or rejected and WABA ID is set */}
                        {(tpl.status === "draft" || tpl.status === "rejected") && hasWabaId && (
                          <button
                            onClick={() => handleSubmit(tpl.id)}
                            disabled={submitMut.isPending}
                            title="Enviar para aprobación"
                            className="p-2 text-slate-400 hover:text-orange-400 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {/* Delete — only if draft */}
                        {tpl.status === "draft" && (
                          <button
                            onClick={() => handleDelete(tpl.id)}
                            disabled={deleteMut.isPending}
                            title="Eliminar"
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Slide-in panel */}
      {panelOpen && (
        <TemplatePanel
          editing={editing}
          hasWabaId={hasWabaId}
          onClose={closePanel}
          onSaveDraft={handleSaveDraft}
          onSaveAndSubmit={handleSaveAndSubmit}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
