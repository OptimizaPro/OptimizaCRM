"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { publicBookingApi, type PublicEventType } from "@/lib/api";
import { Clock, ChevronRight, CalendarClock, MapPin, Loader2 } from "lucide-react";

const COLOR_DOT: Record<string, string> = {
  slate:  "bg-slate-400",
  blue:   "bg-blue-500",
  green:  "bg-green-500",
  orange: "bg-orange-500",
  red:    "bg-red-500",
};

const COLOR_BADGE: Record<string, string> = {
  slate:  "bg-slate-100 text-slate-700",
  blue:   "bg-blue-100 text-blue-700",
  green:  "bg-green-100 text-green-700",
  orange: "bg-orange-100 text-orange-700",
  red:    "bg-red-100 text-red-700",
};

interface OrgSchedule {
  org_name: string;
  org_slug: string;
  event_types: PublicEventType[];
}

export default function OrgBookingPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = use(params);
  const [data, setData] = useState<OrgSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    publicBookingApi
      .getOrgSchedule(orgSlug)
      .then((res: OrgSchedule) => {
        if (res.error) throw new Error(res.error);
        setData(res);
      })
      .catch((e: Error) => setError(e.message || "No se pudo cargar la agenda"))
      .finally(() => setLoading(false));
  }, [orgSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center max-w-sm">
          <CalendarClock className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <h2 className="font-semibold text-slate-700 mb-1">Agenda no encontrada</h2>
          <p className="text-sm text-slate-500">{error ?? "La organización no existe o no tiene tipos de evento activos."}</p>
        </div>
      </div>
    );
  }

  const eventTypes: PublicEventType[] = data.event_types ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-2xl px-4 py-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600 shadow-lg shadow-orange-200">
            <CalendarClock className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{data.org_name}</h1>
          <p className="mt-1 text-sm text-slate-500">Selecciona el tipo de reunión</p>
        </div>
      </div>

      {/* Event types */}
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-3">
        {eventTypes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <CalendarClock className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-slate-500 text-sm">No hay tipos de evento disponibles por el momento.</p>
          </div>
        ) : (
          eventTypes.map((et) => (
            <Link
              key={et.id}
              href={`/booking/${orgSlug}/${et.slug}`}
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-orange-300 hover:shadow-md"
            >
              {/* Color dot */}
              <div className={`mt-1 h-3 w-3 flex-shrink-0 rounded-full ${COLOR_DOT[et.color] ?? "bg-slate-400"}`} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-slate-900 group-hover:text-orange-700 transition-colors">
                  {et.title}
                </h2>
                {et.description && (
                  <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">{et.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_BADGE[et.color] ?? "bg-slate-100 text-slate-700"}`}>
                    <Clock className="h-3 w-3" />
                    {et.duration_minutes} min
                  </span>
                  {et.location && (
                    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      <MapPin className="h-3 w-3" />
                      {et.location}
                    </span>
                  )}
                  {et.requires_confirmation && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      Requiere confirmación
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-slate-300 group-hover:text-orange-500 transition-colors" />
            </Link>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="py-8 text-center">
        <p className="text-xs text-slate-400">
          Powered by{" "}
          <Link href="/" className="font-semibold text-orange-600 hover:underline">
            OptimizaCRM
          </Link>
        </p>
      </div>
    </div>
  );
}
