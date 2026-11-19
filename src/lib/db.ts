import fs from "fs";
import path from "path";
import crypto from "crypto";
import { supabaseServer } from "./supabase-server";
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

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "cms_store.json");

interface DataStore {
    submissions: Submission[];
    notificationJobs: NotificationJob[];
    publishedContent: SiteContent;
    draftContent: SiteContent;
    contentHistory: SiteContent[];
    roadmapItems: RoadmapItem[];
    sponsorPackages: SponsorPackage[];
    auditLogs: AuditLogEntry[];
}

function ensureDataStore(): DataStore {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(STORE_FILE)) {
        const initialStore: DataStore = {
            submissions: [],
            notificationJobs: [],
            publishedContent: initialSiteContent,
            draftContent: { ...initialSiteContent, status: "draft" },
            contentHistory: [initialSiteContent],
            roadmapItems: initialRoadmapItems,
            sponsorPackages: initialSponsorPackages,
            auditLogs: [
                {
                    id: "init-1",
                    action: "SYSTEM_INIT",
                    entity: "store",
                    actor_id: "system",
                    actor_name: "System",
                    details: "Initialized database and fallback store with default content",
                    timestamp: new Date().toISOString(),
                },
            ],
        };
        fs.writeFileSync(STORE_FILE, JSON.stringify(initialStore, null, 2), "utf-8");
        return initialStore;
    }

    try {
        const content = fs.readFileSync(STORE_FILE, "utf-8");
        return JSON.parse(content);
    } catch {
        return {
            submissions: [],
            notificationJobs: [],
            publishedContent: initialSiteContent,
            draftContent: { ...initialSiteContent, status: "draft" },
            contentHistory: [initialSiteContent],
            roadmapItems: initialRoadmapItems,
            sponsorPackages: initialSponsorPackages,
            auditLogs: [],
        };
    }
}

function saveStore(store: DataStore) {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
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
    const store = ensureDataStore();
    const reference = generateReference();
    const now = new Date().toISOString();
    const submissionId = crypto.randomUUID();

    const submission: Submission = {
        id: submissionId,
        reference,
        artist_name: payload.artistName,
        email: payload.email,
        phone: payload.phone,
        instagram: payload.instagram || null,
        tiktok: payload.tiktok || null,
        created_at: now,
        status: "new",
        email_notification_status: "pending",
    };

    // 1. Try Supabase insert if client is available
    let savedToSupabase = false;
    if (supabaseServer) {
        try {
            const { error } = await supabaseServer.from("submissions").insert({
                id: submissionId,
                reference,
                artist_name: payload.artistName,
                email: payload.email,
                phone: payload.phone,
                instagram: payload.instagram || null,
                tiktok: payload.tiktok || null,
                status: "new",
                email_notification_status: "pending",
            });
            if (!error) {
                savedToSupabase = true;
            } else {
                console.warn("[DB] Supabase insert failed:", error.code, error.message);
            }
        } catch (err) {
            console.warn("[DB] Supabase connection error:", err instanceof Error ? err.message : err);
        }
    }

    // 2. Always persist locally to prevent ANY data loss
    store.submissions.unshift(submission);

    // 3. Create notification job
    const jobId = crypto.randomUUID();
    const notificationJob: NotificationJob = {
        id: jobId,
        submission_id: submissionId,
        reference,
        recipient: process.env.NOTIFICATION_EMAIL_TO || "50gezichten@gmail.com",
        subject: `Nieuwe aanmelding 50 Gezichten 50 Gedichten: ${payload.artistName}`,
        payload: {
            ...payload,
            reference,
            submittedAt: new Date().toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" }),
        },
        status: "processing",
        attempts: 1,
        max_attempts: 3,
        created_at: now,
        updated_at: now,
    };
    store.notificationJobs.unshift(notificationJob);
    saveStore(store);

    // 4. Dispatch Email via Resend
    const emailResult = await sendSubmissionNotification({
        artistName: payload.artistName,
        email: payload.email,
        phone: payload.phone,
        instagram: payload.instagram,
        tiktok: payload.tiktok,
        reference,
        submittedAt: notificationJob.payload.submittedAt,
    });

    // 5. Update submission and job status
    const storeAfterEmail = ensureDataStore();
    const subIdx = storeAfterEmail.submissions.findIndex((s) => s.id === submissionId);
    const jobIdx = storeAfterEmail.notificationJobs.findIndex((j) => j.id === jobId);

    if (emailResult.success) {
        if (subIdx !== -1) {
            storeAfterEmail.submissions[subIdx].email_notification_status = "sent";
            storeAfterEmail.submissions[subIdx].email_message_id = emailResult.messageId;
            storeAfterEmail.submissions[subIdx].email_notification_sent_at = new Date().toISOString();
        }
        if (jobIdx !== -1) {
            storeAfterEmail.notificationJobs[jobIdx].status = "sent";
            storeAfterEmail.notificationJobs[jobIdx].updated_at = new Date().toISOString();
        }

        if (savedToSupabase && supabaseServer) {
            try {
                await supabaseServer
                    .from("submissions")
                    .update({
                        email_notification_status: "sent",
                        email_message_id: emailResult.messageId,
                    })
                    .eq("id", submissionId);
            } catch {
                // Ignore background sync errors
            }
        }
    } else {
        if (subIdx !== -1) {
            storeAfterEmail.submissions[subIdx].email_notification_status = "failed";
            storeAfterEmail.submissions[subIdx].email_notification_error = emailResult.error;
        }
        if (jobIdx !== -1) {
            storeAfterEmail.notificationJobs[jobIdx].status = "failed";
            storeAfterEmail.notificationJobs[jobIdx].last_error = emailResult.error;
            storeAfterEmail.notificationJobs[jobIdx].updated_at = new Date().toISOString();
        }
    }

    saveStore(storeAfterEmail);

    return {
        success: true,
        reference,
        emailSent: emailResult.success,
        emailError: emailResult.error,
    };
}

