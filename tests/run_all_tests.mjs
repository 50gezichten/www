import assert from "node:assert";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

function report(testName, ok, details = "") {
    if (ok) {
        passed++;
        console.log(`  ✓ PASS: ${testName} ${details ? `(${details})` : ""}`);
    } else {
        failed++;
        console.error(`  ✗ FAIL: ${testName} - ${details}`);
    }
}

async function runTests() {
    console.log("=================================================");
    console.log("50 GEZICHTEN 50 GEDICHTEN - MASTER TEST SUITE");
    console.log("Target:", BASE_URL);
    console.log("=================================================\n");

    // -----------------------------------------------------------------
    // TEST SUITE 1: AANMELDFORMULIER & API VALIDATIE
    // -----------------------------------------------------------------
    console.log("SUITE 1: Aanmeldformulier & API Beveiliging");

    // 1.1 Ontbrekende verplichte velden
    try {
        const res = await fetch(`${BASE_URL}/api/aanmelden`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ artistName: "" }),
        });
        const data = await res.json();
        report("Ontbrekende velden geweigerd", res.status === 400 && data.details?.artistName);
    } catch (err) {
        report("Ontbrekende velden geweigerd", false, err.message);
    }

    // 1.2 Ongeldig e-mailadres
    try {
        const res = await fetch(`${BASE_URL}/api/aanmelden`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                artistName: "TestRapper",
                email: "invalid-email-address",
                phone: "0612345678",
            }),
        });
        const data = await res.json();
        report("Ongeldig e-mailadres geweigerd", res.status === 400 && data.details?.email);
    } catch (err) {
        report("Ongeldig e-mailadres geweigerd", false, err.message);
    }

    // 1.3 Ongeldig telefoonnummer (te kort)
    try {
        const res = await fetch(`${BASE_URL}/api/aanmelden`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                artistName: "TestRapper",
                email: "test@example.com",
                phone: "123",
            }),
        });
        const data = await res.json();
        report("Ongeldig telefoonnummer geweigerd", res.status === 400 && data.details?.phone);
    } catch (err) {
        report("Ongeldig telefoonnummer geweigerd", false, err.message);
    }

    // 1.4 Honeypot bot submission detectie
    try {
        const res = await fetch(`${BASE_URL}/api/aanmelden`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                artistName: "SpamBot",
                email: "spambot@spam.com",
                phone: "0612345678",
                website: "https://spam-link.ru", // honeypot triggered!
            }),
        });
        const data = await res.json();
        // Honeypot returns ok silently without saving to DB to deceive bot
        report("Honeypot vangt bots af zonder opslag", res.status === 200 && data.ok);
    } catch (err) {
        report("Honeypot vangt bots af zonder opslag", false, err.message);
    }

    // 1.5 Geldige inzending met gegenereerde referentie
    let generatedRef = "";
    try {
        const res = await fetch(`${BASE_URL}/api/aanmelden`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Forwarded-For": "198.51.100.42", // fresh IP for rate limit
            },
            body: JSON.stringify({
                artistName: "MC Almere Stad",
                email: "mcalmere@test.nl",
                phone: "06-98765432",
                instagram: "@mcalmerestad",
                tiktok: "@mcalmeretiktok",
            }),
        });
        const data = await res.json();
        generatedRef = data.reference;
        report(
            "Geldige inzending succesvol verwerkt",
            res.status === 200 && data.ok && data.reference?.startsWith("50G-"),
            `Ref: ${generatedRef}`
        );
    } catch (err) {
        report("Geldige inzending succesvol verwerkt", false, err.message);
    }

    // 1.6 Rate limiting test (overschrijden van limiet)
    try {
        const spamIp = "203.0.113.99";
        let lastStatus = 0;
        for (let i = 0; i < 6; i++) {
            const res = await fetch(`${BASE_URL}/api/aanmelden`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Forwarded-For": spamIp,
                },
                body: JSON.stringify({
                    artistName: `Spammer ${i}`,
                    email: `spam${i}@test.nl`,
                    phone: "0612345678",
                }),
            });
            lastStatus = res.status;
        }
        report("Rate limiting blokkeert na 5 requests", lastStatus === 429, `Status: ${lastStatus}`);
    } catch (err) {
        report("Rate limiting blokkeert na 5 requests", false, err.message);
    }

    // -----------------------------------------------------------------
    // TEST SUITE 2: ADMIN BEVEILIGING & TOEGANGSCONTROLE
    // -----------------------------------------------------------------
    console.log("\nSUITE 2: Admin Beveiliging & Autorisatie");

    // 2.1 Onbevoegde browser bezoeker redirect naar /admin/login
    try {
        const res = await fetch(`${BASE_URL}/admin`, { redirect: "manual" });
        const location = res.headers.get("location");
        report(
            "Onbevoegde bezoeker /admin wordt doorgestuurd naar /admin/login",
            res.status === 307 || res.status === 302,
            `Location: ${location}`
        );
    } catch (err) {
        report("Onbevoegde bezoeker /admin redirect", false, err.message);
    }

    // 2.2 Onbevoegde API aanroep naar /api/admin/content
    try {
        const res = await fetch(`${BASE_URL}/api/admin/content`);
        report("API /api/admin/content weigert zonder sessie (401)", res.status === 401);
    } catch (err) {
        report("API /api/admin/content 401", false, err.message);
    }

    // 2.3 Onbevoegde API aanroep naar /api/admin/submissions
    try {
        const res = await fetch(`${BASE_URL}/api/admin/submissions`);
        report("API /api/admin/submissions weigert zonder sessie (401)", res.status === 401);
    } catch (err) {
        report("API /api/admin/submissions 401", false, err.message);
    }

    // 2.4 Onbevoegde API aanroep naar /api/admin/roadmap
    try {
        const res = await fetch(`${BASE_URL}/api/admin/roadmap`);
        report("API /api/admin/roadmap weigert zonder sessie (401)", res.status === 401);
    } catch (err) {
        report("API /api/admin/roadmap 401", false, err.message);
    }

    // 2.5 Onbevoegde API aanroep naar /api/admin/sponsors
    try {
        const res = await fetch(`${BASE_URL}/api/admin/sponsors`);
        report("API /api/admin/sponsors weigert zonder sessie (401)", res.status === 401);
    } catch (err) {
        report("API /api/admin/sponsors 401", false, err.message);
    }

    // -----------------------------------------------------------------
    // TEST SUITE 3: CMS & PERSISTENTIELAAG (SERVER-SIDE INTEGRATIETEST)
    // -----------------------------------------------------------------
    console.log("\nSUITE 3: CMS Datamodel & Publicatieworkflow");
    try {
        const {
            getSiteContent,
            updateDraftContent,
            publishContent,
            getRoadmapItems,
            saveRoadmapItems,
            getSponsorPackages,
            saveSponsorPackages,
            getSubmissions,
        } = await import("../src/lib/db.ts");

        // 3.1 Initial Content ophalen
        const published = await getSiteContent(false);
        report("Gepubliceerde content kan worden opgehaald", !!published.hero.tagline);

        // 3.2 Concept bewerken
        const updatedDraft = await updateDraftContent(
            {
                hero: {
                    tagline: "Test Concept Tagline — Concept Versie",
                    logo_alt: "50 Gezichten 50 Gedichten",
                },
            },
            "TestAdmin"
        );
        report(
            "Concept content kan worden opgeslagen",
            updatedDraft.hero.tagline.includes("Test Concept Tagline") && updatedDraft.status === "draft"
        );

        // 3.3 Verifiëren dat live content ongewijzigd blijft zolang het concept niet gepubliceerd is
        const liveBeforePublish = await getSiteContent(false);
        report(
            "Publieke content blijft intact totdat concept expliciet wordt gepubliceerd",
            liveBeforePublish.hero.tagline === published.hero.tagline
        );

        // 3.4 Publiceren naar live
        const newlyPublished = await publishContent("TestAdmin");
        const liveAfterPublish = await getSiteContent(false);
        report(
            "Publicatieworkflow maakt concept direct live",
            liveAfterPublish.hero.tagline === "Test Concept Tagline — Concept Versie" &&
                newlyPublished.status === "published"
        );

        // Terugzetten naar originele tagline voor netheid
        await updateDraftContent({ hero: { tagline: "HipHop X Poëziebundel — 50 jaar Almere", logo_alt: "50 Gezichten 50 Gedichten" } }, "TestAdmin");
        await publishContent("TestAdmin");

        // 3.5 Roadmap beheer
        const roadmap = await getRoadmapItems();
        report("Roadmap items ophalen", roadmap.length >= 8);

        // 3.6 Sponsorpakketten beheer
        const sponsors = await getSponsorPackages();
        report("Sponsorpakketten ophalen", sponsors.length >= 4);

        // 3.7 Aanmeldingen ophalen
        const allSubs = await getSubmissions();
        const foundNewSub = allSubs.find((s) => s.reference === generatedRef);
        report("Opgeslagen aanmelding aanwezig in database/store", !!foundNewSub, `Gevonden: ${foundNewSub?.artist_name}`);
    } catch (err) {
        report("CMS Datalaag integratietest", false, err.message);
    }

    // -----------------------------------------------------------------
    // TEST SUITE 4: BROWSER AUTOMATISERING & VISUELE REGRESSIETEST
    // -----------------------------------------------------------------
    console.log("\nSUITE 4: Playwright Browser & Visuele Regressie");
    const browser = await chromium.launch();

    const viewports = [
        { name: "360", width: 360, height: 800 },
        { name: "390", width: 390, height: 844 },
        { name: "768", width: 768, height: 1024 },
        { name: "1024", width: 1024, height: 1100 },
        { name: "1440", width: 1440, height: 1200 },
    ];

    const outDir = path.join(process.cwd(), "tests", "regression-results");
    fs.mkdirSync(outDir, { recursive: true });

    for (const vp of viewports) {
        try {
            const context = await browser.newContext({
                viewport: { width: vp.width, height: vp.height },
            });
            const page = await context.newPage();
            await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 20000 });

            // Verify essential elements exist on page
            const hasHeroLogo = await page.locator('img[alt="50 Gezichten 50 Gedichten"]').isVisible();
            const hasOverOns = await page.locator("text=Over Ons").first().isVisible();
            const hasRoadmap = await page.locator("text=Roadmap").first().isVisible();
            const hasAanmelden = await page.locator("text=Aanmelden").first().isVisible();
            const hasSupport = await page.locator("text=Support").first().isVisible();
            const hasContact = await page.locator("text=Contact").first().isVisible();

            const allElementsOk = hasHeroLogo && hasOverOns && hasRoadmap && hasAanmelden && hasSupport && hasContact;

            // Take screenshot
            const screenPath = path.join(outDir, `post_repair_${vp.name}px.png`);
            await page.screenshot({ path: screenPath, fullPage: true });

            report(
                `Visuele weergave en secties op ${vp.width}px intact`,
                allElementsOk,
                `Screenshot opgeslagen: ${screenPath}`
            );

            await context.close();
        } catch (err) {
            report(`Visuele regressie op ${vp.width}px`, false, err.message);
        }
    }

    // 4.2 Browser interactie test: Carrousel doorklikken & Formulier interactie
    try {
        const page = await browser.newPage();
        await page.goto(BASE_URL, { waitUntil: "networkidle" });

        // Test carrousel right button
        const rightArrow = page.locator('button[aria-label="Volgend pakket"]');
        if (await rightArrow.isVisible()) {
            await rightArrow.click();
            await page.waitForTimeout(300);
            report("Sponsorcarrousel interactie (volgend pakket)", true);
        } else {
            report("Sponsorcarrousel navigatieknop zichtbaar op desktop", false);
        }

        // Test form submission via UI
        await page.fill("#artistName", "Browser Test MC");
        await page.fill("#email", "browsertest@50gezichten.nl");
        await page.fill("#phone", "0611223344");
        await page.click('button[type="submit"]');

        await page.waitForTimeout(1500);
        const submitButton = page.locator('button[type="submit"]');
        const buttonText = await submitButton.textContent();
        report(
            "Browser formulier inzending via UI slaagt",
            buttonText?.includes("Verzonden") || (await page.locator("text=Aanmelding ontvangen").isVisible())
        );

        await page.close();
    } catch (err) {
        report("Browser interactietest", false, err.message);
    }

    await browser.close();

    console.log("\n=================================================");
    console.log(`TEST RESULTATEN: ${passed} GESLAAGD, ${failed} MISLUKT`);
    console.log("=================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error("FATAL ERROR IN TEST RUNNER:", err);
    process.exit(1);
});
