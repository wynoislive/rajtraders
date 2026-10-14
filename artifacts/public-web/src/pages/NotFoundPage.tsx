import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, Home, ShoppingBag, Search, Sparkles, Mail, Cake } from 'lucide-react';
import { SeoHead } from '../components/SeoHead';

interface NotFoundPageProps {
  shopSettings?: any;
  cartCount?: number;
}

export function NotFoundPage({ shopSettings = {}, cartCount = 0 }: NotFoundPageProps) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setLocation(`/?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const shopName = shopSettings.shopName || 'RAJ TRADERS';
  const supportEmail = shopSettings.supportEmail || shopSettings.contactEmail || 'support@sundarvan.xyz';

  return (
    <div className="min-h-screen bg-[#F7F2EA] text-[#0E3D42] font-sans flex flex-col justify-between">
      <SeoHead
        title={`404 Page Not Found — ${shopName}`}
        description="The page or delicacy you are looking for is unavailable or has moved."
        noIndex={true}
      />

      {/* Top Header */}
      <header className="bg-white border-b border-[#0E3D42]/10 sticky top-0 z-40 backdrop-blur-md bg-white/95 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/RAJTRADERS-LOGO.png"
              alt={shopName}
              className="size-10 object-contain rounded-xl border border-[#E2A93B]/30 shadow-sm"
            />
            <div>
              <span className="font-black text-lg tracking-tight text-[#0E3D42] block leading-none">{shopName}</span>
              <span className="text-[10px] font-bold text-[#E2A93B] tracking-wider uppercase">Artisanal Bakery & Cakes</span>
            </div>
          </Link>
          <Link
            href="/cart"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0E3D42]/5 hover:bg-[#0E3D42]/10 text-xs font-bold text-[#0E3D42] transition relative"
          >
            <ShoppingBag size={16} />
            <span className="hidden sm:inline">Bag</span>
            {cartCount > 0 && (
              <span className="size-5 rounded-full bg-[#E2A93B] text-[#0E3D42] text-[10px] font-black flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* 404 Hero Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center space-y-8 flex-1 flex flex-col justify-center items-center">
        {/* Animated Badge & Emblem */}
        <div className="relative">
          <div className="size-28 sm:size-32 rounded-3xl bg-[#0E3D42] text-[#E2A93B] flex items-center justify-center shadow-2xl mx-auto border-2 border-[#E2A93B]/40">
            <Cake size={56} className="animate-pulse" />
          </div>
          <span className="absolute -top-3 -right-3 px-3 py-1 bg-[#E2A93B] text-[#0E3D42] text-xs font-black rounded-full shadow-md tracking-wider">
            404
          </span>
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0E3D42]/5 border border-[#0E3D42]/10 text-xs font-bold text-[#0E3D42]">
            <Sparkles size={13} className="text-[#E2A93B]" />
            <span>Recipe or Page Missing</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#0E3D42] tracking-tight">
            Looks like this slice was already served!
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto font-medium">
            The link you followed may have expired, or the cake recipe has been relocated.
            Search our live bakery floor below or jump straight back to our freshest bakes.
          </p>
        </div>

        {/* Quick Search */}
        <form onSubmit={handleSearch} className="w-full max-w-md relative flex items-center shadow-lg rounded-2xl overflow-hidden border border-[#0E3D42]/20">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cakes, pastries, decorations..."
            className="w-full pl-12 pr-28 py-3.5 bg-white text-sm font-semibold text-[#0E3D42] placeholder:text-gray-400 focus:outline-none"
          />
          <Search size={18} className="absolute left-4 text-gray-400 pointer-events-none" />
          <button
            type="submit"
            className="absolute right-1.5 px-4 py-2 bg-[#0E3D42] text-white text-xs font-bold rounded-xl hover:bg-[#0E3D42]/90 transition"
          >
            Find Item
          </button>
        </form>

        {/* Navigation Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#0E3D42] text-white font-extrabold text-xs rounded-2xl shadow-md hover:bg-[#0E3D42]/90 transition active:scale-95"
          >
            <Home size={16} /> Return to Bakery Home
          </Link>
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-white border border-[#0E3D42]/20 text-[#0E3D42] font-extrabold text-xs rounded-2xl shadow-sm hover:bg-gray-50 transition active:scale-95"
          >
            <ShoppingBag size={16} /> View Your Bag {cartCount > 0 ? `(${cartCount})` : ''}
          </Link>
          <a
            href={`mailto:${supportEmail}?subject=404%20Page%20Report`}
            className="inline-flex items-center gap-2 px-5 py-3.5 bg-[#E2A93B]/20 text-[#0E3D42] font-bold text-xs rounded-2xl hover:bg-[#E2A93B]/30 transition"
          >
            <Mail size={16} /> Contact Support
          </a>
        </div>

        {/* Legal Links Footer Bar */}
        <div className="pt-8 border-t border-[#0E3D42]/10 w-full flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-gray-500">
          <Link href="/privacy" className="hover:text-[#0E3D42] hover:underline">Privacy Policy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-[#0E3D42] hover:underline">Terms of Service</Link>
          <span>·</span>
          <Link href="/refund" className="hover:text-[#0E3D42] hover:underline">Refund Policy</Link>
          <span>·</span>
          <Link href="/account" className="hover:text-[#0E3D42] hover:underline">My Account</Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#0E3D42]/10 py-6 text-center text-xs font-semibold text-gray-500">
        <p>© {new Date().getFullYear()} {shopName}. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
