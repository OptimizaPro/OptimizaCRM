"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { adminApi, authApi, type AdminUser } from "@/lib/api";
import {
  Users, Search, X, ShieldCheck, ShieldOff, UserCheck, UserX,
  RefreshCw, Building2, Crown, Calendar, Phone,
  Mail, Hash, CheckCircle, XCircle, Shield, Loader2, Filter,
  Plus, Pencil, Trash2, Eye, LayoutGrid, List,
} from "lucide-react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

// Keys mirror Organization.PLAN_CHOICES in backend/apps/accounts/models.py
const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free:       { label: "Free",       color: "bg-slate-800 text-slate-400" },
  pro:        { label: "Pro",        color: "bg-orange-900/40 text-orange-400" },
  enterprise: { label: "Enterprise", color: "bg-amber-900/40 text-amber-400" },
};

const ROLE_LABELS: Record<string, string> = {
  org_admin:       "Admin",
  sales_manager:   "Manager",
  sales_executive: "Ejecutivo",
  viewer:          "Viewer",
};

const inputCls =
  "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20";

// ─── Small helpers ────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const meta = PLAN_LABELS[plan] ?? { label: plan, color: "bg-slate-800 text-slate-400" };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.color}`}>
      {meta.label}
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
      active ? "bg-green-900/40 text-green-400" : "bg-slate-800 text-slate-400"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-green-400" : "bg-slate-500"}`} />
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

