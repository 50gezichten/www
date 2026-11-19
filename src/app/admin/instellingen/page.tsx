import { auth } from "@/auth";

export default async function InstellingenPage() {
    await auth();

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="pb-6 border-b border-black/10">
                <h1 className="text-3xl font-bold tracking-tight">Website-instellingen</h1>
                <p className="text-black/60 text-sm mt-1">
                    Configuratie en serverparameters voor e-mailnotificaties, beveiliging en integraties.
                </p>
            </div>

            <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm space-y-6">
                <h2 className="text-lg font-bold border-b border-black/10 pb-3">E-mail & Notificaties</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-black/50 mb-1">
                            Ontvanger formuliernotificaties
                        </span>
                        <div className="p-3 bg-black/5 rounded-lg font-mono text-xs">
                            {process.env.NOTIFICATION_EMAIL_TO || "50gezichten@gmail.com"}
                        </div>
                    </div>

                    <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-black/50 mb-1">
                            E-mailprovider
                        </span>
                        <div className="p-3 bg-black/5 rounded-lg text-xs">
                            Resend Transactional Email ({process.env.RESEND_API_KEY ? "✓ Geconfigureerd" : "⚠️ API-key ontbreekt"})
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm space-y-6">
                <h2 className="text-lg font-bold border-b border-black/10 pb-3">Beveiliging & GitHub OAuth</h2>
                <div className="space-y-4 text-sm">
                    <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-black/50 mb-1">
                            Geautoriseerde GitHub Admin User-IDs
                        </span>
                        <div className="p-3 bg-black/5 rounded-lg font-mono text-xs break-all">
                            {process.env.ADMIN_GITHUB_IDS || "278548191, 346629474, 265046697"}
                        </div>
                        <p className="text-xs text-black/50 mt-1">
                            Alleen accounts waarvan het GitHub profiel-ID in deze allowlist staat krijgen toegang tot /admin.
                        </p>
                    </div>

                    <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-black/50 mb-1">
                            OAuth Callback URL
                        </span>
                        <div className="p-3 bg-black/5 rounded-lg font-mono text-xs">
                            https://50gezichten.nl/api/auth/callback/github
                        </div>
                        <p className="text-xs text-black/50 mt-1">
                            Stel deze URL in als &apos;Authorization callback URL&apos; in de GitHub Developer OAuth App settings.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm space-y-6">
                <h2 className="text-lg font-bold border-b border-black/10 pb-3">Database & Storage</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-black/50 mb-1">
                            Supabase Host
                        </span>
                        <div className="p-3 bg-black/5 rounded-lg font-mono text-xs">
                            {process.env.NEXT_PUBLIC_SUPABASE_URL || "Niet geconfigureerd"}
                        </div>
                    </div>
                    <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-black/50 mb-1">
                            Lokale Fail-Safe Persistentie
                        </span>
                        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold">
                            ✓ Actief (Gegevens gaan nooit verloren bij serverless netwerkfouten)
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
