"use client";

import {
  type ColumnDef,
  type Row,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  useReactTable,
  type SortingState,
  type ExpandedState,
} from "@tanstack/react-table";
import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  pageSize?: number;
  emptyMessage?: string;
  /** Optional render function for expanded row content */
  renderSubRow?: (row: Row<TData>) => React.ReactNode;
  isLoading?: boolean;
}

export function DataTable<TData>({
  columns,
  data,
  pageSize = 10,
  emptyMessage = "No hay datos.",
  renderSubRow,
  isLoading,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const { pageIndex, pageSize: currentPageSize } = table.getState().pagination;
  const totalRows = data.length;
  const from = pageIndex * currentPageSize + 1;
  const to = Math.min((pageIndex + 1) * currentPageSize, totalRows);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500",
                        canSort && "cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-slate-300 dark:text-slate-600">
                            {sorted === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5 text-orange-500" />
                            ) : sorted === "desc" ? (
                              <ChevronDown className="h-3.5 w-3.5 text-orange-500" />
                            ) : (
                              <ChevronsUpDown className="h-3.5 w-3.5" />
                            )}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <>
                  <tr
                    key={row.id}
                    className="border-t border-slate-700 transition-colors hover:bg-slate-400 hover:[&_span]:!text-slate-900 hover:[&_button]:!text-slate-900 hover:[&_td]:!text-slate-900"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {renderSubRow && row.getIsExpanded() && (
                    <tr key={`${row.id}-sub`} className="border-t border-slate-100 dark:border-slate-800">
                      <td colSpan={columns.length} className="px-4 pb-3 pt-0">
                        {renderSubRow(row)}
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalRows > currentPageSize && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {from}–{to} de {totalRows} registros
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: table.getPageCount() }, (_, i) => (
              <Button
                key={i}
                variant={pageIndex === i ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-7 w-7 p-0 text-xs",
                  pageIndex === i && "bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
                )}
                onClick={() => table.setPageIndex(i)}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
