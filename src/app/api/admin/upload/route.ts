import { auth } from "@/auth";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

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

        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const ext = path.extname(file.name) || ".png";
        const cleanName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9-_]/g, "");
        const uniqueId = crypto.randomBytes(4).toString("hex");
        const filename = `${cleanName}-${uniqueId}${ext}`;
        const filePath = path.join(uploadDir, filename);

        fs.writeFileSync(filePath, buffer);

        const publicUrl = `/uploads/${filename}`;
        return NextResponse.json({
            ok: true,
            url: publicUrl,
            filename,
            size: file.size,
            type: file.type,
        });
    } catch (err) {
        console.error("[Upload Error]", err);
        return NextResponse.json(
            { error: "Er is een fout opgetreden bij het uploaden van het bestand." },
            { status: 500 }
        );
    }
}
