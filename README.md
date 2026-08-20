# DictatsIA

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
- `prisma/schema.prisma` — Esquema multi-tenant (School, User, ClassGroup, Dictation, Submission, ImprovementReport)
