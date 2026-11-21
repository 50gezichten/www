"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function LoginForm() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");
    const [isLoading, setIsLoading] = useState(false);
    const [missingConfig, setMissingConfig] = useState<string[] | null>(null);

    useEffect(() => {
        if (error === "Configuration") {
            fetch("/api/auth/status")
                .then((res) => res.json())
                .then((data) => {
                    const missing: string[] = [];
                    if (!data.AUTH_SECRET) missing.push("AUTH_SECRET");
                    if (!data.AUTH_GITHUB_ID) missing.push("AUTH_GITHUB_ID (of GITHUB_ID)");
                    if (!data.AUTH_GITHUB_SECRET) missing.push("AUTH_GITHUB_SECRET (of GITHUB_SECRET)");
                    if (!data.ADMIN_GITHUB_IDS) missing.push("ADMIN_GITHUB_IDS");
                    setMissingConfig(missing);
                })
                .catch(() => {});
        }
    }, [error]);

    const handleLogin = () => {
        setIsLoading(true);
        signIn("github", { callbackUrl: "/admin" });
    };

    return (
        <div className="w-full max-w-md bg-white border-2 border-black rounded-2xl p-8 shadow-xl">
            <div className="flex flex-col items-center mb-8">
                <Image
                    src="/img/logo.png"
                    alt="50 Gezichten 50 Gedichten"
                    width={180}
                    height={120}
                    className="h-auto w-40 mb-4"
                />
                <h1 className="text-2xl font-bold tracking-tight">CMS Beheerpaneel</h1>
                <p className="text-sm text-black/60 mt-1">50 Gezichten 50 Gedichten</p>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-300 text-red-800 text-sm">
                    {error === "AccessDenied" ? (
                        "Toegang geweigerd: Jouw GitHub-account staat niet op de beheerders-allowlist (ADMIN_GITHUB_IDS)."
                    ) : error === "Configuration" ? (
                        <div className="space-y-2">
                            <p className="font-semibold">
                                Configuratiefout: De authenticatie-instellingen ontbreken of zijn onjuist geconfigureerd in Vercel.
                            </p>
                            {missingConfig && missingConfig.length > 0 && (
                                <div className="text-xs mt-2 p-2.5 bg-red-100/70 rounded border border-red-200">
                                    <p className="font-medium mb-1 text-red-900">Ontbrekende variabelen in Vercel:</p>
                                    <ul className="list-disc pl-4 space-y-0.5 text-red-800">
                                        {missingConfig.map((v) => (
                                            <li key={v} className="font-mono">{v}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : error === "OAuthSignin" || error === "OAuthCallback" ? (
                        "GitHub OAuth-fout: Er kon geen verbinding worden gemaakt met GitHub. Controleer de callback-URL en OAuth-gegevens."
                    ) : (
                        "Er is een authenticatiefout opgetreden. Probeer het opnieuw."
                    )}
                </div>
            )}

            <button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-black text-white rounded-lg font-medium flex items-center justify-center gap-3 hover:bg-black/85 transition-all duration-200 disabled:opacity-50"
            >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                {isLoading ? "Bezig met doorsturen..." : "Inloggen met GitHub"}
            </button>

            <div className="mt-8 pt-6 border-t border-black/10 text-center text-xs text-black/50">
                Alleen vooraf geautoriseerde GitHub-accounts hebben toegang tot dit beheersysteem.
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
            <Suspense fallback={<div>Laden...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    );
}
