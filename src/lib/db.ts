import crypto from "crypto";
import { supabaseAdmin, supabaseServer, isSupabaseConfigured } from "./supabase-server";
import {
    AuditLogEntry,
    NotificationJob,
    RoadmapItem,
    SiteContent,
    SponsorPackage,
    Submission,
} from "./types";
import {
    initialRoadmapItems,
    initialSiteContent,
    initialSponsorPackages,
} from "./default-data";
import { sendSubmissionNotification } from "./email";

function getClient(requireAdmin = false) {
    if (requireAdmin) {
        return supabaseAdmin || supabaseServer;
    }
    return supabaseServer;
}

function generateReference(): string {
    const dateStr = new Date().toISOString().slice(0, 7).replace("-", "");
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `50G-${dateStr}-${randomHex}`;
}

// -------------------------------------------------------------
// SUBMISSIONS & NOTIFICATIONS
// -------------------------------------------------------------

export async function createSubmission(payload: {
    artistName: string;
    email: string;
    phone: string;
    instagram?: string | null;
    tiktok?: string | null;
}) {
    const client = getClient(true);
    if (!client) {
        console.error("[DB Error] Geen Supabase database geconfigureerd voor permanente opslag.");
        throw new Error(
            "Database niet geconfigureerd. Neem contact op met de organisatie via 50gezichten@gmail.com."
        );
    }

    const reference = generateReference();
    const submissionId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 1. Permanent save to Supabase PostgreSQL submissions table
    const { error: insertError } = await client.from("submissions").insert({
        id: submissionId,
        reference,
        artist_name: payload.artistName,
        email: payload.email,
        phone: payload.phone,
        instagram: payload.instagram || null,
        tiktok: payload.tiktok || null,
        status: "new",
        email_notification_status: "pending",
        created_at: now,
        updated_at: now,
    });

    if (insertError) {
        console.error("[DB Insert Error]", insertError.code, insertError.message);
        throw new Error(
            `Fout bij permanente opslag in database: ${insertError.message || "Onbekende databasefout"}`
        );
    }

    // 2. Persist notification job in Supabase
    const jobId = crypto.randomUUID();
    const submittedAtFormatted = new Date().toLocaleString("nl-NL", {
        timeZone: "Europe/Amsterdam",
    });

    try {
        await client.from("notification_jobs").insert({
            id: jobId,
            submission_id: submissionId,
            reference,
            recipient: process.env.NOTIFICATION_EMAIL_TO || "50gezichten@gmail.com",
            subject: `Nieuwe Aanmelding: ${payload.artistName}`,
            payload: {
                ...payload,
                reference,
                submittedAt: submittedAtFormatted,
            },
            status: "processing",
            attempts: 1,
            max_attempts: 3,
            created_at: now,
            updated_at: now,
        });
    } catch (err) {
        console.warn("[DB Warning] Kon notification_job niet aanmaken:", err);
    }

    // 3. Dispatch Email via Resend
    const emailResult = await sendSubmissionNotification({
        artistName: payload.artistName,
        email: payload.email,
        phone: payload.phone,
        instagram: payload.instagram,
        tiktok: payload.tiktok,
        reference,
        submittedAt: submittedAtFormatted,
    });

    // 4. Update status in Supabase
    try {
        if (emailResult.success) {
            await client
                .from("submissions")
                .update({
                    email_notification_status: "sent",
                    email_message_id: emailResult.messageId || null,
                    email_notification_sent_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", submissionId);

            await client
                .from("notification_jobs")
                .update({
                    status: "sent",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", jobId);
        } else {
            await client
                .from("submissions")
                .update({
                    email_notification_status: "failed",
                    email_notification_error: emailResult.error || "Verzenden mislukt",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", submissionId);

            await client
                .from("notification_jobs")
                .update({
                    status: "failed",
                    last_error: emailResult.error || "Verzenden mislukt",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", jobId);
        }
    } catch {
        // Silently catch background status update errors
    }

    return {
        success: true,
        reference,
        emailSent: emailResult.success,
        emailError: emailResult.error,
    };
}

export async function getSubmissions(): Promise<Submission[]> {
    const client = getClient(true);
    if (!client) {
        console.warn("[DB Warning] Supabase niet geconfigureerd voor getSubmissions.");
        return [];
    }

    const { data, error } = await client
        .from("submissions")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[DB Error] Fout bij ophalen submissions:", error.message);
        return [];
    }

    return (data as Submission[]) || [];
}

export async function retryNotification(submissionId: string) {
    const client = getClient(true);
    if (!client) {
        return { success: false, error: "Database niet geconfigureerd" };
    }

    const { data: sub, error } = await client
        .from("submissions")
        .select("*")
        .eq("id", submissionId)
        .single();

    if (error || !sub) {
        return { success: false, error: "Aanmelding niet gevonden in database" };
    }

    const submittedAtFormatted = new Date(sub.created_at).toLocaleString("nl-NL", {
        timeZone: "Europe/Amsterdam",
    });

    const emailResult = await sendSubmissionNotification({
        artistName: sub.artist_name,
        email: sub.email,
        phone: sub.phone,
        instagram: sub.instagram,
        tiktok: sub.tiktok,
        reference: sub.reference,
        submittedAt: submittedAtFormatted,
    });

    const now = new Date().toISOString();
    if (emailResult.success) {
        await client
            .from("submissions")
            .update({
                email_notification_status: "sent",
                email_message_id: emailResult.messageId || null,
                email_notification_sent_at: now,
                email_notification_error: null,
                updated_at: now,
            })
            .eq("id", submissionId);
    } else {
        await client
            .from("submissions")
            .update({
                email_notification_status: "failed",
                email_notification_error: emailResult.error || "Onbekende fout",
                updated_at: now,
            })
            .eq("id", submissionId);
    }

    return emailResult;
}

// -------------------------------------------------------------
// CMS: CONTENT, ROADMAP, SPONSORS
// -------------------------------------------------------------

export async function getSiteContent(previewDraft = false): Promise<SiteContent> {
    const client = getClient(false);
    if (!client) {
        return previewDraft ? { ...initialSiteContent, status: "draft" } : initialSiteContent;
    }

    try {
        const statusToFetch = previewDraft ? "draft" : "published";
        const { data, error } = await client
            .from("site_content")
            .select("*")
            .eq("status", statusToFetch)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error || !data) {
            // If draft requested but no draft in DB, try published or default
            if (previewDraft) {
                const { data: pubData } = await client
                    .from("site_content")
                    .select("*")
                    .eq("status", "published")
                    .order("version", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (pubData) {
                    const pubContent = pubData as SiteContent;
                    if (pubContent.support && typeof pubContent.support.enabled !== "boolean") {
                        pubContent.support.enabled = false;
                    }
                    return pubContent;
                }
            }
            return previewDraft
                ? { ...initialSiteContent, status: "draft" }
                : initialSiteContent;
        }

        const siteData = data as SiteContent;
        if (siteData.support && typeof siteData.support.enabled !== "boolean") {
            siteData.support.enabled = false;
        }
        return siteData;
    } catch {
        return previewDraft ? { ...initialSiteContent, status: "draft" } : initialSiteContent;
    }
}

export async function updateDraftContent(
    content: Partial<SiteContent>,
    actor: string
): Promise<SiteContent> {
    const client = getClient(true);
    if (!client) {
        throw new Error("Supabase is niet geconfigureerd voor CMS content-updates.");
    }

    const currentPublished = await getSiteContent(false);
    const newVersion = (currentPublished.version || 1) + 1;
    const now = new Date().toISOString();

    const draftData: SiteContent = {
        id: "content-draft",
        version: newVersion,
        status: "draft",
        hero: content.hero || currentPublished.hero,
        about: content.about || currentPublished.about,
        aanmelden: content.aanmelden || currentPublished.aanmelden,
        support: content.support || currentPublished.support,
        contact: content.contact || currentPublished.contact,
        footer: content.footer || currentPublished.footer,
        updated_at: now,
        updated_by: actor,
    };

    const { error } = await client
        .from("site_content")
        .upsert(draftData, { onConflict: "id" });

    if (error) {
        console.error("[DB Error] Fout bij opslaan concept content:", error.message);
        throw new Error(`Fout bij opslaan concept in database: ${error.message}`);
    }

    await addAuditLog({
        action: "UPDATE_DRAFT",
        entity: "content",
        entity_id: "content-draft",
        actor_id: actor,
        details: `Concept websitecontent bijgewerkt naar v${newVersion}`,
    });

    return draftData;
}

export async function publishContent(actor: string): Promise<SiteContent> {
    const client = getClient(true);
    if (!client) {
        throw new Error("Supabase is niet geconfigureerd voor publiceren.");
    }

    const draft = await getSiteContent(true);
    const now = new Date().toISOString();

    const publishedData: SiteContent = {
        ...draft,
        id: "content-prod",
        status: "published",
        updated_at: now,
        updated_by: actor,
    };

    const { error } = await client
        .from("site_content")
        .upsert(publishedData, { onConflict: "id" });

    if (error) {
        console.error("[DB Error] Fout bij publiceren content:", error.message);
        throw new Error(`Fout bij live publiceren in database: ${error.message}`);
    }

    await addAuditLog({
        action: "PUBLISH_CONTENT",
        entity: "content",
        entity_id: "content-prod",
        actor_id: actor,
        details: `Versie ${publishedData.version} live gepubliceerd naar website`,
    });

    return publishedData;
}

export async function setSupportVisibility(
    enabled: boolean,
    actor: string
): Promise<SiteContent> {
    const client = getClient(true);
    const now = new Date().toISOString();

    const currentPublished = await getSiteContent(false);
    const newVersion = (currentPublished.version || 1) + 1;

    const updatedSupport = {
        ...currentPublished.support,
        enabled,
    };

    const publishedData: SiteContent = {
        ...currentPublished,
        id: "content-prod",
        version: newVersion,
        status: "published",
        support: updatedSupport,
        updated_at: now,
        updated_by: actor,
    };

    if (client) {
        const { error: pubError } = await client
            .from("site_content")
            .upsert(publishedData, { onConflict: "id" });

        if (pubError) {
            console.error("[DB Error] Fout bij bijwerken support-zichtbaarheid:", pubError.message);
            throw new Error(`Fout bij opslaan in database: ${pubError.message}`);
        }

        // Also update draft to keep them in sync
        const draftData: SiteContent = {
            ...publishedData,
            id: "content-draft",
            status: "draft",
        };
        await client.from("site_content").upsert(draftData, { onConflict: "id" });
    }

    await addAuditLog({
        action: enabled ? "ENABLE_SUPPORT_SECTION" : "DISABLE_SUPPORT_SECTION",
        entity: "content",
        entity_id: "support-section",
        actor_id: actor,
        details: enabled
            ? "Support-sectie en sponsorkaarten ingeschakeld op website"
            : "Support-sectie en sponsorkaarten verborgen op website",
    });

    return publishedData;
}

export async function getRoadmapItems(): Promise<RoadmapItem[]> {
    const client = getClient(false);
    if (!client) {
        return initialRoadmapItems;
    }

    try {
        const { data, error } = await client
            .from("roadmap_items")
            .select("*")
            .eq("archived", false)
            .order("order_index", { ascending: true });

        if (error || !data || data.length === 0) {
            return initialRoadmapItems;
        }

        return data as RoadmapItem[];
    } catch {
        return initialRoadmapItems;
    }
}

export async function saveRoadmapItems(
    items: RoadmapItem[],
    actor: string
): Promise<RoadmapItem[]> {
    const client = getClient(true);
    if (!client) {
        throw new Error("Supabase is niet geconfigureerd voor roadmap-updates.");
    }

    const { error } = await client.from("roadmap_items").upsert(items, { onConflict: "id" });

    if (error) {
        console.error("[DB Error] Fout bij opslaan roadmap:", error.message);
        throw new Error(`Fout bij opslaan roadmap in database: ${error.message}`);
    }

    await addAuditLog({
        action: "UPDATE_ROADMAP",
        entity: "roadmap",
        actor_id: actor,
        details: `${items.length} roadmap-fases bijgewerkt/geordend`,
    });

    return items;
}

export async function getSponsorPackages(): Promise<SponsorPackage[]> {
    const client = getClient(false);
    if (!client) {
        return initialSponsorPackages;
    }

    try {
        const { data, error } = await client
            .from("sponsor_packages")
            .select("*")
            .eq("archived", false)
            .order("order_index", { ascending: true });

        if (error || !data || data.length === 0) {
            return initialSponsorPackages;
        }

        return data as SponsorPackage[];
    } catch {
        return initialSponsorPackages;
    }
}

export async function saveSponsorPackages(
    packages: SponsorPackage[],
    actor: string
): Promise<SponsorPackage[]> {
    const client = getClient(true);
    if (!client) {
        throw new Error("Supabase is niet geconfigureerd voor sponsor-updates.");
    }

    const { error } = await client.from("sponsor_packages").upsert(packages, { onConflict: "id" });

    if (error) {
        console.error("[DB Error] Fout bij opslaan sponsorpakketten:", error.message);
        throw new Error(`Fout bij opslaan sponsorpakketten in database: ${error.message}`);
    }

    await addAuditLog({
        action: "UPDATE_SPONSORS",
        entity: "sponsors",
        actor_id: actor,
        details: `${packages.length} sponsorpakketten bijgewerkt/geordend`,
    });

    return packages;
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
    const client = getClient(true);
    if (!client) {
        return [];
    }

    try {
        const { data, error } = await client
            .from("audit_logs")
            .select("*")
            .order("timestamp", { ascending: false })
            .limit(50);

        if (error || !data) {
            return [];
        }

        return data as AuditLogEntry[];
    } catch {
        return [];
    }
}

export async function addAuditLog(entry: {
    action: string;
    entity: string;
    entity_id?: string;
    actor_id: string;
    actor_name?: string;
    details?: string;
}) {
    const client = getClient(true);
    if (!client) return;

    try {
        await client.from("audit_logs").insert({
            id: crypto.randomUUID(),
            action: entry.action,
            entity: entry.entity,
            entity_id: entry.entity_id || null,
            actor_id: entry.actor_id,
            actor_name: entry.actor_name || entry.actor_id,
            details: entry.details || null,
            timestamp: new Date().toISOString(),
        });
    } catch {
        // Silently ignore audit log write failures
    }
}
