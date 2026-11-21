export interface ValidationResult {
    valid: boolean;
    errors: Record<string, string>;
    sanitized: {
        artistName: string;
        email: string;
        phone: string;
        instagram: string | null;
        tiktok: string | null;
    };
}

export function validateSubmission(data: Record<string, unknown>): ValidationResult {
    const errors: Record<string, string> = {};

    // 1. Honeypot check (bot prevention)
    if (data.website || data.hp_confirm || data.company_name) {
        errors.bot = "Bot submission detected";
    }

    // 2. Artist Name
    const rawArtistName = typeof data.artistName === "string" ? data.artistName.trim() : "";
    if (!rawArtistName) {
        errors.artistName = "Artiestennaam is verplicht";
    } else if (rawArtistName.length < 2) {
        errors.artistName = "Artiestennaam moet minimaal 2 tekens bevatten";
    } else if (rawArtistName.length > 100) {
        errors.artistName = "Artiestennaam mag maximaal 100 tekens zijn";
    }

    // 3. Email
    const rawEmail = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!rawEmail || !emailRegex.test(rawEmail) || rawEmail.length > 150) {
        errors.email = "Voer een geldig e-mailadres in";
    }

    // 4. Phone
    const rawPhone = typeof data.phone === "string" ? data.phone.trim() : "";
    // Allow Dutch and international formats: 06-12345678, +31 6 12345678, 0612345678, etc.
    const phoneDigits = rawPhone.replace(/\D/g, "");
    if (!rawPhone || phoneDigits.length < 8 || phoneDigits.length > 15) {
        errors.phone = "Voer een geldig telefoonnummer in";
    }

    // 5. Instagram (optional)
    let sanitizedInstagram: string | null = null;
    if (typeof data.instagram === "string" && data.instagram.trim()) {
        const cleaned = data.instagram.trim();
        if (cleaned.length > 100) {
            errors.instagram = "Instagram mag maximaal 100 tekens zijn";
        } else {
            sanitizedInstagram = cleaned.startsWith("@") ? cleaned : (cleaned.includes("/") ? cleaned : `@${cleaned}`);
        }
    }

    // 6. TikTok (optional)
    let sanitizedTiktok: string | null = null;
    if (typeof data.tiktok === "string" && data.tiktok.trim()) {
        const cleaned = data.tiktok.trim();
        if (cleaned.length > 100) {
            errors.tiktok = "TikTok mag maximaal 100 tekens zijn";
        } else {
            sanitizedTiktok = cleaned.startsWith("@") ? cleaned : (cleaned.includes("/") ? cleaned : `@${cleaned}`);
        }
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
        sanitized: {
            artistName: rawArtistName,
            email: rawEmail,
            phone: rawPhone,
            instagram: sanitizedInstagram,
            tiktok: sanitizedTiktok,
        },
    };
}
