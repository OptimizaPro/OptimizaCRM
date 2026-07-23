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
                Sistema de reservas tipo Cal.com para tu organización
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
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="h-4 w-4 text-orange-400" />
              <h2 className="font-semibold text-slate-200">Tu enlace de reserva</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Comparte este enlace con tus clientes para que puedan reservar citas contigo directamente.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 font-mono truncate">
                {orgSlug ? bookingUrl : "Configura el slug de tu organización en Ajustes"}
              </div>
              <button
                onClick={handleCopy}
                disabled={!orgSlug}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-400 transition-all hover:border-orange-600 hover:text-orange-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
              {orgSlug && (
                <Link
                  href={`/booking/${orgSlug}`}
                  target="_blank"
                  className="flex h-10 items-center gap-1.5 rounded-xl border border-orange-700/50 bg-orange-950/30 px-3 text-xs font-semibold text-orange-400 transition-all hover:bg-orange-950/60"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Ver
                </Link>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
