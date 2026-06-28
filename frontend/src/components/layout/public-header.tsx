"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PublicWidgetLoader } from "@/components/layout/public-widget-loader";

const navLinks = [
  { href: "/caracteristicas", label: "Características" },
  { href: "/precios",         label: "Precios" },
  { href: "/nosotros",        label: "Nosotros" },
  { href: "/contacto",        label: "Contacto" },
];

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="OptimizaCRM" className="h-10 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-orange-400",
                pathname === href ? "text-orange-400" : "text-slate-200"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden sm:block">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
              Iniciar sesión
            </Button>
          </Link>
          <Link href="/register">
            <Button className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-white">
              Comenzar gratis <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden text-slate-300" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="border-t border-slate-800 bg-slate-950 px-4 py-4 md:hidden">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-sm font-medium text-slate-300 hover:text-orange-400"
            >
              {label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)} className="block py-2.5 text-sm font-medium text-slate-300 hover:text-orange-400">
            Iniciar sesión
          </Link>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-800 bg-black">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2">
            <div className="max-w-[420px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="OptimizaCRM" className="block w-full" />
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                CRM con inteligencia artificial para PYMEs latinoamericanas. Gestiona leads, automatiza seguimientos y cierra más negocios desde una sola plataforma diseñada para tu equipo.
              </p>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-300">Producto</h4>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              <li><Link href="/caracteristicas" className="hover:text-orange-400 transition-colors">Características</Link></li>
              <li><Link href="/precios"         className="hover:text-orange-400 transition-colors">Precios</Link></li>
              <li><Link href="/nosotros"        className="hover:text-orange-400 transition-colors">Nosotros</Link></li>
              <li><Link href="/contacto"        className="hover:text-orange-400 transition-colors">Contacto</Link></li>
              <li><Link href="/servicios/implementacion"    className="hover:text-orange-400 transition-colors">Implementación CRM</Link></li>
              <li><Link href="/servicios/whatsapp-business" className="hover:text-orange-400 transition-colors">Setup WhatsApp Business</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-300">Legal</h4>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              <li><Link href="/privacidad" className="hover:text-orange-400 transition-colors">Privacidad</Link></li>
              <li><Link href="/terminos"   className="hover:text-orange-400 transition-colors">Términos</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-slate-800 pt-8 text-center text-xs text-slate-400">
            Todos los derechos reservados © {new Date().getFullYear()} <span className="font-semibold text-green-700">Optimiza</span><span className="font-semibold text-orange-600">CRM</span>. <br />
            Somos parte del ecosistema <span className="text-green-700">Optimiza</span><span className="text-orange-600">Pro</span> | <a href="https://www.optimizapro.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-orange-600 hover:text-orange-400">Soluciones de Optimización Empresarial</a>
        </div>
      </div>
      {/* Widget loader — renders nothing visible, just injects widget.js if configured */}
      <PublicWidgetLoader />
    </footer>
  );
}
