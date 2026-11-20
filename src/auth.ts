import NextAuth, { type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            githubId?: string;
            username?: string;
            isAdmin?: boolean;
        } & DefaultSession["user"];
    }
}

interface GitHubProfileLike {
    id?: number | string;
    login?: string;
    [key: string]: unknown;
}

/**
 * Checks whether a GitHub profile or user ID is authorized based exclusively
 * on the ADMIN_GITHUB_IDS environment variable.
 * Returns true if allowed, false otherwise.
 */
export function isAllowedAdmin(
    profile?: GitHubProfileLike | null,
    userId?: string | null
): boolean {
    const rawAdminIds = process.env.ADMIN_GITHUB_IDS;
    if (!rawAdminIds || !rawAdminIds.trim()) {
        return false;
    }

    const allowedIds = rawAdminIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    if (allowedIds.length === 0) {
        return false;
    }

    const profileGithubId = profile?.id != null ? String(profile.id) : (userId ? String(userId) : null);
    const profileLogin = typeof profile?.login === "string" ? profile.login.toLowerCase() : null;

    const idMatches = profileGithubId ? allowedIds.includes(profileGithubId) : false;
    const loginMatches = profileLogin ? allowedIds.map((c) => c.toLowerCase()).includes(profileLogin) : false;

    return idMatches || loginMatches;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    trustHost: true,
    providers: [
        GitHub({
            clientId: process.env.AUTH_GITHUB_ID || process.env.GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET || process.env.GITHUB_SECRET,
            profile(profile) {
                return {
                    id: String(profile.id),
                    name: profile.name || profile.login,
                    email: profile.email,
                    image: profile.avatar_url,
                    username: profile.login,
                    githubId: String(profile.id),
                };
            },
        }),
    ],
    pages: {
        signIn: "/admin/login",
        error: "/admin/login",
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            // Require GitHub OAuth provider
            if (account?.provider !== "github") {
                return false;
            }

            const isAuthorized = isAllowedAdmin(profile as GitHubProfileLike | undefined, user?.id);

            if (!isAuthorized) {
                const profileGithubId = profile?.id != null ? String(profile.id) : user?.id;
                console.warn(
                    `[Auth] Unauthorized GitHub sign-in attempt: ID=${profileGithubId || "unknown"}`
                );
                return false;
            }

            return true;
        },
        async jwt({ token, profile, user }) {
            if (profile) {
                token.githubId = String(profile.id);
                token.username = profile.login;
                token.isAdmin = true;
            }
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                const isStillAdmin = isAllowedAdmin(
                    { id: token.githubId as string, login: token.username as string },
                    (token.id as string) || (token.sub as string)
                );
                session.user.id = (token.id as string) || (token.sub as string);
                session.user.githubId = token.githubId as string;
                session.user.username = token.username as string;
                session.user.isAdmin = isStillAdmin && !!token.isAdmin;
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});
