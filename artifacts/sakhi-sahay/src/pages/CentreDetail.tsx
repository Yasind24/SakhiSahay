import { Link } from "wouter";
import { ArrowLeft, MapPin, Mail, Phone, User, Heart, ExternalLink, Copy, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = `${BASE}/api`;

interface OscEntry {
  id: number;
  state: string;
  district: string;
  name: string;
  email: string;
  address: string;
}

interface Props {
  params: { id: string };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} className="p-1.5 rounded-lg text-orange-400 hover:text-orange-700 hover:bg-orange-50 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function CentreDetail({ params }: Props) {
  const { data: osc, isLoading, error } = useQuery<OscEntry>({
    queryKey: ["osc", params.id],
    queryFn: () => fetch(`${API_BASE}/oscs/${params.id}`).then(r => {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[hsl(36,100%,97%)] flex items-center justify-center">
        <div className="text-orange-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error || !osc) {
    return (
      <div className="min-h-screen bg-[hsl(36,100%,97%)] flex flex-col items-center justify-center gap-4">
        <div className="text-orange-800 font-semibold">Centre not found</div>
        <Link href={`${BASE}/centres`} className="text-orange-600 hover:underline text-sm">← Back to search</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(36,100%,97%)]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-orange-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href={`${BASE}/`} className="flex items-center gap-2 font-bold text-orange-700 text-lg">
            <Heart className="w-5 h-5 text-rose-600 fill-rose-600" />
            SakhiSahay
          </Link>
          <a href="tel:181" className="flex items-center gap-1.5 bg-rose-600 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-rose-700 transition-colors shadow-sm">
            <Phone className="w-3.5 h-3.5" />
            181
          </a>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={`${BASE}/centres`} className="inline-flex items-center gap-1.5 text-orange-600 hover:text-orange-800 text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Search
        </Link>

        {/* Header Card */}
        <div className="bg-gradient-to-br from-orange-600 to-amber-500 rounded-2xl p-6 text-white mb-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-block text-xs font-semibold bg-white/20 backdrop-blur px-3 py-1 rounded-full mb-3">
                {osc.state}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                {osc.district} District
              </h1>
              <p className="text-orange-100 text-sm">One Stop Centre (Sakhi Kendra) #{osc.id}</p>
            </div>
            <MapPin className="w-8 h-8 text-white/40 shrink-0 mt-1" />
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm divide-y divide-orange-50 mb-6">
          {osc.name && (
            <div className="p-5 flex items-start gap-4">
              <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-orange-400 uppercase tracking-wide mb-1">Centre Administrator</div>
                <div className="text-orange-900 font-semibold">{osc.name}</div>
              </div>
            </div>
          )}

          {osc.address && (
            <div className="p-5 flex items-start gap-4">
              <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-orange-400 uppercase tracking-wide mb-1">Address</div>
                <div className="text-orange-900 leading-relaxed text-sm">{osc.address}</div>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(`${osc.district} One Stop Centre ${osc.state} India`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs text-orange-500 hover:text-orange-700 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Search on Maps
                </a>
              </div>
            </div>
          )}

          {osc.email && (
            <div className="p-5 flex items-start gap-4">
              <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-orange-400 uppercase tracking-wide mb-1">Email</div>
                <div className="flex items-center gap-2">
                  <a href={`mailto:${osc.email.toLowerCase()}`} className="text-orange-700 hover:text-orange-900 text-sm truncate transition-colors">
                    {osc.email.toLowerCase()}
                  </a>
                  <CopyButton text={osc.email.toLowerCase()} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Helplines */}
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 mb-6">
          <h2 className="font-bold text-rose-800 mb-4 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Emergency Helplines
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { num: "181", label: "Women Helpline" },
              { num: "112", label: "Emergency" },
              { num: "1091", label: "Women Safety" },
            ].map(h => (
              <a
                key={h.num}
                href={`tel:${h.num}`}
                className="bg-white rounded-xl p-3 text-center border border-rose-100 hover:border-rose-300 hover:shadow-md transition-all group"
              >
                <div className="text-xl font-black text-rose-700 group-hover:text-rose-800">{h.num}</div>
                <div className="text-xs text-rose-500 mt-0.5">{h.label}</div>
              </a>
            ))}
          </div>
        </div>

        {/* Browse More */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`${BASE}/centres?state=${encodeURIComponent(osc.state)}`}
            className="flex-1 text-center bg-orange-600 text-white font-semibold py-3 rounded-xl hover:bg-orange-700 transition-colors text-sm"
          >
            More centres in {osc.state}
          </Link>
          <Link
            href={`${BASE}/centres`}
            className="flex-1 text-center bg-white text-orange-700 font-semibold py-3 rounded-xl border border-orange-200 hover:bg-orange-50 transition-colors text-sm"
          >
            Search All Centres
          </Link>
        </div>
      </div>
    </div>
  );
}
