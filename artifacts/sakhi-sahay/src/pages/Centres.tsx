import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "wouter";
import { Search, MapPin, Phone, ArrowLeft, Heart, X, Loader2, Map as MapIcon, List, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getDistricts, getOscs, getStates, getMapOscs, type OscsResponse, type StatesResponse, type MapResponse } from "@/lib/local-api";
import { googleMapsDirectionsUrl } from "@/lib/geo";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// Leaflet default icon fix
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function Centres() {
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );

  const viewParam = params.get("view");
  const stateParam = params.get("state") || "";

  const [search, setSearch] = useState(params.get("q") || "");
  const [state, setState] = useState(stateParam);
  const [district, setDistrict] = useState(params.get("district") || "");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  const [activeTab, setActiveTab] = useState<"explorer" | "states">(
    viewParam === "states" ? "states" : "explorer"
  );
  const [mobileView, setMobileView] = useState<"list" | "map">(
    viewParam === "map" ? "map" : "list"
  );
  
  const [selectedOsc, setSelectedOsc] = useState<any>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const listScrollRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, state, district]);

  // Reset scroll of list when page changes
  useEffect(() => {
    if (listScrollRef.current) {
      listScrollRef.current.scrollTop = 0;
    }
  }, [page]);

  const queryParams = new URLSearchParams();
  if (debouncedSearch) queryParams.set("q", debouncedSearch);
  if (state) queryParams.set("state", state);
  if (district) queryParams.set("district", district);
  queryParams.set("page", String(page));
  queryParams.set("limit", "15");

  // Fetch paginated centers
  const { data: listData, isLoading: isLoadingList } = useQuery<OscsResponse>({
    queryKey: ["oscs", queryParams.toString()],
    queryFn: () => getOscs({ q: debouncedSearch, state, district, page, limit: 15 }),
  });

  // Fetch states and counts
  const { data: statesData } = useQuery<StatesResponse>({
    queryKey: ["states"],
    queryFn: getStates,
  });

  // Fetch districts for selected state
  const { data: districtsData } = useQuery({
    queryKey: ["districts", state],
    queryFn: () => getDistricts(state),
    enabled: !!state,
  });

  // Fetch all coordinates for map based on selected state
  const { data: mapData, isLoading: isLoadingMap } = useQuery<MapResponse>({
    queryKey: ["oscs-map-explore", state],
    queryFn: () => getMapOscs(state),
  });

  // Filter map data locally by search & district
  const filteredMapOscs = useMemo(() => {
    if (!mapData?.data) return [];
    let items = mapData.data;
    if (district) {
      items = items.filter(osc => osc.district.toLowerCase() === district.toLowerCase());
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      items = items.filter(osc => 
        osc.state.toLowerCase().includes(q) ||
        osc.district.toLowerCase().includes(q) ||
        osc.name.toLowerCase().includes(q) ||
        osc.address.toLowerCase().includes(q)
      );
    }
    return items;
  }, [mapData, district, debouncedSearch]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setState("");
    setDistrict("");
    setSelectedOsc(null);
  }, []);

  const selectStateFromGrid = (stateName: string) => {
    setState(stateName);
    setDistrict("");
    setActiveTab("explorer");
  };

  const hasFilters = search || state || district;

  // Initialize Map
  useEffect(() => {
    if (activeTab !== "explorer" || !mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        center: [22.5, 82.0],
        zoom: 5,
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
  }, [activeTab]);

  // Adjust size when tab or mobile toggle switches
  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => {
        mapInstance.current?.invalidateSize();
      }, 150);
    }
  }, [mobileView, activeTab]);

  // Add map markers and handle fits
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || activeTab !== "explorer") return;

    // Clear existing markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (!filteredMapOscs.length) return;

    const newMarkers: L.Marker[] = [];

    for (const osc of filteredMapOscs) {
      const marker = L.marker([osc.lat, osc.lon], { icon: markerIcon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:sans-serif;min-width:150px;line-height:1.4">
            <div style="font-weight:700;color:#9a3412;margin-bottom:2px">${osc.district}</div>
            <div style="font-size:11px;color:#78350f;margin-bottom:3px">${osc.state}</div>
            ${osc.name ? `<div style="font-size:11px;color:#92400e;margin-bottom:4px">👤 ${osc.name}</div>` : ""}
            <a href="${BASE}/centres/${osc.id}" style="font-size:11px;color:#ea580c;font-weight:600;text-decoration:none">View Details →</a>
          </div>`,
          { maxWidth: 220 }
        )
        .on("click", () => {
          setSelectedOsc(osc);
        });
      newMarkers.push(marker);
    }

    markersRef.current = newMarkers;

    // Smart pan/bounds fitting
    if (filteredMapOscs.length > 0) {
      const bounds = L.latLngBounds(filteredMapOscs.map(o => [o.lat, o.lon] as L.LatLngTuple));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [filteredMapOscs, activeTab]);

  const handleCardClick = (osc: any) => {
    setSelectedOsc(osc);
    setMobileView("map");
    const map = mapInstance.current;
    if (map && osc.lat && osc.lon) {
      map.setView([osc.lat, osc.lon], 13);
      // Find matching marker and open popup
      const marker = markersRef.current.find(m => {
        const latLng = m.getLatLng();
        return latLng.lat === osc.lat && latLng.lng === osc.lon;
      });
      if (marker) {
        marker.openPopup();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(350,100%,98%)] flex flex-col h-screen overflow-hidden">
      {/* Navbar */}
      <nav className="sticky top-0 z-[1000] bg-white/95 backdrop-blur border-b border-rose-100 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href={`${BASE}/`} className="flex items-center gap-2 font-bold text-rose-700 text-lg">
            <Heart className="w-5 h-5 text-rose-600 fill-rose-600" />
            SakhiSahay
          </Link>
          <div className="flex items-center gap-4">
            <Link href={`${BASE}/help-finder`} className="text-sm font-medium text-rose-800 hover:text-rose-600 transition-colors hidden sm:block">Help Finder</Link>
            <a href="tel:181" className="flex items-center gap-1.5 bg-rose-600 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-rose-700 transition-colors shadow-sm">
              <Phone className="w-3.5 h-3.5" />
              181
            </a>
          </div>
        </div>
      </nav>

      {/* Explorer Subheader */}
      <div className="border-b border-rose-100 bg-white px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm shrink-0 z-10">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <Link href={`${BASE}/`} className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-rose-100 text-rose-600 hover:bg-rose-50 transition-all shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-rose-900 leading-none">OSC Directory</h1>
              <p className="text-rose-500 text-xs mt-1 font-medium">
                {activeTab === "states"
                  ? `${statesData?.states.length || 0} States & UTs Listed`
                  : `${filteredMapOscs.length} Mapped centres`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="bg-rose-50 p-0.5 rounded-xl flex items-center border border-rose-100/50 w-full sm:w-auto justify-center">
          <button
            onClick={() => { setActiveTab("explorer"); setSelectedOsc(null); }}
            className={`flex-1 sm:flex-initial text-center px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "explorer"
                ? "bg-white text-rose-700 shadow-sm"
                : "text-rose-600 hover:text-rose-800"
            }`}
          >
            Explorer View
          </button>
          <button
            onClick={() => setActiveTab("states")}
            className={`flex-1 sm:flex-initial text-center px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "states"
                ? "bg-white text-rose-700 shadow-sm"
                : "text-rose-600 hover:text-rose-800"
            }`}
          >
            By State
          </button>
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "states" ? (
          /* ==================== BY STATE VIEW ==================== */
          <div className="w-full h-full overflow-y-auto bg-[hsl(350,100%,98%)] py-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                {statesData?.states.map((s) => (
                  <button
                    key={s.state}
                    onClick={() => selectStateFromGrid(s.state)}
                    className="bg-white text-left rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-300 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-rose-900 group-hover:text-rose-700 transition-colors">{s.state}</div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-rose-500 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        {s.count} {s.count === 1 ? "centre" : "centres"}
                      </div>
                    </div>
                    <div className="bg-rose-50 text-rose-700 font-bold text-sm w-9 h-9 rounded-xl flex items-center justify-center group-hover:bg-rose-100 transition-colors shrink-0">
                      {s.count}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ==================== SPLIT EXPLORER VIEW ==================== */
          <div className="flex w-full h-full relative">
            {/* Left side: Directory filters & list cards */}
            <div className={`w-full lg:w-[45%] xl:w-[40%] flex flex-col h-full bg-white border-r border-rose-100 shrink-0 ${
              mobileView === "map" ? "hidden lg:flex" : "flex"
            }`}>
              {/* Internal Filters Block */}
              <div className="p-4 border-b border-rose-100 space-y-3 bg-white shrink-0">
                {/* Text Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                  <input
                    type="search"
                    placeholder="Search by district, address, or coordinator…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-rose-200 rounded-xl text-sm focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 bg-[hsl(350,100%,99%)] transition-all"
                  />
                </div>

                {/* Dropdowns */}
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={state}
                    onChange={e => { setState(e.target.value); setDistrict(""); setSelectedOsc(null); }}
                    className={`border border-rose-200 rounded-xl px-2.5 py-2 text-xs text-rose-900 focus:outline-none focus:border-rose-500 bg-[hsl(350,100%,99%)] cursor-pointer ${
                      state ? "col-span-1" : "col-span-2"
                    }`}
                  >
                    <option value="">All States & UTs</option>
                    {statesData?.states.map(s => (
                      <option key={s.state} value={s.state}>{s.state}</option>
                    ))}
                  </select>

                  {state && (
                    <select
                      value={district}
                      onChange={e => { setDistrict(e.target.value); setSelectedOsc(null); }}
                      className="col-span-1 border border-rose-200 rounded-xl px-2.5 py-2 text-xs text-rose-900 focus:outline-none focus:border-rose-500 bg-[hsl(350,100%,99%)] cursor-pointer"
                    >
                      <option value="">All Districts</option>
                      {(districtsData as any)?.districts?.map((d: any) => (
                        <option key={d.district} value={d.district}>{d.district}</option>
                      ))}
                    </select>
                  )}

                  {hasFilters && (
                    <button
                      onClick={clearFilters}
                      className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors w-full"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reset all filters
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable list of cards */}
              <div ref={listScrollRef} className="flex-1 overflow-y-auto p-4 bg-[hsl(350,100%,99%)] space-y-3">
                {isLoadingList ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-rose-100 animate-pulse h-28" />
                  ))
                ) : listData?.data.length === 0 ? (
                  <div className="text-center py-14 text-rose-400">
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="font-semibold text-sm">No centers match filters</p>
                    <p className="text-xs mt-1">Try resetting or editing your options</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {listData?.data.map((osc) => (
                        <button
                          key={osc.id}
                          onClick={() => handleCardClick(osc)}
                          className="w-full text-left bg-white rounded-2xl p-4 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-300 transition-all group block relative"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="inline-block text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">
                              {osc.state}
                            </span>
                            <span className="text-[10px] text-rose-300 font-mono">#{osc.id}</span>
                          </div>

                          <h3 className="font-bold text-rose-950 text-sm leading-tight mb-2 group-hover:text-rose-600 transition-colors flex items-center justify-between">
                            <span>{osc.district}</span>
                            <ChevronRight className="w-4 h-4 text-rose-300 group-hover:text-rose-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                          </h3>

                          {osc.name && (
                            <p className="text-xs text-rose-700 mb-1.5 flex items-center gap-1.5">
                              <span className="text-xs leading-none">👤</span>
                              <span className="truncate">{osc.name}</span>
                            </p>
                          )}

                          {osc.address && (
                            <p className="text-[11px] text-rose-500 line-clamp-2 flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-300" />
                              <span className="leading-snug">{osc.address}</span>
                            </p>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Pagination */}
                    {listData && listData.totalPages > 1 && (
                      <div className="flex items-center justify-center gap-1.5 pt-4 pb-2 flex-wrap">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Prev
                        </button>
                        {Array.from({ length: Math.min(5, listData.totalPages) }, (_, i) => {
                          const p = page <= 3 ? i + 1 : page + i - 2;
                          if (p < 1 || p > listData.totalPages) return null;
                          return (
                            <button
                              key={p}
                              onClick={() => setPage(p)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                                p === page
                                  ? "bg-rose-600 text-white"
                                  : "border border-rose-200 text-rose-700 hover:bg-rose-50"
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setPage(p => Math.min(listData.totalPages, p + 1))}
                          disabled={page === listData.totalPages}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right side: Leaflet Map */}
            <div className={`w-full lg:w-[55%] xl:w-[60%] h-full relative ${
              mobileView === "list" ? "hidden lg:block" : "block"
            }`}>
              {isLoadingMap && (
                <div className="absolute inset-0 z-[1000] bg-rose-50/60 flex items-center justify-center pointer-events-none">
                  <div className="flex items-center gap-2 text-rose-600 bg-white/95 rounded-xl px-4 py-2.5 shadow border border-rose-100">
                    <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                    <span className="text-xs font-bold">Filtering Map Pins…</span>
                  </div>
                </div>
              )}
              <div ref={mapRef} className="w-full h-full z-10" />

              {/* Floating detail popup on map for active OSC (Split screen styled) */}
              {selectedOsc && (
                <div className="absolute bottom-4 left-4 right-4 lg:relative lg:bottom-auto lg:left-auto lg:right-auto lg:w-80 bg-white rounded-2xl lg:rounded-none shadow-2xl lg:shadow-none border border-rose-100 lg:border-l lg:border-t-0 overflow-hidden lg:overflow-y-auto shrink-0 z-[1000] flex flex-col max-h-[42%] lg:max-h-none lg:h-full lg:absolute lg:top-0 lg:right-0">
                  <div className="p-4 bg-gradient-to-br from-rose-600 via-rose-500 to-red-500 text-white flex items-center justify-between shrink-0">
                    <div className="min-w-0">
                      <span className="text-[9px] font-extrabold bg-white/25 px-2 py-0.5 rounded-full uppercase">{selectedOsc.state}</span>
                      <h2 className="text-base font-black mt-1 leading-tight truncate">{selectedOsc.district}</h2>
                    </div>
                    <button
                      onClick={() => setSelectedOsc(null)}
                      className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center font-bold text-white transition-all text-xs shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-4 space-y-3.5 overflow-y-auto flex-1 text-rose-950">
                    {selectedOsc.name && (
                      <div>
                        <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">Administrator</div>
                        <div className="text-sm font-semibold">{selectedOsc.name}</div>
                      </div>
                    )}
                    {selectedOsc.address && (
                      <div>
                        <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">Address</div>
                        <div className="text-xs text-rose-700 leading-relaxed font-medium">{selectedOsc.address}</div>
                      </div>
                    )}
                    {selectedOsc.email && (
                      <div>
                        <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">Email</div>
                        <a href={`mailto:${selectedOsc.email.toLowerCase()}`} className="text-xs text-rose-600 hover:text-rose-800 break-all font-medium">{selectedOsc.email.toLowerCase()}</a>
                      </div>
                    )}
                    <div className="pt-2 grid grid-cols-2 gap-2">
                      <Link
                        href={`${BASE}/centres/${selectedOsc.id}`}
                        className="block text-center bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
                      >
                        View details
                      </Link>
                      <a
                        href={googleMapsDirectionsUrl({ lat: selectedOsc.lat, lon: selectedOsc.lon })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold py-2.5 rounded-xl transition-colors"
                      >
                        Directions
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile layout toggle float button */}
            {(!selectedOsc || mobileView === "list") && (
              <button
                onClick={() => setMobileView(v => v === "list" ? "map" : "list")}
                className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[2000] bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 transition-all border border-rose-500"
              >
                {mobileView === "list" ? <MapIcon className="w-4 h-4" /> : <List className="w-4 h-4" />}
                {mobileView === "list" ? "Show Map" : "Show List"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
