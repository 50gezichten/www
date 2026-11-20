import { requireAdmin } from "@/lib/auth-guard";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/supabase-server";

export default async function InstellingenPage() {
    await requireAdmin();

    const dbConfigured = isSupabaseConfigured();
    const adminKeyConfigured = isSupabaseAdminConfigured();

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="pb-6 border-b border-black/10">
                <h1 className="text-3xl font-bold tracking-tight">Website-instellingen</h1>
                <p className="text-black/60 text-sm mt-1">
                    Configuratie en serverparameters voor permanente Supabase opslag, e-mailnotificaties en GitHub authenticatie.
                </p>
            </div>

            <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm space-y-6">
                <h2 className="text-lg font-bold border-b border-black/10 pb-3">Database & Permanente Opslag (Supabase)</h2>
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
                            Service Role Key Status
                        </span>
                        <div
                            className={`p-3 rounded-lg text-xs font-semibold ${
                                adminKeyConfigured
                                    ? "bg-emerald-50 text-emerald-800"
                                    : "bg-amber-50 text-amber-800"
                            }`}
                        >
                            {adminKeyConfigured
                                ? "✓ SUPABASE_SERVICE_ROLE_KEY ingesteld"
                                : "⚠️ SUPABASE_SERVICE_ROLE_KEY ontbreekt in Vercel"}
                        </div>
                    </div>
                </div>

                {!dbConfigured && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs leading-relaxed">
                        <strong>Let op:</strong> Supabase is momenteel niet geconfigureerd. Voeg de variabelen{" "}
                        <code>NEXT_PUBLIC_SUPABASE_URL</code> en <code>SUPABASE_SERVICE_ROLE_KEY</code> toe in de Vercel projectinstellingen om permanente database-opslag in te schakelen.
                    </div>
                )}
            </div>

            <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm space-y-6">
                <h2 className="text-lg font-bold border-b border-black/10 pb-3">E-mail & Notificaties (Resend)</h2>
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
                            Resend API Sleutel
                        </span>
                        <div className="p-3 bg-black/5 rounded-lg text-xs">
                            {process.env.RESEND_API_KEY ? "✓ Geconfigureerd" : "⚠️ API-key ontbreekt"}
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
                            {process.env.ADMIN_GITHUB_IDS || "Niet geconfigureerd (toegang geweigerd)"}
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
                    </div>
                </div>
            </div>
        </div>
    );
}
