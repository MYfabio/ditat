import { Suspense } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { SSOButtons, EmailLoginForm, DevMockLoginForm, LoginError } from "./login-form";
import { demoLoginEnabled } from "@/auth";

export default function LoginPage() {
  const hasGoogle = !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;
  const hasMicrosoft =
    !!process.env.AUTH_MICROSOFT_ENTRA_ID_ID && !!process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET;
  const hasSSO = hasGoogle || hasMicrosoft;
  const hasEmailLogin = !!process.env.AUTH_RESEND_KEY;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-bold">
        <GraduationCap className="size-6 text-primary" />
        dictats.cat
      </Link>
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Benvingut/da</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Accedeix amb el compte del teu centre educatiu.
        </p>
        <Suspense fallback={<div className="h-40" />}>
          <LoginError />
        </Suspense>
        <Suspense fallback={<div className="h-40" />}>
          {hasSSO || hasEmailLogin ? (
            <div className="space-y-4">
              {hasSSO && <SSOButtons hasGoogle={hasGoogle} hasMicrosoft={hasMicrosoft} />}
              {hasSSO && hasEmailLogin && (
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">o bé</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
              {hasEmailLogin && <EmailLoginForm />}
            </div>
          ) : demoLoginEnabled ? (
            <DevMockLoginForm />
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Aquest centre encara no té configurat l&apos;accés amb Google o Microsoft.
              Contacta amb la coordinació del teu centre per activar-lo.
            </div>
          )}
        </Suspense>
      </div>
      <p className="mt-6 max-w-sm text-center text-xs text-muted-foreground">
        En iniciar sessió acceptes la nostra{" "}
        <Link href="/privacitat" className="underline underline-offset-2">
          política de privadesa
        </Link>{" "}
        conforme al RGPD educatiu.
      </p>
    </main>
  );
}
