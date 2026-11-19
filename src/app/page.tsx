import { auth } from "@/auth";
import { getRoadmapItems, getSiteContent, getSponsorPackages } from "@/lib/db";
import HomePageClient from "./HomePageClient";

export const revalidate = 0; // Dynamic revalidation so CMS publishes show instantly

export default async function HomePage({
    searchParams,
}: {
    searchParams: Promise<{ preview?: string }>;
}) {
    const params = await searchParams;
    let isPreview = false;

    if (params?.preview === "true") {
        const session = await auth();
        if (session?.user) {
            isPreview = true;
        }
    }

    const [content, roadmapItems, sponsorPackages] = await Promise.all([
        getSiteContent(isPreview),
        getRoadmapItems(),
        getSponsorPackages(),
    ]);

    return (
        <>
            {isPreview && (
                <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-black text-xs font-bold py-1.5 px-4 text-center shadow">
                    ⚠️ CMS CONCEPT PREVIEW ACTIEF — Dit is een niet-gepubliceerd concept, alleen zichtbaar voor beheerders.
                </div>
            )}
            <HomePageClient
                content={content}
                roadmapItems={roadmapItems}
                sponsorPackages={sponsorPackages}
            />
        </>
    );
}
