import assert from "node:assert";
import test from "node:test";
import fs from "node:fs";

test("Roadmap: broncode verificatie & geen vakjes grid", () => {
    const file = fs.readFileSync("src/app/HomePageClient.tsx", "utf8");

    // 1. Controleer dat het statische vakjes grid (.grid-cols-2 sm:grid-cols-4) definitief verwijderd is
    assert.strictEqual(
        file.includes("grid grid-cols-2 sm:grid-cols-4"),
        false,
        "Het statische 8-vakjes grid mag niet meer voorkomen in HomePageClient.tsx"
    );

    // 2. Controleer dat de SVG zigzag pad-lijn aanwezig is
    assert.ok(
        file.includes("strokeDasharray=\"8 5\""),
        "SVG pad moet een stippellijn bevatten die de punten verbindt"
    );

    // 3. Controleer dat zowel hover als klik handlers aanwezig zijn voor toelichting
    assert.ok(
        file.includes("setActiveRoadmapId"),
        "Roadmap moet klik-interactie ondersteunen via setActiveRoadmapId"
    );
    assert.ok(
        file.includes("setHoveredRoadmapId"),
        "Roadmap moet hover-interactie ondersteunen via setHoveredRoadmapId"
    );

    // 4. Controleer dat mobile roadmap verticale pad-lijn met interactieve toelichting heeft
    assert.ok(
        file.includes("md:hidden"),
        "Mobile weergave moet aanwezig zijn voor compacte schermen"
    );
    assert.ok(
        file.includes("border-dashed"),
        "Mobile pad moet een verbindende stippellijn hebben"
    );
});
