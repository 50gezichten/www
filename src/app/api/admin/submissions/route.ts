import { auth } from "@/auth";
import { getSubmissions, retryNotification } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user || !session.user.isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase() || "";
    const status = searchParams.get("status");

    let submissions = await getSubmissions();

    if (query) {
        submissions = submissions.filter(
            (s) =>
                s.artist_name.toLowerCase().includes(query) ||
                s.email.toLowerCase().includes(query) ||
                s.reference.toLowerCase().includes(query) ||
                s.phone.includes(query)
        );
    }

    if (status && status !== "all") {
        submissions = submissions.filter((s) => s.status === status);
    }

    return NextResponse.json({ submissions });
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || !session.user.isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { action, submissionId } = body;

        if (action === "retry_notification" && submissionId) {
            const result = await retryNotification(submissionId);
            return NextResponse.json(result);
        }

        return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Fout bij verwerken" },
            { status: 500 }
        );
    }
}
