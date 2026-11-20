import { requireAdmin } from "@/lib/auth-guard";
import { getRoadmapItems } from "@/lib/db";
import RoadmapManager from "./RoadmapManager";

export default async function RoadmapAdminPage() {
    await requireAdmin();
    const items = await getRoadmapItems();

    return (
        <div className="space-y-6">
            <div className="pb-6 border-b border-black/10">
                <h1 className="text-3xl font-bold tracking-tight">Roadmap beheren</h1>
                <p className="text-black/60 text-sm mt-1">
                    Beheer de fasen van het project. Activeer de huidige lopende fase en herschik fasen met één klik.
                </p>
            </div>

            <RoadmapManager initialItems={items} />
        </div>
    );
}
