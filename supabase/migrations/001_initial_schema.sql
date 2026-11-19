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

-- 2. NOTIFICATION JOBS (Transactie logs & retries voor e-mails)
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

-- 3. SITE CONTENT (CMS teksten: hero, about, aanmelden, support, contact)
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

-- Enable RLS on all tables
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Submissions & Notifications: NEVER publicly readable
-- Public anon can only INSERT new submissions via API route with service role, 
-- or restricted insert policy:
CREATE POLICY "Public can insert submissions" 
ON public.submissions 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Deny public select on submissions (Admins with service_role can read)
CREATE POLICY "Service role full access on submissions"
ON public.submissions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Notification jobs: Service role only
CREATE POLICY "Service role full access on notification_jobs"
ON public.notification_jobs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Public can READ published content
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

-- Public can READ non-archived roadmap items
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

-- Public can READ non-archived sponsor packages
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

-- Audit logs: Service role only
CREATE POLICY "Service role full access on audit_logs"
ON public.audit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
