"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth";
import { crmApi, type WhatsAppCampaign, type WACampaignStatus, type CustomerSegment } from "@/lib/api";
import {
  Plus, X, Loader2, Pencil, Trash2, Send, Eye,
  MessageCircle, Users, CheckCheck, AlertCircle, Clock,
  Search, CalendarDays,
} from "lucide-react";

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<WACampaignStatus, { label: string; color: string; variant: "default" | "success" | "warning" | "destructive" | "secondary" }> = {
  draft:     { label: "Borrador",  color: "text-slate-400",  variant: "secondary" },
  scheduled: { label: "Programada", color: "text-blue-400",  variant: "default" },
  sending:   { label: "Enviando",  color: "text-yellow-400", variant: "warning" },
  sent:      { label: "Enviada",   color: "text-green-400",  variant: "success" },
  failed:    { label: "Fallida",   color: "text-red-400",    variant: "destructive" },
};

const SEGMENT_LABELS: Record<string, string> = {
  all:      "Todos los clientes",
  basic:    "Básico",
  frequent: "Frecuente",
  vip:      "VIP",
  premium:  "Premium",
};

const VARIABLES_HELP = [
  { var: "{{nombre}}",   desc: "Nombre del cliente" },
  { var: "{{segmento}}", desc: "Nivel del cliente" },
  { var: "{{empresa}}",  desc: "Empresa del cliente" },
];

const selectCls = "w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-orange-500 focus:outline-none";

const EMPTY_FORM: Partial<WhatsAppCampaign> = {
  name:             "",
  message_template: "",
  target_segment:   "all",
  status:           "draft",
  scheduled_at:     null,
};

// ─── Campaign Card ────────────────────────────────────────────────────────────

