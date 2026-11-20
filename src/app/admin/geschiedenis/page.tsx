import { requireAdmin } from "@/lib/auth-guard";
import { getAuditLogs } from "@/lib/db";

export default async function GeschiedenisAdminPage() {
    await requireAdmin();
    const logs = await getAuditLogs();

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="pb-6 border-b border-black/10">
                <h1 className="text-3xl font-bold tracking-tight">Wijzigingsgeschiedenis</h1>
                <p className="text-black/60 text-sm mt-1">
                    Volledige audit-log van wie welke content, roadmap-fases of sponsorpakketten heeft gewijzigd of gepubliceerd.
                </p>
            </div>

            <div className="bg-white border border-black/10 rounded-xl overflow-hidden shadow-sm">
                {logs.length === 0 ? (
                    <div className="p-12 text-center text-black/50 text-sm">
                        Nog geen audit events vastgelegd.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-black/[0.02] border-b border-black/10 text-xs font-bold uppercase text-black/60">
                                <tr>
                                    <th className="py-3 px-4">Tijdstip</th>
                                    <th className="py-3 px-4">Gebruiker</th>
                                    <th className="py-3 px-4">Actie</th>
                                    <th className="py-3 px-4">Onderdeel</th>
                                    <th className="py-3 px-4">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-black/[0.01]">
                                        <td className="py-3 px-4 text-xs text-black/60 whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleString("nl-NL")}
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-xs text-black">
                                            {log.actor_name || log.actor_id}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="inline-block px-2 py-0.5 rounded font-mono text-[11px] bg-black/5 font-semibold">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-xs font-medium text-black/70 capitalize">
                                            {log.entity}
                                        </td>
                                        <td className="py-3 px-4 text-xs text-black/80">{log.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
