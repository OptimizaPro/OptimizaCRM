"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { crmApi, type Task, type TaskStatus, type TaskPriority } from "@/lib/api";
import {
  Plus, Search, X, LayoutGrid, List, CheckCircle2, Circle,
  Clock, AlertTriangle, Calendar, Pencil, Trash2,
  Loader2, RefreshCw, Filter, ChevronLeft, ChevronRight,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_COLS: { key: TaskStatus; label: string; color: string; border: string; dot: string; dropBg: string }[] = [
  { key: "pending",     label: "Pendiente",   color: "text-slate-400",  border: "border-slate-700",    dot: "bg-slate-500",  dropBg: "bg-slate-800/30"   },
  { key: "in_progress", label: "En progreso", color: "text-blue-400",   border: "border-blue-700/50",  dot: "bg-blue-400",   dropBg: "bg-blue-950/30"    },
  { key: "completed",   label: "Completada",  color: "text-green-400",  border: "border-green-700/50", dot: "bg-green-400",  dropBg: "bg-green-950/30"   },
  { key: "cancelled",   label: "Cancelada",   color: "text-slate-500",  border: "border-slate-800",    dot: "bg-slate-600",  dropBg: "bg-slate-900/60"   },
];

const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low:    { label: "Baja",    color: "bg-slate-800 text-slate-400"      },
  medium: { label: "Media",   color: "bg-blue-900/40 text-blue-400"     },
  high:   { label: "Alta",    color: "bg-orange-900/40 text-orange-400" },
  urgent: { label: "Urgente", color: "bg-red-900/40 text-red-400"       },
};

const inputCls  = "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20";
const selectCls = "rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 focus:border-orange-500 focus:outline-none";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isOverdue(task: Task) {
  return task.due_date && task.status !== "completed" && task.status !== "cancelled"
    && new Date(task.due_date) < new Date();
}

function formatDue(iso: string) {
  const d    = new Date(iso);
  const diff = Math.round((d.getTime() - Date.now()) / 86400000);
  if (diff === 0)  return "Hoy";
  if (diff === 1)  return "Mañana";
  if (diff === -1) return "Ayer";
  if (diff < 0)   return `Hace ${Math.abs(diff)}d`;
  if (diff <= 7)  return `En ${diff}d`;
  return d.toLocaleDateString("es-GT", { day: "2-digit", month: "short" });
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  const ini   = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return (
    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
      {ini}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const m = PRIORITY_META[priority];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.color}`}>{m.label}</span>;
}

// ─── Pagination controls ──────────────────────────────────────────────────────

function Pagination({ page, totalPages, total, onPage }: {
  page: number; totalPages: number; total: number; onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to   = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3 bg-slate-900/40">
      <p className="text-xs text-slate-500">
        {from}–{to} de {total} tareas
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)} disabled={page === 1}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Anterior
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | "…")[]>((acc, p, i, arr) => {
            if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === "…"
              ? <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-slate-600">…</span>
              : <button
                  key={p}
                  onClick={() => onPage(p as number)}
                  className={`min-w-[28px] rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                    p === page
                      ? "bg-orange-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  {p}
                </button>
          )
        }

        <button
          onClick={() => onPage(page + 1)} disabled={page === totalPages}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Task Form Modal ──────────────────────────────────────────────────────────

