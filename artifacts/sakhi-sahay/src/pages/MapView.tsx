import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Heart, Phone, MapPin, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = `${BASE}/api`;

// Fix broken marker icons in bundler environments
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface OscMapEntry {
  id: number;
  state: string;
  district: string;
  name: string;
  email: string;
  address: string;
  lat: number;
  lon: number;
}

interface StatesResponse {
  states: Array<{ state: string; count: number }>;
}

export default function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [selectedState, setSelectedState] = useState("");
  const [selected, setSelected] = useState<OscMapEntry | null>(null);

  const { data: statesData } = useQuery<StatesResponse>({
    queryKey: ["states"],
    queryFn: () => fetch(`${API_BASE}/oscs/states`).then(r => r.json()),
  });

  const { data, isLoading } = useQuery<{ data: OscMapEntry[]; total: number }>({
    queryKey: ["oscs-map", selectedState],
    queryFn: () =>
      fetch(`${API_BASE}/oscs/map${selectedState ? `?state=${encodeURIComponent(selectedState)}` : ""}`).then(r => r.json()),
  });

  const oscs = data?.data ?? [];

  useEffect(() => {
    if (!mapRef.current) return;

    // Create map only once
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        center: [22.5, 82.0],
        zoom: 5,
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

  // Add/replace markers when OSC data changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    if (!oscs.length) return;

    for (const osc of oscs) {
      L.marker([osc.lat, osc.lon], { icon: markerIcon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:sans-serif;min-width:160px;line-height:1.4">
            <div style="font-weight:700;color:#9a3412;margin-bottom:3px">${osc.district}</div>
            <div style="font-size:12px;color:#78350f;margin-bottom:3px">${osc.state}</div>
            ${osc.name ? `<div style="font-size:12px;color:#92400e;margin-bottom:5px">👤 ${osc.name}</div>` : ""}
            <a href="${BASE}/centres/${osc.id}" style="font-size:12px;color:#ea580c;font-weight:600;text-decoration:none">View Details →</a>
          </div>`,
          { maxWidth: 220 }
        )
        .on("click", () => setSelected(osc));
    }

    // Fit to markers if filtered by state
    if (selectedState && oscs.length > 0) {
      const bounds = L.latLngBounds(oscs.map(o => [o.lat, o.lon] as L.LatLngTuple));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [oscs, selectedState]);

  return (
    <div className="min-h-screen bg-[hsl(36,100%,97%)] flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-[1000] bg-white/95 backdrop-blur border-b border-orange-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href={`${BASE}/`} className="flex items-center gap-2 font-bold text-orange-700 text-lg">
            <Heart className="w-5 h-5 text-rose-600 fill-rose-600" />
            SakhiSahay
          </Link>
          <div className="flex items-center gap-4">
            <Link href={`${BASE}/centres`} className="text-sm font-medium text-orange-800 hover:text-orange-600 transition-colors hidden sm:block">Find Centres</Link>
            <Link href={`${BASE}/states`} className="text-sm font-medium text-orange-800 hover:text-orange-600 transition-colors hidden sm:block">By State</Link>
            <a href="tel:181" className="flex items-center gap-1.5 bg-rose-600 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-rose-700 transition-colors shadow-sm">
              <Phone className="w-3.5 h-3.5" />
              181
            </a>
          </div>
        </div>
      </nav>

      {/* Controls bar */}
      <div className="bg-white border-b border-orange-100 px-4 py-3 flex items-center gap-4 flex-wrap z-10">
        <Link href={`${BASE}/`} className="inline-flex items-center gap-1.5 text-orange-600 hover:text-orange-800 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
          <span className="text-sm font-semibold text-orange-900">OSC Map</span>
          <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
            {isLoading ? "loading…" : oscs.length === 0 ? "coordinates loading — check back soon" : `${oscs.length} centres mapped`}
          </span>
        </div>
        <select
          value={selectedState}
          onChange={e => { setSelectedState(e.target.value); setSelected(null); }}
          className="border border-orange-200 rounded-xl px-3 py-1.5 text-sm text-orange-900 focus:outline-none focus:border-orange-500 bg-white cursor-pointer"
        >
          <option value="">All States</option>
          {statesData?.states.map(s => (
            <option key={s.state} value={s.state}>{s.state}</option>
          ))}
        </select>
      </div>

      {/* Map + sidebar */}
      <div className="flex flex-1" style={{ height: "calc(100vh - 113px)" }}>
        <div className="relative flex-1">
          {isLoading && (
            <div className="absolute inset-0 z-10 bg-orange-50/80 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 text-orange-600 bg-white/90 rounded-xl px-4 py-2 shadow">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Loading map…</span>
              </div>
            </div>
          )}
          {!isLoading && oscs.length === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <div className="text-center bg-white/90 rounded-2xl shadow-lg p-8 max-w-sm mx-4">
                <MapPin className="w-10 h-10 mx-auto mb-3 text-orange-300" />
                <p className="font-semibold text-orange-800 mb-1">Geocoding in progress</p>
                <p className="text-sm text-orange-500 leading-relaxed">
                  Location coordinates for all 679 districts are being generated using OpenStreetMap.
                  This takes ~12 minutes. Please check back soon.
                </p>
              </div>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* Selected centre panel */}
        {selected && (
          <div className="w-72 bg-white border-l border-orange-100 overflow-y-auto shrink-0 z-10">
            <div className="p-4 bg-gradient-to-br from-orange-500 to-amber-400 text-white">
              <button onClick={() => setSelected(null)} className="text-white/70 hover:text-white text-xs mb-2 block">← Close</button>
              <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">{selected.state}</span>
              <h2 className="text-lg font-bold mt-2">{selected.district}</h2>
              <p className="text-orange-100 text-xs">One Stop Centre (Sakhi Kendra)</p>
            </div>
            <div className="p-4 space-y-4">
              {selected.name && (
                <div>
                  <div className="text-xs font-semibold text-orange-400 uppercase tracking-wide mb-1">Administrator</div>
                  <div className="text-sm text-orange-900 font-medium">{selected.name}</div>
                </div>
              )}
              {selected.address && (
                <div>
                  <div className="text-xs font-semibold text-orange-400 uppercase tracking-wide mb-1">Address</div>
                  <div className="text-sm text-orange-700 leading-relaxed">{selected.address}</div>
                </div>
              )}
              {selected.email && (
                <div>
                  <div className="text-xs font-semibold text-orange-400 uppercase tracking-wide mb-1">Email</div>
                  <a href={`mailto:${selected.email}`} className="text-sm text-orange-600 hover:text-orange-800 break-all">{selected.email}</a>
                </div>
              )}
              <div className="pt-2 space-y-2">
                <Link
                  href={`${BASE}/centres/${selected.id}`}
                  className="block text-center bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-orange-700 transition-colors"
                >
                  View Full Details
                </Link>
                <a
                  href="tel:181"
                  className="block text-center bg-rose-50 border border-rose-200 rounded-xl py-2.5 hover:bg-rose-100 transition-colors"
                >
                  <span className="text-rose-700 font-black text-xl">181</span>
                  <span className="text-rose-500 text-xs block">Women Helpline</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
