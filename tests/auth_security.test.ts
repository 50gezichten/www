import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { isAllowedAdmin } from "../src/auth";

console.log("=================================================");
console.log("50 GEZICHTEN - AUTH.JS SECURITY VERIFICATION TEST");
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

const originalEnv = { ...process.env };

function resetEnv() {
    process.env = { ...originalEnv };
}

async function runAll() {
    // -----------------------------------------------------------------------------
    // 1. ADMIN_GITHUB_IDS VERIFICATION & DEFAULT ADMIN REMOVAL
    // -----------------------------------------------------------------------------
    console.log("SUITE 1: Beheerdersautorisatie & Allowlist Handhaving");

    await test("Geen toegang wanneer ADMIN_GITHUB_IDS ontbreekt (undefined)", () => {
        delete process.env.ADMIN_GITHUB_IDS;
        assert.strictEqual(
            isAllowedAdmin({ id: 12345, login: "someuser" }),
            false,
            "Sign-in moet worden geweigerd wanneer ADMIN_GITHUB_IDS ontbreekt"
        );
    });

    await test("Geen toegang wanneer ADMIN_GITHUB_IDS leeg is (empty string)", () => {
        process.env.ADMIN_GITHUB_IDS = "";
        assert.strictEqual(
            isAllowedAdmin({ id: 12345, login: "someuser" }),
            false,
            "Sign-in moet worden geweigerd bij een lege ADMIN_GITHUB_IDS string"
        );
    });

    await test("Geen toegang wanneer ADMIN_GITHUB_IDS alleen witruimte bevat", () => {
        process.env.ADMIN_GITHUB_IDS = "   ";
        assert.strictEqual(
            isAllowedAdmin({ id: 12345, login: "someuser" }),
            false,
            "Sign-in moet worden geweigerd bij alleen witruimte"
        );
    });

    await test("Verwijderde standaardaccounts (278548191, 346629474, 265046697) hebben geen toegang meer", () => {
        delete process.env.ADMIN_GITHUB_IDS;
        assert.strictEqual(isAllowedAdmin({ id: 278548191 }), false);
        assert.strictEqual(isAllowedAdmin({ id: 346629474 }), false);
        assert.strictEqual(isAllowedAdmin({ id: 265046697 }), false);
        assert.strictEqual(isAllowedAdmin(null, "278548191"), false);
    });

    await test("Niet-geautoriseerd account wordt geweigerd wanneer allowlist geconfigureerd is", () => {
        process.env.ADMIN_GITHUB_IDS = "10001, 10002";
        assert.strictEqual(
            isAllowedAdmin({ id: 99999, login: "attacker" }),
            false,
            "Account niet in allowlist moet geweigerd worden"
        );
        assert.strictEqual(
            isAllowedAdmin(null, "99999"),
            false,
            "User ID niet in allowlist moet geweigerd worden"
        );
    });

    await test("Geautoriseerd numeriek GitHub ID wordt geaccepteerd (number en string)", () => {
        process.env.ADMIN_GITHUB_IDS = "12345678, 87654321";
        // As number
        assert.strictEqual(
            isAllowedAdmin({ id: 12345678, login: "alloweduser" }),
            true,
            "Numeriek GitHub ID (number) moet toegelaten worden"
        );
        // As string
        assert.strictEqual(
            isAllowedAdmin({ id: "12345678", login: "alloweduser" }),
            true,
            "Numeriek GitHub ID (string) moet toegelaten worden"
        );
        // Via fallback userId
        assert.strictEqual(
            isAllowedAdmin(null, "87654321"),
            true,
            "UserId fallback in allowlist moet toegelaten worden"
        );
    });

    await test("Witruimte en komma's in ADMIN_GITHUB_IDS worden correct getrimd", () => {
        process.env.ADMIN_GITHUB_IDS = "  55555  ,  66666  , , ";
        assert.strictEqual(isAllowedAdmin({ id: 55555 }), true);
        assert.strictEqual(isAllowedAdmin({ id: 66666 }), true);
        assert.strictEqual(isAllowedAdmin({ id: 77777 }), false);
    });

    await test("Lege profielgegevens worden veilig afgehandeld zonder uitzondering", () => {
        process.env.ADMIN_GITHUB_IDS = "12345";
        assert.strictEqual(isAllowedAdmin(null, null), false);
        assert.strictEqual(isAllowedAdmin(undefined, undefined), false);
        assert.strictEqual(isAllowedAdmin({}, undefined), false);
    });

    resetEnv();

    // -----------------------------------------------------------------------------
    // 2. CODEBASE AUDIT: GEEN HARDCODED FALLBACKS & TRUSTHOST
    // -----------------------------------------------------------------------------
    console.log("\nSUITE 2: Statische Beveiligingsaudit Broncode");

    await test("src/auth.ts bevat geen defaultAdminIds fallback meer", () => {
        const authCode = fs.readFileSync(path.join(process.cwd(), "src/auth.ts"), "utf-8");
        assert.strictEqual(
            authCode.includes("defaultAdminIds"),
            false,
            "defaultAdminIds mag niet meer voorkomen in src/auth.ts"
        );
        assert.strictEqual(
            authCode.includes("278548191"),
            false,
            "Hardcoded admin ID 278548191 mag niet meer voorkomen in src/auth.ts"
        );
    });

    await test("src/auth.ts bevat geen hardcoded secret fallback meer", () => {
        const authCode = fs.readFileSync(path.join(process.cwd(), "src/auth.ts"), "utf-8");
        assert.strictEqual(
            authCode.includes("50gezichten-development-auth-secret-change-in-prod-32c"),
            false,
            "Hardcoded development AUTH_SECRET mag niet meer voorkomen"
        );
        // Secret line should only use process.env
        const secretLineMatch = authCode.match(/secret:\s*(.+),/);
        assert.ok(secretLineMatch, "secret configuratie ontbreekt in auth.ts");
        const secretExpr = secretLineMatch[1];
        assert.ok(
            !secretExpr.includes('"') && !secretExpr.includes("'"),
            `secret mag geen hardcoded string bevatten: ${secretExpr}`
        );
    });

    await test("src/auth.ts heeft trustHost: true geconfigureerd voor Vercel Previews", () => {
        const authCode = fs.readFileSync(path.join(process.cwd(), "src/auth.ts"), "utf-8");
        assert.ok(
            authCode.includes("trustHost: true"),
            "trustHost: true moet expliciet zijn geconfigureerd in NextAuth"
        );
    });

    await test("src/app/admin/instellingen/page.tsx toont geen verwijderde standaardaccounts als fallback", () => {
        const settingsCode = fs.readFileSync(
            path.join(process.cwd(), "src/app/admin/instellingen/page.tsx"),
            "utf-8"
        );
        assert.strictEqual(
            settingsCode.includes("278548191"),
            false,
            "Instellingenpagina mag geen defaultAdminIds fallback meer bevatten"
        );
    });

    // -----------------------------------------------------------------------------
    // 3. OAUTH CALLBACK ROUTE & HANDLERS
    // -----------------------------------------------------------------------------
    console.log("\nSUITE 3: OAuth Configuratie & Callback Route");

    await test("src/app/api/auth/[...nextauth]/route.ts exporteert GET en POST handlers", () => {
        const routeCode = fs.readFileSync(
            path.join(process.cwd(), "src/app/api/auth/[...nextauth]/route.ts"),
            "utf-8"
        );
        assert.ok(routeCode.includes("export const { GET, POST } = handlers;"));
    });

    await test("OAuth callback URL is https://50gezichten.nl/api/auth/callback/github in instellingen", () => {
        const settingsCode = fs.readFileSync(
            path.join(process.cwd(), "src/app/admin/instellingen/page.tsx"),
            "utf-8"
        );
        assert.ok(
            settingsCode.includes("/api/auth/callback/github"),
            "Instellingenpagina moet de correcte callbackroute documenteren"
        );
    });

    // -----------------------------------------------------------------------------
    // 4. NEXTAUTH RUNTIME HANDLERS (MOCK-BASED SECRET & ROUTE VERIFICATION)
    // -----------------------------------------------------------------------------
    console.log("\nSUITE 4: Runtime Handler & Secret Gedrag");

    await test("Auth faalt veilig met foutcode bij ontbrekend AUTH_SECRET", async () => {
        // Without AUTH_SECRET, auth handler should reject request securely
        const { handlers } = await import("../src/auth");
        const req = new NextRequest("http://localhost:3000/api/auth/providers");
        const res = await handlers.GET(req);
        // NextAuth returns 500 when secret is missing
        assert.strictEqual(res.status, 500, "Zonder AUTH_SECRET moet de handler HTTP 500 retourneren");
    });

    await test("Met AUTH_SECRET is GitHub OAuth provider geconfigureerd op /api/auth/callback/github", () => {
        const { execSync } = require("node:child_process");
        const stdout = execSync(
            'AUTH_SECRET="test-secret-at-least-32-chars-long-123456" npx tsx -e \'' +
            'async function main() {' +
            '  const { handlers } = await import("./src/auth");' +
            '  const res = await handlers.GET(new Request("http://localhost:3000/api/auth/providers"));' +
            '  const data = await res.json();' +
            '  if (res.status !== 200 || data.github.callbackUrl !== "http://localhost:3000/api/auth/callback/github") {' +
            '    process.exit(1);' +
            '  }' +
            '}' +
            'main();\'',
            { encoding: "utf-8" }
        );
        assert.ok(true, "GitHub provider callback URL is correct");
    });

    // -----------------------------------------------------------------------------
    // 5. SERVER-SIDE AUTORISATIE & VERVALSTE COOKIE WEIGERING
    // -----------------------------------------------------------------------------
    console.log("\nSUITE 5: Server-side Autorisatie & Vervalste Cookie Weigering");

    await test("requireAdmin werpt redirect naar /admin/login op bij ontbrekende of niet-admin sessie", async () => {
        const { requireAdmin } = await import("../src/lib/auth-guard");
        let redirectNull = false;
        try {
            await requireAdmin(null);
        } catch (err: any) {
            redirectNull = err?.digest?.includes("NEXT_REDIRECT") || err?.message?.includes("NEXT_REDIRECT");
        }
        assert.ok(redirectNull, "requireAdmin(null) moet redirect werpen");

        let redirectNonAdmin = false;
        try {
            await requireAdmin({ user: { id: "1", isAdmin: false } } as any);
        } catch (err: any) {
            redirectNonAdmin = err?.digest?.includes("NEXT_REDIRECT") || err?.message?.includes("NEXT_REDIRECT");
        }
        assert.ok(redirectNonAdmin, "requireAdmin met isAdmin: false moet redirect werpen");

        const validSession = { user: { id: "1", isAdmin: true } } as any;
        const result = await requireAdmin(validSession);
        assert.strictEqual(result, validSession, "requireAdmin met isAdmin: true moet sessie retourneren");
    });

    await test("Alle admin-pagina's dwingen server-side requireAdmin af", () => {
        const adminPages = [
            "src/app/admin/page.tsx",
            "src/app/admin/aanmeldingen/page.tsx",
            "src/app/admin/roadmap/page.tsx",
            "src/app/admin/sponsors/page.tsx",
            "src/app/admin/teksten/page.tsx",
            "src/app/admin/geschiedenis/page.tsx",
            "src/app/admin/instellingen/page.tsx",
            "src/app/admin/media/page.tsx",
        ];

        for (const pagePath of adminPages) {
            const pageCode = fs.readFileSync(path.join(process.cwd(), pagePath), "utf-8");
            assert.ok(
                pageCode.includes("requireAdmin"),
                `${pagePath} moet expliciet server-side requireAdmin afdwingen`
            );
        }
    });

    await test("Alle /api/admin/* routes valideren cryptografisch session.user.isAdmin", () => {
        const apiRoutes = [
            "src/app/api/admin/submissions/route.ts",
            "src/app/api/admin/content/route.ts",
            "src/app/api/admin/roadmap/route.ts",
            "src/app/api/admin/sponsors/route.ts",
            "src/app/api/admin/upload/route.ts",
        ];

        for (const routePath of apiRoutes) {
            const routeCode = fs.readFileSync(path.join(process.cwd(), routePath), "utf-8");
            assert.ok(
                routeCode.includes("session.user.isAdmin"),
                `${routePath} moet session.user.isAdmin verifiëren`
            );
        }
    });

    // -----------------------------------------------------------------------------
    // SUMMARY
    // -----------------------------------------------------------------------------
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
