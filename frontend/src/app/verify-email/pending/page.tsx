"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { MailCheck, RefreshCw, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api";

function PendingContent() {
  const params = useSearchParams();
  const email  = params.get("email") ?? "";

  const [status, setStatus]     = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (!email || cooldown > 0) return;
    setStatus("sending");
    try {
      await authApi.resendVerification(email);
      setStatus("sent");
      setCooldown(60);
    } catch {
      setStatus("error");
    }
  }, [email, cooldown]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-950/60 border border-orange-800">
        <MailCheck className="h-8 w-8 text-orange-400" />
      </div>

      <h1 className="text-2xl font-bold text-slate-100">Revisa tu email</h1>
      <p className="mt-3 text-slate-400">
        Te hemos enviado un enlace de verificación a{" "}
        <span className="font-medium text-slate-200">{email || "tu correo"}</span>.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Haz clic en el enlace para activar tu cuenta. Si no lo ves, revisa la carpeta de spam.
      </p>

      <div className="mt-8 space-y-3">
        {status === "sent" && (
          <p className="text-sm text-green-400">Correo reenviado correctamente.</p>
        )}
        {status === "error" && (
          <p className="text-sm text-red-400">No pudimos reenviar el correo. Intenta de nuevo.</p>
        )}
        <Button
          onClick={handleResend}
          disabled={status === "sending" || cooldown > 0}
          variant="outline"
          className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {cooldown > 0
            ? `Reenviar en ${cooldown}s`
            : status === "sending"
            ? "Enviando..."
            : "Reenviar correo"}
        </Button>
      </div>

      <p className="mt-6 text-sm text-slate-600">
        ¿Email incorrecto?{" "}
        <Link href="/register" className="text-orange-400 hover:text-orange-300">
          Volver al registro
        </Link>
      </p>
    </div>
  );
}

export default function VerifyEmailPendingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Suspense
          fallback={
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-orange-400" />
            </div>
          }
        >
          <PendingContent />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
