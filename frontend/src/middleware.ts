import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Map of route → landings_config key
const LANDING_KEYS: Record<string, string> = {
  "/voz-ia":                         "voz_ia",
  "/guatemala":                      "guatemala",
  "/servicios/whatsapp-business":    "servicios_whatsapp",
  "/servicios/implementacion":       "servicios_implementacion",
  "/servicios/voz-ia":               "servicios_implementacion_voz",
};

// Simple in-process cache (TTL: 60 s)
let _cache: { data: Record<string, boolean>; ts: number } | null = null;

async function getLandingsConfig(): Promise<Record<string, boolean>> {
  if (_cache && Date.now() - _cache.ts < 60_000) return _cache.data;

  try {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
    const res = await fetch(`${base}/content/landings_config/`, {
      // Keep fresh — short server-side cache
      next: { revalidate: 60 },
    });
    if (!res.ok) return _cache?.data ?? {};
    const { data } = await res.json();
    _cache = { data: data ?? {}, ts: Date.now() };
    return _cache.data;
  } catch {
    return _cache?.data ?? {};
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const key = LANDING_KEYS[path];

  if (key) {
    const config = await getLandingsConfig();
    if (config[key] === false) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/voz-ia",
    "/guatemala",
    "/servicios/whatsapp-business",
    "/servicios/implementacion",
    "/servicios/voz-ia",
  ],
};
