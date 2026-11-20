import { auth } from "@/auth";
import crypto from "crypto";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase-server";
import {
    detectImageFormat,
    MAX_FILE_SIZE,
    ALLOWED_MIME_TYPES,
    ALLOWED_EXTENSIONS,
    EXPECTED_MIMES_FOR_EXT,
} from "@/lib/upload-security";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || !session.user.isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });
        }

        const ext = path.extname(file.name).toLowerCase();

        // 1. Explicit rejection of SVG uploads
        if (ext === ".svg" || file.type === "image/svg+xml") {
            return NextResponse.json(
                {
                    error: "SVG-uploads zijn om veiligheidsredenen voorlopig uitgeschakeld. Alleen JPG, PNG en WebP zijn toegestaan.",
                },
                { status: 400 }
            );
        }

        // 2. File extension check
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return NextResponse.json(
                {
                    error: "Ongeldige bestandsextensie. Alleen .jpg, .jpeg, .png en .webp zijn toegestaan.",
                },
                { status: 400 }
            );
        }

        // 3. Declared MIME type check
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                {
                    error: "Ongeldig bestandstype. Alleen JPEG, PNG en WebP zijn toegestaan.",
                },
                { status: 400 }
            );
        }

        // 4. File size check (max 5MB)
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "Bestand is te groot. Maximale bestandsgrootte is 5MB." },
                { status: 400 }
            );
        }

        // 5. Inspect magic bytes / file content signature
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const detectedFormat = detectImageFormat(buffer);
        if (!detectedFormat) {
            return NextResponse.json(
                {
                    error: "Ongeldige bestandsinhoud. Het bestand komt niet overeen met een geldig JPEG-, PNG- of WebP-formaat.",
                },
                { status: 400 }
            );
        }

        // 6. Verify declared extension matches actual content signature
        if (EXPECTED_MIMES_FOR_EXT[ext] !== detectedFormat) {
            return NextResponse.json(
                {
                    error: "Bestandsextensie komt niet overeen met de werkelijke inhoud van de afbeelding.",
                },
                { status: 400 }
            );
        }

        if (file.type !== detectedFormat) {
            return NextResponse.json(
                {
                    error: "Opgegeven bestandstype komt niet overeen met de werkelijke inhoud van de afbeelding.",
                },
                { status: 400 }
            );
        }

        // 7. Sanitize filename and use canonical extension
        const cleanName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 50) || "afbeelding";
        const uniqueId = crypto.randomBytes(4).toString("hex");
        const safeExt =
            detectedFormat === "image/jpeg"
                ? (ext === ".jpeg" ? ".jpeg" : ".jpg")
                : (detectedFormat === "image/png" ? ".png" : ".webp");
        const filename = `${cleanName}-${uniqueId}${safeExt}`;

        const client = supabaseAdmin || supabaseServer;

        // 8. Upload to Supabase Storage if configured
        if (client) {
            const { data: uploadData, error: uploadError } = await client.storage
                .from("media")
                .upload(filename, buffer, {
                    contentType: detectedFormat,
                    upsert: true,
                });

            if (!uploadError && uploadData) {
                const { data: publicUrlData } = client.storage
                    .from("media")
                    .getPublicUrl(filename);

                return NextResponse.json({
                    ok: true,
                    url: publicUrlData.publicUrl,
                    filename,
                    size: file.size,
                    type: detectedFormat,
                });
            } else if (uploadError) {
                console.warn("[Supabase Storage Error]", uploadError.message);
            }
        }

        // 9. If Supabase Storage is not active or failed, return clear configuration error
        return NextResponse.json(
            {
                error: "Permanente media-opslag vereist een geconfigureerde Supabase Storage bucket ('media'). Voer de SQL migratie uit in Supabase.",
            },
            { status: 503 }
        );
    } catch (err) {
        console.error("[Upload Error]", err);
        return NextResponse.json(
            { error: "Er is een fout opgetreden bij het uploaden van het bestand." },
            { status: 500 }
        );
    }
}
