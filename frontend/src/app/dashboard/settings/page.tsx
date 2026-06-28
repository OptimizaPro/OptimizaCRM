"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth";
import { settingsApi, type MembershipDetail } from "@/lib/api";
import { User, Building2, Users, CreditCard, Trash2, Shield, CheckCircle2, Loader2, ExternalLink, Lock, BanknoteX } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { billingApi, type Subscription, type ApiPlan } from "@/lib/api";

type Tab = 'perfil' | 'organizacion' | 'equipo' | 'facturacion';

const ROLES: Record<string, string> = {
  org_admin: 'Administrador',
  sales_manager: 'Gerente de ventas',
  sales_executive: 'Ejecutivo de ventas',
  viewer: 'Solo lectura',
};

const ROLE_COLORS: Record<string, string> = {
  org_admin: 'bg-purple-100 text-purple-700 border-purple-200',
  sales_manager: 'bg-blue-100 text-blue-700 border-blue-200',
  sales_executive: 'bg-green-100 text-green-700 border-green-200',
  viewer: 'bg-slate-100 text-slate-600 border-slate-200',
};

const PLAN_BADGE: Record<string, string> = {
  basico:     "bg-slate-700 text-slate-200",
  pro:        "bg-orange-600 text-white",
  equipo:     "bg-orange-500 text-white",
  enterprise: "bg-purple-700 text-white",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trialing:   { label: "Prueba gratuita", color: "text-blue-400" },
  active:     { label: "Activa",          color: "text-green-400" },
  past_due:   { label: "Pago pendiente",  color: "text-yellow-400" },
  canceled:   { label: "Cancelada",       color: "text-red-400" },
  incomplete: { label: "Incompleta",      color: "text-slate-400" },
};


