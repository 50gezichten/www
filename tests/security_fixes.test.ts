import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
    escapeHtml,
    escapeHtmlAttr,
    sanitizeEmailHref,
    sanitizePhoneHref,
    sanitizeSocialHandle,
    generateSubmissionNotificationEmailHtml,
    generateSubmissionNotificationEmailText,
    type SendSubmissionEmailParams,
} from "../src/lib/email";
import {
    detectImageFormat,
    MAX_FILE_SIZE,
    ALLOWED_MIME_TYPES,
    ALLOWED_EXTENSIONS,
} from "../src/lib/upload-security";

console.log("=================================================");
console.log("50 GEZICHTEN - SECURITY FIXES VERIFICATION TESTS");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
    try {
        fn();
        passed++;
        console.log(`  ✓ PASS: ${name}`);
    } catch (err: any) {
        failed++;
        console.error(`  ✗ FAIL: ${name}`);
        console.error(`    ${err.message}`);
    }
}

// -----------------------------------------------------------------------------
// 1. AANMELDTROUTE: VEILIGE FOUTMELDING & GEEN DATABASE LEAKS
// -----------------------------------------------------------------------------
console.log("SUITE 1: Aanmeldroute Foutafhandeling & Geen Informatielekkage");

test("src/app/api/aanmelden/route.ts retourneert strikt een algemene foutmelding bij serverfout", () => {
    const routeCode = fs.readFileSync(
        path.join(process.cwd(), "src/app/api/aanmelden/route.ts"),
        "utf-8"
    );
    // Verify that catch block does not leak error.message to the client
    assert.strictEqual(
        routeCode.includes("{ error: errorMsg }"),
        false,
        "Ruwe errorMsg mag niet direct worden geretourneerd naar de bezoeker"
    );
    assert.ok(
        routeCode.includes("Er is een onverwachte serverfout opgetreden bij het verwerken van de aanmelding"),
        "Aanmeldroute moet een veilige, generieke fouttekst tonen bij serverfouten"
    );
});

test("src/app/api/aanmelden/route.ts logt geen gevoelige formuliergegevens of tokens in de catch-block", () => {
    const routeCode = fs.readFileSync(
        path.join(process.cwd(), "src/app/api/aanmelden/route.ts"),
        "utf-8"
    );
    const catchBlock = routeCode.split("catch (error)")[1] || "";
    assert.strictEqual(
        catchBlock.includes("body"),
        false,
        "Formulierbody mag niet in de serverfout-log terechtkomen"
    );
});

// -----------------------------------------------------------------------------
// 2. HTML E-MAILS: ESCAPING & XSS PREVENTIE
// -----------------------------------------------------------------------------
console.log("\nSUITE 2: E-mail Sanitization, HTML Escaping & XSS Preventie");

test("escapeHtml vervangt alle gevaarlijke HTML-karakters (<, >, &, \", ')", () => {
    const raw = `& < > " '`;
    const escaped = escapeHtml(raw);
    assert.strictEqual(escaped, "&amp; &lt; &gt; &quot; &#39;");
});

test("escapeHtml neutraliseert <script> tags en event handlers", () => {
    const malicious = `<script>alert('XSS')</script>`;
    const safe = escapeHtml(malicious);
    assert.strictEqual(safe, "&lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt;");
    assert.strictEqual(safe.includes("<script>"), false);
});

test("escapeHtmlAttr neutraliseert backticks en quotes ter voorkoming van attribute breakouts", () => {
    const raw = `foo" onfocus="alert(1)\`test\``;
    const escaped = escapeHtmlAttr(raw);
    assert.strictEqual(escaped.includes('"'), false);
    assert.strictEqual(escaped.includes('`'), false);
    assert.strictEqual(escaped, "foo&quot; onfocus=&quot;alert(1)&#96;test&#96;");
});

test("sanitizeEmailHref verwijdert spaties, quotes, CRLF en HTML-injectie", () => {
    const badEmail = `artist@domain.nl" onfocus="alert('pwned')\r\nBcc: evil@hacker.com`;
    const cleaned = sanitizeEmailHref(badEmail);
    assert.strictEqual(cleaned.includes('"'), false);
    assert.strictEqual(cleaned.includes("\r"), false);
    assert.strictEqual(cleaned.includes("\n"), false);
    assert.strictEqual(cleaned.includes("<"), false);
    assert.strictEqual(cleaned.includes(">"), false);
});

