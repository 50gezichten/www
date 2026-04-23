// app/api/aanmelden/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { artistName, email, phone, instagram, tiktok } = await req.json();

        if (!artistName || !email || !phone) {
            return NextResponse.json(
                { error: "Vul artiestennaam, email en telefoonnummer in." },
                { status: 400 }
            );
        }

        await resend.emails.send({
            from: "info@50gezichten.nl",
            to: "50gezichten@gmail.com",
            subject: `Nieuwe aanmelding: ${artistName}`,
            replyTo: email,
            text: `
Artiestennaam: ${artistName}
Emailadres: ${email}
Telefoonnummer: ${phone}
Instagram: ${instagram || "-"}
TikTok: ${tiktok || "-"}
      `.trim(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Er ging iets mis bij het verzenden." },
            { status: 500 }
        );
    }
}