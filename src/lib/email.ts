import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

export interface SendSubmissionEmailParams {
    artistName: string;
    email: string;
    phone: string;
    instagram?: string | null;
    tiktok?: string | null;
    reference: string;
    submittedAt: string;
}

export interface EmailSendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Escapes characters for safe inclusion in HTML text and attributes to prevent XSS / HTML injection.
 */
export function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Escapes attribute values, preventing attribute breakout.
 */
export function escapeHtmlAttr(str: string): string {
    return escapeHtml(str).replace(/`/g, "&#96;");
}

/**
 * Sanitizes an email address for safe inclusion in mailto: href attributes.
 * Removes line breaks, control characters, quotes and angle brackets.
 */
export function sanitizeEmailHref(email: string): string {
    const cleaned = email.trim().replace(/[\r\n\t"<>'\s]/g, "");
    return encodeURI(cleaned);
}

/**
 * Sanitizes a phone number for safe inclusion in tel: href attributes.
 * Allows only standard dialable characters (digits, +, and hyphens).
 */
export function sanitizePhoneHref(phone: string): string {
    const cleaned = phone.trim().replace(/[^0-9+\-]/g, "");
    return encodeURI(cleaned);
}

/**
 * Sanitizes a social media handle for profile links.
 * Allows only alphanumeric characters, dots and underscores.
 */
export function sanitizeSocialHandle(handle?: string | null): string {
    if (!handle) return "";
    return handle.replace(/^@+/, "").trim().replace(/[^a-zA-Z0-9._]/g, "");
}

/**
 * Generates the plain text version of the submission notification email.
 */
export function generateSubmissionNotificationEmailText(
    params: SendSubmissionEmailParams
): string {
    return `
Nieuwe aanmelding voor 50 Gezichten 50 Gedichten

Aanmeldingsreferentie: ${params.reference}
Datum en tijd: ${params.submittedAt}

Gegevens artiest:
- Artiestennaam: ${params.artistName}
- E-mailadres: ${params.email}
- Telefoonnummer: ${params.phone}
- Instagram: ${params.instagram || "Niet opgegeven"}
- TikTok: ${params.tiktok || "Niet opgegeven"}

---
Dit bericht is automatisch gegenereerd via www.50gezichten.nl
Beheeromgeving: https://50gezichten.nl/admin
`.trim();
}

/**
 * Generates the HTML version of the submission notification email with full escaping of all dynamic values.
 */
export function generateSubmissionNotificationEmailHtml(
    params: SendSubmissionEmailParams
): string {
    const rawSubject = `Nieuwe Aanmelding: ${params.artistName}`;
    const safeTitle = escapeHtml(rawSubject.replace(/[\r\n]/g, " ").trim());
    const safeRef = escapeHtml(params.reference);
    const safeArtist = escapeHtml(params.artistName);
    const safeEmailText = escapeHtml(params.email);
    const safeEmailHref = escapeHtmlAttr(sanitizeEmailHref(params.email));
    const safePhoneText = escapeHtml(params.phone);
    const safePhoneHref = escapeHtmlAttr(sanitizePhoneHref(params.phone));
    const safeSubmittedAt = escapeHtml(params.submittedAt);

    const cleanInsta = sanitizeSocialHandle(params.instagram);
    const instaHtml = cleanInsta
        ? `<a href="https://instagram.com/${escapeHtmlAttr(cleanInsta)}" style="color: #000;">${escapeHtml(params.instagram || "")}</a>`
        : '<span style="color: #999;">Niet opgegeven</span>';

    const cleanTikTok = sanitizeSocialHandle(params.tiktok);
    const tiktokHtml = cleanTikTok
        ? `<a href="https://tiktok.com/@${escapeHtmlAttr(cleanTikTok)}" style="color: #000;">${escapeHtml(params.tiktok || "")}</a>`
        : '<span style="color: #999;">Niet opgegeven</span>';

    return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f7; margin: 0; padding: 24px; color: #111;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 2px solid #000; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <tr>
      <td style="padding: 28px 32px; background: #000; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">50 GEZICHTEN 50 GEDICHTEN</h1>
        <p style="color: #ccc; margin: 6px 0 0; font-size: 14px;">Nieuwe aanmelding ontvangen</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <div style="background: #f3f3f3; border-left: 4px solid #000; padding: 12px 16px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 13px; color: #666; text-transform: uppercase; font-weight: 600;">Referentie</p>
          <p style="margin: 4px 0 0; font-size: 18px; font-weight: 700; font-family: monospace;">${safeRef}</p>
        </div>

        <table width="100%" style="border-collapse: collapse; font-size: 15px;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; width: 140px; font-weight: 600;">Artiestennaam:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 700; color: #000;">${safeArtist}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-weight: 600;">E-mailadres:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="mailto:${safeEmailHref}" style="color: #000; text-decoration: underline;">${safeEmailText}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-weight: 600;">Telefoonnummer:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="tel:${safePhoneHref}" style="color: #000; text-decoration: none;">${safePhoneText}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-weight: 600;">Instagram:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${instaHtml}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-weight: 600;">TikTok:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${tiktokHtml}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #666; font-weight: 600;">Tijdstip:</td>
            <td style="padding: 10px 0; color: #666;">${safeSubmittedAt}</td>
          </tr>
        </table>

        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
          <a href="mailto:${safeEmailHref}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">Beantwoord artiest</a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background: #fafafa; padding: 16px 32px; text-align: center; border-top: 1px solid #eee; font-size: 12px; color: #888;">
        © 2026 50 Gezichten 50 Gedichten – Almere
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

export async function sendSubmissionNotification(
    params: SendSubmissionEmailParams
): Promise<EmailSendResult> {
    if (!resendClient) {
        console.warn("[Email Notification] RESEND_API_KEY not configured. Skipping email dispatch.");
        return {
            success: false,
            error: "RESEND_API_KEY is not configured",
        };
    }

    const recipient = process.env.NOTIFICATION_EMAIL_TO || "50gezichten@gmail.com";
    const sender = process.env.NOTIFICATION_EMAIL_FROM || "50 Gezichten <onboarding@resend.dev>";
    const subject = `Nieuwe Aanmelding: ${params.artistName.replace(/[\r\n]/g, " ").trim()}`;

    const textContent = generateSubmissionNotificationEmailText(params);
    const htmlContent = generateSubmissionNotificationEmailHtml(params);

    try {
        const response = await resendClient.emails.send({
            from: sender,
            to: recipient,
            replyTo: params.email,
            subject,
            text: textContent,
            html: htmlContent,
            headers: {
                "X-Entity-Ref-ID": params.reference,
            },
        });

        if (response.error) {
            console.error("[Email Notification Error]", response.error.name, response.error.message);
            return {
                success: false,
                error: response.error.message,
            };
        }

        return {
            success: true,
            messageId: response.data?.id,
        };
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Onbekende e-mailfout";
        console.error("[Email Dispatch Exception]", errorMsg);
        return {
            success: false,
            error: errorMsg,
        };
    }
}
