import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { DICTATS_GRATUITS_AL_MES } from "@/lib/subscription";

export const metadata = {
  title: "Política de privadesa | dictats.cat",
};

/**
 * Hi ha dues situacions ben diferents i abans el text nomes en descrivia una.
 *
 * Qui es dona d'alta pel seu compte tracta directament amb nosaltres: aqui el
 * responsable som nosaltres i no cap centre. Qui hi entra a través de la seva
 * escola es un cas diferent, on el responsable es el centre i nosaltres
 * treballem per encarrec seu. Dir nomes el segon deixava el primer sense
 * saber qui respon de les seves dades, que es justament el que la politica ha
 * d'aclarir.
 */
export default function PrivacitatPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-6 px-4 py-16 sm:px-6">
      <Link href="/" className="flex items-center gap-2 font-bold">
        <GraduationCap className="size-6 text-primary" />
        dictats.cat
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Política de privadesa</h1>
      <p className="text-muted-foreground">
        Aquí expliquem quines dades tractem, per a què i amb qui les compartim.
        Hi ha dues maneres d&apos;utilitzar dictats.cat i no funcionen igual, així
        que les separem.
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Si t&apos;has donat d&apos;alta pel teu compte
          </h2>
          <p>
            <strong className="text-foreground">Qui respon:</strong> dictats.cat. Tractem
            les teves dades directament i és a nosaltres a qui pots reclamar.
          </p>
          <p>
            <strong className="text-foreground">Què guardem:</strong> el nom i cognoms que
            escrius, el correu, l&apos;any de naixement, el nivell que et prepares, els
            dictats que et generem i el que escrius en fer-los. Si envies una foto del
            dictat escrit a mà, la foto mateixa. Demanem l&apos;any de naixement, i no la
            data sencera, perquè per comprovar que tens 14 anys o més no en cal més.
          </p>
          <p>
            <strong className="text-foreground">Per a què:</strong> generar-te dictats del
            teu nivell, corregir-los i saber quines regles et costen més, per proposar-te
            les següents. No fem res més amb això ni ho venem a ningú.
          </p>
          <p>
            <strong className="text-foreground">Quant de temps:</strong> mentre tinguis el
            compte obert. Les fotos dels dictats s&apos;esborren als 60 dies d&apos;haver-se
            corregit, perquè un cop tens la correcció ja no fan cap falta. Si tanques el
            compte, s&apos;esborra tot.
          </p>
          <p>
            <strong className="text-foreground">Els teus drets:</strong> pots demanar
            veure el que tenim, corregir-ho, endur-te&apos;l o esborrar-ho tot escrivint a{" "}
            <a className="underline underline-offset-2" href="mailto:hola@dictats.cat">
              hola@dictats.cat
            </a>
            . També pots reclamar davant l&apos;Autoritat Catalana de Protecció de Dades.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Si hi entres a través del teu centre educatiu
          </h2>
          <p>
            <strong className="text-foreground">Qui respon:</strong> el centre. És ell qui
            decideix què es tracta i per què; nosaltres ho fem per encàrrec seu i seguint
            les seves instruccions. Per exercir els teus drets, o els del teu fill o filla,
            cal adreçar-se a la coordinació del centre.
          </p>
          <p>
            <strong className="text-foreground">Què guardem:</strong> el nom, el correu del
            centre, el grup classe, les adaptacions que hagi declarat el professorat, els
            dictats i les entregues amb les seves correccions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Amb qui compartim les dades
          </h2>
          <p>
            Per fer funcionar el servei ens recolzem en aquests proveïdors. Cap d&apos;ells
            rep el teu nom ni el teu correu: només el text que cal processar.
          </p>
          <ul className="ml-4 list-disc space-y-1.5">
            <li>
              <strong className="text-foreground">Google</strong> — genera la veu que
              llegeix els dictats i llegeix el text de les fotos manuscrites.
            </li>
            <li>
              <strong className="text-foreground">Anthropic</strong> — escriu el text dels
              dictats i en corregeix les faltes.
            </li>
            <li>
              <strong className="text-foreground">Railway</strong> — allotja el servei i la
              base de dades.
            </li>
            <li>
              <strong className="text-foreground">Resend</strong> — envia els correus
              d&apos;accés. Els seus servidors són a Irlanda.
            </li>
            <li>
              <strong className="text-foreground">Stripe</strong> — cobra la subscripció,
              si te&apos;n fas. Les dades de la targeta no passen mai pels nostres
              servidors: les tracta Stripe directament.
            </li>
          </ul>
          <p>
            Cap d&apos;aquestes empreses fa servir el que escrius per entrenar els seus
            models.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Edat mínima</h2>
          <p>
            Per donar-se d&apos;alta pel seu compte cal tenir 14 anys o més, que és
            l&apos;edat a partir de la qual una persona pot consentir sola el tractament de
            les seves dades. Qui no hi arribi pot fer servir dictats.cat a través del seu
            centre educatiu, on qui hi respon és el centre.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">El pla gratuït</h2>
          <p>
            El pla gratuït permet {DICTATS_GRATUITS_AL_MES} dictats al mes. No hi ha
            publicitat ni cap contrapartida amagada: no venem dades ni les cedim a ningú
            més enllà dels proveïdors de la llista.
          </p>
        </section>
      </div>
    </main>
  );
}
