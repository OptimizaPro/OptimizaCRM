"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { useAuthStore } from "@/store/auth";
import { crmApi, aiApi, csvApi, type Customer } from "@/lib/api";
import { DriveDocumentsPanel } from "@/components/dashboard/drive-documents-panel";
import { formatCurrency } from "@/lib/utils";
import {
  Plus, Brain, Upload, Download, X, Loader2,
  Pencil, Trash2, Mail, Phone, Building2, MapPin, User,
  Clock, AlertTriangle, Info, Search, Filter,
} from "lucide-react";

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  active:   "Activo",
  inactive: "Inactivo",
  churned:  "Perdido",
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS);

const selectCls = "rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 focus:border-orange-500 focus:outline-none";

const EMPTY_FORM = { name: "", email: "", phone: "", company: "", status: "active", address: "", notes: "" };

const statusVariant = (s: string): "default" | "success" | "warning" | "destructive" | "secondary" =>
  ({ active: "success", inactive: "secondary", churned: "destructive" } as Record<string, "default" | "success" | "warning" | "destructive" | "secondary">)[s] ?? "secondary";

const churnColor = (r: number) =>
  r >= 0.7 ? "text-red-400" : r >= 0.4 ? "text-yellow-400" : "text-green-400";

// ─── SLA por estado de cliente ────────────────────────────────────────────────
const CUSTOMER_SLA_HOURS: Record<string, number | null> = {
  active:   null, // cliente sano, sin deadline urgente
  inactive: 48,   // reactivar en 48 h
  churned:  24,   // intentar recuperación en 24 h
};

const CUSTOMER_SLA_LABEL: Record<string, string> = {
  inactive: "Reactivar en",
  churned:  "Recuperar en",
};

interface SLAInfo {
  light: "green" | "yellow" | "red";
  label: string;
  tooltip: string;
  hoursLeft: number;
}

function getCustomerSLA(c: Customer): SLAInfo | null {
  const slaHours = CUSTOMER_SLA_HOURS[c.status];
  if (slaHours == null) return null;

  const ref      = new Date(c.updated_at || c.created_at);
  const deadline = new Date(ref.getTime() + slaHours * 60 * 60 * 1000);
  const now      = new Date();
  const diffH    = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  const fmt = (h: number) => {
    if (h <= 0) {
      const a = Math.abs(h);
      return a < 1 ? `${Math.ceil(a * 60)} min vencido` : a < 24 ? `${Math.floor(a)}h vencido` : `${Math.floor(a / 24)}d vencido`;
    }
    if (h < 1)  return `${Math.ceil(h * 60)} min`;
    if (h < 24) return `${Math.floor(h)}h ${Math.round((h % 1) * 60)}min`;
    const d = Math.floor(h / 24); const r = Math.floor(h % 24);
    return r > 0 ? `${d}d ${r}h` : `${d}d`;
  };

  const deadlineStr = deadline.toLocaleString("es-GT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const action = CUSTOMER_SLA_LABEL[c.status] ?? "Actuar en";

  return {
    light:    diffH < 0 ? "red" : diffH <= 3 ? "yellow" : "green",
    label:    fmt(diffH),
    tooltip:  `${action} ${slaHours}h · Vence: ${deadlineStr}`,
    hoursLeft: diffH,
  };
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso); const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
  if (diffH < 1)  return `hace ${Math.round(diffH * 60)} min`;
  if (diffH < 24) return `hace ${Math.floor(diffH)}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)  return `hace ${diffD}d`;
  return d.toLocaleDateString("es-GT", { day: "numeric", month: "short", year: diffD > 365 ? "numeric" : undefined });
}

function CustomerSLABadge({ customer }: { customer: Customer }) {
  const sla = getCustomerSLA(customer);
  if (!sla) return <span className="text-slate-600 text-xs">—</span>;

  const colors = {
    green:  { dot: "bg-green-400",  ring: "border-green-800",  text: "text-green-400",  bg: "bg-green-950/60"  },
    yellow: { dot: "bg-yellow-400", ring: "border-yellow-700", text: "text-yellow-400", bg: "bg-yellow-950/60" },
    red:    { dot: "bg-red-500",    ring: "border-red-800",    text: "text-red-400",    bg: "bg-red-950/60"    },
  }[sla.light];

  return (
    <div title={sla.tooltip}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium cursor-help ${colors.ring} ${colors.bg} ${colors.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${colors.dot} ${sla.light === "red" ? "animate-pulse" : ""}`} />
      {sla.label}
      {sla.light === "red"
        ? <AlertTriangle className="h-3 w-3" />
        : <Info className="h-3 w-3 opacity-70" />
      }
    </div>
  );
}

// ─── Panel lateral ────────────────────────────────────────────────────────────

