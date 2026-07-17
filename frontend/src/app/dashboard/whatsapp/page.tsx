"use client";

import { useState, useRef, useEffect } from "react";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, Send, Phone, MoreVertical, CheckCheck, Check,
  Link2, X, Plus, Wifi, WifiOff, User, Tag, Clock,
  MessageCircle, Circle, Sparkles, Loader2,
} from "lucide-react";
import { writingAssistantApi, type WritingAction } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { FeatureGate } from "@/components/dashboard/feature-gate";
import Link from "next/link";

// ─── Mock data ────────────────────────────────────────────────────────────────

interface WaMessage {
  id: string;
  body: string;
  direction: "inbound" | "outbound";
  timestamp: string;
  status?: "sent" | "delivered" | "read";
}

interface WaConversation {
  id: string;
  contact_name: string;
  phone: string;
  avatar_initials: string;
  avatar_color: string;
  last_message: string;
  last_time: string;
  unread: number;
  crm_type?: "lead" | "customer";
  crm_name?: string;
  messages: WaMessage[];
}

const MOCK_CONVERSATIONS: WaConversation[] = [
  {
    id: "1",
    contact_name: "Carlos Méndez",
    phone: "+502 5555 1234",
    avatar_initials: "CM",
    avatar_color: "bg-emerald-500",
    last_message: "Perfecto, nos vemos el lunes entonces",
    last_time: "10:42",
    unread: 2,
    crm_type: "lead",
    crm_name: "Carlos Méndez",
    messages: [
      { id: "m1", body: "Buenos días Carlos, ¿pudiste revisar la propuesta que te envié?", direction: "outbound", timestamp: "09:15", status: "read" },
      { id: "m2", body: "Sí, la revisé. Tengo algunas dudas sobre el precio del plan Enterprise.", direction: "inbound", timestamp: "09:32" },
      { id: "m3", body: "Claro, con gusto te explico. El plan Enterprise incluye acceso ilimitado a todas las funciones de IA más soporte dedicado 24/7.", direction: "outbound", timestamp: "09:45", status: "read" },
      { id: "m4", body: "¿Y hay algún descuento si contrato por un año?", direction: "inbound", timestamp: "09:50" },
      { id: "m5", body: "Sí, ofrecemos un 20% de descuento en contratos anuales. ¿Te gustaría agendar una llamada para cerrar los detalles?", direction: "outbound", timestamp: "10:01", status: "read" },
      { id: "m6", body: "Perfecto, nos vemos el lunes entonces", direction: "inbound", timestamp: "10:42" },
    ],
  },
  {
    id: "2",
    contact_name: "Ana Sofía García",
    phone: "+502 5555 5678",
    avatar_initials: "AG",
    avatar_color: "bg-violet-500",
    last_message: "¿Me pueden enviar la factura?",
    last_time: "09:15",
    unread: 1,
    crm_type: "customer",
    crm_name: "Ana Sofía García",
    messages: [
      { id: "m1", body: "Hola, acabo de renovar mi suscripción.", direction: "inbound", timestamp: "08:50" },
      { id: "m2", body: "¡Hola Ana! Muchas gracias por renovar. Tu cuenta ya está activa.", direction: "outbound", timestamp: "08:55", status: "read" },
      { id: "m3", body: "¿Me pueden enviar la factura?", direction: "inbound", timestamp: "09:15" },
    ],
  },
  {
    id: "3",
    contact_name: "Roberto Lima",
    phone: "+502 5555 9012",
    avatar_initials: "RL",
    avatar_color: "bg-blue-500",
    last_message: "Gracias por la información",
    last_time: "Ayer",
    unread: 0,
    crm_type: "lead",
    crm_name: "Roberto Lima",
    messages: [
      { id: "m1", body: "Hola, vi su anuncio en LinkedIn. ¿Tienen versión para equipos pequeños?", direction: "inbound", timestamp: "Ayer 14:20" },
      { id: "m2", body: "¡Hola Roberto! Sí, tenemos el plan Starter ideal para equipos de hasta 5 personas.", direction: "outbound", timestamp: "Ayer 14:35", status: "read" },
      { id: "m3", body: "Gracias por la información", direction: "inbound", timestamp: "Ayer 14:40" },
    ],
  },
  {
    id: "4",
    contact_name: "María Fernanda",
    phone: "+502 5555 3456",
    avatar_initials: "MF",
    avatar_color: "bg-rose-500",
    last_message: "Ok, lo pruebo y te aviso",
    last_time: "Lun",
    unread: 0,
    messages: [
      { id: "m1", body: "Tengo un problema con el acceso al panel.", direction: "inbound", timestamp: "Lun 11:00" },
      { id: "m2", body: "Hola María, ¿puedes intentar cerrar sesión y volver a entrar?", direction: "outbound", timestamp: "Lun 11:05", status: "delivered" },
      { id: "m3", body: "Ok, lo pruebo y te aviso", direction: "inbound", timestamp: "Lun 11:07" },
    ],
  },
  {
    id: "5",
    contact_name: "Jorge Castillo",
    phone: "+502 5555 7890",
    avatar_initials: "JC",
    avatar_color: "bg-amber-500",
    last_message: "Perfecto, quedamos así",
    last_time: "Dom",
    unread: 0,
    messages: [
      { id: "m1", body: "¿El sistema tiene integración con WhatsApp?", direction: "inbound", timestamp: "Dom 16:30" },
      { id: "m2", body: "Sí, precisamente estamos hablando por esa integración 😄", direction: "outbound", timestamp: "Dom 16:32", status: "read" },
      { id: "m3", body: "Perfecto, quedamos así", direction: "inbound", timestamp: "Dom 16:35" },
    ],
  },
];

