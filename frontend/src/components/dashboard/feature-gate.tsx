"use client";

import Link from "next/link";
import { Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";

// ─── Plan hierarchy ───────────────────────────────────────────────────────────

export const PLAN_ORDER = ["free", "basico", "pro", "equipo", "enterprise"] as const;
export type Plan = (typeof PLAN_ORDER)[number];

const PLAN_LABELS: Record<Plan, string> = {
  free:       "Free",
  basico:     "Básico",
  pro:        "Pro",
  equipo:     "Equipo",
  enterprise: "Enterprise",
};

export function meetsMinPlan(current: string | undefined, min: Plan): boolean {
  if (!current) return false;
  const ci = PLAN_ORDER.indexOf(current as Plan);
  const mi = PLAN_ORDER.indexOf(min);
  return ci >= 0 && mi >= 0 && ci >= mi;
}

// ─── FeatureGate ─────────────────────────────────────────────────────────────

interface FeatureGateProps {
  children: React.ReactNode;
  featureName: string;
  featureDescription: string;
  highlights?: string[];
  /** Minimum CRM plan required */
  minPlan?: Plan;
  /** Requires a separate Voz IA subscription (org.settings.voice_plan_slug) */
  requireVoz?: boolean;
  /** Override CTA href (defaults to /precios or /voz-ia) */
  ctaHref?: string;
  /** Override CTA label */
  ctaLabel?: string;
}

export function FeatureGate({
  children,
  featureName,
  featureDescription,
  highlights = [],
  minPlan,
  requireVoz,
  ctaHref,
  ctaLabel,
}: FeatureGateProps) {
  const { user, organization } = useAuthStore();

  // Superadmin bypasses all gates
  if (user?.is_staff) return <>{children}</>;

  const currentPlan  = (organization?.plan ?? "free") as Plan;
  const settings     = (organization?.settings ?? {}) as Record<string, unknown>;
  const hasVoz       = !!settings.voice_plan_slug;

  const planOk = minPlan ? meetsMinPlan(currentPlan, minPlan) : true;
  const vozOk  = requireVoz ? hasVoz : true;

  if (planOk && vozOk) return <>{children}</>;

  // ── Upsell screen ──────────────────────────────────────────────────────────
  const isVozGate        = requireVoz && !hasVoz;
  const resolvedCtaHref  = ctaHref  ?? (isVozGate ? "/voz-ia"               : "/precios");
  const resolvedCtaLabel = ctaLabel ?? (isVozGate ? "Ver planes de Voz IA"  : "Ver planes y precios");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-6">
        <Lock className="h-7 w-7 text-orange-400" />
      </div>

      {/* Plan badge */}
      {minPlan && !planOk && (
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-400">
          <Zap className="h-3 w-3" />
          Disponible desde el Plan {PLAN_LABELS[minPlan]}
        </span>
      )}
      {isVozGate && (
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-400">
          <Zap className="h-3 w-3" />
          Requiere suscripción de Voz IA
        </span>
      )}

      {/* Content */}
      <h2 className="text-2xl font-bold text-slate-100">{featureName}</h2>
      <p className="mt-3 max-w-md text-sm text-slate-400 leading-relaxed">{featureDescription}</p>

      {highlights.length > 0 && (
        <ul className="mt-6 space-y-2 text-left max-w-xs">
          {highlights.map((h) => (
            <li key={h} className="flex items-center gap-2 text-sm text-slate-300">
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
              {h}
            </li>
          ))}
        </ul>
      )}

      <Button asChild className="mt-8 bg-orange-600 hover:bg-orange-500 text-white px-8">
        <Link href={resolvedCtaHref}>{resolvedCtaLabel}</Link>
      </Button>

      {!isVozGate && (
        <p className="mt-3 text-xs text-slate-600">
          Tu plan actual:{" "}
          <span className="text-slate-400 font-medium">
            {PLAN_LABELS[currentPlan] ?? currentPlan}
          </span>
        </p>
      )}
    </div>
  );
}
