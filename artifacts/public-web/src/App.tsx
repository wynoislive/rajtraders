import { useState, useEffect, useMemo } from 'react';
import { useLocation, Link } from 'wouter';
import {
  ShoppingBag,
  MapPin,
  Share2,
  CheckCircle2,
  X,
  Search,
  ArrowUpRight,
  User,
  ShieldCheck,
  Tag,
  Package,
  Clock,
  Sparkles,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

function getApiUrl(path: string): string {
  const apiTarget = (import.meta.env as any).VITE_API_TARGET || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://api.sundarvan.xyz' : '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return apiTarget ? `${apiTarget.replace(/\/+$/, '')}${cleanPath}` : cleanPath;
}

function money(cents = 0) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(cents / 100);
}

export default function App() {
  const [location, setLocation] = useLocation();
  const params = useMemo(() => {
    const match = location.match(/^\/products\/([^/]+)/);
    return match ? { slug: match[1] } : null;
  }, [location]);

  // Store & Location State
  const [pincode, setPincode] = useState('482004');
  const [city, setCity] = useState('Jabalpur, MP');
  const [pincodeResult, setPincodeResult] = useState<any>(null);
  const [pincodeChecking, setPincodeChecking] = useState(false);
  const [showPincodeModal, setShowPincodeModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Cart & Auth State
  const [cart, setCart] = useState<Array<{ product: any; quantity: number }>>([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Customer Auth Session
  const [user, setUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('raj_user') || 'null'); } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('raj_token'));

  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Shipping & Checkout
  const [shippingAddress, setShippingAddress] = useState(`PIN: ${pincode}, ${city}`);
  const [discountCode, setDiscountCode] = useState('');
  const [discountResult, setDiscountResult] = useState<any>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  // Products State
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Initial Fetch of Products
  useEffect(() => {
    fetch(getApiUrl('/api/v1/products'))
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        } else {
          setProducts(fallbackProducts);
        }
      })
      .catch(() => setProducts(fallbackProducts))
      .finally(() => setProductsLoading(false));
  }, []);

  const fallbackProducts = [
    {
      id: "prod_1",
      name: "Harbor Linen Overshirt",
      slug: "harbor-linen-overshirt",
      description: "A breathable everyday layer with a relaxed cut and soft washed finish.",
      priceCents: 8900,
      compareAtPriceCents: 12000,
      category: "Apparel",
      imageUrl: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=900&q=80",
      status: "active",
      featured: true,
      inventory: 24,
      prepTimeMinutes: 30,
    },
    {
      id: "prod_2",
      name: "Stoneware Pour-Over Set",
      slug: "stoneware-pour-over-set",
      description: "Hand-finished stoneware for slow mornings and generous pours.",
      priceCents: 5400,
      compareAtPriceCents: null,
      category: "Home",
      imageUrl: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=900&q=80",
      status: "active",
      featured: true,
      inventory: 12,
      prepTimeMinutes: 30,
    }
  ];

  const currentProduct = useMemo(() => {
    if (!params?.slug) return null;
    return products.find((p: any) => p.slug === params.slug || p.id === params.slug) || products[0];
  }, [params, products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = !selectedCategory || p.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Handlers
  const handleCheckPincode = async (targetPin: string) => {
    const clean = targetPin.trim();
    if (!/^[1-9][0-9]{5}$/.test(clean)) {
      alert('Please enter a valid 6-digit Indian PIN code.');
      return;
    }
    setPincodeChecking(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/checkout/check-pincode'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode: clean }),
      });
      const data = await res.json();
      setPincodeResult(data);
      if (data.allowed) {
        setPincode(data.pincode);
        setCity(data.city);
        setShippingAddress(`PIN: ${data.pincode}, ${data.city}`);
      }
    } catch {
      setPincodeResult({ allowed: true, pincode: clean, city: 'India', message: `Delivery available to ${clean}` });
      setPincode(clean);
    } finally {
      setPincodeChecking(false);
    }
  };

  const addToCart = (product: any) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.product.id === product.id);
      if (exists) {
        return prev.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, { product, quantity: 1 }];
    });
    setShowCartDrawer(true);
  };

  const shareProduct = (product: any) => {
    const url = `https://sundarvan.xyz/products/${product.slug}`;
    navigator.clipboard.writeText(url);
    alert(`Product link copied to clipboard!\n${url}`);
  };

  const handleLogin = async (e: any) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(getApiUrl('/api/v1/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.requiresVerification) {
        setOtpRequired(true);
        setPendingEmail(email);
      } else if (data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('raj_token', data.token);
        localStorage.setItem('raj_user', JSON.stringify(data.user));
        setShowAuthModal(false);
      } else {
        setAuthError(data.error || data.message || 'Login failed.');
      }
    } catch {
      setAuthError('Connection failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: any) => {
    e.preventDefault();
    const firstName = e.target.firstName.value;
    const lastName = e.target.lastName.value;
    const mobileNumber = e.target.mobileNumber.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(getApiUrl('/api/v1/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, mobileNumber, email, password, confirmPassword }),
      });
      const data = await res.json();
      if (data.requiresVerification) {
        setOtpRequired(true);
        setPendingEmail(email);
      } else if (data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('raj_token', data.token);
        localStorage.setItem('raj_user', JSON.stringify(data.user));
        setShowAuthModal(false);
      } else {
        setAuthError(data.error || data.message || 'Registration failed.');
      }
    } catch {
      setAuthError('Registration failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e: any) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/auth/verify-login-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, otpCode }),
      });
      const data = await res.json();
      if (data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('raj_token', data.token);
        localStorage.setItem('raj_user', JSON.stringify(data.user));
        setShowAuthModal(false);
        setOtpRequired(false);
      } else {
        setAuthError(data.error || 'Invalid OTP code.');
      }
    } catch {
      setAuthError('OTP verification failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    try {
      const subtotalCents = cart.reduce((acc, i) => acc + i.product.priceCents * i.quantity, 0);
      const res = await fetch(getApiUrl('/api/v1/discounts/validate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountCode.trim(), subtotalCents, isFirstOrder: true }),
      });
      const data = await res.json();
      setDiscountResult(data);
    } catch {
      setDiscountResult({ valid: false, message: 'Could not validate code.' });
    }
  };

  const handleCheckout = async () => {
    if (!token || !user) {
      setShowAuthModal(true);
      return;
    }
    if (!shippingAddress || shippingAddress.length < 5) {
      alert('Please enter a valid shipping address.');
      return;
    }
    setIsCheckingOut(true);
    try {
      const items = cart.map((i) => ({ productId: i.product.id, quantity: i.quantity }));
      const res = await fetch(getApiUrl('/api/v1/checkout/create-order'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          idempotencyKey: window.crypto.randomUUID(),
          items,
          discountCode: discountResult?.valid ? discountResult.code : undefined,
          customerEmail: user.email,
          customerName: `${user.firstName} ${user.lastName}`,
          customerMobile: user.mobileNumber,
          shippingAddress,
        }),
      });
      const orderData = await res.json();
      if (orderData.razorpayOrderId) {
        const verifyRes = await fetch(getApiUrl('/api/v1/checkout/verify-payment'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idempotencyKey: orderData.idempotencyKey,
            razorpayOrderId: orderData.razorpayOrderId,
            razorpayPaymentId: `pay_web_${Date.now()}`,
          }),
        });
        const receiptData = await verifyRes.json();
        setReceipt(receiptData);
        setCart([]);
        setShowCartDrawer(false);
      } else {
        alert(orderData.error || 'Failed to place order.');
      }
    } catch (err: any) {
      alert('Checkout error: ' + err.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const cartTotalCents = cart.reduce((acc, i) => acc + i.product.priceCents * i.quantity, 0);
  const discountCents = discountResult?.valid ? discountResult.discountCents : 0;
  const finalPayableCents = Math.max(100, cartTotalCents - discountCents);

  return (
    <div className="min-h-screen bg-[#F7F2EA] text-[#0E3D42] font-sans">
      {/* Amazon-style Location Top Bar */}
      <div className="bg-[#0E3D42] text-white text-xs py-2.5 px-4 flex items-center justify-between shadow-sm cursor-pointer hover:bg-[#0E3D42]/95 transition" onClick={() => setShowPincodeModal(true)}>
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
          <MapPin size={15} className="text-[#E2A93B]" />
          <span className="font-semibold">Deliver to <span className="underline decoration-[#E2A93B] font-bold">{city} {pincode}</span></span>
          <span className="text-[#E2A93B] text-[10px]">▼</span>
        </div>
      </div>

      {/* Main Store Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#0E3D42]/10 backdrop-blur-md bg-white/90 px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <img src="/RAJTRADERS-LOGO.png" alt="RAJ TRADERS" className="size-10 object-contain rounded-xl shadow-md border border-[#E2A93B]/30" />
            <div>
              <div className="text-lg font-black tracking-tight text-[#0E3D42]">RAJ TRADERS</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#0E3D42]/60">Gourmet Bakery & Artisanal Store</div>
            </div>
          </Link>

          {/* Search Input */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-4 relative">
            <Search size={16} className="absolute left-3.5 text-[#0E3D42]/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, cakes or apparel..."
              className="w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#0E3D42] transition"
            />
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold hidden sm:inline text-[#0E3D42]">Hi, {user.firstName}!</span>
                <button onClick={() => { setUser(null); setToken(null); localStorage.removeItem('raj_user'); localStorage.removeItem('raj_token'); }} className="text-xs font-bold text-red-600 hover:underline">Logout</button>
              </div>
            ) : (
              <button onClick={() => { setAuthMode('login'); setOtpRequired(false); setOtpCode(''); setAuthError(null); setShowAuthModal(true); }} className="px-4 py-2 rounded-xl text-xs font-extrabold border border-[#0E3D42] text-[#0E3D42] hover:bg-[#0E3D42] hover:text-white transition">
                Sign In / Register
              </button>
            )}

            <button onClick={() => setShowCartDrawer(true)} className="relative p-2.5 rounded-xl bg-[#0E3D42]/5 hover:bg-[#0E3D42]/10 transition text-[#0E3D42]">
              <ShoppingBag size={20} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#E2A93B] text-[#0E3D42] text-[11px] font-black size-5 rounded-full flex items-center justify-center shadow">
                  {cart.reduce((a, b) => a + b.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {currentProduct ? (
          /* Product Detail View */
          <div className="space-y-8">
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-[#0E3D42]/70 hover:text-[#0E3D42] bg-white px-3.5 py-2 rounded-xl border border-[#0E3D42]/10 shadow-sm">
              ← Back to Catalog
            </Link>

            <div className="grid md:grid-cols-2 gap-10 bg-white p-6 sm:p-10 rounded-3xl border border-[#0E3D42]/10 shadow-xl">
              {/* Product Media Column */}
              <div className="relative rounded-2xl overflow-hidden bg-[#EFE8DC] aspect-square flex items-center justify-center">
                <img src={currentProduct.imageUrl} alt={currentProduct.name} className="w-full h-full object-cover" />
                <span className="absolute bottom-4 left-4 bg-black/75 text-white text-xs px-3 py-1 rounded-full font-semibold backdrop-blur-sm">
                  ⏱️ {currentProduct.prepTimeMinutes || 30}m prep
                </span>
                <button onClick={() => shareProduct(currentProduct)} className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 text-[#0E3D42] hover:bg-white shadow transition">
                  <Share2 size={18} />
                </button>
              </div>

              {/* Product Details Column */}
              <div className="flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-[#E2A93B]">{currentProduct.category}</span>
                  <h1 className="text-3xl sm:text-4xl font-black mt-1 text-[#0E3D42] tracking-tight">{currentProduct.name}</h1>

                  <div className="mt-4 flex items-baseline gap-4">
                    <span className="text-3xl font-extrabold text-[#0E3D42]">{money(currentProduct.priceCents)}</span>
                    {currentProduct.compareAtPriceCents && (
                      <span className="text-lg text-gray-400 line-through font-semibold">{money(currentProduct.compareAtPriceCents)}</span>
                    )}
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">In Stock ({currentProduct.inventory} available)</span>
                  </div>

                  <p className="mt-5 text-sm leading-relaxed text-[#0E3D42]/80 font-medium">{currentProduct.description}</p>
                </div>

                {/* PIN Code Delivery Checker Box */}
                <div className="bg-[#F7F2EA] p-4 rounded-2xl border border-[#0E3D42]/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold flex items-center gap-1.5"><MapPin size={15} className="text-[#0E3D42]" /> Check Delivery Pincode</span>
                    <button onClick={() => setShowPincodeModal(true)} className="text-xs font-bold text-[#0E3D42] underline">Change</button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm font-bold rounded-xl border border-gray-300 focus:outline-none focus:border-[#0E3D42]"
                      placeholder="6-Digit PIN Code"
                    />
                    <button onClick={() => handleCheckPincode(pincode)} disabled={pincodeChecking} className="px-4 py-2 bg-[#0E3D42] text-white text-xs font-extrabold rounded-xl hover:bg-[#0E3D42]/90">
                      {pincodeChecking ? 'Checking...' : 'Check'}
                    </button>
                  </div>
                  {pincodeResult && (
                    <div className={`text-xs font-bold p-2.5 rounded-xl flex items-center gap-2 ${pincodeResult.allowed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      <CheckCircle2 size={16} />
                      {pincodeResult.message}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid sm:grid-cols-2 gap-3 pt-2">
                  <button onClick={() => addToCart(currentProduct)} className="w-full py-4 bg-[#0E3D42] text-white font-extrabold rounded-2xl shadow-lg hover:shadow-xl hover:bg-[#0E3D42]/95 transition flex items-center justify-center gap-2 text-sm">
                    <ShoppingBag size={18} /> Add to Bag
                  </button>
                  <button onClick={() => { addToCart(currentProduct); setShowCartDrawer(true); }} className="w-full py-4 bg-[#E2A93B] text-[#0E3D42] font-extrabold rounded-2xl shadow-md hover:bg-[#E2A93B]/90 transition text-sm">
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Catalog Grid View */
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h1 className="text-4xl font-black tracking-tight text-[#0E3D42]">Made for the Everyday</h1>
              <p className="text-sm font-medium text-[#0E3D42]/70">Small-batch artisanal cakes, organic bakes, apparel & specialty store items.</p>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-center">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition ${!selectedCategory ? 'bg-[#0E3D42] text-white' : 'bg-white border border-[#0E3D42]/10 text-[#0E3D42]'}`}
              >
                All Products
              </button>
              {['Apparel', 'Home', 'Bakery'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition ${selectedCategory === cat ? 'bg-[#0E3D42] text-white' : 'bg-white border border-[#0E3D42]/10 text-[#0E3D42]'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product: any) => (
                <div key={product.id} className="bg-white rounded-3xl border border-[#0E3D42]/10 overflow-hidden shadow-md hover:shadow-xl transition group flex flex-col justify-between">
                  <div>
                    <div className="relative aspect-square bg-[#EFE8DC] overflow-hidden">
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      <span className="absolute bottom-3 left-3 bg-black/70 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full">⏱️ {product.prepTimeMinutes || 30}m prep</span>
                      <button onClick={() => shareProduct(product)} className="absolute top-3 right-3 p-2 rounded-full bg-white/80 text-[#0E3D42] hover:bg-white shadow">
                        <Share2 size={16} />
                      </button>
                    </div>
                    <div className="p-5 space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#E2A93B]">{product.category}</span>
                      <Link href={`/products/${product.slug}`} className="block text-lg font-extrabold text-[#0E3D42] hover:underline">{product.name}</Link>
                      <p className="text-xs text-[#0E3D42]/70 line-clamp-2">{product.description}</p>
                    </div>
                  </div>
                  <div className="p-5 pt-0 flex items-center justify-between gap-4">
                    <span className="text-xl font-black text-[#0E3D42]">{money(product.priceCents)}</span>
                    <button onClick={() => addToCart(product)} className="px-4 py-2.5 bg-[#0E3D42] text-white text-xs font-bold rounded-xl hover:bg-[#0E3D42]/90 shadow transition">
                      Add to Bag
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Cart & Checkout Drawer Modal */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-xl font-black text-[#0E3D42]">Your Bag ({cart.length})</h2>
                <button onClick={() => setShowCartDrawer(false)} className="p-2 rounded-lg hover:bg-gray-100"><X size={20} /></button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <ShoppingBag size={48} className="mx-auto text-gray-300" />
                  <p className="text-sm font-bold text-gray-500">Your bag is empty.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(({ product, quantity }) => (
                    <div key={product.id} className="flex items-center justify-between border-b pb-4 gap-4">
                      <img src={product.imageUrl} alt={product.name} className="size-16 rounded-xl object-cover" />
                      <div className="flex-1">
                        <div className="font-bold text-sm text-[#0E3D42]">{product.name}</div>
                        <div className="text-xs text-[#0E3D42]/70">{money(product.priceCents * quantity)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCart((prev) => prev.map((i) => i.product.id === product.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))} className="size-7 rounded-lg bg-gray-100 font-bold">-</button>
                        <span className="text-xs font-bold">{quantity}</span>
                        <button onClick={() => setCart((prev) => prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))} className="size-7 rounded-lg bg-gray-100 font-bold">+</button>
                      </div>
                    </div>
                  ))}

                  {/* Discount Code Input */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-extrabold text-[#0E3D42]">Discount Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value)}
                        placeholder="WELCOME10"
                        className="flex-1 p-2.5 text-xs font-semibold rounded-xl border border-gray-300 uppercase"
                      />
                      <button onClick={handleApplyDiscount} className="px-4 py-2 bg-[#0E3D42] text-white text-xs font-bold rounded-xl">Apply</button>
                    </div>
                    {discountResult && (
                      <div className={`text-xs font-bold ${discountResult.valid ? 'text-emerald-700' : 'text-red-600'}`}>{discountResult.message}</div>
                    )}
                  </div>

                  {/* Shipping Address Input */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-extrabold text-[#0E3D42]">Shipping Address & Pincode</label>
                    <textarea
                      rows={2}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="w-full p-3 text-xs font-semibold rounded-xl border border-gray-300 focus:outline-none focus:border-[#0E3D42]"
                      placeholder="Enter street, landmark, city, postal code"
                    />
                  </div>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex justify-between text-base font-black text-[#0E3D42]">
                  <span>Total Payable:</span>
                  <span>{money(finalPayableCents)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full py-4 bg-[#0E3D42] text-white font-extrabold rounded-2xl shadow-lg hover:bg-[#0E3D42]/95 transition"
                >
                  {isCheckingOut ? 'Processing Order...' : `Pay & Complete Order · ${money(finalPayableCents)}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Auth Modal (Sign In / Register) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) { setShowAuthModal(false); setOtpRequired(false); setAuthError(null); } }}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 relative">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                {otpRequired && (
                  <button type="button" onClick={() => { setOtpRequired(false); setAuthError(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#0E3D42]" title="Go back">
                    <ArrowLeft size={20} />
                  </button>
                )}
                <h2 className="text-xl font-black text-[#0E3D42]">{otpRequired ? 'Email Verification' : authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>
              </div>
              <button onClick={() => { setShowAuthModal(false); setOtpRequired(false); setAuthError(null); }} className="p-2 rounded-lg hover:bg-gray-100"><X size={20} /></button>
            </div>

            {authError && <div className="p-3 bg-red-100 text-red-700 text-xs font-bold rounded-xl">{authError}</div>}

            {otpRequired ? (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-xs text-gray-500 font-medium">A 6-digit verification code was sent to <strong className="text-[#0E3D42]">{pendingEmail}</strong></p>
                <input required type="text" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="6-Digit OTP" className="w-full p-3 text-center tracking-widest text-xl font-bold rounded-xl border border-gray-300" />
                <button type="submit" disabled={authLoading} className="w-full py-3.5 bg-[#0E3D42] text-white font-extrabold rounded-xl shadow">{authLoading ? 'Verifying...' : 'Verify OTP'}</button>
                <button type="button" onClick={() => { setOtpRequired(false); setAuthError(null); }} className="w-full text-center text-xs font-bold text-[#0E3D42]/70 hover:underline">
                  Change Email / Return to {authMode === 'login' ? 'Sign In' : 'Register'}
                </button>
              </form>
            ) : authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <input required type="email" name="email" placeholder="Email Address" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <input required type="password" name="password" placeholder="Password" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <button type="submit" disabled={authLoading} className="w-full py-3.5 bg-[#0E3D42] text-white font-extrabold rounded-xl shadow">{authLoading ? 'Signing in...' : 'Sign In'}</button>
                <div className="text-center text-xs font-bold text-[#0E3D42]/70">
                  Don't have an account? <button type="button" onClick={() => setAuthMode('register')} className="underline text-[#0E3D42]">Register</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <input required type="text" name="firstName" placeholder="First Name" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <input required type="text" name="lastName" placeholder="Last Name" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <input required type="tel" name="mobileNumber" placeholder="Mobile Number (Unique Identity)" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <input required type="email" name="email" placeholder="Email Address" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <input required type="password" name="password" placeholder="Password" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <input required type="password" name="confirmPassword" placeholder="Confirm Password" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <button type="submit" disabled={authLoading} className="w-full py-3.5 bg-[#0E3D42] text-white font-extrabold rounded-xl shadow">{authLoading ? 'Registering...' : 'Register Account'}</button>
                <div className="text-center text-xs font-bold text-[#0E3D42]/70">
                  Already have an account? <button type="button" onClick={() => setAuthMode('login')} className="underline text-[#0E3D42]">Sign In</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Pincode Selection Modal */}
      {showPincodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-[#0E3D42] text-base flex items-center gap-2"><MapPin size={18} /> Select Delivery Location</h3>
              <button onClick={() => setShowPincodeModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-500 font-medium">Enter an Indian 6-digit PIN code to check deliverability and express timelines.</p>
            <input
              type="text"
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="w-full text-center tracking-widest font-black text-xl p-3 border rounded-xl border-gray-300"
              placeholder="482004"
            />
            <div className="flex gap-2">
              {['482004', '400001', '110001', '560001'].map((pin) => (
                <button key={pin} onClick={() => { setPincode(pin); handleCheckPincode(pin); }} className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-[11px] font-bold rounded-lg">{pin}</button>
              ))}
            </div>
            <button onClick={() => { handleCheckPincode(pincode); setShowPincodeModal(false); }} className="w-full py-3 bg-[#0E3D42] text-white font-extrabold text-xs rounded-xl shadow">
              Save & Apply Location
            </button>
          </div>
        </div>
      )}

      {/* Order Confirmation Receipt Modal */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl text-center space-y-4">
            <CheckCircle2 size={48} className="mx-auto text-emerald-600" />
            <h2 className="text-2xl font-black text-[#0E3D42]">Order Confirmed!</h2>
            <p className="text-xs text-gray-600">Your transaction was processed securely. Thank you for shopping with RAJ TRADERS.</p>
            <div className="bg-[#F7F2EA] p-4 rounded-2xl text-left text-xs space-y-1 font-semibold text-[#0E3D42]">
              <div>Order ID: {receipt.orderId}</div>
              <div>Payment Ref: {receipt.razorpayPaymentId}</div>
              <div className="font-bold text-emerald-700">Amount Paid: {money(receipt.amountCents)}</div>
            </div>
            <button onClick={() => setReceipt(null)} className="w-full py-3 bg-[#0E3D42] text-white font-extrabold text-xs rounded-xl shadow">
              Continue Shopping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
