"use client";

import { RoadmapItem } from "@/lib/types";
import { useState } from "react";

export default function RoadmapManager({ initialItems }: { initialItems: RoadmapItem[] }) {
    const [items, setItems] = useState<RoadmapItem[]>(initialItems);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    const handleSave = async (updated: RoadmapItem[]) => {
        setSaving(true);
        setFeedback(null);
        try {
            const res = await fetch("/api/admin/roadmap", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: updated }),
            });
            if (res.ok) {
                setFeedback("✓ Roadmap succesvol opgeslagen!");
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

    const toggleActive = (index: number) => {
        const next = items.map((item, i) => ({
            ...item,
            active: i === index, // single active phase as standard, or toggle
        }));
        setItems(next);
        handleSave(next);
    };

    const moveItem = (index: number, direction: "up" | "down") => {
        if (
            (direction === "up" && index === 0) ||
            (direction === "down" && index === items.length - 1)
        ) {
            return;
        }
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        const copy = [...items];
        const temp = copy[index];
        copy[index] = copy[targetIndex];
        copy[targetIndex] = temp;
        // update order_index
        const reindexed = copy.map((item, idx) => ({ ...item, order_index: idx }));
        setItems(reindexed);
        handleSave(reindexed);
    };

    const handleEditField = (
        index: number,
        field: keyof RoadmapItem,
        value: string | boolean | number
    ) => {
        const next = [...items];
        next[index] = { ...next[index], [field]: value };
        setItems(next);
    };

    const handleAddItem = () => {
        const newItem: RoadmapItem = {
            id: `roadmap-${Date.now()}`,
            title: "Nieuwe Fase",
            description: "Beschrijving van deze nieuwe fase...",
            duration: "Circa 4 weken",
            active: false,
            order_index: items.length,
        };
        const next = [...items, newItem];
        setItems(next);
        handleSave(next);
    };

    const handleDelete = (index: number) => {
        if (confirm(`Weet je zeker dat je fase "${items[index].title}" wilt verwijderen?`)) {
            const next = items.filter((_, i) => i !== index).map((item, idx) => ({ ...item, order_index: idx }));
            setItems(next);
            handleSave(next);
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
                <span className="text-sm text-black/60 font-medium">Totaal {items.length} fasen</span>
                <button
                    onClick={handleAddItem}
                    className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-black/85 transition flex items-center gap-2"
                >
                    + Nieuwe fase toevoegen
                </button>
            </div>

            <div className="space-y-4">
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className={`bg-white border rounded-xl p-5 shadow-sm transition-all ${
                            item.active ? "border-black ring-2 ring-black/10" : "border-black/10"
                        }`}
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-black/5">
                            <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0">
                                    {index + 1}
                                </span>
                                <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) => handleEditField(index, "title", e.target.value)}
                                    className="font-bold text-base md:text-lg border-b border-transparent hover:border-black/30 focus:border-black outline-none px-1"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => toggleActive(index)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                        item.active
                                            ? "bg-black text-white"
                                            : "bg-black/5 text-black hover:bg-black/10"
                                    }`}
                                >
                                    {item.active ? "● Huidige actieve fase" : "Maak actief"}
                                </button>
                                <button
                                    onClick={() => moveItem(index, "up")}
                                    disabled={index === 0}
                                    className="p-1.5 border border-black/10 rounded hover:bg-black/5 disabled:opacity-30 text-xs"
                                    title="Omhoog"
                                >
                                    ↑
                                </button>
                                <button
                                    onClick={() => moveItem(index, "down")}
                                    disabled={index === items.length - 1}
                                    className="p-1.5 border border-black/10 rounded hover:bg-black/5 disabled:opacity-30 text-xs"
                                    title="Omlaag"
                                >
                                    ↓
                                </button>
                                <button
                                    onClick={() => handleDelete(index)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded text-xs ml-2"
                                    title="Verwijderen"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-black/60 mb-1">
                                    Beschrijving
                                </label>
                                <textarea
                                    rows={2}
                                    value={item.description}
                                    onChange={(e) => handleEditField(index, "description", e.target.value)}
                                    className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-black/60 mb-1">
                                    Looptijd / Duur
                                </label>
                                <input
                                    type="text"
                                    value={item.duration}
                                    onChange={(e) => handleEditField(index, "duration", e.target.value)}
                                    className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-4 flex justify-end">
                <button
                    onClick={() => handleSave(items)}
                    disabled={saving}
                    className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-bold hover:bg-black/85 transition disabled:opacity-50"
                >
                    {saving ? "Opslaan..." : "Wijzigingen Opslaan"}
                </button>
            </div>
        </div>
    );
}
