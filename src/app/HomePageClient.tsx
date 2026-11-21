"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { RoadmapItem, SiteContent, SponsorPackage } from "@/lib/types";
import {
    initialRoadmapItems,
    initialSiteContent,
    initialSponsorPackages,
} from "@/lib/default-data";

interface HomePageClientProps {
    content?: SiteContent;
    roadmapItems?: RoadmapItem[];
    sponsorPackages?: SponsorPackage[];
}

export default function HomePageClient({
    content = initialSiteContent,
    roadmapItems = initialRoadmapItems,
    sponsorPackages = initialSponsorPackages,
}: HomePageClientProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const cardDragX = useRef(0);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragAnimating, setIsDragAnimating] = useState(false);
    const dragStartX = useRef<number | null>(null);
    const dragCurrentX = useRef<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [currentPackage, setCurrentPackage] = useState(0);
    const [direction, setDirection] = useState(1);

    // Form state
    const [formData, setFormData] = useState({
        artistName: "",
        email: "",
        phone: "",
        instagram: "",
        tiktok: "",
        website: "", // Honeypot
    });
    const [formStatus, setFormStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
    const [formFeedback, setFormFeedback] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const FIELD_ORDER = ["artistName", "email", "phone", "instagram", "tiktok"] as const;

    const isFieldValid = (name: string, value: string): boolean => {
        const trimmed = value.trim();
        switch (name) {
            case "artistName":
                return trimmed.length >= 2 && trimmed.length <= 100;
            case "email": {
                const emailRegex =
                    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
                return trimmed.length > 0 && trimmed.length <= 150 && emailRegex.test(trimmed.toLowerCase());
            }
            case "phone": {
                const digits = trimmed.replace(/\D/g, "");
                return trimmed.length > 0 && digits.length >= 8 && digits.length <= 15;
            }
            case "instagram":
                return trimmed.length <= 100;
            case "tiktok":
                return trimmed.length <= 100;
            default:
                return true;
        }
    };

    const handleInputChange = (field: keyof typeof formData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) {
            if (isFieldValid(field, value)) {
                setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next[field];
                    if (Object.keys(next).length <= 1) {
                        setFormFeedback(null);
                    }
                    return next;
                });
            }
        }
    };

    const safePackages = sponsorPackages.length > 0 ? sponsorPackages : initialSponsorPackages;
    const activePackageIndex = currentPackage % safePackages.length;
    const showSupport = content.support?.enabled === true;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormStatus("sending");
        setFormFeedback(null);

        try {
            const res = await fetch("/api/aanmelden", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const data = await res.json().catch(() => null);

            // 1. Validation error from server (400 with details)
            if (res.status === 400 && data?.details) {
                const details: Record<string, string> = data.details;
                const errorKeys = Object.keys(details);
                setFieldErrors(details);
                setFormStatus("error");

                if (errorKeys.length > 1) {
                    setFormFeedback("Controleer je gegevens en corrigeer de gemarkeerde velden.");
                } else {
                    setFormFeedback(null);
                }

                const firstInvalid = FIELD_ORDER.find((f) => !!details[f]);
                if (firstInvalid) {
                    const el = document.getElementById(firstInvalid);
                    if (el) {
                        el.focus();
                        el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                }
                return;
            }

            // 2. Technical server or request errors (non-ok responses)
            if (!res.ok) {
                setFieldErrors({});
                setFormStatus("error");
                setFormFeedback(
                    res.status >= 500
                        ? "Er is een onverwachte serverfout opgetreden bij het verwerken van de aanmelding. Probeer het later opnieuw."
                        : (data?.error || "Er is een fout opgetreden bij het verwerken van de aanmelding. Probeer het later opnieuw.")
                );
                return;
            }

            // 3. Successful submission
            setFieldErrors({});
            setFormStatus("sent");
            setFormFeedback(
                data?.reference
                    ? `Aanmelding ontvangen! Referentie: ${data.reference}`
                    : "Aanmelding ontvangen!"
            );
            // Only clear form fields on genuine success
            setFormData({
                artistName: "",
                email: "",
                phone: "",
                instagram: "",
                tiktok: "",
                website: "",
            });

            setTimeout(() => {
                setFormStatus("idle");
                setFormFeedback(null);
            }, 6000);
        } catch (error) {
            console.error("[Submission Network Error]", error);
            setFieldErrors({});
            setFormStatus("error");
            setFormFeedback(
                "Er kan geen verbinding worden gemaakt met de server. Controleer je internetverbinding en probeer het opnieuw."
            );
        }
    };

    const nextPackage = () => {
        setDirection(1);
        setCurrentPackage((prev) => (prev + 1) % safePackages.length);
    };

    const prevPackage = () => {
        setDirection(-1);
        setCurrentPackage((prev) => (prev - 1 + safePackages.length) % safePackages.length);
    };

    const minSwipeDistance = 80;
    const maxVisualDrag = 220;

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        dragStartX.current = e.clientX;
        dragCurrentX.current = e.clientX;
        cardDragX.current = 0;
        setDragOffset(0);
        setIsDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging || dragStartX.current === null) return;

        dragCurrentX.current = e.clientX;

        const rawOffset = e.clientX - dragStartX.current;
        const limitedOffset = Math.max(-maxVisualDrag, Math.min(maxVisualDrag, rawOffset));

        cardDragX.current = limitedOffset;
        setDragOffset(limitedOffset);
    };

    const resetDragState = () => {
        setIsDragging(false);
        dragStartX.current = null;
        dragCurrentX.current = null;
        cardDragX.current = 0;
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        const finalOffset = cardDragX.current;

        if (Math.abs(finalOffset) > minSwipeDistance) {
            setIsDragAnimating(true);

            if (finalOffset < 0) {
                nextPackage();
            } else {
                prevPackage();
            }
        }

        setDragOffset(0);
        resetDragState();

        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    };

    const handlePointerCancel = () => {
        setDragOffset(0);
        resetDragState();
    };

    useEffect(() => {
        if (!isDragAnimating) return;

        const timer = setTimeout(() => {
            setIsDragAnimating(false);
        }, 250);

        return () => clearTimeout(timer);
    }, [currentPackage, isDragAnimating]);

    // Compute zigzag points for desktop roadmap based on items length
    const desktopPoints = roadmapItems.map((_, index) => {
        const total = roadmapItems.length;
        const step = 1050 / Math.max(1, total - 1);
        const x = 75 + index * step;
        const y = index % 2 === 0 ? 40 : 160;
        return { x, y };
    });

    const svgPathD = desktopPoints.reduce((acc, pt, idx) => {
        return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, "");

    const [activeRoadmapId, setActiveRoadmapId] = useState<string | null>(null);
    const [hoveredRoadmapId, setHoveredRoadmapId] = useState<string | null>(null);

    const activeId = activeRoadmapId || hoveredRoadmapId;
    const activeRoadmapIndex = roadmapItems.findIndex(
        (i) => (i.id || i.title) === activeId
    );
    const activeRoadmapItem =
        activeRoadmapIndex >= 0 ? roadmapItems[activeRoadmapIndex] : null;
    const activeRoadmapPoint =
        activeRoadmapIndex >= 0 ? desktopPoints[activeRoadmapIndex] : null;
    const isActiveTop = activeRoadmapIndex >= 0 && activeRoadmapIndex % 2 === 0;

    return (
        <TooltipProvider delayDuration={0}>
            <main className="min-h-screen bg-white overflow-x-hidden">
                {/* Navigation */}
                <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm z-50 border-b border-black/10">
                    {/* Desktop / tablet menu */}
                    <div className="hidden md:block max-w-6xl mx-auto px-4 py-3">
                        <ul className="flex justify-center gap-6 md:gap-10 text-sm md:text-base font-medium">
                            <li>
                                <a href="#over-ons" className="hover:underline underline-offset-4 transition-all">
                                    Over Ons
                                </a>
                            </li>
                            <li>
                                <a href="#roadmap" className="hover:underline underline-offset-4 transition-all">
                                    Roadmap
                                </a>
                            </li>
                            <li>
                                <a href="#aanmelden" className="hover:underline underline-offset-4 transition-all">
                                    Aanmelden
                                </a>
                            </li>
                            {showSupport && (
                                <li>
                                    <a href="#support" className="hover:underline underline-offset-4 transition-all">
                                        Support
                                    </a>
                                </li>
                            )}
                            <li>
                                <a href="#contact" className="hover:underline underline-offset-4 transition-all">
                                    Contact
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Mobile floating hamburger */}
                    <div className="md:hidden fixed top-4 right-4 z-[60]">
                        <button
                            type="button"
                            aria-label={mobileMenuOpen ? "Sluit menu" : "Open menu"}
                            aria-expanded={mobileMenuOpen}
                            onClick={() => setMobileMenuOpen((prev) => !prev)}
                            className="w-12 h-12 rounded-full bg-white border-2 border-black shadow-lg flex items-center justify-center"
                        >
                            <div className="relative w-5 h-5">
                                <span
                                    className={`absolute left-0 top-1 block h-0.5 w-5 bg-black transition-all ${
                                        mobileMenuOpen ? "rotate-45 top-2.5" : ""
                                    }`}
                                />
                                <span
                                    className={`absolute left-0 top-2.5 block h-0.5 w-5 bg-black transition-all ${
                                        mobileMenuOpen ? "opacity-0" : ""
                                    }`}
                                />
                                <span
                                    className={`absolute left-0 top-4 block h-0.5 w-5 bg-black transition-all ${
                                        mobileMenuOpen ? "-rotate-45 top-2.5" : ""
                                    }`}
                                />
                            </div>
                        </button>
                    </div>

                    {/* Mobile dropdown / overlay */}
                    {mobileMenuOpen && (
                        <div className="md:hidden fixed inset-0 z-[55] bg-black/20 backdrop-blur-[2px]">
                            <div className="absolute top-20 right-4 w-64 rounded-2xl border-2 border-black bg-white shadow-2xl p-4">
                                <ul className="flex flex-col gap-3 text-base font-medium">
                                    <li>
                                        <a
                                            href="#over-ons"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block rounded-lg px-3 py-2 hover:bg-black/5"
                                        >
                                            Over Ons
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#roadmap"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block rounded-lg px-3 py-2 hover:bg-black/5"
                                        >
                                            Roadmap
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#aanmelden"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block rounded-lg px-3 py-2 hover:bg-black/5"
                                        >
                                            Aanmelden
                                        </a>
                                    </li>
                                    {showSupport && (
                                        <li>
                                            <a
                                                href="#support"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="block rounded-lg px-3 py-2 hover:bg-black/5"
                                            >
                                                Support
                                            </a>
                                        </li>
                                    )}
                                    <li>
                                        <a
                                            href="#contact"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block rounded-lg px-3 py-2 hover:bg-black/5"
                                        >
                                            Contact
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </nav>

                {/* Hero Section with Logo */}
                <section className="pt-24 pb-16 md:pt-32 md:pb-24 flex flex-col items-center justify-center px-4">
                    <div className="max-w-md md:max-w-lg">
                        <Image
                            src="/img/logo.png"
                            alt={content.hero.logo_alt}
                            width={600}
                            height={400}
                            className="w-full h-auto transition-transform duration-300 hover:scale-[1.03]"
                            priority
                        />
                    </div>
                    <p className="mt-8 text-lg md:text-xl text-center font-handwritten text-black/70">
                        {content.hero.tagline}
                    </p>
                </section>

                {/* Over Ons Section */}
                <section id="over-ons" className="py-16 md:py-24 px-4 scroll-mt-16">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="font-marker text-4xl md:text-5xl lg:text-6xl mb-8 md:mb-12">
                            {content.about.title}
                        </h2>
                        <div className="space-y-6 text-base md:text-lg leading-relaxed text-black/80">
                            <p>
                                <span className="font-handwritten text-2xl">{content.about.lead_highlight}</span>{" "}
                                {content.about.paragraph_1}
                            </p>
                            <p>{content.about.paragraph_2}</p>
                        </div>
                    </div>
                </section>

                {/* Roadmap Section */}
                <section id="roadmap" className="py-16 md:py-24 px-4 bg-black/[0.02] scroll-mt-16" onClick={() => setActiveRoadmapId(null)}>
                    <div className="max-w-6xl mx-auto">
                        <h2 className="font-marker text-4xl md:text-5xl lg:text-6xl text-center mb-2">
                            Roadmap
                        </h2>
                        <p className="text-center text-sm md:text-base text-black/60 font-handwritten mb-10 md:mb-16">
                            Beweeg over de punten of klik op een titel om de fase-toelichting te lezen
                        </p>

                        {/* Desktop & Tablet Roadmap - Zigzag Pad (schermen >= 768px) */}
                        <div className="hidden md:block">
                            <div className="relative mx-auto w-full max-w-[1200px] py-4 select-none">
                                <svg
                                    className="w-full h-auto overflow-visible"
                                    viewBox="0 -50 1200 320"
                                    preserveAspectRatio="xMidYMid meet"
                                >
                                    {/* De verbindende stippellijn van het pad */}
                                    <path
                                        d={svgPathD}
                                        fill="none"
                                        stroke="rgba(0,0,0,0.18)"
                                        strokeWidth="2.5"
                                        strokeDasharray="8 5"
                                    />

                                    {roadmapItems.map((item, index) => {
                                        const point = desktopPoints[index] || { x: 75, y: 40 };
                                        const isTop = index % 2 === 0;
                                        const itemId = item.id || item.title;
                                        const isCurrent = activeId === itemId;

                                        return (
                                            <g
                                                key={itemId}
                                                className="cursor-pointer group"
                                                role="button"
                                                tabIndex={0}
                                                aria-label={`${item.title}: klik of beweeg voor toelichting`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveRoadmapId((prev) => (prev === itemId ? null : itemId));
                                                }}
                                                onMouseEnter={() => setHoveredRoadmapId(itemId)}
                                                onMouseLeave={() => setHoveredRoadmapId(null)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        setActiveRoadmapId((prev) => (prev === itemId ? null : itemId));
                                                    }
                                                }}
                                            >
                                                {/* Ruime hit-target rondom de cirkel voor soepele en stabiele muisinteractie */}
                                                <circle
                                                    cx={point.x}
                                                    cy={point.y}
                                                    r="26"
                                                    fill="transparent"
                                                    stroke="none"
                                                    className="cursor-pointer"
                                                />

                                                {/* Subtiele ring om de actieve fase */}
                                                {item.active && (
                                                    <circle
                                                        cx={point.x}
                                                        cy={point.y}
                                                        r="18"
                                                        fill="none"
                                                        stroke="black"
                                                        strokeWidth="1.5"
                                                        strokeDasharray="4 2"
                                                        className="opacity-60 pointer-events-none"
                                                    />
                                                )}

                                                {/* Punt van de fase */}
                                                <circle
                                                    cx={point.x}
                                                    cy={point.y}
                                                    r={isCurrent ? 13 : 10}
                                                    fill={item.active ? "black" : "white"}
                                                    stroke="black"
                                                    strokeWidth="3"
                                                    className="transition-all duration-200 group-hover:scale-125 pointer-events-none"
                                                    style={{ transformOrigin: `${point.x}px ${point.y}px` }}
                                                />

                                                {/* Titel van de fase */}
                                                <text
                                                    x={point.x}
                                                    y={isTop ? point.y - 36 : point.y + 46}
                                                    textAnchor="middle"
                                                    className="font-marker transition-all duration-200 group-hover:fill-black/80"
                                                    style={{
                                                        fontSize: isCurrent ? "21px" : "19px",
                                                        fill: isCurrent ? "black" : "rgba(0,0,0,0.85)",
                                                        textDecoration: isCurrent ? "underline" : "none",
                                                    }}
                                                >
                                                    {item.title}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </svg>

                                {/* Popover-kaartje bij hover of klik op een fase */}
                                {activeRoadmapItem && activeRoadmapPoint && (
                                    <div
                                        className="absolute z-30 pointer-events-auto transition-all duration-200"
                                        style={{
                                            left: `${(activeRoadmapPoint.x / 1200) * 100}%`,
                                            top: isActiveTop
                                                ? `${((activeRoadmapPoint.y + 50 + 26) / 320) * 100}%`
                                                : `${((activeRoadmapPoint.y + 50 - 26) / 320) * 100}%`,
                                            transform: `translate(${
                                                activeRoadmapIndex <= 1
                                                    ? "-15%"
                                                    : activeRoadmapIndex >= roadmapItems.length - 2
                                                    ? "-85%"
                                                    : "-50%"
                                            }, ${isActiveTop ? "10px" : "calc(-100% - 10px)"})`,
                                        }}
                                        onMouseEnter={() => setHoveredRoadmapId(activeId)}
                                        onMouseLeave={() => setHoveredRoadmapId(null)}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="bg-black text-white p-4 rounded-2xl shadow-2xl max-w-xs sm:max-w-sm border border-white/20 relative animate-in fade-in zoom-in-95 duration-150">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveRoadmapId(null);
                                                    setHoveredRoadmapId(null);
                                                }}
                                                className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-white/70 hover:text-white transition"
                                                aria-label="Sluit toelichting"
                                            >
                                                ✕
                                            </button>
                                            <div className="flex items-center gap-2 mb-1.5 pr-6">
                                                <h4 className="font-marker text-lg text-white">
                                                    {activeRoadmapItem.title}
                                                </h4>
                                                {activeRoadmapItem.active && (
                                                    <span className="text-[10px] uppercase font-bold tracking-wider bg-white text-black px-2 py-0.5 rounded-full">
                                                        Nu bezig
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-white/90 leading-relaxed">
                                                {activeRoadmapItem.description}
                                            </p>
                                            <p className="mt-2 text-[11px] text-white/60 italic font-medium">
                                                {activeRoadmapItem.duration}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mobile Roadmap - Verticale pad-lijn (schermen < 768px) */}
                        <div className="md:hidden space-y-4 max-w-md mx-auto">
                            {roadmapItems.map((item, index) => {
                                const itemId = item.id || item.title;
                                const isExpanded = activeRoadmapId === itemId;

                                return (
                                    <div key={itemId} className="flex items-start gap-4 group">
                                        <div className="flex flex-col items-center">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveRoadmapId((prev) => (prev === itemId ? null : itemId));
                                                }}
                                                className={`w-5 h-5 rounded-full border-[3px] flex-shrink-0 transition-transform duration-200 mt-0.5 ${
                                                    item.active
                                                        ? "bg-black border-black ring-4 ring-black/10 scale-110"
                                                        : "bg-white border-black hover:scale-110"
                                                }`}
                                                aria-label={`${item.title}: klik voor toelichting`}
                                            />
                                            {index < roadmapItems.length - 1 && (
                                                <div className="w-0.5 h-full min-h-[50px] bg-black/20 my-1 border-l border-dashed border-black/40" />
                                            )}
                                        </div>
                                        <div className="flex-1 pb-4">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveRoadmapId((prev) => (prev === itemId ? null : itemId));
                                                }}
                                                className="text-left w-full group-hover:opacity-85 transition"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <h3 className="font-marker text-lg leading-tight text-black">
                                                        {item.title}
                                                    </h3>
                                                    <span className="text-xs text-black/50 font-mono">
                                                        {isExpanded ? "▲" : "▼"}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-black/50 italic mt-0.5">{item.duration}</p>
                                            </button>
                                            {isExpanded && (
                                                <div className="mt-2.5 p-3.5 bg-black text-white rounded-xl text-xs leading-relaxed shadow-lg animate-in fade-in duration-200">
                                                    <p className="text-white/90">{item.description}</p>
                                                    {item.active && (
                                                        <span className="inline-block mt-2 text-[10px] uppercase font-bold bg-white text-black px-2 py-0.5 rounded">
                                                            Nu bezig
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Aanmelden Section */}
                <section id="aanmelden" className="py-16 md:py-24 px-4 scroll-mt-16">
                    <div className="max-w-2xl mx-auto text-center">
                        <h2 className="font-marker text-4xl md:text-5xl lg:text-6xl mb-8 md:mb-12">
                            {content.aanmelden.title}
                        </h2>
                        <p className="text-base md:text-lg text-black/80 mb-8 leading-relaxed">
                            {content.aanmelden.description}
                        </p>

                        <form noValidate onSubmit={handleSubmit} className="space-y-6 text-left">
                            {/* Honeypot field for bot deterrence */}
                            <input
                                type="text"
                                name="website"
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                style={{ display: "none" }}
                                tabIndex={-1}
                                autoComplete="off"
                            />

                            <div>
                                <label htmlFor="artistName" className="block text-sm font-medium mb-2">
                                    Artiestennaam *
                                </label>
                                <input
                                    type="text"
                                    id="artistName"
                                    name="artistName"
                                    required
                                    aria-invalid={!!fieldErrors.artistName}
                                    aria-describedby={fieldErrors.artistName ? "artistName-error" : undefined}
                                    value={formData.artistName}
                                    onChange={(e) => handleInputChange("artistName", e.target.value)}
                                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                                        fieldErrors.artistName
                                            ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                            : "border-black focus:ring-2 focus:ring-black/20"
                                    }`}
                                    placeholder="Je artiestennaam"
                                />
                                {fieldErrors.artistName && (
                                    <p id="artistName-error" className="text-red-600 text-sm mt-1.5 font-medium" role="alert">
                                        {fieldErrors.artistName}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium mb-2">
                                    Emailadres *
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    required
                                    aria-invalid={!!fieldErrors.email}
                                    aria-describedby={fieldErrors.email ? "email-error" : undefined}
                                    value={formData.email}
                                    onChange={(e) => handleInputChange("email", e.target.value)}
                                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                                        fieldErrors.email
                                            ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                            : "border-black focus:ring-2 focus:ring-black/20"
                                    }`}
                                    placeholder="je@email.nl"
                                />
                                {fieldErrors.email && (
                                    <p id="email-error" className="text-red-600 text-sm mt-1.5 font-medium" role="alert">
                                        {fieldErrors.email}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium mb-2">
                                    Telefoonnummer *
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    required
                                    aria-invalid={!!fieldErrors.phone}
                                    aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange("phone", e.target.value)}
                                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                                        fieldErrors.phone
                                            ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                            : "border-black focus:ring-2 focus:ring-black/20"
                                    }`}
                                    placeholder="06-12345678"
                                />
                                {fieldErrors.phone && (
                                    <p id="phone-error" className="text-red-600 text-sm mt-1.5 font-medium" role="alert">
                                        {fieldErrors.phone}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="instagram" className="block text-sm font-medium mb-2">
                                    Instagram
                                </label>
                                <input
                                    type="text"
                                    id="instagram"
                                    name="instagram"
                                    aria-invalid={!!fieldErrors.instagram}
                                    aria-describedby={fieldErrors.instagram ? "instagram-error" : undefined}
                                    value={formData.instagram}
                                    onChange={(e) => handleInputChange("instagram", e.target.value)}
                                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                                        fieldErrors.instagram
                                            ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                            : "border-black focus:ring-2 focus:ring-black/20"
                                    }`}
                                    placeholder="@jouwhandle"
                                />
                                {fieldErrors.instagram && (
                                    <p id="instagram-error" className="text-red-600 text-sm mt-1.5 font-medium" role="alert">
                                        {fieldErrors.instagram}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="tiktok" className="block text-sm font-medium mb-2">
                                    TikTok
                                </label>
                                <input
                                    type="text"
                                    id="tiktok"
                                    name="tiktok"
                                    aria-invalid={!!fieldErrors.tiktok}
                                    aria-describedby={fieldErrors.tiktok ? "tiktok-error" : undefined}
                                    value={formData.tiktok}
                                    onChange={(e) => handleInputChange("tiktok", e.target.value)}
                                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                                        fieldErrors.tiktok
                                            ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                            : "border-black focus:ring-2 focus:ring-black/20"
                                    }`}
                                    placeholder="@jouwhandle"
                                />
                                {fieldErrors.tiktok && (
                                    <p id="tiktok-error" className="text-red-600 text-sm mt-1.5 font-medium" role="alert">
                                        {fieldErrors.tiktok}
                                    </p>
                                )}
                            </div>

                            {formFeedback && (
                                <div
                                    id="form-feedback"
                                    role="alert"
                                    className={`p-4 rounded-lg text-sm font-medium ${
                                        formStatus === "sent"
                                            ? "bg-black text-white"
                                            : "bg-red-50 text-red-800 border border-red-300"
                                    }`}
                                >
                                    {formFeedback}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={formStatus === "sending"}
                                className="w-full py-4 bg-black text-white font-medium rounded-lg hover:bg-black/80 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {formStatus === "sending"
                                    ? "VERZENDEN..."
                                    : formStatus === "sent"
                                        ? "VERZONDEN!"
                                        : formStatus === "error"
                                            ? "PROBEER OPNIEUW"
                                            : "VERSTUUR AANMELDING"}
                            </button>
                        </form>
                    </div>
                </section>

                {/* Support Section */}
                {showSupport && (
                    <section id="support" className="py-16 md:py-24 px-4 bg-black/[0.02] scroll-mt-16">
                        <div className="max-w-4xl mx-auto">
                            <h2 className="font-marker text-4xl md:text-5xl lg:text-6xl text-center mb-8 md:mb-12">
                                {content.support.title}
                            </h2>
                            <p className="text-base md:text-lg text-black/80 text-center mb-12 max-w-2xl mx-auto leading-relaxed">
                                {content.support.intro}
                            </p>

                            {/* Package Carousel */}
                            <div className="relative mx-auto max-w-4xl">
                                <div className="relative mx-auto w-full max-w-md">
                                    {/* Left Arrow */}
                                    <button
                                        onClick={prevPackage}
                                        className="hidden md:flex absolute top-[235px] right-[calc(100%+2rem)] -translate-y-1/2 p-3 md:p-4 hover:bg-black/5 rounded-full transition-all group z-10 items-center justify-center"
                                        aria-label="Vorig pakket"
                                    >
                                        <svg
                                            className="w-8 h-8 md:w-10 md:h-10 transform group-hover:-translate-x-1 transition-transform"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>

                                    {/* Right Arrow */}
                                    <button
                                        onClick={nextPackage}
                                        className="hidden md:flex absolute top-[235px] left-[calc(100%+2rem)] -translate-y-1/2 p-3 md:p-4 hover:bg-black/5 rounded-full transition-all group z-10 items-center justify-center"
                                        aria-label="Volgend pakket"
                                    >
                                        <svg
                                            className="w-8 h-8 md:w-10 md:h-10 transform group-hover:translate-x-1 transition-transform"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>

                                    {/* Package Card */}
                                    <div
                                        className={`w-full touch-pan-y select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                                        onPointerDown={handlePointerDown}
                                        onPointerMove={handlePointerMove}
                                        onPointerUp={handlePointerUp}
                                        onPointerCancel={handlePointerCancel}
                                    >
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={activePackageIndex}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{
                                                    opacity: isDragging
                                                        ? Math.max(0.45, 1 - Math.abs(dragOffset) / 260)
                                                        : 1,
                                                    x: isDragging ? dragOffset : 0,
                                                    y: 0,
                                                    rotate: isDragging ? dragOffset / 40 : 0,
                                                    scale: isDragging ? 0.985 : 1,
                                                }}
                                                exit={{
                                                    opacity: 0,
                                                    y: -8,
                                                    x: isDragAnimating ? (direction > 0 ? -80 : 80) : 0,
                                                }}
                                                transition={{
                                                    type: isDragging ? "tween" : "spring",
                                                    duration: isDragging ? 0.02 : 0.25,
                                                    stiffness: 300,
                                                    damping: 30,
                                                }}
                                                style={{ touchAction: "pan-y" }}
                                            >
                                                <div className="bg-white border-2 border-black rounded-2xl p-6 md:p-8 shadow-lg">
                                                    <div className="w-full h-40 md:h-48 rounded-lg mb-6 overflow-hidden relative">
                                                        <Image
                                                            src={safePackages[activePackageIndex].image}
                                                            alt={safePackages[activePackageIndex].title}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>

                                                    <h3 className="font-marker text-2xl md:text-3xl mb-2 text-center">
                                                        {safePackages[activePackageIndex].title}
                                                    </h3>
                                                    <p className="text-xl md:text-2xl font-handwritten text-center mb-6 text-black/70">
                                                        {safePackages[activePackageIndex].price}
                                                    </p>

                                                    <ul className="space-y-3">
                                                        {safePackages[activePackageIndex].benefits.map((benefit, idx) => (
                                                            <li key={`benefit-${idx}`} className="flex items-start gap-3 text-sm md:text-base">
                                                                <span className="text-black mt-1 flex-shrink-0">•</span>
                                                                <span className="text-black/80">{benefit}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </motion.div>
                                        </AnimatePresence>

                                        {/* Dots indicator */}
                                        <div className="flex justify-center gap-2 mt-6">
                                            {safePackages.map((_, index) => (
                                                <button
                                                    key={`dot-${index}`}
                                                    onClick={() => {
                                                        setDirection(index > activePackageIndex ? 1 : -1);
                                                        setCurrentPackage(index);
                                                    }}
                                                    className={`w-2 h-2 rounded-full transition-all ${
                                                        index === activePackageIndex ? "bg-black w-6" : "bg-black/30"
                                                    }`}
                                                    aria-label={`Ga naar pakket ${index + 1}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-center mt-12 text-black/70 text-base md:text-lg">
                                {content.support.custom_package_text}{" "}
                                <a
                                    href={`mailto:${content.support.custom_package_email}`}
                                    className="underline hover:text-black transition-colors"
                                >
                                    {content.support.custom_package_email}
                                </a>
                            </p>
                        </div>
                    </section>
                )}

                {/* Contact Section */}
                <section id="contact" className="py-16 md:py-24 px-4 scroll-mt-16">
                    <div className="max-w-2xl mx-auto text-center">
                        <h2 className="font-marker text-4xl md:text-5xl lg:text-6xl mb-8 md:mb-12">
                            {content.contact.title}
                        </h2>

                        <a
                            href={`mailto:${content.contact.email}`}
                            className="inline-flex items-center gap-3 text-xl md:text-2xl font-handwritten hover:underline underline-offset-4 transition-all mb-12"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {content.contact.email}
                        </a>

                        <div className="flex justify-center gap-8 md:gap-12">
                            {content.contact.instagram_url && (
                                <a
                                    href={content.contact.instagram_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex flex-col items-center gap-2"
                                >
                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium">Instagram</span>
                                </a>
                            )}

                            {content.contact.facebook_url && (
                                <a
                                    href={content.contact.facebook_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex flex-col items-center gap-2"
                                >
                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium">Facebook</span>
                                </a>
                            )}

                            {content.contact.tiktok_url && (
                                <a
                                    href={content.contact.tiktok_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex flex-col items-center gap-2"
                                >
                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium">TikTok</span>
                                </a>
                            )}
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-8 border-t border-black/10">
                    <div className="max-w-6xl mx-auto px-4 text-center">
                        <p className="text-sm text-black/50">{content.footer.copyright_text}</p>
                    </div>
                </footer>
            </main>
        </TooltipProvider>
    );
}