function Avatar({ user, size = "md" }: { user: Pick<AdminUser, "first_name" | "last_name" | "email" | "avatar">; size?: "sm" | "md" | "lg" }) {
  const initials = [user.first_name[0], user.last_name[0]].filter(Boolean).join("").toUpperCase() || user.email[0].toUpperCase();
  const sizeMap = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-14 w-14 text-lg" };
  return user.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatar} alt="" className={`${sizeMap[size]} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <div className={`${sizeMap[size]} rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center font-bold text-white flex-shrink-0 shadow-md shadow-orange-900/30`}>
      {initials}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Create / Edit modal ──────────────────────────────────────────────────────

interface UserFormModalProps {
  mode: "create" | "edit";
  initial?: AdminUser;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  saving: boolean;
  apiError: string;
}

function UserFormModal({ mode, initial, onClose, onSave, saving, apiError }: UserFormModalProps) {
  const { tokens, organization } = useAuthStore();
  const token = tokens?.access ?? "";
  const orgId = String(organization?.id ?? "");

  const [form, setForm] = useState({
    first_name: initial?.first_name ?? "",
    last_name:  initial?.last_name  ?? "",
    email:      initial?.email      ?? "",
    phone:      initial?.phone      ?? "",
    password:   "",
    is_staff:   initial?.is_staff   ?? false,
    is_active:  initial?.is_active  ?? true,
    org_id:     initial?.organization?.id   ?? orgId,
    role:       initial?.organization?.role ?? "sales_executive",
  });

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const { data: orgs } = useQuery({
    queryKey: ["admin-orgs"],
    queryFn:  () => adminApi.listAdminOrgs(token, orgId),
    enabled:  !!token,
    staleTime: 60_000,
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400">
                {mode === "create" ? <Plus className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              </div>
              <h2 className="font-semibold text-slate-100">
                {mode === "create" ? "Crear usuario" : "Editar usuario"}
              </h2>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Nombre</label>
                <input className={inputCls} value={form.first_name} onChange={e => set("first_name", e.target.value)} placeholder="Juan" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Apellido</label>
                <input className={inputCls} value={form.last_name} onChange={e => set("last_name", e.target.value)} placeholder="Pérez" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
              <input
                className={inputCls}
                type="email"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                placeholder="juan@empresa.com"
                disabled={mode === "edit"}
              />
              {mode === "edit" && <p className="mt-1 text-xs text-slate-600">El email no se puede cambiar.</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Teléfono</label>
              <input className={inputCls} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+502 1234 5678" />
            </div>

            {mode === "create" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Contraseña <span className="text-slate-500 font-normal">(opcional)</span>
                </label>
                <input
                  className={inputCls}
                  type="password"
                  value={form.password}
                  onChange={e => set("password", e.target.value)}
                  placeholder="Dejar vacío para contraseña no usable"
                />
              </div>
            )}

            {/* Org + Role — only for non-staff users */}
            {!form.is_staff && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Organización</label>
                  <select
                    className={inputCls}
                    value={form.org_id}
                    onChange={e => set("org_id", e.target.value)}
                  >
                    <option value="">Sin organización</option>
                    {(orgs ?? []).map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Rol</label>
                  <select
                    className={inputCls}
                    value={form.role}
                    onChange={e => set("role", e.target.value)}
                    disabled={!form.org_id}
                  >
                    <option value="sales_executive">Ejecutivo</option>
                    <option value="sales_manager">Manager</option>
                    <option value="org_admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.is_active}
                  onClick={() => set("is_active", !form.is_active)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${form.is_active ? "bg-green-600" : "bg-slate-700"}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${form.is_active ? "translate-x-4" : "translate-x-0"}`} />
                </button>
                <span className="text-sm text-slate-300">Cuenta activa</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.is_staff}
                  onClick={() => set("is_staff", !form.is_staff)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${form.is_staff ? "bg-orange-600" : "bg-slate-700"}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${form.is_staff ? "translate-x-4" : "translate-x-0"}`} />
                </button>
                <span className="text-sm text-slate-300">Staff / Superadmin</span>
              </label>
            </div>

            {apiError && (
              <p className="rounded-lg bg-red-950/30 px-3 py-2 text-xs text-red-400">{apiError}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-6 py-4">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={saving || !form.email}
              onClick={() => onSave(form)}
              className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              {mode === "create" ? "Crear usuario" : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function UserDrawer({
  user, onClose, onEdit, onToggle, isStaff, toggling,
}: {
  user: AdminUser;
  onClose: () => void;
  onEdit: () => void;
  onToggle: (field: "is_active" | "is_staff") => void;
  isStaff: boolean;
  toggling: boolean;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Avatar user={user} size="md" />
            <div className="min-w-0">
              <p className="font-semibold text-slate-100 truncate">{user.full_name || "Sin nombre"}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isStaff && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-orange-400 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            )}
            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <StatusDot active={user.is_active} />
            {user.is_staff && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-900/40 px-2.5 py-0.5 text-[11px] font-semibold text-orange-400">
                <Shield className="h-3 w-3" /> Staff
              </span>
            )}
            {user.organization && <PlanBadge plan={user.organization.plan} />}
          </div>

          {/* Account info */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="border-b border-slate-800 px-4 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cuenta</p>
            </div>
            <div className="divide-y divide-slate-800">
              {[
                { icon: Mail,     label: "Email",     value: user.email },
                { icon: Hash,     label: "ID",         value: user.id.slice(0, 8) + "…" },
                { icon: Calendar, label: "Registrado", value: formatDate(user.created_at) },
                { icon: Phone,    label: "Teléfono",   value: user.phone || "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3">
                  <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                  <span className="text-xs text-slate-500 w-24 flex-shrink-0">{label}</span>
                  <span className="text-sm text-slate-200 truncate">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Organization info */}
          {user.organization && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <div className="border-b border-slate-800 px-4 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Organización</p>
              </div>
              <div className="divide-y divide-slate-800">
                {[
                  { icon: Building2, label: "Nombre",  value: user.organization.name },
                  { icon: Crown,     label: "Plan",    value: <PlanBadge plan={user.organization.plan} /> },
                  { icon: UserCheck, label: "Rol",     value: ROLE_LABELS[user.organization.role] ?? user.organization.role },
                  { icon: Calendar,  label: "Se unió", value: formatDate(user.organization.joined_at) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-3">
                    <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                    <span className="text-xs text-slate-500 w-24 flex-shrink-0">{label}</span>
                    <span className="text-sm text-slate-200">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions (staff only) */}
          {isStaff && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <div className="border-b border-slate-800 px-4 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Acciones rápidas</p>
              </div>
              <div className="p-4 space-y-2.5">
                <button
                  onClick={() => onToggle("is_active")}
                  disabled={toggling}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all disabled:opacity-50 ${
                    user.is_active
                      ? "border-red-800/50 bg-red-950/20 text-red-400 hover:bg-red-950/40"
                      : "border-green-800/50 bg-green-950/20 text-green-400 hover:bg-green-950/40"
                  }`}
                >
                  {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  {user.is_active ? "Desactivar cuenta" : "Activar cuenta"}
                </button>
                <button
                  onClick={() => onToggle("is_staff")}
                  disabled={toggling}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all disabled:opacity-50 ${
                    user.is_staff
                      ? "border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800"
                      : "border-orange-800/50 bg-orange-950/20 text-orange-400 hover:bg-orange-950/40"
                  }`}
                >
                  {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : user.is_staff ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  {user.is_staff ? "Quitar acceso staff" : "Hacer staff"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── User card (grid view) ────────────────────────────────────────────────────

function UserCard({
  user, isStaff, deletingId,
  onView, onEdit, onDelete,
}: {
  user: AdminUser;
  isStaff: boolean;
  deletingId: string | null;
  onView:   (u: AdminUser) => void;
  onEdit:   (u: AdminUser) => void;
  onDelete: (u: AdminUser) => void;
}) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-lg transition-all hover:border-slate-700 hover:shadow-orange-900/10 hover:shadow-xl">

      {/* Staff badge */}
      {user.is_staff && (
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-orange-950/60 border border-orange-800/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-400">
          <Shield className="h-2.5 w-2.5" /> Staff
        </span>
      )}

      {/* Avatar + name */}
      <div className="mb-4 flex flex-col items-center gap-3 text-center">
        <Avatar user={user} size="lg" />
        <div className="min-w-0 w-full">
          <p className="truncate font-bold text-slate-100 leading-tight">
            {user.full_name || "Sin nombre"}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
        </div>
      </div>

      {/* Badges row */}
      <div className="mb-4 flex flex-wrap justify-center gap-1.5">
        <StatusDot active={user.is_active} />
        {user.organization && <PlanBadge plan={user.organization.plan} />}
        {user.organization && (
          <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
            {ROLE_LABELS[user.organization.role] ?? user.organization.role}
          </span>
        )}
      </div>

      {/* Info rows */}
      <div className="mb-4 flex-1 space-y-1.5 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        {user.organization ? (
          <div className="flex items-center gap-2 text-xs">
            <Building2 className="h-3 w-3 flex-shrink-0 text-slate-500" />
            <span className="truncate text-slate-400">{user.organization.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <Building2 className="h-3 w-3 flex-shrink-0 text-slate-600" />
            <span className="text-slate-600">Sin organización</span>
          </div>
        )}
        {user.phone && (
          <div className="flex items-center gap-2 text-xs">
            <Phone className="h-3 w-3 flex-shrink-0 text-slate-500" />
            <span className="text-slate-400">{user.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="h-3 w-3 flex-shrink-0 text-slate-500" />
          <span className="text-slate-500">{formatDate(user.created_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        <button
          onClick={() => onView(user)}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-900 py-2 text-xs text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-colors"
        >
          <Eye className="h-3.5 w-3.5" /> Ver
        </button>
        {isStaff && (
          <>
            <button
              onClick={() => onEdit(user)}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-900 py-2 text-xs text-slate-400 hover:border-orange-700 hover:text-orange-400 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar
            </button>
            <button
              onClick={() => onDelete(user)}
              disabled={deletingId === user.id}
              className="flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-500 hover:border-red-800 hover:text-red-400 transition-colors disabled:opacity-40"
            >
              {deletingId === user.id
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2 className="h-3.5 w-3.5" />
              }
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const router             = useRouter();
  const { tokens, organization } = useAuthStore();
  const token  = tokens?.access ?? "";
  const orgId  = String(organization?.id ?? "");
  const qc     = useQueryClient();

  const [search,       setSearch]       = useState("");
  const [planFilter,   setPlanFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode,     setViewMode]     = useState<"list" | "grid">("list");

  // drawer / modal state
  const [viewUser,   setViewUser]   = useState<AdminUser | null>(null);
  const [editUser,   setEditUser]   = useState<AdminUser | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [formError,  setFormError]  = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toggling,   setToggling]   = useState(false);

  // Verify access
  const { data: me } = useQuery({
    queryKey: ["auth-me"],
    queryFn:  () => authApi.me(token, orgId),
    enabled:  !!token,
    staleTime: 5 * 60 * 1000,
  });

  const isStaff   = me?.is_staff === true;
  const meLoaded  = !!me;
  const meRole    = me?.role ?? "";
  const canAccess = isStaff || ["org_admin", "sales_manager"].includes(meRole);

  if (meLoaded && !canAccess) {
    router.replace("/dashboard");
    return null;
  }

  // List query
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-users", search, planFilter, statusFilter],
    queryFn:  () => adminApi.listUsers(token, orgId, {
      search:  search      || undefined,
      plan:    planFilter  || undefined,
      status:  statusFilter || undefined,
    }),
    enabled: !!token && meLoaded && canAccess,
  });

  const users = data?.results ?? [];
  const total = data?.count ?? 0;

  const stats = useMemo(() => {
    const activeCount = users.filter(u => u.is_active).length;
    const staffCount  = users.filter(u => u.is_staff).length;
    const thisMonth   = users.filter(u => {
      const d = new Date(u.created_at), now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { activeCount, staffCount, thisMonth };
  }, [users]);

  const hasFilters = search || planFilter || statusFilter;

  // ── Mutations ──────────────────────────────────────────────────────────────

  const handleCreate = async (data: Record<string, unknown>) => {
    setFormSaving(true); setFormError("");
    try {
      await adminApi.createUser(token, orgId, data as Parameters<typeof adminApi.createUser>[2]);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setShowCreate(false);
      toast.success("Usuario creado");
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setFormSaving(false);
    }
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editUser) return;
    setFormSaving(true); setFormError("");
    try {
      await adminApi.updateUser(token, orgId, editUser.id, data as Parameters<typeof adminApi.updateUser>[3]);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      // refresh drawer if open on same user
      if (viewUser?.id === editUser.id) setViewUser(prev => prev ? { ...prev, ...(data as Partial<AdminUser>) } : prev);
      setEditUser(null);
      toast.success("Usuario actualizado");
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = (user: AdminUser) => {
    toast(`¿Eliminar a ${user.full_name || user.email}?`, {
      description: "Esta acción no se puede deshacer.",
      action: {
        label: "Sí, eliminar",
        onClick: async () => {
          setDeletingId(user.id);
          try {
            await adminApi.deleteUser(token, orgId, user.id);
            qc.invalidateQueries({ queryKey: ["admin-users"] });
            if (viewUser?.id === user.id) setViewUser(null);
            toast.success("Usuario eliminado");
          } catch (e) {
            toast.error("Error al eliminar", { description: (e as Error).message });
          } finally {
            setDeletingId(null);
          }
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
      duration: 8000,
    });
  };

  const handleToggle = async (user: AdminUser, field: "is_active" | "is_staff") => {
    setToggling(true);
    try {
      const updated = await adminApi.updateUser(token, orgId, user.id, { [field]: !user[field] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      if (viewUser?.id === user.id) setViewUser(updated);
      toast.success("Usuario actualizado");
    } catch (e) {
      toast.error("Error", { description: (e as Error).message });
    } finally {
      setToggling(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardHeader title="Usuarios" />

      <div className="flex-1 overflow-y-auto bg-slate-900/30">
        <div className="mx-auto max-w-[1440px] px-8 py-10">

          {/* ── Page header ── */}
          <div className="relative mb-10 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/10 px-8 py-8 shadow-2xl shadow-black/30">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-600/6 blur-3xl" />
            <div className="relative flex items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-600 shadow-xl shadow-orange-900/50 ring-1 ring-orange-500/40">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    {isStaff ? (
                      <span className="rounded-full border border-orange-700/50 bg-orange-950/60 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest text-orange-400">Superadmin</span>
                    ) : (
                      <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Tu organización</span>
                    )}
                  </div>
                  <h1 className="text-2xl font-black text-slate-100 leading-tight">
                    {isStaff ? "Gestión de Usuarios" : "Miembros del equipo"}
                  </h1>
                  <p className="mt-1 text-sm text-slate-400">
                    {isStaff
                      ? "Todos los usuarios registrados en la plataforma — activos, planes y permisos."
                      : "Usuarios vinculados a tu organización — roles y estado de cuenta."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="gap-1.5 border-slate-700 text-slate-400 hover:border-orange-600 hover:text-orange-400"
                >
                  <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                  Actualizar
                </Button>
                {isStaff && (
                  <Button
                    size="sm"
                    onClick={() => { setFormError(""); setShowCreate(true); }}
                    className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/30"
                  >
                    <Plus className="h-4 w-4" /> Crear usuario
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total usuarios",     value: total,             icon: Users,       color: "text-orange-400", bg: "bg-orange-950/40", border: "border-orange-800/30", staffOnly: false },
              { label: "Cuentas activas",    value: stats.activeCount, icon: CheckCircle, color: "text-green-400",  bg: "bg-green-950/40",  border: "border-green-800/30",  staffOnly: false },
              { label: "Staff / Superadmin", value: stats.staffCount,  icon: Shield,      color: "text-amber-400",  bg: "bg-amber-950/40",  border: "border-amber-800/30",  staffOnly: true  },
              { label: "Nuevos este mes",    value: stats.thisMonth,   icon: Calendar,    color: "text-sky-400",    bg: "bg-sky-950/40",    border: "border-sky-800/30",    staffOnly: false },
            ].filter(s => !s.staffOnly || isStaff).map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className={`rounded-2xl border ${border} bg-slate-950 p-5 flex flex-col gap-4 shadow-lg`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-3xl font-black text-slate-100 leading-none">{value}</p>
                  <p className="text-xs text-slate-500 mt-1.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Toolbar ── */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o email…"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <select
                value={planFilter}
                onChange={e => setPlanFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 focus:border-orange-500 focus:outline-none"
              >
                <option value="">Todos los planes</option>
                {Object.entries(PLAN_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 focus:border-orange-500 focus:outline-none"
              >
                <option value="">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
                {isStaff && <option value="staff">Staff</option>}
              </select>
              {hasFilters && (
                <button
                  onClick={() => { setSearch(""); setPlanFilter(""); setStatusFilter(""); }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2.5 text-xs text-slate-400 hover:border-red-700 hover:text-red-400 transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> Limpiar
                </button>
              )}

              {/* View mode toggle */}
              <div className="flex rounded-xl border border-slate-700 overflow-hidden">
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors ${
                    viewMode === "list"
                      ? "bg-orange-600 text-white"
                      : "bg-slate-900 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors border-l border-slate-700 ${
                    viewMode === "grid"
                      ? "bg-orange-600 text-white"
                      : "bg-slate-900 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Loading / empty ── */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-24">
              <Users className="h-10 w-10 text-slate-700" />
              <p className="text-slate-400">No se encontraron usuarios.</p>
              {hasFilters && (
                <button onClick={() => { setSearch(""); setPlanFilter(""); setStatusFilter(""); }} className="text-xs text-orange-400 hover:text-orange-300">
                  Limpiar filtros
                </button>
              )}
              {isStaff && !hasFilters && (
                <Button size="sm" onClick={() => setShowCreate(true)} className="mt-2 gap-1.5 bg-orange-600 hover:bg-orange-500 text-white">
                  <Plus className="h-4 w-4" /> Crear primer usuario
                </Button>
              )}
            </div>
          ) : viewMode === "grid" ? (

            /* ── Grid view ── */
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {users.map(user => (
                  <UserCard
                    key={user.id}
                    user={user}
                    isStaff={isStaff}
                    deletingId={deletingId}
                    onView={setViewUser}
                    onEdit={u => { setFormError(""); setEditUser(u); }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 px-5 py-3">
                <p className="text-xs text-slate-500">
                  {users.length} de {total} usuarios{hasFilters && " (filtrado)"}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    {users.filter(u => u.is_active).length} activos
                  </span>
                  <span className="flex items-center gap-1.5">
                    <XCircle className="h-3 w-3 text-slate-600" />
                    {users.filter(u => !u.is_active).length} inactivos
                  </span>
                </div>
              </div>
            </>

          ) : (

            /* ── List / Table view ── */
            <div className="rounded-2xl border border-slate-800 bg-slate-950 shadow-xl shadow-black/20 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-800 bg-slate-900/80">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Usuario</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Organización</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Rol</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Registro</th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map(user => (
                    <tr key={user.id} className="transition-colors hover:bg-slate-900/40 group">

                      {/* User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar user={user} size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-200 truncate max-w-[180px]">
                              {user.full_name || "—"}
                              {user.is_staff && <Shield className="ml-1.5 inline h-3 w-3 text-orange-400" />}
                            </p>
                            <p className="text-xs text-slate-500 truncate max-w-[180px]">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Org */}
                      <td className="px-4 py-3.5">
                        {user.organization ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-slate-600" />
                            <span className="text-slate-300 truncate max-w-[160px]">{user.organization.name}</span>
                          </div>
                        ) : <span className="text-slate-600">—</span>}
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3.5">
                        {user.organization ? <PlanBadge plan={user.organization.plan} /> : <span className="text-slate-600">—</span>}
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        <span className="text-slate-400 text-xs">
                          {user.organization ? (ROLE_LABELS[user.organization.role] ?? user.organization.role) : "—"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusDot active={user.is_active} />
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-slate-500">{formatDate(user.created_at)}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewUser(user)}
                            title="Ver detalle"
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Ver</span>
                          </button>
                          {isStaff && (
                            <button
                              onClick={() => { setFormError(""); setEditUser(user); }}
                              title="Editar usuario"
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-orange-400 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Editar</span>
                            </button>
                          )}
                          {isStaff && (
                            <button
                              onClick={() => handleDelete(user)}
                              disabled={deletingId === user.id}
                              title="Eliminar usuario"
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-red-950/30 hover:text-red-400 transition-colors disabled:opacity-40"
                            >
                              {deletingId === user.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />
                              }
                              <span className="hidden sm:inline">Eliminar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Table footer */}
              <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3 bg-slate-900/40">
                <p className="text-xs text-slate-500">
                  {users.length} de {total} usuarios{hasFilters && " (filtrado)"}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    {users.filter(u => u.is_active).length} activos
                  </span>
                  <span className="flex items-center gap-1.5">
                    <XCircle className="h-3 w-3 text-slate-600" />
                    {users.filter(u => !u.is_active).length} inactivos
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Detail drawer */}
      {viewUser && (
        <UserDrawer
          user={viewUser}
          onClose={() => setViewUser(null)}
          onEdit={() => { setFormError(""); setEditUser(viewUser); }}
          onToggle={(field) => handleToggle(viewUser, field)}
          isStaff={isStaff}
          toggling={toggling}
        />
      )}

      {/* Edit modal */}
      {editUser && (
        <UserFormModal
          mode="edit"
          initial={editUser}
          onClose={() => setEditUser(null)}
          onSave={handleEdit}
          saving={formSaving}
          apiError={formError}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <UserFormModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
          saving={formSaving}
          apiError={formError}
        />
      )}
    </div>
  );
}
