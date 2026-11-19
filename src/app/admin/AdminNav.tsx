"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { label: "Overzicht", href: "/admin", icon: "📊" },
    { label: "Teksten beheren", href: "/admin/teksten", icon: "✍️" },
    { label: "Roadmap beheren", href: "/admin/roadmap", icon: "🗺️" },
    { label: "Sponsorkaarten", href: "/admin/sponsors", icon: "💎" },
    { label: "Media beheren", href: "/admin/media", icon: "🖼️" },
    { label: "Aanmeldingen", href: "/admin/aanmeldingen", icon: "📬" },
    { label: "Instellingen", href: "/admin/instellingen", icon: "⚙️" },
    { label: "Geschiedenis", href: "/admin/geschiedenis", icon: "📜" },
];

export default function AdminNav() {
    const pathname = usePathname();

    return (
        <nav className="p-3 space-y-1">
            {navItems.map((item) => {
                const isActive =
                    item.href === "/admin"
                        ? pathname === "/admin"
                        : pathname.startsWith(item.href);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                                ? "bg-black text-white"
                                : "text-black/75 hover:bg-black/5 hover:text-black"
                        }`}
                    >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
