"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail, Plus, Send, BarChart2, Pencil, Trash2,
  RefreshCw, AlertCircle, CheckCircle2, Clock, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth";
import { FeatureGate } from "@/components/dashboard/feature-gate";
import { campaignsApi, type EmailCampaign } from "@/lib/api";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { CampaignEditor } from "@/components/dashboard/campaign-editor";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, label }: { status: EmailCampaign["status"]; label: string }) {
  const styles: Record<string, string> = {
    draft:   "bg-slate-800 text-slate-400 border-slate-700",
    sending: "bg-yellow-950/40 text-yellow-400 border-yellow-800",
    sent:    "bg-green-950/40 text-green-400 border-green-800",
    error:   "bg-red-950/40 text-red-400 border-red-800",
  };
  const icons: Record<string, React.ReactNode> = {
    draft:   <FileText className="h-3 w-3" />,
    sending: <Clock className="h-3 w-3 animate-pulse" />,
    sent:    <CheckCircle2 className="h-3 w-3" />,
    error:   <AlertCircle className="h-3 w-3" />,
  };
  return (
    <Badge className={`flex items-center gap-1 text-xs ${styles[status] ?? styles.draft}`}>
      {icons[status]} {label}
    </Badge>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="text-base font-bold text-slate-100">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

// ─── Campaign card ────────────────────────────────────────────────────────────

function CampaignCard({
  campaign, onEdit, onSend, onSyncStats, onDelete, isSending, isSyncing,
}: {
  campaign:   EmailCampaign;
  onEdit:     () => void;
  onSend:     () => void;
  onSyncStats: () => void;
  onDelete:   () => void;
  isSending:  boolean;
  isSyncing:  boolean;
}) {
  const isDraft  = campaign.status === "draft";
  const isSent   = campaign.status === "sent";
  const isError  = campaign.status === "error";

  return (
    <div className={`rounded-xl border bg-slate-950 p-5 transition-all ${isError ? "border-red-900/40" : "border-slate-800"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-4 w-4 flex-shrink-0 text-orange-400" />
            <h3 className="truncate text-sm font-semibold text-slate-100">{campaign.name}</h3>
          </div>
          <p className="text-xs text-slate-400 truncate">{campaign.subject}</p>
        </div>
        <StatusBadge status={campaign.status} label={campaign.status_display} />
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-3">
        <span>{campaign.recipient_type_display}</span>
        {campaign.sent_at && (
          <span>
            Enviado {new Date(campaign.sent_at).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        )}
        {campaign.recipient_count > 0 && (
          <span>{campaign.recipient_count} destinatarios</span>
        )}
      </div>

      {/* Stats (sent only) */}
      {isSent && campaign.stat_delivered > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 rounded-lg bg-slate-900 py-3">
          <Stat label="Entregados"  value={campaign.stat_delivered} />
          <Stat label="Aperturas"   value={`${campaign.open_rate}%`} />
          <Stat label="Clics"       value={`${campaign.click_rate}%`} />
          <Stat label="Bajas"       value={campaign.stat_unsubscribes} />
        </div>
      )}

      {/* Error message */}
      {isError && campaign.error_message && (
        <p className="mb-3 text-xs text-red-400 flex gap-1.5 items-start">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          {campaign.error_message}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5">
        {isDraft && (
          <>
            <button onClick={onEdit} className="flex items-center gap-1 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-500 transition-colors">
              <Pencil className="h-3 w-3" /> Editar
            </button>
            <button
              onClick={onSend}
              disabled={isSending}
              className="flex items-center gap-1 rounded-md border border-orange-700 px-2.5 py-1.5 text-xs text-orange-400 hover:bg-orange-950/30 transition-colors disabled:opacity-50"
            >
              <Send className="h-3 w-3" />
              {isSending ? "Enviando…" : "Enviar ahora"}
            </button>
          </>
        )}
        {isSent && (
          <button
            onClick={onSyncStats}
            disabled={isSyncing}
            className="flex items-center gap-1 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Actualizando…" : "Actualizar stats"}
          </button>
        )}
        {isError && (
          <button onClick={onEdit} className="flex items-center gap-1 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-500 transition-colors">
            <Pencil className="h-3 w-3" /> Revisar
          </button>
        )}
        {(isDraft || isError) && (
          <button onClick={onDelete} className="flex items-center gap-1 rounded-md border border-red-900/40 px-2.5 py-1.5 text-xs text-red-400 hover:border-red-700 transition-colors">
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const { tokens, organization } = useAuthStore();
  const qc = useQueryClient();
  const auth = { token: tokens!.access, orgId: organization!.id };

  const [editorCampaign, setEditorCampaign] = useState<EmailCampaign | null | "new">(null);
  const [sendingId,   setSendingId]   = useState<string | null>(null);
  const [syncingId,   setSyncingId]   = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn:  () => campaignsApi.list(auth.token, auth.orgId),
    enabled:  !!tokens && !!organization,
  });

  const campaigns: EmailCampaign[] = data?.results ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.delete(auth.token, auth.orgId, id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  async function handleSend(campaign: EmailCampaign) {
    if (!confirm(`¿Enviar la campaña "${campaign.name}" ahora?\n\nEsta acción no se puede deshacer.`)) return;
    setSendingId(campaign.id);
    setActionError(null);
    try {
      await campaignsApi.send(auth.token, auth.orgId, campaign.id);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error al enviar la campaña.");
    } finally {
      setSendingId(null);
    }
  }

  async function handleSyncStats(campaign: EmailCampaign) {
    setSyncingId(campaign.id);
    setActionError(null);
    try {
      await campaignsApi.syncStats(auth.token, auth.orgId, campaign.id);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error al sincronizar estadísticas.");
    } finally {
      setSyncingId(null);
    }
  }

  const draftCount = campaigns.filter((c) => c.status === "draft").length;
  const sentCount  = campaigns.filter((c) => c.status === "sent").length;
  const totalSent  = campaigns.reduce((acc, c) => acc + c.recipient_count, 0);

  return (
    <FeatureGate
      minPlan="pro"
      featureName="Campañas de Email"
      featureDescription="Crea, programa y envía campañas de email a tus contactos segmentados. Analiza aperturas, clics y conversiones."
      highlights={["Editor de plantillas HTML", "Segmentación por etiquetas y plan", "Estadísticas de apertura y clics", "Programación automática de envíos"]}
    >
    <>
      {editorCampaign !== null && (
        <CampaignEditor
          initial={editorCampaign === "new" ? null : editorCampaign}
          onClose={() => setEditorCampaign(null)}
          onSaved={() => { setEditorCampaign(null); qc.invalidateQueries({ queryKey: ["campaigns"] }); }}
        />
      )}

      <DashboardHeader title="Campañas de email" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* Header row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Mail className="h-5 w-5 text-orange-400" />
              Email marketing
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Crea y envía campañas a tus leads y clientes directamente desde Brevo.
            </p>
          </div>
          <Button onClick={() => setEditorCampaign("new")} className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white self-start">
            <Plus className="h-4 w-4" /> Nueva campaña
          </Button>
        </div>

        {/* Summary KPIs */}
        {campaigns.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[
              { label: "Borradores",         value: draftCount,  icon: FileText,     color: "text-slate-400" },
              { label: "Campañas enviadas",  value: sentCount,   icon: CheckCircle2, color: "text-green-400" },
              { label: "Emails totales enviados", value: totalSent.toLocaleString("es-ES"), icon: Send, color: "text-orange-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex items-center gap-3">
                <Icon className={`h-5 w-5 ${color}`} />
                <div>
                  <p className="text-xl font-bold text-slate-100">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action error */}
        {actionError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {actionError}
          </div>
        )}

        {/* Brevo notice */}
        <div className="mb-5 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 text-xs text-slate-500">
          <span className="font-medium text-slate-400">Requisito:</span> Necesitas la integración de{" "}
          <a href="/dashboard/integrations" className="text-orange-400 hover:underline">Brevo conectada</a>{" "}
          con API key y email de remitente para poder enviar campañas.
        </div>

        {/* List */}
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-800" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 py-16 text-center">
            <Mail className="h-9 w-9 text-slate-700" />
            <p className="text-sm font-medium text-slate-500">Sin campañas</p>
            <p className="text-xs text-slate-500">Crea tu primera campaña para empezar a enviar emails a tus contactos.</p>
            <Button onClick={() => setEditorCampaign("new")} variant="outline" size="sm" className="gap-1.5 mt-1">
              <Plus className="h-3.5 w-3.5" /> Crear campaña
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onEdit={() => setEditorCampaign(campaign)}
                onSend={() => handleSend(campaign)}
                onSyncStats={() => handleSyncStats(campaign)}
                onDelete={() => {
                  if (confirm(`¿Eliminar la campaña "${campaign.name}"?`)) {
                    deleteMutation.mutate(campaign.id);
                  }
                }}
                isSending={sendingId === campaign.id}
                isSyncing={syncingId === campaign.id}
              />
            ))}
          </div>
        )}
      </div>
    </>
    </FeatureGate>
  );
}
