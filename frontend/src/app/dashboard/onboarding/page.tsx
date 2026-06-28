"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import {
  CheckCircle, Circle, Play, X, Trophy,
  Settings2, Users, Kanban, Zap, Brain,
  Plug, MessageCircle, ChevronRight, Star,
  BookOpen, Clock, ArrowUpRight, GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Checklist steps ──────────────────────────────────────────────────────────

interface Step {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  cta: string;
}

const STEPS: Step[] = [
  {
    id: "profile",
    label: "Configura tu perfil y organización",
    description: "Actualiza tu nombre, contraseña e información de cuenta. Gestiona los miembros de tu organización y revisa tu plan actual.",
    href: "/dashboard/settings",
    icon: Settings2,
    cta: "Ir a Ajustes",
  },
  {
    id: "lead",
    label: "Añade tu primer lead",
    description: "Registra un contacto o cliente potencial y empieza a gestionar tu embudo de ventas.",
    href: "/dashboard/leads",
    icon: Users,
    cta: "Ir a Leads",
  },
  {
    id: "pipeline",
    label: "Configura tu pipeline de ventas",
    description: "Define las etapas de tu proceso comercial y mueve oportunidades de forma visual.",
    href: "/dashboard/pipeline",
    icon: Kanban,
    cta: "Ir a Pipeline",
  },
  {
    id: "email",
    label: "Conecta tu cuenta de email",
    description: "Integra Gmail para enviar y recibir emails directamente desde el CRM.",
    href: "/dashboard/integrations",
    icon: Plug,
    cta: "Ir a Integraciones",
  },
  {
    id: "whatsapp",
    label: "Activa WhatsApp Business",
    description: "Gestiona conversaciones de WhatsApp junto al resto de tus canales de comunicación. La integración requiere una cuenta en Meta Business Suite — si prefieres que te ayudemos a configurarlo, contáctanos.",
    href: "/dashboard/integrations",
    icon: MessageCircle,
    cta: "Ir a Integraciones",
  },
  {
    id: "automation",
    label: "Crea tu primera automatización",
    description: "Automatiza tareas repetitivas: asignación de leads, recordatorios, follow-ups y más.",
    href: "/dashboard/automation",
    icon: Zap,
    cta: "Ir a Automatizaciones",
  },
  {
    id: "ai",
    label: "Prueba las herramientas de IA",
    description: "Genera emails, analiza conversaciones y obtén predicciones de cierre con IA nativa.",
    href: "/dashboard/ai",
    icon: Brain,
    cta: "Ir a IA",
  },
];

// ─── Video tutorials ──────────────────────────────────────────────────────────

interface Video {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  youtube_id: string; // empty = coming soon
  icon: React.ElementType;
}

