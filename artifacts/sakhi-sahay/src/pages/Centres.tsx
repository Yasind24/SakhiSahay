import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Search, MapPin, Phone, ArrowLeft, Heart, X, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDistricts, getOscs, getStates, type OscsResponse, type StatesResponse } from "@/lib/local-api";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Centres() {
  const [location] = useLocation();
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );

  const [search, setSearch] = useState(params.get("q") || "");
  const [state, setState] = useState(params.get("state") || "");
  const [district, setDistrict] = useState(params.get("district") || "");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, state, district]);

  const queryParams = new URLSearchParams();
  if (debouncedSearch) queryParams.set("q", debouncedSearch);
  if (state) queryParams.set("state", state);
  if (district) queryParams.set("district", district);
  queryParams.set("page", String(page));
  queryParams.set("limit", "24");

  const { data, isLoading } = useQuery<OscsResponse>({
    queryKey: ["oscs", queryParams.toString()],
    queryFn: () => getOscs({ q: debouncedSearch, state, district, page, limit: 24 }),
  });

  const { data: statesData } = useQuery<StatesResponse>({
    queryKey: ["states"],
    queryFn: getStates,
  });

  const { data: districtsData } = useQuery({
    queryKey: ["districts", state],
    queryFn: () => getDistricts(state),
    enabled: !!state,
  });

  const clearFilters = useCallback(() => {
    setSearch(""); setState(""); setDistrict("");
  }, []);

  const hasFilters = search || state || district;

  return (
    <div className="min-h-screen bg-[hsl(36,100%,97%)]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-orange-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href={`${BASE}/`} className="flex items-center gap-2 font-bold text-orange-700 text-lg">
            <Heart className="w-5 h-5 text-rose-600 fill-rose-600" />
            SakhiSahay
          </Link>
          <div className="flex items-center gap-4">
            <Link href={`${BASE}/states`} className="text-sm font-medium text-orange-800 hover:text-orange-600 transition-colors hidden sm:block">By State</Link>
            <a href="tel:181" className="flex items-center gap-1.5 bg-rose-600 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-rose-700 transition-colors shadow-sm">
              <Phone className="w-3.5 h-3.5" />
              181
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={`${BASE}/`} className="inline-flex items-center gap-1.5 text-orange-600 hover:text-orange-800 text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-orange-900 mb-1">Find a Centre</h1>
          <p className="text-orange-700 text-sm">
            {data ? `${data.total.toLocaleString()} centres found` : "Searching One Stop Centres"}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4 mb-6 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
            <input
              type="search"
              placeholder="Search by district, city, or administrator name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-orange-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-[hsl(36,100%,99%)] transition-all"
            />
          </div>

          {/* State + District */}
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={state}
              onChange={e => { setState(e.target.value); setDistrict(""); }}
              className="flex-1 border border-orange-200 rounded-xl px-3 py-2.5 text-sm text-orange-900 focus:outline-none focus:border-orange-500 bg-[hsl(36,100%,99%)] cursor-pointer"
            >
              <option value="">All States & UTs</option>
              {statesData?.states.map(s => (
                <option key={s.state} value={s.state}>{s.state} ({s.count})</option>
              ))}
            </select>

            {state && (
              <select
                value={district}
                onChange={e => setDistrict(e.target.value)}
                className="flex-1 border border-orange-200 rounded-xl px-3 py-2.5 text-sm text-orange-900 focus:outline-none focus:border-orange-500 bg-[hsl(36,100%,99%)] cursor-pointer"
              >
                <option value="">All Districts</option>
                {(districtsData as any)?.districts?.map((d: any) => (
                  <option key={d.district} value={d.district}>{d.district} ({d.count})</option>
                ))}
              </select>
            )}

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-orange-600 border border-orange-200 rounded-xl hover:bg-orange-50 transition-colors whitespace-nowrap"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-orange-100 animate-pulse h-36" />
            ))}
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-center py-20 text-orange-400">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No centres found</p>
            <p className="text-sm mt-1">Try a different search term or state</p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {data?.data.map((osc) => (
                <Link
                  key={osc.id}
                  href={`${BASE}/centres/${osc.id}`}
                  className="bg-white rounded-2xl p-5 border border-orange-100 shadow-sm hover:shadow-md hover:border-orange-300 transition-all group block"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <span className="inline-block text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full mb-1.5">
                        {osc.state}
                      </span>
                      <h3 className="font-bold text-orange-900 text-base leading-snug group-hover:text-orange-700 transition-colors">
                        {osc.district}
                      </h3>
                    </div>
                    <span className="text-xs text-orange-300 font-mono ml-2 mt-1">#{osc.id}</span>
                  </div>

                  {osc.name && (
                    <p className="text-sm text-orange-700 mb-2 flex items-center gap-1.5">
                      <span className="w-4 h-4 inline-flex items-center justify-center text-orange-400 shrink-0">👤</span>
                      <span className="truncate">{osc.name}</span>
                    </p>
                  )}

                  {osc.address && (
                    <p className="text-xs text-orange-500 line-clamp-2 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-orange-400" />
                      {osc.address}
                    </p>
                  )}

                  <div className="mt-3 pt-3 border-t border-orange-50 flex items-center justify-between">
                    <span className="text-xs text-orange-400 truncate">{osc.email}</span>
                    <span className="text-orange-500 group-hover:text-orange-700 transition-colors text-xs font-medium">Details →</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-xl border border-orange-200 text-sm font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(7, data.totalPages) }, (_, i) => {
                  const p = page <= 4 ? i + 1 : page + i - 3;
                  if (p < 1 || p > data.totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                        p === page
                          ? "bg-orange-600 text-white"
                          : "border border-orange-200 text-orange-700 hover:bg-orange-50"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="px-4 py-2 rounded-xl border border-orange-200 text-sm font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