function CustomerPanel({
  customer, onClose, onSave, onDelete, isSaving, isDeleting,
}: {
  customer: Customer;
  onClose: () => void;
  onSave: (data: Partial<Customer>) => void;
  onDelete: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name:    customer.name    ?? "",
    email:   customer.email   ?? "",
    phone:   customer.phone   ?? "",
    company: customer.company ?? "",
    status:  customer.status  ?? "active",
    address: customer.address ?? "",
    notes:   customer.notes   ?? "",
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const field = (key: keyof typeof form, placeholder = "") => (
    <Input value={form[key]} placeholder={placeholder}
      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
      disabled={!editing} className="h-8 text-sm disabled:opacity-70 disabled:cursor-default" />
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex h-full w-full sm:max-w-md flex-col bg-slate-950 border-l border-slate-800 shadow-2xl overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-100">{customer.name}</h2>
            <p className="text-xs text-slate-500">{customer.company || "Sin empresa"}</p>
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <Button size="sm" variant="outline" className="gap-1.5 border-slate-700 text-slate-300 hover:border-orange-500 hover:text-orange-400"
                onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" className="border-slate-700 text-slate-400"
                  onClick={() => setEditing(false)}>Cancelar</Button>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-500 text-white"
                  disabled={isSaving} onClick={() => onSave(form)}>
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar"}
                </Button>
              </>
            )}
            <button onClick={onClose} className="ml-1 text-slate-500 hover:text-slate-300">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Registro + SLA */}
        <div className="flex items-center gap-3 flex-wrap border-b border-slate-800 px-5 py-3">
          <span className="flex items-center gap-1.5 text-xs text-slate-400 cursor-help" title={new Date(customer.created_at).toLocaleString("es-GT")}>
            <Clock className="h-3.5 w-3.5" /> Registro: <span className="text-slate-200">{formatRelativeDate(customer.created_at)}</span>
            <Info className="h-3 w-3 opacity-60" />
          </span>
          <CustomerSLABadge customer={customer} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 border-b border-slate-800 px-5 py-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
            <p className="text-xs text-slate-500">Valor de vida</p>
            <p className="mt-0.5 font-bold text-slate-100">{formatCurrency(parseFloat(customer.lifetime_value))}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
            <p className="text-xs text-slate-500">Riesgo abandono</p>
            <p className={`mt-0.5 font-bold ${churnColor(customer.churn_risk)}`}>
              {(customer.churn_risk * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Campos */}
        <div className="flex-1 space-y-4 p-5">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <User className="h-3 w-3" /> Nombre
            </label>
            {field("name")}
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Mail className="h-3 w-3" /> Email
            </label>
            {field("email")}
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Phone className="h-3 w-3" /> Teléfono
            </label>
            {field("phone")}
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Building2 className="h-3 w-3" /> Empresa
            </label>
            {field("company")}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Estado</label>
            <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              disabled={!editing}
              className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200 disabled:opacity-70 disabled:cursor-default">
              {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <MapPin className="h-3 w-3" /> Dirección
            </label>
            {field("address")}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Notas</label>
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              disabled={!editing} rows={4} placeholder="Notas internas..."
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 disabled:opacity-70 disabled:cursor-default resize-none" />
          </div>

          {/* Google Drive documents */}
          <DriveDocumentsPanel entityType="customer" entityId={customer.id} />
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-5 py-4">
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 text-xs text-red-500 hover:text-red-400 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Eliminar cliente
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">¿Confirmar eliminación?</span>
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-400 h-7 text-xs"
                onClick={() => setConfirmDelete(false)}>No</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white h-7 text-xs"
                disabled={isDeleting} onClick={onDelete}>
                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sí, eliminar"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const { tokens, organization } = useAuthStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm]         = useState(false);
  const [showImport, setShowImport]     = useState(false);
  const [importFile, setImportFile]     = useState<File | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [selected, setSelected]         = useState<Customer | null>(null);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const hasFilters = !!(search || statusFilter);
  const clearFilters = () => { setSearch(""); setStatusFilter(""); };

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search, statusFilter],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (search)       qs.set("search", search);
      if (statusFilter) qs.set("status", statusFilter);
      const q = qs.toString();
      return crmApi.getCustomers(tokens!.access, organization!.id, q || undefined);
    },
    enabled: !!tokens && !!organization,
  });

  const createMutation = useMutation({
    mutationFn: (d: Partial<Customer>) => crmApi.createCustomer(tokens!.access, organization!.id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["customers"] }); setShowForm(false); setForm(EMPTY_FORM); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      crmApi.updateCustomer(tokens!.access, organization!.id, id, data),
    onSuccess: (updated) => { queryClient.invalidateQueries({ queryKey: ["customers"] }); setSelected(updated); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteCustomer(tokens!.access, organization!.id, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["customers"] }); setSelected(null); },
  });

  const churnMutation = useMutation({
    mutationFn: (id: string) => aiApi.predictChurn(tokens!.access, organization!.id, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => csvApi.importCustomers(tokens!.access, organization!.id, file),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setImportResult(`${res.imported} clientes importados correctamente.`);
      setImportFile(null);
    },
    onError: (err: Error) => setImportResult(`Error: ${err.message}`),
  });

  const columns: ColumnDef<Customer, unknown>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ getValue, row }) => (
        <button type="button" onClick={() => setSelected(row.original)}
          className="font-medium text-slate-200 hover:text-orange-400 transition-colors text-left">
          {getValue() as string}
        </button>
      ),
    },
    {
      accessorKey: "company",
      header: "Empresa",
      cell: ({ getValue }) => <span className="text-slate-400">{(getValue() as string) || "—"}</span>,
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ getValue }) => (
        <Badge variant={statusVariant(getValue() as string)}>
          {STATUS_LABELS[getValue() as string] ?? getValue() as string}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Registro",
      cell: ({ getValue }) => (
        <span className="flex items-center gap-1 text-xs text-slate-400 cursor-help" title={new Date(getValue() as string).toLocaleString("es-GT")}>
          <Clock className="h-3 w-3 shrink-0" />
          {formatRelativeDate(getValue() as string)}
          <Info className="h-3 w-3 opacity-60" />
        </span>
      ),
    },
    {
      id: "sla",
      header: "Atención",
      enableSorting: false,
      cell: ({ row }) => <CustomerSLABadge customer={row.original} />,
    },
    {
      accessorKey: "lifetime_value",
      header: "Valor de vida",
      cell: ({ getValue }) => <span className="font-medium text-slate-200">{formatCurrency(parseFloat(getValue() as string))}</span>,
    },
    {
      accessorKey: "churn_risk",
      header: "Riesgo abandono",
      cell: ({ getValue }) => {
        const r = getValue() as number;
        return <span className={`font-semibold ${churnColor(r)}`}>{(r * 100).toFixed(0)}%</span>;
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const isPredicting = churnMutation.isPending && churnMutation.variables === row.original.id;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" title="Predecir abandono con IA"
              onClick={() => churnMutation.mutate(row.original.id)} disabled={isPredicting}
              className="gap-1 text-xs text-slate-400 hover:text-white px-2">
              {isPredicting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(row.original)}
              className="px-2 text-slate-400 hover:text-orange-400">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(row.original)}
              className="px-2 text-slate-400 hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DashboardHeader title="Clientes" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9 w-52" placeholder="Buscar clientes..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Filter className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
              <option value="">Todos los estados</option>
              {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {hasFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2.5 text-xs text-slate-400 hover:border-red-700 hover:text-red-400 transition-colors">
                <X className="h-3.5 w-3.5" /> Limpiar
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" onClick={() => { setShowImport(!showImport); setShowForm(false); setImportResult(null); }}
              className="gap-2 border-slate-700 text-slate-300 hover:border-orange-600 hover:bg-orange-600 hover:text-white">
              <Upload className="h-4 w-4" /> Importar
            </Button>
            <Button variant="outline" onClick={() => csvApi.exportCustomers(tokens!.access, organization!.id)}
              className="gap-2 border-slate-700 text-slate-300 hover:border-orange-600 hover:bg-orange-600 hover:text-white">
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <Button onClick={() => { setShowForm(!showForm); setShowImport(false); }}
              className="gap-2 bg-orange-600 hover:bg-orange-500 text-white">
              <Plus className="h-4 w-4" /> Añadir Cliente
            </Button>
          </div>
        </div>

        {/* Import panel */}
        {showImport && (
          <Card className="mb-6 bg-slate-950">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Importar clientes desde CSV</p>
                  <p className="text-xs text-slate-500 mt-0.5">Columnas: name, email, phone, company, status</p>
                </div>
                <button onClick={() => { setShowImport(false); setImportResult(null); setImportFile(null); }} className="text-slate-500 hover:text-slate-300">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <input type="file" accept=".csv"
                  onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportResult(null); }}
                  className="flex-1 text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-300 hover:file:bg-slate-700" />
                <Button onClick={() => importFile && importMutation.mutate(importFile)}
                  disabled={!importFile || importMutation.isPending} className="bg-orange-600 hover:bg-orange-500 text-white">
                  {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Importar"}
                </Button>
              </div>
              {importResult && (
                <p className={`mt-3 text-xs ${importResult.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>{importResult}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create form */}
        {showForm && (
          <Card className="mb-6 bg-slate-950">
            <CardContent className="pt-6">
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input placeholder="Nombre *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input placeholder="Empresa" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200">
                  {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="bg-orange-600 hover:bg-orange-500 text-white" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Crear Cliente"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="border-slate-700 text-slate-300"
                    onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          emptyMessage="No hay clientes aún."
        />

        {/* SLA legend */}
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Semáforo de atención (SLA)</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-400" /><span className="text-green-400 font-medium">Verde</span> — dentro del plazo</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400" /><span className="text-yellow-400 font-medium">Amarillo</span> — menos de 3h</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /><span className="text-red-400 font-medium">Rojo</span> — plazo vencido</span>
            <span className="h-3 w-px bg-slate-700" />
            <span><span className="font-medium text-slate-200">Inactivo</span> 48h · <span className="font-medium text-slate-200">Perdido</span> 24h · <span className="font-medium text-slate-200">Activo</span> sin deadline</span>
          </div>
        </div>
      </div>

      {selected && (
        <CustomerPanel
          customer={selected}
          onClose={() => setSelected(null)}
          onSave={(d) => updateMutation.mutate({ id: selected.id, data: d })}
          onDelete={() => deleteMutation.mutate(selected.id)}
          isSaving={updateMutation.isPending}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </>
  );
}
