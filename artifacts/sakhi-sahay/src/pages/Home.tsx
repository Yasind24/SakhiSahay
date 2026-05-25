import { Link } from "wouter";
import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Phone, MapPin, Search, Heart, Shield, Users, Navigation, Loader2, ExternalLink, BadgeInfo, Compass, Map, ArrowRight } from "lucide-react";
import { getMapOscs, getOscStats, type MapResponse, type OscStatsResponse } from "@/lib/local-api";
import { distanceInKm, googleMapsDirectionsUrl, type Coordinates } from "@/lib/geo";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type FinderState = "idle" | "locating" | "found" | "blocked" | "unavailable" | "error";

export default function Home() {
  const [finderState, setFinderState] = useState<FinderState>("idle");
  const [nearest, setNearest] = useState<(MapResponse["data"][number] & { distanceKm: number }) | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);

  const { data: stats } = useQuery<OscStatsResponse>({
    queryKey: ["osc-stats"],
    queryFn: getOscStats,
  });

  const { data: mapData, isLoading: isLoadingMapData } = useQuery<MapResponse>({
    queryKey: ["oscs-map", "nearest-home"],
    queryFn: () => getMapOscs(),
  });

  const mappedCentreCount = mapData?.data.length ?? 0;

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        center: [22.5, 82.0],
        zoom: 4,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(mapInstance.current);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapData?.data.length) return;

    // Clear existing markers
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    const markerIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    for (const osc of mapData.data) {
      L.marker([osc.lat, osc.lon], { icon: markerIcon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:sans-serif;min-width:145px;line-height:1.4">
            <div style="font-weight:700;color:#9a3412;margin-bottom:2px">${osc.district}</div>
            <div style="font-size:11px;color:#78350f;margin-bottom:4px">${osc.state}</div>
            <a href="${BASE}/centres/${osc.id}" style="font-size:11px;color:#ea580c;font-weight:600;text-decoration:none">View Details →</a>
          </div>`
        );
    }
  }, [mapData]);

  const finderMessage = useMemo(() => {
    if (finderState === "blocked") return "Location permission was blocked. You can still browse centres by state or use the map.";
    if (finderState === "unavailable") return "Your browser could not share a location right now. Try searching by district instead.";
    if (finderState === "error") return "Something went wrong while finding the nearest mapped centre. Please try again.";
    if (finderState === "found" && nearest) return `${nearest.district}, ${nearest.state} is the closest mapped OSC we found.`;
    return "Share your location privately in the browser to route to the nearest mapped One Stop Centre.";
  }, [finderState, nearest]);

  const findNearestCentre = () => {
    if (!navigator.geolocation) {
      setFinderState("unavailable");
      return;
    }

    if (!mapData?.data.length) {
      setFinderState("error");
      return;
    }

    setFinderState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const origin = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };

        const closest = mapData.data
          .map((osc) => ({ ...osc, distanceKm: distanceInKm(origin, { lat: osc.lat, lon: osc.lon }) }))
          .sort((a, b) => a.distanceKm - b.distanceKm)[0];

        setUserLocation(origin);
        setNearest(closest);
        setFinderState("found");

        const directionsUrl = googleMapsDirectionsUrl({ lat: closest.lat, lon: closest.lon }, origin);
        window.open(directionsUrl, "_blank", "noopener,noreferrer");
      },
      (error) => {
        setFinderState(error.code === error.PERMISSION_DENIED ? "blocked" : "unavailable");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5 * 60 * 1000 },
    );
  };

  return (
    <div className="min-h-screen bg-[hsl(350,100%,98%)]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-rose-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href={`${BASE}/`} className="flex items-center gap-2 font-bold text-rose-700 text-lg">
            <Heart className="w-5 h-5 text-rose-600 fill-rose-600" />
            SakhiSahay
          </Link>
          <div className="flex items-center gap-4">
            <Link href={`${BASE}/centres`} className="text-sm font-medium text-rose-800 hover:text-rose-600 transition-colors hidden sm:block">Find Centres</Link>
            <Link href={`${BASE}/help-finder`} className="text-sm font-medium text-rose-800 hover:text-rose-600 transition-colors hidden sm:block">Help Finder</Link>
            <Link href={`${BASE}/centres?view=states`} className="text-sm font-medium text-rose-800 hover:text-rose-600 transition-colors hidden sm:block">By State</Link>
            <Link href={`${BASE}/centres?view=map`} className="text-sm font-medium text-rose-800 hover:text-rose-600 transition-colors">Map</Link>
            <a href="tel:181" className="flex items-center gap-1.5 bg-rose-600 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-rose-700 transition-colors shadow-sm">
              <Phone className="w-3.5 h-3.5" />
              181
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-rose-600 via-rose-500 to-red-500 text-white">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "60px 60px"}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-center">
          <div>
            {/* 181 badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-4 py-2 mb-6">
              <Phone className="w-4 h-4" />
              <span className="font-bold text-lg">181</span>
              <span className="text-white/80 text-sm">— Free helpline, 24×7</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4">
              Sakhi Kendras —<br />
              <span className="text-red-200">Safe spaces near you</span>
            </h1>
            <p className="text-lg sm:text-xl text-rose-100 mb-8 max-w-xl">
              Find One Stop Centres (OSCs) across India that provide free medical, legal, police, shelter and counselling support to women in distress.
            </p>

            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              <Link href={`${BASE}/centres?view=map`} className="inline-flex min-h-14 sm:min-h-20 w-full items-center justify-center gap-2 sm:gap-3 bg-white text-rose-700 font-bold px-4 py-3 sm:py-4 rounded-xl hover:bg-rose-50 transition-colors shadow-md text-xs sm:text-base border border-white col-span-2 sm:col-span-1">
                <Map className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 shrink-0" />
                <span className="text-center leading-tight">Map Explorer</span>
              </Link>
              <Link href={`${BASE}/centres`} className="inline-flex min-h-14 sm:min-h-20 w-full items-center justify-center gap-2 sm:gap-3 bg-white/20 backdrop-blur text-white font-semibold px-4 py-3 sm:py-4 rounded-xl hover:bg-white/30 transition-colors border border-white/30 text-xs sm:text-base col-span-1">
                <Search className="w-4 h-4 shrink-0" />
                <span className="text-center leading-tight">Search Directory</span>
              </Link>
              <Link href={`${BASE}/help-finder`} className="inline-flex min-h-14 sm:min-h-20 w-full items-center justify-center gap-2 sm:gap-3 bg-rose-950/25 backdrop-blur text-white font-semibold px-4 py-3 sm:py-4 rounded-xl hover:bg-rose-950/35 transition-colors border border-white/25 text-xs sm:text-base col-span-1">
                <BadgeInfo className="w-4 h-4 shrink-0" />
                <span className="text-center leading-tight">Guided Help</span>
              </Link>
            </div>
          </div>

          <div className="bg-white text-rose-950 rounded-2xl shadow-2xl border border-white/60 overflow-hidden">
            <div className="p-5 sm:p-6 bg-[hsl(350,100%,99%)]">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                  <Navigation className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h2 className="font-bold text-xl text-rose-950">Nearest real OSC routing</h2>
                  <p className="text-sm text-rose-700 mt-1 leading-relaxed">{finderMessage}</p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {nearest ? (
                <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-rose-500 uppercase">Closest mapped centre</div>
                      <div className="font-bold text-rose-950 mt-1">{nearest.district}, {nearest.state}</div>
                      <div className="text-sm text-rose-700 mt-1">{nearest.distanceKm.toFixed(1)} km away approx.</div>
                    </div>
                    <MapPin className="w-5 h-5 text-rose-500 shrink-0" />
                  </div>
                  {nearest.address && <p className="text-xs text-rose-700/80 mt-3 line-clamp-2">{nearest.address}</p>}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                    <div className="font-black text-rose-800">{mappedCentreCount || "—"}</div>
                    <div className="text-[11px] text-rose-500">mapped</div>
                  </div>
                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                    <div className="font-black text-rose-700">181</div>
                    <div className="text-[11px] text-rose-500">helpline</div>
                  </div>
                  <div className="rounded-xl bg-red-50 border border-red-100 p-3">
                    <div className="font-black text-red-700">Maps</div>
                    <div className="text-[11px] text-red-600">routing</div>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  onClick={findNearestCentre}
                  disabled={finderState === "locating" || isLoadingMapData || mappedCentreCount === 0}
                  className="inline-flex items-center justify-center gap-2 bg-rose-600 text-white font-bold px-4 py-3 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {finderState === "locating" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  Use my location
                </button>
                {nearest ? (
                  <a
                    href={googleMapsDirectionsUrl({ lat: nearest.lat, lon: nearest.lon }, userLocation ?? undefined)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-white border border-rose-200 text-rose-700 font-bold px-4 py-3 rounded-xl hover:bg-rose-50 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open directions
                  </a>
                ) : (
                  <a
                    href="tel:181"
                    className="inline-flex items-center justify-center gap-2 bg-rose-50 border border-rose-200 text-rose-800 font-bold px-4 py-3 rounded-xl hover:bg-rose-100 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call 181 Helpline
                  </a>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Wave */}
        <div className="pointer-events-none absolute -bottom-px left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="hsl(350,100%,98%)" />
          </svg>
        </div>
      </section>

      {/* Guided Help Finder CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
          <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
            <div className="bg-gradient-to-br from-rose-700 to-rose-600 text-white p-6 sm:p-8">
              <BadgeInfo className="w-8 h-8 text-white/80 mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">Guided Help Finder</h2>
              <p className="text-rose-50 leading-relaxed">
                Find relevant One Stop Centre services, emergency contacts, and official guidelines tailored to your needs.
              </p>
            </div>
            <div className="p-6 sm:p-8">
              <div className="grid sm:grid-cols-3 gap-3 mb-5">
                {["Medical, police, legal", "Counselling or shelter", "Child or cyber support"].map((item) => (
                  <div key={item} className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm font-semibold text-rose-800">
                    {item}
                  </div>
                ))}
              </div>
              <Link
                href={`${BASE}/help-finder`}
                className="inline-flex items-center justify-center gap-2 bg-rose-600 text-white font-bold px-5 py-3 rounded-xl hover:bg-rose-700 transition-colors"
              >
                <BadgeInfo className="w-4 h-4" />
                Open Guided Help Finder
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Map Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12">
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden p-6 sm:p-8">
          <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-rose-50 rounded-full px-3 py-1 mb-4 text-xs font-semibold text-rose-700 border border-rose-100">
                <Compass className="w-3.5 h-3.5" />
                Interactive Map Directory
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-rose-950 mb-4">
                Explore One Stop Centres Across India
              </h2>
              <p className="text-rose-800 leading-relaxed mb-6">
                Locate critical support centres nearest to you. Pan and zoom the live preview map to find your district, click any pin to view details, and instantly access verified routing and contact information.
              </p>
              
              <div className="space-y-4 mb-6">
                {[
                  { title: "Precise GPS Coordinates", desc: "Every center is checked against official coordinates for accurate navigation." },
                  { title: "State-wise Directory Linkage", desc: "Easily navigate between visual maps and detailed directory listings." },
                  { title: "One-Click Turn Directions", desc: "Instantly launch Google Maps with pre-routed driving directions." }
                ].map((feature, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs shrink-0 mt-0.5">✓</span>
                    <div>
                      <h4 className="font-bold text-rose-950 text-sm">{feature.title}</h4>
                      <p className="text-xs text-rose-700 mt-0.5">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <Link
                href={`${BASE}/centres?view=map`}
                className="inline-flex items-center justify-center gap-2 bg-rose-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-rose-700 transition-colors shadow-sm text-sm"
              >
                <Map className="w-4 h-4" />
                Launch Fullscreen Map Explorer
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="relative group rounded-xl overflow-hidden border border-rose-100 bg-rose-50/50">
              <div ref={mapRef} className="w-full h-80 sm:h-96 z-10" />
              
              {/* Expand map floating action */}
              <Link 
                href={`${BASE}/centres?view=map`} 
                className="absolute top-14 sm:top-3 right-3 z-[1000] bg-white/95 backdrop-blur text-rose-700 hover:text-white hover:bg-rose-600 font-bold px-3 py-1.5 rounded-lg shadow-md border border-rose-100 text-xs flex items-center gap-1.5 transition-all opacity-90 group-hover:opacity-100"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Expand View
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: stats?.totalOscs.toLocaleString() ?? "—", label: "Centres Listed", icon: MapPin },
            { value: stats?.totalStates.toLocaleString() ?? "—", label: "States & UTs", icon: Shield },
            { value: stats?.totalDistricts.toLocaleString() ?? "—", label: "Districts", icon: Users },
            { value: "181", label: "Free Helpline", icon: Phone },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-5 text-center border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
              <stat.icon className="w-6 h-6 text-rose-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-rose-800">{stat.value}</div>
              <div className="text-sm text-rose-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* What is a Sakhi Kendra */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-rose-900 mb-8 text-center">What is a Sakhi Kendra?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: "🏥", title: "Medical Help", desc: "Emergency medical care and forensic examination, all free of cost." },
            { icon: "⚖️", title: "Legal Aid", desc: "Free legal advice, assistance with FIR registration and court matters." },
            { icon: "🏠", title: "Temporary Shelter", desc: "Safe accommodation for up to 5 days for women in crisis." },
            { icon: "💬", title: "Counselling", desc: "Psychological first aid and ongoing counselling support." },
            { icon: "🚔", title: "Police Assistance", desc: "Help with filing complaints and police liaison." },
            { icon: "📋", title: "Case Management", desc: "Referral to other government welfare schemes and follow-up." },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-2xl p-6 border border-rose-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-bold text-rose-900 mb-1">{item.title}</h3>
              <p className="text-sm text-rose-700/80 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Emergency CTA */}
      <section className="bg-rose-700 text-white py-12">
        <div className="max-w-3xl mx-auto text-center px-4">
          <div className="text-5xl font-black mb-2">181</div>
          <p className="text-rose-200 text-lg mb-4">Women Helpline — Free, 24 hours, 7 days</p>
          <a href="tel:181" className="inline-flex items-center gap-2 bg-white text-rose-700 font-bold px-8 py-3 rounded-full text-lg hover:bg-rose-50 transition-colors shadow-lg">
            <Phone className="w-5 h-5" />
            Call 181 Now
          </a>
          <p className="text-rose-300 text-sm mt-4">Also call 112 (Emergency) or 1091 (Women Safety)</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-rose-900 text-rose-200 py-8 text-center text-sm px-4">
        <p className="mb-1">SakhiSahay — Helping women find One Stop Centres across India</p>
        <p className="text-rose-400 text-xs">Data sourced from Ministry of Women & Child Development, Government of India. Not an official government website.</p>
        <div className="flex justify-center gap-6 mt-4">
          <Link href={`${BASE}/centres`} className="hover:text-white transition-colors">Find Centres</Link>
          <Link href={`${BASE}/centres?view=states`} className="hover:text-white transition-colors">By State</Link>
          <a href="tel:181" className="hover:text-white transition-colors">Helpline 181</a>
        </div>
      </footer>
    </div>
  );
}
