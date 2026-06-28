"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el correo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-center text-slate-100">Recuperar contraseña</h1>
          <p className="mt-2 text-center text-sm text-slate-400">
            Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
          </p>

          {success ? (
            <div className="mt-8 rounded-lg border border-green-800 bg-green-950/50 p-4 text-sm text-green-400">
              <p className="font-medium">Correo enviado</p>
              <p className="mt-1 text-green-500">Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {error && (
                <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-500 text-white"
                disabled={loading}
              >
                {loading ? "Enviando..." : "Enviar enlace de recuperación"}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/login" className="text-orange-400 hover:text-orange-300">
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
