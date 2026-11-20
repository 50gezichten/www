import { NextRequest, NextResponse } from "next/server";
import { validateSubmission } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSubmission } from "@/lib/db";

export async function POST(request: NextRequest) {
    try {
        // 1. Antispam: Rate Limiting
        const ip =
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            request.headers.get("x-real-ip") ||
            "127.0.0.1";

        const rateLimit = checkRateLimit(ip, 5, 10 * 60 * 1000); // 5 submissions per 10 mins
        if (!rateLimit.allowed) {
            return NextResponse.json(
                {
                    error: "Te veel aanmeldingen verstuurd vanaf dit netwerk. Probeer het over een kwartier opnieuw.",
                },
                { status: 429 }
            );
        }

        // 2. Parse body safely
        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Ongeldige gegevens ontvangen" },
                { status: 400 }
            );
        }

        // 3. Validation & Honeypot
        const validation = validateSubmission(body);
        if (!validation.valid) {
            // If honeypot triggered, return 200 without saving to deter bots silently
            if (validation.errors.bot) {
                return NextResponse.json({ ok: true, reference: "50G-CONFIRMED" });
            }

            return NextResponse.json(
                {
                    error: "Validatiefout bij het invullen van het formulier",
                    details: validation.errors,
                },
                { status: 400 }
            );
        }

        // 4. Save submission & trigger email notification
        const result = await createSubmission(validation.sanitized);

        return NextResponse.json({
            ok: true,
            reference: result.reference,
            message: "Aanmelding succesvol ontvangen en opgeslagen.",
        });
    } catch (error) {
        // Log technical error details strictly server-side without leaking personal data, tokens or secrets
        const technicalDetails =
            error instanceof Error ? error.stack || error.message : "Onbekende serverfout";
        console.error("[Aanmelden Server Error]", technicalDetails);

        // Return strictly a generic error message to visitors
        return NextResponse.json(
            {
                error: "Er is een onverwachte serverfout opgetreden bij het verwerken van de aanmelding. Probeer het later opnieuw.",
            },
            { status: 500 }
        );
    }
}
