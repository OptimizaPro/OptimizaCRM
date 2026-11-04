"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, Send, Phone, MoreVertical, CheckCheck, Check,
  Link2, X, Plus, User, Tag, Clock,
  MessageCircle, Circle, Sparkles, Loader2, WifiOff,
  ExternalLink, UserPlus, Copy, CheckCircle2, ChevronRight,
} from "lucide-react";
import { writingAssistantApi, inboxApi, integrationsApi, crmApi, type WritingAction, type Message } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { FeatureGate } from "@/components/dashboard/feature-gate";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface WaMessage {
  id: string;
  body: string;
  direction: "inbound" | "outbound";
  timestamp: string;
  status?: "sent" | "delivered" | "read";
  raw_id: string; // backend message id for reply
}

interface WaConversation {
  id: string;             // wa_id (phone without +)
  contact_name: string;
  phone: string;
  avatar_initials: string;
  avatar_color: string;
  last_message: string;
  last_time: string;
  unread: number;
  messages: WaMessage[];
  last_inbound_id: string | null; // id of last inbound message for reply
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-emerald-500", "bg-violet-500", "bg-blue-500",
  "bg-rose-500", "bg-amber-500", "bg-teal-500", "bg-indigo-500",
];

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Ayer";
  if (days < 7) return d.toLocaleDateString("es-ES", { weekday: "short" });
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}

