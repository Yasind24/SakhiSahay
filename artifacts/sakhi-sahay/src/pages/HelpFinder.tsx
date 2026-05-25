import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Baby,
  BadgeInfo,
  Brain,
  Building2,
  ExternalLink,
  FileText,
  Gavel,
  Heart,
  HelpCircle,
  Hospital,
  Laptop,
  MapPin,
  Phone,
  Shield,
  Siren,
  Loader2,
} from "lucide-react";
import { getMapOscs } from "@/lib/local-api";
import { distanceInKm, googleMapsDirectionsUrl } from "@/lib/geo";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type NeedId = "medical" | "police" | "legal" | "counselling" | "shelter" | "child" | "cyber" | "unsure";
type Urgency = "urgent" | "soon" | "planning";

interface NeedOption {
  id: NeedId;
  title: string;
  description: string;
  icon: typeof Hospital;
}

interface Recommendation {
  title: string;
  body: string;
  actions: Array<{ label: string; href: string; tone: "primary" | "rose" | "outline"; external?: boolean }>;
  checklist: string[];
  officialBasis: string[];
}

const needs: NeedOption[] = [
  {
    id: "medical",
    title: "Medical help",
    description: "Medical aid, examination, hospital linkage, or urgent health support.",
    icon: Hospital,
  },
  {
    id: "police",
    title: "Police help",
    description: "Immediate safety, complaint support, or police facilitation.",
    icon: Shield,
  },
  {
    id: "legal",
    title: "Legal support",
    description: "Legal aid, rights information, FIR or court-related support.",
    icon: Gavel,
  },
  {
    id: "counselling",
    title: "Counselling",
    description: "Psycho-social support, emotional distress, or someone to talk to.",
    icon: Brain,
  },
  {
    id: "shelter",
    title: "Shelter",
    description: "A temporary safe place or support leaving an unsafe situation.",
    icon: Building2,
  },
  {
    id: "child",
    title: "Child or minor involved",
    description: "A girl below 18, child safety issue, or POCSO/JJ linkage may be needed.",
    icon: Baby,
  },
  {
    id: "cyber",
    title: "Cyber harassment",
    description: "Online threats, blackmail, stalking, image abuse, or cyber crime.",
    icon: Laptop,
  },
  {
    id: "unsure",
    title: "I am not sure",
    description: "Start with a safe, broad route to OSC and helpline support.",
    icon: HelpCircle,
  },
];

const officialLinks = [
  {
    label: "Mission Shakti",
    href: "https://missionshakti.wcd.gov.in/about",
    detail: "Official helplines and Mission Shakti context.",
  },
  {
    label: "OSC Scheme",
    href: "https://transformingindia.mygov.in/scheme/one-stop-centre/",
    detail: "Eligibility, services, and access routes.",
  },
  {
    label: "OSC Documents",
    href: "https://spniwcd.wcd.gov.in/one-stop-centre-header/documents",
    detail: "Guidelines and functional OSC directory documents.",
  },
  {
    label: "PIB OSC Note",
    href: "https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1706000",
    detail: "Official service summary from MWCD.",
  },
];

const helplines = [
  { number: "181", label: "Women Helpline", detail: "Assistance and referral to OSC, police, hospital, legal aid." },
  { number: "112", label: "Emergency", detail: "Immediate emergency response." },
  { number: "1098", label: "Child Helpline", detail: "Child safety and protection support." },
  { number: "15100", label: "NALSA Legal", detail: "Legal services helpline." },
  { number: "1930", label: "Cyber Crime", detail: "National cyber crime helpline." },
  { number: "14416", label: "Tele MANAS", detail: "Mental health support." },
];

