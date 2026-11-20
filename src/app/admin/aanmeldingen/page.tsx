import { requireAdmin } from "@/lib/auth-guard";
import { getSubmissions } from "@/lib/db";
import SubmissionsManager from "./SubmissionsManager";

export default async function AanmeldingenAdminPage() {
    await requireAdmin();
    const submissions = await getSubmissions();

    return (
        <div className="space-y-6">
            <div className="pb-6 border-b border-black/10">
                <h1 className="text-3xl font-bold tracking-tight">Aanmeldingen beheren</h1>
                <p className="text-black/60 text-sm mt-1">
                    Overzicht van alle artiestenaanmeldingen. Controleer verwerkingsstatussen en herstel eventueel mislukte e-mailnotificaties.
                </p>
            </div>

            <SubmissionsManager initialSubmissions={submissions} />
        </div>
    );
}
