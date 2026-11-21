import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import ReactDOMServer from "react-dom/server";
(globalThis as any).React = React;
import { initialSiteContent } from "../src/lib/default-data";
import { getSiteContent, setSupportVisibility } from "../src/lib/db";
import { PATCH } from "../src/app/api/admin/content/route";
import { NextRequest } from "next/server";
import { chromium, Browser } from "playwright";
import { spawn, ChildProcess } from "node:child_process";

console.log("=================================================");
console.log("50 GEZICHTEN - SUPPORT SECTIE ZICHTBAARHEID TEST");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
    try {
        await fn();
        passed++;
        console.log(`  ✓ PASS: ${name}`);
    } catch (err: any) {
        failed++;
        console.error(`  ✗ FAIL: ${name}`);
        console.error(`    ${err.message}`);
    }
}

async function runAll() {
    // -----------------------------------------------------------------------------
    // SUITE 1: Datamodel & Standaardwaarden
    // -----------------------------------------------------------------------------
    console.log("SUITE 1: Datamodel & Standaardwaarden");

    await test("1.1 initialSiteContent.support.enabled is standaard false (verborgen)", () => {
        assert.strictEqual(
            initialSiteContent.support.enabled,
            false,
            "Support-sectie moet standaard verborgen zijn"
        );
    });

    await test("1.2 getSiteContent() levert support.enabled = false op bij ontbrekende DB configuratie", async () => {
        const content = await getSiteContent(false);
        assert.strictEqual(
            content.support.enabled,
            false,
            "getSiteContent() moet standaard support.enabled = false opleveren"
        );
    });

    await test("1.3 setSupportVisibility(true) schakelt zichtbaarheid in", async () => {
        const updated = await setSupportVisibility(true, "test-admin");
        assert.strictEqual(updated.support.enabled, true);
    });

    await test("1.4 setSupportVisibility(false) schakelt zichtbaarheid weer uit", async () => {
        const updated = await setSupportVisibility(false, "test-admin");
        assert.strictEqual(updated.support.enabled, false);
    });

    // -----------------------------------------------------------------------------
    // SUITE 3: Statische Broncode & CMS Dashboard Inspectie
    // -----------------------------------------------------------------------------
    console.log("\nSUITE 3: Statische Broncode & CMS Dashboard Inspectie");

    const homeClientSrc = fs.readFileSync(path.join(process.cwd(), "src/app/HomePageClient.tsx"), "utf-8");
    const sponsorManagerSrc = fs.readFileSync(path.join(process.cwd(), "src/app/admin/sponsors/SponsorManager.tsx"), "utf-8");
    const textEditorSrc = fs.readFileSync(path.join(process.cwd(), "src/app/admin/teksten/TextEditorForm.tsx"), "utf-8");
    const adminPageSrc = fs.readFileSync(path.join(process.cwd(), "src/app/admin/page.tsx"), "utf-8");

    await test("3.1 HomePageClient berekent showSupport op basis van content.support?.enabled", () => {
        assert.ok(
            homeClientSrc.includes("const showSupport = content.support?.enabled === true;"),
            "showSupport moet gebaseerd zijn op content.support.enabled === true"
        );
    });

    await test("3.2 HomePageClient toont section#support uitsluitend als showSupport waar is", () => {
        assert.ok(
            homeClientSrc.includes("{showSupport && (\n                    <section id=\"support\""),
            "section#support moet gewrapped zijn in showSupport"
        );
    });

    await test("3.3 Desktop en mobiele navigatielinks voor Support zijn conditioneel gewrapped", () => {
        assert.ok(
            homeClientSrc.includes("{showSupport && (\n                                <li>\n                                    <a href=\"#support\""),
            "Desktop nav Support link moet gewrapped zijn in showSupport"
        );
    });

    await test("3.4 SponsorManager bevat de zichtbaarheidsbadge en toggle-knop voor Support", () => {
        assert.ok(
            sponsorManagerSrc.includes("handleToggleSupport"),
            "SponsorManager moet handleToggleSupport bevatten"
        );
        assert.ok(
            sponsorManagerSrc.includes("Zichtbaarheid van Support &amp; Sponsorkaarten op Website"),
            "SponsorManager moet een zichtbaarheidskaart tonen"
        );
        assert.ok(
            sponsorManagerSrc.includes("Verberg Support-sectie"),
            "SponsorManager moet knop bevatten om te verbergen"
        );
        assert.ok(
            sponsorManagerSrc.includes("Toon Support-sectie op website"),
            "SponsorManager moet knop bevatten om te tonen"
        );
    });

    await test("3.5 TextEditorForm bevat de toggle-switch voor Support-sectie onder Sectie 4", () => {
        assert.ok(
            textEditorSrc.includes("Support-sectie tonen op publieke website"),
            "TextEditorForm moet optie hebben voor support zichtbaarheid"
        );
        assert.ok(
            textEditorSrc.includes("formData.support.enabled === true"),
            "TextEditorForm checkbox moet gekoppeld zijn aan formData.support.enabled"
        );
    });

    await test("3.6 Admin Hoofddashboard toont de statusbadge (Zichtbaar/Verborgen) op de Sponsor-KPI", () => {
        assert.ok(
            adminPageSrc.includes("content.support?.enabled === true ? \"Zichtbaar\" : \"Verborgen\""),
            "Dashboard KPI moet Zichtbaar/Verborgen tonen"
        );
        assert.ok(
            adminPageSrc.includes("content.support?.enabled === true ? \"AAN\" : \"UIT\""),
            "Snelle modules link moet status tonen"
        );
    });

    // -----------------------------------------------------------------------------
    // SUITE 4: Browser E2E Tests (Playwright)
    // -----------------------------------------------------------------------------
    console.log("\nSUITE 4: Browser E2E Tests met Playwright");

    const TEST_PORT = 3194;
    const TEST_URL = `http://localhost:${TEST_PORT}`;
    let serverProcess: ChildProcess | null = null;
    let browser: Browser | null = null;

    try {
        serverProcess = spawn("npx", ["next", "start", "-p", String(TEST_PORT)], {
            stdio: "ignore",
            env: { ...process.env, PORT: String(TEST_PORT) },
        });

        // Wacht tot de server luistert
        let serverReady = false;
        for (let i = 0; i < 40; i++) {
            try {
                const res = await fetch(`${TEST_URL}`);
                if (res.status === 200) {
                    serverReady = true;
                    break;
                }
            } catch {
                await new Promise((r) => setTimeout(r, 250));
            }
        }

        if (!serverReady) {
            throw new Error(`Server kon niet starten op poort ${TEST_PORT}`);
        }

        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            viewport: { width: 1280, height: 800 },
        });
        const page = await context.newPage();

        await page.goto(TEST_URL, { waitUntil: "networkidle" });

        await test("4.1 PATCH /api/admin/content weigert niet-geauthenticeerde verzoeken (401)", async () => {
            const res = await fetch(`${TEST_URL}/api/admin/content`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled: true }),
            });
            assert.strictEqual(res.status, 401);
        });

        await test("4.2 Publieke homepage verbergt section#support standaard", async () => {
            const hasSupportSection = await page.locator("section#support").count();
            assert.strictEqual(
                hasSupportSection,
                0,
                "section#support mag niet aanwezig zijn wanneer support.enabled false is"
            );
        });

        await test("4.3 Publieke homepage verbergt 'Support' in de desktop navigatiebalk", async () => {
            const supportNavLink = await page.locator('nav ul a[href="#support"]').count();
            assert.strictEqual(
                supportNavLink,
                0,
                "Desktop navigatielink naar #support mag niet getoond worden"
            );
        });

        await test("4.4 Overige secties (#over-ons, #roadmap, #aanmelden, #contact) blijven volledig intact en zichtbaar", async () => {
            assert.ok(await page.locator("section#over-ons").isVisible(), "Over ons moet zichtbaar zijn");
            assert.ok(await page.locator("section#roadmap").isVisible(), "Roadmap moet zichtbaar zijn");
            assert.ok(await page.locator("section#aanmelden").isVisible(), "Aanmelden moet zichtbaar zijn");
            assert.ok(await page.locator("section#contact").isVisible(), "Contact moet zichtbaar zijn");
            assert.ok(await page.locator("footer").isVisible(), "Footer moet zichtbaar zijn");
        });

        await test("4.5 HomePageClient rendert section#support en navigatielink uitsluitend wanneer support.enabled true is", async () => {
            const HomePageClient = (await import("../src/app/HomePageClient")).default;
            const { initialRoadmapItems, initialSponsorPackages } = await import("../src/lib/default-data");

            // 1. Wanneer enabled false is
            const htmlHidden = ReactDOMServer.renderToString(
                React.createElement(HomePageClient, {
                    content: { ...initialSiteContent, support: { ...initialSiteContent.support, enabled: false } },
                    roadmapItems: initialRoadmapItems,
                    sponsorPackages: initialSponsorPackages,
                })
            );
            assert.strictEqual(htmlHidden.includes('id="support"'), false, "section#support mag niet gerenderd worden bij enabled: false");
            assert.strictEqual(htmlHidden.includes('href="#support"'), false, "Link naar #support mag niet in menu voorkomen bij enabled: false");

            // 2. Wanneer enabled true is
            const htmlVisible = ReactDOMServer.renderToString(
                React.createElement(HomePageClient, {
                    content: { ...initialSiteContent, support: { ...initialSiteContent.support, enabled: true } },
                    roadmapItems: initialRoadmapItems,
                    sponsorPackages: initialSponsorPackages,
                })
            );
            assert.strictEqual(htmlVisible.includes('id="support"'), true, "section#support moet gerenderd worden bij enabled: true");
            assert.strictEqual(htmlVisible.includes('href="#support"'), true, "Link naar #support moet in menu voorkomen bij enabled: true");
            assert.ok(htmlVisible.includes(initialSiteContent.support.custom_package_email), "Custom package email moet aanwezig zijn bij enabled: true");
        });

    } finally {
        if (browser) {
            await browser.close();
        }
        if (serverProcess) {
            serverProcess.kill();
        }
    }

    console.log("\n=================================================");
    console.log(`RESULTAAT: ${passed} geslaagd, ${failed} gefaald`);
    console.log("=================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runAll().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