const STATS = {
  sent: 124,
  delivered: 118,
  read: 97,
  replies: 43,
};

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const [selected, setSelected] = useState<WaConversation>(MOCK_CONVERSATIONS[0]);
  const [conversations, setConversations] = useState<WaConversation[]>(MOCK_CONVERSATIONS);
  const [input, setInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const { tokens, organization } = useAuthStore();
  const [search, setSearch] = useState("");
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newBody, setNewBody] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected.id, selected.messages.length]);

  const handleAiAssist = async (action: WritingAction) => {
    const lastInbound = [...selected.messages].reverse().find((m) => m.direction === "inbound");
    const textToSend = action === 'improve' ? input : (lastInbound?.body ?? '');
    if (!textToSend.trim()) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const { result } = await writingAssistantApi.assist(
        tokens?.access ?? '', organization?.id ?? '', action, textToSend, 'whatsapp'
      );
      setInput(result);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Error del asistente IA');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const msg: WaMessage = {
      id: `m${Date.now()}`,
      body: input.trim(),
      direction: "outbound",
      timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    };
    const updated = conversations.map((c) =>
      c.id === selected.id
        ? { ...c, messages: [...c.messages, msg], last_message: msg.body, last_time: msg.timestamp }
        : c
    );
    setConversations(updated);
    setSelected({ ...selected, messages: [...selected.messages, msg], last_message: msg.body });
    setInput("");
  };

  const handleSelectConversation = (conv: WaConversation) => {
    const updated = conversations.map((c) => c.id === conv.id ? { ...c, unread: 0 } : c);
    setConversations(updated);
    setSelected({ ...conv, unread: 0 });
    setMobileChatOpen(true);
  };

  const filtered = conversations.filter(
    (c) =>
      c.contact_name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <FeatureGate
      minPlan="pro"
      featureName="WhatsApp"
      featureDescription="Conecta tu número de WhatsApp Business y gestiona todas las conversaciones con leads y clientes directamente desde el CRM."
      highlights={["Bandeja unificada de WhatsApp", "Respuestas rápidas y plantillas", "Historial de conversaciones en el CRM", "Asignación de chats a agentes"]}
    >
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardHeader title="WhatsApp" />

      {/* "Not connected" banner */}
      <div className="flex items-center gap-3 border-b border-amber-900 bg-amber-950/30 px-4 py-2">
        <WifiOff className="h-4 w-4 flex-shrink-0 text-amber-400" />
        <p className="flex-1 text-sm text-amber-400">
          Vista previa — conecta tu cuenta de WhatsApp Business en{" "}
          <a href="/dashboard/integrations" className="font-medium underline underline-offset-2">
            Integraciones
          </a>{" "}
          para activar esta sección.
        </p>
        <Badge className="bg-amber-900/40 text-amber-300">
          Próximamente
        </Badge>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Col 1: Conversation list ────────────────────────────────────── */}
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
          <ul className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {filtered.map((conv) => (
              <li key={conv.id}>
                <button
                  onClick={() => handleSelectConversation(conv)}
                  className={`flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-900 ${
                    selected.id === conv.id ? "bg-green-950/30" : ""
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
        </div>

        {/* ── Col 2: Chat ─────────────────────────────────────────────────── */}
        <div className={`flex flex-col overflow-hidden bg-slate-900 ${mobileChatOpen ? "flex-1" : "hidden lg:flex lg:flex-1"}`}>

          {/* Mobile back button */}
          <button
            onClick={() => setMobileChatOpen(false)}
            className="flex items-center gap-2 border-b border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 lg:hidden"
          >
            ← Volver
          </button>

          {/* Chat header */}
          <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-950 px-4 py-3">
            <Avatar initials={selected.avatar_initials} color={selected.avatar_color} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-100">{selected.contact_name}</p>
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-slate-400" />
                <span className="text-xs text-slate-500">{selected.phone}</span>
                <Circle className="h-1.5 w-1.5 fill-green-500 text-green-500" />
                <span className="text-xs text-green-600 dark:text-green-400">en línea</span>
              </div>
            </div>
            <button className="rounded-full p-2 text-slate-400 hover:bg-slate-800">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {/* Date separator */}
            <div className="flex justify-center">
              <span className="rounded-full bg-slate-800 px-3 py-0.5 text-xs text-slate-400 shadow-sm">
                Hoy
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
            {/* AI assistant bar */}
            <div className="flex items-center gap-2 flex-wrap border-b border-slate-800 px-4 py-2 bg-slate-900/60">
              <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                <Sparkles className="h-3.5 w-3.5 text-green-500" />
                IA:
              </span>
              {([
                { action: 'professional' as WritingAction, label: 'Respuesta' },
                { action: 'improve' as WritingAction, label: 'Mejorar' },
                { action: 'informal' as WritingAction, label: 'Informal' },
                { action: 'summarize' as WritingAction, label: 'Resumir' },
              ] as const).map(({ action, label }) => (
                <button
                  key={action}
                  onClick={() => handleAiAssist(action)}
                  disabled={aiLoading || (action === 'improve' && !input.trim())}
                  className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400 hover:border-green-400 hover:text-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {label}
                </button>
              ))}
              {aiLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-green-500" />}
              {aiError && <span className="text-xs text-red-500">{aiError}</span>}
            </div>

            <div className="flex items-end gap-2 px-4 py-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Escribe un mensaje o usa el asistente IA..."
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-400 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400/30"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white transition-colors hover:bg-green-600 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="pb-2 text-center text-[10px] text-slate-400">
              Enter para enviar · Shift+Enter para nueva línea
            </p>
          </div>
        </div>

        {/* ── Col 3: Contact info ─────────────────────────────────────────── */}
        <div className="hidden w-[280px] flex-shrink-0 flex-col overflow-y-auto border-l border-slate-800 bg-slate-950 xl:flex">

          {/* Contact header */}
          <div className="flex flex-col items-center gap-2 border-b border-slate-800 px-4 py-5">
            <Avatar initials={selected.avatar_initials} color={selected.avatar_color} size="lg" />
            <div className="text-center">
              <p className="font-semibold text-slate-100">{selected.contact_name}</p>
              <p className="text-xs text-slate-500">{selected.phone}</p>
            </div>
            {selected.crm_type && (
              <Badge className={`text-xs ${
                selected.crm_type === "customer"
                  ? "bg-orange-950/40 text-orange-400"
                  : "bg-amber-900/40 text-amber-300"
              }`}>
                {selected.crm_type === "customer" ? "Cliente" : "Lead"}
              </Badge>
            )}
          </div>

          {/* CRM link */}
          <div className="border-b border-slate-800 px-4 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Vinculación CRM</p>
            {selected.crm_name ? (
              <Link href={selected.crm_type === "customer" ? "/dashboard/customers" : "/dashboard/leads"} className="flex w-full items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-900">
                <Link2 className="h-4 w-4 text-blue-500" />
                <span className="flex-1 truncate">{selected.crm_name}</span>
                <span className="text-xs text-slate-400">Ver ficha →</span>
              </Link>
            ) : (
              <button className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-700 px-3 py-2 text-sm text-slate-400 hover:border-orange-400 hover:text-orange-500">
                <User className="h-4 w-4" />
                Vincular a Lead / Cliente
              </button>
            )}
          </div>

          {/* Quick info */}
          <div className="border-b border-slate-800 px-4 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Información</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-slate-400">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <span>Sin etiquetas</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Último contacto: hoy</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <MessageCircle className="h-3.5 w-3.5 text-slate-400" />
                <span>{selected.messages.length} mensajes en el hilo</span>
              </li>
            </ul>
          </div>

          {/* Channel stats */}
          <div className="px-4 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Estadísticas del canal (hoy)
            </p>
            <ul className="space-y-2">
              {[
                { label: "Enviados", value: STATS.sent, color: "text-slate-300" },
                { label: "Entregados", value: STATS.delivered, color: "text-orange-400" },
                { label: "Leídos", value: STATS.read, color: "text-green-400" },
                { label: "Respuestas", value: STATS.replies, color: "text-violet-400" },
              ].map(({ label, value, color }) => (
                <li key={label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span className={`font-semibold ${color}`}>{value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── New message modal ──────────────────────────────────────────────── */}
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
                  // Will call WhatsApp Business API when connected
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
    </FeatureGate>
  );
}
