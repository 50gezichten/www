import { auth, signOut } from "@/auth";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";
import AdminNav from "./AdminNav";

export const metadata = {
    title: "Beheerpaneel | 50 Gezichten 50 Gedichten",
};

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    // The login page renders without the sidebar
    // However, layout wraps children, so we check if session exists
    if (!session?.user) {
        // If not logged in, children will be handled by middleware or login page
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-black flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-white border-r border-black/10 flex flex-col justify-between shrink-0">
                <div>
                    <div className="p-6 border-b border-black/10 flex items-center justify-between">
                        <Link href="/admin" className="flex items-center gap-3">
                            <Image
                                src="/img/logo.png"
                                alt="50 Gezichten"
                                width={120}
                                height={70}
                                className="h-9 w-auto"
                            />
                            <div>
                                <span className="font-bold text-sm block leading-tight">50 Gezichten</span>
                                <span className="text-xs text-black/50">CMS Dashboard</span>
                            </div>
                        </Link>
                    </div>

                    <AdminNav />
                </div>

                <div className="p-4 border-t border-black/10 bg-black/[0.02]">
                    <div className="flex items-center gap-3 mb-3">
                        {session.user.image ? (
                            <img
                                src={session.user.image}
                                alt={session.user.name || "Admin"}
                                className="w-8 h-8 rounded-full border border-black/20"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
                                {session.user.name?.[0] || "A"}
                            </div>
                        )}
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold truncate">{session.user.name || session.user.username}</p>
                            <p className="text-[11px] text-black/50 truncate">GitHub Geautoriseerd</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-black/5 text-xs">
                        <Link href="/" target="_blank" className="text-black/70 hover:underline flex items-center gap-1">
                            Live site ↗
                        </Link>
                        <form
                            action={async () => {
                                "use server";
                                await signOut({ redirectTo: "/admin/login" });
                            }}
                        >
                            <button type="submit" className="text-red-600 hover:underline font-medium">
                                Uitloggen
                            </button>
                        </form>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 overflow-y-auto">
                <div className="max-w-6xl mx-auto p-4 md:p-8">{children}</div>
            </main>
        </div>
    );
}
