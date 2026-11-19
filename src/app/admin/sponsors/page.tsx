import { auth } from "@/auth";
import { getSponsorPackages } from "@/lib/db";
import SponsorManager from "./SponsorManager";

export default async function SponsorsAdminPage() {
    await auth();
    const packages = await getSponsorPackages();

    return (
        <div className="space-y-6">
            <div className="pb-6 border-b border-black/10">
                <h1 className="text-3xl font-bold tracking-tight">Sponsorkaarten beheren</h1>
                <p className="text-black/60 text-sm mt-1">
                    Beheer de sponsorpakketten die in de carrousel worden getoond. Voeg pakketten toe, pas prijzen en voordelen aan of upload nieuwe beelden.
                </p>
            </div>

            <SponsorManager initialPackages={packages} />
        </div>
    );
}
