-- ====================================================================
-- 50 GEZICHTEN 50 GEDICHTEN - DATABASE SCHEMA & RLS MIGRATIE (001)
-- ====================================================================

-- 1. SUBMISSIONS (Aanmeldingen van artiesten)
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(50) UNIQUE NOT NULL,
    artist_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    instagram VARCHAR(100),
    tiktok VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'new', -- 'new', 'reviewed', 'accepted', 'rejected'
    notes TEXT,
    email_notification_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    email_notification_error TEXT,
    email_notification_sent_at TIMESTAMPTZ,
    email_message_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_reference ON public.submissions(reference);

-- 2. NOTIFICATION JOBS (Transactielogs & retries voor e-mails)
CREATE TABLE IF NOT EXISTS public.notification_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
    reference VARCHAR(50) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed'
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_status ON public.notification_jobs(status);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_created_at ON public.notification_jobs(created_at DESC);

-- 3. SITE CONTENT (CMS teksten: hero, about, aanmelden, support, contact, footer)
CREATE TABLE IF NOT EXISTS public.site_content (
    id VARCHAR(50) PRIMARY KEY,
    version INT NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'published', -- 'draft', 'published'
    hero JSONB NOT NULL,
    about JSONB NOT NULL,
    aanmelden JSONB NOT NULL,
    support JSONB NOT NULL,
    contact JSONB NOT NULL,
    footer JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by VARCHAR(100)
);