const VIDEOS: Video[] = [
  {
    id: "intro",
    title: "Tour general de OptimizaCRM",
    description: "Una visión completa de todas las funcionalidades: desde leads hasta automatizaciones con IA.",
    duration: "5:32",
    category: "Introducción",
    youtube_id: "",
    icon: GraduationCap,
  },
  {
    id: "leads",
    title: "Gestión de leads y contactos",
    description: "Cómo registrar, calificar y hacer seguimiento de tus prospectos de forma eficiente.",
    duration: "8:15",
    category: "Ventas",
    youtube_id: "",
    icon: Users,
  },
  {
    id: "pipeline",
    title: "Pipeline Kanban de ventas",
    description: "Configura tus etapas, crea oportunidades y mueve deals con drag & drop.",
    duration: "6:48",
    category: "Ventas",
    youtube_id: "",
    icon: Kanban,
  },
  {
    id: "automation",
    title: "Automatizaciones sin código",
    description: "Crea reglas de automatización para tareas, emails y notificaciones sin escribir código.",
    duration: "10:20",
    category: "Productividad",
    youtube_id: "",
    icon: Zap,
  },
  {
    id: "integrations",
    title: "Conectar Gmail y WhatsApp",
    description: "Paso a paso para conectar tus canales de comunicación y centralizar todos los mensajes.",
    duration: "7:05",
    category: "Integraciones",
    youtube_id: "",
    icon: Plug,
  },
  {
    id: "ai",
    title: "IA: asistente de escritura y predicciones",
    description: "Usa el asistente IA para redactar emails, resumir conversaciones y predecir cierres.",
    duration: "9:40",
    category: "Inteligencia Artificial",
    youtube_id: "",
    icon: Brain,
  },
  {
    id: "inbox",
    title: "Bandeja de entrada unificada",
    description: "Gestiona emails y mensajes de todos tus canales desde un único lugar.",
    duration: "4:55",
    category: "Comunicaciones",
    youtube_id: "",
    icon: MessageCircle,
  },
  {
    id: "reports",
    title: "Informes y métricas de ventas",
    description: "Analiza el rendimiento de tu equipo, tasas de conversión y forecast con gráficos en tiempo real.",
    duration: "6:12",
    category: "Análisis",
    youtube_id: "",
    icon: Star,
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Introducción":          "bg-orange-950/40 text-orange-400 border-orange-800/50",
  "Ventas":                "bg-blue-950/40 text-blue-400 border-blue-800/50",
  "Productividad":         "bg-violet-950/40 text-violet-400 border-violet-800/50",
  "Integraciones":         "bg-teal-950/40 text-teal-400 border-teal-800/50",
  "Inteligencia Artificial": "bg-green-950/40 text-green-400 border-green-800/50",
  "Comunicaciones":        "bg-amber-950/40 text-amber-400 border-amber-800/50",
  "Análisis":              "bg-rose-950/40 text-rose-400 border-rose-800/50",
};

// ─── Video modal ──────────────────────────────────────────────────────────────

function VideoModal({ video, onClose }: { video: Video; onClose: () => void }) {
  const Icon = video.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-950/40 text-orange-400">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">{video.title}</h3>
              <div className="mt-0.5 flex items-center gap-2">
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", CATEGORY_COLORS[video.category])}>
                  {video.category}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3 w-3" /> {video.duration}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Video area */}
        <div className="p-5">
          {video.youtube_id ? (
            <div className="aspect-video w-full overflow-hidden rounded-xl">
              <iframe
                src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-700 bg-slate-900">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-slate-600">
                <Play className="h-7 w-7" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-300">Vídeo próximamente</p>
                <p className="mt-1 text-sm text-slate-500">
                  Este tutorial estará disponible en breve. Suscríbete para recibir una notificación.
                </p>
              </div>
            </div>
          )}
          <p className="mt-4 text-sm leading-relaxed text-slate-400">{video.description}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user } = useAuthStore();
  const storageKey = `onboarding_completed_${user?.id ?? "guest"}`;

  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setCompleted(new Set(JSON.parse(saved)));
    } catch {}
  }, [storageKey]);

  const toggleStep = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const progress = Math.round((completed.size / STEPS.length) * 100);
  const allDone = completed.size === STEPS.length;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardHeader title="Primeros pasos" />

      <div className="flex-1 overflow-y-auto bg-slate-900/30 p-6">
        <div className="mx-auto max-w-6xl space-y-6">

          {/* ── Welcome banner ── */}
          <div className={cn(
            "relative overflow-hidden rounded-2xl border p-6",
            allDone
              ? "border-green-800/50 bg-green-950/20"
              : "border-slate-800 bg-slate-950"
          )}>
            {/* Glow */}
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 translate-x-1/3 -translate-y-1/3 rounded-full bg-orange-600/8 blur-3xl" />

            <div className="relative flex items-start justify-between gap-6">
              <div className="flex-1">
                {allDone ? (
                  <>
                    <div className="mb-2 flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-400" />
                      <span className="text-sm font-semibold text-yellow-400">¡Configuración completada!</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-100">
                      Estás listo para vender más
                    </h2>
                    <p className="mt-2 text-slate-400">
                      Has completado todos los pasos de configuración. Explora los tutoriales en vídeo para sacar el máximo partido a OptimizaCRM.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mb-1 text-sm font-medium text-orange-400">
                      Bienvenido{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
                    </p>
                    <h2 className="text-2xl font-black text-slate-100">
                      Configura tu CRM en minutos
                    </h2>
                    <p className="mt-2 text-slate-400">
                      Sigue estos pasos para tener OptimizaCRM funcionando al 100% para tu equipo de ventas.
                    </p>
                  </>
                )}

                {/* Progress bar */}
                <div className="mt-5">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{completed.size} de {STEPS.length} pasos completados</span>
                    <span className={cn("font-bold", allDone ? "text-green-400" : "text-orange-400")}>{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        allDone ? "bg-green-500" : "bg-orange-500"
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {allDone && (
                <div className="hidden flex-shrink-0 sm:flex h-20 w-20 items-center justify-center rounded-2xl border border-yellow-800/40 bg-yellow-950/20">
                  <Trophy className="h-10 w-10 text-yellow-400" />
                </div>
              )}
            </div>
          </div>

          {/* ── Main grid ── */}
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">

            {/* Checklist */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950">
              <div className="border-b border-slate-800 px-5 py-4">
                <h3 className="font-semibold text-slate-100">Lista de configuración</h3>
                <p className="mt-0.5 text-xs text-slate-400">Marca cada paso al completarlo</p>
              </div>
              <ul className="divide-y divide-slate-800">
                {STEPS.map((step) => {
                  const Icon = step.icon;
                  const done = completed.has(step.id);
                  const expanded = expandedStep === step.id;

                  return (
                    <li key={step.id}>
                      <div className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-900">
                        {/* Check toggle */}
                        <button
                          onClick={() => toggleStep(step.id)}
                          className="flex-shrink-0 transition-transform hover:scale-110"
                          title={done ? "Marcar como pendiente" : "Marcar como completado"}
                        >
                          {done
                            ? <CheckCircle className="h-5 w-5 text-green-500" />
                            : <Circle className="h-5 w-5 text-slate-600" />
                          }
                        </button>

                        <div className={cn(
                          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors",
                          done ? "bg-green-950/40 text-green-500" : "bg-slate-800 text-slate-400"
                        )}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>

                        {/* Expand trigger */}
                        <button
                          onClick={() => setExpandedStep(expanded ? null : step.id)}
                          className="flex flex-1 items-center gap-2 text-left"
                        >
                          <span className={cn(
                            "flex-1 text-sm font-medium transition-colors",
                            done ? "text-slate-500 line-through" : "text-slate-200"
                          )}>
                            {step.label}
                          </span>
                          <ChevronRight className={cn(
                            "h-4 w-4 flex-shrink-0 text-slate-600 transition-transform duration-200",
                            expanded && "rotate-90"
                          )} />
                        </button>
                      </div>

                      {/* Expanded detail */}
                      {expanded && (
                        <div className="border-t border-slate-800/60 bg-slate-900/50 px-5 py-4">
                          <p className="mb-3 text-sm leading-relaxed text-slate-400">{step.description}</p>
                          <div className="flex items-center gap-2">
                            <Link href={step.href}>
                              <Button size="sm" className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white">
                                {step.cta} <ArrowUpRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            {!done && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleStep(step.id)}
                                className="text-slate-400 hover:text-green-400"
                              >
                                Marcar como hecho
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Video tutorials */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950">
                <div className="border-b border-slate-800 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-orange-400" />
                    <h3 className="font-semibold text-slate-100">Tutoriales en vídeo</h3>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">Aprende a usar cada módulo paso a paso</p>
                </div>

                <div className="divide-y divide-slate-800">
                  {VIDEOS.map((video, i) => {
                    const Icon = video.icon;
                    const isFirst = i === 0;
                    return (
                      <button
                        key={video.id}
                        onClick={() => setActiveVideo(video)}
                        className={cn(
                          "group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-900",
                          isFirst && "rounded-t-none"
                        )}
                      >
                        {/* Thumbnail */}
                        <div className={cn(
                          "relative flex h-14 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border",
                          video.youtube_id
                            ? "border-slate-700 bg-slate-800"
                            : "border-slate-700 border-dashed bg-slate-900"
                        )}>
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full transition-transform group-hover:scale-110",
                            video.youtube_id
                              ? "bg-orange-600 text-white"
                              : "bg-slate-800 text-slate-600"
                          )}>
                            <Play className="h-3.5 w-3.5 translate-x-px" />
                          </div>
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-200 group-hover:text-white line-clamp-1">
                              {video.title}
                            </p>
                            {!video.youtube_id && (
                              <span className="flex-shrink-0 rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-500">
                                Pronto
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", CATEGORY_COLORS[video.category])}>
                              {video.category}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Clock className="h-3 w-3" /> {video.duration}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Help card */}
              <div className="rounded-2xl border border-orange-800/30 bg-orange-950/90 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-950/70 text-orange-400">
                    <Star className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-100">¿Necesitas ayuda personalizada?</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Agenda una demo de 30 minutos y te guiamos en vivo por todo el CRM adaptado a tu negocio.
                    </p>
                    <Link href="/precios#onboarding" className="mt-3 inline-block">
                      <Button size="sm" className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white">
                        Ver Onboarding Asistido <ArrowUpRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Video modal */}
      {activeVideo && (
        <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
    </div>
  );
}
