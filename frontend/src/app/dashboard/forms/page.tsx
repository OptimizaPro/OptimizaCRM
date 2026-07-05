"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { embedFormsApi, type EmbedForm } from "@/lib/api";
import { EmbedFormEditor } from "@/components/dashboard/embed-form-editor";
import {
  FileText, Plus, Trash2, Pencil, Code2, BarChart2,
  ToggleLeft, ToggleRight, X, Copy, Check, Crown,
  TrendingUp, Zap, RefreshCw, Eye,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// ─── Overlay ─────────────────────────────────────────────────────────────────

function Overlay({ onClick }: { onClick: () => void }) {
  return <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClick} />;
}

// ─── Embed code modal ─────────────────────────────────────────────────────────

function EmbedCodeModal({ form, onClose }: { form: EmbedForm; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(form.embed_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Overlay onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
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
              {form.embed_code}
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
    </>
  );
}

// ─── Submissions modal ────────────────────────────────────────────────────────

function SubmissionsModal({ form, onClose }: { form: EmbedForm; onClose: () => void }) {
  const { tokens, organization } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ["form-submissions", form.id],
    queryFn:  () => embedFormsApi.getSubmissions(tokens!.access, organization!.id, form.id),
    enabled:  !!tokens && !!organization,
  });
  const submissions = data?.results ?? [];

  return (
    <>
      <Overlay onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-orange-400" />
              <h3 className="text-sm font-semibold text-slate-100">Respuestas — {form.name}</h3>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{form.submit_count}</span>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <RefreshCw className="h-5 w-5 animate-spin text-orange-400" />
              </div>
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
                      {sub.ip_address && <span className="text-xs text-slate-600">{sub.ip_address}</span>}
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
    </>
  );
}

// ─── Preview modal ────────────────────────────────────────────────────────────

