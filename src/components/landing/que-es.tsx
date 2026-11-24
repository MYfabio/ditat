/**
 * Les dues preguntes que fa tothom (i els cercadors amb IA) abans de res, amb
 * una resposta curta i completa cadascuna. Tot el que diuen ja ho diu la resta
 * de la portada: si algun dia divergeixen, cal canviar-ho aquí també.
 */
export function QueEs() {
  return (
    <section className="border-b py-16">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 sm:px-6 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Què és dictats.cat?</h2>
          <p className="mt-3 text-muted-foreground">
            dictats.cat és una aplicació web per practicar dictats en català, del nivell A1
            al C2. Escoltes el dictat amb veu catalana, l&apos;escrius al teclat o a mà i en
            fas una foto, i reps la correcció amb l&apos;explicació de cada falta. Els dictats
            següents es generen a partir dels errors que has comès.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Per a qui és?</h2>
          <p className="mt-3 text-muted-foreground">
            Per a qui vol millorar l&apos;ortografia catalana pel seu compte, també si es
            prepara un certificat C1 o C2, i per als docents de llengua catalana de Primària
            i ESO, aula d&apos;acollida i educació d&apos;adults. Els centres hi tenen panell
            de coordinació, grups classe i adaptacions per a l&apos;alumnat amb NEE, com la
            tipografia OpenDyslexic.
          </p>
        </div>
      </div>
    </section>
  );
}
