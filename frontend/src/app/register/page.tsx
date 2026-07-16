"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { authApi } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "", password: "", first_name: "", last_name: "", organization_name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authApi.register(form);
      router.push(`/verify-email/pending?email=${encodeURIComponent(data.email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-center text-slate-100">Crea tu cuenta</h1>
          <p className="mt-2 text-center text-sm text-slate-400">Empieza tu prueba gratuita de 14 días</p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Nombre</label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Apellido</label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Contraseña</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
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
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Nombre de la organización</label>
              <Input value={form.organization_name} onChange={(e) => setForm({ ...form, organization_name: e.target.value })} required />
            </div>
            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white" disabled={loading}>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="text-orange-400 hover:text-orange-300">Inicia sesión</Link>
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