function PreviewModal({ form, onClose }: { form: EmbedForm; onClose: () => void }) {
  const primary = form.style?.primary_color || "#ea580c";

  const inputCls = "pointer-events-none w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none select-none";

  return (
    <>
      <Overlay onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
        <div className="my-8 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
          {/* Modal header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-orange-400" />
              <h3 className="text-sm font-semibold text-slate-100">Vista previa — {form.name}</h3>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form card — mismo diseño que /login */}
          <div className="p-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
              <h2 className="text-xl font-bold text-center text-slate-100">{form.name}</h2>

              <div className="mt-6 space-y-4">
                {form.fields.length === 0 && (
                  <p className="text-center text-sm text-slate-500 py-4">
                    Este formulario no tiene campos. Edítalo para añadir campos.
                  </p>
                )}

                {form.fields.map((field) => (
                  <div key={field.key}>
                    <label className="mb-1 block text-sm font-medium text-slate-300">
                      {field.label}
                      {field.required && <span className="ml-1 text-orange-400">*</span>}
                    </label>

                    {field.field_type === "textarea" ? (
                      <textarea
                        readOnly
                        placeholder={field.placeholder || ""}
                        rows={3}
                        className={`${inputCls} resize-none`}
                      />
                    ) : field.field_type === "select" ? (
                      <select className={`${inputCls} appearance-none`}>
                        <option value="">{field.placeholder || "Seleccionar…"}</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.field_type === "checkbox" ? (
                      <label className="flex items-center gap-2.5 pointer-events-none select-none">
                        <input
                          type="checkbox"
                          readOnly
                          className="h-4 w-4 rounded border-slate-600 bg-slate-800"
                          style={{ accentColor: primary }}
                        />
                        <span className="text-sm text-slate-300">{field.placeholder || field.label}</span>
                      </label>
                    ) : (
                      <input
                        type={field.field_type === "email" ? "email" : field.field_type === "phone" ? "tel" : "text"}
                        readOnly
                        placeholder={field.placeholder || ""}
                        className={inputCls}
                      />
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  className="pointer-events-none w-full rounded-lg py-2.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: primary }}
                >
                  Enviar
                </button>
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-slate-600">
              Vista previa — el formulario real funciona en tu sitio web
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Form card ────────────────────────────────────────────────────────────────

function FormCard({
  form, onEdit, onToggle, onDelete, onEmbed, onSubmissions, onPreview,
}: {
  form: EmbedForm;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onEmbed: () => void;
  onSubmissions: () => void;
  onPreview: () => void;
}) {
  return (
    <div className={`flex flex-col rounded-2xl border bg-slate-950 p-5 gap-4 transition-opacity ${!form.is_active ? "opacity-60" : "border-slate-800"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 flex-shrink-0 text-orange-400" />
            <h3 className="truncate text-sm font-semibold text-slate-100">{form.name}</h3>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{form.fields.length} campo{form.fields.length !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span className={`font-medium ${form.is_active ? "text-green-400" : "text-slate-500"}`}>
              {form.is_active ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="flex-shrink-0 text-slate-400 hover:text-orange-500 transition-colors"
          title={form.is_active ? "Desactivar" : "Activar"}
        >
          {form.is_active
            ? <ToggleRight className="h-6 w-6 text-orange-500" />
            : <ToggleLeft className="h-6 w-6" />}
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Zap className="h-3 w-3 text-orange-400" />
        {form.submit_count} envío{form.submit_count !== 1 ? "s" : ""}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800">
        <button onClick={onPreview} className="flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-sky-600/50 hover:text-sky-400 transition-colors">
          <Eye className="h-3 w-3" /> Vista previa
        </button>
        <button onClick={onEmbed} className="flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-orange-600/50 hover:text-orange-400 transition-colors">
          <Code2 className="h-3 w-3" /> Embed
        </button>
        <button onClick={onSubmissions} className="flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-slate-100 transition-colors">
          <BarChart2 className="h-3 w-3" /> Respuestas
        </button>
        <button onClick={onEdit} className="flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-slate-100 transition-colors">
          <Pencil className="h-3 w-3" /> Editar
        </button>
        <button onClick={onDelete} className="flex items-center gap-1 rounded-lg border border-red-900/40 px-2.5 py-1.5 text-xs text-red-400 hover:border-red-700 hover:text-red-300 transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Upgrade modal ────────────────────────────────────────────────────────────

function UpgradeModal({ plan, limit, onClose }: { plan: string; limit: number; onClose: () => void }) {
  return (
    <>
      <Overlay onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400">
                <Crown className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-slate-100">Límite alcanzado</h3>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 py-5 space-y-4">
            <p className="text-sm text-slate-300">
              Tu plan <span className="font-semibold text-orange-400 capitalize">{plan}</span> permite
              hasta <span className="font-semibold text-slate-100">{limit} formulario{limit !== 1 ? "s" : ""}</span>.
              Haz upgrade para crear más.
            </p>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Plan actual</span>
                <span className="font-semibold text-slate-200 capitalize">{plan} — {limit} formulario{limit !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Plan Pro</span>
                <span className="font-semibold text-orange-400">6 formularios</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Plan Equipo</span>
                <span className="font-semibold text-orange-400">12 formularios</span>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                Ahora no
              </button>
              <Link
                href="/precios"
                target="_blank"
                onClick={onClose}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-600 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 transition-colors"
              >
                <TrendingUp className="h-4 w-4" />
                Ver planes
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FormsPage() {
  const { tokens, organization } = useAuthStore();
  const qc = useQueryClient();

  const [editorForm,    setEditorForm]    = useState<EmbedForm | null | "new">(null);
  const [embedTarget,   setEmbedTarget]   = useState<EmbedForm | null>(null);
  const [subsTarget,    setSubsTarget]    = useState<EmbedForm | null>(null);
  const [previewTarget, setPreviewTarget] = useState<EmbedForm | null>(null);
  const [showUpgrade,   setShowUpgrade]   = useState(false);

  const auth = { token: tokens!.access, orgId: String(organization!.id) };

  const { data, isLoading } = useQuery({
    queryKey: ["embed-forms"],
    queryFn:  () => embedFormsApi.list(auth.token, auth.orgId),
    enabled:  !!tokens && !!organization,
  });

  const forms      = data?.results     ?? [];
  const formLimit  = data?.form_limit  ?? 2;
  const formCount  = data?.form_count  ?? forms.length;
  const plan       = data?.plan        ?? "free";
  const atLimit    = formCount >= formLimit;
  const totalSubmits = forms.reduce((s, f) => s + f.submit_count, 0);
  const activeForms  = forms.filter((f) => f.is_active).length;

  const toggleMutation = useMutation({
    mutationFn: (form: EmbedForm) =>
      embedFormsApi.update(auth.token, auth.orgId, form.id, { is_active: !form.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["embed-forms"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => embedFormsApi.delete(auth.token, auth.orgId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["embed-forms"] }),
  });

  const handleDelete = (form: EmbedForm) => {
    toast(`¿Eliminar "${form.name}"?`, {
      description: "Se eliminarán también todas las respuestas. Esta acción no se puede deshacer.",
      action: {
        label: "Sí, eliminar",
        onClick: () => deleteMutation.mutate(form.id),
      },
      cancel: { label: "Cancelar", onClick: () => {} },
      duration: 8000,
    });
  };

  return (
    <>
      {/* Modals */}
      {editorForm !== null && (
        <EmbedFormEditor
          initial={editorForm === "new" ? null : editorForm}
          onClose={() => setEditorForm(null)}
          onSaved={() => { setEditorForm(null); qc.invalidateQueries({ queryKey: ["embed-forms"] }); }}
        />
      )}
      {previewTarget && <PreviewModal    form={previewTarget} onClose={() => setPreviewTarget(null)} />}
      {embedTarget   && <EmbedCodeModal  form={embedTarget}   onClose={() => setEmbedTarget(null)} />}
      {subsTarget    && <SubmissionsModal form={subsTarget}   onClose={() => setSubsTarget(null)} />}
      {showUpgrade   && <UpgradeModal plan={plan} limit={formLimit} onClose={() => setShowUpgrade(false)} />}

      <div className="flex h-full flex-col overflow-hidden">
        <DashboardHeader title="Formularios incrustables" />

        <div className="flex-1 overflow-y-auto bg-slate-900/30">
          <div className="mx-auto max-w-6xl px-6 py-8">

            {/* ── Page header ─────────────────────────────────────────────── */}
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-100">Formularios incrustables</h1>
                <p className="mt-1 text-sm text-slate-400">
                  Crea formularios personalizados y añádelos a cualquier web con un fragmento de código.
                </p>
              </div>
              <Button
                onClick={() => {
                  if (atLimit) { setShowUpgrade(true); return; }
                  setEditorForm("new");
                }}
                className={`gap-1.5 flex-shrink-0 ${atLimit ? "bg-slate-700 text-slate-300 hover:!bg-orange-600 hover:!text-white" : "bg-orange-600 hover:!bg-orange-500 text-white"}`}
              >
                <Plus className="h-4 w-4" />
                Nuevo formulario
              </Button>
            </div>

            {/* ── Stat cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
              {[
                {
                  label: "Formularios creados",
                  value: isLoading ? "—" : `${formCount}/${formLimit}`,
                  icon: FileText,
                  color: atLimit ? "text-red-400" : "text-orange-400",
                  bg:    atLimit ? "bg-red-950/30" : "bg-orange-950/30",
                },
                {
                  label: "Formularios activos",
                  value: isLoading ? "—" : String(activeForms),
                  icon: Zap,
                  color: "text-green-400",
                  bg:    "bg-green-950/30",
                },
                {
                  label: "Total envíos",
                  value: isLoading ? "—" : String(totalSubmits),
                  icon: BarChart2,
                  color: "text-sky-400",
                  bg:    "bg-sky-950/30",
                },
                {
                  label: "Plan activo",
                  value: isLoading ? "—" : plan.charAt(0).toUpperCase() + plan.slice(1),
                  icon: Crown,
                  color: "text-amber-400",
                  bg:    "bg-amber-950/30",
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

            {/* ── Plan usage bar ───────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 mb-6">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    Plan activo: <span className="text-orange-400 capitalize">{plan}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formCount} de {formLimit} formulario{formLimit !== 1 ? "s" : ""} utilizados
                  </p>
                </div>
                <Link href="/precios" target="_blank" className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300">
                  <TrendingUp className="h-3 w-3" />
                  Ver planes
                </Link>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${atLimit ? "bg-red-500" : "bg-gradient-to-r from-orange-600 to-orange-400"}`}
                  style={{ width: `${Math.min((formCount / formLimit) * 100, 100)}%` }}
                />
              </div>
              {atLimit && (
                <p className="mt-2 text-xs text-red-400">
                  Has alcanzado el límite de tu plan.{" "}
                  <button onClick={() => setShowUpgrade(true)} className="underline underline-offset-2 hover:text-red-300">
                    Haz upgrade
                  </button>{" "}
                  para crear más formularios.
                </p>
              )}
            </div>

            {/* ── Form cards ───────────────────────────────────────────────── */}
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-800" />
                ))}
              </div>
            ) : forms.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-700 py-16 text-center">
                <FileText className="h-8 w-8 text-slate-600" />
                <p className="text-sm font-medium text-slate-400">Sin formularios</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Crea tu primer formulario para capturar leads directamente desde tu web.
                </p>
                <Button
                  size="sm"
                  onClick={() => setEditorForm("new")}
                  className="gap-1.5 bg-orange-600 text-white hover:!bg-orange-500"
                >
                  <Plus className="h-4 w-4" /> Crear formulario
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {forms.map((form) => (
                  <FormCard
                    key={form.id}
                    form={form}
                    onEdit={() => setEditorForm(form)}
                    onToggle={() => toggleMutation.mutate(form)}
                    onDelete={() => handleDelete(form)}
                    onEmbed={() => setEmbedTarget(form)}
                    onSubmissions={() => setSubsTarget(form)}
                    onPreview={() => setPreviewTarget(form)}
                  />
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
