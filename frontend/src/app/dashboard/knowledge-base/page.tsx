"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { useAuthStore } from "@/store/auth";
import { kbApi, type KnowledgeBase, type KBSource } from "@/lib/api";
import {
  BookOpen, Save, Plus, Trash2, Link2, FileUp, Loader2,
  Building2, ShoppingBag, DollarSign, HelpCircle, Clock,
  Phone, Calendar, Star, MessageCircle, AlertTriangle, X,
} from "lucide-react";

// ─── Styles ──────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20";

const textareaCls =
  "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20 resize-none";

// ─── KB field config ──────────────────────────────────────────────────────────

const KB_FIELDS: {
  key: keyof Omit<KnowledgeBase, "id" | "qualification_questions">;
  label: string;
  icon: React.ElementType;
  placeholder: string;
  rows: number;
}[] = [
  {
    key:         "company_info",
    label:       "Sobre la empresa",
    icon:        Building2,
    placeholder: "Quiénes somos, misión, propuesta de valor…",
    rows:        4,
  },
  {
    key:         "products_services",
    label:       "Productos y servicios",
    icon:        ShoppingBag,
    placeholder: "Qué ofrecemos, cómo funciona, beneficios clave…",
    rows:        4,
  },
  {
    key:         "pricing",
    label:       "Precios y planes",
    icon:        DollarSign,
    placeholder: "Precios, planes, condiciones de contratación…",
    rows:        3,
  },
  {
    key:         "faqs",
    label:       "Preguntas frecuentes",
    icon:        HelpCircle,
    placeholder: "Q&A más comunes de tus clientes…",
    rows:        4,
  },
  {
    key:         "working_hours",
    label:       "Horario de atención",
    icon:        Clock,
    placeholder: "Ej: Lunes a viernes 8am–6pm, sábados 9am–1pm",
    rows:        2,
  },
  {
    key:         "contact_info",
    label:       "Información de contacto",
    icon:        Phone,
    placeholder: "Email, teléfono, dirección, web…",
    rows:        2,
  },
  {
    key:         "appointment_rules",
    label:       "Reglas de citas",
    icon:        Calendar,
    placeholder: "Cómo agendar, disponibilidad, duración de sesiones…",
    rows:        3,
  },
];

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({
  src,
  onDelete,
}: {
  src: KBSource;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2">
      {src.source_type === "url" ? (
        <Link2 className="h-3.5 w-3.5 shrink-0 text-blue-400" />
      ) : (
        <FileUp className="h-3.5 w-3.5 shrink-0 text-purple-400" />
      )}
      <span className="min-w-0 flex-1 truncate text-xs text-slate-300" title={src.name}>
        {src.name}
      </span>
      <span className="shrink-0 text-[10px] text-slate-500">
        {src.char_count.toLocaleString()} chars
      </span>
      <button
        type="button"
        onClick={onDelete}
        className="ml-1 rounded p-0.5 text-slate-500 hover:text-red-400 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KnowledgeBasePage() {
  const { tokens, organization } = useAuthStore();
  const token = tokens?.access ?? "";
  const organizationId = organization?.id ?? "";
  const qc = useQueryClient();

  // ── Local form state ──────────────────────────────────────────────────────
  const [form, setForm] = useState<Partial<KnowledgeBase>>({});
  const [dirty, setDirty] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [qualInput, setQualInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Data fetch ────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["kb-manage", organizationId],
    queryFn:  () => kbApi.get(token!, organizationId!),
    enabled:  !!(token && organizationId),
  });

  // Hydrate form on first load (not during user edits)
  const kb = data?.knowledge_base;
  useEffect(() => {
    if (kb && !dirty) setForm(kb);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kb]);

  const { data: sourcesData, isLoading: sourcesLoading } = useQuery({
    queryKey: ["kb-sources", organizationId],
    queryFn:  () => kbApi.listSources(token!, organizationId!),
    enabled:  !!(token && organizationId),
  });

  // Helper: always read fresh auth from store (avoids stale closure on first render)
  function getAuth() {
    const { tokens: t, organization: o } = useAuthStore.getState();
    return { tok: t?.access ?? "", orgId: String(o?.id ?? "") };
  }

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: () => {
      const { tok, orgId } = getAuth();
      return kbApi.save(tok, orgId, form as Partial<KnowledgeBase>);
    },
    onSuccess: (res) => {
      setForm(res.knowledge_base);
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["kb-manage"] });
      toast.success("Base de conocimiento guardada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const scrapeMut = useMutation({
    mutationFn: (url: string) => {
      const { tok, orgId } = getAuth();
      return kbApi.scrapeUrl(tok, orgId, url);
    },
    onSuccess: (res) => {
      // Merge scraped data into form
      setForm((prev) => {
        const next = { ...prev };
        const kbPatch = res.knowledge_base as Partial<KnowledgeBase>;
        (Object.keys(kbPatch) as (keyof KnowledgeBase)[]).forEach((k) => {
          const val = kbPatch[k];
          if (val && typeof val === "string" && val.trim()) {
            (next as Record<string, unknown>)[k] = prev[k]
              ? `${prev[k]}\n\n${val}`
              : val;
          }
        });
        return next;
      });
      setDirty(true);
      setUrlInput("");
      qc.invalidateQueries({ queryKey: ["kb-sources"] });
      toast.success(`URL importada: ${res.source?.name ?? "OK"}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const importFileMut = useMutation({
    mutationFn: (file: File) => {
      const { tok, orgId } = getAuth();
      return kbApi.importFile(tok, orgId, file);
    },
    onSuccess: (res) => {
      setForm((prev) => {
        const next = { ...prev };
        const kbPatch = res.knowledge_base as Partial<KnowledgeBase>;
        (Object.keys(kbPatch) as (keyof KnowledgeBase)[]).forEach((k) => {
          const val = kbPatch[k];
          if (val && typeof val === "string" && val.trim()) {
            (next as Record<string, unknown>)[k] = prev[k]
              ? `${prev[k]}\n\n${val}`
              : val;
          }
        });
        return next;
      });
      setDirty(true);
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["kb-sources"] });
      toast.success(`Archivo importado: ${res.filename}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteSrcMut = useMutation({
    mutationFn: (sourceId: string) => {
      const { tok, orgId } = getAuth();
      return kbApi.deleteSource(tok, orgId, sourceId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kb-sources"] });
      toast.success("Fuente eliminada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  function setField<K extends keyof KnowledgeBase>(k: K, v: KnowledgeBase[K]) {
    setForm((p) => ({ ...p, [k]: v }));
    setDirty(true);
  }

  function addQualQuestion() {
    const q = qualInput.trim();
    if (!q) return;
    const current = (form.qualification_questions ?? []) as string[];
    setField("qualification_questions", [...current, q] as KnowledgeBase["qualification_questions"]);
    setQualInput("");
  }

  function removeQualQuestion(idx: number) {
    const current = [...((form.qualification_questions ?? []) as string[])];
    current.splice(idx, 1);
    setField("qualification_questions", current as KnowledgeBase["qualification_questions"]);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const sources = sourcesData?.sources ?? [];
  const sourceLimit = sourcesData?.limit ?? data?.source_limit ?? 3;
  const sourceCount = sources.length;
  const atLimit = sourceCount >= sourceLimit;

  const importing = scrapeMut.isPending || importFileMut.isPending;

  return (
    <div className="flex h-full flex-col bg-slate-950">
      <DashboardHeader title="Base de Conocimiento" />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">

          {/* ── Sources panel ──────────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-orange-400" />
                <h2 className="text-sm font-semibold text-white">Fuentes importadas</h2>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                  {sourceCount} / {sourceLimit}
                </span>
              </div>
            </div>

            {/* URL import */}
            <div className="mb-3 flex gap-2">
              <input
                type="url"
                placeholder="https://tu-sitio.com/pagina"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && urlInput.trim()) {
                    e.preventDefault();
                    scrapeMut.mutate(urlInput.trim());
                  }
                }}
                disabled={atLimit || importing}
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={() => urlInput.trim() && scrapeMut.mutate(urlInput.trim())}
                disabled={!urlInput.trim() || atLimit || importing}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-orange-400 hover:text-orange-400 disabled:opacity-40 transition-colors"
              >
                {scrapeMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                <span className="hidden sm:inline">Importar URL</span>
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={atLimit || importing}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-orange-400 hover:text-orange-400 disabled:opacity-40 transition-colors"
              >
                {importFileMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                <span className="hidden sm:inline">Subir archivo</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.md"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importFileMut.mutate(f);
                }}
              />
            </div>

            {atLimit && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <p className="text-xs text-amber-300">
                  Has alcanzado el límite de {sourceLimit} fuentes de tu plan. Elimina una o actualiza tu plan.
                </p>
              </div>
            )}

            {sourcesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              </div>
            ) : sources.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                Sin fuentes todavía. Importa una URL o archivo para enriquecer el conocimiento.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {sources.map((src) => (
                  <SourceBadge
                    key={src.id}
                    src={src}
                    onDelete={() => deleteSrcMut.mutate(src.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── KB fields ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-white">Contenido de la base de conocimiento</h2>
              {dirty && (
                <span className="text-xs text-orange-400">Cambios sin guardar</span>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : (
              <div className="space-y-5">
                {KB_FIELDS.map(({ key, label, icon: Icon, placeholder, rows }) => (
                  <div key={key}>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </label>
                    <textarea
                      rows={rows}
                      placeholder={placeholder}
                      value={(form[key] as string) ?? ""}
                      onChange={(e) => setField(key, e.target.value as KnowledgeBase[typeof key])}
                      className={textareaCls}
                    />
                  </div>
                ))}

                {/* WhatsApp number */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp de escalado
                  </label>
                  <input
                    type="text"
                    placeholder="50212345678  (código de país sin +)"
                    value={form.whatsapp_number ?? ""}
                    onChange={(e) => setField("whatsapp_number", e.target.value)}
                    className={inputCls}
                  />
                </div>

                {/* Qualification questions */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <Star className="h-3.5 w-3.5" />
                    Preguntas de calificación
                  </label>
                  <div className="mb-2 space-y-1.5">
                    {((form.qualification_questions ?? []) as string[]).map((q, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2">
                        <span className="mt-0.5 text-[10px] font-bold text-slate-500 tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 text-xs text-slate-300">{q}</span>
                        <button
                          type="button"
                          onClick={() => removeQualQuestion(i)}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ej: ¿Cuántos empleados tiene tu empresa?"
                      value={qualInput}
                      onChange={(e) => setQualInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); addQualQuestion(); }
                      }}
                      className={`${inputCls} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={addQualQuestion}
                      disabled={!qualInput.trim()}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:border-orange-400 hover:text-orange-400 disabled:opacity-40 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Save button ───────────────────────────────────────────── */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || !dirty}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-50 transition-colors"
            >
              {saveMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar base de conocimiento
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
