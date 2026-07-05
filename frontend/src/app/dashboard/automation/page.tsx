"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Zap, Plus, Play, Trash2, ToggleLeft, ToggleRight,
  Clock, BarChart2, Pencil, X, ChevronDown,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { automationApi, type AutomationRule } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIGGERS = [
  { value: "lead_created",     label: "Nuevo lead creado" },
  { value: "lead_score_high",  label: "Score de lead ≥ 80" },
  { value: "deal_won",         label: "Negocio ganado" },
  { value: "deal_lost",        label: "Negocio perdido" },
  { value: "task_overdue",     label: "Tarea vencida" },
  { value: "customer_at_risk", label: "Cliente en riesgo de abandono" },
];

const ACTIONS = [
  { value: "notify_user",   label: "Notificar al usuario" },
  { value: "create_task",   label: "Crear tarea" },
  { value: "send_email",    label: "Enviar email" },
  { value: "send_whatsapp", label: "Enviar mensaje de WhatsApp" },
];

const TRIGGER_COLORS: Record<string, string> = {
  lead_created:     "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400",
  lead_score_high:  "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  deal_won:         "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  deal_lost:        "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  task_overdue:     "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400",
  customer_at_risk: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
};

const ACTION_COLORS: Record<string, string> = {
  notify_user:   "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
  create_task:   "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400",
  send_email:    "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400",
  send_whatsapp: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
};

// ─── Action config fields ─────────────────────────────────────────────────────

