import { auth } from "@/auth";
import crypto from "crypto";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase-server";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Ongeldig bestandstype. Alleen JPG, PNG, WebP en SVG zijn toegestaan." },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "Bestand is te groot. Maximale bestandsgrootte is 5MB." },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const ext = path.extname(file.name) || ".png";
        const cleanName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9-_]/g, "");
        const uniqueId = crypto.randomBytes(4).toString("hex");
        const filename = `${cleanName}-${uniqueId}${ext}`;

        const client = supabaseAdmin || supabaseServer;

        // 1. Upload to Supabase Storage if configured
        if (client) {
            const { data: uploadData, error: uploadError } = await client.storage
                .from("media")
                .upload(filename, buffer, {
                    contentType: file.type,
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
                    type: file.type,
                });
            } else if (uploadError) {
                console.warn("[Supabase Storage Error]", uploadError.message);
            }
        }

        // 2. If Supabase Storage is not active or failed, return clear configuration error
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
