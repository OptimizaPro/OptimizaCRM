<!-- BEGIN:nextjs-agent-rules -->
# Frontend — OptimizaCRM

Next.js **15** con App Router, React **19**, TypeScript, Tailwind CSS v4, shadcn/ui.

> Lee `node_modules/next/dist/docs/` antes de escribir código si tienes dudas sobre una API.
> Las convenciones de Next.js 15 difieren de versiones anteriores — no asumas comportamientos de Next.js 13/14.

---

## Stack y versiones

| Tecnología       | Versión          |         Notas                             |
|------------------|------------------|-------------------------------------------|
| Next.js          | 15 (App Router)  | Sin Pages Router                          |
| React            | 19               | Concurrent features disponibles           |
| TypeScript       | 5                | Strict mode                               |
| Tailwind CSS     | 4                | Nueva sintaxis — sin `tailwind.config.js` |
| shadcn/ui        | Radix UI base    | Componentes en `src/components/ui/`       |
| TanStack Query   | 5                | Para fetching en Client Components        |
| Zustand          | 5                | Estado global (auth + sidebar)            |
| Lucide React     | 1.21             | Iconos                                    |

---

## Estructura de carpetas

```
src/
├── app/                    # Rutas (App Router)
│   ├── layout.tsx          # Layout raíz — metadata global SEO aquí
│   ├── page.tsx            # Home pública (SSR + CMS)
│   ├── robots.ts           # /robots.txt generado por Next.js
│   ├── sitemap.ts          # /sitemap.xml generado por Next.js
│   ├── dashboard/          # Área privada — requiere auth
│   │   └── layout.tsx      # Server Component — robots: noindex
│   ├── precios/            # Página de precios (Client — carga API)
│   ├── caracteristicas/    # Features
│   ├── nosotros/           # About
│   └── contacto/           # Contact
├── components/
│   ├── ui/                 # Componentes base (Button, Card, Input…)
│   ├── layout/             # PublicHeader, PublicFooter, DashboardSidebar
│   ├── dashboard/          # Charts, KPI cards, widgets del dashboard
│   └── auth-guard.tsx      # Protección de rutas — Client Component
├── lib/
│   └── api.ts              # ApiClient + todos los endpoints tipados
├── store/
│   └── auth.ts             # useAuthStore (Zustand persist) + useSidebarStore
└── providers/
    ├── query-provider.tsx  # TanStack Query
    └── theme-provider.tsx  # Tema oscuro
```

---

## Reglas de arquitectura

### Server vs Client Components

- **Por defecto: Server Component.** Solo añadir `"use client"` cuando sea estrictamente necesario (hooks, eventos, browser APIs).
- `"use client"` en un componente padre NO es necesario si solo renderiza Client Components hijos — esos ya llevan su propia directiva.
- Las páginas públicas que usan `useEffect` para CMS deben aislar ese `useEffect` en un componente hijo `*Client.tsx`, dejando el shell de la página como Server Component.
- Las páginas del dashboard pueden ser Client Components — no afecta SEO porque están excluidas de indexación.

### Metadata y SEO

- Exportar `metadata` o `generateMetadata` **solo desde Server Components**.
- Si una página necesita `"use client"`, la metadata va en un `layout.tsx` anidado dentro de esa carpeta.
- `metadataBase` ya está configurado en el layout raíz — no repetirlo en páginas hijas.
- Las páginas bajo `/dashboard/*` tienen `robots: { index: false }` — no añadir metadata de SEO ahí.

### Autenticación

- El estado de auth vive en `useAuthStore` (Zustand persist → localStorage key `optimiza-crm-auth`).
- `AuthGuard` (`src/components/auth-guard.tsx`) protege rutas del dashboard — ya es Client Component.
- El token se pasa explícitamente a cada llamada API: `api.get('/endpoint/', { token, orgId })`.
- El refresh automático de tokens está implementado en `ApiClient` — no implementar lógica de refresh manual.

### API

- Todos los endpoints están tipados en `src/lib/api.ts`. Usar las funciones exportadas, no hacer `fetch` directo.
- URL base: `process.env.NEXT_PUBLIC_API_URL` (default: `http://localhost:8000/api/v1`).
- Header de organización: `X-Organization-ID` — requerido en todos los endpoints del dashboard.
- Errores: `ApiClient` lanza `Error` con mensaje del backend. Capturar con try/catch en el componente.

### Estilos

- Tailwind CSS v4 — sin archivo `tailwind.config.js`. La configuración va en `globals.css`.
- Paleta principal: `slate-*` para fondos/texto, `orange-*` para acentos de marca, `green-*` para éxito.
- Tema oscuro activado globalmente con clase `dark` en `<html>`.
- Componentes UI base en `src/components/ui/` — usar siempre los existentes antes de crear nuevos.

---

## Rutas públicas

| Ruta               | Descripción                              |
|--------------------|------------------------------------------|
| `/`                | Home — hero, features, channels hub, CTA |
| `/caracteristicas` | Características del producto             |
| `/precios`         | Planes y precios (carga desde API)       |
| `/nosotros`        | Sobre OptimizaPro                        |
| `/contacto`        | Formulario de contacto                   |
| `/privacidad`      | Política de privacidad                   |
| `/terminos`        | Términos y condiciones                   |
| `/register`        | Registro (noindex)                       |
| `/login`           | Login (noindex)                          |
| `/forgot-password` | Recuperar contraseña (noindex)           |

**Redirects 301 configurados en `next.config.js`:**
`/pricing` → `/precios`, `/features` → `/caracteristicas`, `/about` → `/nosotros`, `/contact` → `/contacto`

## Rutas privadas (dashboard)

Todas bajo `/dashboard/*`. Requieren `AuthGuard`. Excluidas de robots y sitemap.

`/dashboard` · `/dashboard/leads` · `/dashboard/customers` · `/dashboard/opportunities` · `/dashboard/pipeline` · `/dashboard/tasks` · `/dashboard/inbox` · `/dashboard/automation` · `/dashboard/calendar` · `/dashboard/reports` · `/dashboard/ai` · `/dashboard/integrations` · `/dashboard/cms` · `/dashboard/settings` · `/dashboard/onboarding` · `/dashboard/whatsapp`

---

## Variables de entorno

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## Comandos

```bash
npm run dev      # Servidor de desarrollo (puerto 3000)
npm run build    # Build de producción
npm run lint     # ESLint
```
<!-- END:nextjs-agent-rules -->
