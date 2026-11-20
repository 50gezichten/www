import { requireAdmin } from "@/lib/auth-guard";
import { getAuditLogs, getRoadmapItems, getSiteContent, getSponsorPackages, getSubmissions } from "@/lib/db";
import Link from "next/link";
import PublishBanner from "./PublishBanner";

export default async function AdminDashboardPage() {
    const session = await requireAdmin();
    const [submissions, content, roadmap, sponsors, logs] = await Promise.all([
        getSubmissions(),
        getSiteContent(),
        getRoadmapItems(),
        getSponsorPackages(),
        getAuditLogs(),
    ]);

    const failedEmails = submissions.filter((s) => s.email_notification_status === "failed");
    const activeRoadmap = roadmap.find((r) => r.active);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-black/10">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-black/60 text-sm mt-1">
                        Welkom terug, {session?.user?.name || session?.user?.username || "Beheerder"}.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/"
                        target="_blank"
                        className="px-4 py-2 border border-black rounded-lg text-sm font-medium hover:bg-black/5 transition"
                    >
                        Bekijk live website ↗
                    </Link>
                </div>
            </div>

            {/* Publication Banner */}
            <PublishBanner currentVersion={content.version} updatedAt={content.updated_at} />

            {/* Notification alert if any failed */}
            {failedEmails.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-amber-900 text-sm">
                            ⚠️ Let op: {failedEmails.length} e-mailnotificatie(s) zijn niet afgeleverd
                        </h3>
                        <p className="text-amber-800 text-xs mt-1">
                            Aanmeldingen zijn veilig opgeslagen in de database. Je kunt mislukte notificaties opnieuw verzenden vanuit het aanmeldingenoverzicht.
                        </p>
                    </div>
                    <Link
                        href="/admin/aanmeldingen"
                        className="shrink-0 px-3 py-1.5 bg-amber-900 text-white rounded-lg text-xs font-semibold hover:bg-amber-800 transition"
                    >
                        Bekijken
                    </Link>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-xs font-semibold text-black/50 uppercase tracking-wider block">
                        Totaal Aanmeldingen
                    </span>
                    <span className="text-3xl font-extrabold mt-2 block">{submissions.length}</span>
                    <span className="text-xs text-black/60 mt-1 block">
                        {submissions.filter((s) => s.status === "new").length} nieuw ter beoordeling
                    </span>
                </div>

                <div className="bg-white border border-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-xs font-semibold text-black/50 uppercase tracking-wider block">
                        Notificatiestatus
                    </span>
                    <span className="text-3xl font-extrabold mt-2 block">
                        {submissions.filter((s) => s.email_notification_status === "sent").length} / {submissions.length}
                    </span>
                    <span className="text-xs text-emerald-600 font-medium mt-1 block">
                        ✓ verzonden naar 50gezichten@gmail.com
                    </span>
                </div>

                <div className="bg-white border border-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-xs font-semibold text-black/50 uppercase tracking-wider block">
                        Actieve Roadmap-fase
                    </span>
                    <span className="text-base font-bold mt-2 block truncate" title={activeRoadmap?.title || "Geen"}>
                        {activeRoadmap?.title || "Geen fase actief"}
                    </span>
                    <span className="text-xs text-black/60 mt-1 block truncate">
                        {activeRoadmap?.duration || "—"}
                    </span>
                </div>

                <div className="bg-white border border-black/10 rounded-xl p-5 shadow-sm">
                    <span className="text-xs font-semibold text-black/50 uppercase tracking-wider block">
                        Sponsorpakketten
                    </span>
                    <span className="text-3xl font-extrabold mt-2 block">{sponsors.length}</span>
                    <span className="text-xs text-black/60 mt-1 block">actief in carrousel</span>
                </div>
            </div>

            {/* Recent Submissions & Quick Navigation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left 2 Cols: Submissions */}
                <div className="lg:col-span-2 bg-white border border-black/10 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-lg">Recente Aanmeldingen</h2>
                        <Link href="/admin/aanmeldingen" className="text-xs font-semibold text-black hover:underline">
                            Bekijk alle ({submissions.length}) →
                        </Link>
                    </div>

                    {submissions.length === 0 ? (
                        <div className="py-12 text-center text-black/50 text-sm">
                            Nog geen aanmeldingen binnengekomen via het formulier.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-black/10 text-xs font-bold uppercase text-black/50">
                                        <th className="pb-3">Artiest</th>
                                        <th className="pb-3">Referentie</th>
                                        <th className="pb-3">E-mail</th>
                                        <th className="pb-3">Notificatie</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {submissions.slice(0, 5).map((sub) => (
                                        <tr key={sub.id} className="hover:bg-black/[0.02]">
                                            <td className="py-3 font-semibold">{sub.artist_name}</td>
                                            <td className="py-3 font-mono text-xs">{sub.reference}</td>
                                            <td className="py-3 text-black/70">{sub.email}</td>
                                            <td className="py-3">
                                                {sub.email_notification_status === "sent" ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                                        Verzonden
                                                    </span>
                                                ) : sub.email_notification_status === "failed" ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                        Mislukt
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                        In behandeling
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Right Col: Quick Modules */}
                <div className="space-y-6">
                    <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm">
                        <h2 className="font-bold text-lg mb-4">Snelle modules</h2>
                        <div className="space-y-3">
                            <Link
                                href="/admin/teksten"
                                className="block p-3 rounded-lg border border-black/10 hover:border-black transition"
                            >
                                <span className="font-semibold text-sm block">✍️ Teksten aanpassen</span>
                                <span className="text-xs text-black/60">Over ons, hero tagline en contactgegevens</span>
                            </Link>
                            <Link
                                href="/admin/roadmap"
                                className="block p-3 rounded-lg border border-black/10 hover:border-black transition"
                            >
                                <span className="font-semibold text-sm block">🗺️ Roadmap bewerken</span>
                                <span className="text-xs text-black/60">Fases activeren, herschikken of toevoegen</span>
                            </Link>
                            <Link
                                href="/admin/sponsors"
                                className="block p-3 rounded-lg border border-black/10 hover:border-black transition"
                            >
                                <span className="font-semibold text-sm block">💎 Sponsorkaarten</span>
                                <span className="text-xs text-black/60">Prijzen, voordelen en foto&apos;s beheren</span>
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm">
                        <h2 className="font-bold text-sm mb-3">Laatste activiteit</h2>
                        <div className="space-y-2 text-xs">
                            {logs.slice(0, 4).map((log) => (
                                <div key={log.id} className="pb-2 border-b border-black/5 last:border-none">
                                    <p className="font-semibold">{log.details}</p>
                                    <p className="text-black/40 mt-0.5">
                                        Door {log.actor_name || log.actor_id} • {new Date(log.timestamp).toLocaleDateString("nl-NL")}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
