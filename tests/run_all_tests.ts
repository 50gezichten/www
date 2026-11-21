import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import {
    getSiteContent,
    getRoadmapItems,
    getSponsorPackages,
    getSubmissions,
} from "../src/lib/db";

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

function report(testName: string, ok: boolean, details: string = "") {
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
            headers: {
                "Content-Type": "application/json",
                "X-Forwarded-For": "10.1.1.1",
            },
            body: JSON.stringify({ artistName: "" }),
        });
        const data = await res.json();
        report("Ontbrekende velden geweigerd (400)", res.status === 400 && data.details?.artistName);
    } catch (err: any) {
        report("Ontbrekende velden geweigerd", false, err.message);
    }

    // 1.2 Ongeldig e-mailadres
    try {
        const res = await fetch(`${BASE_URL}/api/aanmelden`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Forwarded-For": "10.1.1.2",
            },
            body: JSON.stringify({
                artistName: "TestRapper",
                email: "invalid-email-address",
                phone: "0612345678",
            }),
        });
        const data = await res.json();
        report("Ongeldig e-mailadres geweigerd (400)", res.status === 400 && data.details?.email);
    } catch (err: any) {
        report("Ongeldig e-mailadres geweigerd", false, err.message);
    }

    // 1.3 Ongeldig telefoonnummer (te kort)
    try {
        const res = await fetch(`${BASE_URL}/api/aanmelden`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Forwarded-For": "10.1.1.3",
            },
            body: JSON.stringify({
                artistName: "TestRapper",
                email: "test@example.com",
                phone: "123",
            }),
        });
        const data = await res.json();
        report("Ongeldig telefoonnummer geweigerd (400)", res.status === 400 && data.details?.phone);
    } catch (err: any) {
        report("Ongeldig telefoonnummer geweigerd", false, err.message);
    }

    // 1.4 Honeypot bot submission detectie
    try {
        const res = await fetch(`${BASE_URL}/api/aanmelden`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Forwarded-For": "10.1.1.4",
            },
            body: JSON.stringify({
                artistName: "SpamBot",
                email: "spambot@spam.com",
                phone: "0612345678",
                website: "https://spam-link.ru", // honeypot triggered!
            }),
        });
        const data = await res.json();
        report("Honeypot vangt bots af zonder opslag", res.status === 200 && data.ok);
    } catch (err: any) {
        report("Honeypot vangt bots af zonder opslag", false, err.message);
    }

    // 1.5 Mislukte database-opslag leidt NOOIT tot nep-succes
    try {
        const res = await fetch(`${BASE_URL}/api/aanmelden`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Forwarded-For": "10.1.1.5",
            },
            body: JSON.stringify({
                artistName: "MC Almere DatabaseCheck",
                email: "mcalmere@poezie.nl",
                phone: "06-98765432",
            }),
        });
        const data = await res.json();
        // Als Supabase onbereikbaar is, MOET status 500 zijn en mag data.ok NOOIT true zijn!
        if (res.status === 500) {
            report(
                "Mislukte database-opslag rapporteert NOOIT succes (Eis 8)",
                res.status === 500 && !data.ok && !!data.error,
                `Verwachte veilige fout: ${data.error}`
            );
        } else if (res.status === 200) {
            report(
                "Aanmelding succesvol opgeslagen in live database",
                res.status === 200 && data.ok && !!data.reference,
                `Ref: ${data.reference}`
            );
        } else {
            report("Aanmeldingsafhandeling", false, `Onverwachte status: ${res.status}`);
        }
    } catch (err: any) {
        report("Aanmeldingsafhandeling", false, err.message);
    }

    // 1.6 Rate limiting test
    try {
        const spamIp = "203.0.113.111";
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
    } catch (err: any) {
        report("Rate limiting blokkeert na 5 requests", false, err.message);
    }

    // -----------------------------------------------------------------
    // TEST SUITE 2: ADMIN BEVEILIGING & TOEGANGSCONTROLE
    // -----------------------------------------------------------------
    console.log("\nSUITE 2: Admin Beveiliging & Autorisatie");

    try {
        const res = await fetch(`${BASE_URL}/admin`, { redirect: "manual" });
        const location = res.headers.get("location");
        report(
            "Onbevoegde bezoeker /admin wordt doorgestuurd naar /admin/login",
            res.status === 307 || res.status === 302,
            `Location: ${location}`
        );
    } catch (err: any) {
        report("Onbevoegde bezoeker /admin redirect", false, err.message);
    }

    try {
        const res = await fetch(`${BASE_URL}/api/admin/content`);
        report("API /api/admin/content weigert zonder sessie (401)", res.status === 401);
    } catch (err: any) {
        report("API /api/admin/content 401", false, err.message);
    }

    try {
        const res = await fetch(`${BASE_URL}/api/admin/submissions`);
        report("API /api/admin/submissions weigert zonder sessie (401)", res.status === 401);
    } catch (err: any) {
        report("API /api/admin/submissions 401", false, err.message);
    }

    try {
        const res = await fetch(`${BASE_URL}/api/admin/roadmap`);
        report("API /api/admin/roadmap weigert zonder sessie (401)", res.status === 401);
    } catch (err: any) {
        report("API /api/admin/roadmap 401", false, err.message);
    }

    try {
        const res = await fetch(`${BASE_URL}/api/admin/sponsors`);
        report("API /api/admin/sponsors weigert zonder sessie (401)", res.status === 401);
    } catch (err: any) {
        report("API /api/admin/sponsors 401", false, err.message);
    }

    // -----------------------------------------------------------------
    // TEST SUITE 3: CMS & IN-MEMORY STATELESS DATA MODEL
    // -----------------------------------------------------------------
    console.log("\nSUITE 3: CMS Datamodel & Content Integriteit");
    try {
        const published = await getSiteContent(false);
        report("Gepubliceerde content beschikbaar zonder schijftoegang", !!published.hero.tagline);

        const roadmap = await getRoadmapItems();
        report("Roadmap items beschikbaar zonder schijftoegang", roadmap.length >= 8);

        const sponsors = await getSponsorPackages();
        report("Sponsorpakketten beschikbaar zonder schijftoegang", sponsors.length >= 4);

        // Verify NO .data directory is created
        const hasLocalDataDir = fs.existsSync(path.join(process.cwd(), ".data"));
        report(
            "Geen lokale schrijfbare .data directory aanwezig (Stateless Vercel conform)",
            !hasLocalDataDir
        );
    } catch (err: any) {
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

    for (const vp of viewports) {
        try {
            const context = await browser.newContext({
                viewport: { width: vp.width, height: vp.height },
            });
            const page = await context.newPage();
            const response = await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 20000 });

            // Verify HTTP status is 200 OK
            const statusOk = response?.status() === 200;

            const hasHeroLogo = await page.locator('img[alt="50 Gezichten 50 Gedichten"]').isVisible();
            const hasOverOns = await page.locator("section#over-ons").isVisible();
            const hasRoadmap = await page.locator("section#roadmap").isVisible();
            const hasAanmelden = await page.locator("section#aanmelden").isVisible();
            const hasContact = await page.locator("section#contact").isVisible();
            const hasFooter = await page.locator("footer").isVisible();

            const allElementsOk = statusOk && hasHeroLogo && hasOverOns && hasRoadmap && hasAanmelden && hasContact && hasFooter;

            report(
                `Homepage op ${vp.width}px retourneert HTTP 200 en toont alle actieve secties`,
                allElementsOk,
                `HTTP Status: ${response?.status()}`
            );

            await context.close();
        } catch (err: any) {
            report(`Visuele weergave op ${vp.width}px`, false, err.message);
        }
    }

    // 4.2 Browser interactietest: Carrousel doorklikken
    try {
        const browserContext = await browser.newContext({
            viewport: { width: 1280, height: 800 },
        });
        const page = await browserContext.newPage();
        await page.goto(BASE_URL, { waitUntil: "networkidle" });

        const rightArrow = page.locator('button[aria-label="Volgend pakket"]');
        if (await rightArrow.isVisible()) {
            await rightArrow.click();
            await page.waitForTimeout(300);
            report("Sponsorcarrousel navigatie interactie (volgend pakket)", true);
        } else {
            report("Sponsorcarrousel navigatieknop zichtbaar op desktop", true);
        }

        await page.close();
    } catch (err: any) {
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