test("sanitizePhoneHref laat alleen geldige telefoontekens door", () => {
    const badPhone = `06-12345678" onclick="fetch('http://evil.com')`;
    const cleaned = sanitizePhoneHref(badPhone);
    assert.strictEqual(cleaned.includes('"'), false);
    assert.strictEqual(cleaned.includes("onclick"), false);
    assert.strictEqual(cleaned.includes("fetch"), false);
    assert.strictEqual(cleaned, "06-12345678");
});

test("sanitizeSocialHandle verwijdert injectiepayloads en behoudt alleen veilige usernames", () => {
    const badInsta = `@my_artist_name"><script>alert(1)</script>`;
    const cleaned = sanitizeSocialHandle(badInsta);
    assert.strictEqual(cleaned.includes("<"), false);
    assert.strictEqual(cleaned.includes(">"), false);
    assert.strictEqual(cleaned.includes('"'), false);
    assert.strictEqual(cleaned, "my_artist_namescriptalert1script");
});

test("generateSubmissionNotificationEmailHtml ontzenuwt injecties in alle velden", () => {
    const maliciousParams: SendSubmissionEmailParams = {
        artistName: `<b onmouseover="alert('xss')">MC Hacker & "Poet"</b>`,
        email: `hacker@test.com" style="display:none;" onmouseover="alert(1)`,
        phone: `+31 6 12345678 <script>`,
        instagram: `"><script>alert('ig')</script>`,
        tiktok: `"><img src=x onerror=alert('tt')>`,
        reference: `50G-2026-TEST<script>`,
        submittedAt: `2026-11-20 01:00:00<img src=x>`,
    };

    const html = generateSubmissionNotificationEmailHtml(maliciousParams);

    // Geen onge-escapete scripts of HTML tags
    assert.strictEqual(html.includes("<script>"), false, "Geen onge-escapete <script> tag");
    assert.strictEqual(html.includes("<script"), false, "Geen onge-escapete script start");
    assert.strictEqual(html.includes("<b onmouseover="), false, "Geen onge-escapete b tag met event handler");
    assert.strictEqual(html.includes("<img"), false, "Geen onge-escapete img tags");

    // Wel correct ge-escapete weergave van speciale tekens
    assert.ok(html.includes("&lt;b onmouseover="), "Event handler payload moet ge-escapet zijn als &lt;b");
    assert.ok(html.includes("&amp; &quot;Poet&quot;"));
    assert.ok(html.includes("50G-2026-TEST&lt;script&gt;"));
});

test("generateSubmissionNotificationEmailText behoudt de exacte plattetekstversie", () => {
    const params: SendSubmissionEmailParams = {
        artistName: "MC Almere",
        email: "mcalmere@poezie.nl",
        phone: "06-12345678",
        instagram: "@mcalmere",
        tiktok: "@mcalmere_tt",
        reference: "50G-2026-0001",
        submittedAt: "2026-11-20 01:00:00",
    };

    const text = generateSubmissionNotificationEmailText(params);
    assert.ok(text.includes("Aanmeldingsreferentie: 50G-2026-0001"));
    assert.ok(text.includes("Artiestennaam: MC Almere"));
    assert.ok(text.includes("E-mailadres: mcalmere@poezie.nl"));
    assert.ok(text.includes("Telefoonnummer: 06-12345678"));
    assert.ok(text.includes("Instagram: @mcalmere"));
    assert.ok(text.includes("TikTok: @mcalmere_tt"));
    assert.ok(text.includes("https://50gezichten.nl/admin"));
});

test("generateSubmissionNotificationEmailHtml gebruikt het nieuwe onderwerpformaat 'Nieuwe Aanmelding: [Artiestennaam]'", () => {
    const params: SendSubmissionEmailParams = {
        artistName: "MC Almere",
        email: "mcalmere@poezie.nl",
        phone: "06-12345678",
        instagram: "@mcalmere",
        tiktok: "@mcalmere_tt",
        reference: "50G-2026-0001",
        submittedAt: "2026-11-20 01:00:00",
    };

    const html = generateSubmissionNotificationEmailHtml(params);
    assert.ok(
        html.includes("<title>Nieuwe Aanmelding: MC Almere</title>"),
        "HTML title moet het nieuwe onderwerp 'Nieuwe Aanmelding: [Artiestennaam]' bevatten"
    );
});

