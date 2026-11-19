import { auth } from "@/auth";
import { getSiteContent } from "@/lib/db";
import TextEditorForm from "./TextEditorForm";

export default async function TekstenPage() {
    await auth();
    const content = await getSiteContent(true); // load current draft/latest

    return (
        <div className="space-y-6">
            <div className="pb-6 border-b border-black/10">
                <h1 className="text-3xl font-bold tracking-tight">Teksten beheren</h1>
                <p className="text-black/60 text-sm mt-1">
                    Pas teksten aan op de publieke website. Wijzigingen worden eerst als concept opgeslagen en pas na publicatie zichtbaar voor bezoekers.
                </p>
            </div>

            <TextEditorForm initialContent={content} />
        </div>
    );
}
