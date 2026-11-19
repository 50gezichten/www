export interface Submission {
    id: string;
    reference: string;
    artist_name: string;
    email: string;
    phone: string;
    instagram?: string | null;
    tiktok?: string | null;
    created_at: string;
    status: "new" | "reviewed" | "accepted" | "rejected";
    notes?: string | null;
    email_notification_status: "pending" | "sent" | "failed";
    email_notification_error?: string | null;
    email_notification_sent_at?: string | null;
    email_message_id?: string | null;
}

export interface NotificationJob {
    id: string;
    submission_id: string;
    reference: string;
    recipient: string;
    subject: string;
    payload: {
        artistName: string;
        email: string;
        phone: string;
        instagram?: string | null;
        tiktok?: string | null;
        submittedAt: string;
        reference: string;
    };
    status: "pending" | "processing" | "sent" | "failed";
    attempts: number;
    max_attempts: number;
    last_error?: string | null;
    created_at: string;
    updated_at: string;
}

export interface RoadmapItem {
    id: string;
    title: string;
    description: string;
    duration: string;
    active: boolean;
    order_index: number;
    archived?: boolean;
}

export interface SponsorPackage {
    id: string;
    title: string;
    price: string;
    image: string;
    benefits: string[];
    order_index: number;
    archived?: boolean;
}

export interface SiteContent {
    id: string;
    version: number;
    status: "draft" | "published";
    hero: {
        tagline: string;
        logo_alt: string;
    };
    about: {
        title: string;
        lead_highlight: string;
        paragraph_1: string;
        paragraph_2: string;
    };
    aanmelden: {
        title: string;
        description: string;
    };
    support: {
        title: string;
        intro: string;
        custom_package_text: string;
        custom_package_email: string;
    };
    contact: {
        title: string;
        email: string;
        instagram_url: string;
        facebook_url: string;
        tiktok_url: string;
    };
    footer: {
        copyright_text: string;
    };
    updated_at: string;
    updated_by?: string | null;
}

export interface AuditLogEntry {
    id: string;
    action: string;
    entity: string;
    entity_id?: string;
    actor_id: string;
    actor_name?: string;
    details?: string;
    timestamp: string;
}

export interface AdminUser {
    id: string;
    github_id: string;
    username: string;
    name?: string;
    email?: string;
    avatar_url?: string;
    role: "admin";
}
