"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { useAuthStore } from "@/store/auth";
import { schedulingApi } from "@/lib/api";
import {
  CalendarClock, Link2, Copy, Check, ChevronRight,
  CalendarDays, BookOpen, Clock, Loader2, CalendarCheck,
  ExternalLink, AlertTriangle, Info,
} from "lucide-react";
import { toast } from "sonner";

const BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://optimizacrm.com";

export default function SchedulingPage() {
  const { tokens, organization } = useAuthStore();
  const token = tokens?.access ?? "";
  const orgId = String(organization?.id ?? "");
  const orgSlug = organization?.slug ?? "";

  const [copied, setCopied] = useState(false);

  const bookingUrl = `${BASE_URL}/booking/${orgSlug}`;

  const { data: eventTypes, isLoading: loadingET } = useQuery({
    queryKey: ["scheduling-event-types", orgId],
    queryFn: () => schedulingApi.listEventTypes(token, orgId),
    enabled: !!token,
  });

  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ["scheduling-bookings", orgId],
    queryFn: () => schedulingApi.listBookings(token, orgId),
    enabled: !!token,
  });

  const activeEventTypes = (eventTypes ?? []).filter((et) => et.is_active).length;
  const totalEventTypes = (eventTypes ?? []).length;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const bookingsList = bookings ?? [];
  const bookingsThisMonth = bookingsList.filter((b) => {
    const t = new Date(b.start_time);
    return t >= new Date(startOfMonth) && t <= new Date(endOfMonth);
  }).length;

  const pendingCount = bookingsList.filter((b) => b.status === "pending").length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      toast.success("Enlace copiado al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const subPages = [
    {
      href: "/dashboard/scheduling/event-types",
      icon: CalendarDays,
      title: "Tipos de evento",
      description: "Crea y gestiona los tipos de cita que ofreces",
      accent: "text-blue-400",
      bg: "bg-blue-950/40",
    },
    {
      href: "/dashboard/scheduling/availability",
      icon: Clock,
      title: "Disponibilidad",
      description: "Configura tus horarios disponibles por día de semana",
      accent: "text-green-400",
      bg: "bg-green-950/40",
    },
    {
      href: "/dashboard/scheduling/bookings",
      icon: BookOpen,
      title: "Reservas",
      description: "Revisa, confirma o cancela las reservas entrantes",
      accent: "text-orange-400",
      bg: "bg-orange-950/40",
    },
  ];

  return (
    <>
      <DashboardHeader title="Agendamiento" />

      <div className="flex-1 overflow-y-auto bg-slate-900/30 p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600/15 text-orange-500">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">Agendamiento</h1>
              <p className="text-sm text-slate-500">
                Sistema de reservas para tu organización
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                label: "Tipos de evento activos",
                value: loadingET ? null : activeEventTypes,
                sub: `${totalEventTypes} total`,
                color: "text-slate-200",
                icon: CalendarDays,
                iconColor: "text-blue-400",
                iconBg: "bg-blue-950/40",
              },
              {
                label: "Reservas este mes",
                value: loadingBookings ? null : bookingsThisMonth,
                sub: "confirmadas + pendientes",
                color: "text-green-400",
                icon: CalendarCheck,
                iconColor: "text-green-400",
                iconBg: "bg-green-950/40",
              },
              {
                label: "Pendientes de confirmación",
                value: loadingBookings ? null : pendingCount,
                sub: "requieren acción",
                color: pendingCount > 0 ? "text-orange-400" : "text-slate-400",
                icon: Clock,
                iconColor: pendingCount > 0 ? "text-orange-400" : "text-slate-500",
                iconBg: pendingCount > 0 ? "bg-orange-950/40" : "bg-slate-800/40",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                    {stat.value === null ? (
                      <Loader2 className="h-5 w-5 animate-spin text-slate-600 mt-1" />
                    ) : (
                      <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                    )}
                    <p className="text-xs text-slate-600 mt-1">{stat.sub}</p>
                  </div>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.iconBg}`}>
                    <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick links to sub-pages */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {subPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="group rounded-2xl border border-slate-800 bg-slate-950 p-5 transition-all hover:border-slate-700 hover:bg-slate-900/80"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${page.bg}`}>
                    <page.icon className={`h-4 w-4 ${page.accent}`} />
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-700 group-hover:text-slate-400 transition-colors" />
                </div>
                <h3 className="font-semibold text-slate-200 mb-1">{page.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{page.description}</p>
              </Link>
            ))}
          </div>

          {/* Booking link card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-950/40">
                  <Link2 className="h-4 w-4 text-orange-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-200 text-sm">Tu enlace de reserva</h2>
                  <p className="text-xs text-slate-500">Comparte esta URL con tus clientes</p>
                </div>
              </div>
              {orgSlug && (
                <Link
                  href={`/booking/${orgSlug}`}
                  target="_blank"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-orange-600/60 hover:text-orange-400"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir
                </Link>
              )}
            </div>

            {/* URL bar or warning */}
            <div className="px-5 pb-4">
              {orgSlug ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/80 px-3 py-2.5 min-w-0">
                      <span className="text-slate-600 text-xs select-none flex-shrink-0">URL</span>
                      <span className="text-sm text-slate-300 font-mono truncate">{bookingUrl}</span>
                    </div>
                    <button
                      onClick={handleCopy}
                      title="Copiar enlace"
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-400 transition-all hover:border-orange-600/60 hover:text-orange-400"
                    >
                      {copied
                        ? <Check className="h-4 w-4 text-green-400" />
                        : <Copy className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* How it works */}
                  <div className="mt-3 flex gap-2.5 rounded-xl bg-slate-900/50 border border-slate-800 p-3">
                    <Info className="h-3.5 w-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Cuando un cliente visita este enlace ve tus tipos de evento activos, elige fecha y hora disponible según tu disponibilidad configurada, y confirma la cita rellenando su nombre y email.
                      La reserva queda registrada en tu calendario automáticamente.
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-amber-700/30 bg-amber-950/20 p-4">
                  <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-300 mb-1">
                      Tu organización no tiene un identificador (slug) configurado
                    </p>
                    <p className="text-xs text-amber-400/70 mb-3">
                      El slug es el nombre corto que aparece en tu URL pública de reservas. Configúralo una sola vez en Ajustes.
                    </p>
                    <Link
                      href="/dashboard/settings"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600/20 border border-amber-600/40 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-600/30 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ir a Ajustes
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
