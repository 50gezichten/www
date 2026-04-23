"use client";

import Image from "next/image";
import { Analytics } from "@vercel/analytics/next"
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Roadmap data
const roadmapItems = [
    {
        title: "Financieringsfase 1",
        description: "Subsidies en sponsoren benaderen voor de eerste fase van financiering, zodat het project kan worden opgezet.",
        duration: "Nu bezig: circa 12 weken",
        active: true,
    },
    {
        title: "Wervingsfase",
        description: "Het verkennen van het veld en het benaderen van rappers om een gedicht in te sturen binnen de gestelde deadline.",
        duration: "Circa 4-6 weken",
        active: false,
    },
    {
        title: "Selectiefase",
        description: "Alle ingestuurde teksten worden gelezen en de beste vijftig worden geselecteerd voor de bundel.",
        duration: "Circa 2-3 weken",
        active: false,
    },
    {
        title: "Financieringsfase 2",
        description: "In de tweede fase wordt een crowdfundingsactie opgezet. Supporters krijgen de mogelijkheid om de eerste druk van de bundel te kopen.",
        duration: "Circa 8 weken",
        active: false,
    },
    {
        title: "Portretfase",
        description: "De portretten van de rappers met een geselecteerd gedicht worden geschreven voor in het boek.",
        duration: "Circa 4 weken (simultaan met financieringsfase 2)",
        active: false,
    },
    {
        title: "Redactiefase",
        description: "Alle teksten worden nagelezen, spellingtechnisch gecorrigeerd en de voor- en nawoorden worden geschreven.",
        duration: "Circa 4 weken (gelijktijdig met financieringsfase 2)",
        active: false,
    },
    {
        title: "Drukfase",
        description: "De fysieke kopieën van de gedichtenbundel worden gedrukt.",
        duration: "Circa 4 weken",
        active: false,
    },
    {
        title: "Releasefase",
        description: "Het uitbrengen van de fysieke bundel, de digitale releases en de voordracht in De Nieuwe Bibliotheek Almere.",
        duration: "Circa 4 weken",
        active: false,
    },
];

// Sponsor packages data
const sponsorPackages = [
    {
        title: "ALLY INSTAPPERS",
        price: "Vanaf €250",
        benefits: [
            "2 boeken bij de release",
            "Een display om te plaatsen in je winkel als supporter",
            "Een dankwoord op de website",
            "Een dankwoord op de social media",
        ],
    },
    {
        title: "ALLY KERN SUPPORTERS",
        price: "Vanaf €500",
        benefits: [
            "4 boeken bij de release",
            "Een display om te plaatsen in je winkel als supporter",
            "Een 50 Gezichten 50 Gedichten supporter sticker",
            "Een shout-out tijdens de voordracht",
            "Een dankwoord op de website",
            "Een dankwoord op de social media",
        ],
    },
    {
        title: "ALLY UPPERS",
        price: "Vanaf €1.000",
        benefits: [
            "4 boeken bij de release",
            "Een handgemaakte display om te plaatsen in je winkel als supporter",
            "Een 50 Gezichten 50 Gedichten supporter sticker",
            "Een shout-out tijdens de voordracht",
            "Een dankwoord op de website",
            "Een dankwoord op de social media",
            "Een dankwoord in het boek",
            "Een custom video voordracht van een van de gedichten uit de bundel",
        ],
    },
    {
        title: "ALLY MAXIMUM",
        price: "Vanaf €2.500",
        benefits: [
            "8 boeken bij de release",
            "Een handgemaakte speciale display om te plaatsen in je winkel als supporter",
            "Een 50 Gezichten 50 Gedichten supporter sticker",
            "Een shout-out tijdens de voordracht",
            "Een dankwoord op de website",
            "Een dankwoord op de social media",
            "Een dankwoord in het boek",
            "Vier custom video voordrachten van gedichten uit de bundel",
        ],
    },
];

