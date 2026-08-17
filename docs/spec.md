# SYSTEM DIRECTIVE FOR AUTONOMOUS EXECUTION
You are operating in FULL AUTONOMOUS MODE. Do NOT stop to ask for human confirmation or permission.
- Make reasonable technical decisions on your own.
- Write COMPLETE, production-ready code files without using placeholders, TODOs, or truncated snippets.
- Execute terminal commands, create all directories, setup Prisma, Next.js, and build full API routes and UI components autonomously.

# PROJECT SPECIFICATION: DictatsIA (Multi-Tenant SaaS)
A full-stack EdTech platform for Catalan schools featuring AI dictation generation, handwritten photo OCR evaluation, specialized NEE support (ADHD/Dyslexia), and a public marketing Landing Page.

## 1. TECH STACK
- Framework: Next.js 14+ (App Router, TypeScript, Tailwind CSS, Shadcn UI)
- Database: PostgreSQL with Prisma ORM
- Auth: NextAuth.js (Google & Microsoft SSO with Domain-based Auto-School Matching)
- Integrations: Anthropic Claude API (Text & Evaluation), Google Cloud Vision API (Handwritten OCR), OpenAI TTS (Catalan Speech)
- Fonts & Styling: OpenDyslexic integration, high-contrast themes, Lucide icons

## 2. REQUIRED APPLICATION MODULES & PAGES TO CREATE FULLY

### MODULE A: Public Marketing Landing Page (`/app/page.tsx`)
Create a high-converting, polished Landing Page in Catalan featuring:
- **Hero Section:** Headline "El primer generador de dictats en català amb IA i correcció per foto". CTA buttons: "Demana Demo" and "Provador Interactiu".
- **Social Proof / Compliance:** Badges for "100% Currículum de Catalunya", "RGPD Educatiu", "Google/Microsoft SSO".
- **Problem vs Solution:** Visual comparison cards between traditional manual marking vs AI instant diagnostics.
- **Feature Showcase Grid:** AI text generation (`l.l`, `b/v`, `dièresi`), OCR photo scanning, NEE inclusion features (OpenDyslexic, TDAH pacing), Teacher diagnostic dashboards.
- **Interactive Live Widget:** A mini UI sandbox allowing teachers to select a grade level (e.g. 4t Primària) and orthographic rule to generate a live sample dictation.
- **Pricing Section:** 3 License Tiers ("Pla Aula", "Pla Escola", "Pla Xarxa/Municipal").
- **FAQ Section & Footer.**

### MODULE B: Multi-Tenant Database Schema (`prisma/schema.prisma`)
Define models:
1. `School`: id, name, domain (e.g. "escola.cat"), customSubdomain, logo, planType, createdAt.
2. `User`: id, email, name, role (SUPERADMIN, SCHOOL_COORD, TEACHER, STUDENT), schoolId, classGroupId, needsProfile (Json).
3. `ClassGroup`: id, name, gradeLevel, schoolId, teacherId.
4. `Dictation`: id, title, targetRule, gradeLevel, rawText, audioUrl, teacherId, classGroupId, isAIGenerated.
5. `Submission`: id, dictationId, studentId, photoUrl, ocrText, correctedData (Json), score, status.
6. `ImprovementReport`: id, studentId, summaryText, weaknessMetrics (Json).

### MODULE C: Role-Based Dashboards
1. **Superadmin (`/app/admin/page.tsx`):**
   - School onboarding table, domain mapping inputs, system-wide AI token consumption metrics, GDPR audit logs.
2. **School Coordinator (`/app/school/page.tsx`):**
   - Teacher/Student CSV batch import interface, class group allocation, school NEE global toggle presets.
3. **Teacher (`/app/teacher/page.tsx`):**
   - AI Dictation Generator (Rule selector, Grade selector, NEE adaptation toggles).
   - Classroom Analytics Dashboard (Top common orthographic errors, progress charts).
   - Submission Reviewer: Side-by-side view comparing original dictation vs handwritten OCR extraction and AI proposed correction.
4. **Student (`/app/student/page.tsx`):**
   - Accessible UI with OpenDyslexic font toggle and high-contrast controls.
   - Dictation Audio Player with speed controls and 2-sentence chunking for ADHD.
   - Photo Upload / Camera Viewfinder component for submitting paper dictations.
   - Gamified Results Page (Streaks, badges, positive motivational feedback in Catalan).

### MODULE D: API Pipeline Engine
1. `/api/dictations/generate`: AI prompt logic creating Catalan text based on Departament d'Educació guidelines + TTS audio trigger.
2. `/api/submissions/upload`: Accepts image -> Google Cloud Vision OCR -> Claude 3.5 Sonnet comparison -> JSON evaluation output (score, error array, pedagogical explanation).
3. `/api/auth/[...nextauth]`: Domain-matching logic assigning registering users to their respective `School`.

## 3. AUTONOMOUS EXECUTION TASK LIST
Execute the following commands and code creation steps now:
1. Initialize Next.js project with App Router, TypeScript, and Tailwind CSS.
2. Create `prisma/schema.prisma` and run `npx prisma generate`.
3. Create all page files (`/app/page.tsx`, `/app/admin/page.tsx`, `/app/school/page.tsx`, `/app/teacher/page.tsx`, `/app/student/page.tsx`).
4. Build the API routes in `/app/api/` with fully mocked fallback responses for testing when API keys are absent.
5. Setup NextAuth configuration and utility functions.

Start building the entire project structure immediately without asking any questions.