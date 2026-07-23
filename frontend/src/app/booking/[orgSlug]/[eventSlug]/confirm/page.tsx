"use client";

import { use, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, CalendarDays, ExternalLink, CalendarClock } from "lucide-react";

function fmtDateLong(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function buildGoogleCalendarUrl(params: {
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
}) {
  const fmt = (iso: string) =>
    new Date(iso)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(".000Z", "Z");

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", params.title);
  url.searchParams.set("dates", `${fmt(params.start)}/${fmt(params.end)}`);
  if (params.description) url.searchParams.set("details", params.description);
  if (params.location) url.searchParams.set("location", params.location);
  return url.toString();
}

function ConfirmContent({ orgSlug, eventSlug }: { orgSlug: string; eventSlug: string }) {
  const searchParams = useSearchParams();

  const eventTitle = searchParams.get("event") ?? "Reunión";
  const start = searchParams.get("start") ?? "";
  const end = searchParams.get("end") ?? "";
  const name = searchParams.get("name") ?? "";
  const requiresConfirmation = searchParams.get("requires_confirmation") === "true";

  const gcalUrl = start && end
    ? buildGoogleCalendarUrl({ title: eventTitle, start, end })
    : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Nav */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="mx-auto max-w-xl flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-orange-500" />
          <span className="text-sm font-semibold text-slate-700">OptimizaCRM Scheduling</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center space-y-5">

            {/* Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>

            {/* Heading */}
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {requiresConfirmation ? "Reserva enviada" : "¡Reserva confirmada!"}
              </h1>
              {name && (
                <p className="mt-1 text-sm text-slate-500">
                  Gracias, <strong className="text-slate-700">{name}</strong>
                </p>
              )}
            </div>

            {/* Status */}
            {requiresConfirmation ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 text-left">
                <strong>Pendiente de confirmación.</strong>{" "}
                Recibirás un email de confirmación una vez que el anfitrión acepte tu reserva.
              </div>
            ) : (
              <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 text-left">
                Tu reserva está confirmada. Recibirás un email con los detalles.
              </div>
            )}

            {/* Details */}
            {(eventTitle || start || end) && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Evento</p>
                    <p className="text-sm font-semibold text-slate-800">{eventTitle}</p>
                  </div>
                </div>
                {start && (
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Fecha y hora</p>
                      <p className="text-sm font-semibold text-slate-800">{fmtDateLong(start)}</p>
                      <p className="text-xs text-slate-500">
                        {fmtTime(start)}{end ? ` — ${fmtTime(end)}` : ""}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              {gcalUrl && (
                <a
                  href={gcalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-orange-300 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 transition-all hover:bg-orange-100"
                >
                  <CalendarDays className="h-4 w-4" />
                  Agregar a Google Calendar
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <Link
                href={`/booking/${orgSlug}/${eventSlug}`}
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
              >
                Hacer otra reserva
              </Link>
              <Link
                href={`/booking/${orgSlug}`}
                className="block text-sm text-slate-400 hover:text-slate-600 transition-colors pt-1"
              >
                ← Ver todos los tipos de evento
              </Link>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-slate-400">
            Powered by{" "}
            <Link href="/" className="font-semibold text-orange-600 hover:underline">
              OptimizaCRM
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = use(params);
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400 text-sm">Cargando…</div>
      </div>
    }>
      <ConfirmContent orgSlug={orgSlug} eventSlug={eventSlug} />
    </Suspense>
  );
}
