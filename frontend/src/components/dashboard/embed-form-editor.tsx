"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  X, Plus, Trash2, GripVertical, ChevronDown, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { embedFormsApi, type EmbedForm, type EmbedFieldDef } from "@/lib/api";

const FIELD_TYPES = [
  { value: "text",     label: "Texto corto" },
  { value: "email",    label: "Email" },
  { value: "phone",    label: "Teléfono" },
  { value: "textarea", label: "Texto largo" },
  { value: "select",   label: "Desplegable" },
  { value: "checkbox", label: "Casilla" },
];

const LEAD_FIELDS = [
  { value: "",           label: "— Campo personalizado —" },
  { value: "first_name", label: "Nombre" },
  { value: "last_name",  label: "Apellido" },
  { value: "email",      label: "Email" },
  { value: "phone",      label: "Teléfono" },
  { value: "company",    label: "Empresa" },
  { value: "title",      label: "Cargo" },
  { value: "notes",      label: "Notas" },
];

function newField(): EmbedFieldDef {
  return {
    key:        crypto.randomUUID().slice(0, 8),
    label:      "",
    field_type: "text",
    placeholder: "",
    required:   false,
    lead_field: null,
    options:    [],
  };
}

const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500";

interface Props {
  initial: EmbedForm | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EmbedFormEditor({ initial, onClose, onSaved }: Props) {
  const { tokens, organization } = useAuthStore();
  const auth = { token: tokens!.access, orgId: organization!.id };

  const [tab,  setTab]  = useState<"fields" | "design">("fields");
  const [name, setName] = useState(initial?.name ?? "");
  const [successMessage, setSuccessMessage] = useState(initial?.success_message ?? "¡Gracias! Nos pondremos en contacto pronto.");
  const [redirectUrl, setRedirectUrl] = useState(initial?.redirect_url ?? "");
  const [primaryColor, setPrimaryColor] = useState(initial?.style?.primary_color ?? "#ea580c");
  const [bgColor, setBgColor]           = useState(initial?.style?.bg_color      ?? "#ffffff");
  const [fields, setFields] = useState<EmbedFieldDef[]>(
    initial?.fields && initial.fields.length > 0
      ? initial.fields
      : [
          { key: "name",    label: "Nombre",              field_type: "text",  placeholder: "Tu nombre",      required: true,  lead_field: "first_name", options: [] },
          { key: "email",   label: "Correo electrónico",  field_type: "email", placeholder: "tu@empresa.com", required: true,  lead_field: "email",      options: [] },
          { key: "phone",   label: "Teléfono",            field_type: "phone", placeholder: "+502 0000 0000", required: false, lead_field: "phone",      options: [] },
          { key: "message", label: "Mensaje",             field_type: "textarea", placeholder: "¿En qué podemos ayudarte?", required: false, lead_field: "notes", options: [] },
        ]
  );
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const [saveError, setSaveError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<EmbedForm>) =>
      initial
        ? embedFormsApi.update(auth.token, auth.orgId, initial.id, payload)
        : embedFormsApi.create(auth.token, auth.orgId, payload),
    onSuccess: () => { setSaveError(null); onSaved(); },
    onError: (err: Error) => setSaveError(err.message || "Error al guardar el formulario."),
  });

  function updateField(idx: number, patch: Partial<EmbedFieldDef>) {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }

  function moveField(idx: number, dir: -1 | 1) {
    setFields((prev) => {
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
    setExpandedIdx((i) => (i === idx ? idx + dir : i));
  }

  function removeField(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  }

  function handleSave() {
    if (!name.trim()) {
      setSaveError("El nombre interno es obligatorio.");
      return;
    }
    setSaveError(null);
    saveMutation.mutate({
      name,
      fields,
      success_message: successMessage,
      redirect_url:    redirectUrl,
      style: { primary_color: primaryColor, bg_color: bgColor, border_radius: "8" },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-xl flex-col max-h-[90vh] rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              {initial ? "Editar formulario" : "Nuevo formulario"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Name */}
        <div className="px-6 pt-5 pb-3">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Nombre interno *</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Formulario de contacto"
            className="border-slate-700 bg-slate-900 text-slate-100"
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-6">
          {(["fields", "design"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "pb-2.5 pt-1 text-xs font-medium transition-colors border-b-2 mr-5",
                tab === t
                  ? "border-orange-500 text-orange-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              )}
            >
              {t === "fields" ? "Campos" : "Diseño y mensaje"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {tab === "fields" && (
            <>
              {fields.map((field, idx) => (
                <div key={field.key} className="rounded-xl border border-slate-800 bg-slate-900">
                  {/* Row header */}
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <GripVertical className="h-3.5 w-3.5 flex-shrink-0 text-slate-600" />
                    <span className="flex-1 truncate text-xs font-medium text-slate-300">
                      {field.label || `Campo ${idx + 1}`}
                    </span>
                    <span className="text-[10px] text-slate-600 mr-1">{FIELD_TYPES.find(f => f.value === field.field_type)?.label}</span>
                    <div className="flex gap-0.5">
                      <button onClick={() => moveField(idx, -1)} disabled={idx === 0} className="rounded p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30">▲</button>
                      <button onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1} className="rounded p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30">▼</button>
                      <button onClick={() => removeField(idx)} className="rounded p-1 text-red-500 hover:text-red-400">
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <button onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)} className="rounded p-1 text-slate-400 hover:text-slate-200">
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expandedIdx === idx && "rotate-180")} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded config */}
                  {expandedIdx === idx && (
                    <div className="border-t border-slate-800 px-3 pb-3 pt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-500">Etiqueta</label>
                          <input className={inputCls} value={field.label} onChange={(e) => updateField(idx, { label: e.target.value })} placeholder="Nombre del campo" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-500">Tipo</label>
                          <select className={inputCls} value={field.field_type} onChange={(e) => updateField(idx, { field_type: e.target.value as EmbedFieldDef["field_type"], options: [] })}>
                            {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-500">Placeholder</label>
                          <input className={inputCls} value={field.placeholder ?? ""} onChange={(e) => updateField(idx, { placeholder: e.target.value })} placeholder="Texto de ayuda" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-500">Mapear a Lead</label>
                          <select className={inputCls} value={field.lead_field ?? ""} onChange={(e) => updateField(idx, { lead_field: e.target.value || null })}>
                            {LEAD_FIELDS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                          </select>
                        </div>
                      </div>

                      {field.field_type === "select" && (
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-500">Opciones (una por línea)</label>
                          <textarea
                            className={inputCls}
                            rows={3}
                            value={(field.options ?? []).join("\n")}
                            onChange={(e) => updateField(idx, { options: e.target.value.split("\n").filter(Boolean) })}
                            placeholder={"Opción 1\nOpción 2\nOpción 3"}
                          />
                        </div>
                      )}

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={field.required ?? false} onChange={(e) => updateField(idx, { required: e.target.checked })} className="h-4 w-4 rounded border-slate-600 accent-orange-500" />
                        <span className="text-xs text-slate-400">Campo obligatorio</span>
                      </label>
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={() => { setFields((f) => [...f, newField()]); setExpandedIdx(fields.length); }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 py-3 text-xs font-medium text-slate-500 hover:border-orange-700 hover:text-orange-400 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Añadir campo
              </button>
            </>
          )}

          {tab === "design" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Color principal</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-14 cursor-pointer rounded-lg border border-slate-700 bg-transparent p-1" />
                    <input className={inputCls} value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#ea580c" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Color de fondo</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-9 w-14 cursor-pointer rounded-lg border border-slate-700 bg-transparent p-1" />
                    <input className={inputCls} value={bgColor} onChange={(e) => setBgColor(e.target.value)} placeholder="#ffffff" />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Mensaje de éxito</label>
                <textarea className={inputCls} rows={2} value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} placeholder="¡Gracias! Nos pondremos en contacto pronto." />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">URL de redirección (opcional)</label>
                <input className={inputCls} type="url" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="https://tuempresa.com/gracias" />
                <p className="mt-1 text-[11px] text-slate-600">Si se rellena, redirige al usuario aquí en lugar de mostrar el mensaje de éxito.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-6 py-4">
          {saveError && (
            <p className="mb-3 text-xs text-red-400">{saveError}</p>
          )}
          <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saveMutation.isPending}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-orange-600 hover:bg-orange-500 text-white"
          >
            {saveMutation.isPending ? "Guardando…" : "Guardar formulario"}
          </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
