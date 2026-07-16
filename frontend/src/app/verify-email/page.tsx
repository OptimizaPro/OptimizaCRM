"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api";

function VerifyEmailContent() {
  const params = useSearchParams();
  const token  = params.get("token") ?? "";

  const [state, setState]     = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("No se encontró el token de verificación.");
      return;
    }

    authApi
      .verifyEmail(token)
      .then((data) => {
        setState("success");
        setMessage(data.message);
      })
      .catch((err: Error) => {
        setState("error");
        setMessage(err.message || "El enlace es inválido o ha expirado.");
      });
  }, [token]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl text-center">
      {state === "loading" && (
        <>
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-orange-400" />
          <h1 className="text-xl font-semibold text-slate-100">Verificando tu email…</h1>
        </>
      )}

      {state === "success" && (
        <>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-950/60 border border-green-800">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">¡Email verificado!</h1>
          <p className="mt-3 text-slate-400">{message}</p>
          <Button asChild className="mt-8 w-full bg-orange-600 hover:bg-orange-500 text-white">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </>
      )}

      {state === "error" && (
        <>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-950/60 border border-red-800">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Enlace inválido</h1>
          <p className="mt-3 text-slate-400">{message}</p>
          <Button asChild variant="outline" className="mt-8 w-full border-slate-700 text-slate-300 hover:bg-slate-800">
            <Link href="/register">Volver al registro</Link>
          </Button>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Suspense
          fallback={
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-orange-400" />
              <p className="text-slate-400">Cargando…</p>
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
