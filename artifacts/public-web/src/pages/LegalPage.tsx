import { useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ShieldCheck,
  FileText,
  RotateCcw,
  Cookie,
  ArrowLeft,
  Printer,
  ExternalLink,
  MapPin,
  Mail,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { SeoHead } from '../components/SeoHead';

export type PolicyType = 'privacy' | 'terms' | 'refund' | 'cookies';

interface LegalPageProps {
  type: PolicyType;
  shopSettings?: any;
}

export function LegalPage({ type, shopSettings = {} }: LegalPageProps) {
  const [, setLocation] = useLocation();

  const officialAddress = shopSettings.shopAddress || "Thana Rd, beside NAGAR PALIKA, BIRSINGPUR, Pali Birsinghpur, Madhya Pradesh 484551";
  const googleMapsUrl = shopSettings.googleMapsUrl || "https://www.google.com/maps/place/Raj+Traders/@23.3644543,81.0442869,21z/data=!4m12!1m5!3m4!2zMjPCsDIxJzUxLjUiTiA4McKwMDInMzguOSJF!8m2!3d23.3643056!4d81.0441389!3m5!1s0x3986c58bb0edcb51:0x49e2a8728e29e896!8m2!3d23.3644551!4d81.0442634!16s%2Fg%2F11t29m5jmv";
  const businessName = shopSettings.legalBusinessName || "RAJ TRADERS";
  const gstin = shopSettings.gstinNumber || "23AAAAA0000A1Z5";
  const fssai = shopSettings.fssaiRegistration || "FSSAI Lic. No. 21423010000000";
  const grievanceEmail = shopSettings.grievanceOfficerEmail || "support@sundarvan.xyz";

  const meta = useMemo(() => {
    switch (type) {
      case 'privacy':
        return {
          title: `Privacy Policy & DPDP Act 2023 Disclosures — ${businessName}`,
          description: `Learn how ${businessName} protects your personal information under the Digital Personal Data Protection (DPDP) Act 2023.`,
          heading: 'Privacy Policy',
          subheading: 'Digital Personal Data Protection (DPDP) Act 2023 Notice & Rights',
          icon: ShieldCheck,
        };
      case 'terms':
        return {
          title: `Terms & Conditions of Service — ${businessName}`,
          description: `Terms and conditions governing the purchase of bakery products, cakes, and celebration supplies from ${businessName}.`,
          heading: 'Terms & Conditions',
          subheading: 'Commercial Terms of Sale, Pricing, Delivery & Jurisdiction',
          icon: FileText,
        };
      case 'refund':
        return {
          title: `Cancellation, Return & Refund Policy — ${businessName}`,
          description: `Policies regarding perishable cake orders, pre-dispatch cancellations, damaged goods, and Razorpay refund turnarounds.`,
          heading: 'Cancellation & Refund Policy',
          subheading: 'Transparent returns, 24h quality guarantee & fast reversals',
          icon: RotateCcw,
        };
      case 'cookies':
        return {
          title: `Cookie Policy & User Consent — ${businessName}`,
          description: `Transparent breakdown of essential session cookies and optional user preferences stored by ${businessName}.`,
          heading: 'Cookie Policy',
          subheading: 'Zero covert tracking, user-controlled preferences & session integrity',
          icon: Cookie,
        };
    }
  }, [type, businessName]);

  const IconComponent = meta.icon;

  return (
    <div className="min-h-screen bg-[#F7F2EA] text-[#0E3D42] py-8 px-4 sm:px-6 lg:px-8">
      <SeoHead
        title={meta.title}
        description={meta.description}
        url={`https://${(shopSettings?.shopDomain || (typeof window !== 'undefined' ? window.location.host : 'sundarvan.xyz')).replace(/^https?:\/\//i, '').replace(/\/+$/, '')}/${type}`}
      />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Actions Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#0E3D42]/15">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-extrabold text-[#0E3D42] hover:text-[#0E3D42]/80 transition focus-visible:ring-2 focus-visible:ring-[#0E3D42] rounded-lg p-1"
          >
            <ArrowLeft size={18} aria-hidden="true" /> Back to Bakery Storefront
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white rounded-xl shadow-sm text-xs font-bold text-[#0E3D42] hover:bg-gray-50 border border-gray-200 transition focus-visible:ring-2 focus-visible:ring-[#0E3D42]"
            >
              <Printer size={15} aria-hidden="true" /> Print Document
            </button>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#E2A93B] hover:bg-[#E2A93B]/90 text-[#0E3D42] font-black text-xs rounded-xl shadow-sm transition focus-visible:ring-2 focus-visible:ring-[#0E3D42]"
            >
              <MapPin size={15} aria-hidden="true" /> View Store on Map
            </a>
          </div>
        </header>

        {/* Tab Navigator */}
        <nav aria-label="Legal policies" className="flex flex-wrap gap-2 p-1.5 bg-white/70 backdrop-blur rounded-2xl border border-[#0E3D42]/10 shadow-sm">
          <button
            type="button"
            onClick={() => setLocation('/privacy')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition ${
              type === 'privacy' ? 'bg-[#0E3D42] text-white shadow-sm' : 'text-[#0E3D42] hover:bg-white'
            }`}
          >
            <ShieldCheck size={16} /> Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => setLocation('/terms')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition ${
              type === 'terms' ? 'bg-[#0E3D42] text-white shadow-sm' : 'text-[#0E3D42] hover:bg-white'
            }`}
          >
            <FileText size={16} /> Terms & Conditions
          </button>
          <button
            type="button"
            onClick={() => setLocation('/refund')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition ${
              type === 'refund' ? 'bg-[#0E3D42] text-white shadow-sm' : 'text-[#0E3D42] hover:bg-white'
            }`}
          >
            <RotateCcw size={16} /> Cancellation & Refunds
          </button>
          <button
            type="button"
            onClick={() => setLocation('/cookies')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition ${
              type === 'cookies' ? 'bg-[#0E3D42] text-white shadow-sm' : 'text-[#0E3D42] hover:bg-white'
            }`}
          >
            <Cookie size={16} /> Cookie Policy
          </button>
        </nav>

        {/* Policy Content Card */}
        <main className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-[#0E3D42]/10 space-y-8">
          {/* Header Section */}
          <div className="border-b border-gray-100 pb-6 flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[#0E3D42]/10 text-[#0E3D42] shrink-0">
              <IconComponent size={32} />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-[#0E3D42] tracking-tight">
                {meta.heading}
              </h1>
              <p className="text-sm font-semibold text-gray-600">{meta.subheading}</p>
              <p className="text-xs text-gray-500 pt-1">
                Last updated: <strong>September 26, 2026</strong> · Effective for all customers of {businessName}
              </p>
            </div>
          </div>

          {/* Privacy Policy Body (DPDP Act 2023) */}
          {type === 'privacy' && (
            <article className="space-y-6 text-sm text-gray-800 leading-relaxed font-normal">
              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#0E3D42]">1. Notice & Data Fiduciary Details</h2>
                <p>
                  This Privacy Notice is issued by <strong>{businessName}</strong>, having its principal place of retail business at{' '}
                  <strong>{officialAddress}</strong> ("Data Fiduciary", "We", "Our", "Store").
                </p>
                <p>
                  We are fully committed to protecting your personal data in accordance with the{' '}
                  <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>, Information Technology Act, 2000, and related rules. We only process personal data for clear, lawful purposes that you have consented to or for necessary transactional fulfillment.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#0E3D42]">2. Categories of Personal Data Collected (Data Minimization)</h2>
                <p>We strictly adhere to the principle of data minimization. We only collect the minimal personal data required to prepare, invoice, and safely deliver your bakery orders:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-700">
                  <li><strong>Identity & Contact:</strong> Full name, verified mobile number, and email address (for sending GST tax invoices and one-time password OTP codes).</li>
                  <li><strong>Delivery Coordinates:</strong> Delivery street address, nearby landmarks, and postal PIN code in Birsingpur Pali to route deliveries within our verified delivery radius.</li>
                  <li><strong>Order History:</strong> Product items ordered, custom cake celebration messages, timestamps, and payment statuses.</li>
                </ul>
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900 font-medium">
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-700 mt-0.5" />
                  <span><strong>Zero Financial Data Stored:</strong> We never capture, store, or process raw credit/debit card numbers, CVVs, or UPI MPINs. All digital transactions are processed through RBI-authorized payment aggregator Razorpay with bank-grade encryption.</span>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#0E3D42]">3. Lawful Purposes for Processing</h2>
                <p>Your personal data is processed solely for:</p>
                <ol className="list-decimal pl-5 space-y-1 text-gray-700">
                  <li>Baking and dispatching custom celebration orders to your designated location.</li>
                  <li>Generating statutory Goods and Services Tax (GST) compliant tax invoices.</li>
                  <li>Authenticating user logins via secure email verification OTP codes.</li>
                  <li>Customer support regarding cancellations, substitutions, or address updates.</li>
                </ol>
                <p>We do not sell, rent, monetize, or trade your personal data with third-party advertisers or data brokers under any circumstances.</p>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#0E3D42]">4. Your Rights under the DPDP Act 2023</h2>
                <p>As a Data Principal, you have statutory rights guaranteed under the DPDP Act 2023:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                    <h3 className="font-extrabold text-xs text-[#0E3D42]">Right to Access Information</h3>
                    <p className="text-xs text-gray-600">You can view your complete order history, saved addresses, and active sessions anytime in your Customer Account portal.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                    <h3 className="font-extrabold text-xs text-[#0E3D42]">Right to Correction & Erasure</h3>
                    <p className="text-xs text-gray-600">You may update your profile or permanently erase your customer account and associated personal data directly from Account Settings.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                    <h3 className="font-extrabold text-xs text-[#0E3D42]">Right to Withdraw Consent</h3>
                    <p className="text-xs text-gray-600">You may withdraw cookie consent or promotional notification consent at any time without affecting historical transaction invoices.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                    <h3 className="font-extrabold text-xs text-[#0E3D42]">Right to Nominate</h3>
                    <p className="text-xs text-gray-600">In the event of death or incapacity, you have the right to nominate another individual to exercise your rights under the law.</p>
                  </div>
                </div>
              </section>

              <section className="space-y-3 pt-2">
                <h2 className="text-base font-extrabold text-[#0E3D42]">5. Grievance Redressal Mechanism & Officer Details</h2>
                <p>
                  In compliance with the DPDP Act 2023, we have designated a dedicated Grievance Redressal Officer to resolve any data privacy questions or complaints within <strong>48 hours</strong>:
                </p>
                <div className="p-4 rounded-2xl bg-gray-50 border border-[#0E3D42]/15 space-y-2 text-xs">
                  <p><strong>Designation:</strong> Data Protection & Grievance Officer, {businessName}</p>
                  <p><strong>Official Email:</strong> <a href={`mailto:${grievanceEmail}`} className="text-[#0E3D42] font-extrabold underline">{grievanceEmail}</a></p>
                  <p><strong>Physical Address for Postal Grievances:</strong> {officialAddress}</p>
                  <p><strong>Grievance Redressal SLA:</strong> Acknowledgment within 24 hours; resolution within 48 to 72 business hours.</p>
                </div>
              </section>
            </article>
          )}

          {/* Terms & Conditions Body */}
          {type === 'terms' && (
            <article className="space-y-6 text-sm text-gray-800 leading-relaxed font-normal">
              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#0E3D42]">1. Scope & Acceptance of Terms</h2>
                <p>
                  These Terms and Conditions ("Terms") govern your access to and orders placed on <strong>{businessName}</strong> storefront (web and mobile applications). By registering an account, placing an order, or browsing our catalog, you agree to be bound by these Terms and our Privacy Policy.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#0E3D42]">2. Serviceable Locations & Order Fulfillment</h2>
                <p>
                  Our fresh gourmet bakery and celebration supply orders are fulfilled locally from our store at <strong>{officialAddress}</strong>. We deliver strictly within designated postal PIN codes in Birsingpur Pali, Umaria District, Madhya Pradesh.
                </p>
                <p>
                  Orders placed for addresses outside our designated operational radius cannot be dispatched. If an out-of-boundary order is erroneously processed, a 100% full refund will be automatically credited to the original payment source.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#0E3D42]">3. Product Descriptions, Dietary Markers & Pricing</h2>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-700">
                  <li><strong>FSSAI 100% Pure Vegetarian:</strong> All products designated with the green vegetarian symbol conform to statutory Food Safety and Standards Authority of India (FSSAI) vegetarian guidelines ({fssai}).</li>
                  <li><strong>Handcrafted Variation:</strong> Our cakes and artisanal pastries are freshly baked in small batches. Minor variations in cake decor, icing design, and garnish shades may naturally occur compared to website display photography.</li>
                  <li><strong>GST Inclusive:</strong> All prices displayed on our website and mobile app are inclusive of applicable Goods and Services Tax (GSTIN: {gstin}). A detailed tax breakdown is provided on the electronic invoice.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#0E3D42]">4. Payments & Security</h2>
                <p>
                  Online payments are processed securely through RBI-authorized payment gateway Razorpay using 256-bit encryption. Cash on Delivery (COD) is available only when explicitly toggled active by store management and subject to verification.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#0E3D42]">5. Governing Law & Jurisdiction</h2>
                <p>
                  These Terms are governed by and construed in accordance with the laws of India. Any legal dispute, claim, or difference arising out of or relating to store transactions shall be subject to the exclusive jurisdiction of the competent civil courts in <strong>Umaria / Jabalpur, Madhya Pradesh</strong>.
                </p>
              </section>
            </article>
          )}

          {/* Cancellation & Refund Policy Body */}
          {type === 'refund' && (
            <article className="space-y-6 text-sm text-gray-800 leading-relaxed font-normal">
              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#0E3D42]">1. Fresh Perishable Items (Cakes, Pastries, Confectionery)</h2>
                <p>
                  Because freshly baked gourmet cakes and pastries have strict shelf-life limitations, standard returns are not feasible once delivered. However, customer satisfaction is our top priority:
                </p>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5">
                  <p className="font-extrabold text-sm text-amber-900">24-Hour Quality Guarantee</p>
                  <p>If your cake arrives visibly damaged in transit, spoiled, or significantly differing from the selected specifications, please report the issue within <strong>24 hours of delivery</strong> with clear photographs to our support team.</p>
                  <p>Upon verification by our staff, we will provide an immediate <strong>free replacement delivery</strong> or a <strong>100% full refund</strong>.</p>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#0E3D42]">2. Non-Perishable Celebration Supplies (Party Decor, Foil Balloons, Banners)</h2>
                <p>
                  Non-edible party accessories, balloon sets, and decorative items may be returned within <strong>7 days of delivery</strong>, provided items are unused, intact, and in their original packaging. Return shipping can be coordinated with our local store fleet.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#0E3D42]">3. Pre-Dispatch Cancellation Rules</h2>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  <li><strong>Standard Orders:</strong> You can cancel your order directly from your Customer Account portal at any time before the status transitions to 'Packed' or 'Out for Delivery'.</li>
                  <li><strong>Customized / Fondant Cakes:</strong> Customized cakes requiring bespoke advance prep may only be cancelled up to 4 hours before the scheduled delivery slot.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#0E3D42]">4. Refund Timelines & Reversal Channels</h2>
                <p>Once a refund is approved by our management:</p>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  <li><strong>Online Payments (UPI / Card / NetBanking via Razorpay):</strong> The refund is initiated immediately and credited to your original payment bank account within <strong>3 to 5 business days</strong>, depending on your bank's clearance cycles.</li>
                  <li><strong>Cash on Delivery (COD) Returns:</strong> Reimbursed via instant UPI transfer to your verified phone number or instant store credit.</li>
                </ul>
              </section>
            </article>
          )}

          {/* Cookie Policy Body */}
          {type === 'cookies' && (
            <article className="space-y-6 text-sm text-gray-800 leading-relaxed font-normal">
              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#0E3D42]">1. What Are Cookies?</h2>
                <p>
                  Cookies and local storage tokens are small, secure data files stored in your web browser. They allow our website to remember your session, keep your shopping cart intact while you browse different bakery categories, and verify your account logins.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#0E3D42]">2. Categories of Cookies We Use</h2>
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-[#0E3D42]">1. Strictly Essential Cookies (Mandatory)</span>
                      <span className="px-2 py-0.5 bg-[#0E3D42] text-white text-[10px] font-black rounded-full uppercase">Always Active</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Required for website operation. Examples: Cart item persistence (`raj_cart_items`), JWT authentication tokens for registered customers, and Razorpay payment nonce tokens.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-[#0E3D42]">2. Functional & Preference Cookies (Optional)</span>
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-black rounded-full uppercase">User Controlled</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Saves your selected delivery PIN code and category sorting choices so you do not need to reselect them upon your next visit.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-[#0E3D42]">3. Performance & Error Telemetry (Optional)</span>
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-black rounded-full uppercase">User Controlled</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Measures page load speeds and API response latencies to prevent technical glitches. Never used for profiling.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-extrabold text-[#0E3D42]">3. Zero Third-Party Advertising Trackers</h2>
                <p>
                  We have a strict privacy-first architecture: we do <strong>NOT</strong> embed cross-site advertising pixels (such as Meta Pixel, Google AdSense, or third-party marketing beacons). Your browsing habits on Raj Traders remain completely confidential.
                </p>
              </section>

              <section className="space-y-3 pt-2">
                <h2 className="text-base font-extrabold text-[#0E3D42]">4. Manage Your Preferences Anytime</h2>
                <p>
                  You can change your consent preferences or revoke optional cookies at any time by clicking the button below:
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-cookie-settings'))}
                    className="px-5 py-2.5 bg-[#0E3D42] text-white hover:bg-[#0E3D42]/90 font-extrabold text-xs rounded-xl shadow-sm transition focus-visible:ring-2 focus-visible:ring-[#0E3D42]"
                  >
                    Open Cookie Consent Settings
                  </button>
                </div>
              </section>
            </article>
          )}

          {/* Business & Physical Store Badge Footer */}
          <footer className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-gray-500 font-medium">
            <div className="space-y-1">
              <p className="font-extrabold text-[#0E3D42] flex items-center gap-1.5">
                <Building size={14} /> {businessName}
              </p>
              <p>{officialAddress}</p>
              <p className="text-[11px] text-gray-400">GSTIN: {gstin} · {fssai}</p>
            </div>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#0E3D42] hover:underline font-extrabold"
            >
              Open Verified Google Maps Listing <ExternalLink size={13} />
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}
