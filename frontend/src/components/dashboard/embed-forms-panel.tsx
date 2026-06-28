"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Plus, ToggleLeft, ToggleRight, Trash2, Pencil,
  Code2, BarChart2, X, Copy, Check, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth";
import { embedFormsApi, type EmbedForm, type EmbedFieldDef, type FormSubmission } from "@/lib/api";
import { EmbedFormEditor } from "./embed-form-editor";

// ─── Embed code snippet ────────────────────────────────────────────────────────

function EmbedCodeModal({ form, onClose }: { form: EmbedForm; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const code = form.embed_code;

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-slate-100">Código embed — {form.name}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Pega este código en el HTML de tu web donde quieras mostrar el formulario.
        </p>
        <div className="relative">
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-all">
            {code}
          </pre>
          <button
            onClick={copy}
            className="absolute right-2 top-2 flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
          >
            {copied ? <><Check className="h-3 w-3 text-green-400" /> Copiado</> : <><Copy className="h-3 w-3" /> Copiar</>}
          </button>
        </div>
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
          <p className="text-xs text-slate-400">
            <span className="font-medium text-slate-300">URL directa:</span>{" "}
            <a href={form.embed_url} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline break-all">
              {form.embed_url}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Submissions drawer ────────────────────────────────────────────────────────

function SubmissionsModal({ form, onClose }: { form: EmbedForm; onClose: () => void }) {
  const { tokens, organization } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ["form-submissions", form.id],
    queryFn: () => embedFormsApi.getSubmissions(tokens!.access, organization!.id, form.id),
    enabled: !!tokens && !!organization,
  });

  const submissions: FormSubmission[] = data?.results ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-slate-100">Respuestas — {form.name}</h3>
            <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-xs">{form.submit_count}</Badge>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <p className="text-sm text-slate-400">Cargando respuestas…</p>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <BarChart2 className="h-8 w-8 text-slate-700" />
              <p className="text-sm text-slate-500">Aún no hay respuestas para este formulario.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div key={sub.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">
                      {new Date(sub.created_at).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                    {sub.ip_address && (
                      <span className="text-xs text-slate-600">{sub.ip_address}</span>
                    )}
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {Object.entries(sub.data).map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{k}</dt>
                        <dd className="text-sm text-slate-200 truncate">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Form card ─────────────────────────────────────────────────────────────────

function FormCard({
  form, onEdit, onToggle, onDelete, onEmbed, onSubmissions,
}: {
  form: EmbedForm;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onEmbed: () => void;
  onSubmissions: () => void;
}) {
  return (
    <div className={`rounded-xl border bg-slate-950 p-5 transition-all ${!form.is_active ? "opacity-60" : "border-slate-800"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 flex-shrink-0 text-orange-400" />
            <h3 className="truncate text-sm font-semibold text-slate-100">{form.name}</h3>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{form.fields.length} campo{form.fields.length !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <BarChart2 className="h-3 w-3" />
              {form.submit_count} envío{form.submit_count !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <button onClick={onToggle} className="flex-shrink-0 text-slate-400 hover:text-orange-500 transition-colors" title={form.is_active ? "Desactivar" : "Activar"}>
          {form.is_active
            ? <ToggleRight className="h-6 w-6 text-orange-500" />
            : <ToggleLeft className="h-6 w-6" />}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <button onClick={onEmbed} className="flex items-center gap-1 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-orange-700 hover:text-orange-400 transition-colors">
          <Code2 className="h-3 w-3" /> Embed
        </button>
        <button onClick={onSubmissions} className="flex items-center gap-1 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-slate-100 transition-colors">
          <BarChart2 className="h-3 w-3" /> Respuestas
        </button>
        <button onClick={onEdit} className="flex items-center gap-1 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-slate-100 transition-colors">
          <Pencil className="h-3 w-3" /> Editar
        </button>
        <button onClick={onDelete} className="flex items-center gap-1 rounded-md border border-red-900/40 px-2.5 py-1.5 text-xs text-red-400 hover:border-red-700 hover:text-red-300 transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function EmbedFormsPanel() {
  const { tokens, organization } = useAuthStore();
  const qc = useQueryClient();

  const [editorForm, setEditorForm]   = useState<EmbedForm | null | "new">(null);
  const [embedTarget, setEmbedTarget] = useState<EmbedForm | null>(null);
  const [subsTarget,  setSubsTarget]  = useState<EmbedForm | null>(null);

  const auth = { token: tokens!.access, orgId: organization!.id };

  const { data, isLoading } = useQuery({
    queryKey: ["embed-forms"],
    queryFn: () => embedFormsApi.list(auth.token, auth.orgId),
    enabled: !!tokens && !!organization,
  });

  const forms: EmbedForm[] = data?.results ?? [];

  const toggleMutation = useMutation({
    mutationFn: (form: EmbedForm) =>
      embedFormsApi.update(auth.token, auth.orgId, form.id, { is_active: !form.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["embed-forms"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => embedFormsApi.delete(auth.token, auth.orgId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["embed-forms"] }),
  });

  return (
    <>
      {/* Editor modal */}
      {editorForm !== null && (
        <EmbedFormEditor
          initial={editorForm === "new" ? null : editorForm}
          onClose={() => setEditorForm(null)}
          onSaved={() => { setEditorForm(null); qc.invalidateQueries({ queryKey: ["embed-forms"] }); }}
        />
      )}

      {/* Embed code modal */}
      {embedTarget && <EmbedCodeModal form={embedTarget} onClose={() => setEmbedTarget(null)} />}

      {/* Submissions modal */}
      {subsTarget && <SubmissionsModal form={subsTarget} onClose={() => setSubsTarget(null)} />}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <FileText className="h-5 w-5 text-orange-400" />
              Formularios incrustables
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Crea formularios personalizados y añádelos a tu web con un solo fragmento de código.
            </p>
          </div>
          <Button
            onClick={() => setEditorForm("new")}
            className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white"
          >
            <Plus className="h-4 w-4" /> Nuevo formulario
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-800" />
            ))}
          </div>
        ) : forms.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 py-14 text-center">
            <FileText className="h-9 w-9 text-slate-700" />
            <p className="text-sm font-medium text-slate-500">Sin formularios</p>
            <p className="text-xs text-slate-500">Crea tu primer formulario para empezar a capturar leads desde tu web.</p>
            <Button onClick={() => setEditorForm("new")} variant="outline" size="sm" className="gap-1.5 mt-1">
              <Plus className="h-3.5 w-3.5" /> Crear formulario
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                onEdit={() => setEditorForm(form)}
                onToggle={() => toggleMutation.mutate(form)}
                onDelete={() => {
                  if (confirm(`¿Eliminar el formulario "${form.name}"?`)) {
                    deleteMutation.mutate(form.id);
                  }
                }}
                onEmbed={() => setEmbedTarget(form)}
                onSubmissions={() => setSubsTarget(form)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