export async function getSubmissions(): Promise<Submission[]> {
    if (supabaseServer) {
        try {
            const { data, error } = await supabaseServer
                .from("submissions")
                .select("*")
                .order("created_at", { ascending: false });
            if (!error && data) {
                return data;
            }
        } catch {
            // fallback
        }
    }
    const store = ensureDataStore();
    return store.submissions;
}

export async function retryNotification(submissionId: string) {
    const store = ensureDataStore();
    const sub = store.submissions.find((s) => s.id === submissionId);
    if (!sub) return { success: false, error: "Aanmelding niet gevonden" };

    const emailResult = await sendSubmissionNotification({
        artistName: sub.artist_name,
        email: sub.email,
        phone: sub.phone,
        instagram: sub.instagram,
        tiktok: sub.tiktok,
        reference: sub.reference,
        submittedAt: new Date(sub.created_at).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" }),
    });

    if (emailResult.success) {
        sub.email_notification_status = "sent";
        sub.email_message_id = emailResult.messageId;
        sub.email_notification_sent_at = new Date().toISOString();
        sub.email_notification_error = null;
    } else {
        sub.email_notification_status = "failed";
        sub.email_notification_error = emailResult.error;
    }
    saveStore(store);
    return emailResult;
}

// -------------------------------------------------------------
// CMS: CONTENT, ROADMAP, SPONSORS
// -------------------------------------------------------------

export async function getSiteContent(previewDraft = false): Promise<SiteContent> {
    const store = ensureDataStore();
    return previewDraft ? store.draftContent : store.publishedContent;
}

export async function updateDraftContent(content: Partial<SiteContent>, actor: string) {
    const store = ensureDataStore();
    store.draftContent = {
        ...store.draftContent,
        ...content,
        version: store.publishedContent.version + 1,
        status: "draft",
        updated_at: new Date().toISOString(),
        updated_by: actor,
    };
    store.auditLogs.unshift({
        id: crypto.randomUUID(),
        action: "UPDATE_DRAFT",
        entity: "content",
        actor_id: actor,
        details: "Concept websitecontent bijgewerkt",
        timestamp: new Date().toISOString(),
    });
    saveStore(store);
    return store.draftContent;
}

export async function publishContent(actor: string) {
    const store = ensureDataStore();
    const newPublished: SiteContent = {
        ...store.draftContent,
        status: "published",
        updated_at: new Date().toISOString(),
        updated_by: actor,
    };
    store.publishedContent = newPublished;
    store.contentHistory.unshift(newPublished);
    store.auditLogs.unshift({
        id: crypto.randomUUID(),
        action: "PUBLISH_CONTENT",
        entity: "content",
        actor_id: actor,
        details: `Versie ${newPublished.version} gepubliceerd naar live website`,
        timestamp: new Date().toISOString(),
    });
    saveStore(store);
    return newPublished;
}

export async function getRoadmapItems(): Promise<RoadmapItem[]> {
    const store = ensureDataStore();
    return store.roadmapItems.filter((i) => !i.archived).sort((a, b) => a.order_index - b.order_index);
}

export async function saveRoadmapItems(items: RoadmapItem[], actor: string) {
    const store = ensureDataStore();
    store.roadmapItems = items;
    store.auditLogs.unshift({
        id: crypto.randomUUID(),
        action: "UPDATE_ROADMAP",
        entity: "roadmap",
        actor_id: actor,
        details: `${items.length} roadmap-fases bijgewerkt/geordend`,
        timestamp: new Date().toISOString(),
    });
    saveStore(store);
    return store.roadmapItems;
}

export async function getSponsorPackages(): Promise<SponsorPackage[]> {
    const store = ensureDataStore();
    return store.sponsorPackages.filter((p) => !p.archived).sort((a, b) => a.order_index - b.order_index);
}

export async function saveSponsorPackages(packages: SponsorPackage[], actor: string) {
    const store = ensureDataStore();
    store.sponsorPackages = packages;
    store.auditLogs.unshift({
        id: crypto.randomUUID(),
        action: "UPDATE_SPONSORS",
        entity: "sponsors",
        actor_id: actor,
        details: `${packages.length} sponsorpakketten bijgewerkt/geordend`,
        timestamp: new Date().toISOString(),
    });
    saveStore(store);
    return store.sponsorPackages;
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
    const store = ensureDataStore();
    return store.auditLogs;
}
