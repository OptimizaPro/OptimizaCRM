"use client";

import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { useAuthStore } from "@/store/auth";
import { crmApi, type Task } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const priorityVariant = (p: string): "default" | "success" | "warning" | "destructive" => {
  const map: Record<string, "default" | "success" | "warning" | "destructive"> = {
    low: "success", medium: "default", high: "warning", urgent: "destructive",
  };
  return map[p] || "default";
};

const statusVariant = (s: string): "default" | "success" | "secondary" => {
  if (s === "completed") return "success";
  if (s === "in_progress") return "default";
  return "secondary";
};

const columns: ColumnDef<Task, unknown>[] = [
  {
    accessorKey: "title",
    header: "Título",
    cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>,
  },
  {
    accessorKey: "description",
    header: "Descripción",
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="text-slate-500 dark:text-slate-400 line-clamp-1">{(getValue() as string) || "—"}</span>
    ),
  },
  {
    accessorKey: "priority",
    header: "Prioridad",
    cell: ({ getValue }) => <Badge variant={priorityVariant(getValue() as string)}>{getValue() as string}</Badge>,
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ getValue }) => <Badge variant={statusVariant(getValue() as string)}>{getValue() as string}</Badge>,
  },
  {
    accessorKey: "due_date",
    header: "Vencimiento",
    cell: ({ getValue }) => {
      const v = getValue() as string | null;
      return <span className="text-slate-600 dark:text-slate-400">{v ? formatDate(v) : "—"}</span>;
    },
  },
];

export default function TasksPage() {
  const { tokens, organization } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => crmApi.getTasks(tokens!.access, organization!.id),
    enabled: !!tokens && !!organization,
  });

  return (
    <>
      <DashboardHeader title="Tareas" />
      <div className="flex-1 overflow-y-auto p-6">
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          emptyMessage="No hay tareas aún."
        />
      </div>
    </>
  );
}
