import { requireAdmin } from "@/lib/auth-guard";
import { getSiteContent, getSponsorPackages } from "@/lib/db";
import SponsorManager from "./SponsorManager";

export default async function SponsorsAdminPage() {
    await requireAdmin();
    const [packages, content] = await Promise.all([
        getSponsorPackages(),
        getSiteContent(false),
    ]);

    return (
        <div className="space-y-6">
            <div className="pb-6 border-b border-black/10">
                <h1 className="text-3xl font-bold tracking-tight">Sponsorkaarten beheren</h1>
                <p className="text-black/60 text-sm mt-1">
                    Beheer de zichtbaarheid van de Support- en sponsorsectie op de homepage en pas de sponsorpakketten aan.
                </p>
            </div>

            <SponsorManager
                initialPackages={packages}
                initialSupportEnabled={content.support?.enabled === true}
            />
        </div>
    );
}