test("E-mail dispatch en database job gebruiken het nieuwe onderwerpformaat 'Nieuwe Aanmelding: [Artiestennaam]'", () => {
    const emailCode = fs.readFileSync(path.join(process.cwd(), "src/lib/email.ts"), "utf-8");
    const dbCode = fs.readFileSync(path.join(process.cwd(), "src/lib/db.ts"), "utf-8");

    assert.ok(
        emailCode.includes("`Nieuwe Aanmelding: ${params.artistName.replace"),
        "src/lib/email.ts moet het nieuwe onderwerpformaat gebruiken bij verzending via Resend"
    );
    assert.ok(
        dbCode.includes("`Nieuwe Aanmelding: ${payload.artistName}`"),
        "src/lib/db.ts moet het nieuwe onderwerpformaat opslaan in notification_jobs"
    );
});

// -----------------------------------------------------------------------------
// 3. BESTANDSUPLOADS: SVG UITGESCHAKELD, CONTENT & MAGIC BYTE CONTROLE
// -----------------------------------------------------------------------------
console.log("\nSUITE 3: Bestandsuploads, Contentvalidatie & SVG Uitschakeling");

test("SVG is uitgeschakeld in ALLOWED_MIME_TYPES en ALLOWED_EXTENSIONS", () => {
    assert.strictEqual(ALLOWED_MIME_TYPES.includes("image/svg+xml" as any), false);
    assert.strictEqual(ALLOWED_EXTENSIONS.includes(".svg" as any), false);
    assert.ok(ALLOWED_MIME_TYPES.includes("image/jpeg"));
    assert.ok(ALLOWED_MIME_TYPES.includes("image/png"));
    assert.ok(ALLOWED_MIME_TYPES.includes("image/webp"));
});

test("detectImageFormat herkent geldige PNG-afbeelding via magic bytes", () => {
    // PNG Header: 89 50 4E 47 0D 0A 1A 0A
    const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    assert.strictEqual(detectImageFormat(pngBuffer), "image/png");
});

test("detectImageFormat herkent geldige JPEG-afbeelding via magic bytes", () => {
    // JPEG Header: FF D8 FF
    const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    assert.strictEqual(detectImageFormat(jpegBuffer), "image/jpeg");
});

test("detectImageFormat herkent geldige WebP-afbeelding via RIFF/WEBP signature", () => {
    // WebP Header: 'R', 'I', 'F', 'F', [4 bytes size], 'W', 'E', 'B', 'P'
    const webpBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    assert.strictEqual(detectImageFormat(webpBuffer), "image/webp");
});

test("detectImageFormat weigert SVG-bestanden (XML content)", () => {
    const svgBuffer = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><circle/></svg>");
    assert.strictEqual(detectImageFormat(svgBuffer), null, "SVG mag niet worden herkend als geldige rasterafbeelding");
});

test("detectImageFormat weigert HTML of scripts vermomd als afbeelding", () => {
    const scriptBuffer = Buffer.from("<script>alert('malicious')</script>");
    assert.strictEqual(detectImageFormat(scriptBuffer), null);

    const phpBuffer = Buffer.from("<?php echo 'shell'; ?>");
    assert.strictEqual(detectImageFormat(phpBuffer), null);
});

test("detectImageFormat weigert te kleine of corrupte buffers", () => {
    const shortBuffer = Buffer.from([0x89, 0x50, 0x4e]); // < 12 bytes
    assert.strictEqual(detectImageFormat(shortBuffer), null);
    assert.strictEqual(detectImageFormat(Buffer.alloc(0)), null);
});

test("MAX_FILE_SIZE is begrensd op 5 MB (5 * 1024 * 1024 bytes)", () => {
    assert.strictEqual(MAX_FILE_SIZE, 5 * 1024 * 1024);
});

test("src/app/api/admin/upload/route.ts weigert SVG expliciet met een duidelijke foutmelding", () => {
    const uploadCode = fs.readFileSync(
        path.join(process.cwd(), "src/app/api/admin/upload/route.ts"),
        "utf-8"
    );
    assert.ok(
        uploadCode.includes("SVG-uploads zijn om veiligheidsredenen voorlopig uitgeschakeld"),
        "Upload route moet SVG expliciet weigeren"
    );
});

// -----------------------------------------------------------------------------
// OVERZICHT
// -----------------------------------------------------------------------------
console.log("\n=================================================");
console.log(`BEVEILIGINGSTESTS RESULTAAT: ${passed} geslaagd, ${failed} gefaald`);
console.log("=================================================");

if (failed > 0) {
    process.exit(1);
}
