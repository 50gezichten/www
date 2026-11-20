import { requireAdmin } from "@/lib/auth-guard";
import fs from "fs";
import path from "path";
import MediaManager from "./MediaManager";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase-server";

export default async function MediaAdminPage() {
    await requireAdmin();

    const mediaList: { url: string; name: string; size: number }[] = [];

    // 1. Scan static project images safely
    try {
        const foldersToScan = [
            { dir: path.join(process.cwd(), "public", "img"), prefix: "/img" },
            { dir: path.join(process.cwd(), "public", "img", "sponsor"), prefix: "/img/sponsor" },
        ];

        for (const folder of foldersToScan) {
            if (fs.existsSync(folder.dir)) {
                const files = fs.readdirSync(folder.dir);
                for (const file of files) {
                    const fullPath = path.join(folder.dir, file);
                    const stat = fs.statSync(fullPath);
                    if (stat.isFile() && /\.(png|jpe?g|webp|svg|ico)$/i.test(file)) {
                        mediaList.push({
                            url: `${folder.prefix}/${file}`,
                            name: file,
                            size: stat.size,
                        });
                    }
                }
            }
        }
    } catch {
        // Fallback for strict serverless environments
    }

    // 2. Fetch from Supabase Storage bucket 'media' if available
    try {
        const client = supabaseAdmin || supabaseServer;
        if (client) {
            const { data: storageFiles } = await client.storage.from("media").list();
            if (storageFiles) {
                for (const sFile of storageFiles) {
                    if (sFile.name && !sFile.name.startsWith(".")) {
                        const { data: publicUrlData } = client.storage
                            .from("media")
                            .getPublicUrl(sFile.name);
                        mediaList.push({
                            url: publicUrlData.publicUrl,
                            name: sFile.name,
                            size: sFile.metadata?.size || 0,
                        });
                    }
                }
            }
        }
    } catch {
        // Silently catch storage fetch errors
    }

    return (
        <div className="space-y-6">
            <div className="pb-6 border-b border-black/10">
                <h1 className="text-3xl font-bold tracking-tight">Media beheren</h1>
                <p className="text-black/60 text-sm mt-1">
                    Upload nieuwe afbeeldingen en logo&apos;s naar Supabase Storage. Kopieer eenvoudig de afbeeldingslink om deze in het CMS of sponsorpakketten te gebruiken.
                </p>
            </div>

            <MediaManager initialMedia={mediaList} />
        </div>
    );
}