export default function Home() {
    const cardDragX = useRef(0);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragAnimating, setIsDragAnimating] = useState(false);
    const dragStartX = useRef<number | null>(null);
    const dragCurrentX = useRef<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [currentPackage, setCurrentPackage] = useState(0);
    const [direction, setDirection] = useState(1);
    const [formData, setFormData] = useState({
        artistName: "",
        email: "",
        phone: "",
        instagram: "",
        tiktok: "",
    });
    const [formStatus, setFormStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormStatus("sending");

        try {
            const res = await fetch("/api/aanmelden", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                throw new Error("Verzenden mislukt");
            }

            setFormStatus("sent");
            setFormData({
                artistName: "",
                email: "",
                phone: "",
                instagram: "",
                tiktok: "",
            });

            setTimeout(() => {
                setFormStatus("idle");
            }, 3000);
        } catch (error) {
            console.error(error);
            setFormStatus("error");
        }
    };

    const nextPackage = () => {
        setDirection(1);
        setCurrentPackage((prev) => (prev + 1) % sponsorPackages.length);
    };

    const prevPackage = () => {
        setDirection(-1);
        setCurrentPackage((prev) => (prev - 1 + sponsorPackages.length) % sponsorPackages.length);
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

    return (
        <TooltipProvider delayDuration={0}>
            <main className="min-h-screen bg-white">
                {/* Navigation */}
                <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm z-50 border-b border-black/10">
                    <div className="max-w-6xl mx-auto px-4 py-3">
                        <ul className="flex justify-center gap-6 md:gap-10 text-sm md:text-base font-medium">
                            <li><a href="#over-ons" className="hover:underline underline-offset-4 transition-all">Over Ons</a></li>
                            <li><a href="#roadmap" className="hover:underline underline-offset-4 transition-all">Roadmap</a></li>
                            <li><a href="#aanmelden" className="hover:underline underline-offset-4 transition-all">Aanmelden</a></li>
                            <li><a href="#support" className="hover:underline underline-offset-4 transition-all">Support</a></li>
                            <li><a href="#contact" className="hover:underline underline-offset-4 transition-all">Contact</a></li>
                        </ul>
                    </div>
                </nav>

                {/* Hero Section with Logo */}
                <section className="pt-24 pb-16 md:pt-32 md:pb-24 flex flex-col items-center justify-center px-4">
                    <div className="max-w-md md:max-w-lg">
                        <Image
                            src="/img/logo.png"
                            alt="50 Gezichten 50 Gedichten"
                            width={600}
                            height={400}
                            className="w-full h-auto transition-transform duration-300 hover:scale-[1.03]"
                            priority
                        />
                    </div>
                    <p className="mt-8 text-lg md:text-xl text-center font-handwritten text-black/70">
                        HipHop X Poëziebundel — 50 jaar Almere
                    </p>
                </section>

                {/* Over Ons Section */}
                <section id="over-ons" className="py-16 md:py-24 px-4 scroll-mt-16">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="font-marker text-4xl md:text-5xl lg:text-6xl mb-8 md:mb-12">
                            Over Ons
                        </h2>
                        <div className="space-y-6 text-base md:text-lg leading-relaxed text-black/80">
                            <p>
                                <span className="font-handwritten text-2xl">50 Gezichten, 50 Gedichten</span> is een unieke Almeerse gedichtenbundel waarin hiphop en poëzie met elkaar worden verbonden. Vijftig rappers uit Almere — jong en oud — leveren elk een tekst voor de bundel. Rapteksten worden meestal gehoord in combinatie met beats, maar ze zijn ook op zichzelf staande stukjes kunst. Dit project is zowel een literaire publicatie als een cultureel portret van Almere: een hedendaags stuk cultureel erfgoed dat de geschiedenis van vijftig jaar stad weergeeft.
                            </p>
                            <p>
                                Wij geloven dat kunst voor iedereen toegankelijk moet zijn. Daarom wordt de bundel gratis beschikbaar gesteld via de Almeerse bibliotheken en op onze website. De fysieke bundels worden verspreid tijdens een lanceringsavond in De Nieuwe Bibliotheek Almere, waar rappers hun gedichten live voordragen. Hopelijk is deze bundel pas het begin van een nieuwe traditie van culturele werken waar elke Almeerder trots op kan zijn.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Roadmap Section */}
                <section id="roadmap" className="py-16 md:py-24 px-4 bg-black/[0.02] scroll-mt-16">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="font-marker text-4xl md:text-5xl lg:text-6xl text-center mb-12 md:mb-20">
                            Roadmap
                        </h2>

                        {/* Desktop Roadmap - Zigzag Pattern */}
                        <div className="hidden lg:block">
                            <div className="relative mx-auto w-full max-w-[1200px] h-[300px]">
                                <svg
                                    className="absolute inset-0 w-full h-full overflow-visible"
                                    viewBox="0 -40 1200 300"
                                    preserveAspectRatio="xMidYMid meet"
                                >
                                    <path
                                        d="M 75 40 L 225 160 L 375 40 L 525 160 L 675 40 L 825 160 L 975 40 L 1125 160"
                                        fill="none"
                                        stroke="rgba(0,0,0,0.15)"
                                        strokeWidth="2"
                                        strokeDasharray="8 4"
                                    />

                                    {roadmapItems.map((item, index) => {
                                        const points = [
                                            { x: 75, y: 40 },
                                            { x: 225, y: 160 },
                                            { x: 375, y: 40 },
                                            { x: 525, y: 160 },
                                            { x: 675, y: 40 },
                                            { x: 825, y: 160 },
                                            { x: 975, y: 40 },
                                            { x: 1125, y: 160 },
                                        ];

                                        const point = points[index];
                                        const isTop = index % 2 === 0;

                                        return (
                                            <Tooltip key={item.title}>
                                                <TooltipTrigger asChild>
                                                    <g
                                                        className="cursor-pointer transition-all duration-200"
                                                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = "scale(1.1)";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = "scale(1)";
                                                        }}
                                                    >
                                                        <circle
                                                            cx={point.x}
                                                            cy={point.y}
                                                            r="10"
                                                            fill={item.active ? "black" : "white"}
                                                            stroke="black"
                                                            strokeWidth="3"
                                                        />

                                                        <text
                                                            x={point.x}
                                                            y={isTop ? point.y - 36 : point.y + 46}
                                                            textAnchor="middle"
                                                            className="font-marker"
                                                            style={{
                                                                fontSize: "19px",
                                                                fill: "black",
                                                            }}
                                                        >
                                                            {item.title}
                                                        </text>
                                                    </g>
                                                </TooltipTrigger>

                                                <TooltipContent>
                                                    <div className="max-w-xs text-left">
                                                        <p className="font-semibold">{item.title}</p>
                                                        <p className="mt-1 text-sm">{item.description}</p>
                                                        <p className="mt-2 text-xs opacity-80">{item.duration}</p>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </svg>
                            </div>
                        </div>

                        {/* Tablet Roadmap */}
                        <div className="hidden md:block lg:hidden">
                            <div className="grid grid-cols-4 gap-8">
                                {roadmapItems.map((item, index) => {
                                    const points = [
                                        { x: 75, y: 40 },
                                        { x: 225, y: 160 },
                                        { x: 375, y: 40 },
                                        { x: 525, y: 160 },
                                        { x: 675, y: 40 },
                                        { x: 825, y: 160 },
                                        { x: 975, y: 40 },
                                        { x: 1125, y: 160 },
                                    ];

                                    const point = points[index];
                                    const isTop = index % 2 === 0;

                                    return (
                                        <div key={item.title}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        className="absolute cursor-pointer group"
                                                        style={{
                                                            left: `${point.x}px`,
                                                            top: `${point.y}px`,
                                                            transform: "translate(-50%, -50%)",
                                                        }}
                                                    >
                                                        <div
                                                            className={`w-5 h-5 rounded-full border-[3px] transition-all duration-300 group-hover:scale-150 ${item.active ? "bg-black border-black" : "bg-white border-black"
                                                                }`}
                                                        />
                                                    </div>
                                                </TooltipTrigger>

                                                <TooltipContent>
                                                    <div className="max-w-xs text-left">
                                                        <p className="font-semibold">{item.title}</p>
                                                        <p className="mt-1 text-sm">{item.description}</p>
                                                        <p className="mt-2 text-xs opacity-80">{item.duration}</p>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>

                                            <div
                                                className="absolute whitespace-nowrap font-marker text-xl"
                                                style={{
                                                    left: `${point.x}px`,
                                                    top: isTop ? `${point.y + 28}px` : `${point.y + 28}px`,
                                                    transform: "translateX(-50%)",
                                                }}
                                            >
                                                {item.title}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Mobile Roadmap */}
                        <div className="md:hidden space-y-6">
                            {roadmapItems.map((item, index) => (
                                <div key={item.title} className="flex items-start gap-4">
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={`w-4 h-4 rounded-full border-[3px] flex-shrink-0 ${item.active
                                                    ? "bg-black border-black"
                                                    : "bg-white border-black"
                                                }`}
                                        />
                                        {index < roadmapItems.length - 1 && (
                                            <div className="w-0.5 h-full min-h-[60px] bg-black/20 mt-1" />
                                        )}
                                    </div>
                                    <div className="flex-1 pb-2">
                                        <h3 className="font-handwritten text-xl mb-1">{item.title}</h3>
                                        <p className="text-sm text-black/70 mb-1">{item.description}</p>
                                        <p className="text-xs text-black/50 italic">{item.duration}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Aanmelden Section */}
                <section id="aanmelden" className="py-16 md:py-24 px-4 scroll-mt-16">
                    <div className="max-w-2xl mx-auto text-center">
                        <h2 className="font-marker text-4xl md:text-5xl lg:text-6xl mb-8 md:mb-12">
                            Aanmelden
                        </h2>
                        <p className="text-base md:text-lg text-black/80 mb-8 leading-relaxed">
                            Ben jij een rapper uit Almere met een verhaal te vertellen? Wij zoeken vijftig stemmen die de stad representeren. Als je woonachtig en ingeschreven bent in Almere en minimaal één rapsingle hebt uitgebracht, nodigen wij je uit om je aan te melden. Deel jouw woorden met de wereld en maak deel uit van dit unieke culturele project.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-6 text-left">
                            <div>
                                <label htmlFor="artistName" className="block text-sm font-medium mb-2">
                                    Artiestennaam *
                                </label>
                                <input
                                    type="text"
                                    id="artistName"
                                    required
                                    value={formData.artistName}
                                    onChange={(e) => setFormData({ ...formData, artistName: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 transition-all"
                                    placeholder="Je artiestennaam"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium mb-2">
                                    Emailadres *
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 transition-all"
                                    placeholder="je@email.nl"
                                />
                            </div>

                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium mb-2">
                                    Telefoonnummer *
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    required
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 transition-all"
                                    placeholder="06-12345678"
                                />
                            </div>

                            <div>
                                <label htmlFor="instagram" className="block text-sm font-medium mb-2">
                                    Instagram
                                </label>
                                <input
                                    type="text"
                                    id="instagram"
                                    value={formData.instagram}
                                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 transition-all"
                                    placeholder="@jouwhandle"
                                />
                            </div>

                            <div>
                                <label htmlFor="tiktok" className="block text-sm font-medium mb-2">
                                    TikTok
                                </label>
                                <input
                                    type="text"
                                    id="tiktok"
                                    value={formData.tiktok}
                                    onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 transition-all"
                                    placeholder="@jouwhandle"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={formStatus === "sending"}
                                className="w-full py-4 bg-black text-white font-medium rounded-lg hover:bg-black/80 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {formStatus === "sending"
                                    ? "Verzenden..."
                                    : formStatus === "sent"
                                        ? "Verzonden!"
                                        : formStatus === "error"
                                            ? "Er ging iets mis"
                                            : "Verstuur Aanmelding"}
                            </button>
                        </form>
                    </div>
                </section>

                {/* Support Section */}
                <section id="support" className="py-16 md:py-24 px-4 bg-black/[0.02] scroll-mt-16">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="font-marker text-4xl md:text-5xl lg:text-6xl text-center mb-8 md:mb-12">
                            Support
                        </h2>
                        <p className="text-base md:text-lg text-black/80 text-center mb-12 max-w-2xl mx-auto leading-relaxed">
                            Als bedrijf uit Almere kun jij een belangrijke rol spelen in het behouden en versterken van de lokale cultuur. Door sponsor te worden van 50 Gezichten 50 Gedichten vereeuw je jouw naam in de danklijsten en draag je bij aan een cultureel erfgoedproject dat generaties zal inspireren.
                        </p>

                        {/* Package Carousel */}
                        <div className="relative mx-auto max-w-4xl">
                            <div className="relative mx-auto w-full max-w-md">
                                {/* Left Arrow */}
                                <button
                                    onClick={prevPackage}
                                    className="absolute top-[235px] right-[calc(100%+2rem)] -translate-y-1/2 p-3 md:p-4 hover:bg-black/5 rounded-full transition-all group z-10"
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
                                    className="absolute top-[235px] left-[calc(100%+2rem)] -translate-y-1/2 p-3 md:p-4 hover:bg-black/5 rounded-full transition-all group z-10"
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
                                            key={currentPackage}
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
                                                <div className="w-full h-40 md:h-48 bg-gradient-to-br from-black/5 to-black/10 rounded-lg mb-6 flex items-center justify-center">
                                                    <span className="font-marker text-3xl md:text-4xl text-black/20">
                                                        {currentPackage + 1}
                                                    </span>
                                                </div>

                                                <h3 className="font-marker text-2xl md:text-3xl mb-2 text-center">
                                                    {sponsorPackages[currentPackage].title}
                                                </h3>
                                                <p className="text-xl md:text-2xl font-handwritten text-center mb-6 text-black/70">
                                                    {sponsorPackages[currentPackage].price}
                                                </p>

                                                <ul className="space-y-3">
                                                    {sponsorPackages[currentPackage].benefits.map((benefit, idx) => (
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
                                        {sponsorPackages.map((_, index) => (
                                            <button
                                                key={`dot-${index}`}
                                                onClick={() => {
                                                    setDirection(index > currentPackage ? 1 : -1);
                                                    setCurrentPackage(index);
                                                }}
                                                className={`w-2 h-2 rounded-full transition-all ${index === currentPackage ? "bg-black w-6" : "bg-black/30"
                                                    }`}
                                                aria-label={`Ga naar pakket ${index + 1}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-center mt-12 text-black/70 text-base md:text-lg">
                            Liever een op maat gemaakt pakket? Neem vooral contact met ons op door te mailen naar{" "}
                            <a href="mailto:50gezichten@gmail.com" className="underline hover:text-black transition-colors">
                                50gezichten@gmail.com
                            </a>
                        </p>
                    </div>
                </section>

                {/* Contact Section */}
                <section id="contact" className="py-16 md:py-24 px-4 scroll-mt-16">
                    <div className="max-w-2xl mx-auto text-center">
                        <h2 className="font-marker text-4xl md:text-5xl lg:text-6xl mb-8 md:mb-12">
                            Contact
                        </h2>

                        <a
                            href="mailto:50gezichten@gmail.com"
                            className="inline-flex items-center gap-3 text-xl md:text-2xl font-handwritten hover:underline underline-offset-4 transition-all mb-12"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            50gezichten@gmail.com
                        </a>

                        <div className="flex justify-center gap-8 md:gap-12">
                            <a
                                href="https://instagram.com/50gezichten"
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

                            <a
                                href="https://facebook.com/50gezichten"
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

                            <a
                                href="https://tiktok.com/@50gezichten"
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
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-8 border-t border-black/10">
                    <div className="max-w-6xl mx-auto px-4 text-center">
                        <p className="text-sm text-black/50">
                            © 2026 50 Gezichten 50 Gedichten - Izhia Arts - Juiced Unicorn - Stichting Dutch Urban Arts - Almere
                        </p>
                    </div>
                </footer>
            </main>
        </TooltipProvider>
    );
}
