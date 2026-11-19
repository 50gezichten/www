"use client";

import { SponsorPackage } from "@/lib/types";
import Image from "next/image";
import { useState } from "react";

export default function SponsorManager({ initialPackages }: { initialPackages: SponsorPackage[] }) {
    const [packages, setPackages] = useState<SponsorPackage[]>(initialPackages);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    const handleSave = async (updated: SponsorPackage[]) => {
        setSaving(true);
        setFeedback(null);
        try {
            const res = await fetch("/api/admin/sponsors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ packages: updated }),
            });
            if (res.ok) {
                setFeedback("✓ Sponsorpakketten succesvol opgeslagen!");
                setTimeout(() => setFeedback(null), 3000);
            } else {
                setFeedback("Fout bij opslaan.");
            }
        } catch {
            setFeedback("Netwerkfout.");
        } finally {
            setSaving(false);
        }
    };

    const handleAddPackage = () => {
        const newPkg: SponsorPackage = {
            id: `sponsor-${Date.now()}`,
            title: "NIEUW PAKKET",
            price: "Vanaf €500",
            image: "/img/sponsor/01.png",
            benefits: ["Voordeel 1", "Voordeel 2"],
            order_index: packages.length,
        };
        const next = [...packages, newPkg];
        setPackages(next);
        handleSave(next);
    };

    const handleFieldChange = (
        index: number,
        field: keyof SponsorPackage,
        value: string | string[] | number | boolean
    ) => {
        const next = [...packages];
        next[index] = { ...next[index], [field]: value };
        setPackages(next);
    };

    const handleBenefitsChange = (index: number, rawBenefits: string) => {
        const list = rawBenefits.split("\n").filter((b) => b.trim() !== "");
        handleFieldChange(index, "benefits", list);
    };

    const movePackage = (index: number, direction: "up" | "down") => {
        if (
            (direction === "up" && index === 0) ||
            (direction === "down" && index === packages.length - 1)
        ) {
            return;
        }
        const target = direction === "up" ? index - 1 : index + 1;
        const copy = [...packages];
        const temp = copy[index];
        copy[index] = copy[target];
        copy[target] = temp;
        const reindexed = copy.map((p, idx) => ({ ...p, order_index: idx }));
        setPackages(reindexed);
        handleSave(reindexed);
    };

    const handleDelete = (index: number) => {
        if (confirm(`Weet je zeker dat je pakket "${packages[index].title}" wilt verwijderen?`)) {
            const next = packages.filter((_, i) => i !== index).map((p, idx) => ({ ...p, order_index: idx }));
            setPackages(next);
            handleSave(next);
        }
    };

    const handleImageUpload = async (index: number, file: File) => {
        const form = new FormData();
        form.append("file", file);
        try {
            const res = await fetch("/api/admin/upload", {
                method: "POST",
                body: form,
            });
            const data = await res.json();
            if (res.ok && data.url) {
                handleFieldChange(index, "image", data.url);
                setFeedback("✓ Afbeelding geüpload en gekoppeld!");
                setTimeout(() => setFeedback(null), 3000);
            } else {
                alert(`Upload fout: ${data.error}`);
            }
        } catch {
            alert("Fout bij uploaden van afbeelding.");
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {feedback && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold">
                    {feedback}
                </div>
            )}

            <div className="flex justify-between items-center">
                <span className="text-sm text-black/60 font-medium">Totaal {packages.length} pakketten</span>
                <button
                    onClick={handleAddPackage}
                    className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-black/85 transition"
                >
                    + Sponsorpakket toevoegen
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {packages.map((pkg, index) => (
                    <div key={pkg.id} className="bg-white border border-black/10 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-black/5">
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-black/5">
                                    Kaart #{index + 1}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => movePackage(index, "up")}
                                        disabled={index === 0}
                                        className="p-1 border border-black/10 rounded hover:bg-black/5 disabled:opacity-30 text-xs"
                                        title="Naar links/eerder"
                                    >
                                        ←
                                    </button>
                                    <button
                                        onClick={() => movePackage(index, "down")}
                                        disabled={index === packages.length - 1}
                                        className="p-1 border border-black/10 rounded hover:bg-black/5 disabled:opacity-30 text-xs"
                                        title="Naar rechts/later"
                                    >
                                        →
                                    </button>
                                    <button
                                        onClick={() => handleDelete(index)}
                                        className="p-1 text-red-600 hover:bg-red-50 rounded text-xs ml-1"
                                        title="Verwijderen"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Image Preview & Upload */}
                            <div className="relative w-full h-36 rounded-lg overflow-hidden bg-black/5 border border-black/10 flex items-center justify-center">
                                {pkg.image ? (
                                    <Image src={pkg.image} alt={pkg.title} fill className="object-cover" />
                                ) : (
                                    <span className="text-xs text-black/40">Geen afbeelding</span>
                                )}
                                <label className="absolute bottom-2 right-2 bg-black/80 hover:bg-black text-white px-2.5 py-1 rounded text-xs cursor-pointer shadow">
                                    Vervang foto
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                handleImageUpload(index, e.target.files[0]);
                                            }
                                        }}
                                    />
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-black/60 mb-1 uppercase">Pakketnaam</label>
                                <input
                                    type="text"
                                    value={pkg.title}
                                    onChange={(e) => handleFieldChange(index, "title", e.target.value)}
                                    className="w-full px-3 py-2 border border-black/20 rounded-lg text-sm font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-black/60 mb-1 uppercase">Prijsaanduiding</label>
                                <input
                                    type="text"
                                    value={pkg.price}
                                    onChange={(e) => handleFieldChange(index, "price", e.target.value)}
                                    className="w-full px-3 py-2 border border-black/20 rounded-lg text-sm font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-black/60 mb-1 uppercase">
                                    Voordelen (1 per regel)
                                </label>
                                <textarea
                                    rows={5}
                                    value={pkg.benefits.join("\n")}
                                    onChange={(e) => handleBenefitsChange(index, e.target.value)}
                                    className="w-full px-3 py-2 border border-black/20 rounded-lg text-xs leading-relaxed"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-4 flex justify-end">
                <button
                    onClick={() => handleSave(packages)}
                    disabled={saving}
                    className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-bold hover:bg-black/85 transition disabled:opacity-50"
                >
                    {saving ? "Opslaan..." : "Wijzigingen Opslaan"}
                </button>
            </div>
        </div>
    );
}
