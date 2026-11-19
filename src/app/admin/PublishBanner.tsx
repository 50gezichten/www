"use client";

import { useState } from "react";

interface PublishBannerProps {
    currentVersion: number;
    updatedAt: string;
}

export default function PublishBanner({ currentVersion, updatedAt }: PublishBannerProps) {
    const [isPublishing, setIsPublishing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handlePublish = async () => {
        setIsPublishing(true);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/content", {
                method: "PUT",
            });
            const data = await res.json();
            if (res.ok) {
                setMessage("✓ Wijzigingen zijn succesvol live gepubliceerd!");
                setTimeout(() => setMessage(null), 5000);
            } else {
                setMessage(`Fout: ${data.error || "Publiceren mislukt"}`);
            }
        } catch {
            setMessage("Netwerkfout bij publiceren");
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="bg-black text-white rounded-xl p-5 shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold text-sm tracking-wide">CMS Publicatieworkflow</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-white/20 font-mono">v{currentVersion}</span>
                </div>
                <p className="text-xs text-white/70 mt-1">
                    Laatste publicatie: {new Date(updatedAt).toLocaleString("nl-NL")}
                </p>
                {message && <p className="text-xs text-emerald-300 font-semibold mt-2">{message}</p>}
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-white/90 transition disabled:opacity-50"
                >
                    {isPublishing ? "Bezig met publiceren..." : "Publiceer Live"}
                </button>
            </div>
        </div>
    );
}
