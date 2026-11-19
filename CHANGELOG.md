# Changelog - 50 Gezichten 50 Gedichten

Alle belangrijke technische wijzigingen, herstellingen en toevoegingen aan het project worden in dit document vastgelegd volgens de richtlijnen van Masterprompt V2.

## [Unreleased] - 2026-11-19

### Vercel Preview Herstel: Permanente Supabase Opslag & Volledig Verwijderen Lokale JSON-Store
- **Blokkerende runtime-fout opgelost:**
  - `Error: ENOENT: no such file or directory, mkdir '/var/task/.data'` opgelost.
  - Alle afhankelijkheden van schrijfbare lokale JSON-bestanden (`ensureDataStore`, `.data/cms_store.json`, `fs.mkdirSync`, `fs.writeFileSync`) zijn **volledig geëlimineerd** uit alle productiecode.
  - Vercel Serverless read-only container compatibiliteit 100% gegarandeerd.
- **Permanente Opslagarchitectuur (Supabase PostgreSQL):**
  - Aanmeldingen worden direct permanent opgeslagen in de tabel `public.submissions`.
  - Notificatiejobs worden persistent en herstelbaar opgeslagen in `public.notification_jobs`.
  - CMS-content (concept en gepubliceerd) wordt permanent beheerd in `public.site_content`.
  - Roadmapfasen en sponsorpakketten worden permanent opgeslagen in `public.roadmap_items` en `public.sponsor_packages`.
  - Auditlogs worden vastgelegd in `public.audit_logs`.
- **Eis 8 (Faalveilige integriteit):**
  - Mislukte database-opslag (bijvoorbeeld door ontbrekende of onbereikbare Supabase-verbinding) wordt **nooit** meer als succes gerapporteerd. De API retourneert direct een HTTP 500/503 fout en verstuurt geen spooknotificaties.
- **Leesoperaties & Designbehoud:**
  - De publieke homepage levert bij een lege database of tijdens initialisatie veilige in-memory fallbacks met de exacte projectteksten zonder schijftoegang. De homepage geeft direct HTTP 200 OK.
- **Media Uploads:**
  - Media-uploads (`/api/admin/upload`) migreren naar Supabase Storage (bucket `'media'`) met MIME-type en groottevalidatie (max 5MB).
- **SQL Migratie & Seed Data:**
  - [001_initial_schema.sql](file:///Users/izhia/50gezichten/supabase/migrations/001_initial_schema.sql) uitgebreid met alle RLS-policies, indices en initiële seed data (`ON CONFLICT DO NOTHING`).
- **Tests:**
  - 21 van de 21 geautomatiseerde tests geslaagd, inclusief Playwright visual regression tests op alle viewports (360px t/m 1440px).

### Fase 1: Technische Audit & Beveiligingsherstel
- **Repository & Beveiliging:**
  - `.env.local` ontkoppeld uit Git-tracking (`git rm --cached .env.local`).
  - `.gitignore` geconfigureerd ter voorkoming van toekomstige commits met secrets (`.env*.local`, `node_modules`, `.next`, `/.data/`, `.vercel`).
  - `.env.example` gecreëerd met veilige documentatie voor alle benodigde variabelen.
  - Resend API key status gecontroleerd (actief als restricted sending-sleutel).
  - Baselinescreenshots vastgelegd op 360px, 390px, 768px, 1024px en 1440px via Playwright.

### Fase 2 & 3: Reparatie Website & Aanmeldformulier
- **Opgeloste build- en runtimefouten:**
  - Dubbele imports van `NextResponse` en `supabaseServer` in `src/app/api/aanmelden/route.ts` verholpen.
  - Strikte server- en client-side validatie voor artiestennaam, e-mail en telefoonnummer.
  - Antispam via honeypot-veld en in-memory sliding-window rate limiting (max 5 inzendingen per 10 min per IP).
  - Generatie van unieke aanmeldingsreferenties (`50G-YYYYMM-XXXX`).
  - E-mailnotificaties naar `50gezichten@gmail.com` via Resend met nette HTML- en tekstversie en geverifieerd afzenderadres / `Reply-To`.

### Fase 4: Adminauthenticatie (GitHub OAuth)
- **Authenticatie & Beveiliging (`/admin`):**
  - GitHub OAuth geïntegreerd via Auth.js (NextAuth v5).
  - Server-side allowlist op stabiele numerieke GitHub User-IDs (`278548191`, `346629474`, `265046697`).
  - Alle adminpagina's en `/api/admin/*` routes beveiligd via server-side middleware (401 Unauthorized bij ontbrekende sessie).

### Fase 5 & 6: CMS Backend & Beheerinterface
- **CMS Datamodel & Publicatieworkflow:**
  - Volledige scheiding tussen concept (`draft`) en live gepubliceerde websitecontent (`published`).
  - Dashboard op `/admin` met realtime statistieken, notificatiestatus en snelle navigatie.
  - Teksten beheren op `/admin/teksten`.
  - Roadmap beheren op `/admin/roadmap`.
  - Sponsorkaarten beheren op `/admin/sponsors`.
  - Media beheren op `/admin/media`.
  - Aanmeldingen beheren op `/admin/aanmeldingen` (met retry-functie voor e-mails).
  - Instellingenoverzicht op `/admin/instellingen`.
  - Wijzigingsgeschiedenis op `/admin/geschiedenis`.

### Fase 7: Frontend Integratie met Designbehoud
- **Visuele weergave en interactie:**
  - Publieke website (`src/app/page.tsx`) laadt direct de live gepubliceerde CMS-gegevens zonder herontwerp.
  - Alle typografie (Permanent Marker, Caveat, Inter), layout, marges, custom logo pointer cursors, drag/swipe carrousel en zigzag roadmap animaties zijn exact behouden.
