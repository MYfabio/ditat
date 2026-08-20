# dictats.cat

Plataforma SaaS multi-tenant per a escoles catalanes: generacio de dictats amb IA,
correccio per foto (OCR + IA) i suport per a NEE (TDAH, dislexia).

L'especificacio original d'aquest projecte es a [`docs/spec.md`](docs/spec.md).

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind CSS v4, Shadcn UI / Base UI)
- PostgreSQL amb Prisma ORM
- Auth.js (NextAuth v5) amb SSO de Google / Microsoft Entra ID i emparellament automatic per domini
- Anthropic Claude (generacio de dictats + avaluacio), Google Cloud Vision (OCR), OpenAI TTS (audio)

Totes les integracions d'IA funcionen amb **respostes simulades** si no hi ha les claus
d'API configurades, perque es pugui provar tota l'aplicacio sense cap servei extern.

## Posada en marxa

```bash
npm install
cp .env.example .env   # edita les variables que calgui
npx prisma generate
npm run dev
```

Obre [http://localhost:3000](http://localhost:3000).

### Qui aprèn pel seu compte

A més de l'alumnat d'un centre, s'hi pot donar d'alta qualsevol persona que es
prepari una certificació (A1-C2) pel seu compte: entra amb el seu correu, tria
el nivell i es genera ella mateixa els dictats, que surten del seu perfil igual
que els d'un alumne de classe. No pertany a cap centre ni grup, i per tant no
veu cap dada d'escola. Es pot tancar amb `AUTH_ALLOW_SELF_LEARNERS="false"`.

### Sense base de dades ni claus d'API

L'aplicacio arrenca i es pot navegar sencera sense `DATABASE_URL`: cada pantalla mostra
un avis quan no pot desar/llegir dades reals. La pagina `/login` activa automaticament un
formulari d'acces de prova (sense SSO) quan no hi ha `AUTH_GOOGLE_ID` ni
`AUTH_MICROSOFT_ENTRA_ID_ID` configurats, per triar un rol (Superadmin, Coordinacio,
Docent, Alumne/a) i provar cada pantalla.

### Amb base de dades real

1. Crea una base de dades PostgreSQL (local, [Neon](https://neon.tech) o [Supabase](https://supabase.com)).
2. Defineix `DATABASE_URL` a `.env`.
3. Executa les migracions:

```bash
npx prisma migrate dev --name init
```

### Variables d'entorn

Veure [`.env.example`](.env.example) per a la llista completa (base de dades, Auth.js,
Google/Microsoft SSO, Anthropic, Google Cloud Vision, OpenAI).

## Estructura

- `src/app/page.tsx` — Landing page publica (catala)
- `src/app/admin` — Panell de Superadministrador
- `src/app/school` — Panell de Coordinacio d'Escola
- `src/app/teacher` — Panell del Docent
- `src/app/student` — Espai de l'Alumnat (amb adaptacions NEE)
- `src/app/api/dictations/generate` — Generacio de dictats amb IA
- `src/app/api/submissions/upload` — OCR + avaluacio de fotos de dictats
- `src/app/api/submissions/[id]/photo` — Foto d'una entrega, per corregir-la a sobre
- `src/lib/annotations.ts` — Converteix els errors en marques (subratllats, tildes, intercalacions)
- `scripts/prune-submission-photos.mjs` — Esborra les fotos dels dictats ja corregits
- `src/lib/skill-taxonomy.ts` — Arbre versionat de competencies i subcompetencies
- `src/lib/error-classification.ts` — Tipus d'error i habilitat a que s'atribueix (versionat)
- `src/lib/mastery.ts` — Calcul de domini, confianca i dificultat recomanada (versionat)
- `prisma/schema.prisma` — Esquema multi-tenant (School, User, ClassGroup, Dictation, Submission, ImprovementReport)
