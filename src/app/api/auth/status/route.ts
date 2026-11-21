import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    return NextResponse.json({
        AUTH_SECRET: !!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
        AUTH_GITHUB_ID: !!(process.env.AUTH_GITHUB_ID || process.env.GITHUB_ID),
        AUTH_GITHUB_SECRET: !!(process.env.AUTH_GITHUB_SECRET || process.env.GITHUB_SECRET),
        ADMIN_GITHUB_IDS: !!(process.env.ADMIN_GITHUB_IDS && process.env.ADMIN_GITHUB_IDS.trim()),
        SUPABASE_CONFIGURED: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
        RESEND_CONFIGURED: !!process.env.RESEND_API_KEY,
        AUTH_URL: process.env.AUTH_URL || process.env.NEXTAUTH_URL || null,
    });
}
