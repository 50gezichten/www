import { auth } from "@/auth";
import { getRoadmapItems, saveRoadmapItems } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    const session = await auth();
    if (!session?.user || !session.user.isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await getRoadmapItems();
    return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || !session.user.isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const actor = session.user.username || session.user.name || "Admin";
        const saved = await saveRoadmapItems(body.items || [], actor);
        return NextResponse.json({ ok: true, items: saved });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Fout bij opslaan roadmap" },
            { status: 500 }
        );
    }
}
