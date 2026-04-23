import { NextResponse } from "next/server";
import { Resend } from "resend";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const { artistName, email, phone, instagram, tiktok } = body;

        if (!artistName || !email || !phone) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const { error } = await supabaseServer.from("submissions").insert({
            artist_name: artistName,
            email,
            phone,
            instagram: instagram || null,
            tiktok: tiktok || null,
        });

        if (error) {
            console.error("Supabase insert error:", error);
            return NextResponse.json(
                { error: "Failed to save submission" },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Route error:", error);
        return NextResponse.json(
            { error: "Invalid request" },
            { status: 500 }
        );
    }
}
