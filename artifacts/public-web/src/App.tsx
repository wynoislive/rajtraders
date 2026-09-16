import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useLocation, Link } from 'wouter';
import type { Product } from '@workspace/api-client-react';
import { SeoHead } from './components/SeoHead';
import {
  ShoppingBag,
  MapPin,
  Share2,
  CheckCircle2,
  X,
  Search,
  User,
  ShieldCheck,
  Clock,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Bell,
  Heart,
  Filter,
  SlidersHorizontal,
  Trash2,
  Edit3,
  Plus,
  ChevronDown,
  Check,
  AlertTriangle,
  Store,
  Navigation,
  CreditCard,
  Lock,
  RefreshCw,
  FileText,
  PhoneCall,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  Tag,
  Package,
  LogOut
} from 'lucide-react';

export type StorefrontProduct = Product & {
  prepTimeMinutes?: number;
  isBestseller?: boolean;
  isVeg?: boolean;
};

export interface OrderItem {
  name?: string;
  productName?: string;
  quantity: number;
  priceCents: number;
}


function getApiUrl(path: string): string {
  const apiTarget = (import.meta.env as any).VITE_API_TARGET || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://api.sundarvan.xyz' : '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return apiTarget ? `${apiTarget.replace(/\/+$/, '')}${cleanPath}` : cleanPath;
}

function money(cents = 0) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(cents / 100);
}

