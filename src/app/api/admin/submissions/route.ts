import { auth } from "@/auth";
import { deleteSubmission, getSubmissions, retryNotification } from "@/lib/db";
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

        if (action === "delete" && submissionId) {
            const result = await deleteSubmission(submissionId);
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

export async function DELETE(request: NextRequest) {
    const session = await auth();
    if (!session?.user || !session.user.isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        let id = searchParams.get("id");

        if (!id) {
            try {
                const body = await request.json();
                id = body.id || body.submissionId;
            } catch {
                // Ignore json parsing error if no body
            }
        }

        if (!id) {
            return NextResponse.json({ error: "Aanmeldings-ID is verplicht" }, { status: 400 });
        }

        const result = await deleteSubmission(id);
        if (!result.success) {
            return NextResponse.json({ error: result.error || "Fout bij verwijderen" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Fout bij verwerken" },
            { status: 500 }
        );
    }
}
