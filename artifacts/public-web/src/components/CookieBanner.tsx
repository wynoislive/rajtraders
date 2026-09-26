import { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, X, Check, SlidersHorizontal, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';

export interface CookiePreferences {
  essential: boolean;
  preferences: boolean;
  analytics: boolean;
  timestamp: number;
}

const STORAGE_KEY = 'raj_cookie_consent_v1';

export function CookieBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    preferences: false,
    analytics: false,
    timestamp: 0,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPreferences(JSON.parse(stored));
      } else {
        // First visit: show cookie banner after 800ms
        const timer = setTimeout(() => setIsOpen(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      setIsOpen(true);
    }

    // Listen for custom trigger to reopen settings from footer
    const handleReopen = () => {
      setShowPreferencesModal(true);
    };
    window.addEventListener('open-cookie-settings', handleReopen);
    return () => window.removeEventListener('open-cookie-settings', handleReopen);
  }, []);

  const savePreferences = (updated: CookiePreferences) => {
    setPreferences(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save cookie preferences', e);
    }
    setIsOpen(false);
    setShowPreferencesModal(false);
  };

  const handleAcceptAll = () => {
    savePreferences({
      essential: true,
      preferences: true,
      analytics: true,
      timestamp: Date.now(),
    });
  };

  const handleRejectNonEssential = () => {
    savePreferences({
      essential: true,
      preferences: false,
      analytics: false,
      timestamp: Date.now(),
    });
  };

  return (
    <>
      {/* Floating Bottom Cookie Banner */}
      {isOpen && !showPreferencesModal && (
        <aside
          role="region"
          aria-label="Cookie consent banner"
          className="fixed bottom-4 left-4 right-4 md:left-8 md:right-auto md:max-w-xl z-50 bg-[#0E3D42] text-white p-5 rounded-2xl shadow-2xl border border-[#E2A93B]/30 animate-in fade-in slide-in-from-bottom duration-300"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-white/10 text-[#E2A93B] shrink-0">
              <Cookie size={24} aria-hidden="true" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black tracking-wide flex items-center gap-1.5 text-white">
                  Your Privacy & Cookie Choices
                </h2>
                <button
                  type="button"
                  onClick={handleRejectNonEssential}
                  aria-label="Close cookie banner"
                  className="text-white/60 hover:text-white p-1 rounded-lg transition focus-visible:ring-2 focus-visible:ring-[#E2A93B] focus-visible:outline-none"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-white/80 leading-relaxed font-medium">
                We use strictly essential cookies to store your shopping bag and authenticate orders. Optional cookies help customize your bakery preferences. In accordance with the Digital Personal Data Protection (DPDP) Act 2023, you can choose which cookies to permit.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-4 py-2 bg-[#E2A93B] hover:bg-[#E2A93B]/90 text-[#0E3D42] font-black text-xs rounded-xl transition shadow-sm focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  Accept All
                </button>
                <button
                  type="button"
                  onClick={handleRejectNonEssential}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition border border-white/20 focus-visible:ring-2 focus-visible:ring-[#E2A93B] focus-visible:outline-none"
                >
                  Reject Non-Essential
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreferencesModal(true)}
                  className="px-3 py-2 text-white/80 hover:text-white font-bold text-xs flex items-center gap-1 transition underline decoration-dotted focus-visible:ring-2 focus-visible:ring-[#E2A93B] focus-visible:outline-none"
                >
                  <SlidersHorizontal size={13} aria-hidden="true" /> Customize
                </button>
                <Link
                  href="/cookies"
                  className="text-[11px] text-[#E2A93B] hover:underline ml-auto flex items-center gap-0.5"
                >
                  Cookie Policy <ArrowRight size={11} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Preferences Modal */}
      {showPreferencesModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPreferencesModal(false);
          }}
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl text-[#0E3D42] space-y-5 border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#0E3D42]/10 text-[#0E3D42]">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 id="cookie-modal-title" className="text-lg font-black text-[#0E3D42]">
                    Cookie Preferences
                  </h2>
                  <p className="text-[11px] text-gray-500 font-medium">DPDP Act 2023 Compliant Settings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreferencesModal(false)}
                aria-label="Close preferences modal"
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition focus-visible:ring-2 focus-visible:ring-[#0E3D42] focus-visible:outline-none"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {/* Essential Cookies (Mandatory) */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-[#0E3D42]">Strictly Essential Cookies</span>
                    <span className="px-2 py-0.5 bg-[#0E3D42] text-white text-[10px] font-black rounded-full uppercase tracking-wider">
                      Required
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
                    Necessary for core shop functionality, maintaining your active session, shopping cart items, and CSRF payment token security. Cannot be disabled.
                  </p>
                </div>
                <div className="mt-1">
                  <div className="w-5 h-5 rounded-md bg-[#0E3D42] text-white flex items-center justify-center">
                    <Check size={14} strokeWidth={3} />
                  </div>
                </div>
              </div>

              {/* Preferences Cookies */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="font-extrabold text-xs text-[#0E3D42]">Preference & Personalization</span>
                  <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
                    Remember your delivery PIN code, selected category filters, and recently viewed cake items.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={preferences.preferences}
                    onChange={(e) => setPreferences({ ...preferences, preferences: e.target.checked })}
                    className="sr-only peer"
                    aria-label="Toggle preference cookies"
                  />
                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0E3D42]"></div>
                </label>
              </div>

              {/* Analytics Cookies */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="font-extrabold text-xs text-[#0E3D42]">Aggregated Analytics</span>
                  <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
                    Anonymous page performance metrics to optimize page load speeds and prevent technical errors. We never share your data with advertising networks.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                    className="sr-only peer"
                    aria-label="Toggle analytics cookies"
                  />
                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0E3D42]"></div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2">
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-[#0E3D42] rounded-xl hover:bg-gray-100 transition focus-visible:ring-2 focus-visible:ring-[#0E3D42] focus-visible:outline-none"
              >
                Reject All Optional
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => savePreferences({ ...preferences, timestamp: Date.now() })}
                  className="px-5 py-2.5 bg-[#0E3D42] text-white hover:bg-[#0E3D42]/90 font-extrabold text-xs rounded-xl shadow-sm transition focus-visible:ring-2 focus-visible:ring-[#0E3D42] focus-visible:outline-none"
                >
                  Save Choices
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
