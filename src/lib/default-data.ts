import { RoadmapItem, SiteContent, SponsorPackage } from "./types";

export const initialRoadmapItems: RoadmapItem[] = [
    {
        id: "roadmap-1",
        title: "Financieringsfase 1",
        description: "Subsidies en sponsoren benaderen voor de eerste fase van financiering, zodat het project kan worden opgezet.",
        duration: "Nu bezig: circa 12 weken",
        active: true,
        order_index: 0,
    },
    {
        id: "roadmap-2",
        title: "Wervingsfase",
        description: "Het verkennen van het veld en het benaderen van rappers om een gedicht in te sturen binnen de gestelde deadline.",
        duration: "Circa 4-6 weken",
        active: false,
        order_index: 1,
    },
    {
        id: "roadmap-3",
        title: "Selectiefase",
        description: "Alle ingestuurde teksten worden gelezen en de beste vijftig worden geselecteerd voor de bundel.",
        duration: "Circa 2-3 weken",
        active: false,
        order_index: 2,
    },
    {
        id: "roadmap-4",
        title: "Financieringsfase 2",
        description: "In de tweede fase wordt een crowdfundingsactie opgezet. Supporters krijgen de mogelijkheid om de eerste druk van de bundel te kopen.",
        duration: "Circa 8 weken",
        active: false,
        order_index: 3,
    },
    {
        id: "roadmap-5",
        title: "Portretfase",
        description: "De portretten van de rappers met een geselecteerd gedicht worden geschreven voor in het boek.",
        duration: "Circa 4 weken (simultaan met financieringsfase 2)",
        active: false,
        order_index: 4,
    },
    {
        id: "roadmap-6",
        title: "Redactiefase",
        description: "Alle teksten worden nagelezen, spellingtechnisch gecorrigeerd en de voor- en nawoorden worden geschreven.",
        duration: "Circa 4 weken (gelijktijdig met financieringsfase 2)",
        active: false,
        order_index: 5,
    },
    {
        id: "roadmap-7",
        title: "Drukfase",
        description: "De fysieke kopieën van de gedichtenbundel worden gedrukt.",
        duration: "Circa 4 weken",
        active: false,
        order_index: 6,
    },
    {
        id: "roadmap-8",
        title: "Releasefase",
        description: "Het uitbrengen van de fysieke bundel, de digitale releases en de voordracht in De Nieuwe Bibliotheek Almere.",
        duration: "Circa 4 weken",
        active: false,
        order_index: 7,
    },
];

export const initialSponsorPackages: SponsorPackage[] = [
    {
        id: "sponsor-1",
        title: "ALLY INSTAPPERS",
        price: "Vanaf €250",
        image: "/img/sponsor/01.png",
        benefits: [
            "2 boeken bij de release",
            "Een display om te plaatsen in je winkel als supporter",
            "Een dankwoord op de website",
            "Een dankwoord op de social media",
        ],
        order_index: 0,
    },
    {
        id: "sponsor-2",
        title: "ALLY KERN SUPPORTERS",
        price: "Vanaf €500",
        image: "/img/sponsor/02.png",
        benefits: [
            "4 boeken bij de release",
            "Een display om te plaatsen in je winkel als supporter",
            "Een 50 Gezichten 50 Gedichten supporter sticker",
            "Een shout-out tijdens de voordracht",
            "Een dankwoord op de website",
            "Een dankwoord op de social media",
        ],
        order_index: 1,
    },
    {
        id: "sponsor-3",
        title: "ALLY UPPERS",
        price: "Vanaf €1.000",
        image: "/img/sponsor/03.png",
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
        order_index: 2,
    },
    {
        id: "sponsor-4",
        title: "ALLY MAXIMUM",
        price: "Vanaf €2.500",
        image: "/img/sponsor/04.png",
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
        order_index: 3,
    },
];

export const initialSiteContent: SiteContent = {
    id: "content-prod",
    version: 1,
    status: "published",
    hero: {
        tagline: "HipHop X Poëziebundel — 50 jaar Almere",
        logo_alt: "50 Gezichten 50 Gedichten",
    },
    about: {
        title: "Over Ons",
        lead_highlight: "50 Gezichten, 50 Gedichten",
        paragraph_1:
            "is een unieke Almeerse gedichtenbundel waarin hiphop en poëzie met elkaar worden verbonden. Vijftig rappers uit Almere — jong en oud — leveren elk een tekst voor de bundel. Rapteksten worden meestal gehoord in combinatie met beats, maar ze zijn ook op zichzelf staande stukjes kunst. Dit project is zowel een literaire publicatie als een cultureel portret van Almere: een hedendaags stuk cultureel erfgoed dat de geschiedenis van vijftig jaar stad weergeeft.",
        paragraph_2:
            "Wij geloven dat kunst voor iedereen toegankelijk moet zijn. Daarom wordt de bundel gratis beschikbaar gesteld via de Almeerse bibliotheken en op onze website. De fysieke bundels worden verspreid tijdens een lanceringsavond in De Nieuwe Bibliotheek Almere, waar rappers hun gedichten live voordragen. Hopelijk is deze bundel pas het begin van een nieuwe traditie van culturele werken waar elke Almeerder trots op kan zijn.",
    },
    aanmelden: {
        title: "Aanmelden",
        description:
            "Ben jij een rapper uit Almere met een verhaal te vertellen? Wij zoeken vijftig stemmen die de stad representeren. Als je woonachtig en ingeschreven bent in Almere en minimaal één rapsingle hebt uitgebracht, nodigen wij je uit om je aan te melden. Deel jouw woorden met de wereld en maak deel uit van dit unieke culturele project.",
    },
    support: {
        title: "Support",
        intro:
            "Als bedrijf uit Almere kun jij een belangrijke rol spelen in het behouden en versterken van de lokale cultuur. Door sponsor te worden van 50 Gezichten 50 Gedichten vereeuw je jouw naam in de danklijsten en draag je bij aan een cultureel erfgoedproject dat generaties zal inspireren.",
        custom_package_text: "Liever een op maat gemaakt pakket? Neem vooral contact met ons op door te mailen naar",
        custom_package_email: "50gezichten@gmail.com",
    },
    contact: {
        title: "Contact",
        email: "50gezichten@gmail.com",
        instagram_url: "https://instagram.com/50gezichten",
        facebook_url: "https://facebook.com/50gezichten",
        tiktok_url: "https://tiktok.com/@50gezichten",
    },
    footer: {
        copyright_text:
            "© 2026 - 50 Gezichten 50 Gedichten - Izhia Arts - Juiced Unicorn - Stichting Dutch Urban Arts - Almere",
    },
    updated_at: new Date().toISOString(),
    updated_by: "system",
};
