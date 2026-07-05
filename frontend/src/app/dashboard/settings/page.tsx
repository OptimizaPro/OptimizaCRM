"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";
import { settingsApi, type MembershipDetail } from "@/lib/api";
import {
  User, Building2, Users, CreditCard, Trash2, Shield,
  CheckCircle2, Loader2, ExternalLink, Lock, BanknoteX,
  KeyRound, ChevronRight, Sparkles, Crown,
} from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { billingApi, type ApiPlan } from "@/lib/api";

type Tab = "perfil" | "organizacion" | "equipo" | "facturacion";

const ROLES: Record<string, string> = {
  org_admin:       "Administrador",
  sales_manager:   "Gerente de ventas",
  sales_executive: "Ejecutivo de ventas",
  viewer:          "Solo lectura",
};

const ROLE_BADGE: Record<string, string> = {
  org_admin:       "bg-purple-950/60 text-purple-300 border border-purple-800/50",
  sales_manager:   "bg-blue-950/60 text-blue-300 border border-blue-800/50",
  sales_executive: "bg-green-950/60 text-green-300 border border-green-800/50",
  viewer:          "bg-slate-800 text-slate-400 border border-slate-700",
};

const PLAN_BADGE: Record<string, string> = {
  basico:     "bg-slate-700 text-slate-200",
  pro:        "bg-orange-600 text-white",
  equipo:     "bg-orange-500 text-white",
  enterprise: "bg-purple-700 text-white",
};

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  trialing:   { label: "Prueba gratuita", color: "text-blue-400",   dot: "bg-blue-400" },
  active:     { label: "Activa",          color: "text-green-400",  dot: "bg-green-400" },
  past_due:   { label: "Pago pendiente",  color: "text-yellow-400", dot: "bg-yellow-400" },
  canceled:   { label: "Cancelada",       color: "text-red-400",    dot: "bg-red-400" },
  incomplete: { label: "Incompleta",      color: "text-slate-400",  dot: "bg-slate-500" },
};

// ── Avatar initials ──────────────────────────────────────────────────────────
function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  const sz = size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-12 w-12 text-lg" : "h-9 w-9 text-sm";
  return (
    <div className={`${sz} flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-700 font-semibold text-white shadow-md`}>
      {initials || "?"}
    </div>
  );
}

