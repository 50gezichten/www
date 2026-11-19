"use client";

import { SiteContent } from "@/lib/types";
import { useState } from "react";

export default function TextEditorForm({ initialContent }: { initialContent: SiteContent }) {
    const [formData, setFormData] = useState(initialContent);
    const [status, setStatus] = useState<"idle" | "saving" | "saved" | "publishing" | "published" | "error">("idle");
    const [feedback, setFeedback] = useState<string | null>(null);

    const handleSaveDraft = async () => {
        setStatus("saving");
        setFeedback(null);
        try {
            const res = await fetch("/api/admin/content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setStatus("saved");
                setFeedback("✓ Concept succesvol opgeslagen!");
                setTimeout(() => setStatus("idle"), 3000);
            } else {
                setStatus("error");
                setFeedback("Fout bij opslaan van concept.");
            }
        } catch {
            setStatus("error");
            setFeedback("Netwerkfout.");
        }
    };

    const handlePublish = async () => {
        setStatus("publishing");
        setFeedback(null);
        try {
            // First save draft
            await fetch("/api/admin/content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            // Then publish
            const res = await fetch("/api/admin/content", {
                method: "PUT",
            });
            if (res.ok) {
                setStatus("published");
                setFeedback("✓ Wijzigingen zijn live gepubliceerd!");
                setTimeout(() => setStatus("idle"), 4000);
            } else {
                setStatus("error");
                setFeedback("Fout bij publiceren.");
            }
        } catch {
            setStatus("error");
            setFeedback("Netwerkfout.");
        }
    };

    return (
        <div className="space-y-8 max-w-4xl">
            {feedback && (
                <div
                    className={`p-4 rounded-xl text-sm font-semibold ${
                        status === "error"
                            ? "bg-red-50 text-red-800 border border-red-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}
                >
                    {feedback}
                </div>
            )}

            {/* Hero Section */}
            <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold border-b border-black/10 pb-3">1. Hero Sectie</h2>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                        Ondertitel / Tagline
                    </label>
                    <input
                        type="text"
                        value={formData.hero.tagline}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                hero: { ...formData.hero, tagline: e.target.value },
                            })
                        }
                        className="w-full px-4 py-2.5 border border-black/20 rounded-lg focus:ring-2 focus:ring-black outline-none text-sm"
                    />
                </div>
            </div>

            {/* Over Ons Section */}
            <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold border-b border-black/10 pb-3">2. Over Ons Sectie</h2>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2">Sectietitel</label>
                    <input
                        type="text"
                        value={formData.about.title}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                about: { ...formData.about, title: e.target.value },
                            })
                        }
                        className="w-full px-4 py-2.5 border border-black/20 rounded-lg focus:ring-2 focus:ring-black outline-none text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                        Paragraaf 1 (inclusief handgeschreven highlight)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                        <div className="md:col-span-1">
                            <span className="text-xs text-black/50 block mb-1">Highlight titel</span>
                            <input
                                type="text"
                                value={formData.about.lead_highlight}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        about: { ...formData.about, lead_highlight: e.target.value },
                                    })
                                }
                                className="w-full px-3 py-2 border border-black/20 rounded-lg text-sm"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <span className="text-xs text-black/50 block mb-1">Vervolgtekst paragraaf 1</span>
                            <textarea
                                rows={4}
                                value={formData.about.paragraph_1}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        about: { ...formData.about, paragraph_1: e.target.value },
                                    })
                                }
                                className="w-full px-3 py-2 border border-black/20 rounded-lg text-sm"
                            />
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2">Paragraaf 2</label>
                    <textarea
                        rows={4}
                        value={formData.about.paragraph_2}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                about: { ...formData.about, paragraph_2: e.target.value },
                            })
                        }
                        className="w-full px-4 py-2.5 border border-black/20 rounded-lg text-sm"
                    />
                </div>
            </div>

            {/* Aanmelden Section */}
            <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold border-b border-black/10 pb-3">3. Aanmeldsectie Teksten</h2>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2">Sectietitel</label>
                    <input
                        type="text"
                        value={formData.aanmelden.title}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                aanmelden: { ...formData.aanmelden, title: e.target.value },
                            })
                        }
                        className="w-full px-4 py-2.5 border border-black/20 rounded-lg text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                        Beschrijving voor artiesten
                    </label>
                    <textarea
                        rows={3}
                        value={formData.aanmelden.description}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                aanmelden: { ...formData.aanmelden, description: e.target.value },
                            })
                        }
                        className="w-full px-4 py-2.5 border border-black/20 rounded-lg text-sm"
                    />
                </div>
            </div>

            {/* Support & Contact Section */}
            <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold border-b border-black/10 pb-3">4. Support & Contact</h2>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2">Support Introductie</label>
                    <textarea
                        rows={3}
                        value={formData.support.intro}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                support: { ...formData.support, intro: e.target.value },
                            })
                        }
                        className="w-full px-4 py-2.5 border border-black/20 rounded-lg text-sm"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2">Contact E-mail</label>
                        <input
                            type="email"
                            value={formData.contact.email}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    contact: { ...formData.contact, email: e.target.value },
                                })
                            }
                            className="w-full px-4 py-2.5 border border-black/20 rounded-lg text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2">Instagram URL</label>
                        <input
                            type="text"
                            value={formData.contact.instagram_url}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    contact: { ...formData.contact, instagram_url: e.target.value },
                                })
                            }
                            className="w-full px-4 py-2.5 border border-black/20 rounded-lg text-sm"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2">Facebook URL</label>
                        <input
                            type="text"
                            value={formData.contact.facebook_url}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    contact: { ...formData.contact, facebook_url: e.target.value },
                                })
                            }
                            className="w-full px-4 py-2.5 border border-black/20 rounded-lg text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2">TikTok URL</label>
                        <input
                            type="text"
                            value={formData.contact.tiktok_url}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    contact: { ...formData.contact, tiktok_url: e.target.value },
                                })
                            }
                            className="w-full px-4 py-2.5 border border-black/20 rounded-lg text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="sticky bottom-6 bg-white border border-black/20 rounded-xl p-4 shadow-lg flex items-center justify-between gap-4">
                <span className="text-xs text-black/60">
                    Laatst gewijzigd: {new Date(formData.updated_at).toLocaleString("nl-NL")}
                </span>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={status === "saving" || status === "publishing"}
                        className="px-5 py-2.5 border border-black rounded-lg text-sm font-bold hover:bg-black/5 transition disabled:opacity-50"
                    >
                        {status === "saving" ? "Opslaan..." : "Concept Opslaan"}
                    </button>
                    <button
                        type="button"
                        onClick={handlePublish}
                        disabled={status === "saving" || status === "publishing"}
                        className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-bold hover:bg-black/85 transition disabled:opacity-50"
                    >
                        {status === "publishing" ? "Publiceren..." : "Live Publiceren"}
                    </button>
                </div>
            </div>
        </div>
    );
}
