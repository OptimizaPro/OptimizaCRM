"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, X, CheckCheck, Info, CheckCircle, AlertTriangle, CheckSquare, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { notificationsApi, type Notification } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  info:    { icon: Info,          color: "text-blue-400",   bg: "bg-blue-950/40" },
  success: { icon: CheckCircle,   color: "text-green-400",  bg: "bg-green-950/40" },
  warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-950/40" },
  task:    { icon: CheckSquare,   color: "text-orange-400", bg: "bg-orange-950/40" },
  deal:    { icon: Target,        color: "text-purple-400", bg: "bg-purple-950/40" },
  lead:    { icon: Users,         color: "text-teal-400",   bg: "bg-teal-950/40" },
} satisfies Record<Notification["notification_type"], { icon: React.ElementType; color: string; bg: string }>;

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)   return "ahora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationsPanel() {
  const { tokens, organization } = useAuthStore();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.getAll(tokens!.access, organization!.id),
    enabled: !!tokens && !!organization,
    refetchInterval: 30_000, // poll every 30s
  });

  const notifications = data?.results ?? [];
  const unread = notifications.filter((n) => !n.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(tokens!.access, organization!.id, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(tokens!.access, organization!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(tokens!.access, organization!.id, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const handleOpen = () => setOpen((v) => !v);

  const handleClickNotification = (n: Notification) => {
    if (!n.is_read) markReadMutation.mutate(n.id);
    if (n.link) window.location.href = n.link;
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-slate-800 bg-slate-950 shadow-xl shadow-black/40">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100">Notificaciones</h3>
              {unread > 0 && (
                <span className="rounded-full bg-orange-950/50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-400">
                  {unread} nuevas
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-orange-600"
                title="Marcar todas como leídas"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Leer todas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
                <Bell className="h-8 w-8 opacity-30" />
                <p className="text-sm">Sin notificaciones</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {notifications.map((n) => {
                  const cfg = TYPE_CONFIG[n.notification_type] ?? TYPE_CONFIG.info;
                  const Icon = cfg.icon;
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        "group flex items-start gap-3 px-4 py-3 transition-colors",
                        !n.is_read ? "bg-orange-950/10" : "hover:bg-slate-900",
                        n.link && "cursor-pointer"
                      )}
                      onClick={() => handleClickNotification(n)}
                    >
                      {/* Icon */}
                      <div className={cn("mt-0.5 flex-shrink-0 rounded-lg p-1.5", cfg.bg)}>
                        <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-xs font-medium leading-snug", n.is_read ? "text-slate-300" : "text-slate-100")}>
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500 line-clamp-2">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-600">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-shrink-0 flex-col items-end gap-1">
                        {!n.is_read && (
                          <span className="h-2 w-2 rounded-full bg-orange-500" title="No leída" />
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(n.id); }}
                          className="opacity-0 transition-opacity group-hover:opacity-100 text-slate-300 hover:text-red-400"
                          title="Eliminar"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-800 px-4 py-2.5">
              <p className="text-center text-xs text-slate-400">
                {notifications.length} notificación{notifications.length !== 1 ? "es" : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
