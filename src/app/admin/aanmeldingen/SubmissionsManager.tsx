"use client";

import { Submission } from "@/lib/types";
import { useState } from "react";

export default function SubmissionsManager({
    initialSubmissions,
}: {
    initialSubmissions: Submission[];
}) {
    const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [retryingId, setRetryingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);

    const filtered = submissions.filter((s) => {
        const matchesQuery =
            s.artist_name.toLowerCase().includes(search.toLowerCase()) ||
            s.email.toLowerCase().includes(search.toLowerCase()) ||
            s.reference.toLowerCase().includes(search.toLowerCase()) ||
            s.phone.includes(search);

        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "email_failed" && s.email_notification_status === "failed") ||
            (statusFilter === "email_sent" && s.email_notification_status === "sent") ||
            s.status === statusFilter;

        return matchesQuery && matchesStatus;
    });

    const handleDeleteSubmission = async (submissionId: string, artistName: string) => {
        if (!confirm(`Weet je zeker dat je de testaanmelding van "${artistName}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
            return;
        }

        setDeletingId(submissionId);
        setFeedback(null);
        try {
            const res = await fetch(`/api/admin/submissions?id=${submissionId}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setFeedback(`✓ Aanmelding van ${artistName} succesvol verwijderd.`);
                setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
            } else {
                setFeedback(`Verwijderen mislukt: ${data.error || "Onbekende fout"}`);
            }
        } catch {
            setFeedback("Netwerkfout bij verwijderen.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleRetryNotification = async (submissionId: string) => {
        setRetryingId(submissionId);
        setFeedback(null);
        try {
            const res = await fetch("/api/admin/submissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "retry_notification", submissionId }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setFeedback("✓ E-mailnotificatie succesvol verzonden!");
                setSubmissions((prev) =>
                    prev.map((s) =>
                        s.id === submissionId
                            ? { ...s, email_notification_status: "sent", email_notification_error: null }
                            : s
                    )
                );
            } else {
                setFeedback(`E-mail verzenden mislukt: ${data.error || "Onbekende fout"}`);
            }
        } catch {
            setFeedback("Netwerkfout bij opnieuw versturen.");
        } finally {
            setRetryingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {feedback && (
                <div className="p-4 rounded-xl bg-black text-white text-sm font-semibold">
                    {feedback}
                </div>
            )}

            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-xl border border-black/10">
                <input
                    type="text"
                    placeholder="Zoek op artiest, referentie, e-mail..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="px-4 py-2 border border-black/20 rounded-lg text-sm w-full sm:w-80 outline-none focus:ring-2 focus:ring-black"
                />

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-black/20 rounded-lg text-sm outline-none bg-white"
                >
                    <option value="all">Alle statussen</option>
                    <option value="email_failed">⚠️ E-mail mislukt</option>
                    <option value="email_sent">✓ E-mail verzonden</option>
                    <option value="new">Nieuw</option>
                    <option value="reviewed">Beoordeeld</option>
                </select>
            </div>

            {/* Submissions Table */}
            <div className="bg-white border border-black/10 rounded-xl overflow-hidden shadow-sm">
                {filtered.length === 0 ? (
                    <div className="p-12 text-center text-black/50 text-sm">
                        Geen aanmeldingen gevonden die voldoen aan de zoekcriteria.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-black/[0.02] border-b border-black/10 text-xs font-bold uppercase text-black/60">
                                <tr>
                                    <th className="py-3 px-4">Referentie</th>
                                    <th className="py-3 px-4">Artiestennaam</th>
                                    <th className="py-3 px-4">Contact</th>
                                    <th className="py-3 px-4">Socials</th>
                                    <th className="py-3 px-4">Datum</th>
                                    <th className="py-3 px-4">E-mailstatus</th>
                                    <th className="py-3 px-4 text-right">Actie</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {filtered.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-black/[0.01]">
                                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-black/80">
                                            {sub.reference}
                                        </td>
                                        <td className="py-3.5 px-4 font-semibold text-black">
                                            {sub.artist_name}
                                        </td>
                                        <td className="py-3.5 px-4 text-xs">
                                            <a href={`mailto:${sub.email}`} className="text-black hover:underline block font-medium">
                                                {sub.email}
                                            </a>
                                            <a href={`tel:${sub.phone}`} className="text-black/60 hover:underline block mt-0.5">
                                                {sub.phone}
                                            </a>
                                        </td>
                                        <td className="py-3.5 px-4 text-xs text-black/70">
                                            {sub.instagram && <div className="truncate">IG: {sub.instagram}</div>}
                                            {sub.tiktok && <div className="truncate">TT: {sub.tiktok}</div>}
                                            {!sub.instagram && !sub.tiktok && <span className="text-black/30">—</span>}
                                        </td>
                                        <td className="py-3.5 px-4 text-xs text-black/60 whitespace-nowrap">
                                            {new Date(sub.created_at).toLocaleDateString("nl-NL", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {sub.email_notification_status === "sent" ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                                    ✓ Verzonden
                                                </span>
                                            ) : sub.email_notification_status === "failed" ? (
                                                <span
                                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 cursor-help"
                                                    title={sub.email_notification_error || "Mislukt"}
                                                >
                                                    ⚠️ Mislukt
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                    In behandeling
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {sub.email_notification_status === "failed" && (
                                                    <button
                                                        onClick={() => handleRetryNotification(sub.id)}
                                                        disabled={retryingId === sub.id}
                                                        className="px-2.5 py-1 bg-black text-white rounded text-xs font-semibold hover:bg-black/80 transition disabled:opacity-50"
                                                    >
                                                        {retryingId === sub.id ? "Bezig..." : "Opnieuw e-mailen"}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteSubmission(sub.id, sub.artist_name)}
                                                    disabled={deletingId === sub.id}
                                                    className="px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded text-xs font-semibold transition disabled:opacity-50"
                                                    title="Aanmelding definitief verwijderen"
                                                >
                                                    {deletingId === sub.id ? "Wissen..." : "Verwijderen"}
                                                </button>
                                            </div>
                                        </td>
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
