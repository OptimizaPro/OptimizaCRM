"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { teamsApi, settingsApi, billingApi, type Team, type TeamRole } from "@/lib/api";
import {
  Users, Plus, X, Pencil, Trash2, Loader2, Check,
  UserPlus, Crown, UserMinus, Shield,
} from "lucide-react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_MEMBER_LIMITS: Record<string, number> = {
  basico:     2,
  pro:        6,
  equipo:     12,
  enterprise: Infinity,
};

const TEAM_COLORS = [
  "#f97316", "#3b82f6", "#22c55e", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f59e0b", "#ef4444",
];

const inputCls = "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20";

// ─── Team Form Modal ──────────────────────────────────────────────────────────

type PendingMember = { userId: string; role: TeamRole; name: string };

function TeamFormModal({
  initial, token, orgId, memberLimit, onClose, onSave, saving,
}: {
  initial?:    Team;
  token:       string;
  orgId:       string;
  memberLimit: number;
  onClose: () => void;
  onSave:  (data: Pick<Team, "name" | "description" | "color">, members: PendingMember[]) => Promise<void>;
  saving:  boolean;
}) {
  const [name,    setName]    = useState(initial?.name        ?? "");
  const [desc,    setDesc]    = useState(initial?.description ?? "");
  const [color,   setColor]   = useState(initial?.color       ?? "#f97316");
  const [members, setMembers] = useState<PendingMember[]>([]);
  const [pickedUser, setPickedUser] = useState("");
  const [pickedRole, setPickedRole] = useState<TeamRole>("member");

  const { data: membersData } = useQuery({
    queryKey: ["org-members", orgId],
    queryFn:  () => settingsApi.getMembers(token, orgId),
    enabled:  !!token && !initial,   // only load for create
    staleTime: 60_000,
  });

  const alreadyAdded = new Set(members.map(m => m.userId));
  const available = (membersData ?? []).filter(m => !alreadyAdded.has(m.user.id));
  const atLimit   = members.length >= memberLimit;

  function addMember() {
    const found = available.find(m => m.user.id === pickedUser);
    if (!found) return;
    setMembers(prev => [...prev, {
      userId: found.user.id,
      role:   pickedRole,
      name:   found.user.full_name || found.user.email,
    }]);
    setPickedUser("");
    setPickedRole("member");
  }

  function removePending(userId: string) {
    setMembers(prev => prev.filter(m => m.userId !== userId));
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400">
                {initial ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </div>
              <h2 className="font-semibold text-slate-100">
                {initial ? "Editar equipo" : "Nuevo equipo"}
              </h2>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-6 space-y-5">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Nombre *</label>
              <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Equipo Ventas Norte" autoFocus />
            </div>
            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Descripción</label>
              <textarea className={`${inputCls} resize-none`} rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción opcional del equipo…" />
            </div>
            {/* Color */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Color</label>
              <div className="flex gap-2 flex-wrap">
                {TEAM_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className="relative h-7 w-7 rounded-full transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}>
                    {color === c && <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Members — only on create */}
            {!initial && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-300">Miembros</label>
                  <span className="text-xs text-slate-500">{members.length}/{memberLimit === Infinity ? "∞" : memberLimit}</span>
                </div>

                {/* Picker row */}
                {!atLimit && available.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    <select
                      className={`${inputCls} flex-1`}
                      value={pickedUser}
                      onChange={e => setPickedUser(e.target.value)}
                    >
                      <option value="">Seleccionar usuario…</option>
                      {available.map(m => (
                        <option key={m.user.id} value={m.user.id}>
                          {m.user.full_name || m.user.email}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded-xl border border-slate-700 bg-slate-900 px-2 py-2.5 text-sm text-slate-200 focus:border-orange-500 focus:outline-none"
                      value={pickedRole}
                      onChange={e => setPickedRole(e.target.value as TeamRole)}
                    >
                      <option value="member">Miembro</option>
                      <option value="leader">Líder</option>
                    </select>
                    <button
                      type="button"
                      disabled={!pickedUser}
                      onClick={addMember}
                      className="flex-shrink-0 rounded-xl border border-slate-700 bg-slate-900 px-3 text-orange-400 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {atLimit && (
                  <p className="mb-3 text-xs text-amber-500">Límite de {memberLimit} miembros alcanzado para tu plan.</p>
                )}

                {/* Added list */}
                {members.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-3 rounded-xl border border-dashed border-slate-800">
                    Sin miembros — puedes añadirlos ahora o más tarde desde la tarjeta del equipo.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {members.map(m => (
                      <div key={m.userId} className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ backgroundColor: color }}>
                            {m.name[0]?.toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-slate-200">{m.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {m.role === "leader" ? (
                            <span className="flex items-center gap-1 rounded-full bg-orange-950/50 border border-orange-800/40 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                              <Crown className="h-2.5 w-2.5" /> Líder
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                              <Shield className="h-2.5 w-2.5" /> Miembro
                            </span>
                          )}
                          <button type="button" onClick={() => removePending(m.userId)}
                            className="rounded-md p-0.5 text-slate-600 hover:text-red-400 transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button
              size="sm"
              disabled={saving || !name.trim()}
              onClick={() => onSave({ name: name.trim(), description: desc, color }, members)}
              className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {initial ? "Guardar cambios" : "Crear equipo"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Add Member Modal ─────────────────────────────────────────────────────────

function AddMemberModal({
  team, currentUserIds, token, orgId, onClose, onAdd,
}: {
  team: Team;
  currentUserIds: Set<string>;
  token:  string;
  orgId:  string;
  onClose: () => void;
  onAdd:   (userId: string, role: TeamRole) => Promise<void>;
}) {
  const [selectedUser, setSelectedUser] = useState("");
  const [role, setRole]     = useState<TeamRole>("member");
  const [adding, setAdding] = useState(false);

  const { data: membersData } = useQuery({
    queryKey: ["org-members", orgId],
    queryFn:  () => settingsApi.getMembers(token, orgId),
    enabled:  !!token,
    staleTime: 60_000,
  });

  const available = (membersData ?? []).filter(m => !currentUserIds.has(m.user.id));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400">
                <UserPlus className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-sm font-semibold text-slate-100">Agregar miembro a {team.name}</h2>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Usuario</label>
              <select
                className={inputCls}
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
              >
                <option value="">Seleccionar usuario…</option>
                {available.map(m => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.full_name || m.user.email}
                  </option>
                ))}
              </select>
              {available.length === 0 && (
                <p className="mt-1.5 text-xs text-slate-600">Todos los miembros de la organización ya están en este equipo.</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Rol en el equipo</label>
              <div className="flex gap-2">
                {(["member", "leader"] as TeamRole[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-colors
                      ${role === r
                        ? "border-orange-600 bg-orange-600/10 text-orange-400"
                        : "border-slate-700 bg-slate-900 text-slate-500 hover:border-slate-600"
                      }`}
                  >
                    {r === "leader" ? <Crown className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                    {r === "leader" ? "Líder" : "Miembro"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
            <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button
              size="sm"
              disabled={adding || !selectedUser}
              onClick={async () => {
                setAdding(true);
                try { await onAdd(selectedUser, role); onClose(); }
                finally { setAdding(false); }
              }}
              className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white"
            >
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              Agregar
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Team Card ────────────────────────────────────────────────────────────────

function TeamCard({
  team, memberLimit, onEdit, onDelete, onOpenAddMember, onRemoveMember,
}: {
  team: Team;
  memberLimit: number;
  onEdit:           () => void;
  onDelete:         () => void;
  onOpenAddMember:  () => void;
  onRemoveMember:   (userId: string, name: string) => void;
}) {
  const atLimit = team.memberships.length >= memberLimit;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 shadow-lg overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800"
        style={{ borderTopColor: team.color, borderTopWidth: 3 }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-black text-sm shadow-md"
            style={{ backgroundColor: team.color }}>
            {team.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-100">{team.name}</p>
            <p className="text-xs text-slate-500 truncate max-w-[220px]">
              {team.memberships.length}/{memberLimit} miembros
              {team.description ? ` · ${team.description}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-orange-400 transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="rounded-lg p-1.5 text-slate-500 hover:bg-red-950/30 hover:text-red-400 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="p-4 space-y-2">
        {team.memberships.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-3">Sin miembros aún.</p>
        ) : (
          team.memberships.map(m => {
            const u = m.user_detail;
            const initials = ((u.first_name?.[0] ?? "") + (u.last_name?.[0] ?? "")).toUpperCase() || u.email[0].toUpperCase();
            return (
              <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: team.color }}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{u.full_name || u.email}</p>
                    <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {m.role === "leader" ? (
                    <span className="flex items-center gap-1 rounded-full bg-orange-950/50 border border-orange-800/40 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                      <Crown className="h-2.5 w-2.5" /> Líder
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      <Shield className="h-2.5 w-2.5" /> Miembro
                    </span>
                  )}
                  <button
                    onClick={() => onRemoveMember(u.id, u.full_name || u.email)}
                    className="rounded-md p-1 text-slate-600 hover:bg-red-950/30 hover:text-red-400 transition-colors"
                    title="Eliminar del equipo"
                  >
                    <UserMinus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {atLimit ? (
          <div className="mt-1 w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-800 py-2 text-xs text-slate-600 cursor-not-allowed"
            title={`Límite de ${memberLimit} miembros alcanzado para tu plan actual`}>
            <UserPlus className="h-3.5 w-3.5" /> Límite de plan alcanzado ({memberLimit}/{memberLimit})
          </div>
        ) : (
          <button
            onClick={onOpenAddMember}
            className="mt-1 w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-700 py-2 text-xs text-slate-500 hover:border-orange-600 hover:text-orange-400 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" /> Agregar miembro
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const { tokens, organization } = useAuthStore();
  const token = tokens?.access ?? "";
  const orgId = String(organization?.id ?? "");
  const qc    = useQueryClient();

  const [showCreate,     setShowCreate]     = useState(false);
  const [editTeam,       setEditTeam]       = useState<Team | null>(null);
  const [addMemberTeam,  setAddMemberTeam]  = useState<Team | null>(null);
  const [saving,         setSaving]         = useState(false);

  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams", orgId],
    queryFn:  () => teamsApi.list(token, orgId),
    enabled:  !!token,
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription", orgId],
    queryFn:  () => billingApi.getSubscription(token, orgId),
    enabled:  !!token && !!orgId,
    staleTime: 5 * 60_000,
  });

  const memberLimit = PLAN_MEMBER_LIMITS[subscription?.plan ?? "basico"] ?? 2;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["teams"] });

  const handleCreate = async (data: Pick<Team, "name" | "description" | "color">, members: PendingMember[]) => {
    setSaving(true);
    try {
      const team = await teamsApi.create(token, orgId, data);
      // Add members sequentially after creation
      for (const m of members) {
        try { await teamsApi.addMember(token, orgId, team.id, m.userId, m.role); }
        catch { /* skip individual failures silently */ }
      }
      invalidate(); setShowCreate(false);
      toast.success(`Equipo creado${members.length ? ` con ${members.length} miembro${members.length !== 1 ? "s" : ""}` : ""}`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (data: Pick<Team, "name" | "description" | "color">, _members: PendingMember[]) => {
    if (!editTeam) return;
    setSaving(true);
    try {
      await teamsApi.update(token, orgId, editTeam.id, data);
      invalidate(); setEditTeam(null); toast.success("Equipo actualizado");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = (team: Team) => {
    toast(`¿Eliminar "${team.name}"?`, {
      description: "Se eliminarán también las asignaciones de sus miembros.",
      action: {
        label: "Sí, eliminar",
        onClick: async () => {
          try {
            await teamsApi.delete(token, orgId, team.id);
            invalidate(); toast.success("Equipo eliminado");
          } catch (e) { toast.error((e as Error).message); }
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
      duration: 8000,
    });
  };

  const handleAddMember = async (userId: string, role: TeamRole) => {
    if (!addMemberTeam) return;
    await teamsApi.addMember(token, orgId, addMemberTeam.id, userId, role);
    invalidate();
    setAddMemberTeam(null);
    toast.success("Miembro agregado");
  };

  const handleRemoveMember = (teamId: string, userId: string, name: string) => {
    toast(`¿Quitar a ${name} del equipo?`, {
      action: {
        label: "Sí, quitar",
        onClick: async () => {
          try {
            await teamsApi.removeMember(token, orgId, teamId, userId);
            invalidate(); toast.success("Miembro eliminado");
          } catch (e) { toast.error((e as Error).message); }
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
      duration: 6000,
    });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardHeader title="Equipos" />

      <div className="flex-1 overflow-y-auto bg-slate-900/30">
        <div className="mx-auto max-w-6xl px-8 py-8">

          {/* Header */}
          <div className="relative mb-8 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/10 px-8 py-7 shadow-2xl shadow-black/30">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-600/5 blur-3xl" />
            <div className="relative flex items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-600 shadow-xl shadow-orange-900/50 ring-1 ring-orange-500/40">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-100 leading-tight">Equipos</h1>
                  <p className="mt-0.5 text-sm text-slate-400">
                    Organiza a tus colaboradores en equipos y asígnales metas individuales desde Informes.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setShowCreate(true)}
                className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/30 flex-shrink-0"
              >
                <Plus className="h-4 w-4" /> Nuevo equipo
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-8 grid grid-cols-3 gap-4">
            {[
              { label: "Equipos",       value: teams?.length ?? 0,          color: "text-orange-400" },
              { label: "Miembros",      value: teams?.reduce((a, t) => a + t.member_count, 0) ?? 0, color: "text-blue-400" },
              { label: "Sin equipo",    value: "—",                          color: "text-slate-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className={`text-3xl font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Team grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
            </div>
          ) : !teams || teams.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-24">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800">
                <Users className="h-8 w-8 text-slate-700" />
              </div>
              <p className="text-slate-400">No hay equipos. Crea el primero.</p>
              <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white">
                <Plus className="h-4 w-4" /> Crear equipo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  memberLimit={memberLimit}
                  onEdit={() => setEditTeam(team)}
                  onDelete={() => handleDelete(team)}
                  onOpenAddMember={() => setAddMemberTeam(team)}
                  onRemoveMember={(userId, name) => handleRemoveMember(team.id, userId, name)}
                />
              ))}
            </div>
          )}

        </div>
      </div>

      {showCreate && (
        <TeamFormModal
          token={token} orgId={orgId} memberLimit={memberLimit}
          onClose={() => setShowCreate(false)} onSave={handleCreate} saving={saving}
        />
      )}
      {editTeam && (
        <TeamFormModal
          initial={editTeam}
          token={token} orgId={orgId} memberLimit={memberLimit}
          onClose={() => setEditTeam(null)}
          onSave={handleUpdate}
          saving={saving}
        />
      )}
      {addMemberTeam && (
        <AddMemberModal
          team={addMemberTeam}
          currentUserIds={new Set(addMemberTeam.memberships.map(m => m.user_detail.id))}
          token={token}
          orgId={orgId}
          onClose={() => setAddMemberTeam(null)}
          onAdd={handleAddMember}
        />
      )}
    </div>
  );
}
