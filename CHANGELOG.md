# Changelog - 50 Gezichten 50 Gedichten

Alle belangrijke technische wijzigingen, herstellingen en toevoegingen aan het project worden in dit document vastgelegd volgens de richtlijnen van Masterprompt V2.

## [Unreleased] - 2026-11-21

### Formuliervalidatie en Foutmeldingen Verbeterd (UX & Toegankelijkheid)
- **Veldspecifieke Foutmeldingen (`src/app/HomePageClient.tsx` & `src/lib/validation.ts`):**
  - Foutmeldingen worden direct onder de desbetreffende invoervelden getoond op basis van `data.details` uit de API-respons.
  - Server-side validatie in `src/lib/validation.ts` afgestemd op de gewenste meldingen:
    - `artistName`: behoud van meldingen voor ontbrekende, te korte (< 2) of te lange (> 100) artiestennaam.
    - `email`: eenduidige melding `"Voer een geldig e-mailadres in"`.
    - `phone`: eenduidige melding `"Voer een geldig telefoonnummer in"`.
    - `instagram` & `tiktok`: melding wanneer een ingevoerde waarde langer is dan 100 tekens.
- **Visuele Feedback & Toegankelijkheid:**
  - Ongeldige velden krijgen een duidelijke rode rand (`border-red-500` met aangepaste focusring).
  - Volledige schermlezer-ondersteuning met `aria-invalid`, `aria-describedby` (gekoppeld aan `[field]-error`) en `role="alert"`.
  - Formulier uitgerust met `noValidate` om native HTML5 tooltips te vervangen door consistente, toegankelijke custom foutindicaties.
  - Automatische focus en soepele centrering (`scrollIntoView`) op het eerste ongeldige veld bij een validatiefout.
  - Dynamische validatieverwijdering: zodra een gecorrigeerde waarde geldig is, verdwijnt de veldfout direct zonder overige actieve foutmeldingen te verbergen.
- **Algemene Melding & Foutafhandeling:**
  - Bij meerdere ongeldige velden toont het formulier: `"Controleer je gegevens en corrigeer de gemarkeerde velden."`.
  - Bij technische serverfouten (HTTP 500) of netwerkfouten verschijnt een neutrale technische melding zonder stacktraces, gevoelige gegevens of verwijten aan de bezoeker.
- **Verzendknop Teksten & Status:**
  - Exacte knopteksten geïmplementeerd: `VERSTUUR AANMELDING` (standaard) -> `VERZENDEN...` (tijdens verwerking) -> `VERZONDEN!` (na succes) -> `PROBEER OPNIEUW` (na een fout).
  - Verzendknop blijft na een fout direct bruikbaar en is alleen geblokkeerd tijdens actieve verzending.
- **Behoud van Gegevens:**
  - Formulierinvoer wordt uitsluitend gewist bij een daadwerkelijk succesvolle aanmelding. Bij validatie-, server- of verbindingsfouten blijven alle ingevulde gegevens bewaard.
  - Invoercorrecties triggeren nooit automatische verzending; alleen een expliciete klik op de knop verstuurt het formulier.
- **Testdekking:**
  - Uitgebreide testsuite `tests/form_validation_ux.test.ts` toegevoegd met 34 geautomatiseerde tests (servervalidatie, API 400 responses, bot/honeypot guards, accessibility inspectie en volledige Playwright headless browser E2E tests).

## [Unreleased] - 2026-11-20