function CampaignCard({
  campaign, onEdit, onDelete, onPreview, onSend, isSending,
}: {
  campaign: WhatsAppCampaign;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onSend: () => void;
  isSending: boolean;
}) {
  const cfg = STATUS_CONFIG[campaign.status];
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmSend, setConfirmSend]     = useState(false);

  return (
    <Card className="bg-slate-950 border-slate-800 hover:border-slate-700 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-100 truncate">{campaign.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {SEGMENT_LABELS[campaign.target_segment] ?? campaign.target_segment}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
          </div>
        </div>

        {/* Message preview */}
        <div className="mb-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
          <p className="text-xs text-slate-400 line-clamp-3 whitespace-pre-wrap">{campaign.message_template}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
          <div className="rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-center">
            <p className="text-slate-500">Destinatarios</p>
            <p className="font-bold text-slate-200">{campaign.recipient_count}</p>
          </div>
          <div className="rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-center">
            <p className="text-slate-500">Enviados</p>
            <p className={`font-bold ${campaign.sent_count > 0 ? "text-green-400" : "text-slate-500"}`}>{campaign.sent_count}</p>
          </div>
          <div className="rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-center">
            <p className="text-slate-500">Fallidos</p>
            <p className={`font-bold ${campaign.failed_count > 0 ? "text-red-400" : "text-slate-500"}`}>{campaign.failed_count}</p>
          </div>
        </div>

        {campaign.scheduled_at && (
          <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" />
            Programada: {new Date(campaign.scheduled_at).toLocaleString("es-GT")}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button size="sm" variant="outline" className="gap-1.5 border-slate-700 text-slate-400 hover:text-white h-7 text-xs"
            onClick={onPreview}>
            <Eye className="h-3 w-3" /> Vista previa
          </Button>
          {campaign.status === "draft" || campaign.status === "scheduled" ? (
            <>
              <Button size="sm" variant="outline" className="gap-1.5 border-slate-700 text-slate-400 hover:text-orange-400 h-7 text-xs"
                onClick={onEdit}>
                <Pencil className="h-3 w-3" /> Editar
              </Button>
              {!confirmSend ? (
                <Button size="sm" className="gap-1.5 bg-green-700 hover:bg-green-600 text-white h-7 text-xs"
                  disabled={isSending} onClick={() => setConfirmSend(true)}>
                  <Send className="h-3 w-3" /> Enviar
                </Button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">¿Enviar a {campaign.recipient_count} clientes?</span>
                  <Button size="sm" className="h-6 bg-green-600 hover:bg-green-500 text-white text-xs"
                    disabled={isSending} onClick={onSend}>
                    {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 border-slate-700 text-slate-400 text-xs"
                    onClick={() => setConfirmSend(false)}>No</Button>
                </div>
              )}
            </>
          ) : null}
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="ml-auto text-slate-600 hover:text-red-400 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-xs text-slate-500">¿Eliminar?</span>
              <Button size="sm" className="h-6 bg-red-600 text-white text-xs" onClick={onDelete}>Sí</Button>
              <Button size="sm" variant="outline" className="h-6 border-slate-700 text-slate-400 text-xs"
                onClick={() => setConfirmDelete(false)}>No</Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Campaign Form ────────────────────────────────────────────────────────────

function CampaignForm({
  initial, onSave, onClose, isSaving,
}: {
  initial: Partial<WhatsAppCampaign>;
  onSave: (data: Partial<WhatsAppCampaign>) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<Partial<WhatsAppCampaign>>(initial);
  const set = (key: keyof WhatsAppCampaign, val: unknown) => setForm(p => ({ ...p, [key]: val }));

  const insertVariable = (v: string) => {
    set("message_template", (form.message_template ?? "") + v);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-100">
            {initial.id ? "Editar campaña" : "Nueva campaña WhatsApp"}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Nombre de la campaña *</label>
            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)}
              placeholder="Ej: Promoción de verano VIP" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Segmento objetivo</label>
              <select value={form.target_segment} onChange={(e) => set("target_segment", e.target.value as "all" | CustomerSegment)}
                className={selectCls}>
                {Object.entries(SEGMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Programar para (opcional)</label>
              <input type="datetime-local" value={form.scheduled_at?.slice(0, 16) ?? ""}
                onChange={(e) => set("scheduled_at", e.target.value || null)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-orange-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-400">Mensaje *</label>
              <div className="flex items-center gap-1">
                {VARIABLES_HELP.map(({ var: v }) => (
                  <button key={v} onClick={() => insertVariable(v)}
                    className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-xs text-slate-400 hover:border-orange-600 hover:text-orange-400 transition-colors font-mono">
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={form.message_template ?? ""} onChange={(e) => set("message_template", e.target.value)}
              rows={5} placeholder="Hola {{nombre}}, tenemos una oferta especial para clientes {{segmento}}..."
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 resize-none focus:border-orange-500 focus:outline-none" />
            <div className="mt-1.5 flex flex-wrap gap-2">
              {VARIABLES_HELP.map(({ var: v, desc }) => (
                <span key={v} className="text-xs text-slate-600">
                  <span className="font-mono text-slate-500">{v}</span> = {desc}
                </span>
              ))}
            </div>
          </div>

          {/* WhatsApp integration notice */}
          <div className="rounded-lg border border-yellow-900/50 bg-yellow-950/20 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-yellow-400">Integración WhatsApp pendiente</p>
                <p className="text-xs text-yellow-600 mt-0.5">
                  Las campañas quedan guardadas. El envío masivo se habilitará al configurar la integración Meta WhatsApp Business API en Integraciones.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button className="bg-orange-600 hover:bg-orange-500 text-white"
            disabled={!form.name || !form.message_template || isSaving}
            onClick={() => onSave(form)}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar campaña"}
          </Button>
          <Button variant="outline" className="border-slate-700 text-slate-300" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({ rendered, recipient, onClose }: {
  rendered: string;
  recipient: { name: string; phone: string; segment: string } | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-400" /> Vista previa
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        {recipient && (
          <div className="mb-3 text-xs text-slate-500">
            Ejemplo para: <span className="text-slate-300">{recipient.name}</span> · {recipient.phone}
          </div>
        )}
        <div className="rounded-2xl rounded-tl-sm bg-slate-800 p-4">
          <p className="text-sm text-slate-100 whitespace-pre-wrap">{rendered}</p>
        </div>
        {!recipient && (
          <p className="mt-3 text-xs text-slate-500 text-center">No hay clientes con número de teléfono en este segmento.</p>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WhatsAppCampaignsPage() {
  const { tokens, organization } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<WhatsAppCampaign | null>(null);
  const [preview, setPreview]       = useState<{ rendered: string; recipient: { name: string; phone: string; segment: string } | null } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["wa-campaigns", search, statusFilter],
    queryFn:  () => {
      const qs = new URLSearchParams();
      if (search)       qs.set("search", search);
      if (statusFilter) qs.set("status", statusFilter);
      const q = qs.toString();
      return crmApi.getWACampaigns(tokens!.access, organization!.id, q || undefined);
    },
    enabled: !!tokens && !!organization,
  });

  const createMutation = useMutation({
    mutationFn: (d: Partial<WhatsAppCampaign>) => crmApi.createWACampaign(tokens!.access, organization!.id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["wa-campaigns"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WhatsAppCampaign> }) =>
      crmApi.updateWACampaign(tokens!.access, organization!.id, id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["wa-campaigns"] }); setEditing(null); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteWACampaign(tokens!.access, organization!.id, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wa-campaigns"] }),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => crmApi.sendWACampaign(tokens!.access, organization!.id, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wa-campaigns"] }),
  });

  const previewMutation = useMutation({
    mutationFn: (id: string) => crmApi.previewWACampaign(tokens!.access, organization!.id, id),
    onSuccess: (data) => setPreview(data),
  });

  const campaigns = data?.results ?? [];

  // Stats
  const stats = {
    total:    campaigns.length,
    sent:     campaigns.filter(c => c.status === "sent").length,
    draft:    campaigns.filter(c => c.status === "draft").length,
    contacts: campaigns.filter(c => c.status === "sent").reduce((s, c) => s + c.sent_count, 0),
  };

  return (
    <>
      <DashboardHeader title="Campañas WhatsApp" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">

        {/* Stats row */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total campañas", value: stats.total,    icon: MessageCircle, color: "text-blue-400" },
            { label: "Enviadas",       value: stats.sent,     icon: CheckCheck,    color: "text-green-400" },
            { label: "Borradores",     value: stats.draft,    icon: Clock,         color: "text-slate-400" },
            { label: "Msgs enviados",  value: stats.contacts, icon: Users,         color: "text-orange-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-xs text-slate-500">{label}</span>
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9 w-full sm:w-52" placeholder="Buscar campañas..." value={search}
                onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-300">
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}
            className="gap-2 bg-orange-600 hover:bg-orange-500 text-white">
            <Plus className="h-4 w-4" /> Nueva campaña
          </Button>
        </div>

        {/* Campaigns grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-56 rounded-xl border border-slate-800 bg-slate-950 animate-pulse" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-20 text-center">
            <MessageCircle className="mx-auto h-12 w-12 text-slate-700 mb-3" />
            <p className="text-slate-400 font-medium">Sin campañas de WhatsApp</p>
            <p className="text-sm text-slate-600 mt-1">Crea tu primera campaña para llegar a tus clientes</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map(c => (
              <CampaignCard key={c.id} campaign={c}
                onEdit={() => { setEditing(c); setShowForm(true); }}
                onDelete={() => deleteMutation.mutate(c.id)}
                onPreview={() => previewMutation.mutate(c.id)}
                onSend={() => sendMutation.mutate(c.id)}
                isSending={sendMutation.isPending && sendMutation.variables === c.id}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <CampaignForm
          initial={editing ?? EMPTY_FORM}
          onClose={() => { setShowForm(false); setEditing(null); }}
          isSaving={createMutation.isPending || updateMutation.isPending}
          onSave={(d) => {
            if (editing) {
              updateMutation.mutate({ id: editing.id, data: d });
            } else {
              createMutation.mutate(d);
            }
          }}
        />
      )}

      {preview && (
        <PreviewModal rendered={preview.rendered} recipient={preview.recipient} onClose={() => setPreview(null)} />
      )}
    </>
  );
}
