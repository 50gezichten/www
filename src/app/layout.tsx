import type { Metadata } from "next";
import { Permanent_Marker, Caveat, Inter } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";
import Script from "next/script";
import { Analytics } from '@vercel/analytics/next';

const permanentMarker = Permanent_Marker({
    weight: "400",
    variable: "--font-marker",
    subsets: ["latin"],
});

const caveat = Caveat({
    variable: "--font-handwritten",
    subsets: ["latin"],
});

const inter = Inter({
    variable: "--font-sans",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "50 Gezichten 50 Gedichten | HipHop X Poëziebundel – 50 jaar Almere",
    description: "Een Almeerse gedichtenbundel waarin hiphop en poëzie worden verbonden. Vijftig Almeerse rappers leveren een tekst voor de bundel ter ere van 50 jaar Almere.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="nl" className={`${permanentMarker.variable} ${caveat.variable} ${inter.variable}`}>
            <head>
                <Script
                    crossOrigin="anonymous"
                    src="//unpkg.com/react-grab/dist/index.global.js"
                />
                <Script
                    crossOrigin="anonymous"
                    src="//unpkg.com/same-runtime/dist/index.global.js"
                />
            </head>
            <body suppressHydrationWarning className="antialiased font-sans">
                <ClientBody>{children}</ClientBody>
            </body>
        </html>
    );
}
