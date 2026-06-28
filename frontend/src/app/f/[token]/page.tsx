"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface FieldDef {
  key: string;
  label: string;
  field_type: "text" | "email" | "phone" | "textarea" | "select" | "checkbox";
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

interface FormConfig {
  token: string;
  fields: FieldDef[];
  style: { primary_color?: string; bg_color?: string; border_radius?: string };
  success_message: string;
  redirect_url: string;
}

export default function PublicFormPage() {
  const { token } = useParams<{ token: string }>();

  const [config,    setConfig]    = useState<FormConfig | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [values,    setValues]    = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted,  setSubmitted]  = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/f/config/?token=${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setConfig(data);
        // initialise checkbox values to "false"
        const init: Record<string, string> = {};
        (data.fields as FieldDef[]).forEach((f) => {
          if (f.field_type === "checkbox") init[f.key] = "false";
        });
        setValues(init);
      })
      .catch(() => setLoadError(true));
  }, [token]);

  const primary = config?.style?.primary_color ?? "#ea580c";
  const bg      = config?.style?.bg_color      ?? "#ffffff";
  const radius  = `${config?.style?.border_radius ?? "8"}px`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/f/submit/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, data: values }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error ?? "Error al enviar el formulario.");
        return;
      }
      if (config?.redirect_url) {
        window.top!.location.href = config.redirect_url;
      } else {
        setSubmitted(true);
      }
    } catch {
      setSubmitError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-sm font-medium text-slate-600">Formulario no disponible.</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6" style={{ background: bg }}>
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: `${primary}20` }}>
            <CheckCircle className="h-7 w-7" style={{ color: primary }} />
          </div>
          <p className="text-base font-semibold text-slate-800">{config.success_message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 flex items-start justify-center" style={{ background: bg }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-7 shadow-sm"
        style={{ borderRadius: radius }}
        noValidate
      >
        {config.fields.map((field) => (
          <div key={field.key}>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </label>

            {field.field_type === "textarea" ? (
              <textarea
                rows={3}
                placeholder={field.placeholder}
                required={field.required}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
                style={{ ["--tw-ring-color" as string]: primary }}
              />
            ) : field.field_type === "select" ? (
              <select
                required={field.required}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2"
              >
                <option value="">Selecciona una opción</option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.field_type === "checkbox" ? (
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={values[field.key] === "true"}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: String(e.target.checked) }))}
                  className="h-4 w-4 rounded border-slate-300"
                  style={{ accentColor: primary }}
                />
                <span className="text-sm text-slate-600">{field.placeholder || field.label}</span>
              </label>
            ) : (
              <input
                type={field.field_type}
                placeholder={field.placeholder}
                required={field.required}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2"
              />
            )}
          </div>
        ))}

        {submitError && (
          <p className="flex items-center gap-1.5 text-sm text-red-500">
            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          style={{ background: primary, borderRadius: radius }}
        >
          {submitting ? "Enviando…" : "Enviar"}
        </button>

        <p className="text-center text-[11px] text-slate-400">
          Powered by <span className="font-semibold">OptimizaCRM</span>
        </p>
      </form>
    </div>
  );
}
