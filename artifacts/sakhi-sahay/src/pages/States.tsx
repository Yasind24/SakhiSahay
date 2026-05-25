import { Link } from "wouter";
import { ArrowLeft, MapPin, Phone, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getStates, type StatesResponse } from "@/lib/local-api";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function States() {
  const { data, isLoading } = useQuery<StatesResponse>({
    queryKey: ["states"],
    queryFn: getStates,
  });

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
            <a href="tel:181" className="flex items-center gap-1.5 bg-rose-600 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-rose-700 transition-colors shadow-sm">
              <Phone className="w-3.5 h-3.5" />
              181
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={`${BASE}/`} className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-800 text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-rose-900 mb-2">Centres by State</h1>
          <p className="text-rose-700">Browse One Stop Centres in your state</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-rose-100 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.states.map((s) => (
              <Link
                key={s.state}
                href={`${BASE}/centres?state=${encodeURIComponent(s.state)}`}
                className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-300 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="font-semibold text-rose-900 group-hover:text-rose-700 transition-colors">{s.state}</div>
                  <div className="flex items-center gap-1 mt-1 text-sm text-rose-500">
                    <MapPin className="w-3.5 h-3.5" />
                    {s.count} {s.count === 1 ? "centre" : "centres"}
                  </div>
                </div>
                <div className="bg-rose-50 text-rose-700 font-bold text-lg w-10 h-10 rounded-xl flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                  {s.count}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
