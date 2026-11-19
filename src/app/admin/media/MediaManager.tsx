"use client";

import Image from "next/image";
import { useState } from "react";

interface MediaItem {
    url: string;
    name: string;
    size: number;
}

export default function MediaManager({ initialMedia }: { initialMedia: MediaItem[] }) {
    const [media, setMedia] = useState<MediaItem[]>(initialMedia);
    const [uploading, setUploading] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

    const handleUpload = async (file: File) => {
        setUploading(true);
        const form = new FormData();
        form.append("file", file);

        try {
            const res = await fetch("/api/admin/upload", {
                method: "POST",
                body: form,
            });
            const data = await res.json();
            if (res.ok && data.url) {
                setMedia([{ url: data.url, name: data.filename, size: data.size }, ...media]);
            } else {
                alert(`Upload fout: ${data.error}`);
            }
        } catch {
            alert("Er is een fout opgetreden bij het uploaden.");
        } finally {
            setUploading(false);
        }
    };

    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        setCopiedUrl(url);
        setTimeout(() => setCopiedUrl(null), 2500);
    };

    return (
        <div className="space-y-6">
            {/* Upload Box */}
            <div className="bg-white border-2 border-dashed border-black/20 rounded-2xl p-8 text-center hover:border-black/50 transition">
                <input
                    type="file"
                    id="media-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files?.[0]) {
                            handleUpload(e.target.files[0]);
                        }
                    }}
                />
                <label htmlFor="media-upload" className="cursor-pointer block">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-black/5 flex items-center justify-center text-xl">
                        ⬆️
                    </div>
                    <span className="font-bold text-sm block">
                        {uploading ? "Bezig met uploaden..." : "Klik om een nieuwe afbeelding te uploaden"}
                    </span>
                    <span className="text-xs text-black/50 mt-1 block">
                        PNG, JPG, WebP of SVG (max. 5MB)
                    </span>
                </label>
            </div>

            {/* Media Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {media.map((item) => (
                    <div
                        key={item.url}
                        className="bg-white border border-black/10 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between group"
                    >
                        <div className="relative w-full h-32 bg-black/[0.03]">
                            <Image src={item.url} alt={item.name} fill className="object-contain p-2" />
                        </div>

                        <div className="p-3 border-t border-black/5 bg-white">
                            <p className="text-xs font-semibold truncate" title={item.name}>
                                {item.name}
                            </p>
                            <p className="text-[11px] text-black/40 mt-0.5">
                                {(item.size / 1024).toFixed(1)} KB
                            </p>

                            <button
                                onClick={() => copyToClipboard(item.url)}
                                className={`mt-2 w-full py-1.5 px-2 rounded text-xs font-medium transition ${
                                    copiedUrl === item.url
                                        ? "bg-emerald-600 text-white"
                                        : "bg-black/5 hover:bg-black text-black hover:text-white"
                                }`}
                            >
                                {copiedUrl === item.url ? "✓ Gekopieerd!" : "Kopieer pad"}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
