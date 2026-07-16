"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface InviteInfo {
  email: string;
  organization_name: string;
  role: string;
}

function AcceptInviteForm() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const setAuth     = useAuthStore((s) => s.setAuth);
  const token       = searchParams.get("token") ?? "";

  const [invite, setInvite]           = useState<InviteInfo | null>(null);
  const [tokenError, setTokenError]   = useState("");
  const [loadingToken, setLoadingToken] = useState(true);

  const [firstName, setFirstName]     = useState("");
  const [lastName, setLastName]       = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenError("No se encontró el token de invitación.");
      setLoadingToken(false);
      return;
    }
    fetch(`${API_URL}/auth/accept-invite/?token=${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Enlace inválido");
        setInvite(data);
      })
      .catch((err) => setTokenError(err.message))
      .finally(() => setLoadingToken(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/accept-invite/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password, first_name: firstName, last_name: lastName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al activar la cuenta");

      setSuccess(true);
      setAuth(
        { ...data.user, role: data.membership?.role },
        data.organization,
        data.tokens,
      );
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al activar la cuenta");
    } finally {
      setLoading(false);
    }
  };

  const ROLE_LABELS: Record<string, string> = {
    org_admin:       "Administrador",
    sales_manager:   "Gerente de Ventas",
    sales_executive: "Ejecutivo de Ventas",
    viewer:          "Solo lectura",
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">

          {loadingToken && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <p className="text-sm text-slate-400">Verificando invitación…</p>
            </div>
          )}

          {!loadingToken && tokenError && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <XCircle className="h-12 w-12 text-red-500" />
              <h1 className="text-xl font-bold text-slate-100">Enlace inválido</h1>
              <p className="text-sm text-slate-400">{tokenError}</p>
              <Button
                className="mt-4 bg-orange-600 hover:bg-orange-500"
                onClick={() => router.push("/login")}
              >
                Ir al inicio de sesión
              </Button>
            </div>
          )}

          {!loadingToken && !tokenError && success && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h1 className="text-xl font-bold text-slate-100">¡Cuenta activada!</h1>
              <p className="text-sm text-slate-400">Redirigiendo al dashboard…</p>
            </div>
          )}

          {!loadingToken && !tokenError && !success && invite && (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-100">Activa tu cuenta</h1>
                <p className="mt-2 text-sm text-slate-400">
                  Fuiste invitado a{" "}
                  <span className="font-medium text-orange-400">{invite.organization_name}</span>
                  {" "}como{" "}
                  <span className="font-medium text-slate-300">
                    {ROLE_LABELS[invite.role] ?? invite.role}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500">{invite.email}</p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Nombre</label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Juan"
                      className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Apellido</label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Pérez"
                      className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Contraseña</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                      className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activar cuenta"}
                </Button>
              </form>
            </>
          )}

        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}
