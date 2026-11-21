import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { validateSubmission } from "../src/lib/validation";
import { POST } from "../src/app/api/aanmelden/route";
import { NextRequest } from "next/server";
import { chromium, Browser, Page } from "playwright";
import { spawn, ChildProcess } from "node:child_process";

console.log("=================================================");
console.log("50 GEZICHTEN - FORM VALIDATION & UX VERIFICATION");
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
    // SUITE 1: Server-side Formuliervalidatie Regels (src/lib/validation.ts)
    // -----------------------------------------------------------------------------
    console.log("SUITE 1: Server-side Formuliervalidatie Regels");

    await test("1.1 Ongeldig e-mailadres retourneert 'Voer een geldig e-mailadres in'", () => {
        const result = validateSubmission({
            artistName: "MC Almere",
            email: "ongeldig-email-zonder-at",
            phone: "0612345678",
        });
        assert.strictEqual(result.valid, false);
        assert.strictEqual(result.errors.email, "Voer een geldig e-mailadres in");
    });

    await test("1.2 Ontbrekend / leeg e-mailadres retourneert 'Voer een geldig e-mailadres in'", () => {
        const result = validateSubmission({
            artistName: "MC Almere",
            email: "   ",
            phone: "0612345678",
        });
        assert.strictEqual(result.valid, false);
        assert.strictEqual(result.errors.email, "Voer een geldig e-mailadres in");
    });

    await test("1.3 Ongeldig telefoonnummer (< 8 cijfers) retourneert 'Voer een geldig telefoonnummer in'", () => {
        const result = validateSubmission({
            artistName: "MC Almere",
            email: "artiest@50gezichten.nl",
            phone: "06-12",
        });
        assert.strictEqual(result.valid, false);
        assert.strictEqual(result.errors.phone, "Voer een geldig telefoonnummer in");
    });

    await test("1.4 Ongeldig telefoonnummer (> 15 cijfers) retourneert 'Voer een geldig telefoonnummer in'", () => {
        const result = validateSubmission({
            artistName: "MC Almere",
            email: "artiest@50gezichten.nl",
            phone: "061234567890123456",
        });
        assert.strictEqual(result.valid, false);
        assert.strictEqual(result.errors.phone, "Voer een geldig telefoonnummer in");
    });

    await test("1.5 Ontbrekend telefoonnummer retourneert 'Voer een geldig telefoonnummer in'", () => {
        const result = validateSubmission({
            artistName: "MC Almere",
            email: "artiest@50gezichten.nl",
            phone: "",
        });
        assert.strictEqual(result.valid, false);
        assert.strictEqual(result.errors.phone, "Voer een geldig telefoonnummer in");
    });

    await test("1.6 Zowel e-mail als telefoon tegelijkertijd ongeldig retourneert beide foutmeldingen", () => {
        const result = validateSubmission({
            artistName: "MC Almere",
            email: "ongeldig",
            phone: "123",
        });
        assert.strictEqual(result.valid, false);
        assert.strictEqual(result.errors.email, "Voer een geldig e-mailadres in");
        assert.strictEqual(result.errors.phone, "Voer een geldig telefoonnummer in");
        assert.strictEqual(result.errors.artistName, undefined);
    });

    await test("1.7 Ontbrekende artiestennaam retourneert 'Artiestennaam is verplicht'", () => {
        const result = validateSubmission({
            artistName: "",
            email: "artiest@50gezichten.nl",
            phone: "0612345678",
        });
        assert.strictEqual(result.valid, false);
        assert.strictEqual(result.errors.artistName, "Artiestennaam is verplicht");
    });

    await test("1.8 Te korte artiestennaam (< 2 tekens) retourneert 'Artiestennaam moet minimaal 2 tekens bevatten'", () => {
        const result = validateSubmission({
            artistName: "X",
            email: "artiest@50gezichten.nl",
            phone: "0612345678",
        });
        assert.strictEqual(result.valid, false);
        assert.strictEqual(result.errors.artistName, "Artiestennaam moet minimaal 2 tekens bevatten");
    });

    await test("1.9 Te lange artiestennaam (> 100 tekens) retourneert 'Artiestennaam mag maximaal 100 tekens zijn'", () => {
        const result = validateSubmission({
            artistName: "A".repeat(101),
            email: "artiest@50gezichten.nl",
            phone: "0612345678",
        });
        assert.strictEqual(result.valid, false);
        assert.strictEqual(result.errors.artistName, "Artiestennaam mag maximaal 100 tekens zijn");
    });

    await test("1.10 Te lange invoer voor optionele Instagram (> 100 tekens) retourneert foutmelding", () => {
        const result = validateSubmission({
            artistName: "MC Almere",
            email: "artiest@50gezichten.nl",
            phone: "0612345678",
            instagram: "insta_".repeat(30),
        });
        assert.strictEqual(result.valid, false);
        assert.strictEqual(result.errors.instagram, "Instagram mag maximaal 100 tekens zijn");
    });

    await test("1.11 Te lange invoer voor optionele TikTok (> 100 tekens) retourneert foutmelding", () => {
        const result = validateSubmission({
            artistName: "MC Almere",
            email: "artiest@50gezichten.nl",
            phone: "0612345678",
            tiktok: "tiktok_".repeat(30),
        });
        assert.strictEqual(result.valid, false);
        assert.strictEqual(result.errors.tiktok, "TikTok mag maximaal 100 tekens zijn");
    });

    await test("1.12 Volledig geldige gegevens slagen voor validatie", () => {
        const result = validateSubmission({
            artistName: "MC Almere",
            email: "artiest@50gezichten.nl",
            phone: "+31 6 12345678",
            instagram: "@mcalmere",
            tiktok: "@mcalmere_tiktok",
        });
        assert.strictEqual(result.valid, true);
        assert.deepStrictEqual(result.errors, {});
        assert.strictEqual(result.sanitized.artistName, "MC Almere");
        assert.strictEqual(result.sanitized.email, "artiest@50gezichten.nl");
        assert.strictEqual(result.sanitized.phone, "+31 6 12345678");
        assert.strictEqual(result.sanitized.instagram, "@mcalmere");
        assert.strictEqual(result.sanitized.tiktok, "@mcalmere_tiktok");
    });

    await test("1.13 Honeypot botvelden triggeren bot-detectie", () => {
        const result = validateSubmission({
            artistName: "Bot Spammer",
            email: "spambot@example.com",
            phone: "0612345678",
            website: "https://spam.com",
        });
        assert.strictEqual(result.valid, false);
        assert.strictEqual(result.errors.bot, "Bot submission detected");
    });

    // -----------------------------------------------------------------------------
    // SUITE 2: API Route Beveiliging en Responsestructuur (/api/aanmelden)
    // -----------------------------------------------------------------------------
    console.log("\nSUITE 2: API Route Beveiliging & Responsestructuur");

    await test("2.1 API retourneert HTTP 400 met details object bij validatiefouten", async () => {
        const req = new NextRequest("http://localhost:3000/api/aanmelden", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Forwarded-For": "192.168.1.100",
            },
            body: JSON.stringify({
                artistName: "",
                email: "bademail",
                phone: "123",
            }),
        });
        const res = await POST(req);
        assert.strictEqual(res.status, 400);
        const data = await res.json();
        assert.strictEqual(data.error, "Validatiefout bij het invullen van het formulier");
        assert.ok(data.details, "details object moet aanwezig zijn");
        assert.strictEqual(data.details.artistName, "Artiestennaam is verplicht");
        assert.strictEqual(data.details.email, "Voer een geldig e-mailadres in");
        assert.strictEqual(data.details.phone, "Voer een geldig telefoonnummer in");
    });

    await test("2.2 Honeypot aanmelding retourneert HTTP 200 en voorkomt verwerking", async () => {
        const req = new NextRequest("http://localhost:3000/api/aanmelden", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Forwarded-For": "192.168.1.101",
            },
            body: JSON.stringify({
                artistName: "Bot User",
                email: "bot@bot.com",
                phone: "0612345678",
                website: "https://bot-trap.com",
            }),
        });
        const res = await POST(req);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.ok, true);
        assert.strictEqual(data.reference, "50G-CONFIRMED");
    });

    await test("2.3 Malformed JSON retourneert HTTP 400", async () => {
        const req = new NextRequest("http://localhost:3000/api/aanmelden", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Forwarded-For": "192.168.1.102",
            },
            body: "{not-valid-json",
        });
        const res = await POST(req);
        assert.strictEqual(res.status, 400);
        const data = await res.json();
        assert.strictEqual(data.error, "Ongeldige gegevens ontvangen");
    });

    // -----------------------------------------------------------------------------
    // SUITE 3: Frontend Toegankelijkheid & UX Code Inspectie (src/app/HomePageClient.tsx)
    // -----------------------------------------------------------------------------
    console.log("\nSUITE 3: Frontend Toegankelijkheid & UX Code Inspectie");

    const homeClientPath = path.join(process.cwd(), "src/app/HomePageClient.tsx");
    const homeClientContent = fs.readFileSync(homeClientPath, "utf-8");

    await test("3.1 Formulier gebruikt noValidate om native HTML5 tooltips te vervangen door custom UX", () => {
        assert.ok(
            homeClientContent.includes("<form noValidate onSubmit={handleSubmit}"),
            "Formulier moet noValidate hebben"
        );
    });

    await test("3.2 Alle invoervelden hebben aria-invalid gekoppeld aan veldfouten", () => {
        assert.ok(
            homeClientContent.includes("aria-invalid={!!fieldErrors.artistName}"),
            "artistName moet aria-invalid hebben"
        );
        assert.ok(
            homeClientContent.includes("aria-invalid={!!fieldErrors.email}"),
            "email moet aria-invalid hebben"
        );
        assert.ok(
            homeClientContent.includes("aria-invalid={!!fieldErrors.phone}"),
            "phone moet aria-invalid hebben"
        );
        assert.ok(
            homeClientContent.includes("aria-invalid={!!fieldErrors.instagram}"),
            "instagram moet aria-invalid hebben"
        );
        assert.ok(
            homeClientContent.includes("aria-invalid={!!fieldErrors.tiktok}"),
            "tiktok moet aria-invalid hebben"
        );
    });

    await test("3.3 Alle invoervelden hebben aria-describedby gekoppeld aan de foutmelding-ID", () => {
        assert.ok(
            homeClientContent.includes('aria-describedby={fieldErrors.artistName ? "artistName-error" : undefined}'),
            "artistName moet aria-describedby hebben"
        );
        assert.ok(
            homeClientContent.includes('aria-describedby={fieldErrors.email ? "email-error" : undefined}'),
            "email moet aria-describedby hebben"
        );
        assert.ok(
            homeClientContent.includes('aria-describedby={fieldErrors.phone ? "phone-error" : undefined}'),
            "phone moet aria-describedby hebben"
        );
        assert.ok(
            homeClientContent.includes('aria-describedby={fieldErrors.instagram ? "instagram-error" : undefined}'),
            "instagram moet aria-describedby hebben"
        );
        assert.ok(
            homeClientContent.includes('aria-describedby={fieldErrors.tiktok ? "tiktok-error" : undefined}'),
            "tiktok moet aria-describedby hebben"
        );
    });

    await test("3.4 Foutmeldingen hebben role='alert' voor schermlezers", () => {
        assert.ok(
            homeClientContent.includes('id="artistName-error" className="text-red-600 text-sm mt-1.5 font-medium" role="alert"'),
            "Foutmeldingen moeten role='alert' hebben"
        );
    });

    await test("3.5 Ongeldige velden krijgen duidelijke rode rand (border-red-500)", () => {
        assert.ok(
            homeClientContent.includes("border-red-500 focus:border-red-500"),
            "Ongeldige velden moeten border-red-500 krijgen"
        );
    });

    await test("3.6 Knopteksten volgen exact de gevraagde specificaties", () => {
        assert.ok(
            homeClientContent.includes('? "VERZENDEN..."'),
            "Bezig tekst moet VERZENDEN... zijn"
        );
        assert.ok(
            homeClientContent.includes('? "VERZONDEN!"'),
            "Succes tekst moet VERZONDEN! zijn"
        );
        assert.ok(
            homeClientContent.includes('? "PROBEER OPNIEUW"'),
            "Fout tekst moet PROBEER OPNIEUW zijn"
        );
        assert.ok(
            homeClientContent.includes(': "VERSTUUR AANMELDING"'),
            "Standaard tekst moet VERSTUUR AANMELDING zijn"
        );
    });

    await test("3.7 Knop blijft bruikbaar na fout (alleen disabled bij sending)", () => {
        assert.ok(
            homeClientContent.includes('disabled={formStatus === "sending"}'),
            "Knop mag alleen disabled zijn bij sending"
        );
    });

    await test("3.8 Algemene melding 'Controleer je gegevens en corrigeer de gemarkeerde velden.' bij meerdere fouten", () => {
        assert.ok(
            homeClientContent.includes('"Controleer je gegevens en corrigeer de gemarkeerde velden."'),
            "Algemene melding bij meerdere fouten moet exact overeenkomen"
        );
    });

    await test("3.9 Focus en scroll naar het eerste ongeldige veld bij validatiefout", () => {
        assert.ok(
            homeClientContent.includes("const firstInvalid = FIELD_ORDER.find"),
            "Eerste ongeldige veld moet worden opgezocht"
        );
        assert.ok(
            homeClientContent.includes("el.focus()"),
            "Eerste ongeldige veld moet focus krijgen"
        );
        assert.ok(
            homeClientContent.includes('el.scrollIntoView({ behavior: "smooth", block: "center" })'),
            "Eerste ongeldige veld moet in beeld worden gescrold"
        );
    });

    await test("3.10 Formulierdata wordt uitsluitend gewist bij succesvolle verzending", () => {
        // Controleer dat setFormData({ artistName: "", ... }) alleen voorkomt in het succes-blok
        const submitFn = homeClientContent.substring(
            homeClientContent.indexOf("const handleSubmit ="),
            homeClientContent.indexOf("const nextPackage =")
        );
        const matches = submitFn.match(/artistName:\s*""/g);
        assert.strictEqual(
            matches ? matches.length : 0,
            1,
            "setFormData met lege velden mag uitsluitend eenmaal voorkomen in de succes-afhandeling"
        );
    });

    // -----------------------------------------------------------------------------
    // SUITE 4: Browser E2E Tests (Playwright)
    // -----------------------------------------------------------------------------
    console.log("\nSUITE 4: Browser E2E Tests met Playwright");

    const TEST_PORT = 3192;
    const TEST_URL = `http://localhost:${TEST_PORT}`;
    let serverProcess: ChildProcess | null = null;
    let browser: Browser | null = null;

    try {
        // Start Next.js server
        serverProcess = spawn("npx", ["next", "start", "-p", String(TEST_PORT)], {
            stdio: "ignore",
            env: { ...process.env, PORT: String(TEST_PORT) },
        });

        // Wacht tot de server luistert
        let serverReady = false;
        for (let i = 0; i < 40; i++) {
            try {
                const res = await fetch(`${TEST_URL}/api/aanmelden`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                });
                if (res.status === 400) {
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

        await page.goto(`${TEST_URL}#aanmelden`, { waitUntil: "networkidle" });

        await test("4.1 Leeg formulier verzenden toont rode randen, foutmeldingen en knop 'PROBEER OPNIEUW'", async () => {
            const submitBtn = page.locator("section#aanmelden button[type='submit']");
            await submitBtn.click();

            // Wacht op validatieresponse
            await page.waitForSelector("#artistName-error");

            const artistError = await page.locator("#artistName-error").textContent();
            const emailError = await page.locator("#email-error").textContent();
            const phoneError = await page.locator("#phone-error").textContent();

            assert.strictEqual(artistError?.trim(), "Artiestennaam is verplicht");
            assert.strictEqual(emailError?.trim(), "Voer een geldig e-mailadres in");
            assert.strictEqual(phoneError?.trim(), "Voer een geldig telefoonnummer in");

            // Algemene melding bij meerdere velden
            const feedbackText = await page.locator("#form-feedback").textContent();
            assert.strictEqual(feedbackText?.trim(), "Controleer je gegevens en corrigeer de gemarkeerde velden.");

            // Knoptekst
            const btnText = await submitBtn.textContent();
            assert.strictEqual(btnText?.trim(), "PROBEER OPNIEUW");

            // Visuele rode rand
            const artistInputClasses = await page.locator("#artistName").getAttribute("class");
            assert.ok(artistInputClasses?.includes("border-red-500"));

            // Eerste ongeldige veld heeft focus
            await page.waitForFunction(() => document.activeElement?.id === "artistName");
            const focusedId = await page.evaluate(() => document.activeElement?.id);
            assert.strictEqual(focusedId, "artistName");
        });

        await test("4.2 Corrigeren van artiestennaam verwijdert de artiestennaam-fout, behoudt e-mail en telefoon fouten", async () => {
            await page.locator("#artistName").fill("MC Spitsvondig");

            // Foutmelding voor artistName moet direct verdwijnen
            const hasArtistError = await page.locator("#artistName-error").count();
            assert.strictEqual(hasArtistError, 0);

            // E-mail en telefoon fouten moeten zichtbaar blijven
            const emailError = await page.locator("#email-error").textContent();
            const phoneError = await page.locator("#phone-error").textContent();
            assert.strictEqual(emailError?.trim(), "Voer een geldig e-mailadres in");
            assert.strictEqual(phoneError?.trim(), "Voer een geldig telefoonnummer in");

            // Ingevulde waarde is behouden
            const val = await page.locator("#artistName").inputValue();
            assert.strictEqual(val, "MC Spitsvondig");
        });

        await test("4.3 Corrigeren van e-mailadres verwijdert de algemene 'meerdere velden' melding en behoudt telefoon fout", async () => {
            await page.locator("#email").fill("spitsvondig@almere.nl");

            // E-mailfout moet direct verdwijnen
            const hasEmailError = await page.locator("#email-error").count();
            assert.strictEqual(hasEmailError, 0);

            // Algemene melding moet verdwijnen omdat er nu nog maar 1 fout is
            const hasGeneralFeedback = await page.locator("#form-feedback").count();
            assert.strictEqual(hasGeneralFeedback, 0);

            // Telefoonfout blijft nog wel staan
            const phoneError = await page.locator("#phone-error").textContent();
            assert.strictEqual(phoneError?.trim(), "Voer een geldig telefoonnummer in");
        });

        await test("4.4 Invoeren van ongeldig telefoonnummer en klikken op 'PROBEER OPNIEUW' behoudt eerdere invoer", async () => {
            await page.locator("#phone").fill("123");
            const submitBtn = page.locator("section#aanmelden button[type='submit']");
            await submitBtn.click();

            await page.waitForSelector("#phone-error");
            const phoneError = await page.locator("#phone-error").textContent();
            assert.strictEqual(phoneError?.trim(), "Voer een geldig telefoonnummer in");

            // Eerdere invoer is behouden
            assert.strictEqual(await page.locator("#artistName").inputValue(), "MC Spitsvondig");
            assert.strictEqual(await page.locator("#email").inputValue(), "spitsvondig@almere.nl");
            assert.strictEqual(await page.locator("#phone").inputValue(), "123");
        });

        await test("4.5 Corrigeren van telefoonnummer verwijdert alle fouten", async () => {
            await page.locator("#phone").fill("06-12345678");

            const hasPhoneError = await page.locator("#phone-error").count();
            assert.strictEqual(hasPhoneError, 0);
            assert.strictEqual(await page.locator("#artistName-error").count(), 0);
            assert.strictEqual(await page.locator("#email-error").count(), 0);
        });

        await test("4.6 Toetsenbordnavigatie en toegankelijkheid", async () => {
            // Focus op artistName en toets Tab
            await page.locator("#artistName").focus();
            await page.keyboard.press("Tab");

            let activeId = await page.evaluate(() => document.activeElement?.id);
            assert.strictEqual(activeId, "email");

            await page.keyboard.press("Tab");
            activeId = await page.evaluate(() => document.activeElement?.id);
            assert.strictEqual(activeId, "phone");

            await page.keyboard.press("Tab");
            activeId = await page.evaluate(() => document.activeElement?.id);
            assert.strictEqual(activeId, "instagram");

            await page.keyboard.press("Tab");
            activeId = await page.evaluate(() => document.activeElement?.id);
            assert.strictEqual(activeId, "tiktok");
        });

        await test("4.7 Serverfout (500) toont neutrale technische foutmelding zonder stacktrace of invoerfout", async () => {
            // Intercept POST request naar /api/aanmelden en simuleer 500 error
            await page.route("**/api/aanmelden", (route) => {
                route.fulfill({
                    status: 500,
                    contentType: "application/json",
                    body: JSON.stringify({
                        error: "Er is een onverwachte serverfout opgetreden bij het verwerken van de aanmelding. Probeer het later opnieuw.",
                    }),
                });
            });

            const submitBtn = page.locator("section#aanmelden button[type='submit']");
            await submitBtn.click();

            await page.waitForSelector("#form-feedback");
            const feedbackText = await page.locator("#form-feedback").textContent();
            assert.strictEqual(
                feedbackText?.trim(),
                "Er is een onverwachte serverfout opgetreden bij het verwerken van de aanmelding. Probeer het later opnieuw."
            );

            // Geen veldfouten gemarkeerd (het was een serverfout, geen invoerfout)
            assert.strictEqual(await page.locator("#artistName-error").count(), 0);
            assert.strictEqual(await page.locator("#email-error").count(), 0);
            assert.strictEqual(await page.locator("#phone-error").count(), 0);

            // Gegevens blijven behouden
            assert.strictEqual(await page.locator("#artistName").inputValue(), "MC Spitsvondig");

            // Knop toont PROBEER OPNIEUW
            assert.strictEqual((await submitBtn.textContent())?.trim(), "PROBEER OPNIEUW");

            // Verwijder route interception
            await page.unroute("**/api/aanmelden");
        });

        await test("4.8 Succesvolle aanmelding toont referentie en wist formuliergegevens", async () => {
            // Intercept POST request naar /api/aanmelden en simuleer succes
            await page.route("**/api/aanmelden", (route) => {
                route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        ok: true,
                        reference: "50G-TESTREF-999",
                        message: "Aanmelding succesvol ontvangen en opgeslagen.",
                    }),
                });
            });

            const submitBtn = page.locator("section#aanmelden button[type='submit']");
            await submitBtn.click();

            await page.waitForSelector("#form-feedback");
            const feedbackText = await page.locator("#form-feedback").textContent();
            assert.ok(feedbackText?.includes("50G-TESTREF-999"));

            const btnText = await submitBtn.textContent();
            assert.strictEqual(btnText?.trim(), "VERZONDEN!");

            // Formulier moet gewist zijn na succes
            assert.strictEqual(await page.locator("#artistName").inputValue(), "");
            assert.strictEqual(await page.locator("#email").inputValue(), "");
            assert.strictEqual(await page.locator("#phone").inputValue(), "");

            await page.unroute("**/api/aanmelden");
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
