import { auth } from "@/auth";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";

/**
 * Server-side authorization guard for admin pages.
 * Cryptographically validates the session via Auth.js and ensures the user
 * has an active admin role. Redirects unauthenticated or forged sessions to /admin/login.
 */
export async function requireAdmin(overrideSession?: Session | null) {
    const session = overrideSession !== undefined ? overrideSession : await auth();
    if (!session?.user || !session.user.isAdmin) {
        redirect("/admin/login");
    }
    return session;
}