// ── Feedback alert ───────────────────────────────────────────────────────────
function Alert({ type, text }: { type: "ok" | "err"; text: string }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
      type === "ok"
        ? "border-green-800/50 bg-green-950/40 text-green-300"
        : "border-red-800/50 bg-red-950/40 text-red-300"
    }`}>
      {type === "ok"
        ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
        : <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />}
      {text}
    </div>
  );
}

// ── Section card ─────────────────────────────────────────────────────────────
function Section({
  icon, title, description, children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ── Label ────────────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-sm font-medium text-slate-300">{children}</label>;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, organization, tokens, setUser, setOrganization } = useAuthStore();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("perfil");
  const [paymentBanner, setPaymentBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [apiPlans, setApiPlans] = useState<ApiPlan[]>([]);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      setTab("facturacion");
      setPaymentBanner({ type: "ok", text: "¡Pago completado! Tu plan será activado en unos momentos." });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    } else if (status === "canceled") {
      setTab("facturacion");
      setPaymentBanner({ type: "err", text: "El proceso de pago fue cancelado. Puedes intentarlo de nuevo cuando quieras." });
    }
    billingApi.getPlans().then(setApiPlans).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdmin = user?.role === "org_admin";
  const fullName = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || user?.email || "";

  // ── Perfil state ──
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name ?? "",
    last_name:  user?.last_name  ?? "",
    email:      user?.email      ?? "",
  });
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [profileMsg,  setProfileMsg]  = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ── Organización state ──
  const [orgForm, setOrgForm] = useState({ name: organization?.name ?? "", website: "", industry: "" });
  const [orgMsg,  setOrgMsg]  = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ── Equipo state ──
  const [inviteForm, setInviteForm] = useState({ email: "", first_name: "", last_name: "", role: "sales_executive" });
  const [inviteMsg,  setInviteMsg]  = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  // ── Queries ──
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["members", organization?.id],
    queryFn:  () => settingsApi.getMembers(tokens!.access, organization!.id),
    enabled:  !!tokens && !!organization && tab === "equipo",
  });

  const { data: subscription, isLoading: loadingSub } = useQuery({
    queryKey: ["subscription", organization?.id],
    queryFn:  () => billingApi.getSubscription(tokens!.access, organization!.id),
    enabled:  !!tokens && !!organization && tab === "facturacion",
  });

  const checkoutMutation = useMutation({
    mutationFn: (plan: string) => billingApi.createCheckout(tokens!.access, organization!.id, plan),
    onSuccess:  ({ checkout_url }) => { window.location.href = checkout_url; },
  });

  // ── Mutations ──
  const updateProfileMutation = useMutation({
    mutationFn: (data: typeof profileForm) => settingsApi.updateProfile(tokens!.access, organization!.id, data),
    onSuccess: (updated) => {
      setUser({ ...user!, ...updated });
      setProfileMsg({ type: "ok", text: "Perfil actualizado correctamente." });
      setTimeout(() => setProfileMsg(null), 4000);
    },
    onError: (e: Error) => setProfileMsg({ type: "err", text: e.message }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => settingsApi.changePassword(tokens!.access, organization!.id, {
      current_password: passwordForm.current_password,
      new_password:     passwordForm.new_password,
    }),
    onSuccess: () => {
      setPasswordForm({ current_password: "", new_password: "", confirm: "" });
      setPasswordMsg({ type: "ok", text: "Contraseña actualizada correctamente." });
      setTimeout(() => setPasswordMsg(null), 4000);
    },
    onError: (e: Error) => setPasswordMsg({ type: "err", text: e.message }),
  });

  const updateOrgMutation = useMutation({
    mutationFn: (data: typeof orgForm) => settingsApi.updateOrganization(tokens!.access, organization!.id, data),
    onSuccess: (updated) => {
      setOrganization({ ...organization!, ...updated });
      setOrgMsg({ type: "ok", text: "Organización actualizada correctamente." });
      setTimeout(() => setOrgMsg(null), 4000);
    },
    onError: (e: Error) => setOrgMsg({ type: "err", text: e.message }),
  });

  const inviteMutation = useMutation({
    mutationFn: () => settingsApi.inviteMember(tokens!.access, organization!.id, inviteForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", organization?.id] });
      setInviteForm({ email: "", first_name: "", last_name: "", role: "sales_executive" });
      setInviteMsg({ type: "ok", text: "Miembro añadido correctamente." });
      setTimeout(() => setInviteMsg(null), 4000);
    },
    onError: (e: Error) => setInviteMsg({ type: "err", text: e.message }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ membershipId, role }: { membershipId: string; role: string }) =>
      settingsApi.updateMemberRole(tokens!.access, organization!.id, membershipId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members", organization?.id] }),
  });

  const removeMutation = useMutation({
    mutationFn: (membershipId: string) => settingsApi.removeMember(tokens!.access, organization!.id, membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", organization?.id] });
      setConfirmRemove(null);
    },
    onError: (e: Error) => setInviteMsg({ type: "err", text: e.message }),
  });

  const handlePasswordSubmit = () => {
    if (passwordForm.new_password !== passwordForm.confirm) {
      setPasswordMsg({ type: "err", text: "Las contraseñas nuevas no coinciden." });
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordMsg({ type: "err", text: "La nueva contraseña debe tener al menos 8 caracteres." });
      return;
    }
    changePasswordMutation.mutate();
  };

  const TABS: { id: Tab; label: string; desc: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: "perfil",       label: "Perfil",        desc: "Datos personales y contraseña",  icon: <User className="h-4 w-4" /> },
    { id: "organizacion", label: "Organización",  desc: "Nombre, sector y configuración", icon: <Building2 className="h-4 w-4" />, adminOnly: true },
    { id: "equipo",       label: "Equipo",         desc: "Miembros y roles",               icon: <Users className="h-4 w-4" />, adminOnly: true },
    { id: "facturacion",  label: "Facturación",   desc: "Plan, pagos y upgrade",           icon: <CreditCard className="h-4 w-4" /> },
  ];

  return (
    <>
      {/* ── Confirm remove modal ───────────────────────────────────────────── */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setConfirmRemove(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-950/50 text-red-400 mb-4">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-100 mb-1">¿Eliminar miembro?</h3>
            <p className="text-sm text-slate-400 mb-5">
              El miembro perderá el acceso a la organización. Puedes volver a añadirle en cualquier momento.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate(confirmRemove)}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-60"
              >
                {removeMutation.isPending ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <DashboardHeader title="Configuración" />

      <div className="flex-1 overflow-y-auto bg-slate-900/30">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="flex gap-8">

            {/* ── Sidebar nav ─────────────────────────────────────────────── */}
            <nav className="hidden md:flex flex-col gap-1 w-52 flex-shrink-0">
              {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                    tab === t.id
                      ? "bg-orange-950/30 border border-orange-800/30"
                      : "border border-transparent hover:bg-slate-800/60 hover:border-slate-700/50"
                  }`}
                >
                  {tab === t.id && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-full bg-orange-500" />
                  )}
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                    tab === t.id ? "bg-orange-950/60 text-orange-400" : "bg-slate-800 text-slate-500 group-hover:text-slate-300"
                  }`}>
                    {t.icon}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium leading-tight ${tab === t.id ? "text-orange-300" : "text-slate-300 group-hover:text-slate-100"}`}>
                      {t.label}
                    </p>
                    <p className="text-xs text-slate-500 leading-tight mt-0.5 truncate">{t.desc}</p>
                  </div>
                  {tab === t.id && <ChevronRight className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-orange-500" />}
                </button>
              ))}
            </nav>

            {/* ── Mobile nav ──────────────────────────────────────────────── */}
            <div className="flex md:hidden gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-hide w-full">
              {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    tab === t.id
                      ? "bg-orange-600 text-white shadow-md shadow-orange-900/30"
                      : "bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Content ─────────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* ── PERFIL ── */}
              {tab === "perfil" && (
                <>
                  {/* Identity card */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                    {/* Header with avatar */}
                    <div className="relative flex items-end gap-4 border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 px-6 py-5">
                      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-orange-950/20 to-transparent pointer-events-none" />
                      <Avatar name={fullName} size="lg" />
                      <div>
                        <p className="text-base font-semibold text-slate-100">{fullName || "—"}</p>
                        <p className="text-sm text-slate-400">{user?.email}</p>
                        <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[user?.role ?? ""] ?? ROLE_BADGE.viewer}`}>
                          <Shield className="h-3 w-3" />
                          {ROLES[user?.role ?? ""] ?? user?.role}
                        </span>
                      </div>
                    </div>

                    <div className="px-6 py-5 space-y-4">
                      {profileMsg && <Alert {...profileMsg} />}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Nombre</Label>
                          <Input value={profileForm.first_name} onChange={(e) => setProfileForm((p) => ({ ...p, first_name: e.target.value }))} />
                        </div>
                        <div>
                          <Label>Apellido</Label>
                          <Input value={profileForm.last_name} onChange={(e) => setProfileForm((p) => ({ ...p, last_name: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input type="email" value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} />
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button
                          className="bg-orange-600 hover:bg-orange-500 text-white"
                          onClick={() => updateProfileMutation.mutate(profileForm)}
                          disabled={updateProfileMutation.isPending}
                        >
                          {updateProfileMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Guardando…</> : "Guardar cambios"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <Section icon={<KeyRound className="h-4 w-4" />} title="Cambiar contraseña" description="Mínimo 8 caracteres">
                    {passwordMsg && <Alert {...passwordMsg} />}
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Contraseña actual</Label>
                        <Input type="password" value={passwordForm.current_password} onChange={(e) => setPasswordForm((p) => ({ ...p, current_password: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Nueva contraseña</Label>
                        <Input type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm((p) => ({ ...p, new_password: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Confirmar nueva contraseña</Label>
                        <Input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))} />
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button
                          className="bg-orange-600 hover:bg-orange-500 text-white"
                          onClick={handlePasswordSubmit}
                          disabled={changePasswordMutation.isPending || !passwordForm.current_password || !passwordForm.new_password}
                        >
                          {changePasswordMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Actualizando…</> : "Actualizar contraseña"}
                        </Button>
                      </div>
                    </div>
                  </Section>
                </>
              )}

              {/* ── ORGANIZACIÓN ── */}
              {tab === "organizacion" && isAdmin && (
                <Section icon={<Building2 className="h-4 w-4" />} title="Datos de la organización" description="Información pública de tu empresa">
                  {orgMsg && <Alert {...orgMsg} />}
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Nombre de la organización</Label>
                      <Input value={orgForm.name} onChange={(e) => setOrgForm((p) => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Sitio web</Label>
                      <Input placeholder="https://tuempresa.com" value={orgForm.website} onChange={(e) => setOrgForm((p) => ({ ...p, website: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Sector</Label>
                      <Input placeholder="Retail, Hospitality, Real Estate…" value={orgForm.industry} onChange={(e) => setOrgForm((p) => ({ ...p, industry: e.target.value }))} />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-500">
                        Slug:{" "}
                        <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">{organization?.slug}</code>
                      </span>
                      <Button
                        className="bg-orange-600 hover:bg-orange-500 text-white"
                        onClick={() => updateOrgMutation.mutate(orgForm)}
                        disabled={updateOrgMutation.isPending}
                      >
                        {updateOrgMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Guardando…</> : "Guardar cambios"}
                      </Button>
                    </div>
                  </div>
                </Section>
              )}

              {/* ── EQUIPO ── */}
              {tab === "equipo" && isAdmin && (
                <>
                  <Section icon={<Users className="h-4 w-4" />} title="Añadir miembro" description="El miembro recibirá acceso inmediato">
                    {inviteMsg && <Alert {...inviteMsg} />}
                    <div className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Nombre</Label>
                          <Input placeholder="Ana" value={inviteForm.first_name} onChange={(e) => setInviteForm((p) => ({ ...p, first_name: e.target.value }))} />
                        </div>
                        <div>
                          <Label>Apellido</Label>
                          <Input placeholder="García" value={inviteForm.last_name} onChange={(e) => setInviteForm((p) => ({ ...p, last_name: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input type="email" placeholder="ana@empresa.com" value={inviteForm.email} onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Rol</Label>
                        <Select value={inviteForm.role} onValueChange={(v) => setInviteForm((p) => ({ ...p, role: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLES).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button
                          className="bg-orange-600 hover:bg-orange-500 text-white"
                          onClick={() => inviteMutation.mutate()}
                          disabled={inviteMutation.isPending || !inviteForm.email}
                        >
                          {inviteMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Añadiendo…</> : "Añadir miembro"}
                        </Button>
                      </div>
                    </div>
                  </Section>

                  {/* Members list */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-100">Miembros del equipo</h3>
                          {!loadingMembers && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {(members as MembershipDetail[]).filter((m) => m.is_active).length} miembro{(members as MembershipDetail[]).filter((m) => m.is_active).length !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {loadingMembers ? (
                      <div className="flex h-24 items-center justify-center gap-2 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Cargando miembros…
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-800">
                        {(members as MembershipDetail[]).filter((m) => m.is_active).map((m) => {
                          const name = m.user.full_name || `${m.user.first_name} ${m.user.last_name}`.trim() || m.user.email;
                          const isMe = m.user.email === user?.email;
                          return (
                            <li key={m.id} className="flex items-center justify-between px-6 py-3.5 gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar name={name} size="sm" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-200 truncate">
                                    {name}
                                    {isMe && <span className="ml-2 text-[10px] text-orange-400 font-normal">(tú)</span>}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate">{m.user.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Select
                                  value={m.role}
                                  onValueChange={(v) => updateRoleMutation.mutate({ membershipId: m.id, role: v })}
                                  disabled={isMe}
                                >
                                  <SelectTrigger className="h-7 px-2 py-1 text-xs w-auto">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(ROLES).map(([value, label]) => (
                                      <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <button
                                  onClick={() => setConfirmRemove(m.id)}
                                  disabled={isMe}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-red-950/50 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Eliminar miembro"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </>
              )}

              {/* ── FACTURACIÓN ── */}
              {tab === "facturacion" && (
                <>
                  {paymentBanner && <Alert {...paymentBanner} />}

                  {loadingSub ? (
                    <div className="flex h-32 items-center justify-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin" /> Cargando facturación…
                    </div>
                  ) : subscription ? (
                    <>
                      {/* Current plan */}
                      <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                        <div className="relative border-b border-slate-800 px-6 py-5 bg-gradient-to-b from-slate-900 to-slate-950">
                          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-orange-950/20 to-transparent pointer-events-none" />
                          <div className="relative flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Crown className="h-4 w-4 text-orange-400" />
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Plan actual</p>
                              </div>
                              {(() => {
                                const currentPlan = apiPlans.find((p) => p.slug === subscription.plan);
                                const st = STATUS_LABELS[subscription.status];
                                return (
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${PLAN_BADGE[subscription.plan] ?? "bg-slate-700 text-slate-200"}`}>
                                      {currentPlan?.name ?? subscription.plan}
                                    </span>
                                    {st && (
                                      <span className={`flex items-center gap-1.5 text-xs font-medium ${st.color}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                                        {st.label}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            <p className="text-xl font-bold text-slate-100 flex-shrink-0">
                              {apiPlans.find((p) => p.slug === subscription.plan)
                                ? `$${parseFloat(apiPlans.find((p) => p.slug === subscription.plan)!.price_monthly).toFixed(0)}/mes`
                                : ""}
                            </p>
                          </div>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                          {subscription.status === "trialing" && subscription.trial_ends_at && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-blue-800/50 bg-blue-950/30 px-4 py-3 text-sm text-blue-300">
                              <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
                              <span>
                                Tu prueba gratuita finaliza el{" "}
                                <span className="font-semibold">
                                  {new Date(subscription.trial_ends_at).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" })}
                                </span>
                                . Activa un plan para continuar sin interrupciones.
                              </span>
                            </div>
                          )}

                          {subscription.current_period_end && subscription.status === "active" && (
                            <p className="text-xs text-slate-500">
                              Próxima renovación:{" "}
                              <span className="text-slate-300 font-medium">
                                {new Date(subscription.current_period_end).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" })}
                              </span>
                            </p>
                          )}

                          {(() => {
                            const features = (apiPlans.find((p) => p.slug === subscription.plan)?.features ?? []).filter((f) => f.included);
                            if (!features.length) return null;
                            return (
                              <ul className="grid grid-cols-1 gap-y-2 sm:grid-cols-2">
                                {features.map((f) => (
                                  <li key={f.text} className="flex items-center gap-2 text-sm text-slate-400">
                                    <CheckCircle2 className={`h-3.5 w-3.5 flex-shrink-0 ${f.highlight ? "text-orange-400" : "text-green-500"}`} />
                                    {f.text}
                                  </li>
                                ))}
                              </ul>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Upgrade */}
                      {subscription.plan !== "enterprise" && apiPlans.length > 0 && (
                        <Section icon={<Sparkles className="h-4 w-4" />} title="Cambiar plan" description="Actualiza o cambia tu suscripción">
                          <div className="space-y-3 mt-4">
                            {apiPlans
                              .filter((p) => p.slug !== subscription.plan && p.slug !== "enterprise")
                              .map((p) => (
                                <div key={p.slug} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 hover:border-slate-700 transition-colors">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-100">{p.name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">${parseFloat(p.price_monthly).toFixed(0)}/mes</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    className="bg-orange-600 hover:bg-orange-500 text-white gap-1.5"
                                    disabled={checkoutMutation.isPending}
                                    onClick={() => checkoutMutation.mutate(p.slug)}
                                  >
                                    {checkoutMutation.isPending && checkoutMutation.variables === p.slug
                                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      : <><span>Activar</span><ExternalLink className="h-3 w-3" /></>}
                                  </Button>
                                </div>
                              ))}
                            <p className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                              <Lock className="h-3 w-3" />
                              Serás redirigido a Recurrente, nuestra pasarela de pagos segura en Guatemala.
                            </p>
                          </div>
                        </Section>
                      )}

                      {subscription.plan === "enterprise" && (
                        <div className="rounded-2xl border border-purple-800/40 bg-purple-950/20 px-5 py-4">
                          <p className="text-sm font-semibold text-purple-300">Plan Enterprise activo</p>
                          <p className="text-xs text-purple-400 mt-1">
                            Para cambios en tu plan contacta a tu gestor de cuenta o escribe a hola@optimizapro.com
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 py-12 text-center">
                      <BanknoteX className="h-8 w-8 text-slate-600" />
                      <p className="text-sm text-slate-500">No se pudo cargar la información de facturación.</p>
                    </div>
                  )}
                </>
              )}

            </div>{/* /content */}
          </div>
        </div>
      </div>
    </>
  );
}
