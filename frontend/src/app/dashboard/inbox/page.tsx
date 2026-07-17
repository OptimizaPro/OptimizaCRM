"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth";
import { inboxApi, integrationsApi, writingAssistantApi, type Message, type Integration, type WritingAction } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  RefreshCw, Mail, CheckCheck, Inbox, AlertCircle,
  Reply, Send, X, Trash2, Sparkles, Loader2,
} from "lucide-react";
import Link from "next/link";

function getChannelIcon(channelType: string) {
  return <Mail className={`h-3.5 w-3.5 ${channelType === "email" ? "text-orange-500" : "text-slate-400"}`} />;
}

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return formatDate(dateStr);
}

function MessageSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-slate-800 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="h-3.5 w-28 animate-pulse rounded bg-slate-700" />
            <div className="h-3 w-10 animate-pulse rounded bg-slate-700" />
          </div>
          <div className="mb-1 h-3.5 w-40 animate-pulse rounded bg-slate-700" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

export default function InboxPage() {
  const { tokens, organization } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "sent">("all");
  const [showReply, setShowReply] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replySuccess, setReplySuccess] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const token = tokens?.access ?? "";
  const orgId = organization?.id ?? "";

  const { data: integrationsData } = useQuery({
    queryKey: ["integrations", orgId],
    queryFn: () => integrationsApi.getAll(token, orgId),
    enabled: !!token && !!orgId,
  });

  const emailIntegration: Integration | undefined = integrationsData?.results?.find(
    (i) => i.channel_type === "email" && i.status === "connected"
  );

  const queryParams = [
    filter === "unread" ? "is_read=false" : filter === "sent" ? "direction=outbound" : "",
    "page_size=200",
  ].filter(Boolean).join("&");

  const { data: messagesData, isLoading, isFetching } = useQuery({
    queryKey: ["messages", orgId, filter],
    queryFn: () => inboxApi.getMessages(token, orgId, queryParams),
    enabled: !!token && !!orgId,
  });

  const messages = messagesData?.results ?? [];
  const unreadCount = messages.filter((m) => !m.is_read).length;

  // Derived checkbox state
  const allChecked = messages.length > 0 && messages.every((m) => checkedIds.has(m.id));
  const someChecked = messages.some((m) => checkedIds.has(m.id));

  const toggleCheck = (id: string, checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(messages.map((m) => m.id)));
    }
  };

  const clearSelection = () => {
    setCheckedIds(new Set());
    setConfirmBulkDelete(false);
  };

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: (id: string) => inboxApi.markRead(token, orgId, id),
    onSuccess: (updatedMessage) => {
      queryClient.setQueryData(["messages", orgId, filter], (old: typeof messagesData) => {
        if (!old) return old;
        return { ...old, results: old.results.map((m) => m.id === updatedMessage.id ? updatedMessage : m) };
      });
      queryClient.invalidateQueries({ queryKey: ["messages", orgId] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => inboxApi.markAllRead(token, orgId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages", orgId] }),
  });

  const fetchMutation = useMutation({
    mutationFn: () => {
      if (!emailIntegration) throw new Error("No email integration connected");
      return inboxApi.fetchEmails(token, orgId, emailIntegration.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages", orgId] }),
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      inboxApi.replyMessage(token, orgId, id, body),
    onSuccess: () => {
      setReplyBody("");
      setShowReply(false);
      setReplySuccess(true);
      setTimeout(() => setReplySuccess(false), 3000);
      queryClient.invalidateQueries({ queryKey: ["messages", orgId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inboxApi.deleteMessage(token, orgId, id),
    onSuccess: () => {
      setSelectedMessage(null);
      setConfirmDelete(false);
      queryClient.invalidateQueries({ queryKey: ["messages", orgId] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => inboxApi.bulkDeleteMessages(token, orgId, ids),
    onSuccess: () => {
      clearSelection();
      if (selectedMessage && checkedIds.has(selectedMessage.id)) setSelectedMessage(null);
      queryClient.invalidateQueries({ queryKey: ["messages", orgId] });
    },
  });

  const handleAiAssist = async (action: WritingAction) => {
    const textToSend = action === 'improve' ? replyBody : selectedMessage?.body_text ?? '';
    if (!textToSend.trim()) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const { result } = await writingAssistantApi.assist(token, orgId, action, textToSend, 'email');
      setReplyBody(result);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Error del asistente IA');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    setShowReply(false);
    setReplyBody("");
    setConfirmDelete(false);
    setMobileDetailOpen(true);
    if (!message.is_read) markReadMutation.mutate(message.id);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardHeader title={filter === "sent" ? "Enviados" : "Bandeja de Entrada"} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top action bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950 px-4 py-2">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-slate-500" />
            <span className="text-sm font-medium text-slate-300">
              {messagesData?.count ?? 0} mensajes
            </span>
            {unreadCount > 0 && (
              <Badge variant="default" className="bg-orange-600 text-xs">
                {unreadCount} no leídos
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filter !== "sent" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending || unreadCount === 0}
              >
                <CheckCheck className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">Marcar todo leído</span>
                <span className="sm:hidden">Leído</span>
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => fetchMutation.mutate()}
              disabled={fetchMutation.isPending || !emailIntegration}
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${fetchMutation.isPending ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </Button>
          </div>
        </div>

        {/* No email integration notice */}
        {!emailIntegration && (
          <div className="border-b border-amber-900 bg-amber-950/30 px-4 py-2">
            <p className="flex items-center gap-2 text-sm text-amber-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              No hay ninguna integración de email conectada.{" "}
              <Link href="/dashboard/integrations" className="font-medium underline underline-offset-2 hover:text-amber-800">
                Conecta Gmail aquí
              </Link>
            </p>
          </div>
        )}

        {/* Main two-panel layout */}
        <div className="flex flex-1 overflow-hidden lg:grid lg:grid-cols-[360px_1fr]">
          {/* Left panel — message list (hidden on mobile when detail is open) */}
          <div className={`flex-col overflow-hidden border-r border-slate-800 bg-slate-950 ${mobileDetailOpen ? "hidden lg:flex" : "flex w-full"}`}>

            {/* Filter tabs + select-all checkbox */}
            <div className="flex items-center gap-1 border-b border-slate-800 px-3 py-2">
              {/* Select-all checkbox */}
              <label className="flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer accent-orange-500"
                />
              </label>
              {(["all", "unread", "sent"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setSelectedMessage(null); clearSelection(); }}
                  className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                    filter === f
                      ? "bg-orange-950/40 text-orange-400"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {f === "all" ? "Recibidos" : f === "unread" ? "No leídos" : "Enviados"}
                  {f === "unread" && unreadCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-orange-600 px-1.5 py-0.5 text-xs text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Bulk action bar */}
            {checkedIds.size > 0 && (
              <div className="flex items-center gap-2 border-b border-red-900 bg-red-950/20 px-3 py-2">
                <span className="flex-1 text-sm font-medium text-red-400">
                  {checkedIds.size} seleccionado{checkedIds.size !== 1 ? "s" : ""}
                </span>
                {!confirmBulkDelete ? (
                  <button
                    onClick={() => setConfirmBulkDelete(true)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-900/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar seleccionados
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-red-400">¿Confirmar?</span>
                    <button
                      onClick={() => bulkDeleteMutation.mutate([...checkedIds])}
                      disabled={bulkDeleteMutation.isPending}
                      className="rounded px-2 py-0.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    >
                      {bulkDeleteMutation.isPending ? "..." : "Sí, eliminar"}
                    </button>
                    <button
                      onClick={() => setConfirmBulkDelete(false)}
                      className="rounded px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-800"
                    >
                      No
                    </button>
                  </div>
                )}
                <button
                  onClick={clearSelection}
                  className="rounded p-1 text-slate-400 hover:text-slate-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading || isFetching ? (
                <MessageSkeleton />
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Inbox className="h-10 w-10 text-slate-300" />
                  <p className="text-sm text-slate-500">
                    {filter === "unread" ? "No hay mensajes sin leer"
                      : filter === "sent" ? "No hay mensajes enviados"
                      : "No hay mensajes en la bandeja"}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {messages.map((message) => {
                    const isSelected = selectedMessage?.id === message.id;
                    const isChecked = checkedIds.has(message.id);
                    const isUnread = !message.is_read;
                    return (
                      <li
                        key={message.id}
                        className={`flex items-start gap-2 px-3 py-3 transition-colors hover:bg-slate-900 ${
                          isSelected ? "bg-orange-950/40" : ""
                        } ${isChecked ? "bg-red-950/20" : ""}`}
                      >
                        {/* Checkbox */}
                        <label
                          className="mt-0.5 flex-shrink-0 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => toggleCheck(message.id, e.target.checked)}
                            className="h-4 w-4 cursor-pointer accent-orange-500"
                          />
                        </label>

                        {/* Message content */}
                        <button
                          onClick={() => handleSelectMessage(message)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="mb-1 flex items-center gap-2">
                            {isUnread && filter !== "sent" && (
                              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-orange-500" />
                            )}
                            <span className={`flex-1 truncate text-sm ${
                              isUnread && filter !== "sent"
                                ? "font-semibold text-slate-100"
                                : "font-medium text-slate-300"
                            }`}>
                              {filter === "sent"
                                ? `Para: ${message.to_address || "(sin destinatario)"}`
                                : message.from_address || "(sin remitente)"}
                            </span>
                            <span className="flex-shrink-0 text-xs text-slate-400">
                              {relativeDate(message.received_at)}
                            </span>
                          </div>
                          <div className="mb-1 flex items-center gap-1.5">
                            {getChannelIcon(message.channel_type)}
                            <span className={`truncate text-sm ${
                              isUnread && filter !== "sent"
                                ? "font-semibold text-slate-200"
                                : "text-slate-400"
                            }`}>
                              {message.subject || "(sin asunto)"}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-xs text-slate-400">
                            {message.body_text?.slice(0, 120) || ""}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Right panel — message detail */}
          <div className={`flex-col overflow-hidden bg-slate-900 ${mobileDetailOpen ? "fixed inset-0 z-50 flex" : "hidden lg:flex"}`}>
            {/* Mobile back button */}
            <button
              onClick={() => setMobileDetailOpen(false)}
              className="flex items-center gap-2 border-b border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 lg:hidden"
            >
              ← Volver
            </button>
            {!selectedMessage ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <Mail className="h-12 w-12 text-slate-300" />
                <p className="text-sm text-slate-400">Selecciona un mensaje para leerlo</p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Message header */}
                <div className="border-b border-slate-800 bg-slate-950 px-4 py-3 sm:px-6 sm:py-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h2 className="truncate text-base font-semibold text-slate-100 sm:text-lg">
                      {selectedMessage.subject || "(sin asunto)"}
                    </h2>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {selectedMessage.direction === "inbound" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setShowReply(!showReply); setReplyBody(""); }}
                          className="gap-1.5"
                        >
                          <Reply className="h-3.5 w-3.5" />
                          Responder
                        </Button>
                      )}
                      {!confirmDelete ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDelete(true)}
                          className="gap-1.5 text-slate-500 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1.5 rounded-lg border border-red-900 bg-red-950/30 px-2 py-1">
                          <span className="text-xs text-red-400">¿Eliminar?</span>
                          <button
                            onClick={() => deleteMutation.mutate(selectedMessage.id)}
                            disabled={deleteMutation.isPending}
                            className="rounded px-1.5 py-0.5 text-xs font-medium text-red-400 hover:bg-red-900/40"
                          >
                            {deleteMutation.isPending ? "..." : "Sí"}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-800"
                          >
                            No
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <dl className="space-y-1 text-sm">
                    <div className="flex gap-2">
                      <dt className="w-10 flex-shrink-0 font-medium text-slate-500">De</dt>
                      <dd className="text-slate-300">{selectedMessage.from_address || "—"}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-10 flex-shrink-0 font-medium text-slate-500">Para</dt>
                      <dd className="text-slate-300">{selectedMessage.to_address || "—"}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-10 flex-shrink-0 font-medium text-slate-500">Fecha</dt>
                      <dd className="text-slate-400">
                        {new Date(selectedMessage.received_at).toLocaleString("es-ES", {
                          year: "numeric", month: "long", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Message body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                  {replySuccess && (
                    <div className="mb-4 rounded-lg border border-green-800 bg-green-950 px-4 py-2 text-sm text-green-300">
                      Respuesta enviada correctamente.
                    </div>
                  )}
                  <Card className="bg-slate-950">
                    <CardContent className="p-4">
                      {selectedMessage.body_html ? (
                        <iframe
                          srcDoc={selectedMessage.body_html}
                          className="h-64 w-full border-0 sm:h-[500px]"
                          sandbox="allow-same-origin"
                          title="Contenido del mensaje"
                        />
                      ) : (
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-300">
                          {selectedMessage.body_text || "(sin contenido)"}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reply modal — fixed overlay */}
      {showReply && selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowReply(false)}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-t-2xl border border-slate-800 bg-slate-950 shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
              <div className="text-sm text-slate-300">
                <span className="font-semibold text-slate-100">Responder a:</span>{" "}
                {selectedMessage.from_address}
              </div>
              <button
                onClick={() => setShowReply(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="border-b border-slate-800 px-5 py-2 text-xs text-slate-400">
              Asunto:{" "}
              <span className="text-slate-300">
                {selectedMessage.subject?.startsWith("Re:")
                  ? selectedMessage.subject
                  : `Re: ${selectedMessage.subject}`}
              </span>
            </div>
            {/* AI assistant bar */}
            <div className="border-b border-slate-800 bg-slate-900/60 px-5 py-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                  <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                  IA:
                </span>
                {([
                  { action: 'professional' as WritingAction, label: 'Respuesta profesional' },
                  { action: 'improve' as WritingAction, label: 'Mejorar borrador' },
                  { action: 'informal' as WritingAction, label: 'Tono informal' },
                  { action: 'summarize' as WritingAction, label: 'Resumir mensaje' },
                ] as const).map(({ action, label }) => (
                  <button
                    key={action}
                    onClick={() => handleAiAssist(action)}
                    disabled={aiLoading || (action === 'improve' && !replyBody.trim())}
                    className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400 hover:border-orange-500 hover:text-orange-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {label}
                  </button>
                ))}
                {aiLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />}
              </div>
              {aiError && <p className="mt-1 text-xs text-red-500">{aiError}</p>}
            </div>

            <div className="p-5">
              <textarea
                autoFocus
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Escribe tu respuesta o usa el asistente IA..."
                rows={6}
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
              />
              {replyMutation.isError && (
                <p className="mt-2 text-xs text-red-500">
                  {(replyMutation.error as Error)?.message || "Error al enviar"}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-3">
              <Button variant="ghost" size="sm" onClick={() => setShowReply(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={!replyBody.trim() || replyMutation.isPending}
                onClick={() => replyMutation.mutate({ id: selectedMessage.id, body: replyBody })}
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {replyMutation.isPending ? "Enviando..." : "Enviar respuesta"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