export default function SettingsPage() {
  const { user, organization, tokens, setUser, setOrganization } = useAuthStore();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>('perfil');
  const [paymentBanner, setPaymentBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
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

  const isAdmin = user?.role === 'org_admin';

  // ── Perfil state ──
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    email: user?.email ?? '',
  });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── Organización state ──
  const [orgForm, setOrgForm] = useState({
    name: organization?.name ?? '',
    website: '',
    industry: '',
  });
  const [orgMsg, setOrgMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── Equipo state ──
  const [inviteForm, setInviteForm] = useState({ email: '', first_name: '', last_name: '', role: 'sales_executive' });
  const [inviteMsg, setInviteMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  // ── Queries ──
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['members', organization?.id],
    queryFn: () => settingsApi.getMembers(tokens!.access, organization!.id),
    enabled: !!tokens && !!organization && tab === 'equipo',
  });

  const { data: subscription, isLoading: loadingSub } = useQuery({
    queryKey: ['subscription', organization?.id],
    queryFn: () => billingApi.getSubscription(tokens!.access, organization!.id),
    enabled: !!tokens && !!organization && tab === 'facturacion',
  });

  const checkoutMutation = useMutation({
    mutationFn: (plan: string) => billingApi.createCheckout(tokens!.access, organization!.id, plan),
    onSuccess: ({ checkout_url }) => { window.location.href = checkout_url; },
  });

  // ── Mutations ──
  const updateProfileMutation = useMutation({
    mutationFn: (data: typeof profileForm) =>
      settingsApi.updateProfile(tokens!.access, organization!.id, data),
    onSuccess: (updated) => {
      setUser({ ...user!, ...updated });
      setProfileMsg({ type: 'ok', text: 'Perfil actualizado correctamente.' });
      setTimeout(() => setProfileMsg(null), 4000);
    },
    onError: (e: Error) => setProfileMsg({ type: 'err', text: e.message }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      settingsApi.changePassword(tokens!.access, organization!.id, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      }),
    onSuccess: () => {
      setPasswordForm({ current_password: '', new_password: '', confirm: '' });
      setPasswordMsg({ type: 'ok', text: 'Contraseña actualizada correctamente.' });
      setTimeout(() => setPasswordMsg(null), 4000);
    },
    onError: (e: Error) => setPasswordMsg({ type: 'err', text: e.message }),
  });

  const updateOrgMutation = useMutation({
    mutationFn: (data: typeof orgForm) =>
      settingsApi.updateOrganization(tokens!.access, organization!.id, data),
    onSuccess: (updated) => {
      setOrganization({ ...organization!, ...updated });
      setOrgMsg({ type: 'ok', text: 'Organización actualizada correctamente.' });
      setTimeout(() => setOrgMsg(null), 4000);
    },
    onError: (e: Error) => setOrgMsg({ type: 'err', text: e.message }),
  });

  const inviteMutation = useMutation({
    mutationFn: () => settingsApi.inviteMember(tokens!.access, organization!.id, inviteForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', organization?.id] });
      setInviteForm({ email: '', first_name: '', last_name: '', role: 'sales_executive' });
      setInviteMsg({ type: 'ok', text: 'Miembro añadido correctamente.' });
      setTimeout(() => setInviteMsg(null), 4000);
    },
    onError: (e: Error) => setInviteMsg({ type: 'err', text: e.message }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ membershipId, role }: { membershipId: string; role: string }) =>
      settingsApi.updateMemberRole(tokens!.access, organization!.id, membershipId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members', organization?.id] }),
  });

  const removeMutation = useMutation({
    mutationFn: (membershipId: string) =>
      settingsApi.removeMember(tokens!.access, organization!.id, membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', organization?.id] });
      setConfirmRemove(null);
    },
    onError: (e: Error) => setInviteMsg({ type: 'err', text: e.message }),
  });

  // ── Helpers ──
  const handlePasswordSubmit = () => {
    if (passwordForm.new_password !== passwordForm.confirm) {
      setPasswordMsg({ type: 'err', text: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordMsg({ type: 'err', text: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    changePasswordMutation.mutate();
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'perfil', label: 'Perfil', icon: <User className="h-4 w-4" /> },
    { id: 'organizacion', label: 'Organización', icon: <Building2 className="h-4 w-4" />, adminOnly: true },
    { id: 'equipo', label: 'Equipo', icon: <Users className="h-4 w-4" />, adminOnly: true },
    { id: 'facturacion', label: 'Facturación', icon: <CreditCard className="h-4 w-4" /> },
  ];

  return (
    <>
      {/* Confirm remove modal */}
      {confirmRemove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmRemove(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-slate-100 mb-2">
              ¿Eliminar miembro?
            </h3>
            <p className="text-sm text-slate-400 mb-5">
              El miembro perderá el acceso a la organización. Esta acción se puede revertir añadiéndole de nuevo.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmRemove(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate(confirmRemove)}
              >
                {removeMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <DashboardHeader title="Configuración" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-8">

            {/* ── Nav vertical (desktop) ── */}
            <nav className="hidden md:flex flex-col gap-0.5 w-48 flex-shrink-0 pt-0.5">
              {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-left ${
                    tab === t.id
                      ? "bg-orange-600/10 text-orange-400"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  {tab === t.id && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-orange-500" />
                  )}
                  <span className={`flex-shrink-0 transition-colors ${tab === t.id ? "text-orange-400" : "text-slate-500 group-hover:text-slate-300"}`}>
                    {t.icon}
                  </span>
                  {t.label}
                </button>
              ))}
            </nav>

            {/* ── Nav horizontal pills (móvil) ── */}
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

            {/* ── Content ── */}
            <div className="flex-1 min-w-0">

          {/* ── PERFIL ── */}
          {tab === 'perfil' && (
            <div className="space-y-6">
              <Card className="bg-slate-950">
                <CardHeader><CardTitle className="text-base">Información personal</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {profileMsg && (
                    <div className={`rounded-lg border px-3 py-2 text-sm ${profileMsg.type === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                      {profileMsg.text}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Nombre</label>
                      <Input
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm((p) => ({ ...p, first_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Apellido</label>
                      <Input
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm((p) => ({ ...p, last_name: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                    <Input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-slate-300" />
                      <span className="text-xs text-slate-300">
                        Rol: <span className="font-medium">{ROLES[user?.role ?? ''] ?? user?.role}</span>
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={() => updateProfileMutation.mutate(profileForm)}
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-950">
                <CardHeader><CardTitle className="text-base">Cambiar contraseña</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {passwordMsg && (
                    <div className={`rounded-lg border px-3 py-2 text-sm ${passwordMsg.type === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                      {passwordMsg.text}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Contraseña actual</label>
                    <Input
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, current_password: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Nueva contraseña</label>
                    <Input
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, new_password: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Confirmar nueva contraseña</label>
                    <Input
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={handlePasswordSubmit}
                      disabled={changePasswordMutation.isPending || !passwordForm.current_password || !passwordForm.new_password}
                    >
                      {changePasswordMutation.isPending ? 'Actualizando...' : 'Actualizar contraseña'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {/* ── PERFIL ── */}

          {/* ── ORGANIZACIÓN ── */}
          {tab === 'organizacion' && isAdmin && (
            <div className="space-y-6">
              <Card className="bg-slate-950">
                <CardHeader><CardTitle className="text-base">Datos de la organización</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {orgMsg && (
                    <div className={`rounded-lg border px-3 py-2 text-sm ${orgMsg.type === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                      {orgMsg.text}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Nombre de la organización</label>
                    <Input
                      value={orgForm.name}
                      onChange={(e) => setOrgForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Sitio web</label>
                    <Input
                      placeholder="https://tuempresa.com"
                      value={orgForm.website}
                      onChange={(e) => setOrgForm((p) => ({ ...p, website: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Sector</label>
                    <Input
                      placeholder="Retail, Hospitality, Real Estate..."
                      value={orgForm.industry}
                      onChange={(e) => setOrgForm((p) => ({ ...p, industry: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>Slug: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{organization?.slug}</code></span>
                    <Button
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={() => updateOrgMutation.mutate(orgForm)}
                      disabled={updateOrgMutation.isPending}
                    >
                      {updateOrgMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {/* ── ORGANIZACIÓN ── */}

          {/* ── EQUIPO ── */}
          {tab === 'equipo' && isAdmin && (
            <div className="space-y-6">
              {/* Invite member */}
              <Card className="bg-slate-950">
                <CardHeader><CardTitle className="text-base">Añadir miembro</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {inviteMsg && (
                    <div className={`rounded-lg border px-3 py-2 text-sm ${inviteMsg.type === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                      {inviteMsg.text}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Nombre</label>
                      <Input
                        placeholder="Ana"
                        value={inviteForm.first_name}
                        onChange={(e) => setInviteForm((p) => ({ ...p, first_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Apellido</label>
                      <Input
                        placeholder="García"
                        value={inviteForm.last_name}
                        onChange={(e) => setInviteForm((p) => ({ ...p, last_name: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                    <Input
                      type="email"
                      placeholder="ana@empresa.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Rol</label>
                    <Select value={inviteForm.role} onValueChange={(v) => setInviteForm((p) => ({ ...p, role: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="bg-orange-500 hover:bg-orange-700 text-white"
                      onClick={() => inviteMutation.mutate()}
                      disabled={inviteMutation.isPending || !inviteForm.email}
                    >
                      {inviteMutation.isPending ? 'Añadiendo...' : 'Añadir miembro'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Members list */}
              <Card className="bg-slate-950">
                <CardHeader><CardTitle className="text-base">Miembros del equipo</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {loadingMembers ? (
                    <div className="flex h-24 items-center justify-center text-slate-300 text-sm">
                      Cargando miembros...
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(members as MembershipDetail[]).filter((m) => m.is_active).map((m) => (
                        <li key={m.id} className="flex items-center justify-between px-4 py-3 gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-300 truncate">
                              {m.user.full_name || `${m.user.first_name} ${m.user.last_name}`.trim() || m.user.email}
                            </p>
                            <p className="text-xs text-slate-300 truncate">{m.user.email}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Select
                              value={m.role}
                              onValueChange={(v) => updateRoleMutation.mutate({ membershipId: m.id, role: v })}
                              disabled={m.user.email === user?.email}
                            >
                              <SelectTrigger className="h-7 px-2 py-1 text-xs">
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
                              disabled={m.user.email === user?.email}
                              className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Eliminar miembro"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          {/* ── EQUIPO ── */}

          {/* ── FACTURACIÓN ── */}
          {tab === 'facturacion' && (
            <div className="space-y-6">
              {paymentBanner && (
                <div className={`rounded-lg border px-4 py-3 text-sm ${paymentBanner.type === 'ok' ? 'bg-green-950/40 border-green-700 text-green-300' : 'bg-red-950/40 border-red-700 text-red-300'}`}>
                  {paymentBanner.text}
                </div>
              )}
              {loadingSub ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                </div>
              ) : subscription ? (
                <>
                  {/* Current plan card */}
                  <Card className="border-slate-800 bg-slate-950">
                    <CardHeader className="border-b border-slate-800 pb-4">
                      <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-orange-400" />
                        Plan actual
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-4">
                      {(() => {
                        const currentPlan = apiPlans.find((p) => p.slug === subscription.plan);
                        return (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${PLAN_BADGE[subscription.plan] ?? "bg-slate-700 text-slate-200"}`}>
                                {currentPlan?.name ?? subscription.plan}
                              </span>
                              <span className={`text-xs font-medium ${STATUS_LABELS[subscription.status]?.color ?? "text-slate-400"}`}>
                                {STATUS_LABELS[subscription.status]?.label ?? subscription.status}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-slate-100">
                              {currentPlan ? `$${parseFloat(currentPlan.price_monthly).toFixed(0)}/mes` : ""}
                            </span>
                          </div>
                        );
                      })()}

                      {subscription.status === "trialing" && subscription.trial_ends_at && (
                        <div className="rounded-lg border border-blue-800/50 bg-blue-950/30 px-4 py-3 text-sm text-blue-300">
                          Tu prueba gratuita finaliza el{" "}
                          <span className="font-semibold">
                            {new Date(subscription.trial_ends_at).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" })}
                          </span>
                          . Activa un plan para continuar sin interrupciones.
                        </div>
                      )}

                      {subscription.current_period_end && subscription.status === "active" && (
                        <p className="text-xs text-slate-400">
                          Próxima renovación:{" "}
                          {new Date(subscription.current_period_end).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      )}

                      <ul className="space-y-1.5">
                        {(apiPlans.find((p) => p.slug === subscription.plan)?.features ?? [])
                          .filter((f) => f.included)
                          .map((f) => (
                            <li key={f.text} className="flex items-center gap-2 text-sm text-slate-400">
                              <CheckCircle2 className={`h-3.5 w-3.5 flex-shrink-0 ${f.highlight ? "text-orange-400" : "text-green-500"}`} />
                              {f.text}
                            </li>
                          ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Upgrade plans */}
                  {subscription.plan !== "enterprise" && apiPlans.length > 0 && (
                    <Card className="border-slate-800 bg-slate-950">
                      <CardHeader className="border-b border-slate-800 pb-4">
                        <CardTitle className="text-base text-slate-100">Cambiar plan</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-5 space-y-3">
                        {apiPlans
                          .filter((p) => p.slug !== subscription.plan && p.slug !== "enterprise")
                          .map((p) => (
                            <div key={p.slug} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-100">{p.name}</p>
                                <p className="text-xs text-slate-400">${parseFloat(p.price_monthly).toFixed(0)}/mes</p>
                              </div>
                              <Button
                                size="sm"
                                className="bg-orange-600 hover:bg-orange-500 text-white"
                                disabled={checkoutMutation.isPending}
                                onClick={() => checkoutMutation.mutate(p.slug)}
                              >
                                {checkoutMutation.isPending && checkoutMutation.variables === p.slug ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <>Activar <ExternalLink className="h-3 w-3 ml-1" /></>
                                )}
                              </Button>
                            </div>
                          ))}
                        <p className="text-xs text-slate-400 pt-1">
                          <Lock className="h-3 w-3 inline mr-1" />
                          Serás redirigido a Recurrente, nuestra pasarela de pagos segura en Guatemala.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {subscription.plan === "enterprise" && (
                    <div className="rounded-xl border border-purple-800/40 bg-purple-950/20 px-5 py-4">
                      <p className="text-sm font-medium text-purple-300">Plan Enterprise activo</p>
                      <p className="text-xs text-purple-400 mt-1">
                        Para cambios en tu plan contacta a tu gestor de cuenta o escribe a hola@optimizapro.com
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-500">
                  <BanknoteX className="mx-auto h-6 w-6 text-green-500" />
                  No se pudo cargar la información de facturación.
                </div>
              )}
            </div>
          )}
            </div>{/* /content */}
          </div>{/* /flex gap-8 */}
        </div>
      </div>
    </>
  );
}
