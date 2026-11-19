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

const defaultAdminIds = ["278548191", "346629474", "265046697"];

export const { handlers, auth, signIn, signOut } = NextAuth({
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

            const configuredIds = process.env.ADMIN_GITHUB_IDS
                ? process.env.ADMIN_GITHUB_IDS.split(",").map((s) => s.trim())
                : defaultAdminIds;

            const profileGithubId = profile?.id ? String(profile.id) : user.id;
            const profileLogin = (profile?.login as string)?.toLowerCase();

            // Check against numeric stable GitHub ID or configured usernames
            const isAuthorized =
                (profileGithubId ? configuredIds.includes(profileGithubId) : false) ||
                (profileLogin ? configuredIds.map((c) => c.toLowerCase()).includes(profileLogin) : false);

            if (!isAuthorized) {
                console.warn(
                    `[Auth] Unauthorized GitHub sign-in attempt: ID=${profileGithubId}, username=${profileLogin}`
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
                session.user.id = (token.id as string) || (token.sub as string);
                session.user.githubId = token.githubId as string;
                session.user.username = token.username as string;
                session.user.isAdmin = !!token.isAdmin;
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "50gezichten-development-auth-secret-change-in-prod-32c",
});
