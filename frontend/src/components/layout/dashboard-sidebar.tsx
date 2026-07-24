"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, UserCheck, Target, Kanban, CheckSquare,
  Calendar, BarChart3, Brain, Settings, LogOut, Menu,
  Plug, Inbox, MessageCircle, ChevronDown, MessagesSquare,
  TrendingUp, ListTodo, LineChart, ShieldCheck, FileText,
  PanelLeftClose, PanelLeftOpen, Zap, ChevronUp, GraduationCap, Mail, Mic, LayoutGrid, FormInput, UsersRound, BookOpen, Bot, Lock, CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore, useSidebarStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { NotificationsPanel } from "@/components/ui/notifications-panel";
import { cmsApi } from "@/lib/api";
import { meetsMinPlan } from "@/components/dashboard/feature-gate";

// ─── Shared logo hook ─────────────────────────────────────────────────────────

function useSiteLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  useEffect(() => {
    cmsApi.getSection("general")
      .then(({ data }) => {
        const url = data?.logo_url;
        if (typeof url === "string" && url.length > 0) setLogoUrl(url);
      })
      .catch(() => {});
  }, []);
  return logoUrl;
}

// ─── Nav structure ────────────────────────────────────────────────────────────

type NavItem  = { href: string; label: string; icon: React.ElementType; staffOnly?: boolean; minPlan?: string; requireVoz?: boolean };
type NavGroup = { key: string; label: string; icon: React.ElementType; items: NavItem[] };
type NavEntry = { type: "item"; item: NavItem } | { type: "group"; group: NavGroup };