function getRecommendation(need: NeedId, urgency: Urgency): Recommendation {
  const urgentPrefix =
    urgency === "urgent"
      ? "Because this may be urgent, start with emergency contact and then use the OSC route for coordinated support."
      : urgency === "soon"
        ? "This sounds important but not necessarily immediate danger; an OSC can help coordinate the next service."
        : "For planning ahead, use OSC information, helplines, and documents you may want to keep ready.";

  const baseActions = [
    { label: "Find nearest OSC", href: `${BASE}/`, tone: "primary" as const },
    { label: "Browse centres", href: `${BASE}/centres`, tone: "outline" as const },
  ];

  const byNeed: Record<NeedId, Recommendation> = {
    medical: {
      title: "Medical aid through OSC support",
      body: `${urgentPrefix} OSCs are officially described as providing medical aid and referral/linkage under one roof.`,
      actions: [{ label: "Call 112", href: "tel:112", tone: "rose" }, { label: "Call 181", href: "tel:181", tone: "primary" }, ...baseActions],
      checklist: ["Current location", "Nearest landmark", "Any injury details", "Any medicines or medical documents available"],
      officialBasis: ["OSC services include medical aid.", "181 can link callers with appropriate authorities such as hospitals and OSCs."],
    },
    police: {
      title: "Police facilitation and immediate safety",
      body: `${urgentPrefix} OSCs provide police facilitation, and the 181 route can be integrated with police and emergency response helplines.`,
      actions: [{ label: "Call 112", href: "tel:112", tone: "rose" }, { label: "Call 181", href: "tel:181", tone: "primary" }, ...baseActions],
      checklist: ["Current location", "Whether immediate danger is present", "Name/location of nearest police station if known", "Any incident details you can safely share"],
      officialBasis: ["OSC services include police facilitation.", "181 is listed as a women helpline under Mission Shakti."],
    },
    legal: {
      title: "Legal aid and rights support",
      body: `${urgentPrefix} OSCs are officially listed as providing legal aid; Mission Shakti also lists NALSA legal helpline 15100.`,
      actions: [{ label: "Call 15100", href: "tel:15100", tone: "primary" }, { label: "Call 181", href: "tel:181", tone: "outline" }, ...baseActions],
      checklist: ["Any ID proof available", "Incident date or approximate timeline", "Copies/photos of relevant papers if safe", "Questions you want legal aid to answer"],
      officialBasis: ["OSC services include legal aid.", "Mission Shakti lists Legal (NALSA) Helpline 15100."],
    },
    counselling: {
      title: "Psycho-social counselling and emotional support",
      body: `${urgentPrefix} OSCs provide psycho-social counselling. Mission Shakti also lists Tele MANAS for mental health support.`,
      actions: [{ label: "Call 181", href: "tel:181", tone: "primary" }, { label: "Call 14416", href: "tel:14416", tone: "outline" }, ...baseActions],
      checklist: ["A safe time to talk", "Preferred language if relevant", "Whether you want centre-based support", "A trusted contact, if you have one"],
      officialBasis: ["OSC services include psycho-social counselling.", "Mission Shakti lists Tele MANAS 14416."],
    },
    shelter: {
      title: "Temporary shelter and short-term care",
      body: `${urgentPrefix} OSCs are officially described as providing temporary shelter and short-term care support for women in distress.`,
      actions: [{ label: "Call 181", href: "tel:181", tone: "primary" }, { label: "Call 112", href: "tel:112", tone: "rose" }, ...baseActions],
      checklist: ["Your current location", "Whether children are with you", "Essential medicines or documents if safe to carry", "A safe transport option if available"],
      officialBasis: ["OSC services include temporary shelter.", "Mission Shakti includes emergency/immediate services and short-term care."],
    },
    child: {
      title: "Child or minor-linked support",
      body: `${urgentPrefix} Official OSC information says girls below 18 are linked with Juvenile Justice and POCSO-related authorities/institutions.`,
      actions: [{ label: "Call 1098", href: "tel:1098", tone: "rose" }, { label: "Call 181", href: "tel:181", tone: "primary" }, ...baseActions],
      checklist: ["Child's approximate age", "Current safety/location", "Guardian/contact information if safe", "Any immediate medical or police need"],
      officialBasis: ["Girls below 18 are served in coordination with JJ and POCSO-linked authorities.", "Mission Shakti lists Child Helpline 1098."],
    },
    cyber: {
      title: "Cyber harassment and digital abuse",
      body: `${urgentPrefix} Use the National Cyber Crime helpline for cyber incidents, and OSC/181 for safety, legal, counselling, or police-linked support.`,
      actions: [{ label: "Call 1930", href: "tel:1930", tone: "primary" }, { label: "Call 181", href: "tel:181", tone: "outline" }, ...baseActions],
      checklist: ["Do not delete evidence if it is safe to keep", "Screenshots or URLs", "Phone numbers/usernames involved", "Whether there is physical danger too"],
      officialBasis: ["Mission Shakti lists National Cyber Crime Helpline 1930.", "OSC support includes legal aid, counselling, and police facilitation."],
    },
    unsure: {
      title: "Start with OSC or 181",
      body: `${urgentPrefix} OSCs are designed for integrated support under one roof, so they are a strong first route when the exact service is unclear.`,
      actions: [{ label: "Call 181", href: "tel:181", tone: "primary" }, { label: "Call 112 if urgent", href: "tel:112", tone: "rose" }, ...baseActions],
      checklist: ["Where you are now", "What feels unsafe or confusing", "Whether you need medical, police, legal, counselling, or shelter help", "Any trusted person who can assist"],
      officialBasis: ["OSC provides integrated support and assistance under one roof.", "Women can access OSC by herself, through another person, or through 181."],
    },
  };

  return byNeed[need];
}

