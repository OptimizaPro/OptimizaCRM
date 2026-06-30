"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, ExternalLink, Search, FolderOpen } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { driveApi, type DriveFile, type DriveDocument } from "@/lib/api";

interface DriveDocumentsPanelProps {
  entityType: "lead" | "customer" | "opportunity";
  entityId: string;
}

const GoogleDriveIcon = () => (
  <svg viewBox="0 0 87.3 78" className="w-4 h-4 flex-shrink-0">
    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
    <path d="M43.65 25L29.9 1.4c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9.06 9.06 0 000 53h27.5z" fill="#00ac47" />
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.5c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.9z" fill="#ea4335" />
    <path d="M43.65 25L57.4 1.4C56.05.6 54.5.2 52.9.2H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
    <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
    <path d="M73.4 26.5l-13.1-22.8c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
  </svg>
);

function SkeletonLine({ width = "full" }: { width?: string }) {
  return (
    <div className={`h-3 rounded bg-slate-800 animate-pulse w-${width}`} />
  );
}

export function DriveDocumentsPanel({ entityType, entityId }: DriveDocumentsPanelProps) {
  const { tokens, organization } = useAuthStore();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input by 400ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Check drive connection status
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["drive-status", organization?.id],
    queryFn: () => driveApi.getStatus(tokens!.access, organization!.id),
    enabled: !!tokens && !!organization,
  });

  const isConnected = statusData?.connected ?? false;

  // Fetch linked documents
  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ["drive-documents", organization?.id, entityType, entityId],
    queryFn: () => driveApi.getDocuments(tokens!.access, organization!.id, entityType, entityId),
    enabled: !!tokens && !!organization && isConnected,
  });

  const linkedDocs: DriveDocument[] = docsData?.documents ?? [];

  // Search files in Drive
  const { data: searchData, isFetching: searchLoading } = useQuery({
    queryKey: ["drive-search", organization?.id, debouncedQuery],
    queryFn: () => driveApi.searchFiles(tokens!.access, organization!.id, debouncedQuery),
    enabled: !!tokens && !!organization && isConnected && debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const searchResults: DriveFile[] = searchData?.files ?? [];

  // Link a document
  const linkMutation = useMutation({
    mutationFn: (file: DriveFile) =>
      driveApi.linkDocument(tokens!.access, organization!.id, {
        entity_type:   entityType,
        entity_id:     entityId,
        drive_file_id: file.id,
        name:          file.name,
        mime_type:     file.mimeType,
        web_view_link: file.webViewLink,
        icon_link:     file.iconLink,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drive-documents", organization?.id, entityType, entityId],
      });
      setSearchQuery("");
      setDebouncedQuery("");
    },
  });

  // Unlink a document
  const unlinkMutation = useMutation({
    mutationFn: (docId: number) =>
      driveApi.deleteDocument(tokens!.access, organization!.id, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drive-documents", organization?.id, entityType, entityId],
      });
    },
  });

  const alreadyLinkedIds = new Set(linkedDocs.map((d) => d.drive_file_id));

  // ── Loading state ──────────────────────────────────────────────────────────
  if (statusLoading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <GoogleDriveIcon />
          <span className="text-sm font-semibold text-slate-200">Google Drive</span>
        </div>
        <SkeletonLine width="3/4" />
        <SkeletonLine width="1/2" />
      </div>
    );
  }

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div className="flex items-center gap-2 mb-3">
          <GoogleDriveIcon />
          <span className="text-sm font-semibold text-slate-200">Google Drive</span>
        </div>
        <div className="flex items-start gap-2 text-slate-400 text-xs">
          <FolderOpen className="h-4 w-4 flex-shrink-0 mt-0.5 text-slate-500" />
          <p>
            Conecta Google Drive desde{" "}
            <Link
              href="/dashboard/integrations"
              className="text-orange-400 hover:text-orange-300 underline underline-offset-2"
            >
              Integraciones
            </Link>{" "}
            para vincular documentos a este registro.
          </p>
        </div>
      </div>
    );
  }

  // ── Connected ──────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <GoogleDriveIcon />
        <span className="text-sm font-semibold text-slate-200">Google Drive</span>
        <span className="ml-auto text-xs text-green-400 font-medium">Conectado</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar archivos en Drive..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none"
        />
      </div>

      {/* Search results */}
      {debouncedQuery.length >= 2 && (
        <div className="space-y-1">
          {searchLoading && (
            <p className="text-xs text-slate-500 animate-pulse">Buscando...</p>
          )}
          {!searchLoading && searchResults.length === 0 && (
            <p className="text-xs text-slate-500">Sin resultados para &quot;{debouncedQuery}&quot;</p>
          )}
          {searchResults.map((file) => {
            const alreadyLinked = alreadyLinkedIds.has(file.id);
            return (
              <button
                key={file.id}
                disabled={alreadyLinked || linkMutation.isPending}
                onClick={() => !alreadyLinked && linkMutation.mutate(file)}
                className={[
                  "w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                  alreadyLinked
                    ? "opacity-50 cursor-not-allowed text-slate-500"
                    : "text-slate-300 hover:bg-slate-800 cursor-pointer",
                ].join(" ")}
              >
                {file.iconLink ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.iconLink} alt="" className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <FolderOpen className="h-4 w-4 flex-shrink-0 text-slate-500" />
                )}
                <span className="truncate flex-1">{file.name}</span>
                {alreadyLinked && (
                  <span className="text-green-500 text-xs flex-shrink-0">vinculado</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Linked documents */}
      <div>
        <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
          Documentos vinculados {linkedDocs.length > 0 && `(${linkedDocs.length})`}
        </p>

        {docsLoading && (
          <div className="space-y-2">
            <SkeletonLine width="full" />
            <SkeletonLine width="3/4" />
          </div>
        )}

        {!docsLoading && linkedDocs.length === 0 && (
          <p className="text-xs text-slate-600 italic">
            Sin documentos vinculados. Busca un archivo para añadirlo.
          </p>
        )}

        {!docsLoading && linkedDocs.length > 0 && (
          <ul className="space-y-1">
            {linkedDocs.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-900 group"
              >
                {doc.icon_link ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={doc.icon_link} alt="" className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <FolderOpen className="h-4 w-4 flex-shrink-0 text-slate-500" />
                )}
                <span className="flex-1 truncate text-xs text-slate-300">{doc.name}</span>
                {doc.web_view_link && (
                  <a
                    href={doc.web_view_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-slate-500 hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Abrir en Drive"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  onClick={() => unlinkMutation.mutate(doc.id)}
                  disabled={unlinkMutation.isPending}
                  className="flex-shrink-0 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
                  title="Desvincular"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
