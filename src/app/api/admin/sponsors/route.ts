import { auth } from "@/auth";
import { getSponsorPackages, saveSponsorPackages } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    const session = await auth();
    if (!session?.user || !session.user.isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const packages = await getSponsorPackages();
    return NextResponse.json({ packages });
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || !session.user.isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const actor = session.user.username || session.user.name || "Admin";
        const saved = await saveSponsorPackages(body.packages || [], actor);
        return NextResponse.json({ ok: true, packages: saved });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Fout bij opslaan sponsorpakketten" },
            { status: 500 }
        );
    }
}