function actionClass(tone: Recommendation["actions"][number]["tone"]) {
  if (tone === "rose") return "bg-rose-600 text-white hover:bg-rose-700 border-rose-700";
  if (tone === "primary") return "bg-rose-600 text-white hover:bg-rose-700 border-rose-700";
  return "bg-white text-rose-700 hover:bg-rose-50 border-rose-200";
}

export default function HelpFinder() {
  const [selectedNeed, setSelectedNeed] = useState<NeedId>("unsure");
  const [urgency, setUrgency] = useState<Urgency>("soon");
  const recommendationRef = useRef<HTMLDivElement>(null);
  const recommendation = useMemo(() => getRecommendation(selectedNeed, urgency), [selectedNeed, urgency]);
  const primaryAction = recommendation.actions[0];

  const [findingLocation, setFindingLocation] = useState(false);

  const findNearestCentre = (e: React.MouseEvent) => {
    e.preventDefault();
    if (findingLocation) return;

    if (!navigator.geolocation) {
      alert("Location services are not supported by your browser. Redirecting to the centres directory.");
      window.location.href = `${BASE}/centres`;
      return;
    }

    setFindingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFindingLocation(false);
        const origin = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };

        const mapData = getMapOscs();
        if (!mapData || !mapData.data.length) {
          alert("Could not load center coordinates. Redirecting to the centres directory.");
          window.location.href = `${BASE}/centres`;
          return;
        }

        const closest = mapData.data
          .map((osc) => ({ ...osc, distanceKm: distanceInKm(origin, { lat: osc.lat, lon: osc.lon }) }))
          .sort((a, b) => a.distanceKm - b.distanceKm)[0];

        const directionsUrl = googleMapsDirectionsUrl({ lat: closest.lat, lon: closest.lon }, origin);
        window.open(directionsUrl, "_blank", "noopener,noreferrer");
      },
      (error) => {
        setFindingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          const proceed = confirm("Location access was denied. To find the nearest OSC, please enable location permissions. Would you like to browse centres manually instead?");
          if (proceed) {
            window.location.href = `${BASE}/centres`;
          }
        } else {
          alert("Unable to retrieve your location. Redirecting to the centres directory.");
          window.location.href = `${BASE}/centres`;
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5 * 60 * 1000 },
    );
  };

  const showRecommendation = () => {
    window.setTimeout(() => {
      recommendationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const chooseUrgency = (value: Urgency) => {
    setUrgency(value);
    showRecommendation();
  };

  const chooseNeed = (value: NeedId) => {
    setSelectedNeed(value);
    showRecommendation();
  };

  return (
    <div className="min-h-screen bg-[hsl(350,100%,98%)]">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-rose-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href={`${BASE}/`} className="flex items-center gap-2 font-bold text-rose-700 text-lg">
            <Heart className="w-5 h-5 text-rose-600 fill-rose-600" />
            SakhiSahay
          </Link>
          <div className="flex items-center gap-4">
            <Link href={`${BASE}/centres`} className="text-sm font-medium text-rose-800 hover:text-rose-600 transition-colors hidden sm:block">Find Centres</Link>
            <Link href={`${BASE}/map`} className="text-sm font-medium text-rose-800 hover:text-rose-600 transition-colors hidden sm:block">Map</Link>
            <a href="tel:181" className="flex items-center gap-1.5 bg-rose-600 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-rose-700 transition-colors shadow-sm">
              <Phone className="w-3.5 h-3.5" />
              181
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={`${BASE}/`} className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-800 text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <section className="grid lg:grid-cols-[0.95fr_1.05fr] gap-6 lg:gap-8 items-start">
          <div>
            <div className="mb-6">
              <h1 className="text-3xl sm:text-4xl font-bold text-rose-950 mb-3">Guided Help Finder</h1>
              <p className="text-rose-800 leading-relaxed max-w-2xl">
                Choose the kind of support needed. The next step is based on official OSC, Mission Shakti, and helpline information.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 sm:p-5 mb-5">
              <div className="flex items-center gap-2 mb-4">
                <Siren className="w-4 h-4 text-rose-600" />
                <h2 className="font-bold text-rose-950">How urgent is it?</h2>
              </div>
              <div className="grid sm:grid-cols-3 gap-2">
                {[
                  { id: "urgent", label: "Immediate danger" },
                  { id: "soon", label: "Need help soon" },
                  { id: "planning", label: "Planning ahead" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => chooseUrgency(item.id as Urgency)}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                      urgency === item.id
                        ? "bg-rose-600 text-white border-rose-700"
                        : "bg-white text-rose-800 border-rose-200 hover:bg-rose-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <a
              href="#recommended-route"
              onClick={(event) => {
                event.preventDefault();
                showRecommendation();
              }}
              className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-white p-4 text-left shadow-sm transition hover:bg-rose-50 lg:hidden"
            >
              <span>
                <span className="block text-xs font-semibold uppercase text-rose-500">Recommended route</span>
                <span className="mt-1 block font-bold text-rose-950">{recommendation.title}</span>
                <span className="mt-1 block text-sm text-rose-700">Next action: {primaryAction.label}</span>
              </span>
              <BadgeInfo className="mt-1 h-5 w-5 shrink-0 text-rose-500" />
            </a>

            <div className="grid sm:grid-cols-2 gap-3">
              {needs.map((need) => (
                <button
                  key={need.id}
                  onClick={() => chooseNeed(need.id)}
                  className={`text-left rounded-2xl border p-4 transition-all ${
                    selectedNeed === need.id
                      ? "bg-rose-600 text-white border-rose-700 shadow-md"
                      : "bg-white text-rose-950 border-rose-100 hover:border-rose-300 hover:shadow-sm"
                  }`}
                >
                  <need.icon className={`w-5 h-5 mb-3 ${selectedNeed === need.id ? "text-white" : "text-rose-500"}`} />
                  <div className="font-bold mb-1">{need.title}</div>
                  <p className={`text-sm leading-relaxed ${selectedNeed === need.id ? "text-rose-50" : "text-rose-700"}`}>
                    {need.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <aside className="lg:sticky lg:top-20 space-y-5">
            <div
              id="recommended-route"
              ref={recommendationRef}
              className="scroll-mt-20 bg-white rounded-2xl border border-rose-100 shadow-lg overflow-hidden"
            >
              <div className="bg-gradient-to-br from-rose-600 to-red-500 text-white p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-rose-100 text-sm font-semibold mb-1">Recommended route</p>
                    <h2 className="text-2xl font-bold">{recommendation.title}</h2>
                  </div>
                  <BadgeInfo className="w-7 h-7 text-white/70 shrink-0" />
                </div>
                <p className="text-rose-50 text-sm leading-relaxed mt-3">{recommendation.body}</p>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                <div className="grid sm:grid-cols-2 gap-2">
                  {recommendation.actions.map((action) => (
                    <a
                      key={`${action.label}-${action.href}`}
                      href={action.href}
                      onClick={action.label === "Find nearest OSC" ? findNearestCentre : undefined}
                      target={action.external ? "_blank" : undefined}
                      rel={action.external ? "noopener noreferrer" : undefined}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${actionClass(action.tone)}`}
                    >
                      {action.label === "Find nearest OSC" && findingLocation ? (
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      ) : action.href.startsWith("tel:") ? (
                        <Phone className="w-4 h-4 shrink-0" />
                      ) : (
                        <MapPin className="w-4 h-4 shrink-0" />
                      )}
                      {action.label === "Find nearest OSC" && findingLocation ? "Locating..." : action.label}
                    </a>
                  ))}
                </div>

                <div>
                  <h3 className="font-bold text-rose-950 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-rose-500" />
                    Keep ready if safe
                  </h3>
                  <ul className="space-y-2">
                    {recommendation.checklist.map((item) => (
                      <li key={item} className="text-sm text-rose-800 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-rose-100 bg-[hsl(350,100%,99%)] p-4">
                  <h3 className="font-bold text-rose-950 mb-3">Why this route?</h3>
                  <ul className="space-y-2">
                    {recommendation.officialBasis.map((basis) => (
                      <li key={basis} className="text-sm text-rose-700 leading-relaxed">
                        {basis}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
              <h2 className="font-bold text-rose-900 mb-3">Official helplines</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                {helplines.map((helpline) => (
                  <a
                    key={helpline.number}
                    href={`tel:${helpline.number}`}
                    className="bg-white border border-rose-100 rounded-xl p-3 hover:border-rose-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-rose-700">{helpline.number}</span>
                      <Phone className="w-4 h-4 text-rose-400" />
                    </div>
                    <div className="text-sm font-semibold text-rose-900 mt-1">{helpline.label}</div>
                    <p className="text-xs text-rose-600 mt-1 leading-relaxed">{helpline.detail}</p>
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-white border border-rose-100 rounded-2xl p-5">
              <h2 className="font-bold text-rose-950 mb-3">Official sources</h2>
              <div className="space-y-2">
                {officialLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start justify-between gap-3 rounded-xl border border-rose-100 px-3 py-3 hover:bg-rose-50 transition-colors"
                  >
                    <span>
                      <span className="block text-sm font-bold text-rose-800">{link.label}</span>
                      <span className="block text-xs text-rose-600 mt-0.5">{link.detail}</span>
                    </span>
                    <ExternalLink className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
