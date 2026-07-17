"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, MailWarning } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [unverified, setUnverified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUnverified(false);
    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      const membership = data.memberships[0];
      const org = membership?.organization;
      if (org) {
        setAuth({ ...data.user, role: membership.role }, org, data.tokens);
        router.push("/dashboard");
      } else {
        setError("No organization found for this account.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg.includes("verificar tu email")) {
        setUnverified(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-center text-slate-100">Bienvenido de nuevo</h1>
          <p className="mt-2 text-center text-sm text-slate-400">Inicia sesión en tu cuenta de OptimizaCRM</p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-400">
                {error}
              </div>
            )}
            {unverified && (
              <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-300 flex items-start gap-2">
                <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Debes verificar tu email antes de iniciar sesión.{" "}
                  <Link
                    href={`/verify-email/pending?email=${encodeURIComponent(email)}`}
                    className="underline hover:text-amber-200"
                  >
                    Reenviar enlace de verificación
                  </Link>
                </span>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@empresa.com" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-slate-300">Contraseña</label>
                <Link href="/forgot-password" className="text-xs text-orange-400 hover:text-orange-300">¿Olvidaste tu contraseña?</Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            ¿Aún no tienes una cuenta?{" "}
            <Link href="/register" className="text-orange-400 hover:text-orange-300">Registrarse</Link>
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