-- 4. ROADMAP ITEMS
CREATE TABLE IF NOT EXISTS public.roadmap_items (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    duration VARCHAR(100) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT false,
    order_index INT NOT NULL DEFAULT 0,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_roadmap_order ON public.roadmap_items(order_index ASC);

-- 5. SPONSOR PACKAGES
CREATE TABLE IF NOT EXISTS public.sponsor_packages (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    price VARCHAR(100) NOT NULL,
    image TEXT NOT NULL,
    benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
    order_index INT NOT NULL DEFAULT 0,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sponsors_order ON public.sponsor_packages(order_index ASC);

-- 6. AUDIT LOGS (Wijzigingsgeschiedenis)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    actor_id VARCHAR(100) NOT NULL,
    actor_name VARCHAR(150),
    details TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON public.audit_logs(timestamp DESC);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Submissions: Alleen service_role heeft toegang
CREATE POLICY "Service role full access on submissions"
ON public.submissions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Notification jobs: Alleen service_role heeft toegang
CREATE POLICY "Service role full access on notification_jobs"
ON public.notification_jobs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Site content: Publiek mag gepubliceerde content lezen; service_role heeft volledig beheer
CREATE POLICY "Public can read published site_content"
ON public.site_content
FOR SELECT
TO anon, authenticated
USING (status = 'published');

CREATE POLICY "Service role full access on site_content"
ON public.site_content
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Roadmap items: Publiek mag niet-gearchiveerde items lezen
CREATE POLICY "Public can read roadmap_items"
ON public.roadmap_items
FOR SELECT
TO anon, authenticated
USING (archived = false);

CREATE POLICY "Service role full access on roadmap_items"
ON public.roadmap_items
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Sponsor packages: Publiek mag niet-gearchiveerde pakketten lezen
CREATE POLICY "Public can read sponsor_packages"
ON public.sponsor_packages
FOR SELECT
TO anon, authenticated
USING (archived = false);

CREATE POLICY "Service role full access on sponsor_packages"
ON public.sponsor_packages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Audit logs: Alleen service_role heeft toegang
CREATE POLICY "Service role full access on audit_logs"
ON public.audit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ====================================================================
-- SEED DATA (Initiële waarden)
-- ====================================================================

INSERT INTO public.site_content (id, version, status, hero, about, aanmelden, support, contact, footer, updated_by)
VALUES (
    'content-prod',
    1,
    'published',
    '{"tagline": "HipHop X Poëziebundel — 50 jaar Almere", "logo_alt": "50 Gezichten 50 Gedichten"}'::jsonb,
    '{"title": "Over Ons", "lead_highlight": "50 Gezichten, 50 Gedichten", "paragraph_1": "is een unieke Almeerse gedichtenbundel waarin hiphop en poëzie met elkaar worden verbonden. Vijftig rappers uit Almere — jong en oud — leveren elk een tekst voor de bundel. Rapteksten worden meestal gehoord in combinatie met beats, maar ze zijn ook op zichzelf staande stukjes kunst. Dit project is zowel een literaire publicatie als een cultureel portret van Almere: een hedendaags stuk cultureel erfgoed dat de geschiedenis van vijftig jaar stad weergeeft.", "paragraph_2": "Wij geloven dat kunst voor iedereen toegankelijk moet zijn. Daarom wordt de bundel gratis beschikbaar gesteld via de Almeerse bibliotheken en op onze website. De fysieke bundels worden verspreid tijdens een lanceringsavond in De Nieuwe Bibliotheek Almere, waar rappers hun gedichten live voordragen. Hopelijk is deze bundel pas het begin van een nieuwe traditie van culturele werken waar elke Almeerder trots op kan zijn."}'::jsonb,
    '{"title": "Aanmelden", "description": "Ben jij een rapper uit Almere met een verhaal te vertellen? Wij zoeken vijftig stemmen die de stad representeren. Als je woonachtig en ingeschreven bent in Almere en minimaal één rapsingle hebt uitgebracht, nodigen wij je uit om je aan te melden. Deel jouw woorden met de wereld en maak deel uit van dit unieke culturele project."}'::jsonb,
    '{"title": "Support", "intro": "Als bedrijf uit Almere kun jij een belangrijke rol spelen in het behouden en versterken van de lokale cultuur. Door sponsor te worden van 50 Gezichten 50 Gedichten vereeuw je jouw naam in de danklijsten en draag je bij aan een cultureel erfgoedproject dat generaties zal inspireren.", "custom_package_text": "Liever een op maat gemaakt pakket? Neem vooral contact met ons op door te mailen naar", "custom_package_email": "50gezichten@gmail.com"}'::jsonb,
    '{"title": "Contact", "email": "50gezichten@gmail.com", "instagram_url": "https://instagram.com/50gezichten", "facebook_url": "https://facebook.com/50gezichten", "tiktok_url": "https://tiktok.com/@50gezichten"}'::jsonb,
    '{"copyright_text": "© 2026 - 50 Gezichten 50 Gedichten - Izhia Arts - Juiced Unicorn - Stichting Dutch Urban Arts - Almere"}'::jsonb,
    'system'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.roadmap_items (id, title, description, duration, active, order_index, archived)
VALUES
    ('roadmap-1', 'Financieringsfase 1', 'Subsidies en sponsoren benaderen voor de eerste fase van financiering, zodat het project kan worden opgezet.', 'Nu bezig: circa 12 weken', true, 0, false),
    ('roadmap-2', 'Wervingsfase', 'Het verkennen van het veld en het benaderen van rappers om een gedicht in te sturen binnen de gestelde deadline.', 'Circa 4-6 weken', false, 1, false),
    ('roadmap-3', 'Selectiefase', 'Alle ingestuurde teksten worden gelezen en de beste vijftig worden geselecteerd voor de bundel.', 'Circa 2-3 weken', false, 2, false),
    ('roadmap-4', 'Financieringsfase 2', 'In de tweede fase wordt een crowdfundingsactie opgezet. Supporters krijgen de mogelijkheid om de eerste druk van de bundel te kopen.', 'Circa 8 weken', false, 3, false),
    ('roadmap-5', 'Portretfase', 'De portretten van de rappers met een geselecteerd gedicht worden geschreven voor in het boek.', 'Circa 4 weken (simultaan met financieringsfase 2)', false, 4, false),
    ('roadmap-6', 'Redactiefase', 'Alle teksten worden nagelezen, spellingtechnisch gecorrigeerd en de voor- en nawoorden worden geschreven.', 'Circa 4 weken (gelijktijdig met financieringsfase 2)', false, 5, false),
    ('roadmap-7', 'Drukfase', 'De fysieke kopieën van de gedichtenbundel worden gedrukt.', 'Circa 4 weken', false, 6, false),
    ('roadmap-8', 'Releasefase', 'Het uitbrengen van de fysieke bundel, de digitale releases en de voordracht in De Nieuwe Bibliotheek Almere.', 'Circa 4 weken', false, 7, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sponsor_packages (id, title, price, image, benefits, order_index, archived)
VALUES
    ('sponsor-1', 'ALLY INSTAPPERS', 'Vanaf €250', '/img/sponsor/01.png', '["2 boeken bij de release", "Een display om te plaatsen in je winkel als supporter", "Een dankwoord op de website", "Een dankwoord op de social media"]'::jsonb, 0, false),
    ('sponsor-2', 'ALLY KERN SUPPORTERS', 'Vanaf €500', '/img/sponsor/02.png', '["4 boeken bij de release", "Een display om te plaatsen in je winkel als supporter", "Een 50 Gezichten 50 Gedichten supporter sticker", "Een shout-out tijdens de voordracht", "Een dankwoord op de website", "Een dankwoord op de social media"]'::jsonb, 1, false),
    ('sponsor-3', 'ALLY UPPERS', 'Vanaf €1.000', '/img/sponsor/03.png', '["4 boeken bij de release", "Een handgemaakte display om te plaatsen in je winkel als supporter", "Een 50 Gezichten 50 Gedichten supporter sticker", "Een shout-out tijdens de voordracht", "Een dankwoord op de website", "Een dankwoord op de social media", "Een dankwoord in het boek", "Een custom video voordracht van een van de gedichten uit de bundel"]'::jsonb, 2, false),
    ('sponsor-4', 'ALLY MAXIMUM', 'Vanaf €2.500', '/img/sponsor/04.png', '["8 boeken bij de release", "Een handgemaakte speciale display om te plaatsen in je winkel als supporter", "Een 50 Gezichten 50 Gedichten supporter sticker", "Een shout-out tijdens de voordracht", "Een dankwoord op de website", "Een dankwoord op de social media", "Een dankwoord in het boek", "Vier custom video voordrachten van gedichten uit de bundel"]'::jsonb, 3, false)
ON CONFLICT (id) DO NOTHING;