function ActionConfigFields({
  actionType,
  config,
  onChange,
}: {
  actionType: string;
  config: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const inputCls =
    "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500";

  if (actionType === "notify_user") {
    return (
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Título de la notificación</label>
          <input className={inputCls} placeholder="Ej. Nuevo lead disponible" value={config.title ?? ""} onChange={(e) => onChange("title", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Mensaje</label>
          <textarea className={inputCls} rows={2} placeholder="Descripción de la notificación…" value={config.message ?? ""} onChange={(e) => onChange("message", e.target.value)} />
        </div>
      </div>
    );
  }

  if (actionType === "create_task") {
    return (
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Título de la tarea</label>
          <input className={inputCls} placeholder="Ej. Contactar con el lead" value={config.title ?? ""} onChange={(e) => onChange("title", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Prioridad</label>
          <select className={inputCls} value={config.priority ?? "medium"} onChange={(e) => onChange("priority", e.target.value)}>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
        </div>
      </div>
    );
  }

  if (actionType === "send_email") {
    return (
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Asunto</label>
          <input className={inputCls} placeholder="Asunto del email" value={config.subject ?? ""} onChange={(e) => onChange("subject", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Cuerpo del mensaje</label>
          <textarea className={inputCls} rows={3} placeholder="Contenido del email…" value={config.body ?? ""} onChange={(e) => onChange("body", e.target.value)} />
        </div>
      </div>
    );
  }

  if (actionType === "send_whatsapp") {
    return (
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Mensaje de WhatsApp</label>
          <textarea className={inputCls} rows={3} placeholder="Texto del mensaje…" value={config.message ?? ""} onChange={(e) => onChange("message", e.target.value)} />
        </div>
      </div>
    );
  }

  return null;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  description: string;
  trigger_type: string;
  action_type: string;
  action_config: Record<string, string>;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  trigger_type: "lead_created",
  action_type: "notify_user",
  action_config: {},
  is_active: true,
};

function RuleModal({
  initial,
  onClose,
  onSave,
  saving,
}: {
  initial: FormState;
  onClose: () => void;
  onSave: (data: FormState) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const inputCls =
    "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-slate-100">
              {initial.name ? "Editar automatización" : "Nueva automatización"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Nombre *</label>
            <input className={inputCls} placeholder="Ej. Notificar lead de alto score" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Descripción</label>
            <input className={inputCls} placeholder="Descripción breve (opcional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>

          {/* Trigger */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Disparador (CUANDO…)</label>
            <div className="relative">
              <select
                className={cn(inputCls, "appearance-none pr-8")}
                value={form.trigger_type}
                onChange={(e) => setForm((f) => ({ ...f, trigger_type: e.target.value }))}
              >
                {TRIGGERS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Action */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Acción (ENTONCES…)</label>
            <div className="relative">
              <select
                className={cn(inputCls, "appearance-none pr-8")}
                value={form.action_type}
                onChange={(e) => setForm((f) => ({ ...f, action_type: e.target.value, action_config: {} }))}
              >
                {ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Dynamic config */}
          <div className="rounded-xl border border-dashed border-slate-700 p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Configuración de la acción</p>
            <ActionConfigFields
              actionType={form.action_type}
              config={form.action_config}
              onChange={(key, value) =>
                setForm((f) => ({ ...f, action_config: { ...f.action_config, [key]: value } }))
              }
            />
          </div>

          {/* Active toggle */}
          <label className="flex cursor-pointer items-center gap-3">
            <div
              onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                form.is_active ? "bg-orange-500" : "bg-slate-700"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                  form.is_active ? "translate-x-4" : "translate-x-0.5"
                )}
              />
            </div>
            <span className="text-sm text-slate-300">
              {form.is_active ? "Activa" : "Inactiva"}
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button
            onClick={() => onSave(form)}
            disabled={saving || !form.name.trim()}
            className="bg-orange-500 text-white hover:bg-orange-600"
          >
            {saving ? "Guardando…" : "Guardar regla"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Rule card ────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  onToggle,
  onRun,
  onEdit,
  onDelete,
  running,
}: {
  rule: AutomationRule;
  onToggle: () => void;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
  running: boolean;
}) {
  const triggerColor = TRIGGER_COLORS[rule.trigger_type] ?? "bg-slate-100 text-slate-600";
  const actionColor  = ACTION_COLORS[rule.action_type]   ?? "bg-slate-100 text-slate-600";

  return (
    <Card className={cn("bg-slate-950 transition-all", !rule.is_active && "opacity-60")}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Zap className={cn("h-4 w-4 flex-shrink-0", rule.is_active ? "text-orange-500" : "text-slate-400")} />
              <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{rule.name}</h3>
            </div>
            {rule.description && (
              <p className="mt-0.5 truncate text-xs text-slate-400">{rule.description}</p>
            )}

            {/* Trigger → Action badges */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", triggerColor)}>
                {rule.trigger_type_display}
              </span>
              <span className="text-slate-300 dark:text-slate-600">→</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", actionColor)}>
                {rule.action_type_display}
              </span>
            </div>

            {/* Stats */}
            <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <BarChart2 className="h-3 w-3" />
                {rule.run_count} ejecuciones
              </span>
              {rule.last_run_at && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(rule.last_run_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>

          {/* Right: toggle + actions */}
          <div className="flex flex-shrink-0 flex-col items-end gap-2">
            {/* Toggle */}
            <button
              onClick={onToggle}
              className="text-slate-400 transition-colors hover:text-orange-500"
              title={rule.is_active ? "Desactivar" : "Activar"}
            >
              {rule.is_active
                ? <ToggleRight className="h-6 w-6 text-orange-500" />
                : <ToggleLeft className="h-6 w-6" />}
            </button>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={onRun}
                disabled={running}
                title="Ejecutar ahora"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-orange-500 disabled:opacity-40 dark:hover:bg-slate-800"
              >
                <Play className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onEdit}
                title="Editar"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onDelete}
                title="Eliminar"
                className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES: Array<{
  name: string;
  description: string;
  trigger_type: string;
  action_type: string;
  action_config: Record<string, string>;
  emoji: string;
}> = [
  {
    emoji: "🎯",
    name: "Seguimiento de nuevo lead",
    description: "Crea una tarea de seguimiento automáticamente cada vez que entra un nuevo lead.",
    trigger_type: "lead_created",
    action_type: "create_task",
    action_config: { title: "Contactar nuevo lead", priority: "high" },
  },
  {
    emoji: "🔥",
    name: "Alerta de lead caliente",
    description: "Notifica al vendedor cuando un lead alcanza score ≥ 80 para actuar de inmediato.",
    trigger_type: "lead_score_high",
    action_type: "notify_user",
    action_config: { title: "¡Lead caliente detectado!", message: "Un lead acaba de alcanzar score alto. Contáctalo ahora." },
  },
  {
    emoji: "💬",
    name: "WhatsApp de bienvenida al cliente",
    description: "Envía un mensaje de WhatsApp al cerrar un negocio ganado para dar la bienvenida.",
    trigger_type: "deal_won",
    action_type: "send_whatsapp",
    action_config: { message: "¡Bienvenido a bordo! Estamos encantados de trabajar contigo. Pronto nos pondremos en contacto para los próximos pasos." },
  },
  {
    emoji: "🛡️",
    name: "Retención de cliente en riesgo",
    description: "Envía un email personalizado cuando la IA detecta que un cliente tiene riesgo de abandono.",
    trigger_type: "customer_at_risk",
    action_type: "send_email",
    action_config: { subject: "¿Todo bien con tu cuenta?", body: "Hemos notado que no has interactuado con nosotros últimamente. Nos gustaría saber cómo podemos ayudarte mejor." },
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AutomationPage() {
  const { tokens, organization } = useAuthStore();
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; editing: AutomationRule | null }>({ open: false, editing: null });
  const [prefill, setPrefill] = useState<FormState | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const auth = { token: tokens!.access, orgId: organization!.id };

  const { data, isLoading } = useQuery({
    queryKey: ["automations"],
    queryFn: () => automationApi.getAll(auth.token, auth.orgId),
    enabled: !!tokens && !!organization,
  });

  const rules = data?.results ?? [];

  const saveMutation = useMutation({
    mutationFn: (form: FormState & { id?: string }) =>
      form.id
        ? automationApi.update(auth.token, auth.orgId, form.id, form)
        : automationApi.create(auth.token, auth.orgId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      setModal({ open: false, editing: null });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => automationApi.toggle(auth.token, auth.orgId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => automationApi.delete(auth.token, auth.orgId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });

  const handleRun = async (id: string) => {
    setRunningId(id);
    try {
      await automationApi.run(auth.token, auth.orgId, id);
      qc.invalidateQueries({ queryKey: ["automations"] });
    } finally {
      setRunningId(null);
    }
  };

  const openCreate = () => { setPrefill(null); setModal({ open: true, editing: null }); };
  const openEdit = (rule: AutomationRule) => setModal({ open: true, editing: rule });

  const handleSave = (form: FormState) => {
    saveMutation.mutate(modal.editing ? { ...form, id: modal.editing.id } : form);
  };

  const modalInitial: FormState = modal.editing
    ? {
        name: modal.editing.name,
        description: modal.editing.description,
        trigger_type: modal.editing.trigger_type,
        action_type: modal.editing.action_type,
        action_config: modal.editing.action_config ?? {},
        is_active: modal.editing.is_active,
      }
    : (prefill ?? EMPTY_FORM);

  const activeCount   = rules.filter((r) => r.is_active).length;
  const inactiveCount = rules.length - activeCount;
  const totalRuns     = rules.reduce((s, r) => s + r.run_count, 0);

  return (
    <>
      <DashboardHeader title="Automatizaciones" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total de reglas",   value: rules.length,   color: "text-slate-700 dark:text-slate-200" },
            { label: "Activas",           value: activeCount,    color: "text-orange-600" },
            { label: "Ejecuciones totales", value: totalRuns,   color: "text-green-600" },
          ].map((s) => (
            <Card key={s.label} className="bg-slate-950">
              <CardContent className="p-4 text-center">
                <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                <p className="mt-0.5 text-xs text-slate-400">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-400">Reglas de automatización</h2>
            <p className="text-xs text-slate-400">{activeCount} activas · {inactiveCount} inactivas</p>
          </div>
          <Button onClick={openCreate} className="gap-1.5 bg-orange-500 text-white hover:bg-orange-600">
            <Plus className="h-4 w-4" />
            Nueva automatización
          </Button>
        </div>

        {/* Templates */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Plantillas sugeridas</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                onClick={() => {
                  setModal({
                    open: true,
                    editing: null,
                  });
                  // pre-fill via a separate state
                  setPrefill({
                    name: tpl.name,
                    description: tpl.description,
                    trigger_type: tpl.trigger_type,
                    action_type: tpl.action_type,
                    action_config: tpl.action_config,
                    is_active: true,
                  });
                }}
                className="group rounded-xl border border-slate-800 bg-slate-950 p-4 text-left transition-all hover:border-orange-700/50 hover:bg-slate-900"
              >
                <span className="text-2xl">{tpl.emoji}</span>
                <p className="mt-2 text-sm font-semibold text-slate-200 group-hover:text-white">{tpl.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{tpl.description}</p>
                <p className="mt-3 text-xs font-medium text-orange-500 group-hover:text-orange-400">Usar plantilla →</p>
              </button>
            ))}
          </div>
        </div>

        {/* Rules grid */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 py-20 text-slate-400 dark:border-slate-700">
            <Zap className="h-10 w-10 opacity-30" />
            <div className="text-center">
              <p className="text-sm font-medium">Sin automatizaciones</p>
              <p className="mt-0.5 text-xs">Crea tu primera regla para automatizar tareas repetitivas</p>
            </div>
            <Button onClick={openCreate} variant="outline" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Crear regla
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={() => toggleMutation.mutate(rule.id)}
                onRun={() => handleRun(rule.id)}
                onEdit={() => openEdit(rule)}
                onDelete={() => {
                  if (confirm(`¿Eliminar la regla "${rule.name}"?`)) {
                    deleteMutation.mutate(rule.id);
                  }
                }}
                running={runningId === rule.id}
              />
            ))}
          </div>
        )}

        {/* Trigger reference */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Disparadores disponibles</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {TRIGGERS.map((t) => (
              <div key={t.value} className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full flex-shrink-0", TRIGGER_COLORS[t.value]?.includes("teal") ? "bg-teal-400" : TRIGGER_COLORS[t.value]?.includes("blue") ? "bg-blue-400" : TRIGGER_COLORS[t.value]?.includes("green") ? "bg-green-400" : TRIGGER_COLORS[t.value]?.includes("red") ? "bg-red-400" : TRIGGER_COLORS[t.value]?.includes("yellow") ? "bg-yellow-400" : "bg-orange-400")} />
                <span className="text-xs text-slate-500 dark:text-slate-400">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal.open && (
        <RuleModal
          initial={modalInitial}
          onClose={() => { setModal({ open: false, editing: null }); setPrefill(null); }}
          onSave={handleSave}
          saving={saveMutation.isPending}
        />
      )}
    </>
  );
}
