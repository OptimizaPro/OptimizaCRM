"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Mail, Eye, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { campaignsApi, type EmailCampaign, type CampaignRecipientType } from "@/lib/api";

// ─── Starter templates ────────────────────────────────────────────────────────

const TEMPLATES: { label: string; html: string }[] = [
  {
    label: "Boletín simple",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px 24px;background:#ffffff;">
  <h1 style="color:#ea580c;font-size:24px;margin-bottom:8px;">¡Hola, {{FIRSTNAME}}!</h1>
  <p style="color:#374151;font-size:16px;line-height:1.6;">Bienvenido a nuestro boletín. Aquí te compartimos las últimas novedades.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <h2 style="color:#111827;font-size:18px;">Novedad del mes</h2>
  <p style="color:#6b7280;font-size:15px;line-height:1.6;">Escribe aquí el contenido principal de tu boletín.</p>
  <div style="text-align:center;margin-top:32px;">
    <a href="#" style="background:#ea580c;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Ver más →</a>
  </div>
  <p style="color:#9ca3af;font-size:12px;margin-top:32px;text-align:center;">
    © 2025 Tu empresa. <a href="{{unsubscribe}}" style="color:#9ca3af;">Cancelar suscripción</a>
  </p>
</div>`,
  },
  {
    label: "Oferta especial",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#fff;">
  <div style="background:#ea580c;padding:32px 24px;text-align:center;">
    <h1 style="color:#fff;font-size:28px;margin:0;">¡Oferta especial para ti!</h1>
    <p style="color:#fed7aa;font-size:16px;margin:8px 0 0;">Solo por tiempo limitado</p>
  </div>
  <div style="padding:32px 24px;">
    <p style="color:#374151;font-size:16px;">Hola {{FIRSTNAME}}, tenemos una oferta exclusiva para ti:</p>
    <div style="background:#fff7ed;border:2px solid #ea580c;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
      <p style="font-size:40px;font-weight:bold;color:#ea580c;margin:0;">30% DTO</p>
      <p style="color:#374151;margin:8px 0 0;">en todos nuestros servicios</p>
    </div>
    <p style="color:#6b7280;">Usa el código <strong>ESPECIAL30</strong> al momento de contratar.</p>
    <div style="text-align:center;margin-top:24px;">
      <a href="#" style="background:#ea580c;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Aprovechar oferta →</a>
    </div>
  </div>
  <p style="color:#9ca3af;font-size:12px;padding:0 24px 24px;text-align:center;">
    <a href="{{unsubscribe}}" style="color:#9ca3af;">Cancelar suscripción</a>
  </p>
</div>`,
  },
  {
    label: "Seguimiento de cliente",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px 24px;background:#ffffff;">
  <p style="color:#374151;font-size:16px;">Hola {{FIRSTNAME}},</p>
  <p style="color:#374151;font-size:16px;line-height:1.6;">Quería hacer seguimiento y ver cómo te va. Estamos aquí para ayudarte con cualquier duda o necesidad que tengas.</p>
  <p style="color:#374151;font-size:16px;line-height:1.6;">Si tienes alguna pregunta sobre nuestros servicios o simplemente quieres conversar, no dudes en responder a este email.</p>
  <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:24px 0;">
    <p style="color:#111827;font-weight:bold;margin:0 0 8px;">¿En qué podemos ayudarte hoy?</p>
    <p style="color:#6b7280;margin:0;">Escribe aquí los servicios o temas que quieres destacar.</p>
  </div>
  <a href="#" style="display:inline-block;background:#ea580c;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Contactar ahora →</a>
  <p style="color:#9ca3af;font-size:12px;margin-top:32px;">
    <a href="{{unsubscribe}}" style="color:#9ca3af;">Cancelar suscripción</a>
  </p>
</div>`,
  },
];

const RECIPIENT_OPTIONS: { value: CampaignRecipientType; label: string; desc: string }[] = [
  { value: "all_contacts",  label: "Todos los contactos", desc: "Leads y clientes con email" },
  { value: "all_leads",     label: "Solo leads",          desc: "Prospectos que no son clientes aún" },
  { value: "all_customers", label: "Solo clientes",       desc: "Contactos con estado Cliente" },
];

const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500";

interface Props {
  initial: EmailCampaign | null;
  onClose: () => void;
  onSaved: () => void;
}

export function CampaignEditor({ initial, onClose, onSaved }: Props) {
  const { tokens, organization } = useAuthStore();
  const auth = { token: tokens!.access, orgId: organization!.id };

  const [tab, setTab] = useState<"config" | "content">("config");
  const [preview, setPreview] = useState(false);

  const [name,          setName]          = useState(initial?.name ?? "");
  const [subject,       setSubject]       = useState(initial?.subject ?? "");
  const [previewText,   setPreviewText]   = useState(initial?.preview_text ?? "");
  const [fromName,      setFromName]      = useState(initial?.from_name ?? "");
  const [fromEmail,     setFromEmail]     = useState(initial?.from_email ?? "");
  const [recipientType, setRecipientType] = useState<CampaignRecipientType>(initial?.recipient_type ?? "all_contacts");
  const [htmlContent,   setHtmlContent]   = useState(initial?.html_content ?? TEMPLATES[0].html);
  const [saveError,     setSaveError]     = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<EmailCampaign>) =>
      initial
        ? campaignsApi.update(auth.token, auth.orgId, initial.id, data)
        : campaignsApi.create(auth.token, auth.orgId, data),
    onSuccess: () => { setSaveError(null); onSaved(); },
    onError: (err: Error) => setSaveError(err.message || "Error al guardar la campaña."),
  });

  function handleSave() {
    if (!name.trim()) { setSaveError("El nombre interno es obligatorio."); return; }
    if (!subject.trim()) { setSaveError("El asunto es obligatorio."); return; }
    if (!htmlContent.trim()) { setSaveError("El contenido HTML es obligatorio."); return; }
    setSaveError(null);
    saveMutation.mutate({ name, subject, preview_text: previewText, from_name: fromName, from_email: fromEmail, recipient_type: recipientType, html_content: htmlContent });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-3xl flex-col max-h-[92vh] rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              {initial ? "Editar campaña" : "Nueva campaña"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-6">
          {(["config", "content"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "pb-2.5 pt-1 text-xs font-medium transition-colors border-b-2 mr-5",
                tab === t ? "border-orange-500 text-orange-400" : "border-transparent text-slate-500 hover:text-slate-300"
              )}
            >
              {t === "config" ? "Configuración" : "Contenido"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "config" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Nombre interno *</label>
                  <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Newsletter junio 2025" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Asunto *</label>
                  <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ej. ¡Novedad exclusiva para ti!" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Texto de vista previa <span className="text-slate-600">(opcional)</span></label>
                <input className={inputCls} value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="Resumen breve que aparece en el cliente de correo..." maxLength={200} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Nombre del remitente</label>
                  <input className={inputCls} value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Tu empresa (usa el de Brevo si está vacío)" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Email del remitente</label>
                  <input className={inputCls} type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="hola@tuempresa.com" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Destinatarios</label>
                <div className="grid grid-cols-3 gap-2">
                  {RECIPIENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setRecipientType(opt.value)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-left transition-all",
                        recipientType === opt.value
                          ? "border-orange-600 bg-orange-950/30 text-orange-300"
                          : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600"
                      )}
                    >
                      <p className="text-xs font-medium">{opt.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "content" && (
            <div className="space-y-4">
              {/* Templates */}
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">Plantilla inicial</label>
                <div className="flex gap-2 flex-wrap">
                  {TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      onClick={() => setHtmlContent(tpl.html)}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:border-orange-700 hover:text-orange-400 transition-colors"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle preview */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-400">Contenido HTML *</label>
                <button
                  onClick={() => setPreview((p) => !p)}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  {preview ? <Code2 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {preview ? "Ver código" : "Vista previa"}
                </button>
              </div>

              {preview ? (
                <div
                  className="min-h-[360px] w-full rounded-xl border border-slate-700 bg-white overflow-auto"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              ) : (
                <textarea
                  className={cn(inputCls, "min-h-[360px] font-mono text-xs leading-relaxed")}
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="Pega o escribe el HTML de tu email aquí..."
                  spellCheck={false}
                />
              )}
              <p className="text-[11px] text-slate-600">
                Usa <code className="text-slate-500">{"{{FIRSTNAME}}"}</code> para el nombre del contacto y{" "}
                <code className="text-slate-500">{"{{unsubscribe}}"}</code> para el enlace de baja (requerido por Brevo).
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-6 py-4">
          {saveError && <p className="mb-3 text-xs text-red-400">{saveError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saveMutation.isPending}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-orange-600 hover:bg-orange-500 text-white"
            >
              {saveMutation.isPending ? "Guardando…" : "Guardar borrador"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
