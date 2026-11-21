import { auth } from "@/auth";
import { getSiteContent, publishContent, setSupportVisibility, updateDraftContent } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user || !session.user.isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const previewDraft = searchParams.get("draft") === "true";
    const content = await getSiteContent(previewDraft);

    return NextResponse.json({ content });
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || !session.user.isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const actor = session.user.username || session.user.name || "Admin";
        const updated = await updateDraftContent(body, actor);
        return NextResponse.json({ ok: true, content: updated });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Fout bij opslaan concept" },
            { status: 500 }
        );
    }
}

export async function PUT() {
    const session = await auth();
    if (!session?.user || !session.user.isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const actor = session.user.username || session.user.name || "Admin";
        const published = await publishContent(actor);
        return NextResponse.json({ ok: true, content: published, message: "Succesvol gepubliceerd!" });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Fout bij publiceren" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    const session = await auth();
    if (!session?.user || !session.user.isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const actor = session.user.username || session.user.name || "Admin";
        if (typeof body.enabled === "boolean") {
            const updated = await setSupportVisibility(body.enabled, actor);
            return NextResponse.json({ ok: true, support: updated.support });
        }
        return NextResponse.json({ error: "Ongeldige status ontvangen" }, { status: 400 });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Fout bij wijzigen zichtbaarheid" },
            { status: 500 }
        );
    }
}
