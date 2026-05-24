import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Phone, MapPin, Search, ChevronRight, Heart, Shield, Users } from "lucide-react";
import { getOscStats, type OscStatsResponse } from "@/lib/local-api";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Home() {
  const { data: stats } = useQuery<OscStatsResponse>({
    queryKey: ["osc-stats"],
    queryFn: getOscStats,
  });

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
            <Link href={`${BASE}/centres`} className="text-sm font-medium text-orange-800 hover:text-orange-600 transition-colors hidden sm:block">Find Centres</Link>
            <Link href={`${BASE}/states`} className="text-sm font-medium text-orange-800 hover:text-orange-600 transition-colors hidden sm:block">By State</Link>
            <Link href={`${BASE}/map`} className="text-sm font-medium text-orange-800 hover:text-orange-600 transition-colors hidden sm:block">Map</Link>
            <a href="tel:181" className="flex items-center gap-1.5 bg-rose-600 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-rose-700 transition-colors shadow-sm">
              <Phone className="w-3.5 h-3.5" />
              181
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 text-white">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "60px 60px"}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            {/* 181 badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-4 py-2 mb-6">
              <Phone className="w-4 h-4" />
              <span className="font-bold text-lg">181</span>
              <span className="text-white/80 text-sm">— Free helpline, 24×7</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4">
              Sakhi Kendras —<br />
              <span className="text-amber-200">Safe spaces near you</span>
            </h1>
            <p className="text-lg sm:text-xl text-orange-100 mb-8 max-w-xl">
              Find One Stop Centres (OSCs) across India that provide free medical, legal, police, shelter and counselling support to women in distress.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href={`${BASE}/centres`} className="inline-flex items-center justify-center gap-2 bg-white text-orange-700 font-bold px-6 py-3.5 rounded-xl hover:bg-orange-50 transition-colors shadow-md text-base">
                <Search className="w-4 h-4" />
                Find a Centre Near You
              </Link>
              <Link href={`${BASE}/states`} className="inline-flex items-center justify-center gap-2 bg-white/20 backdrop-blur text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-white/30 transition-colors border border-white/30 text-base">
                <MapPin className="w-4 h-4" />
                Browse by State
              </Link>
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="hsl(36,100%,97%)" />
          </svg>
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
            <div key={stat.label} className="bg-white rounded-2xl p-5 text-center border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
              <stat.icon className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-orange-800">{stat.value}</div>
              <div className="text-sm text-orange-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* What is a Sakhi Kendra */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-orange-900 mb-8 text-center">What is a Sakhi Kendra?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: "🏥", title: "Medical Help", desc: "Emergency medical care and forensic examination, all free of cost." },
            { icon: "⚖️", title: "Legal Aid", desc: "Free legal advice, assistance with FIR registration and court matters." },
            { icon: "🏠", title: "Temporary Shelter", desc: "Safe accommodation for up to 5 days for women in crisis." },
            { icon: "💬", title: "Counselling", desc: "Psychological first aid and ongoing counselling support." },
            { icon: "🚔", title: "Police Assistance", desc: "Help with filing complaints and police liaison." },
            { icon: "📋", title: "Case Management", desc: "Referral to other government welfare schemes and follow-up." },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-bold text-orange-900 mb-1">{item.title}</h3>
              <p className="text-sm text-orange-700/80 leading-relaxed">{item.desc}</p>
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
      <footer className="bg-orange-900 text-orange-200 py-8 text-center text-sm px-4">
        <p className="mb-1">SakhiSahay — Helping women find One Stop Centres across India</p>
        <p className="text-orange-400 text-xs">Data sourced from Ministry of Women & Child Development, Government of India. Not an official government website.</p>
        <div className="flex justify-center gap-6 mt-4">
          <Link href={`${BASE}/centres`} className="hover:text-white transition-colors">Find Centres</Link>
          <Link href={`${BASE}/states`} className="hover:text-white transition-colors">By State</Link>
          <a href="tel:181" className="hover:text-white transition-colors">Helpline 181</a>
        </div>
      </footer>
    </div>
  );
}
