"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Superadministrador",
  SCHOOL_COORD: "Coordinació d'escola",
  TEACHER: "Docent",
  STUDENT: "Alumne/a",
};

const ERROR_MESSAGES: Record<string, string> = {
  CentreNoRegistrat:
    "Aquest correu no pertany a cap centre donat d'alta a DictatsIA. Comprova que fas servir el compte del teu centre educatiu, o demana a la direcció que registri el domini.",
  AccessDenied: "No tens permís per accedir amb aquest compte.",
  Configuration:
    "Hi ha un problema de configuració de l'accés. Avisa la persona que administra la plataforma.",
};

export function LoginError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  if (!error) return null;

  const message =
    ERROR_MESSAGES[error] ?? "No s'ha pogut iniciar la sessió. Torna-ho a provar.";

  return (
    <div
      role="alert"
      className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
    >
      {message}
    </div>
  );
}

export function SSOButtons({
  hasGoogle,
  hasMicrosoft,
}: {
  hasGoogle: boolean;
  hasMicrosoft: boolean;
}) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {hasGoogle && (
        <Button
          variant="outline"
          size="lg"
          disabled={loadingProvider !== null}
          onClick={() => {
            setLoadingProvider("google");
            signIn("google", { callbackUrl });
          }}
        >
          {loadingProvider === "google" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <GoogleIcon className="size-4" />
          )}
          Continuar amb Google
        </Button>
      )}
      {hasMicrosoft && (
        <Button
          variant="outline"
          size="lg"
          disabled={loadingProvider !== null}
          onClick={() => {
            setLoadingProvider("microsoft");
            signIn("microsoft-entra-id", { callbackUrl });
          }}
        >
          {loadingProvider === "microsoft" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <MicrosoftIcon className="size-4" />
          )}
          Continuar amb Microsoft
        </Button>
      )}
    </div>
  );
}

export function DevMockLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("TEACHER");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Introdueix un correu electrònic.");
      return;
    }
    setLoading(true);
    const result = await signIn("dev-mock", {
      email,
      name,
      role,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      toast.error("No s'ha pogut iniciar sessió. Torna-ho a provar.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="rounded-md border border-dashed border-amber-400/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        No hi ha cap proveïdor SSO configurat (Google/Microsoft). Aquest accés de
        prova crea una sessió simulada per provar totes les pantalles.
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Correu electrònic</Label>
        <Input
          id="email"
          type="email"
          placeholder="nom@escola.cat"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="name">Nom (opcional)</Label>
        <Input
          id="name"
          type="text"
          placeholder="Nom i cognoms"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="role">Rol</Label>
        <Select value={role} onValueChange={(value) => value && setRole(value)}>
          <SelectTrigger id="role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" size="lg" disabled={loading}>
        {loading && <Loader2 className="animate-spin" />}
        Entrar
      </Button>
    </form>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.05H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.95z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  );
}
