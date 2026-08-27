import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteForm } from "./delete-form";

export const metadata: Metadata = {
  title: "El meu compte",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ComptePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/compte");

  const jo = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      role: true,
      createdAt: true,
      subscriptionStatus: true,
      school: { select: { name: true } },
    },
  });
  if (!jo) redirect("/login");

  const deCentre = Boolean(jo.school);

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader
        title="El meu compte"
        role={jo.role}
        userName={jo.name}
        userEmail={jo.email}
      />

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Les teves dades</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted-foreground">Correu</dt>
              <dd className="font-medium">{jo.email}</dd>

              {jo.name && (
                <>
                  <dt className="text-muted-foreground">Nom</dt>
                  <dd className="font-medium">{jo.name}</dd>
                </>
              )}

              <dt className="text-muted-foreground">Al servei des de</dt>
              <dd className="font-medium">
                {jo.createdAt.toLocaleDateString("ca-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>

              {deCentre && (
                <>
                  <dt className="text-muted-foreground">Centre</dt>
                  <dd className="font-medium">{jo.school?.name}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        {jo.subscriptionStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subscripció</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Per canviar la targeta, veure les factures o donar-te de baixa del pagament sense
                esborrar el compte, ves a{" "}
                <Link href="/student" className="underline underline-offset-4">
                  el teu espai
                </Link>{" "}
                i obre la gestió de la subscripció.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Esborrar el compte</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            {deCentre ? (
              <>
                <p>
                  El teu compte pertany a <strong>{jo.school?.name}</strong>. Les baixes dels comptes
                  d&apos;un centre les fa la seva coordinació, que és qui respon d&apos;aquestes dades
                  davant de la normativa de protecció de dades.
                </p>
                <p className="text-muted-foreground">
                  Demana-ho a la coordinació del teu centre. Si no et responen, escriu-nos a{" "}
                  <a href="mailto:hola@dictats.cat" className="underline underline-offset-4">
                    hola@dictats.cat
                  </a>{" "}
                  i t&apos;ajudem a canalitzar-ho.
                </p>
              </>
            ) : (
              <>
                <p>
                  S&apos;esborra el teu compte i tot el que hi penja: les teves entregues, el teu
                  progrés i les teves preferències. <strong>No es pot desfer</strong> i no en guardem
                  cap còpia.
                </p>
                <p>
                  Si tens una subscripció activa, la cancel·lem abans d&apos;esborrar res. No es
                  retorna la part del mes ja pagada.
                </p>
                <DeleteForm />
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/privacitat" className="underline underline-offset-4">
            Com tractem les teves dades
          </Link>
        </p>
      </main>
    </div>
  );
}
