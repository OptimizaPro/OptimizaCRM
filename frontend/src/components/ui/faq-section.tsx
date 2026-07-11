"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Minus } from "lucide-react";

export interface FaqItem {
  q: string;
  a: string;
}

interface FaqSectionProps {
  /** Section badge label, e.g. "FAQ" */
  badge?: string;
  /** Main heading */
  headline: string;
  /** Optional subheadline below the heading */
  subheadline?: string;
  /** Array of questions + answers */
  items: FaqItem[];
  /** Optional trailing CTA link */
  ctaText?: string;
  ctaHref?: string;
  /** Extra classes on the outer <section> */
  className?: string;
}

function FaqAccordionItem({
  item,
  index,
  open,
  onToggle,
}: {
  item: FaqItem;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const num = String(index + 1).padStart(2, "0");

  return (
    <div
      className={`group rounded-2xl border transition-all duration-200 overflow-hidden ${
        open
          ? "border-orange-500/40 bg-slate-900 shadow-lg shadow-orange-950/20"
          : "border-slate-800 bg-slate-950 hover:border-slate-700"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-4 px-5 py-5 text-left"
        aria-expanded={open}
      >
        {/* Number badge */}
        <span
          className={`mt-0.5 flex-shrink-0 text-[11px] font-bold tabular-nums leading-none tracking-widest transition-colors ${
            open ? "text-orange-400" : "text-slate-600 group-hover:text-slate-500"
          }`}
        >
          {num}
        </span>

        {/* Question */}
        <span
          className={`flex-1 text-sm font-semibold leading-snug transition-colors sm:text-base ${
            open ? "text-white" : "text-slate-300 group-hover:text-slate-100"
          }`}
        >
          {item.q}
        </span>

        {/* Toggle icon */}
        <span
          className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
            open
              ? "border-orange-500/50 bg-orange-950/40 text-orange-400"
              : "border-slate-700 bg-slate-800 text-slate-400 group-hover:border-slate-600"
          }`}
        >
          {open ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
        </span>
      </button>

      {/* Answer — smooth height animation via grid trick */}
      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div
            className={`border-t px-5 pb-5 pt-4 transition-colors duration-200 ${
              open ? "border-orange-500/20" : "border-slate-800"
            }`}
          >
            {/* Orange left accent */}
            <div className="flex gap-4">
              <div className="w-px flex-shrink-0 self-stretch bg-orange-500/30 ml-[18px]" />
              <p className="text-sm leading-relaxed text-slate-400">{item.a}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FaqSection({
  badge = "FAQ",
  headline,
  subheadline,
  items,
  ctaText,
  ctaHref = "/contacto",
  className = "",
}: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section className={`py-20 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">

          {/* ── Left column: heading ─────────────────────────────── */}
          <div className="lg:col-span-2 lg:pt-2">
            <p className="text-xs font-bold uppercase tracking-widest text-orange-400">
              {badge}
            </p>
            <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl lg:text-4xl leading-tight">
              {headline}
            </h2>
            {subheadline && (
              <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
                {subheadline}
              </p>
            )}
            {ctaText && (
              <p className="mt-8 text-sm text-slate-500">
                ¿Tienes otra pregunta?{" "}
                <Link
                  href={ctaHref}
                  className="font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                >
                  {ctaText} →
                </Link>
              </p>
            )}
          </div>

          {/* ── Right column: accordion ──────────────────────────── */}
          <div className="lg:col-span-3 space-y-2">
            {items.map((item, i) => (
              <FaqAccordionItem
                key={i}
                item={item}
                index={i}
                open={openIndex === i}
                onToggle={() => toggle(i)}
              />
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
