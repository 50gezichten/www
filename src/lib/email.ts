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
    const subject = `Nieuwe aanmelding 50 Gezichten 50 Gedichten: ${params.artistName}`;

    const textContent = `
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

    const htmlContent = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
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
          <p style="margin: 4px 0 0; font-size: 18px; font-weight: 700; font-family: monospace;">${params.reference}</p>
        </div>

        <table width="100%" style="border-collapse: collapse; font-size: 15px;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; width: 140px; font-weight: 600;">Artiestennaam:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 700; color: #000;">${params.artistName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-weight: 600;">E-mailadres:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="mailto:${params.email}" style="color: #000; text-decoration: underline;">${params.email}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-weight: 600;">Telefoonnummer:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="tel:${params.phone}" style="color: #000; text-decoration: none;">${params.phone}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-weight: 600;">Instagram:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${params.instagram ? `<a href="https://instagram.com/${params.instagram.replace('@', '')}" style="color: #000;">${params.instagram}</a>` : '<span style="color: #999;">Niet opgegeven</span>'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-weight: 600;">TikTok:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${params.tiktok ? `<a href="https://tiktok.com/@${params.tiktok.replace('@', '')}" style="color: #000;">${params.tiktok}</a>` : '<span style="color: #999;">Niet opgegeven</span>'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #666; font-weight: 600;">Tijdstip:</td>
            <td style="padding: 10px 0; color: #666;">${params.submittedAt}</td>
          </tr>
        </table>

        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
          <a href="mailto:${params.email}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">Beantwoord artiest</a>
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
