import { auth } from "@/auth";
import fs from "fs";
import path from "path";
import MediaManager from "./MediaManager";

export default async function MediaAdminPage() {
    await auth();

    const mediaList: { url: string; name: string; size: number }[] = [];

    // Scan public/img, public/img/sponsor, and public/uploads
    const foldersToScan = [
        { dir: path.join(process.cwd(), "public", "img"), prefix: "/img" },
        { dir: path.join(process.cwd(), "public", "img", "sponsor"), prefix: "/img/sponsor" },
        { dir: path.join(process.cwd(), "public", "uploads"), prefix: "/uploads" },
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

    return (
        <div className="space-y-6">
            <div className="pb-6 border-b border-black/10">
                <h1 className="text-3xl font-bold tracking-tight">Media beheren</h1>
                <p className="text-black/60 text-sm mt-1">
                    Upload nieuwe afbeeldingen en logo&apos;s. Kopieer eenvoudig de afbeeldingslink om deze in het CMS of sponsorpakketten te gebruiken.
                </p>
            </div>

            <MediaManager initialMedia={mediaList} />
        </div>
    );
}