function TaskFormModal({ initial, defaultStatus = "pending", onClose, onSave, saving, error }: {
  initial?: Task; defaultStatus?: TaskStatus;
  onClose: () => void; onSave: (d: Partial<Task>) => Promise<void>;
  saving: boolean; error: string;
}) {
  const [form, setForm] = useState({
    title:       initial?.title       ?? "",
    description: initial?.description ?? "",
    priority:    (initial?.priority   ?? "medium") as TaskPriority,
    status:      (initial?.status     ?? defaultStatus) as TaskStatus,
    due_date:    initial?.due_date    ? initial.due_date.slice(0, 16) : "",
  });
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }));

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
              <h2 className="font-semibold text-slate-100">{initial ? "Editar tarea" : "Nueva tarea"}</h2>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800"><X className="h-4 w-4" /></button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Título *</label>
              <input className={inputCls} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Nombre de la tarea" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Descripción</label>
              <textarea className={`${inputCls} resize-none`} rows={3} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Detalles opcionales…" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Prioridad</label>
                <select className={`${selectCls} w-full`} value={form.priority} onChange={e => set("priority", e.target.value as TaskPriority)}>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Estado</label>
                <select className={`${selectCls} w-full`} value={form.status} onChange={e => set("status", e.target.value as TaskStatus)}>
                  <option value="pending">Pendiente</option>
                  <option value="in_progress">En progreso</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Fecha de vencimiento</label>
              <input className={inputCls} type="datetime-local" value={form.due_date} onChange={e => set("due_date", e.target.value)} />
            </div>
            {error && <p className="rounded-lg bg-red-950/30 px-3 py-2 text-xs text-red-400">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button
              size="sm" disabled={saving || !form.title.trim()}
              onClick={() => onSave({ ...form, due_date: form.due_date || null })}
              className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {initial ? "Guardar cambios" : "Crear tarea"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({ task, onEdit, onDelete, onComplete, completing, deleting, isDragging, onDragStart, onDragEnd }: {
  task: Task; onEdit: () => void; onDelete: () => void;
  onComplete: () => void; completing: boolean; deleting: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd:   (e: React.DragEvent) => void;
}) {
  const overdue   = isOverdue(task);
  const done      = task.status === "completed";
  const cancelled = task.status === "cancelled";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group relative rounded-xl border bg-slate-950 p-4 shadow-sm transition-all cursor-grab active:cursor-grabbing
        hover:shadow-md
        ${isDragging ? "opacity-40 scale-[0.98] border-dashed border-orange-600/50" : ""}
        ${done      ? "border-slate-800 opacity-70"
        : overdue   ? "border-red-600/50 shadow-red-950/30 hover:border-red-500/60"
        :             "border-slate-800 hover:border-slate-600"}
      `}
    >
      {/* Overdue accent bar */}
      {overdue && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-gradient-to-b from-red-500 to-red-700" />
      )}

      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <GripVertical className="h-3.5 w-3.5 text-slate-700 group-hover:text-slate-500 transition-colors flex-shrink-0 -ml-1" />
          <button onClick={onComplete} disabled={completing || cancelled} className="flex-shrink-0 mt-0.5 disabled:opacity-40" title={done ? "Reabrir" : "Marcar completada"}>
            {completing
              ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              : done
                ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                : <Circle className="h-4 w-4 text-slate-600 hover:text-orange-400 transition-colors" />}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {overdue && (
            <span className="flex items-center gap-1 rounded-full bg-red-950/60 border border-red-700/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              Vencida
            </span>
          )}
          <PriorityBadge priority={task.priority} />
        </div>
      </div>

      <p className={`text-sm font-medium leading-snug mb-2 ${done || cancelled ? "line-through text-slate-500" : "text-slate-200"}`}>
        {task.title}
      </p>
      {task.description && <p className="text-xs text-slate-500 line-clamp-2 mb-3">{task.description}</p>}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {task.due_date && (
            <span className={`flex items-center gap-1 text-[11px] font-medium ${overdue ? "text-red-400" : "text-slate-500"}`}>
              {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
              {formatDue(task.due_date)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {task.assigned_to_detail && (
            <Initials name={task.assigned_to_detail.full_name || task.assigned_to_detail.email} />
          )}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-orange-400"><Pencil className="h-3.5 w-3.5" /></button>
            <button onClick={onDelete} disabled={deleting} className="rounded p-1 text-slate-500 hover:bg-red-950/30 hover:text-red-400 disabled:opacity-40">
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = "kanban" | "list";

export default function TasksPage() {
  const { tokens, organization } = useAuthStore();
  const token = tokens?.access ?? "";
  const orgId = String(organization?.id ?? "");
  const qc    = useQueryClient();

  const [view,           setView]           = useState<ViewMode>("kanban");
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [page,           setPage]           = useState(1);
  const [editTask,       setEditTask]       = useState<Task | null>(null);
  const [showCreate,     setShowCreate]     = useState(false);
  const [createStatus,   setCreateStatus]   = useState<TaskStatus>("pending");
  const [formError,      setFormError]      = useState("");
  const [formSaving,     setFormSaving]     = useState(false);
  const [completing,     setCompleting]     = useState<string | null>(null);
  const [deleting,       setDeleting]       = useState<string | null>(null);

  // ── Drag & Drop state ─────────────────────────────────────────────────────
  const [draggingId,  setDraggingId]  = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const dragCounter = useRef<Record<string, number>>({});  // per-column enter counter
  const movingTask  = useRef<string | null>(null);         // guard against double-fire

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  // ── Kanban query: all tasks (up to 200), priority filter only ────────────
  const kanbanQ = useQuery({
    queryKey: ["tasks", "kanban", priorityFilter],
    queryFn:  () => crmApi.getTasks(token, orgId, { priority: priorityFilter || undefined, page_size: 200 }),
    enabled:  !!token,
  });

  // ── List query: paginated + all filters ──────────────────────────────────
  const listQ = useQuery({
    queryKey: ["tasks", "list", page, statusFilter, priorityFilter, search],
    queryFn:  () => crmApi.getTasks(token, orgId, {
      page, page_size: PAGE_SIZE,
      status:   statusFilter   || undefined,
      priority: priorityFilter || undefined,
      search:   search         || undefined,
    }),
    enabled: !!token && view === "list",
  });

  const kanbanTasks  = kanbanQ.data?.results ?? [];
  const listTasks    = listQ.data?.results   ?? [];
  const listTotal    = listQ.data?.count     ?? 0;
  const totalPages   = Math.ceil(listTotal / PAGE_SIZE);
  const isLoading    = view === "kanban" ? kanbanQ.isLoading : listQ.isLoading;
  const isFetching   = view === "kanban" ? kanbanQ.isFetching : listQ.isFetching;

  const stats = useMemo(() => ({
    pending:     kanbanTasks.filter(t => t.status === "pending").length,
    in_progress: kanbanTasks.filter(t => t.status === "in_progress").length,
    overdue:     kanbanTasks.filter(t => isOverdue(t)).length,
    completed:   kanbanTasks.filter(t => t.status === "completed").length,
  }), [kanbanTasks]);

  const hasFilters = search || statusFilter || priorityFilter;

  const clearFilters = () => { setSearch(""); setStatusFilter(""); setPriorityFilter(""); setPage(1); };

  const applyStatus   = (v: string) => { setStatusFilter(v);   setPage(1); };
  const applyPriority = (v: string) => { setPriorityFilter(v); setPage(1); };
  const applySearch   = (v: string) => { setSearch(v);         setPage(1); };

  // ── Move task to new status (with optimistic update) ─────────────────────

  const handleMoveTask = async (taskId: string, newStatus: TaskStatus) => {
    if (movingTask.current === taskId) return;
    movingTask.current = taskId;

    const queryKey = ["tasks", "kanban", priorityFilter];
    const previous = qc.getQueryData(queryKey);

    // Optimistic update
    qc.setQueryData(queryKey, (old: typeof kanbanQ.data) => {
      if (!old) return old;
      return {
        ...old,
        results: old.results.map(t =>
          t.id === taskId ? { ...t, status: newStatus } : t
        ),
      };
    });

    try {
      await crmApi.updateTask(token, orgId, taskId, { status: newStatus });
      // Also invalidate the list query in case it's visible
      qc.invalidateQueries({ queryKey: ["tasks", "list"] });
    } catch (e) {
      // Revert on error
      qc.setQueryData(queryKey, previous);
      toast.error("No se pudo mover la tarea: " + (e as Error).message);
    } finally {
      movingTask.current = null;
    }
  };

  // ── Change status inline (list view) ─────────────────────────────────────

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (task.status === newStatus) return;
    const queryKey = ["tasks", "list", page, statusFilter, priorityFilter, search];
    const previous = qc.getQueryData(queryKey);

    qc.setQueryData(queryKey, (old: typeof listQ.data) => {
      if (!old) return old;
      return {
        ...old,
        results: old.results.map(t =>
          t.id === task.id ? { ...t, status: newStatus } : t
        ),
      };
    });

    try {
      await crmApi.updateTask(token, orgId, task.id, { status: newStatus });
      qc.invalidateQueries({ queryKey: ["tasks", "kanban"] });
    } catch (e) {
      qc.setQueryData(queryKey, previous);
      toast.error("No se pudo actualizar el estado: " + (e as Error).message);
    }
  };

  // ── Drag handlers ─────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("taskId", taskId);
    setDraggingId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverCol(null);
    dragCounter.current = {};
  };

  const handleDragEnter = (e: React.DragEvent, colKey: TaskStatus) => {
    e.preventDefault();
    dragCounter.current[colKey] = (dragCounter.current[colKey] ?? 0) + 1;
    setDragOverCol(colKey);
  };

  const handleDragLeave = (colKey: TaskStatus) => {
    dragCounter.current[colKey] = (dragCounter.current[colKey] ?? 1) - 1;
    if (dragCounter.current[colKey] <= 0) {
      dragCounter.current[colKey] = 0;
      setDragOverCol(prev => prev === colKey ? null : prev);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, colKey: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    setDraggingId(null);
    setDragOverCol(null);
    dragCounter.current = {};

    const task = kanbanTasks.find(t => t.id === taskId);
    if (!task || task.status === colKey) return;

    handleMoveTask(taskId, colKey);
  };

  // ── Mutations ────────────────────────────────────────────────────────────

  const handleCreate = async (data: Partial<Task>) => {
    setFormSaving(true); setFormError("");
    try {
      await crmApi.createTask(token, orgId, data);
      invalidate(); setShowCreate(false); toast.success("Tarea creada");
    } catch (e) { setFormError((e as Error).message); }
    finally { setFormSaving(false); }
  };

  const handleEdit = async (data: Partial<Task>) => {
    if (!editTask) return;
    setFormSaving(true); setFormError("");
    try {
      await crmApi.updateTask(token, orgId, editTask.id, data);
      invalidate(); setEditTask(null); toast.success("Tarea actualizada");
    } catch (e) { setFormError((e as Error).message); }
    finally { setFormSaving(false); }
  };

  const handleDelete = (task: Task) => {
    toast(`¿Eliminar "${task.title}"?`, {
      description: "Esta acción no se puede deshacer.",
      action: { label: "Sí, eliminar", onClick: async () => {
        setDeleting(task.id);
        try { await crmApi.deleteTask(token, orgId, task.id); invalidate(); toast.success("Tarea eliminada"); }
        catch (e) { toast.error((e as Error).message); }
        finally { setDeleting(null); }
      }},
      cancel: { label: "Cancelar", onClick: () => {} },
      duration: 8000,
    });
  };

  const handleComplete = async (task: Task) => {
    setCompleting(task.id);
    try {
      await (task.status === "completed"
        ? crmApi.reopenTask(token, orgId, task.id)
        : crmApi.completeTask(token, orgId, task.id));
      invalidate();
    } catch (e) { toast.error((e as Error).message); }
    finally { setCompleting(null); }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardHeader title="Tareas" />

      <div className="flex-1 overflow-y-auto bg-slate-900/30">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 py-6 sm:py-8">

          {/* Page header */}
          <div className="relative mb-8 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/10 px-4 sm:px-8 py-5 sm:py-7 shadow-2xl shadow-black/30">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-600/5 blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-600 shadow-xl shadow-orange-900/50 ring-1 ring-orange-500/40">
                  <CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-100 leading-tight">Tareas</h1>
                  <p className="mt-0.5 text-sm text-slate-400">{kanbanTasks.length} tareas en total</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* View toggle */}
                <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
                  <button onClick={() => setView("kanban")} className={`rounded-lg p-2 transition-all ${view === "kanban" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-slate-200"}`} title="Kanban">
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button onClick={() => setView("list")} className={`rounded-lg p-2 transition-all ${view === "list" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-slate-200"}`} title="Lista">
                    <List className="h-4 w-4" />
                  </button>
                </div>
                <Button size="sm" variant="outline" onClick={() => invalidate()} disabled={isFetching}
                  className="gap-1.5 border-slate-700 text-slate-400 hover:border-orange-600 hover:text-orange-400">
                  <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                </Button>
                <Button size="sm" onClick={() => { setCreateStatus("pending"); setFormError(""); setShowCreate(true); }}
                  className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/30">
                  <Plus className="h-4 w-4" /> Nueva tarea
                </Button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Pendientes",  value: stats.pending,     icon: Clock,         color: "text-slate-400", bg: "bg-slate-800/60",  border: "border-slate-700/50" },
              { label: "En progreso", value: stats.in_progress, icon: RefreshCw,     color: "text-blue-400",  bg: "bg-blue-950/40",   border: "border-blue-800/30"  },
              { label: "Vencidas",    value: stats.overdue,     icon: AlertTriangle, color: "text-red-400",   bg: "bg-red-950/40",    border: "border-red-800/30"   },
              { label: "Completadas", value: stats.completed,   icon: CheckCircle2,  color: "text-green-400", bg: "bg-green-950/40",  border: "border-green-800/30" },
            ].map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className={`rounded-2xl border ${border} bg-slate-950 p-5 flex flex-col gap-3 shadow-lg`}>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} ${color}`}><Icon className="h-4 w-4" /></div>
                <div>
                  <p className="text-2xl font-black text-slate-100 leading-none">{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {view === "list" && (
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={search} onChange={e => applySearch(e.target.value)}
                  placeholder="Buscar tareas…"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
                {search && <button onClick={() => applySearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"><X className="h-3.5 w-3.5" /></button>}
              </div>
            )}
            <div className={`flex items-center gap-2 ${view === "kanban" ? "w-full justify-end" : ""}`}>
              <Filter className="h-4 w-4 text-slate-500 flex-shrink-0" />
              {view === "list" && (
                <select value={statusFilter} onChange={e => applyStatus(e.target.value)} className={selectCls}>
                  <option value="">Todos los estados</option>
                  <option value="pending">Pendiente</option>
                  <option value="in_progress">En progreso</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              )}
              <select value={priorityFilter} onChange={e => applyPriority(e.target.value)} className={selectCls}>
                <option value="">Todas las prioridades</option>
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
              {hasFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2.5 text-xs text-slate-400 hover:border-red-700 hover:text-red-400 transition-colors">
                  <X className="h-3.5 w-3.5" /> Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Loading */}
          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
            </div>
          ) : view === "kanban" ? (

            /* ── KANBAN con Drag & Drop ── */
            <>
              {draggingId && (
                <p className="mb-3 text-center text-xs text-slate-600 select-none">
                  Suelta la tarea en la columna de destino
                </p>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {STATUS_COLS.map(col => {
                  const colTasks  = kanbanTasks.filter(t => t.status === col.key);
                  const isOver    = dragOverCol === col.key;
                  const isDragSrc = draggingId !== null && kanbanTasks.find(t => t.id === draggingId)?.status === col.key;

                  return (
                    <div
                      key={col.key}
                      onDragEnter={e => handleDragEnter(e, col.key)}
                      onDragLeave={() => handleDragLeave(col.key)}
                      onDragOver={handleDragOver}
                      onDrop={e => handleDrop(e, col.key)}
                      className={`rounded-2xl border transition-all duration-150
                        ${isOver && !isDragSrc
                          ? `${col.border} ${col.dropBg} ring-2 ring-orange-500/40 shadow-lg shadow-orange-900/10`
                          : `${col.border} bg-slate-950/60`
                        }
                      `}
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                          <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                          <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-400 font-medium">{colTasks.length}</span>
                        </div>
                        <button onClick={() => { setCreateStatus(col.key); setFormError(""); setShowCreate(true); }}
                          className="rounded-lg p-1 text-slate-600 hover:bg-slate-800 hover:text-orange-400 transition-colors">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Drop zone hint when empty column is targeted */}
                      <div className={`p-3 space-y-2.5 min-h-[120px] transition-all
                        ${isOver && !isDragSrc ? "min-h-[160px]" : ""}
                      `}>
                        {colTasks.length === 0 ? (
                          <div className={`flex items-center justify-center h-24 rounded-xl border-2 border-dashed transition-colors
                            ${isOver && !isDragSrc
                              ? "border-orange-500/40 bg-orange-950/10"
                              : "border-slate-800/0"
                            }
                          `}>
                            {isOver && !isDragSrc
                              ? <p className="text-xs text-orange-400 font-medium">Soltar aquí</p>
                              : <p className="text-xs text-slate-700">Sin tareas</p>
                            }
                          </div>
                        ) : (
                          <>
                            {colTasks.map(task => (
                              <KanbanCard
                                key={task.id}
                                task={task}
                                isDragging={draggingId === task.id}
                                onDragStart={e => handleDragStart(e, task.id)}
                                onDragEnd={handleDragEnd}
                                onEdit={() => { setFormError(""); setEditTask(task); }}
                                onDelete={() => handleDelete(task)}
                                onComplete={() => handleComplete(task)}
                                completing={completing === task.id}
                                deleting={deleting === task.id}
                              />
                            ))}
                            {/* Drop hint at bottom of non-empty column */}
                            {isOver && !isDragSrc && (
                              <div className="flex items-center justify-center h-10 rounded-xl border-2 border-dashed border-orange-500/40 bg-orange-950/10">
                                <p className="text-xs text-orange-400 font-medium">Soltar aquí</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>

          ) : (

            /* ── LIST con selector de estado inline ── */
            <div className="rounded-2xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden">
              {listTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-24">
                  <CheckCircle2 className="h-10 w-10 text-slate-700" />
                  <p className="text-slate-400">{hasFilters ? "Sin resultados para los filtros aplicados." : "No hay tareas."}</p>
                  {hasFilters
                    ? <button onClick={clearFilters} className="text-xs text-orange-400 hover:text-orange-300">Limpiar filtros</button>
                    : <Button size="sm" onClick={() => { setCreateStatus("pending"); setShowCreate(true); }} className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white"><Plus className="h-4 w-4" /> Nueva tarea</Button>
                  }
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="border-b border-slate-800 bg-slate-900/80">
                      <tr>
                        <th className="w-10 px-4 py-3.5" />
                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Título</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Prioridad</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Vencimiento</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Asignado</th>
                        <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {listTasks.map(task => {
                        const overdue = isOverdue(task);
                        const done    = task.status === "completed";
                        return (
                          <tr
                            key={task.id}
                            className={`transition-colors group relative
                              ${overdue
                                ? "bg-red-950/10 hover:bg-red-950/20 border-l-2 border-l-red-600"
                                : "hover:bg-slate-900/40"}
                            `}
                          >
                            <td className="px-4 py-3.5">
                              <button onClick={() => handleComplete(task)} disabled={completing === task.id || task.status === "cancelled"} className="disabled:opacity-40">
                                {completing === task.id
                                  ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                                  : done
                                    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    : <Circle className="h-4 w-4 text-slate-600 hover:text-orange-400 transition-colors" />}
                              </button>
                            </td>
                            <td className="px-4 py-3.5 max-w-[260px]">
                              <p className={`font-medium truncate ${done ? "line-through text-slate-500" : "text-slate-200"}`}>{task.title}</p>
                              {task.description && <p className="text-xs text-slate-500 truncate mt-0.5">{task.description}</p>}
                            </td>
                            <td className="px-4 py-3.5"><PriorityBadge priority={task.priority} /></td>
                            <td className="px-4 py-3.5">
                              <select
                                value={task.status}
                                onChange={e => handleStatusChange(task, e.target.value as TaskStatus)}
                                className={`rounded-lg border px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer transition-colors
                                  ${task.status === "pending"     ? "border-slate-700 bg-slate-900 text-slate-400"  : ""}
                                  ${task.status === "in_progress" ? "border-blue-700/50 bg-blue-950/30 text-blue-400"  : ""}
                                  ${task.status === "completed"   ? "border-green-700/50 bg-green-950/30 text-green-400" : ""}
                                  ${task.status === "cancelled"   ? "border-slate-800 bg-slate-900/60 text-slate-500" : ""}
                                `}
                              >
                                <option value="pending">Pendiente</option>
                                <option value="in_progress">En progreso</option>
                                <option value="completed">Completada</option>
                                <option value="cancelled">Cancelada</option>
                              </select>
                            </td>
                            <td className="px-4 py-3.5">
                              {task.due_date ? (
                                overdue ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-700/60 bg-red-950/50 px-2.5 py-1 text-[11px] font-bold text-red-400">
                                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                    Vencida · {formatDue(task.due_date)}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs text-slate-500">
                                    <Calendar className="h-3 w-3" />{formatDue(task.due_date)}
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-700">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              {task.assigned_to_detail
                                ? <div className="flex items-center gap-2">
                                    <Initials name={task.assigned_to_detail.full_name || task.assigned_to_detail.email} />
                                    <span className="text-xs text-slate-400 truncate max-w-[100px]">{task.assigned_to_detail.full_name || task.assigned_to_detail.email}</span>
                                  </div>
                                : <span className="text-slate-700">—</span>}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => { setFormError(""); setEditTask(task); }} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-orange-400 transition-colors">
                                  <Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">Editar</span>
                                </button>
                                <button onClick={() => handleDelete(task)} disabled={deleting === task.id} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-red-950/30 hover:text-red-400 disabled:opacity-40 transition-colors">
                                  {deleting === task.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                  <span className="hidden sm:inline">Eliminar</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>

                  <Pagination page={page} totalPages={totalPages} total={listTotal} onPage={setPage} />
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <TaskFormModal defaultStatus={createStatus} onClose={() => setShowCreate(false)}
          onSave={handleCreate} saving={formSaving} error={formError} />
      )}
      {editTask && (
        <TaskFormModal initial={editTask} onClose={() => setEditTask(null)}
          onSave={handleEdit} saving={formSaving} error={formError} />
      )}
    </div>
  );
}