### CMS Toegangsbeveiliging & Server-side Autorisatieherstel
- **Server-side autorisatie (`src/lib/auth-guard.ts` & alle adminpagina's):**
  - Implementatie van `requireAdmin()` helper die cryptografische sessievalidatie (`await auth()`) en rolvalidatie (`session.user.isAdmin`) afdwingt op alle admin Server Components.
  - Vervalste, ongeldige of gemanipuleerde sessiecookies worden server-side direct geweigerd met een redirect naar `/admin/login`. Er worden géén persoonsgegevens of beheerfuncties gerenderd.
- **Admin API Beveiliging (`/api/admin/*`):**
  - Alle admin API-routes controleren expliciet `session.user.isAdmin` alvorens gegevens uit te leveren of mutaties uit te voeren (HTTP 401 Unauthorized bij ontbrekende of niet-geautoriseerde sessie).
- **Sessiecallback (`src/auth.ts`):**
  - De sessiecallback verifieert bij elk verzoek of de gebruiker nog steeds voorkomt in `ADMIN_GITHUB_IDS`.
- **Testdekking:**
  - `tests/auth_security.test.ts` uitgebreid met Suite 5 voor server-side autorisatie en vervalste cookie tests.

### Notificatiemail Onderwerp Aanpassing
- **E-mail & Database Notificaties (`src/lib/email.ts` & `src/lib/db.ts`):**
  - Onderwerp van de e-mailnotificaties voor nieuwe aanmeldingen aangepast naar het formaat: `Nieuwe Aanmelding: [Artiestennaam]`.
  - Consistent doorgevoerd in de Resend e-mailverzending, de HTML e-mail title en de opslag van `notification_jobs` in Supabase PostgreSQL.
  - Behoud van alle overige functionaliteit, lay-out, afzender, ontvanger en CRLF-injectiebeveiliging.

### Beveiligingsherstel: Aanmeldroute, E-mail Sanitization & Veilige Bestandsuploads
- **Aanmeldroute (`/api/aanmelden`):**
  - Bezoekers ontvangen bij onverwachte server- of databasefouten uitsluitend een algemene, veilige foutmelding (`HTTP 500`).
  - Interne databasestructuur, RLS-beleidsfouten en stacktraces lekken niet meer naar de client.
  - Technische foutinformatie wordt uitsluitend server-side gelogd. Er worden geen persoonsgegevens, tokens of API-sleutels gelogd in errorhandlers.
  - Bestaande validatie, antispam (rate limiting en honeypot), databaseopslag en notificatietriggers zijn volledig behouden.
- **HTML E-mail Sanitization (`src/lib/email.ts`):**
  - Volledige bescherming tegen HTML-injectie en XSS in e-mailclients door strikte escaping van alle dynamische invoervelden (`escapeHtml`).
  - Veilige sanitization van HTML-attributen (`escapeHtmlAttr`) en links (`mailto:` en `tel:` URI schemes) ter voorkoming van attribute breakouts.
  - Social media handles (`@instagram`, `@tiktok`) gesanitized tegen script- en quote-injecties.
  - E-mail lay-out, typografie en de plattetekstversie zijn exact behouden.
- **Bestandsuploads & Contentvalidatie (`/api/admin/upload` & `src/lib/upload-security.ts`):**
  - SVG-uploads zijn voorlopig expliciet uitgeschakeld om script- en XML-injectierisico's te neutraliseren.
  - Uitsluitend JPEG, PNG en WebP worden geaccepteerd.
  - Diepe contentvalidatie via magic bytes (`detectImageFormat`) controleert de daadwerkelijke bestandsinhoud voorafgaand aan opslag. Vermomde scripts of HTML-bestanden met een afbeeldingsuitgang worden direct geweigerd.
  - Consistentiecontrole tussen extensie, client-MIME-type en de gedetecteerde afbeeldingsheader.
  - Maximale bestandsgrootte van 5 MB en Supabase Storage-integratie behouden.
- **Testdekking:**
  - Nieuwe testsuite `tests/security_fixes.test.ts` toegevoegd met 19 geautomatiseerde validaties (foutafhandeling, XSS payloads, attribute breakouts, magic bytes, SVG weigering).

### Auth.js Beveiligingsherstel: Strikt Toegangsbeheer & Verwijderen Vaste Geheimen
- **Standaardbeheerders fallback geëlimineerd:**
  - Vaste lijst `defaultAdminIds = ["278548191", "346629474", "265046697"]` in `src/auth.ts` volledig verwijderd.
  - Toegang wordt uitsluitend en strict bepaald door de omgevingsvariabele `ADMIN_GITHUB_IDS`.
  - Indien `ADMIN_GITHUB_IDS` ontbreekt, leeg is of slechts witruimte bevat, wordt aanmelden per direct geweigerd (geen onbedoelde toegang).
  - Ondersteuning voor stabiele numerieke GitHub-gebruikers-ID's en case-insensitieve logins.
  - Nooit logging van geheime sleutels of tokens.
- **Hardcoded AUTH_SECRET-fallback verwijderd:**
  - Hardcoded development-secret (`"50gezichten-development-auth-secret-change-in-prod-32c"`) in `src/auth.ts` volledig verwijderd.
  - Authenticatie leunt uitsluitend op `process.env.AUTH_SECRET` (of `process.env.NEXTAUTH_SECRET`).
  - Bij een ontbrekende of lege sleutel faalt de authenticatie veilig (`MissingSecret` / HTTP 500 zonder fallback).
- **OAuth-configuratie & Vercel Preview Hostdetectie:**
  - `trustHost: true` expliciet toegevoegd aan `NextAuth` opties ter voorkoming van `UntrustedHost`-fouten achter dynamische Vercel Preview-URL's.
  - Bevestigd dat de OAuth callbackroute op Auth.js `/api/auth/callback/github` is en correct wordt afgehandeld door `src/app/api/auth/[...nextauth]/route.ts`.
  - Instellingenpagina (`src/app/admin/instellingen/page.tsx`) bijgewerkt zodat er geen oude standaardaccounts als fallback worden gepresenteerd wanneer `ADMIN_GITHUB_IDS` niet is ingesteld.
- **Testdekking:**
  - Nieuwe gerichte testsuite toegevoegd in `tests/auth_security.test.ts` met 16 geautomatiseerde validaties (allowlist, edge cases, type checks, statische secret audit en runtime OAuth handlers).

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