const NAV: NavEntry[] = [
  {
    type: "item",
    item: { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  },
  {
    type: "item",
    item: { href: "/dashboard/onboarding", label: "Primeros pasos", icon: GraduationCap },
  },
  {
    type: "group",
    group: {
      key: "comunicaciones",
      label: "Comunicaciones",
      icon: MessagesSquare,
      items: [
        { href: "/dashboard/inbox",     label: "Bandeja de entrada", icon: Inbox },
        { href: "/dashboard/whatsapp",  label: "WhatsApp",           icon: MessageCircle, minPlan: "pro" },
        { href: "/dashboard/campaigns", label: "Campañas de email",  icon: Mail,          minPlan: "pro" },
      ],
    },
  },
  {
    type: "group",
    group: {
      key: "ventas",
      label: "Ventas",
      icon: TrendingUp,
      items: [
        { href: "/dashboard/leads",         label: "Leads",         icon: Users },
        { href: "/dashboard/opportunities", label: "Oportunidades", icon: Target },
        { href: "/dashboard/pipeline",      label: "Pipeline",      icon: Kanban },
        { href: "/dashboard/customers",     label: "Clientes",      icon: UserCheck },
      ],
    },
  },
  {
    type: "group",
    group: {
      key: "productividad",
      label: "Productividad",
      icon: ListTodo,
      items: [
        { href: "/dashboard/tasks",      label: "Tareas",       icon: CheckSquare },
        { href: "/dashboard/calendar",   label: "Calendario",   icon: Calendar },
        { href: "/dashboard/scheduling", label: "Agendamiento", icon: CalendarClock },
      ],
    },
  },
  {
    type: "group",
    group: {
      key: "analisis",
      label: "Análisis",
      icon: LineChart,
      items: [
        { href: "/dashboard/reports", label: "Informes",  icon: BarChart3 },
        { href: "/dashboard/ai",      label: "Herramientas IA", icon: Brain },
      ],
    },
  },
  {
    type: "group",
    group: {
      key: "administracion",
      label: "Administración",
      icon: ShieldCheck,
      items: [
        { href: "/dashboard/users",           label: "Usuarios",              icon: Users },
        { href: "/dashboard/teams",           label: "Equipos",               icon: UsersRound, minPlan: "pro" },
        { href: "/dashboard/automation",      label: "Automatizaciones",      icon: Zap,        minPlan: "pro" },
        { href: "/dashboard/knowledge-base",  label: "Base de Conocimiento",  icon: BookOpen,   minPlan: "pro" },
        { href: "/dashboard/voice-plans",     label: "Agente de Voz IA",      icon: Mic,        requireVoz: true },
        { href: "/dashboard/chatbot",         label: "Chatbot RAG",           icon: Bot,        minPlan: "pro" },
        { href: "/dashboard/hub",             label: "Hub de Contacto",       icon: LayoutGrid, minPlan: "pro" },
        { href: "/dashboard/forms",           label: "Formularios",           icon: FormInput   },
        { href: "/dashboard/cms",             label: "Contenido Web",         icon: FileText,   staffOnly: true },
        { href: "/dashboard/integrations",    label: "Integraciones",         icon: Plug },
        { href: "/dashboard/settings",        label: "Ajustes",               icon: Settings },
      ],
    },
  },
];

// All leaf items flattened — used in collapsed icon-only mode (filtered at render time)
const ALL_ITEMS: NavItem[] = NAV.flatMap((entry) =>
  entry.type === "item" ? [entry.item] : entry.group.items
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultOpenGroups(pathname: string): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const entry of NAV) {
    if (entry.type === "group") {
      result[entry.group.key] = entry.group.items.some((it) =>
        it.href === "/dashboard" ? pathname === it.href : pathname.startsWith(it.href)
      );
    }
  }
  return result;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function DashboardSidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { isOpen, toggle, setOpen, isCollapsed, toggleCollapsed } = useSidebarStore();
  const { user, organization, logout } = useAuthStore();
  const logoUrl    = useSiteLogo();
  const orgPlan    = organization?.plan ?? "free";
  const orgSettings = (
    organization && typeof organization === "object" && "settings" in organization
      ? (organization as any).settings
      : {}
  ) as Record<string, unknown>;
  const hasVoz     = !!orgSettings.voice_plan_slug;

  const isItemLocked = (item: NavItem) => {
    if (user?.is_staff) return false;
    if (item.minPlan && !meetsMinPlan(orgPlan, item.minPlan as never)) return true;
    if (item.requireVoz && !hasVoz) return true;
    return false;
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    () => getDefaultOpenGroups(pathname)
  );

  const [isDesktop, setIsDesktop] = useState(false);

  // Desktop detection — auto-open on desktop, auto-close on mobile/tablet
  useEffect(() => {
    const update = () => {
      const desktop = window.innerWidth >= 1280;
      setIsDesktop(desktop);
      if (desktop) setOpen(true);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-close on navigation when on mobile/tablet
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1280) setOpen(false);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <>
      {/* Mobile/tablet overlay — only show when not on desktop */}
      {isOpen && !isDesktop && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={toggle} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-black transition-all duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        {/* Logo + collapse toggle */}
        <div className="flex h-16 items-center border-b border-slate-800 px-3">
          {isCollapsed ? (
            /* Collapsed: centered logo icon */
            <div className="flex flex-1 items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.png" alt="OptimizaPro" className="h-9 w-9 object-contain" />
            </div>
          ) : (
            /* Expanded: logo fills space, toggle pinned right */
            <div className="flex flex-1 items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl ?? "/logo.png"}
                alt="OptimizaCRM"
                className="h-9 w-auto max-w-[160px] object-contain"
              />
            </div>
          )}

          {/* Desktop collapse toggle — only on desktop */}
          <button
            onClick={toggleCollapsed}
            className={cn(
              "flex-shrink-0 items-center justify-center h-7 w-7 rounded-md text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-colors",
              isDesktop ? "flex" : "hidden"
            )}
            title={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {isCollapsed
              ? <PanelLeftOpen className="h-4 w-4" />
              : <PanelLeftClose className="h-4 w-4" />
            }
          </button>
        </div>

        {/* Nav */}
        <nav className={cn("flex-1 overflow-y-auto scrollbar-hide p-2 space-y-0.5", isCollapsed && "overflow-x-hidden")}>
          {isCollapsed ? (
            /* ── Collapsed: icon-only list ── */
            ALL_ITEMS.filter((it) => !it.staffOnly || user?.is_staff).map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={cn(
                    "flex items-center justify-center rounded-lg p-2.5 transition-colors",
                    active
                      ? "bg-orange-500/15 text-orange-400"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                </Link>
              );
            })
          ) : (
            /* ── Expanded: full nav with groups ── */
            NAV.map((entry) => {
              if (entry.type === "item") {
                const { href, label, icon: Icon } = entry.item;
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-orange-500/15 text-orange-400"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    {active && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />}
                  </Link>
                );
              }

              const { key, label, icon: GroupIcon, items: rawItems } = entry.group;
              const items       = rawItems.filter((it) => !it.staffOnly || user?.is_staff);
              if (items.length === 0) return null;
              const expanded    = openGroups[key] ?? false;
              const groupActive = items.some((it) => isActive(it.href));

              return (
                <div key={key}>
                  <button
                    onClick={() => toggleGroup(key)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      groupActive && !expanded
                        ? "bg-orange-500/15 text-orange-400"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    )}
                  >
                    <GroupIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 flex-shrink-0 text-slate-400 transition-transform duration-200",
                        expanded && "rotate-180"
                      )}
                    />
                  </button>

                  {expanded && (
                    <div className="ml-3 mt-0.5 border-l border-slate-700 pl-3 pb-0.5">
                      {items.map((subItem) => {
                        const { href, label: subLabel, icon: SubIcon } = subItem;
                        const active  = isActive(href);
                        const locked  = isItemLocked(subItem);
                        return (
                          <Link
                            key={href}
                            href={href}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                              active
                                ? "bg-orange-500/15 text-orange-400"
                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                            )}
                          >
                            <SubIcon className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="flex-1">{subLabel}</span>
                            {locked && !active && <Lock className="h-3 w-3 flex-shrink-0 text-slate-600" />}
                            {active && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 p-2">
          {isCollapsed ? (
            /* Collapsed: avatar only + logout icon */
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
                {user?.full_name
                  ? user.full_name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
                  : (user?.email?.[0] ?? "U").toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-950/40 hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            /* Expanded: avatar + name/email + logout */
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
                {user?.full_name
                  ? user.full_name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
                  : (user?.email?.[0] ?? "U").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-200">
                  {user?.full_name || "Usuario"}
                </p>
                <p className="truncate text-[10px] text-slate-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-950/40 hover:text-red-400"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ─── User dropdown ────────────────────────────────────────────────────────────

function UserDropdown() {
  const { user, organization, logout } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : (user?.email?.[0] ?? "U").toUpperCase();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
          {initials}
        </div>
        <span className="hidden max-w-[120px] truncate text-sm font-medium sm:block">
          {user?.full_name || user?.email}
        </span>
        <ChevronUp className={cn("h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200", open ? "" : "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-slate-800 bg-slate-950 shadow-xl shadow-black/40">
          {/* User info */}
          <div className="border-b border-slate-800 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-100">
              {user?.full_name || "Usuario"}
            </p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
            {organization?.name && (
              <p className="mt-1 truncate text-xs text-slate-500">{organization.name}</p>
            )}
          </div>

          {/* Actions */}
          <div className="p-1.5">
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
            >
              <Settings className="h-4 w-4 flex-shrink-0 text-slate-500" />
              Ajustes
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-red-950/40 hover:text-red-400"
            >
              <LogOut className="h-4 w-4 flex-shrink-0 text-slate-500" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

export function DashboardHeader({ title }: { title: string }) {
  const { toggle } = useSidebarStore();

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-700 bg-slate-800 px-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={toggle}>
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold truncate sm:text-xl">{title}</h1>
      </div>
      <div className="flex items-center gap-1">
        <NotificationsPanel />
        <UserDropdown />
      </div>
    </header>
  );
}