function buildConversations(messages: Message[]): WaConversation[] {
  // group by contact wa_id
  const map = new Map<string, { msgs: Message[]; name: string; phone: string }>();

  for (const msg of messages) {
    // For inbound: contact is sender (wa_id in metadata)
    // For outbound: contact is recipient (to_address)
    const waId =
      msg.direction === "inbound"
        ? (msg.metadata?.wa_id ?? msg.from_address)
        : msg.to_address;

    if (!waId) continue;

    const name =
      msg.direction === "inbound"
        ? (msg.metadata?.sender_name ?? msg.from_address ?? waId)
        : (msg.to_address ?? waId);

    if (!map.has(waId)) {
      map.set(waId, { msgs: [], name, phone: "+" + waId });
    }
    map.get(waId)!.msgs.push(msg);

    // prefer inbound sender_name as the display name
    if (msg.direction === "inbound" && msg.metadata?.sender_name) {
      map.get(waId)!.name = msg.metadata.sender_name;
    }
  }

  const convs: WaConversation[] = [];

  map.forEach(({ msgs, name, phone }, waId) => {
    // sort msgs by received_at asc
    const sorted = [...msgs].sort(
      (a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
    );
    const last = sorted[sorted.length - 1];
    const unread = sorted.filter((m) => m.direction === "inbound" && !m.is_read).length;
    const lastInbound = [...sorted].reverse().find((m) => m.direction === "inbound");

    const waMsgs: WaMessage[] = sorted.map((m) => ({
      id: m.id,
      raw_id: m.id,
      body: m.body_text,
      direction: m.direction,
      timestamp: formatTime(m.received_at),
      status: m.direction === "outbound" ? "sent" : undefined,
    }));

    convs.push({
      id: waId,
      contact_name: name,
      phone,
      avatar_initials: initialsFor(name),
      avatar_color: colorFor(waId),
      last_message: last.body_text,
      last_time: formatTime(last.received_at),
      unread,
      messages: waMsgs,
      last_inbound_id: lastInbound?.id ?? null,
    });
  });

  // sort by last message time desc
  convs.sort((a, b) => {
    const lastA = messages.filter((m) => {
      const id = m.direction === "inbound" ? (m.metadata?.wa_id ?? m.from_address) : m.to_address;
      return id === a.id;
    }).at(-1)?.received_at ?? "";
    const lastB = messages.filter((m) => {
      const id = m.direction === "inbound" ? (m.metadata?.wa_id ?? m.from_address) : m.to_address;
      return id === b.id;
    }).at(-1)?.received_at ?? "";
    return lastB.localeCompare(lastA);
  });

  return convs;
}

// ─── Small components ─────────────────────────────────────────────────────────

function Avatar({ initials, color, size = "md" }: { initials: string; color: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base" };
  return (
    <div className={`${sizes[size]} ${color} flex flex-shrink-0 items-center justify-center rounded-full font-semibold text-white`}>
      {initials}
    </div>
  );
}

function MessageStatus({ status }: { status?: "sent" | "delivered" | "read" }) {
  if (!status) return null;
  if (status === "read") return <CheckCheck className="h-3.5 w-3.5 text-blue-300" />;
  if (status === "delivered") return <CheckCheck className="h-3.5 w-3.5 text-white/60" />;
  return <Check className="h-3.5 w-3.5 text-white/60" />;
}

// ─── Tab navigation ───────────────────────────────────────────────────────────

function WhatsAppTabs() {
  const pathname = usePathname();
  const tabs = [
    { label: "Conversaciones", href: "/dashboard/whatsapp" },
    { label: "Plantillas",     href: "/dashboard/whatsapp/plantillas" },
  ];
  return (
    <nav className="flex border-b border-slate-800 bg-slate-950 px-4">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-orange-500 text-orange-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Not-connected card ───────────────────────────────────────────────────────

function NotConnectedCard() {
  return (
    <div className="mx-4 my-3 flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3.5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-800">
        <WifiOff className="h-4 w-4 text-slate-400" />
      </div>
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <p className="text-sm font-semibold text-slate-200">WhatsApp no está conectado</p>
        <p className="text-xs text-slate-400">
          Conecta tu integración de WhatsApp Business para gestionar plantillas.
        </p>
      </div>
      <Link
        href="/dashboard/integrations"
        className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors"
      >
        Ir a Integraciones
        <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
        <MessageCircle className="h-7 w-7 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-300">
        {isConnected ? "Sin conversaciones aún" : "WhatsApp no conectado"}
      </p>
      <p className="text-xs text-slate-500 max-w-xs">
        {isConnected
          ? "Cuando alguien te escriba por WhatsApp aparecerá aquí."
          : "Conecta tu número de WhatsApp Business para ver mensajes."}
      </p>
    </div>
  );
}

// ─── Create Lead Modal ────────────────────────────────────────────────────────

interface LeadForm {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  company: string;
}

function CreateLeadModal({
  conversation,
  onClose,
  onSuccess,
}: {
  conversation: WaConversation;
  onClose: () => void;
  onSuccess: (leadId: string) => void;
}) {
  const { tokens, organization } = useAuthStore();
  const nameParts = conversation.contact_name.trim().split(/\s+/);
  const [form, setForm] = useState<LeadForm>({
    first_name: nameParts[0] ?? "",
    last_name: nameParts.slice(1).join(" "),
    phone: conversation.phone,
    email: "",
    company: "",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      crmApi.createLead(tokens!.access, String(organization!.id), {
        first_name: form.first_name,
        last_name:  form.last_name,
        phone:      form.phone,
        email:      form.email || undefined,
        company:    form.company || undefined,
        source:     "whatsapp",
      }),
    onSuccess: (lead) => onSuccess(lead.id),
    onError: (e) => setError(e instanceof Error ? e.message : "Error al crear el lead"),
  });

  const set = (k: keyof LeadForm, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30";
  const labelCls = "mb-1 block text-xs font-medium text-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20">
              <UserPlus className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">Crear Lead</h3>
              <p className="text-xs text-slate-500">Desde conversación de WhatsApp</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input className={inputCls} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="Carlos" />
            </div>
            <div>
              <label className={labelCls}>Apellido</label>
              <input className={inputCls} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Méndez" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+502 5555 0000" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="carlos@empresa.com" type="email" />
          </div>
          <div>
            <label className={labelCls}>Empresa</label>
            <input className={inputCls} value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Nombre de la empresa" />
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-400">Fuente:</span> WhatsApp — se registrará automáticamente
            </p>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            disabled={!form.first_name.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="bg-orange-600 hover:bg-orange-500 text-white gap-1.5"
          >
            {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            Crear Lead
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const { tokens, organization } = useAuthStore();
  const [search, setSearch] = useState("");
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newBody, setNewBody] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [leadCreatedId, setLeadCreatedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const authReady = !!tokens && !!organization;

  // ── Integrations ────────────────────────────────────────────────────────────
  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => integrationsApi.getAll(tokens!.access, String(organization!.id)),
    enabled: authReady,
  });
  const isConnected = integrations?.results?.some(
    (i: { channel_type: string; status: string }) => i.channel_type === "whatsapp" && i.status === "connected"
  ) ?? false;

  // ── WhatsApp messages ────────────────────────────────────────────────────────
  const { data: messagesData, isLoading: msgsLoading } = useQuery({
    queryKey: ["whatsapp-messages"],
    queryFn: () => inboxApi.getMessages(tokens!.access, String(organization!.id), "channel=whatsapp&page_size=500"),
    enabled: authReady,
    refetchInterval: 10000, // poll every 10 s
    select: (data) => data.results ?? [],
  });

  const conversations = useMemo(
    () => buildConversations(messagesData ?? []),
    [messagesData]
  );

  // Pick first conversation when data loads and nothing is selected
  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  // ── Scroll to bottom when messages change ────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.id, selected?.messages.length]);

  // ── Mark read when conversation opened ───────────────────────────────────────
  useEffect(() => {
    if (!selected || !authReady) return;
    const unreadIds = (messagesData ?? [])
      .filter(
        (m) =>
          m.direction === "inbound" &&
          !m.is_read &&
          (m.metadata?.wa_id ?? m.from_address) === selected.id
      )
      .map((m) => m.id);
    unreadIds.forEach((id) => {
      inboxApi.markRead(tokens!.access, String(organization!.id), id).catch(() => {});
    });
    if (unreadIds.length > 0) {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // ── Reply mutation ───────────────────────────────────────────────────────────
  const replyMutation = useMutation({
    mutationFn: ({ messageId, body }: { messageId: string; body: string }) =>
      inboxApi.replyMessage(tokens!.access, String(organization!.id), messageId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
    },
  });

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const handleCopyPhone = () => {
    if (!selected) return;
    navigator.clipboard.writeText(selected.phone).catch(() => {});
    setCopied(true);
    setShowMenu(false);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkAllRead = () => {
    if (!selected || !authReady) return;
    const unreadIds = (messagesData ?? [])
      .filter((m) => m.direction === "inbound" && !m.is_read &&
        (m.metadata?.wa_id ?? m.from_address) === selected.id)
      .map((m) => m.id);
    unreadIds.forEach((id) => inboxApi.markRead(tokens!.access, String(organization!.id), id).catch(() => {}));
    if (unreadIds.length > 0) queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
    setShowMenu(false);
  };

  const handleAiAssist = async (action: WritingAction) => {
    const lastInbound = selected
      ? [...selected.messages].reverse().find((m) => m.direction === "inbound")
      : null;
    const textToSend = action === "improve" ? input : (lastInbound?.body ?? "");
    if (!textToSend.trim()) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const { result } = await writingAssistantApi.assist(
        tokens?.access ?? "", organization?.id ?? "", action, textToSend, "whatsapp"
      );
      setInput(result);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Error del asistente IA");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || !selected?.last_inbound_id) return;
    replyMutation.mutate({ messageId: selected.last_inbound_id, body: input.trim() });
    setInput("");
  };

  const handleSelectConversation = (conv: WaConversation) => {
    setSelectedId(conv.id);
    setMobileChatOpen(true);
    setShowMenu(false);
    setLeadCreatedId(null);
  };

  const filtered = conversations.filter(
    (c) =>
      c.contact_name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const statsToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayMsgs = (messagesData ?? []).filter((m) => m.received_at.startsWith(today));
    return {
      sent:      todayMsgs.filter((m) => m.direction === "outbound").length,
      delivered: todayMsgs.filter((m) => m.direction === "outbound").length,
      read:      todayMsgs.filter((m) => m.direction === "outbound" && m.is_read).length,
      replies:   todayMsgs.filter((m) => m.direction === "outbound").length,
    };
  }, [messagesData]);

  return (
    <FeatureGate
      minPlan="pro"
      featureName="WhatsApp"
      featureDescription="Conecta tu número de WhatsApp Business y gestiona todas las conversaciones con leads y clientes directamente desde el CRM."
      highlights={["Bandeja unificada de WhatsApp", "Respuestas rápidas y plantillas", "Historial de conversaciones en el CRM", "Asignación de chats a agentes"]}
    >
      <div className="flex h-screen flex-col overflow-hidden">
        <DashboardHeader title="WhatsApp" />
        <WhatsAppTabs />

        {/* Connection status card */}
        {!isConnected && <NotConnectedCard />}

        <div className="flex flex-1 overflow-hidden">

          {/* ── Col 1: Conversation list ──────────────────────────────────── */}
          <div className={`flex flex-col overflow-hidden border-r border-slate-800 bg-slate-950 ${mobileChatOpen ? "hidden lg:flex lg:w-[300px] lg:flex-shrink-0" : "flex-1 lg:w-[300px] lg:flex-shrink-0"}`}>

            {/* Search + new message */}
            <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar contacto..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 py-1.5 pl-8 pr-3 text-sm text-slate-200 placeholder-slate-400 focus:border-green-400 focus:outline-none"
                />
              </div>
              <button
                onClick={() => setShowNewMessage(true)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-500 text-white hover:bg-green-600"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* List */}
            {msgsLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState isConnected={isConnected} />
            ) : (
              <ul className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
                {filtered.map((conv) => (
                  <li key={conv.id}>
                    <button
                      onClick={() => handleSelectConversation(conv)}
                      className={`flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-900 ${
                        selectedId === conv.id ? "bg-green-950/30" : ""
                      }`}
                    >
                      <Avatar initials={conv.avatar_initials} color={conv.avatar_color} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-sm font-semibold text-slate-100">
                            {conv.contact_name}
                          </span>
                          <span className="flex-shrink-0 text-xs text-slate-400">{conv.last_time}</span>
                        </div>
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <p className="truncate text-xs text-slate-500">{conv.last_message}</p>
                          {conv.unread > 0 && (
                            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
                              {conv.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Col 2: Chat ───────────────────────────────────────────────── */}
          <div className={`flex flex-col overflow-hidden bg-slate-900 ${mobileChatOpen ? "flex-1" : "hidden lg:flex lg:flex-1"}`}>

            {/* Mobile back */}
            <button
              onClick={() => setMobileChatOpen(false)}
              className="flex items-center gap-2 border-b border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 lg:hidden"
            >
              ← Volver
            </button>

            {!selected ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-slate-500">Selecciona una conversación</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-950 px-4 py-3">
                  <Avatar initials={selected.avatar_initials} color={selected.avatar_color} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-100">{selected.contact_name}</p>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-slate-400" />
                      <span className="text-xs text-slate-500">{selected.phone}</span>
                      <Circle className="h-1.5 w-1.5 fill-green-500 text-green-500" />
                      <span className="text-xs text-green-600 dark:text-green-400">WhatsApp</span>
                    </div>
                  </div>
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setShowMenu((v) => !v)}
                      className="rounded-full p-2 text-slate-400 hover:bg-slate-800 transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {showMenu && (
                      <div className="absolute right-0 top-9 z-30 w-52 rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl">
                        <button
                          onClick={() => { setShowCreateLead(true); setShowMenu(false); }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
                        >
                          <UserPlus className="h-4 w-4 text-orange-400" />
                          Crear Lead
                        </button>
                        <button
                          onClick={handleCopyPhone}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
                        >
                          {copied ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
                          {copied ? "¡Copiado!" : "Copiar teléfono"}
                        </button>
                        <div className="my-1 border-t border-slate-800" />
                        <button
                          onClick={handleMarkAllRead}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
                        >
                          <CheckCheck className="h-4 w-4 text-slate-400" />
                          Marcar todo como leído
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  <div className="flex justify-center">
                    <span className="rounded-full bg-slate-800 px-3 py-0.5 text-xs text-slate-400 shadow-sm">
                      Conversación
                    </span>
                  </div>

                  {selected.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`relative max-w-[70%] rounded-2xl px-3 py-2 shadow-sm ${
                          msg.direction === "outbound"
                            ? "rounded-tr-sm bg-green-500 text-white"
                            : "rounded-tl-sm bg-slate-800 text-slate-100"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.body}</p>
                        <div className={`mt-1 flex items-center justify-end gap-1 ${
                          msg.direction === "outbound" ? "text-white/70" : "text-slate-400"
                        }`}>
                          <span className="text-[10px]">{msg.timestamp}</span>
                          {msg.direction === "outbound" && <MessageStatus status={msg.status} />}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-slate-800 bg-slate-950">
                  {/* AI bar */}
                  <div className="flex items-center gap-2 flex-wrap border-b border-slate-800 px-4 py-2 bg-slate-900/60">
                    <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                      <Sparkles className="h-3.5 w-3.5 text-green-500" />
                      IA:
                    </span>
                    {([
                      { action: "professional" as WritingAction, label: "Respuesta" },
                      { action: "improve" as WritingAction, label: "Mejorar" },
                      { action: "informal" as WritingAction, label: "Informal" },
                      { action: "summarize" as WritingAction, label: "Resumir" },
                    ] as const).map(({ action, label }) => (
                      <button
                        key={action}
                        onClick={() => handleAiAssist(action)}
                        disabled={aiLoading || (action === "improve" && !input.trim())}
                        className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400 hover:border-green-400 hover:text-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                    {aiLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-green-500" />}
                    {aiError && <span className="text-xs text-red-500">{aiError}</span>}
                    {replyMutation.isError && (
                      <span className="text-xs text-red-500">
                        {replyMutation.error instanceof Error ? replyMutation.error.message : "Error al enviar"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-end gap-2 px-4 py-3">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder={
                        selected.last_inbound_id
                          ? "Escribe un mensaje o usa el asistente IA..."
                          : "Solo puedes responder a conversaciones iniciadas por el contacto"
                      }
                      disabled={!selected.last_inbound_id || replyMutation.isPending}
                      rows={1}
                      className="flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-400 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400/30 disabled:opacity-50"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || !selected.last_inbound_id || replyMutation.isPending}
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white transition-colors hover:bg-green-600 disabled:opacity-40"
                    >
                      {replyMutation.isPending
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Send className="h-4 w-4" />
                      }
                    </button>
                  </div>
                  <p className="pb-2 text-center text-[10px] text-slate-400">
                    Enter para enviar · Shift+Enter para nueva línea
                  </p>
                </div>
              </>
            )}
          </div>

          {/* ── Col 3: Contact info ───────────────────────────────────────── */}
          {selected && (
            <div className="hidden w-[280px] flex-shrink-0 flex-col overflow-y-auto border-l border-slate-800 bg-slate-950 xl:flex">

              <div className="flex flex-col items-center gap-2 border-b border-slate-800 px-4 py-5">
                <Avatar initials={selected.avatar_initials} color={selected.avatar_color} size="lg" />
                <div className="text-center">
                  <p className="font-semibold text-slate-100">{selected.contact_name}</p>
                  <p className="text-xs text-slate-500">{selected.phone}</p>
                </div>
                <Badge className="text-xs bg-green-950/40 text-green-400">
                  WhatsApp
                </Badge>
              </div>

              <div className="border-b border-slate-800 px-4 py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Vinculación CRM</p>
                {leadCreatedId ? (
                  <Link
                    href="/dashboard/leads"
                    className="flex w-full items-center gap-2 rounded-lg border border-green-700/50 bg-green-950/30 px-3 py-2 text-sm text-green-400 hover:bg-green-950/50 transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 truncate">Lead creado</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <button
                    onClick={() => setShowCreateLead(true)}
                    className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-700 px-3 py-2 text-sm text-slate-400 hover:border-orange-400 hover:text-orange-500 transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    Crear Lead desde este chat
                  </button>
                )}
              </div>

              <div className="border-b border-slate-800 px-4 py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Información</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-slate-400">
                    <Tag className="h-3.5 w-3.5 text-slate-400" />
                    <span>Sin etiquetas</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Último mensaje: {selected.last_time}</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-400">
                    <MessageCircle className="h-3.5 w-3.5 text-slate-400" />
                    <span>{selected.messages.length} mensajes en el hilo</span>
                  </li>
                </ul>
              </div>

              <div className="px-4 py-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Estadísticas del canal (hoy)
                </p>
                <ul className="space-y-2">
                  {[
                    { label: "Enviados",    value: statsToday.sent,      color: "text-slate-300" },
                    { label: "Entregados",  value: statsToday.delivered, color: "text-orange-400" },
                    { label: "Leídos",      value: statsToday.read,      color: "text-green-400" },
                    { label: "Respuestas",  value: statsToday.replies,   color: "text-violet-400" },
                  ].map(({ label, value, color }) => (
                    <li key={label} className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{label}</span>
                      <span className={`font-semibold ${color}`}>{value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* ── New message modal ──────────────────────────────────────────── */}
        {showNewMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewMessage(false)} />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-100">Nuevo mensaje</h3>
                </div>
                <button onClick={() => setShowNewMessage(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4 p-5">
                <p className="text-xs text-slate-400 rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-2">
                  WhatsApp solo permite iniciar conversaciones con plantillas aprobadas. Ve a{" "}
                  <Link href="/dashboard/whatsapp/plantillas" className="text-orange-400 underline">Plantillas</Link>{" "}
                  para usar una.
                </p>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-400">
                    Número de WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+502 5555 0000"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-400">
                    Mensaje
                  </label>
                  <textarea
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder="Escribe tu mensaje..."
                    rows={4}
                    className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400/30"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
                <Button variant="ghost" size="sm" onClick={() => setShowNewMessage(false)}>Cancelar</Button>
                <Button
                  size="sm"
                  disabled={!newPhone.trim() || !newBody.trim()}
                  onClick={() => {
                    setShowNewMessage(false);
                    setNewPhone("");
                    setNewBody("");
                  }}
                  className="gap-1.5 bg-green-500 hover:bg-green-600"
                >
                  <Send className="h-3.5 w-3.5" />
                  Enviar mensaje
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* ── Create Lead Modal ─────────────────────────────────────────── */}
      {showCreateLead && selected && (
        <CreateLeadModal
          conversation={selected}
          onClose={() => setShowCreateLead(false)}
          onSuccess={(id) => {
            setLeadCreatedId(id);
            setShowCreateLead(false);
          }}
        />
      )}

      {/* ── Lead created toast ─────────────────────────────────────────── */}
      {leadCreatedId && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-green-700/50 bg-slate-900 px-4 py-3 shadow-xl">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-400" />
          <div>
            <p className="text-sm font-semibold text-slate-100">Lead creado con éxito</p>
            <p className="text-xs text-slate-400">Puedes verlo en la sección de Leads</p>
          </div>
          <Link
            href="/dashboard/leads"
            className="ml-2 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600"
          >
            Ver Lead
          </Link>
          <button onClick={() => setLeadCreatedId(null)} className="ml-1 text-slate-500 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </FeatureGate>
  );
}