export default function App() {
  const [location, setLocation] = useLocation();
  const params = useMemo(() => {
    const match = location.match(/^\/products\/([^/]+)/);
    return match ? { slug: match[1] } : null;
  }, [location]);

  // Storefront Public Settings
  const [shopSettings, setShopSettings] = useState<any>({
    shopName: 'RAJ TRADERS',
    availableInLocation: 'BIRSINGPUR PALI',
    aboutUsText: 'Premium cakes, party decorations & artisanal local delights.',
    isStoreOpen: true,
    isCodEnabled: false,
    flatDeliveryFeeCents: 3000,
    freeDeliveryThresholdCents: 50000,
    packagingFeeCents: 1000,
    socialLinkedin: '',
    socialInstagram: '',
    socialFacebook: '',
    socialPinterest: '',
    socialTwitter: '',
    supportEmail: 'support@sundarvan.xyz',
  });

  useEffect(() => {
    fetch(getApiUrl('/api/v1/storefront/settings'))
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setShopSettings(data); })
      .catch(() => {});
  }, []);

  // Store & Location State
  const [pincode, setPincode] = useState('482004');
  const [city, setCity] = useState('Jabalpur, MP');
  const [pincodeResult, setPincodeResult] = useState<any>(null);
  const [pincodeChecking, setPincodeChecking] = useState(false);
  const [showPincodeModal, setShowPincodeModal] = useState(false);

  // Search & Catalog Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('raj_recent_searches') || '[]'); } catch { return []; }
  });
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'nonveg'>('all');
  const [bestsellerOnly, setBestsellerOnly] = useState(false);
  const [priceRange, setPriceRange] = useState<string | null>(null); // '0-300', '300-500', '500-1000', '1000+'
  const [sortBy, setSortBy] = useState<'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'bestseller'>('relevance');

  // Cart & Auth State
  const [cart, setCart] = useState<Array<{ product: StorefrontProduct; quantity: number }>>(() => {
    try { return JSON.parse(localStorage.getItem('raj_cart') || '[]'); } catch { return []; }
  });
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showCouponsDrawer, setShowCouponsDrawer] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password' | 'reset_password'>('login');
  const [resetToken, setResetToken] = useState('');

  // Customer Auth Session
  const [user, setUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('raj_user') || 'null'); } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('raj_token'));

  // Multi-tab synchronization via storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'raj_token' || e.key === 'raj_user') {
        try {
          setUser(JSON.parse(localStorage.getItem('raj_user') || 'null'));
        } catch {
          setUser(null);
          localStorage.removeItem('raj_user');
        }
        setToken(localStorage.getItem('raj_token'));
      }
      if (e.key === 'raj_cart') {
        try {
          setCart(JSON.parse(e.newValue || '[]'));
        } catch {
          setCart([]);
          localStorage.removeItem('raj_cart');
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save Cart to LocalStorage
  useEffect(() => {
    localStorage.setItem('raj_cart', JSON.stringify(cart));
  }, [cart]);

  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(45);

  // Favorites & Notifications State
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('raj_favorites') || '[]'); } catch { return []; }
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // Fetch Wishlist & Notifications when logged in
  useEffect(() => {
    if (token) {
      fetch(getApiUrl('/api/v1/auth/favorites'), { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(favs => {
          if (Array.isArray(favs)) {
            setFavorites(favs.map(f => f.id));
          }
        })
        .catch(() => {});

      fetch(getApiUrl('/api/v1/auth/notifications'), { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setNotifications(data.notifications || []);
            setUnreadNotificationsCount(data.unreadCount || 0);
          }
        })
        .catch(() => {});
    }
  }, [token]);

  // Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  useEffect(() => {
    if (token && location === '/account') {
      setAddressLoading(true);
      fetch(getApiUrl('/api/v1/auth/addresses'), { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(data => { if (Array.isArray(data)) setSavedAddresses(data); })
        .catch(() => {})
        .finally(() => setAddressLoading(false));
    }
  }, [token, location]);

  // Customer Orders State
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  useEffect(() => {
    if (token && location === '/account') {
      setOrdersLoading(true);
      fetch(getApiUrl('/api/v1/auth/orders'), { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(data => { if (Array.isArray(data)) setCustomerOrders(data); })
        .catch(() => {})
        .finally(() => setOrdersLoading(false));
    }
  }, [token, location]);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (otpRequired && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [otpRequired, resendCooldown]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlToken = searchParams.get('token');
      const urlEmail = searchParams.get('email');
      if (urlToken || window.location.pathname.startsWith('/reset-password')) {
        setShowAuthModal(true);
        setAuthMode('reset_password');
        if (urlEmail) setPendingEmail(urlEmail);
        if (urlToken) setResetToken(urlToken);
      }
    }
  }, []);

  // Shipping & Checkout
  const [shippingAddress, setShippingAddress] = useState(`PIN: ${pincode}, ${city}`);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [discountCode, setDiscountCode] = useState('');
  const [discountResult, setDiscountResult] = useState<any>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  // Account Portal Active Tab
  const [activeAccountTab, setActiveAccountTab] = useState<'orders' | 'addresses' | 'favorites' | 'settings' | 'profile'>('orders');
  const [changePassLoading, setChangePassLoading] = useState(false);
  const [changePassNotice, setChangePassNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);


  // Products State
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const fallbackCelebrationProducts = useMemo(() => [
    {
      id: "prod_cake_belgian_choco",
      name: "Belgian Chocolate Truffle Cake (1kg)",
      slug: "belgian-chocolate-truffle-cake",
      description: "Rich 55% dark Belgian chocolate truffle cake decorated with edible gold leaf and cocoa nibs.",
      priceCents: 129900,
      compareAtPriceCents: 149900,
      category: "Bakery",
      imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
      status: "active",
      featured: true,
      inventory: 25,
      prepTimeMinutes: 45,
      isBestseller: true,
      isVeg: true,
    },
    {
      id: "prod_cake_strawberry_bliss",
      name: "Fresh Strawberry Cream Cake (1kg)",
      slug: "fresh-strawberry-cream-cake",
      description: "Fresh Mahabaleshwar strawberries layered with vanilla sponge and light whipping cream.",
      priceCents: 109900,
      compareAtPriceCents: 129900,
      category: "Bakery",
      imageUrl: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80",
      status: "active",
      featured: true,
      inventory: 18,
      prepTimeMinutes: 30,
      isBestseller: true,
      isVeg: true,
    },
    {
      id: "prod_party_balloon_arch",
      name: "Metallic Gold & Pastel Balloon Arch Set (100 Pcs)",
      slug: "metallic-gold-pastel-balloon-arch",
      description: "Complete DIY birthday & wedding balloon garland kit including arch tape and glue dots.",
      priceCents: 49900,
      compareAtPriceCents: 79900,
      category: "Home",
      imageUrl: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80",
      status: "active",
      featured: true,
      inventory: 50,
      prepTimeMinutes: 15,
      isBestseller: true,
      isVeg: true,
    },
  ], []);

  // Initial Fetch of Products
  useEffect(() => {
    fetch(getApiUrl('/api/v1/products'))
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setProducts(data);
        else setProducts(fallbackCelebrationProducts);
      })
      .catch(() => setProducts(fallbackCelebrationProducts))
      .finally(() => setProductsLoading(false));
  }, [fallbackCelebrationProducts]);

  const currentProduct = useMemo(() => {
    if (!params?.slug) return null;
    return products.find((p: StorefrontProduct) => p.slug === params.slug || p.id === params.slug) || null;
  }, [params, products]);

  // Advanced Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      // Search
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
      // Category
      const matchCat = !selectedCategory || p.category.toLowerCase() === selectedCategory.toLowerCase();
      // Veg / Non-Veg
      const matchVeg = vegFilter === 'all' ? true : vegFilter === 'veg' ? p.isVeg !== false : p.isVeg === false;
      // Bestseller
      const matchBest = !bestsellerOnly || p.isBestseller || p.featured;
      // Price Range
      let matchPrice = true;
      if (priceRange === '0-300') matchPrice = p.priceCents <= 30000;
      else if (priceRange === '300-500') matchPrice = p.priceCents > 30000 && p.priceCents <= 50000;
      else if (priceRange === '500-1000') matchPrice = p.priceCents > 50000 && p.priceCents <= 100000;
      else if (priceRange === '1000+') matchPrice = p.priceCents > 100000;

      return matchSearch && matchCat && matchVeg && matchBest && matchPrice;
    });

    // Sorting
    if (sortBy === 'price_asc') {
      result.sort((a, b) => a.priceCents - b.priceCents);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.priceCents - a.priceCents);
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'bestseller') {
      result.sort((a, b) => (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0));
    }

    return result;
  }, [products, searchQuery, selectedCategory, vegFilter, bestsellerOnly, priceRange, sortBy]);

  // Handlers
  const saveSearchTerm = (term: string) => {
    if (!term.trim()) return;
    const clean = term.trim();
    const updated = [clean, ...recentSearches.filter(s => s !== clean)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('raj_recent_searches', JSON.stringify(updated));
  };

  const handleCheckPincode = async (targetPin: string) => {
    const clean = targetPin.trim();
    if (!/^[1-9][0-9]{5}$/.test(clean)) {
      showToast('Please enter a valid 6-digit Indian PIN code.', 'error');
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

  const addToCart = (product: StorefrontProduct) => {
    if (!shopSettings.isStoreOpen) {
      showToast('Store is currently closed for new orders.', 'error');
      return;
    }
    setCart((prev) => {
      const exists = prev.find((item) => item.product.id === product.id);
      if (exists) {
        return prev.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, { product, quantity: 1 }];
    });
    setShowCartDrawer(true);
    showToast(`Added ${product.name} to bag!`, 'success');
  };

  const toggleFavorite = async (product: StorefrontProduct) => {
    const isFav = favorites.includes(product.id);
    const updatedFavs = isFav ? favorites.filter(id => id !== product.id) : [...favorites, product.id];
    setFavorites(updatedFavs);
    localStorage.setItem('raj_favorites', JSON.stringify(updatedFavs));

    if (token) {
      try {
        await fetch(getApiUrl('/api/v1/auth/favorites/toggle'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ productId: product.id }),
        });
      } catch {}
    }
    showToast(isFav ? 'Removed from favorites' : 'Added to favorites!', 'success');
  };

  const shareProduct = (product: StorefrontProduct) => {
    const url = `https://sundarvan.xyz/products/${product.slug}`;
    navigator.clipboard.writeText(url);
    showToast('Product link copied to clipboard!', 'success');
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string) || '';
    const password = (formData.get('password') as string) || '';
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
        setOtpCode('');
        setResendCooldown(45);
      } else if (data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('raj_token', data.token);
        localStorage.setItem('raj_user', JSON.stringify(data.user));
        setShowAuthModal(false);
        showToast(`Welcome back, ${data.user.firstName}!`, 'success');
      } else {
        setAuthError(data.error || data.message || 'Login failed.');
      }
    } catch {
      setAuthError('Connection failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const firstName = (formData.get('firstName') as string) || '';
    const lastName = (formData.get('lastName') as string) || '';
    const mobileNumber = (formData.get('mobileNumber') as string) || '';
    const email = (formData.get('email') as string) || '';
    const password = (formData.get('password') as string) || '';
    const confirmPassword = (formData.get('confirmPassword') as string) || '';
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
        setOtpCode('');
        setResendCooldown(45);
      } else if (data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('raj_token', data.token);
        localStorage.setItem('raj_user', JSON.stringify(data.user));
        setShowAuthModal(false);
        showToast('Account created successfully!', 'success');
      } else {
        setAuthError(data.error || 'Registration failed.');
      }
    } catch {
      setAuthError('Connection failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
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
        showToast('Email verified successfully!', 'success');
      } else {
        setAuthError(data.error || 'Invalid OTP code.');
      }
    } catch {
      setAuthError('Verification failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setAuthLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/auth/resend-login-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setAuthSuccess(`New OTP code sent to ${pendingEmail}`);
        setResendCooldown(45);
      } else {
        setAuthError(data.error || 'Failed to resend OTP.');
      }
    } catch {
      setAuthError('Failed to resend code.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string) || '';
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(getApiUrl('/api/v1/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setAuthSuccess('Password reset link and OTP token sent to your email.');
        setPendingEmail(email);
      } else {
        setAuthError(data.error || 'Failed to request reset.');
      }
    } catch {
      setAuthError('Failed to request reset.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string) || '';
    const tokenInput = (formData.get('token') as string) || '';
    const newPassword = (formData.get('newPassword') as string) || '';
    const confirmPassword = (formData.get('confirmPassword') as string) || '';
    if (newPassword !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(getApiUrl('/api/v1/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: tokenInput, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setAuthSuccess('Password updated! You can now sign in.');
        setTimeout(() => setAuthMode('login'), 2000);
      } else {
        setAuthError(data.error || 'Failed to reset password.');
      }
    } catch {
      setAuthError('Reset failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    try {
      const res = await fetch(getApiUrl('/api/v1/discounts/validate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountCode.trim(), subtotalCents: cartTotalCents, isFirstOrder: true }),
      });
      const data = await res.json();
      setDiscountResult(data);
      if (data.valid) showToast(`Coupon ${data.code} applied!`, 'success');
      else showToast(data.message || 'Invalid coupon code', 'error');
    } catch {
      setDiscountResult({ valid: false, message: 'Could not validate code.' });
    }
  };

  const handleCheckout = async () => {
    if (!token || !user) {
      setShowAuthModal(true);
      return;
    }
    if (!shopSettings.isStoreOpen) {
      showToast('Store is currently closed for new orders.', 'error');
      return;
    }
    if (!shippingAddress || shippingAddress.length < 5) {
      showToast('Please enter a valid shipping address.', 'error');
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

      if (res.status === 409) {
        const conflictData = await res.json();
        showToast(conflictData.error || 'Cart items updated by store.', 'error');
        return;
      }

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
        showToast('Order placed successfully!', 'success');
      } else {
        showToast(orderData.error || 'Failed to place order.', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during checkout.';
      showToast('Checkout error: ' + msg, 'error');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Cart Calculations
  const cartTotalCents = cart.reduce((acc, i) => acc + i.product.priceCents * i.quantity, 0);
  const packagingFeeCents = shopSettings.packagingFeeCents || 1000;
  const isFreeDelivery = cartTotalCents >= (shopSettings.freeDeliveryThresholdCents || 50000);
  const deliveryFeeCents = isFreeDelivery ? 0 : (shopSettings.flatDeliveryFeeCents || 3000);
  const discountCents = discountResult?.valid ? discountResult.discountCents : 0;
  const finalPayableCents = Math.max(100, cartTotalCents + packagingFeeCents + deliveryFeeCents - discountCents);

  return (
    <div className="min-h-screen bg-[#F7F2EA] text-[#0E3D42] font-sans flex flex-col justify-between">
      {/* Dynamic SEO Head & Structured Data */}
      {currentProduct ? (
        <SeoHead
          title={`${currentProduct.name} — RAJ TRADERS`}
          description={currentProduct.description || `Buy ${currentProduct.name} online at RAJ TRADERS with fast delivery in ${shopSettings.availableInLocation || 'Birsingpur Pali'}.`}
          image={currentProduct.imageUrl}
          url={`https://${shopSettings.shopDomain || 'sundarvan.xyz'}/products/${currentProduct.slug}`}
          type="product"
          productData={{
            name: currentProduct.name,
            description: currentProduct.description,
            image: currentProduct.imageUrl,
            priceCents: currentProduct.priceCents,
            slug: currentProduct.slug,
            category: currentProduct.category,
            inStock: currentProduct.inventory > 0,
            prepTimeMinutes: currentProduct.prepTimeMinutes,
          }}
          breadcrumbs={[
            { name: 'Home', item: `https://${shopSettings.shopDomain || 'sundarvan.xyz'}` },
            { name: currentProduct.category, item: `https://${shopSettings.shopDomain || 'sundarvan.xyz'}/?category=${encodeURIComponent(currentProduct.category)}` },
            { name: currentProduct.name, item: `https://${shopSettings.shopDomain || 'sundarvan.xyz'}/products/${currentProduct.slug}` }
          ]}
        />
      ) : location === '/account' ? (
        <SeoHead
          title="Customer Account & Orders — RAJ TRADERS"
          description="View past orders, track live deliveries, manage saved addresses, and update profile settings."
          url={`https://${shopSettings.shopDomain || 'sundarvan.xyz'}/account`}
          noIndex={true}
        />
      ) : selectedCategory ? (
        <SeoHead
          title={`${selectedCategory} Collection — RAJ TRADERS`}
          description={`Browse our premium ${selectedCategory} selection. Small-batch artisanal quality delivered to your doorstep in ${shopSettings.availableInLocation || 'Birsingpur Pali'}.`}
          url={`https://${shopSettings.shopDomain || 'sundarvan.xyz'}/?category=${encodeURIComponent(selectedCategory)}`}
        />
      ) : (
        <SeoHead
          title={`${shopSettings.shopName || 'RAJ TRADERS'} — Gourmet Bakery & Artisanal Products`}
          description={shopSettings.aboutUsText || 'Small-batch artisanal cakes, organic bakes, party decorations & specialty items.'}
          url={`https://${shopSettings.shopDomain || 'sundarvan.xyz'}`}
        />
      )}

      <div>

        {/* Top Store Open Status Alert Banner (if closed) */}
        {!shopSettings.isStoreOpen && (
          <div className="bg-amber-500 text-[#0E3D42] text-xs py-2 px-4 font-black flex items-center justify-center gap-2 shadow-sm">
            <AlertTriangle size={16} />
            <span>Store is currently closed for new orders. Browsing is active.</span>
          </div>
        )}

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

            {/* Search Input with Auto-complete */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-4 relative">
              <Search size={16} className="absolute left-3.5 text-[#0E3D42]/40" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveSearchTerm(searchQuery); }}
                placeholder="Search products, cakes or apparel..."
                className="w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#0E3D42] transition"
              />

              {/* Search History & Category Chips Dropdown */}
              {showSearchDropdown && (
                <div className="absolute top-12 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-[#0E3D42]/10 p-4 z-40 space-y-3">
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 mb-2">
                        <span>Recent Searches</span>
                        <button onClick={() => { setRecentSearches([]); localStorage.removeItem('raj_recent_searches'); }} className="hover:underline">Clear</button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recentSearches.map((term) => (
                          <button
                            key={term}
                            onClick={() => setSearchQuery(term)}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-semibold text-[#0E3D42]"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-[11px] font-bold text-gray-400 mb-2">Categories</div>
                    <div className="flex flex-wrap gap-1.5">
                      {['Bakery', 'Apparel', 'Home'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => { setSelectedCategory(cat); setSearchQuery(''); }}
                          className="px-3 py-1.5 bg-[#0E3D42]/5 hover:bg-[#0E3D42]/10 rounded-xl text-xs font-bold text-[#0E3D42]"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <button onClick={() => setShowNotificationsModal(true)} className="relative p-2.5 rounded-xl bg-[#0E3D42]/5 hover:bg-[#0E3D42]/10 transition text-[#0E3D42]">
                <Bell size={18} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black size-4 rounded-full flex items-center justify-center">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* User Account / Sign In */}
              {user ? (
                <Link href="/account" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0E3D42]/5 hover:bg-[#0E3D42]/10 transition text-[#0E3D42]">
                  <div className="size-6 rounded-full bg-[#0E3D42] text-white flex items-center justify-center text-xs font-black">
                    {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-bold hidden sm:inline">{user.firstName}</span>
                </Link>
              ) : (
                <button onClick={() => { setAuthMode('login'); setOtpRequired(false); setOtpCode(''); setAuthError(null); setShowAuthModal(true); }} className="px-4 py-2 rounded-xl text-xs font-extrabold border border-[#0E3D42] text-[#0E3D42] hover:bg-[#0E3D42] hover:text-white transition">
                  Sign In / Register
                </button>
              )}

              {/* Cart Bag Icon */}
              <button onClick={() => setShowCartDrawer(true)} className="relative p-2.5 rounded-xl bg-[#0E3D42] text-white hover:bg-[#0E3D42]/90 transition shadow-sm">
                <ShoppingBag size={18} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#E2A93B] text-[#0E3D42] text-[10px] font-black size-5 rounded-full flex items-center justify-center shadow">
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Router */}
        <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          {location === '/account' ? (
            !user || !token ? (
              <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-3xl border border-[#0E3D42]/10 shadow-xl text-center space-y-5">
                <div className="size-16 mx-auto rounded-2xl bg-[#0E3D42]/10 text-[#0E3D42] flex items-center justify-center">
                  <User size={32} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-[#0E3D42]">Sign In to View Account</h1>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">Access your past orders, saved delivery addresses, wishlist & account settings.</p>
                </div>
                <button
                  onClick={() => { setAuthMode('login'); setOtpRequired(false); setOtpCode(''); setAuthError(null); setShowAuthModal(true); }}
                  className="w-full py-3 bg-[#0E3D42] text-white text-xs font-black rounded-2xl hover:bg-[#0E3D42]/90 shadow-md transition"
                >
                  Sign In / Register
                </button>
              </div>
            ) : (
            /* Full-Page Customer Profile Portal */
            <div className="space-y-6">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#0E3D42]/10 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="size-16 rounded-full bg-[#0E3D42] text-[#E2A93B] font-black text-2xl flex items-center justify-center shadow-inner">
                    {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-[#0E3D42]">{user?.firstName} {user?.lastName}</h1>
                    <div className="text-xs font-semibold text-gray-500 flex flex-wrap items-center gap-3 mt-1">
                      <span>📱 {user?.mobileNumber}</span>
                      <span>✉️ {user?.email}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setUser(null);
                    setToken(null);
                    localStorage.removeItem('raj_user');
                    localStorage.removeItem('raj_token');
                    setLocation('/');
                    showToast('Logged out successfully', 'info');
                  }}
                  className="px-4 py-2 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 hover:bg-red-100 transition"
                >
                  Logout Account
                </button>
              </div>

              {/* Sidebar + Content Grid */}
              <div className="grid md:grid-cols-4 gap-6">
                {/* Sidebar Navigation */}
                <div className="bg-white p-4 rounded-3xl border border-[#0E3D42]/10 shadow-sm space-y-1 h-fit">
                  {[
                    { id: 'orders', label: 'My Orders', icon: Package },
                    { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
                    { id: 'favorites', label: 'Wishlist & Favorites', icon: Heart },
                    { id: 'settings', label: 'Settings & Security', icon: Lock },
                    { id: 'profile', label: 'Edit Profile', icon: User },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeAccountTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveAccountTab(tab.id as any)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-extrabold transition ${isActive ? 'bg-[#0E3D42] text-white shadow' : 'text-[#0E3D42] hover:bg-gray-50'}`}
                      >
                        <Icon size={16} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Content Panel */}
                <div className="md:col-span-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#0E3D42]/10 shadow-sm min-h-[400px]">
                  {activeAccountTab === 'orders' && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-black text-[#0E3D42]">Past Orders & Receipts</h2>
                      {ordersLoading ? (
                        <div className="space-y-4">
                          {[1, 2].map(n => <div key={n} className="h-28 bg-gray-100 animate-pulse rounded-2xl" />)}
                        </div>
                      ) : customerOrders.length === 0 ? (
                        <div className="text-center py-12 space-y-3">
                          <Package size={40} className="mx-auto text-gray-300" />
                          <p className="text-sm font-bold text-gray-500">You have no orders yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {customerOrders.map((order) => (
                            <div key={order.id} className="p-5 rounded-2xl border border-gray-200 space-y-3 bg-gray-50/50">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-xs">
                                <div>
                                  <span className="font-black text-[#0E3D42]">{order.formattedOrderId}</span>
                                  <span className="text-gray-400 ml-2">{new Date(order.createdAt).toLocaleDateString()}</span>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${order.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {order.status}
                                </span>
                              </div>

                              <div className="space-y-2 text-xs">
                                {Array.isArray(order.items) && order.items.map((item: OrderItem, idx: number) => (
                                  <div key={idx} className="flex justify-between font-semibold">
                                    <span>{item.quantity}x {item.name || item.productName}</span>
                                    <span>{money(item.priceCents * item.quantity)}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="flex items-center justify-between pt-2 text-xs font-bold border-t">
                                <span>Total: {money(order.totalCents)}</span>
                                <a href={`mailto:${shopSettings.supportEmail}?subject=Order Cancellation Query ${order.formattedOrderId}`} className="text-xs font-bold text-[#0E3D42] hover:underline">
                                  Contact Support for Cancellation
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeAccountTab === 'addresses' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-[#0E3D42]">Saved Delivery Addresses</h2>
                      </div>
                      {addressLoading ? (
                        <div className="h-24 bg-gray-100 animate-pulse rounded-2xl" />
                      ) : savedAddresses.length === 0 ? (
                        <div className="text-center py-12 space-y-3">
                          <MapPin size={40} className="mx-auto text-gray-300" />
                          <p className="text-sm font-bold text-gray-500">No saved addresses yet. PIN: {pincode}, {city} is active.</p>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          {savedAddresses.map((addr) => (
                            <div key={addr.id} className="p-4 rounded-2xl border border-gray-200 flex justify-between items-start">
                              <div>
                                <span className="px-2 py-0.5 bg-[#0E3D42]/10 text-[#0E3D42] text-[10px] font-black rounded-md uppercase">{addr.label}</span>
                                <p className="text-xs font-bold mt-2 text-[#0E3D42]">{addr.fullAddress}</p>
                                <p className="text-[11px] text-gray-500 font-semibold">{addr.city}, {addr.pincode}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeAccountTab === 'favorites' && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-black text-[#0E3D42]">Your Wishlist</h2>
                      {favorites.length === 0 ? (
                        <div className="text-center py-12 space-y-3">
                          <Heart size={40} className="mx-auto text-gray-300" />
                          <p className="text-sm font-bold text-gray-500">Your wishlist is empty.</p>
                        </div>
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-4">
                          {products.filter(p => favorites.includes(p.id)).map(product => (
                            <div key={product.id} className="p-4 rounded-2xl border border-gray-200 flex gap-3 items-center">
                              <img src={product.imageUrl} alt={product.name} className="size-16 rounded-xl object-cover" />
                              <div className="flex-1">
                                <div className="font-bold text-xs text-[#0E3D42]">{product.name}</div>
                                <div className="text-xs font-extrabold text-[#0E3D42]">{money(product.priceCents)}</div>
                              </div>
                              <button onClick={() => addToCart(product)} className="px-3 py-1.5 bg-[#0E3D42] text-white text-xs font-bold rounded-lg">Add</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeAccountTab === 'settings' && (
                    <div className="space-y-6 max-w-md">
                      <div>
                        <h2 className="text-xl font-black text-[#0E3D42]">Account Security</h2>
                        <p className="text-xs text-gray-500 font-semibold mt-1">Verify your current password to set a new password. Rate limited to 5 attempts per 60 minutes.</p>
                      </div>

                      {changePassNotice && (
                        <div className={`p-4 rounded-2xl text-xs font-extrabold ${changePassNotice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                          {changePassNotice.message}
                        </div>
                      )}

                      <form onSubmit={async (e: FormEvent<HTMLFormElement>) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const formData = new FormData(form);
                        const oldPass = (formData.get('oldPassword') as string) || '';
                        const newPass = (formData.get('newPassword') as string) || '';
                        const confirmPass = (formData.get('confirmPassword') as string) || '';

                        if (newPass !== confirmPass) {
                          setChangePassNotice({ type: 'error', message: 'New password and confirmation password do not match.' });
                          return;
                        }
                        if (newPass.length < 6) {
                          setChangePassNotice({ type: 'error', message: 'New password must be at least 6 characters.' });
                          return;
                        }

                        setChangePassLoading(true);
                        setChangePassNotice(null);

                        try {
                          const res = await fetch(getApiUrl('/api/v1/auth/change-password'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass, confirmPassword: confirmPass }),
                          });
                          const data = await res.json();

                          if (!res.ok) {
                            setChangePassNotice({ type: 'error', message: data.error || 'Failed to update password.' });
                          } else {
                            setChangePassNotice({ type: 'success', message: 'Password changed successfully!' });
                            showToast('Password changed successfully!', 'success');
                            e.target.reset();
                          }
                        } catch {
                          setChangePassNotice({ type: 'error', message: 'Network error. Please try again.' });
                        } finally {
                          setChangePassLoading(false);
                        }
                      }} className="space-y-4">
                        <div>
                          <label className="block text-xs font-extrabold text-[#0E3D42] mb-1">Current Password</label>
                          <input required type="password" name="oldPassword" placeholder="Enter current password" className="w-full p-3 text-xs font-semibold rounded-xl border border-gray-300 focus:outline-none focus:border-[#0E3D42]" />
                        </div>

                        <div>
                          <label className="block text-xs font-extrabold text-[#0E3D42] mb-1">New Password</label>
                          <input required type="password" name="newPassword" placeholder="New password (min 6 characters)" className="w-full p-3 text-xs font-semibold rounded-xl border border-gray-300 focus:outline-none focus:border-[#0E3D42]" />
                        </div>

                        <div>
                          <label className="block text-xs font-extrabold text-[#0E3D42] mb-1">Confirm New Password</label>
                          <input required type="password" name="confirmPassword" placeholder="Re-enter new password" className="w-full p-3 text-xs font-semibold rounded-xl border border-gray-300 focus:outline-none focus:border-[#0E3D42]" />
                        </div>

                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] font-bold text-amber-900 flex items-center gap-2">
                          <ShieldCheck size={16} className="text-amber-700 shrink-0" />
                          <span>Security Policy: Max 5 password change attempts per 60 minutes.</span>
                        </div>

                        <button type="submit" disabled={changePassLoading} className="w-full py-3 bg-[#0E3D42] text-white font-extrabold text-xs rounded-xl shadow hover:bg-[#0E3D42]/90 transition disabled:bg-gray-400">
                          {changePassLoading ? 'Verifying & Updating...' : 'Update Password'}
                        </button>
                      </form>
                    </div>
                  )}

                  {activeAccountTab === 'profile' && (
                    <div className="space-y-6 max-w-md">
                      <h2 className="text-xl font-black text-[#0E3D42]">Edit Profile Details</h2>
                      <form onSubmit={async (e: FormEvent<HTMLFormElement>) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const formData = new FormData(form);
                        const firstName = (formData.get('firstName') as string) || '';
                        const lastName = (formData.get('lastName') as string) || '';
                        const mobileNumber = (formData.get('mobileNumber') as string) || '';
                        try {
                          const res = await fetch(getApiUrl('/api/v1/auth/profile'), {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ firstName, lastName, mobileNumber }),
                          });
                          const data = await res.json();
                          if (!res.ok) {
                            showToast(data.error || 'Profile update failed', 'error');
                          } else if (data.user) {
                            setUser(data.user);
                            localStorage.setItem('raj_user', JSON.stringify(data.user));
                            showToast('Profile updated successfully!', 'success');
                          }
                        } catch {
                          showToast('Profile update failed', 'error');
                        }
                      }} className="space-y-3">
                        <div>
                          <label className="block text-xs font-extrabold text-[#0E3D42] mb-1">First Name</label>
                          <input required type="text" name="firstName" defaultValue={user?.firstName} placeholder="First Name" className="w-full p-3 text-xs font-semibold rounded-xl border border-gray-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-extrabold text-[#0E3D42] mb-1">Last Name</label>
                          <input required type="text" name="lastName" defaultValue={user?.lastName} placeholder="Last Name" className="w-full p-3 text-xs font-semibold rounded-xl border border-gray-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-extrabold text-[#0E3D42] mb-1">Mobile Number (10 digits or +91...)</label>
                          <input required type="tel" name="mobileNumber" defaultValue={user?.mobileNumber} maxLength={13} placeholder="e.g. 9876543210 or +919876543210" className="w-full p-3 text-xs font-semibold rounded-xl border border-gray-300" />
                        </div>
                        <button type="submit" className="w-full py-3 bg-[#0E3D42] text-white font-extrabold text-xs rounded-xl shadow">Save Changes</button>
                      </form>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )) : currentProduct ? (


            /* Standalone Product Detail View Route /products/:slug */
            <div className="space-y-8">
              <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-[#0E3D42]/70 hover:text-[#0E3D42] bg-white px-3.5 py-2 rounded-xl border border-[#0E3D42]/10 shadow-sm">
                ← Back to Catalog
              </Link>

              <div className="grid md:grid-cols-2 gap-10 bg-white p-6 sm:p-10 rounded-3xl border border-[#0E3D42]/10 shadow-xl">
                <div className="relative rounded-2xl overflow-hidden bg-[#EFE8DC] aspect-square flex items-center justify-center">
                  <img src={currentProduct.imageUrl} alt={currentProduct.name} className="w-full h-full object-cover" />
                  <span className="absolute bottom-4 left-4 bg-black/75 text-white text-xs px-3 py-1 rounded-full font-semibold backdrop-blur-sm">
                    ⏱️ {currentProduct.prepTimeMinutes || 30}m prep
                  </span>
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => toggleFavorite(currentProduct)} className="p-2.5 rounded-full bg-white/90 text-red-600 hover:bg-white shadow transition">
                      <Heart size={18} fill={favorites.includes(currentProduct.id) ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={() => shareProduct(currentProduct)} className="p-2.5 rounded-full bg-white/90 text-[#0E3D42] hover:bg-white shadow transition">
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex items-center gap-2">
                      {currentProduct.isVeg !== false ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-300">
                          🟢 100% Veg
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-md border border-red-300">
                          🔺 Non-Veg
                        </span>
                      )}
                      {(currentProduct.isBestseller || currentProduct.featured) && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300">
                          ⭐ Bestseller
                        </span>
                      )}
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-black mt-2 text-[#0E3D42] tracking-tight">{currentProduct.name}</h1>

                    <div className="mt-4 flex items-baseline gap-4">
                      <span className="text-3xl font-extrabold text-[#0E3D42]">{money(currentProduct.priceCents)}</span>
                      {currentProduct.compareAtPriceCents && (
                        <span className="text-lg text-gray-400 line-through font-semibold">{money(currentProduct.compareAtPriceCents)}</span>
                      )}
                    </div>

                    <p className="mt-5 text-sm leading-relaxed text-[#0E3D42]/80 font-medium">{currentProduct.description}</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 pt-2">
                    <button onClick={() => addToCart(currentProduct)} className="w-full py-4 bg-[#0E3D42] text-white font-extrabold rounded-2xl shadow-lg hover:bg-[#0E3D42]/95 transition flex items-center justify-center gap-2 text-sm">
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
            /* Catalog Grid View with Sorting & Shimmer Skeleton Loaders */
            <div className="space-y-8">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <h1 className="text-4xl font-black tracking-tight text-[#0E3D42]">Made for the Everyday</h1>
                <p className="text-sm font-medium text-[#0E3D42]/70">Small-batch artisanal cakes, organic bakes, apparel & specialty store items.</p>
              </div>

              {/* Advanced Controls Filter & Sort Bar */}
              <div className="bg-white p-4 rounded-3xl border border-[#0E3D42]/10 shadow-sm flex flex-wrap items-center justify-between gap-4">
                {/* Category Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition ${!selectedCategory ? 'bg-[#0E3D42] text-white' : 'bg-gray-100 text-[#0E3D42]'}`}
                  >
                    All
                  </button>
                  {['Bakery', 'Apparel', 'Home'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold transition ${selectedCategory === cat ? 'bg-[#0E3D42] text-white' : 'bg-gray-100 text-[#0E3D42]'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Filters & Sorting */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Veg Toggle */}
                  <button
                    onClick={() => setVegFilter(vegFilter === 'veg' ? 'all' : 'veg')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${vegFilter === 'veg' ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-white border-gray-200 text-gray-700'}`}
                  >
                    🟢 Veg Only
                  </button>

                  {/* Bestseller Filter */}
                  <button
                    onClick={() => setBestsellerOnly(!bestsellerOnly)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${bestsellerOnly ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-700'}`}
                  >
                    ⭐ Bestsellers
                  </button>

                  {/* Sort Dropdown */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-bold rounded-xl text-[#0E3D42] focus:outline-none"
                  >
                    <option value="relevance">Relevance (Default)</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="newest">Newest First</option>
                    <option value="bestseller">Bestseller First</option>
                  </select>
                </div>
              </div>

              {/* Price Range Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
                <span className="text-gray-400">Price Range:</span>
                {[
                  { label: 'All Prices', val: null },
                  { label: 'Under ₹300', val: '0-300' },
                  { label: '₹300 - ₹500', val: '300-500' },
                  { label: '₹500 - ₹1000', val: '500-1000' },
                  { label: '₹1000+', val: '1000+' },
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={() => setPriceRange(p.val)}
                    className={`px-3 py-1 rounded-full border transition ${priceRange === p.val ? 'bg-[#0E3D42] text-white border-[#0E3D42]' : 'bg-white border-gray-200 text-[#0E3D42]'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {productsLoading ? (
                /* Shimmer Skeleton Loaders */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <div key={n} className="bg-white rounded-3xl p-4 border border-[#0E3D42]/10 space-y-4 animate-pulse">
                      <div className="aspect-square bg-gray-200 rounded-2xl" />
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white rounded-3xl border border-[#0E3D42]/10 shadow-sm max-w-md mx-auto my-6 space-y-4">
                  <ShoppingBag size={32} className="mx-auto text-gray-400" />
                  <h3 className="text-lg font-black text-[#0E3D42]">No Products Found</h3>
                  <p className="text-xs text-gray-500 font-medium">Try clearing your filters or searching for another item.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((product: StorefrontProduct) => (
                    <div key={product.id} className="bg-white rounded-3xl border border-[#0E3D42]/10 overflow-hidden shadow-md hover:shadow-xl transition group flex flex-col justify-between">
                      <div>
                        <div className="relative aspect-square bg-[#EFE8DC] overflow-hidden">
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            {product.isVeg !== false ? (
                              <span className="bg-emerald-900/90 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full backdrop-blur-sm">🟢 Veg</span>
                            ) : (
                              <span className="bg-red-900/90 text-red-300 text-[10px] font-black px-2 py-0.5 rounded-full backdrop-blur-sm">🔺 Non-Veg</span>
                            )}
                            {(product.isBestseller || product.featured) && (
                              <span className="bg-amber-500 text-[#0E3D42] text-[10px] font-black px-2 py-0.5 rounded-full shadow">⭐ Bestseller</span>
                            )}
                          </div>
                          <button onClick={() => toggleFavorite(product)} className="absolute top-3 right-3 p-2 rounded-full bg-white/80 text-red-600 hover:bg-white shadow">
                            <Heart size={16} fill={favorites.includes(product.id) ? 'currentColor' : 'none'} />
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
              )}
            </div>
          )}
        </main>
      </div>

      {/* Swiggy-Inspired Footer Section */}
      <footer className="bg-[#0E3D42] text-white pt-16 pb-8 border-t border-[#E2A93B]/20">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Company / About Us */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src="/RAJTRADERS-LOGO.png" alt="RAJ TRADERS" className="size-10 object-contain rounded-xl border border-[#E2A93B]" />
              <span className="text-xl font-black tracking-tight text-white">RAJ TRADERS</span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed font-medium">
              {shopSettings.aboutUsText || 'Premium cakes, party decorations & artisanal local delights.'}
            </p>
          </div>

          {/* Contact Us */}
          <div className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#E2A93B]">Contact Us</h3>
            <ul className="text-xs text-white/80 space-y-2 font-medium">
              <li><a href={`mailto:${shopSettings.supportEmail}`} className="hover:underline">Help & Support</a></li>
              <li><span>Email: {shopSettings.supportEmail}</span></li>
            </ul>
          </div>

          {/* Available In Location */}
          <div className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#E2A93B]">Available in</h3>
            <div className="flex items-center gap-2 text-xs font-bold text-white bg-white/10 p-3 rounded-xl border border-white/10 w-fit">
              <MapPin size={16} className="text-[#E2A93B]" />
              <span>{shopSettings.availableInLocation || 'BIRSINGPUR PALI'}</span>
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#E2A93B]">Social Links</h3>
            <div className="flex items-center gap-3">
              {shopSettings.socialLinkedin && <a href={shopSettings.socialLinkedin} target="_blank" rel="noreferrer" className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition"><Linkedin size={18} /></a>}
              {shopSettings.socialInstagram && <a href={shopSettings.socialInstagram} target="_blank" rel="noreferrer" className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition"><Instagram size={18} /></a>}
              {shopSettings.socialFacebook && <a href={shopSettings.socialFacebook} target="_blank" rel="noreferrer" className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition"><Facebook size={18} /></a>}
              {shopSettings.socialTwitter && <a href={shopSettings.socialTwitter} target="_blank" rel="noreferrer" className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition"><Twitter size={18} /></a>}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 border-t border-white/10 mt-12 pt-6 text-center text-xs font-bold text-white/50">
          © 2026 RAJ TRADERS. All rights reserved. Built with excellence.
        </div>
      </footer>

      {/* Cart & Checkout Drawer */}
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

                  {/* Fee Breakdown */}
                  <div className="bg-[#F7F2EA] p-4 rounded-2xl space-y-2 text-xs font-bold border border-[#0E3D42]/10">
                    <div className="flex justify-between"><span>Items Subtotal:</span><span>{money(cartTotalCents)}</span></div>
                    <div className="flex justify-between"><span>Packaging Fee:</span><span>{money(packagingFeeCents)}</span></div>
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span className={isFreeDelivery ? 'text-emerald-700' : ''}>{isFreeDelivery ? 'FREE' : money(deliveryFeeCents)}</span>
                    </div>
                    {discountResult?.valid && (
                      <div className="flex justify-between text-emerald-700"><span>Discount ({discountResult.code}):</span><span>-{money(discountCents)}</span></div>
                    )}
                    <div className="flex justify-between text-sm font-black border-t pt-2 text-[#0E3D42]"><span>Final Payable:</span><span>{money(finalPayableCents)}</span></div>
                  </div>

                  {/* Discount Code Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-[#0E3D42]">Discount Code</label>
                      <button onClick={() => setShowCouponsDrawer(!showCouponsDrawer)} className="text-xs font-bold text-[#E2A93B] hover:underline flex items-center gap-1">
                        <Tag size={12} /> View Coupons
                      </button>
                    </div>
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
                  </div>

                  {/* Payment Method Selector if COD Enabled */}
                  {shopSettings.isCodEnabled && (
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-[#0E3D42]">Payment Method</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setPaymentMethod('online')}
                          className={`p-2.5 rounded-xl border text-xs font-bold ${paymentMethod === 'online' ? 'bg-[#0E3D42] text-white border-[#0E3D42]' : 'bg-white border-gray-200 text-gray-700'}`}
                        >
                          Online Payment
                        </button>
                        <button
                          onClick={() => setPaymentMethod('cod')}
                          className={`p-2.5 rounded-xl border text-xs font-bold ${paymentMethod === 'cod' ? 'bg-[#0E3D42] text-white border-[#0E3D42]' : 'bg-white border-gray-200 text-gray-700'}`}
                        >
                          Cash on Delivery
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Shipping Address Input */}
                  <div className="space-y-2">
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
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut || !shopSettings.isStoreOpen}
                  className="w-full py-4 bg-[#0E3D42] text-white font-extrabold rounded-2xl shadow-lg hover:bg-[#0E3D42]/95 transition disabled:bg-gray-400"
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
                <h2 className="text-xl font-black text-[#0E3D42]">{otpRequired ? 'Email Verification' : authMode === 'login' ? 'Sign In' : authMode === 'register' ? 'Create Account' : authMode === 'forgot_password' ? 'Forgot Password' : 'Reset Password'}</h2>
              </div>
              <button onClick={() => { setShowAuthModal(false); setOtpRequired(false); setAuthError(null); setAuthSuccess(null); }} className="p-2 rounded-lg hover:bg-gray-100"><X size={20} /></button>
            </div>

            {authError && <div className="p-3 bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200">{authError}</div>}
            {authSuccess && <div className="p-3 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2"><CheckCircle2 size={16} className="shrink-0" />{authSuccess}</div>}

            {otpRequired ? (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-xs text-gray-500 font-medium">A 6-digit verification code was sent to <strong className="text-[#0E3D42]">{pendingEmail}</strong></p>
                <input required type="text" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="6-Digit OTP" autoComplete="one-time-code" className="w-full p-3 text-center tracking-widest text-xl font-bold rounded-xl border border-gray-300" />
                <button type="submit" disabled={authLoading} className="w-full py-3.5 bg-[#0E3D42] text-white font-extrabold rounded-xl shadow">{authLoading ? 'Verifying...' : 'Verify OTP'}</button>
                <div className="flex justify-between items-center text-xs pt-1">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || authLoading}
                    className={`font-extrabold transition-colors ${resendCooldown > 0 || authLoading ? 'text-gray-400 cursor-not-allowed' : 'text-[#0E3D42] hover:underline cursor-pointer'}`}
                  >
                    {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Didn't receive code? Resend OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOtpRequired(false); setAuthError(null); }}
                    className="hover:underline text-gray-500 font-semibold"
                  >
                    Change Email
                  </button>
                </div>
              </form>
            ) : authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <input required type="email" name="email" placeholder="Email Address" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <input required type="password" name="password" placeholder="Password" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <button type="submit" disabled={authLoading} className="w-full py-3.5 bg-[#0E3D42] text-white font-extrabold rounded-xl shadow hover:bg-[#0E3D42]/90 transition">{authLoading ? 'Signing in...' : 'Sign In'}</button>
                <div className="flex justify-between items-center text-xs font-bold text-[#0E3D42]/70 pt-1">
                  <button type="button" onClick={() => { setAuthMode('forgot_password'); setAuthError(null); }} className="underline text-[#0E3D42]">
                    Forgot Password?
                  </button>
                  <div>
                    Don't have an account? <button type="button" onClick={() => { setAuthMode('register'); setAuthError(null); }} className="underline text-[#0E3D42]">Register</button>
                  </div>
                </div>
              </form>
            ) : authMode === 'forgot_password' ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Enter your account email. We will send a 60-minute password reset link and OTP recovery token directly to your inbox.
                </p>
                <input required type="email" name="email" defaultValue={pendingEmail} placeholder="Email Address" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <button type="submit" disabled={authLoading} className="w-full py-3.5 bg-[#0E3D42] text-white font-extrabold rounded-xl shadow">
                  {authLoading ? 'Sending Reset Link...' : 'Send Reset Link & OTP Token'}
                </button>
                <div className="flex justify-between text-xs font-bold text-[#0E3D42]/70 pt-1">
                  <button type="button" onClick={() => { setAuthMode('login'); setAuthError(null); }} className="underline text-[#0E3D42]">
                    Back to Sign In
                  </button>
                  <button type="button" onClick={() => { setAuthMode('reset_password'); setAuthError(null); }} className="underline text-[#0E3D42]">
                    Have a Reset Token? Reset
                  </button>
                </div>
              </form>
            ) : authMode === 'reset_password' ? (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Enter the reset code/token sent to your email along with your new password. (Token is valid for 60 minutes).
                </p>
                <input required type="email" name="email" defaultValue={pendingEmail} placeholder="Email Address" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <input required type="text" name="token" defaultValue={resetToken} placeholder="Reset Token / OTP Code (from Email)" autoComplete="off" className="w-full p-3 text-sm font-mono font-bold tracking-wide rounded-xl border border-gray-300" />
                <input required type="password" name="newPassword" placeholder="New Password (min 6 chars)" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <input required type="password" name="confirmPassword" placeholder="Confirm New Password" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <button type="submit" disabled={authLoading} className="w-full py-3.5 bg-[#0E3D42] text-white font-extrabold rounded-xl shadow">
                  {authLoading ? 'Updating Password...' : 'Update Password'}
                </button>
                <div className="text-center text-xs font-bold text-[#0E3D42]/70 pt-1">
                  Remembered your password? <button type="button" onClick={() => { setAuthMode('login'); setAuthError(null); }} className="underline text-[#0E3D42]">Sign In</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <input required type="text" name="firstName" placeholder="First Name" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <input required type="text" name="lastName" placeholder="Last Name" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <input required type="tel" name="mobileNumber" maxLength={13} placeholder="Mobile Number (e.g. 9876543210 or +919876543210)" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />

                <input required type="email" name="email" placeholder="Email Address" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <input required type="password" name="password" placeholder="Password" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <input required type="password" name="confirmPassword" placeholder="Confirm Password" className="w-full p-3 text-sm font-semibold rounded-xl border border-gray-300" />
                <button type="submit" disabled={authLoading} className="w-full py-3.5 bg-[#0E3D42] text-white font-extrabold rounded-xl shadow">{authLoading ? 'Registering...' : 'Register Account'}</button>
                <div className="text-center text-xs font-bold text-[#0E3D42]/70">
                  Already have an account? <button type="button" onClick={() => { setAuthMode('login'); setAuthError(null); }} className="underline text-[#0E3D42]">Sign In</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-[#0E3D42] text-base flex items-center gap-2"><Bell size={18} /> Notifications</h3>
              <button onClick={() => setShowNotificationsModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            {notifications.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No new notifications.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 bg-gray-50 rounded-xl border text-xs">
                    <div className="font-extrabold text-[#0E3D42]">{n.title}</div>
                    <div className="text-gray-600 font-medium">{n.message}</div>
                  </div>
                ))}
              </div>
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

      {/* Modern Floating Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-bounce-in max-w-sm">
          <div className={`p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs font-bold border transition-all ${toast.type === 'success' ? 'bg-[#0E3D42] text-white border-emerald-500/50' : toast.type === 'error' ? 'bg-red-900 text-white border-red-500/50' : 'bg-[#0E3D42] text-white border-[#E2A93B]/50'}`}>
            <CheckCircle2 size={18} className={toast.type === 'success' ? 'text-emerald-400' : 'text-[#E2A93B]'} />
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => setToast(null)} className="p-1 hover:bg-white/20 rounded-md transition"><X size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
