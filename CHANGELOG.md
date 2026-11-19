# Changelog - 50 Gezichten 50 Gedichten

Alle belangrijke technische wijzigingen, herstellingen en toevoegingen aan het project worden in dit document vastgelegd volgens de richtlijnen van Masterprompt V2.

## [Unreleased] - 2026-11-19

### Fase 1: Technische Audit & Beveiligingsherstel
- **Repository & Beveiliging:**
  - Inspectie van Git-geschiedenis: `.env.local` was publiek gecommit in commits `00ef037` en `f110f6d`.
  - `.env.local` ontkoppeld uit Git-tracking (`git rm --cached .env.local`).
  - `.gitignore` geconfigureerd ter voorkoming van toekomstige commits met secrets of lokale data (`.env*.local`, `node_modules`, `.next`, `/.data/`).
  - `.env.example` gecreëerd met duidelijke documentatie van alle variabelen.
  - Resend API key status gecontroleerd: actief als restricted sending-key (dient geroteerd te worden i.v.m. historische blootstelling).
  - Supabase status gecontroleerd: `tfhcggcupmgdtzdyekft.supabase.co` onbereikbaar (inactiviteit pauze door Supabase). Fail-safe opslaglaag geïmplementeerd om gegevensverlies te voorkomen.
  - Baselinescreenshots vastgelegd op 360px, 390px, 768px, 1024px en 1440px via Playwright.

### Fase 2: Website & Build Reparatie
- **Opgeloste build- en runtimefouten:**
  - Dubbele imports van `NextResponse` en `supabaseServer` in `src/app/api/aanmelden/route.ts` verholpen.
  - `src/lib/supabase-server.ts` robuust gemaakt tegen ontbrekende omgevingsvariabelen zodat Next.js niet crasht.
  - TypeScript compilation en Next.js App Router productiebuilds slagen 100% foutloos.

### Fase 3: Aanmeldformulier & E-mailnotificaties
- **Aanmeldroute (`/api/aanmelden`):**
  - Strikte server-side validatie voor artiestennaam, e-mailadres en telefoonnummer.
  - Antispam bescherming via onzichtbaar honeypot-veld en in-memory sliding-window rate limiting (max 5 requests per 10 min per IP).
  - Generatie van unieke aanmeldingsreferentie (`50G-YYYYMM-XXXX`).
  - Automatische transactionele e-mailnotificatie naar `50gezichten@gmail.com` via Resend met nette HTML- en tekstversie en geverifieerd afzenderadres / `Reply-To`.
  - Fail-safe opslaglaag met status- en auditlogs en idempotente notificatie tracking.

### Fase 4: Adminauthenticatie (GitHub OAuth)
- **Authenticatie & Beveiliging (`/admin`):**
  - GitHub OAuth geïntegreerd via Auth.js (NextAuth v5).
  - Server-side allowlist op stabiele numerieke GitHub User-IDs (`278548191`, `346629474`, `265046697`).
  - Alle adminpagina's en `/api/admin/*` routes beveiligd via server-side middleware en sessiecontroles (401 Unauthorized bij ontbrekende sessie).

### Fase 5 & 6: CMS Backend & Beheerinterface
- **CMS Datamodel & Publicatieworkflow:**
  - Volledige scheiding tussen concept (draft) en live gepubliceerde websitecontent.
  - Publicatieworkflow met één-klik live publicatie (`PUT /api/admin/content`).
  - Dashboard op `/admin` met realtime statistieken, notificatiestatus en snelle navigatie.
  - Teksten beheren op `/admin/teksten` (Hero, Over ons, Aanmelden, Support, Contact, Footer).
  - Roadmap beheren op `/admin/roadmap` (fases toevoegen, bewerken, activeren, volgorde aanpassen, verwijderen).
  - Sponsorkaarten beheren op `/admin/sponsors` (pakketten toevoegen, prijzen/voordelen bewerken, volgorde aanpassen, foto's uploaden).
  - Media beheren op `/admin/media` (beveiligde uploads met MIME-type en groottecontrole).
  - Aanmeldingen beheren op `/admin/aanmeldingen` (doorzoekbaar overzicht met retry-functie voor mislukte e-mails).
  - Instellingenoverzicht op `/admin/instellingen`.
  - Volledige wijzigingsgeschiedenis en audit log op `/admin/geschiedenis`.

### Fase 7: Frontend Integratie met Designbehoud
- **Visuele weergave en interactie:**
  - Publieke website (`src/app/page.tsx`) laadt direct de live gepubliceerde CMS-gegevens zonder herontwerp.
  - Alle typografie (Permanent Marker, Caveat, Inter), layout, marges, custom logo pointer cursors, drag/swipe carrousel en zigzag roadmap animaties zijn exact behouden.

### Fase 8: Geautomatiseerde Tests & Regressie
- **Master Test Suite (`tests/run_all_tests.ts`):**
  - 25 van de 25 geautomatiseerde end-to-end tests geslaagd (0 fouten).
  - Visuele regressietests via Playwright op 360px, 390px, 768px, 1024px en 1440px bevestigen 100% visuele conformiteit met de originele productieversie.
