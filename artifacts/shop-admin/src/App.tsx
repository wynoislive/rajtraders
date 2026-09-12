import { type ButtonHTMLAttributes, type Dispatch, type ReactNode, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity as ActivityIcon,
  Archive,
  ArrowUpRight,
  BadgePercent,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Clock,
  CloudUpload,
  Copy,
  CreditCard,
  DollarSign,
  Eye,
  Key,
  LayoutDashboard,
  Lock,
  Mail,
  MapPin,
  Menu,
  Navigation,
  Package,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Share2,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Timer,
  Trash2,
  UserCheck,
  UserRoundPlus,
  UsersRound,
  X,
} from 'lucide-react';
import {
  getGetAdminSummaryQueryKey,
  getGetProductQueryKey,
  getGetStorefrontSummaryQueryKey,
  getHealthCheckQueryKey,
  getListAdminProductsQueryKey,
  getListDiscountsQueryKey,
  getListProductsQueryKey,
  getListRegistrationPoliciesQueryKey,
  useArchiveProduct,
  useCheckRegistrationEligibility,
  useCreateDiscount,
  useCreateProduct,
  useGetAdminSummary,
  useGetProduct,
  useGetStorefrontSummary,
  useHealthCheck,
  useListAdminProducts,
  useListDiscounts,
  useListProducts,
  useListRegistrationPolicies,
  useUpdateDiscount,
  useUpdateProduct,
  useUpdateRegistrationPolicy,
  useValidateDiscount,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';

const queryClient = new QueryClient();

type Tone = 'teal' | 'yellow' | 'coral' | 'green' | 'slate';

// Shared shop settings context for sidebar/overview to access shopName dynamically
import { createContext, useContext } from 'react';
const ShopContext = createContext<{ shopName: string; shopDomain: string }>({ shopName: 'RAJ TRADERS', shopDomain: 'sundarvan.xyz' });

function getApiUrl(path: string): string {
  const apiTarget = import.meta.env.VITE_API_TARGET || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://api.sundarvan.xyz' : '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return apiTarget ? `${apiTarget.replace(/\/+$/, '')}${cleanPath}` : cleanPath;
}

function money(cents = 0) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(cents / 100);
}

function shortDate(value?: string | null) {
  if (!value) return 'No expiry';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function relativeTime(value?: string | null) {
  if (!value) return 'just now';
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function Button({ children, variant = 'primary', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' | 'outline' | 'danger' }) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
        variant === 'quiet' && 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]',
        variant === 'outline' && 'border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]',
        variant === 'danger' && 'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] shadow-sm hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
        className,
      )}
    />
  );
}

function StatusPill({ children, tone = 'green' }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    teal: 'bg-[hsl(var(--primary)/.10)] text-[hsl(var(--primary))]',
    yellow: 'bg-[hsl(var(--secondary)/.25)] text-[hsl(32_73%_31%)]',
    coral: 'bg-[hsl(var(--accent)/.12)] text-[hsl(12_63%_42%)]',
    green: 'bg-[hsl(148_37%_43%/.13)] text-[hsl(148_37%_32%)]',
    slate: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
  };
  return <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[.08em]', tones[tone])}>{children}</span>;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cx('skeleton rounded-lg', className)} aria-hidden="true" />;
}

function EmptyState({ icon: Icon, title, detail, action }: { icon: typeof Package; title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] px-6 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[hsl(var(--secondary)/.28)] text-[hsl(var(--foreground))]"><Icon size={22} /></div>
      <h3 className="text-base font-extrabold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">{detail}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function ErrorState({ retry, detail = 'The operations service did not respond. Your work is safe.' }: { retry?: () => void; detail?: string }) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--destructive)/.22)] bg-[hsl(var(--destructive)/.06)] p-7">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))]"><CircleHelp size={20} /></div>
        <div>
          <h3 className="font-extrabold">We could not load this view</h3>
          <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{detail}</p>
          {retry && <Button variant="outline" className="mt-4" onClick={retry} data-testid="button-retry"><RefreshCw size={15} /> Try again</Button>}
        </div>
      </div>
    </div>
  );
}

function AdminGate({ children, isError, isLoading, retry }: { children: ReactNode; isError: boolean; isLoading: boolean; retry?: () => void }) {
  if (isLoading) {
    return <div className="space-y-5"><Skeleton className="h-28 w-full" /><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div><Skeleton className="h-72 w-full" /></div>;
  }
  if (isError) return <ErrorState retry={retry} detail="This is an authenticated operations area. Sign in to continue, or try again if your session just expired." />;
  return <>{children}</>;
}

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: Receipt },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/approvals', label: 'Approvals', icon: ClipboardCheck },
  { href: '/staff', label: 'Staff & RBAC', icon: ShieldCheck },
  { href: '/discounts', label: 'Discounts', icon: BadgePercent },
  { href: '/registrations', label: 'Registrations', icon: UserRoundPlus },
  { href: '/settings', label: 'Store & Delivery', icon: Settings2 },
];

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: '1', title: 'Welcome Offer Active', detail: 'WELCOME10 code is live for new registrants', time: '5m ago', unread: true },
    { id: '2', title: 'Catalog Engine Online', detail: 'PGlite WASM database initialized & ready', time: '12m ago', unread: true },
    { id: '3', title: 'RBAC Security Queue', detail: 'Sub-Admin & Moderator approval workflow active', time: '45m ago', unread: false },
  ]);
  const active = navItems.find((item) => item.href === location)?.label ?? 'Shop Admin';
  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  const clearNotifications = () => setNotifications([]);

  return (
    <div className="app-shell grain flex bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <aside className={cx('fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] px-4 py-5 text-[hsl(var(--sidebar-foreground))] transition-transform duration-300 lg:static lg:translate-x-0', mobileNav ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between px-3">
          <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
            <img src="/RAJTRADERS-LOGO.png" alt="RAJ TRADERS" className="size-9 object-contain rounded-xl border border-amber-500/30 shadow-md" />
            <div><div className="text-[15px] font-extrabold tracking-[-.03em]">Shop Admin</div><div className="font-mono text-[9px] uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.55)]">ops console / 01</div></div>
          </Link>
          <button className="text-[hsl(var(--sidebar-foreground)/.65)] lg:hidden" onClick={() => setMobileNav(false)} aria-label="Close navigation" data-testid="button-close-nav"><X size={19} /></button>
        </div>
        <div className="mt-8 px-3 font-mono text-[10px] font-medium uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.45)]">Workspace</div>
        <nav className="mt-3 space-y-1" aria-label="Main navigation">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link href={href} key={href} onClick={() => setMobileNav(false)} data-testid={`link-nav-${label.toLowerCase()}`} className={cx('group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold transition-colors', location === href ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]' : 'text-[hsl(var(--sidebar-foreground)/.64)] hover:bg-[hsl(var(--sidebar-accent)/.65)] hover:text-[hsl(var(--sidebar-foreground))]')}>
              <span className="flex items-center gap-3"><Icon size={17} strokeWidth={location === href ? 2.4 : 1.8} /><span>{label}</span></span>
              {location === href && <span className="size-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" />}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <div className="mb-4 rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.7)] p-4">
            <div className="flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[.15em] text-[hsl(var(--sidebar-foreground)/.56)]">Role: Main Admin</span><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[hsl(var(--sidebar-primary))] opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-[hsl(var(--sidebar-primary))]" /></span></div>
            <div className="mt-3 text-sm font-bold">{useContext(ShopContext).shopName}</div><div className="mt-1 text-xs text-[hsl(var(--sidebar-foreground)/.55)]">RBAC Authorized Session</div>
          </div>
          <Link href="/settings" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[hsl(var(--sidebar-foreground)/.67)] transition hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]" data-testid="button-settings"><Settings2 size={17} /> Store & Delivery</Link>
        </div>
      </aside>
      {mobileNav && <button className="fixed inset-0 z-30 bg-[hsl(var(--foreground)/.35)] lg:hidden" onClick={() => setMobileNav(false)} aria-label="Close navigation overlay" data-testid="button-nav-overlay" />}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.9)] px-5 backdrop-blur-md sm:px-8 lg:px-11">
          <div className="flex items-center gap-3"><button className="rounded-lg p-2 hover:bg-[hsl(var(--muted))] lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation" data-testid="button-open-nav"><Menu size={20} /></button><div className="text-sm font-bold text-[hsl(var(--muted-foreground))]"><span className="hidden sm:inline">Operations / </span><span className="text-[hsl(var(--foreground))]">{active}</span></div></div>
          <div className="relative flex items-center gap-2">
            <button
              className="relative rounded-lg p-2 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
              aria-label="Notifications"
              onClick={() => setNotificationsOpen((prev) => !prev)}
              data-testid="button-notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && <span className="absolute right-1 top-1 flex size-2.5 rounded-full bg-[hsl(var(--accent))]" />}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-[hsl(var(--foreground))]">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-[hsl(var(--accent))] px-2 py-0.5 text-[10px] font-bold text-white">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[11px] font-bold text-[hsl(var(--primary))] hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[hsl(var(--muted-foreground))]">No active notifications</div>
                ) : (
                  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                    {notifications.map((item) => (
                      <div
                        key={item.id}
                        className={cx(
                          'flex items-start justify-between rounded-xl p-3 text-xs transition',
                          item.unread ? 'bg-[hsl(var(--primary)/.08)] border border-[hsl(var(--primary)/.15)]' : 'bg-[hsl(var(--muted)/.4)]'
                        )}
                      >
                        <div>
                          <div className="font-extrabold text-[hsl(var(--foreground))]">{item.title}</div>
                          <div className="mt-0.5 text-[hsl(var(--muted-foreground))]">{item.detail}</div>
                          <div className="mt-1 font-mono text-[9px] text-[hsl(var(--muted-foreground))]">{item.time}</div>
                        </div>
                        {item.unread && <span className="size-2 rounded-full bg-[hsl(var(--accent))]" />}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex justify-between border-t border-[hsl(var(--border))] pt-2.5">
                  {notifications.length > 0 && (
                    <button onClick={clearNotifications} className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]">
                      Clear all
                    </button>
                  )}
                  <button onClick={() => setNotificationsOpen(false)} className="ml-auto text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                    Close
                  </button>
                </div>
              </div>
            )}

            <div className="hidden h-5 w-px bg-[hsl(var(--border))] sm:block" />
            <span className="hidden font-mono text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))] sm:block">Live</span>
            <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[hsl(148_37%_43%)] opacity-50" /><span className="relative inline-flex size-2 rounded-full bg-[hsl(148_37%_43%)]" /></span>
          </div>
        </header>
        <div className="mx-auto max-w-[1480px] px-5 py-8 sm:px-8 lg:px-11 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

function PageIntro({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div className="fade-up"><div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[.2em] text-[hsl(var(--primary))]"><span className="size-1.5 rounded-full bg-[hsl(var(--accent))]" />{eyebrow}</div><h1 className="text-3xl font-extrabold tracking-[-.05em] sm:text-4xl">{title}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{detail}</p></div>{action && <div className="fade-up fade-up-delay-1">{action}</div>}</div>;
}

function MetricCard({ label, value, detail, icon: Icon, tone = 'teal', trend }: { label: string; value: string | number; detail: string; icon: typeof Package; tone?: Tone; trend?: string }) {
  const accents: Record<Tone, string> = { teal: 'bg-[hsl(var(--primary))]', yellow: 'bg-[hsl(var(--secondary))]', coral: 'bg-[hsl(var(--accent))]', green: 'bg-[hsl(148_37%_43%)]', slate: 'bg-[hsl(var(--muted-foreground))]' };
  return <div className="fade-up fade-up-delay-1 relative overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[0_4px_18px_hsl(190_28%_15%/.035)]"><div className={cx('absolute left-0 top-0 h-1 w-16 rounded-br-full', accents[tone])} /><div className="flex items-start justify-between"><div className="font-mono text-[10px] font-medium uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">{label}</div><div className={cx('flex size-8 items-center justify-center rounded-lg', tone === 'yellow' ? 'bg-[hsl(var(--secondary)/.25)] text-[hsl(32_73%_31%)]' : `bg-[hsl(var(--primary)/.10)] text-[hsl(var(--primary))]`)}><Icon size={16} /></div></div><div className="mt-5 flex items-end justify-between"><div><div className="text-3xl font-extrabold tracking-[-.06em]">{value}</div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{detail}</div></div>{trend && <span className="flex items-center gap-1 font-mono text-[10px] font-medium text-[hsl(148_37%_35%)]"><ArrowUpRight size={13} />{trend}</span>}</div></div>;
}

function Overview() {
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), retry: 1 } });
  const summary = useGetAdminSummary({ query: { queryKey: getGetAdminSummaryQueryKey(), retry: 1 } });
  const storefront = useGetStorefrontSummary({ query: { queryKey: getGetStorefrontSummaryQueryKey(), retry: 1 } });
  const healthLabel = health.isPending ? 'Checking systems' : health.isError ? 'Needs attention' : health.data?.status === 'ok' ? 'All systems operational' : 'Systems online';
  const data = summary.data;
  const { shopName } = useContext(ShopContext);
  return <AdminGate isLoading={summary.isPending} isError={summary.isError} retry={() => summary.refetch()}><PageIntro eyebrow={`Operations · ${shopName} Master`} title="Master Operations Console" detail="Real-time pulse across live products, RBAC approval queues, geospatial delivery bounds, and revenue." action={<Button variant="outline" onClick={() => summary.refetch()} data-testid="button-refresh-overview"><RefreshCw size={15} className={summary.isFetching ? 'animate-spin' : ''} /> Refresh data</Button>} /><div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.65)] px-4 py-3 text-xs"><div className={cx('flex size-7 items-center justify-center rounded-full', health.isError ? 'bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))]' : 'bg-[hsl(148_37%_43%/.13)] text-[hsl(148_37%_35%)]')}><ShieldCheck size={15} /></div><span className="font-bold">{healthLabel}</span><span className="text-[hsl(var(--muted-foreground))]">·</span><span className="text-[hsl(var(--muted-foreground))]">{health.isError ? 'Health check unavailable' : 'Catalog, RBAC, Cloudflare R2 & Haversine geofence active'}</span><div className="ml-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]"><span className="size-1.5 rounded-full bg-[hsl(148_37%_43%)]" /> production</div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Live products" value={data?.activeProducts ?? 0} detail={`${data?.draftProducts ?? 0} in review / draft`} icon={Package} tone="teal" trend="+4.8%" /><MetricCard label="Live discounts" value={data?.liveDiscounts ?? 0} detail="codes currently redeemable" icon={BadgePercent} tone="yellow" trend="+2 this week" /><MetricCard label="Registrations" value={data?.firstOrderRegistrations ?? 0} detail="accounts on platform" icon={UsersRound} tone="coral" trend="+12.6%" /><MetricCard label="Inventory value" value={money(data?.inventoryValueCents)} detail="retail catalog valuation" icon={DollarSign} tone="green" /></div><div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]"><ActivityPanel activities={data?.recentActivity ?? []} /><StorefrontPanel summary={storefront.data} isLoading={storefront.isPending} /></div></AdminGate>;
}

function ActivityPanel({ activities }: { activities: Array<{ id: string; label: string; detail: string; timestamp: string }> }) {
  return <section className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Audit trail</div><h2 className="mt-1 text-lg font-extrabold tracking-[-.03em]">Recent activity</h2></div><ActivityIcon size={18} className="text-[hsl(var(--muted-foreground))]" /></div>{activities.length === 0 ? <div className="mt-6"><EmptyState icon={ActivityIcon} title="A quiet moment" detail="Catalog and offer changes will appear here as your team works." /></div> : <div className="mt-6 divide-y divide-[hsl(var(--border))]">{activities.slice(0, 6).map((item, index) => <div className="flex gap-3 py-3 first:pt-0 last:pb-0" key={item.id} data-testid={`activity-${item.id}`}><div className="relative flex w-5 justify-center"><span className={cx('mt-1.5 size-2.5 rounded-full ring-4 ring-[hsl(var(--card))]', index === 0 ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--secondary))]')} />{index < activities.length - 1 && <span className="absolute top-5 h-full w-px bg-[hsl(var(--border))]" />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold">{item.label}</p><time className="shrink-0 font-mono text-[10px] text-[hsl(var(--muted-foreground))]">{relativeTime(item.timestamp)}</time></div><p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">{item.detail}</p></div></div>)}</div>}</section>;
}

function StorefrontPanel({ summary, isLoading }: { summary?: { featuredCount: number; categories: string[]; firstOrderOffer: string; updatedAt: string }; isLoading: boolean }) {
  return <section className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))]"><div className="flex items-center justify-between"><div className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--primary-foreground)/.65)]">Storefront pulse</div><Sparkles size={18} className="text-[hsl(var(--secondary))]" /></div>{isLoading ? <div className="mt-8 space-y-3"><div className="h-12 w-28 rounded skeleton opacity-20" /><div className="h-4 w-full rounded skeleton opacity-20" /></div> : <><div className="mt-8 text-6xl font-extrabold tracking-[-.08em]">{summary?.featuredCount ?? 0}</div><p className="mt-1 text-sm text-[hsl(var(--primary-foreground)/.7)]">featured products on the shop floor</p><div className="mt-8 border-t border-[hsl(var(--primary-foreground)/.18)] pt-5"><div className="text-xs font-bold text-[hsl(var(--primary-foreground)/.7)]">First order offer</div><div className="mt-2 flex items-center justify-between"><span className="font-mono text-lg font-medium tracking-[.12em]">{summary?.firstOrderOffer || 'Not configured'}</span><button className="rounded-md p-1.5 transition hover:bg-[hsl(var(--primary-foreground)/.12)]" onClick={() => summary?.firstOrderOffer && navigator.clipboard?.writeText(summary.firstOrderOffer)} aria-label="Copy first order offer" data-testid="button-copy-offer"><Copy size={15} /></button></div></div><div className="mt-6 flex flex-wrap gap-1.5">{(summary?.categories ?? []).slice(0, 5).map((category) => <span key={category} className="rounded-full border border-[hsl(var(--primary-foreground)/.22)] px-2.5 py-1 text-[10px] font-bold text-[hsl(var(--primary-foreground)/.76)]">{category}</span>)}</div></>}</section>;
}

type ProductForm = {
  name: string;
  description: string;
  price: string;
  compareAt: string;
  category: string;
  imageUrl: string;
  inventory: string;
  prepTimeMinutes: string;
  status: 'active' | 'draft';
  featured: boolean;
};

const blankProduct: ProductForm = {
  name: '',
  description: '',
  price: '',
  compareAt: '',
  category: '',
  imageUrl: '',
  inventory: '0',
  prepTimeMinutes: '30',
  status: 'active',
  featured: false,
};

function Products() {
  const client = useQueryClient();
  const adminProducts = useListAdminProducts({ query: { queryKey: getListAdminProductsQueryKey() } });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'draft'>('all');
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [form, setForm] = useState<ProductForm>(blankProduct);
  const [notice, setNotice] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const { shopDomain } = useContext(ShopContext);

  const products = useMemo(
    () =>
      (adminProducts.data ?? []).filter(
        (item) =>
          (filter === 'all' || item.status === filter) &&
          `${item.name} ${item.category} ${item.slug}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [adminProducts.data, filter, search],
  );

  const openCreate = () => {
    setForm(blankProduct);
    setEditingId(null);
    setDialog('create');
  };

  const openEdit = (product: any) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      price: (product.priceCents / 100).toFixed(2),
      compareAt: product.compareAtPriceCents ? (product.compareAtPriceCents / 100).toFixed(2) : '',
      category: product.category,
      imageUrl: product.imageUrl,
      inventory: String(product.inventory),
      prepTimeMinutes: String(product.prepTimeMinutes || 30),
      status: product.status === 'active' ? 'active' : 'draft',
      featured: product.featured,
    });
    setDialog('edit');
  };

  const submit = async () => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      priceCents: Math.round(Number(form.price || 0) * 100),
      compareAtPriceCents: form.compareAt ? Math.round(Number(form.compareAt) * 100) : null,
      category: form.category.trim(),
      imageUrl: form.imageUrl.trim(),
      inventory: Math.max(0, Number(form.inventory || 0)),
      prepTimeMinutes: Math.max(1, Number(form.prepTimeMinutes || 30)),
      status: form.status,
      featured: form.featured,
    };

    try {
      const path = editingId ? `/api/v1/admin/products/${editingId}` : '/api/v1/admin/products';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(getApiUrl(path), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setDialog(null);
        setNotice(editingId ? 'Product updated successfully' : 'Product submitted / created');
        client.invalidateQueries({ queryKey: getListAdminProductsQueryKey() });
        client.invalidateQueries({ queryKey: getListProductsQueryKey() });
        client.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(getApiUrl(`/api/v1/admin/products/${deleteTarget.id}`), {
        method: 'DELETE',
      });
      if (res.ok || res.status === 204) {
        setNotice(`Product "${deleteTarget.name}" deleted / archived successfully`);
        setDeleteTarget(null);
        client.invalidateQueries({ queryKey: getListAdminProductsQueryKey() });
        client.invalidateQueries({ queryKey: getListProductsQueryKey() });
        client.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyShareLink = (slug: string) => {
    const domain = shopDomain || 'myshop.com';
    const publicUrl = `https://${domain}/products/${slug}`;
    navigator.clipboard?.writeText(publicUrl);
    setCopiedSlug(slug);
    setNotice(`Public share link copied: ${publicUrl}`);
    setTimeout(() => setCopiedSlug(null), 3000);
  };

  return (
    <AdminGate isLoading={adminProducts.isPending} isError={adminProducts.isError} retry={() => adminProducts.refetch()}>
      <PageIntro
        eyebrow="Catalog & Listings"
        title="Products & Preparation Times"
        detail="Define preparation time, upload photos to Cloudflare R2, generate public share URLs, and manage live visibility."
        action={
          <Button onClick={openCreate} data-testid="button-create-product">
            <Plus size={16} /> Add product
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, categories or slugs"
            className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-10 pr-4 text-sm outline-none transition focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.12)]"
            data-testid="input-search-products"
          />
        </div>
        <div className="flex rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1">
          {(['all', 'active', 'draft'] as const).map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={cx(
                'rounded-lg px-3 py-2 text-xs font-bold capitalize transition',
                filter === item ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
              )}
            >
              {item === 'all' ? 'All products' : item}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[hsl(148_37%_43%/.25)] bg-[hsl(148_37%_43%/.08)] px-4 py-3 text-sm font-bold text-[hsl(148_37%_35%)]">
          <CheckCircle2 size={16} />
          {notice}
          <button className="ml-auto" onClick={() => setNotice('')}><X size={15} /></button>
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={search ? 'No matches found' : 'Your catalog is ready for products'}
          detail="Add cakes and items with custom preparation times and photos."
          action={!search ? <Button onClick={openCreate}><Plus size={15} /> Add first product</Button> : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))]">
          <div className="hidden grid-cols-[minmax(240px,1.6fr)_1fr_100px_90px_100px_90px_130px] gap-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.45)] px-5 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))] md:grid">
            <span>Product</span>
            <span>Category</span>
            <span>Prep Time</span>
            <span>Price</span>
            <span>Stock</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          {products.map((product: any) => (
            <div
              key={product.id}
              className="grid gap-3 border-b border-[hsl(var(--border))] px-4 py-4 last:border-0 md:grid-cols-[minmax(240px,1.6fr)_1fr_100px_90px_100px_90px_130px] md:items-center md:gap-4 md:px-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[hsl(var(--secondary)/.3)] text-sm font-extrabold text-[hsl(var(--foreground))]">
                  {product.imageUrl ? <img src={product.imageUrl} alt="" className="size-full object-cover" /> : product.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-extrabold">{product.name}</span>
                    {product.featured && <Sparkles size={13} className="shrink-0 text-[hsl(32_73%_42%)]" />}
                  </div>
                  <div className="truncate font-mono text-[10px] text-[hsl(var(--muted-foreground))]">/{product.slug}</div>
                </div>
              </div>

              <div className="hidden text-sm text-[hsl(var(--muted-foreground))] md:block">{product.category}</div>

              <div className="flex items-center gap-1 text-xs font-bold text-[hsl(var(--primary))]">
                <Clock size={13} />
                <span>{product.prepTimeMinutes || 30} mins</span>
              </div>

              <div className="text-sm font-bold">{money(product.priceCents)}</div>
              <div className="text-xs font-bold text-[hsl(var(--muted-foreground))]">{product.inventory} in stock</div>

              <div>
                <StatusPill tone={product.status === 'active' ? 'green' : 'yellow'}>{product.status}</StatusPill>
              </div>

              <div className="flex items-center gap-1 md:justify-end">
                <button
                  className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--primary))]"
                  onClick={() => copyShareLink(product.slug)}
                  title="Copy Public Share Link"
                >
                  <Share2 size={15} />
                </button>
                <button
                  className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                  onClick={() => openEdit(product)}
                  title="Edit Product"
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--destructive)/.12)] hover:text-[hsl(var(--destructive))]"
                  onClick={() => setDeleteTarget(product)}
                  title="Delete Product"
                  data-testid={`button-delete-product-${product.id}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <DialogFrame
          title="Delete Product"
          detail="Are you sure you want to delete or archive this product from the live catalog?"
          onClose={() => setDeleteTarget(null)}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--destructive)/.22)] bg-[hsl(var(--destructive)/.06)] p-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--destructive)/.15)] text-[hsl(var(--destructive))]">
                <Trash2 size={18} />
              </div>
              <div>
                <div className="text-sm font-extrabold text-[hsl(var(--foreground))]">{deleteTarget.name}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{deleteTarget.category} · {money(deleteTarget.priceCents)}</div>
              </div>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              This will remove the product from active storefront listings and update catalog inventory counts.
            </p>
            <div className="flex justify-end gap-2 border-t border-[hsl(var(--border))] pt-4">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={confirmDelete}>Delete Product</Button>
            </div>
          </div>
        </DialogFrame>
      )}

      <ProductDialog
        open={Boolean(dialog)}
        mode={dialog ?? 'create'}
        form={form}
        setForm={setForm}
        busy={false}
        onClose={() => setDialog(null)}
        onSubmit={submit}
      />
    </AdminGate>
  );
}

function ProductDialog({ open, mode, form, setForm, busy, onClose, onSubmit }: { open: boolean; mode: 'create' | 'edit'; form: ProductForm; setForm: Dispatch<SetStateAction<ProductForm>>; busy: boolean; onClose: () => void; onSubmit: () => void }) {
  if (!open) return null;
  const update = (key: keyof ProductForm, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const simulateR2Upload = () => {
    const demoPhotos = [
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80',
    ];
    const chosen = demoPhotos[Math.floor(Math.random() * demoPhotos.length)];
    update('imageUrl', chosen);
  };

  return (
    <DialogFrame title={mode === 'create' ? 'Add product' : 'Edit product'} detail="Configure preparation time, photos (Cloudflare R2), pricing and inventory." onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product name" value={form.name} onChange={(v) => update('name', v)} placeholder="e.g. Belgian Truffle Cake" testId="input-product-name" />
        <Field label="Category" value={form.category} onChange={(v) => update('category', v)} placeholder="e.g. Artisanal Cakes" testId="input-product-category" />
        <Field label="Price ($ USD)" type="number" value={form.price} onChange={(v) => update('price', v)} placeholder="28.00" testId="input-product-price" />
        <Field label="Compare-at price" type="number" value={form.compareAt} onChange={(v) => update('compareAt', v)} placeholder="Optional" testId="input-product-compare-price" />
        <Field label="Preparation Time (Minutes)" type="number" value={form.prepTimeMinutes} onChange={(v) => update('prepTimeMinutes', v)} placeholder="45" testId="input-product-prep-time" />
        <Field label="Inventory Units" type="number" value={form.inventory} onChange={(v) => update('inventory', v)} placeholder="15" testId="input-product-inventory" />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-extrabold text-[hsl(var(--foreground))]">Product Photo URL (Cloudflare R2 Bucket)</label>
          <button type="button" onClick={simulateR2Upload} className="inline-flex items-center gap-1 text-[11px] font-bold text-[hsl(var(--primary))] hover:underline">
            <CloudUpload size={13} /> Select from Cloudflare R2
          </button>
        </div>
        <input
          type="text"
          value={form.imageUrl}
          onChange={(e) => update('imageUrl', e.target.value)}
          placeholder="https://your-cdn.example.com/products/image.jpg"
          className="mt-1.5 h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm outline-none"
        />
      </div>

      <label className="mt-4 block text-xs font-extrabold text-[hsl(var(--foreground))]">
        Description & Tasting Notes
        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
          placeholder="Rich dark chocolate ganache, handcrafted sponge..."
          className="mt-2 w-full resize-none rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm outline-none"
        />
      </label>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-extrabold">
          Visibility
          <select value={form.status} onChange={(e) => update('status', e.target.value as any)} className="mt-2 h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm outline-none">
            <option value="active">Live on storefront</option>
            <option value="draft">Draft only</option>
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm font-bold">
          <input type="checkbox" checked={form.featured} onChange={(e) => update('featured', e.target.checked)} className="size-4 accent-[hsl(var(--primary))]" /> Feature on homepage
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-[hsl(var(--border))] pt-4">
        <Button variant="quiet" onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit} disabled={busy || !form.name.trim() || !form.category.trim()}>{busy ? 'Saving…' : mode === 'create' ? 'Create product' : 'Save changes'}</Button>
      </div>
    </DialogFrame>
  );
}

// ─── Approvals Component (RBAC Workflow) ────────────────────

function Approvals() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/admin/approvals'));
      if (res.ok) {
        const data = await res.json();
        setPending(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/v1/admin/approvals/${id}/approve`), { method: 'POST' });
      if (res.ok) {
        setNotice('Product approved and published to live storefront!');
        fetchApprovals();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Please provide a reason for rejecting this product:');
    if (reason === null) return;

    try {
      const res = await fetch(getApiUrl(`/api/v1/admin/approvals/${id}/reject`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setNotice('Product rejected and sent back to draft.');
        fetchApprovals();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="RBAC Workflow · Authorization"
        title="Pending Product Approvals"
        detail="Modifications or new listings created by Sub-Admins and Moderators require explicit authorization before publishing."
        action={
          <Button variant="outline" onClick={fetchApprovals}>
            <RefreshCw size={15} /> Refresh Queue
          </Button>
        }
      />

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-[hsl(148_37%_43%/.25)] bg-[hsl(148_37%_43%/.08)] px-4 py-3 text-sm font-bold text-[hsl(148_37%_32%)]">
          <CheckCircle2 size={16} />
          {notice}
          <button className="ml-auto" onClick={() => setNotice(null)}><X size={15} /></button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4"><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div>
      ) : pending.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Approval queue is clear"
          detail="All Sub-Admin and Moderator product submissions have been reviewed and approved."
        />
      ) : (
        <div className="space-y-4">
          {pending.map((product) => (
            <div key={product.id} className="flex flex-col gap-4 rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[hsl(var(--secondary)/.3)] font-bold">
                  {product.imageUrl ? <img src={product.imageUrl} alt="" className="size-full object-cover" /> : product.name.slice(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold">{product.name}</h3>
                    <StatusPill tone="yellow">Pending Approval</StatusPill>
                  </div>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    {product.category} · {money(product.priceCents)} · Prep Time: <span className="font-bold">{product.prepTimeMinutes} mins</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">Submitted by staff ID: {product.submittedBy || 'staff_member'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => handleReject(product.id)}>Reject</Button>
                <Button variant="primary" onClick={() => handleApprove(product.id)}>
                  <Check size={15} /> Authorize & Publish
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Staff & RBAC Management Component ──────────────────────

function StaffManagement() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SUB_ADMIN',
    accessDuration: 'permanent', // '24h', '7d', '30d', 'permanent'
  });

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/admin/staff'));
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let expiresAtHours: number | null = null;
      if (form.accessDuration === '24h') expiresAtHours = 24;
      else if (form.accessDuration === '7d') expiresAtHours = 24 * 7;
      else if (form.accessDuration === '30d') expiresAtHours = 24 * 30;

      const res = await fetch(getApiUrl('/api/v1/admin/staff'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          expiresAtHours,
        }),
      });

      if (res.ok) {
        setModal(false);
        setNotice(`New ${form.role} account created successfully!`);
        fetchStaff();
        setForm({ name: '', email: '', password: '', role: 'SUB_ADMIN', accessDuration: 'permanent' });
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create staff account.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const roleColors: Record<string, Tone> = {
    MAIN_ADMIN: 'coral',
    ADMIN: 'teal',
    SUB_ADMIN: 'yellow',
    MODERATOR: 'slate',
  };

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Security & Permissions"
        title="Role-Based Access Control (RBAC)"
        detail="Only the Main Admin can generate Admin/Sub-Admin/Moderator accounts and assign permissions, including temporary time-bound access."
        action={
          <Button onClick={() => setModal(true)}>
            <Plus size={16} /> Create Staff Account
          </Button>
        }
      />

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-[hsl(148_37%_43%/.25)] bg-[hsl(148_37%_43%/.08)] px-4 py-3 text-sm font-bold text-[hsl(148_37%_32%)]">
          <CheckCircle2 size={16} />
          {notice}
          <button className="ml-auto" onClick={() => setNotice(null)}><X size={15} /></button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))]">
          <div className="hidden grid-cols-[1.5fr_1.5fr_120px_140px_100px] gap-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.45)] px-5 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))] md:grid">
            <span>Staff Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Access Expiration</span>
            <span>Status</span>
          </div>

          {staffList.map((staff) => (
            <div key={staff.id} className="grid gap-3 border-b border-[hsl(var(--border))] px-4 py-4 last:border-0 md:grid-cols-[1.5fr_1.5fr_120px_140px_100px] md:items-center md:gap-4 md:px-5">
              <div className="font-extrabold">{staff.name}</div>
              <div className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{staff.email}</div>
              <div><StatusPill tone={roleColors[staff.role] || 'teal'}>{staff.role}</StatusPill></div>
              <div className="text-xs font-semibold">
                {staff.expiresAt ? (
                  <span className={staff.isExpired ? 'text-[hsl(var(--destructive))] font-bold' : 'text-[hsl(var(--primary))]'}>
                    {staff.isExpired ? 'Expired' : new Date(staff.expiresAt).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-[hsl(var(--muted-foreground))]">Permanent</span>
                )}
              </div>
              <div><StatusPill tone={staff.active && !staff.isExpired ? 'green' : 'slate'}>{staff.active && !staff.isExpired ? 'Active' : 'Locked'}</StatusPill></div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <DialogFrame title="Create Staff Account" detail="Assign role and optional temporary access expiration." onClose={() => setModal(false)}>
          <form onSubmit={handleCreateStaff} className="space-y-4">
            <div>
              <label className="text-xs font-bold">Staff Full Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1 h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm" placeholder="e.g. Alex Morgan" />
            </div>
            <div>
              <label className="text-xs font-bold">Staff Email Address</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-1 h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm" placeholder="staff@example.com" />
            </div>
            <div>
              <label className="text-xs font-bold">Initial Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="mt-1 h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm" placeholder="••••••••" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold">Role Assignment</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm">
                  <option value="ADMIN">Admin (Full Access & Approvals)</option>
                  <option value="SUB_ADMIN">Sub-Admin (Requires Product Approval)</option>
                  <option value="MODERATOR">Moderator (Drafting & Review Only)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold">Access Duration</label>
                <select value={form.accessDuration} onChange={(e) => setForm({ ...form, accessDuration: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm">
                  <option value="permanent">Permanent Access</option>
                  <option value="24h">24 Hours (Temporary)</option>
                  <option value="7d">7 Days (Time-bound)</option>
                  <option value="30d">30 Days (Contract)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-[hsl(var(--border))] pt-4">
              <Button variant="quiet" type="button" onClick={() => setModal(false)}>Cancel</Button>
              <Button type="submit">Create Staff Account</Button>
            </div>
          </form>
        </DialogFrame>
      )}
    </div>
  );
}

// ─── Store & Delivery Settings Component ────────────────────

function StoreSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    shopName: 'My Shop',
    shopDomain: 'myshop.com',
    shopAddress: '123 Baker Street, Mumbai',
    latitude: 19.0760,
    longitude: 72.8777,
    deliveryRadiusKm: 15.0,
    isDeliveryEnabled: true,
    razorpayKeyId: 'rzp_test_sandbox123456',
    razorpayKeySecret: 'sandbox_secret',
    r2AccountId: '',
    r2AccessKeyId: '',
    r2SecretAccessKey: '',
    r2BucketName: 'my-products',
    r2PublicUrl: '',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpUser: 'notifications.rajtraders@gmail.com',
    smtpPass: 'NOTIFICATIONS@RAJ',
    smtpFrom: 'My Shop <notifications.rajtraders@gmail.com>',
  });

  const [showSecret, setShowSecret] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/admin/shop-settings'));
      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({
          ...prev,
          ...data,
          latitude: data.latitude ?? 19.0760,
          longitude: data.longitude ?? 72.8777,
          deliveryRadiusKm: data.deliveryRadiusKm ?? 15.0,
          isDeliveryEnabled: data.isDeliveryEnabled ?? true,
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch(getApiUrl('/api/v1/admin/shop-settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          deliveryRadiusKm: Number(form.deliveryRadiusKm),
          isDeliveryEnabled: Boolean(form.isDeliveryEnabled),
        }),
      });

      if (res.ok) {
        setSuccessMessage('Store, Cloudflare R2, SMTP & delivery settings saved successfully!');
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'Failed to update settings.');
      }
    } catch (e: any) {
      setErrorMessage('Network error while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Configuration & Storage"
        title="Store, Cloudflare R2 & Delivery Settings"
        detail="Manage GPS coordinates, delivery radius (Haversine geospatial validation), Cloudflare R2 storage credentials, and Nodemailer SMTP."
        action={
          <Button variant="primary" onClick={handleSave} disabled={saving || loading} data-testid="button-save-settings">
            <Save size={16} className={saving ? 'animate-spin' : ''} />
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        }
      />

      {successMessage && (
        <div className="rounded-xl border border-[hsl(148_37%_43%/.3)] bg-[hsl(148_37%_43%/.1)] p-4 text-sm font-bold text-[hsl(148_37%_32%)] flex items-center gap-2">
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.1)] p-4 text-sm font-bold text-[hsl(var(--destructive))] flex items-center gap-2">
          <CircleHelp size={18} />
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="space-y-4"><Skeleton className="h-44 w-full" /><Skeleton className="h-44 w-full" /></div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Location & GPS */}
          <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.10)] text-[hsl(var(--primary))]"><MapPin size={20} /></div>
              <div>
                <h3 className="text-base font-extrabold">Store Profile & Location</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Base GPS anchor used to compute customer delivery distances with the Haversine formula.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Shop Name</label>
                <input type="text" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-semibold" required />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Shop Domain</label>
                <input type="text" value={form.shopDomain} onChange={(e) => setForm({ ...form, shopDomain: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-mono" placeholder="myshop.com" required />
                <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Used for public share URLs and password reset links (e.g. https://yourdomain.com/products/...)</p>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Physical Address</label>
                <input type="text" value={form.shopAddress} onChange={(e) => setForm({ ...form, shopAddress: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-semibold" required />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Latitude</label>
                <input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) || 0 })} className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-mono" required />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Longitude</label>
                <input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) || 0 })} className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-mono" required />
              </div>
            </div>
          </div>

          {/* Delivery Radius */}
          <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[hsl(var(--secondary)/.25)] text-[hsl(32_73%_31%)]"><Navigation size={20} /></div>
                <div>
                  <h3 className="text-base font-extrabold">Delivery Radius & Geospatial Bounds</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Orders outside this radius are blocked at checkout using the Haversine formula.</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isDeliveryEnabled} onChange={(e) => setForm({ ...form, isDeliveryEnabled: e.target.checked })} className="size-4 rounded accent-[hsl(var(--primary))]" />
                <span className="text-xs font-bold">{form.isDeliveryEnabled ? 'Radius Enforced' : 'Radius Disabled'}</span>
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Maximum Delivery Radius</label>
                <span className="font-mono text-base font-black text-[hsl(var(--primary))]">{form.deliveryRadiusKm} km</span>
              </div>
              <input type="range" min="1" max="100" step="1" value={form.deliveryRadiusKm} onChange={(e) => setForm({ ...form, deliveryRadiusKm: parseFloat(e.target.value) || 1 })} className="w-full h-2 rounded-lg bg-[hsl(var(--border))] accent-[hsl(var(--primary))]" />
            </div>
          </div>

          {/* Cloudflare R2 Free-Tier Storage */}
          <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.10)] text-[hsl(var(--primary))]"><CloudUpload size={20} /></div>
              <div>
                <h3 className="text-base font-extrabold">Cloudflare R2 Object Storage (Free Tier)</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Secure S3-compatible cloud storage for bakery product photography with zero egress fees.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Cloudflare Account ID</label>
                <input type="text" value={form.r2AccountId} onChange={(e) => setForm({ ...form, r2AccountId: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-mono" placeholder="e.g. 7f8a9b2c3d4e..." />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Bucket Name</label>
                <input type="text" value={form.r2BucketName} onChange={(e) => setForm({ ...form, r2BucketName: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-mono" placeholder="my-products" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">R2 Access Key ID</label>
                <input type="text" value={form.r2AccessKeyId} onChange={(e) => setForm({ ...form, r2AccessKeyId: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-mono" placeholder="R2 Access Key" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">R2 Secret Access Key</label>
                <input type="password" value={form.r2SecretAccessKey} onChange={(e) => setForm({ ...form, r2SecretAccessKey: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-mono" placeholder="R2 Secret Key" />
              </div>
            </div>
          </div>

          {/* Nodemailer SMTP Settings */}
          <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[hsl(148_37%_43%/.13)] text-[hsl(148_37%_32%)]"><Mail size={20} /></div>
              <div>
                <h3 className="text-base font-extrabold">Nodemailer SMTP (Password Recovery)</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Configures outbound email transport for 60-minute password recovery links.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">SMTP Host</label>
                <input type="text" value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-mono" placeholder="smtp.gmail.com" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">SMTP Port</label>
                <input type="number" value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: parseInt(e.target.value) || 465 })} className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-mono" placeholder="465 (SSL) or 587 (TLS)" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">From Address</label>
                <input type="text" value={form.smtpFrom} onChange={(e) => setForm({ ...form, smtpFrom: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm" placeholder="My Shop <notifications@...>" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">SMTP User / Email</label>
                <input type="email" value={form.smtpUser} onChange={(e) => setForm({ ...form, smtpUser: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-mono" placeholder="notifications.rajtraders@gmail.com" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">SMTP Password / App Password</label>
                <input type={showSecret ? 'text' : 'password'} value={form.smtpPass} onChange={(e) => setForm({ ...form, smtpPass: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-mono" placeholder="Password / App Password" />
              </div>
            </div>
          </div>

          {/* Razorpay Gateway */}
          <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[hsl(148_37%_43%/.13)] text-[hsl(148_37%_32%)]"><CreditCard size={20} /></div>
                <div>
                  <h3 className="text-base font-extrabold">Razorpay Payment Gateway</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Dynamic credentials loaded by public mobile app and checkout API.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Razorpay Key ID</label>
                <input type="text" value={form.razorpayKeyId} onChange={(e) => setForm({ ...form, razorpayKeyId: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-mono" required />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Razorpay Key Secret</label>
                <input type={showSecret ? 'text' : 'password'} value={form.razorpayKeySecret} onChange={(e) => setForm({ ...form, razorpayKeySecret: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-mono" required />
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Orders, Discounts & Policy Components ──────────────────

function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('1y');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchOrdersData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (durationFilter !== 'all') params.append('duration', durationFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (search.trim()) params.append('search', search.trim());

      const [ordersRes, statsRes] = await Promise.all([
        fetch(getApiUrl(`/api/v1/admin/orders?${params.toString()}`)),
        fetch(getApiUrl('/api/v1/admin/orders/stats')),
      ]);

      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersData();
  }, [statusFilter, durationFilter, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrdersData();
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this pending order?')) return;
    setCancellingId(orderId);
    try {
      const res = await fetch(getApiUrl(`/api/v1/admin/orders/${orderId}/cancel`), { method: 'POST' });
      if (res.ok) fetchOrdersData();
    } catch (err) {
      console.error(err);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <AdminGate isLoading={false} isError={false}>
      <PageIntro eyebrow="Fulfillment & Ledger" title="Orders" detail="Monitor real-time transactions, Razorpay references, customer shipping coordinates, and order status." action={<Button variant="outline" onClick={fetchOrdersData}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh ledger</Button>} />
      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Orders" value={stats.totalOrders} detail="All-time recorded transactions" icon={Receipt} tone="teal" />
          <MetricCard label="Successful / Paid" value={stats.successfulOrders} detail="Completed payments via Razorpay" icon={CheckCircle2} tone="green" />
          <MetricCard label="Pending Orders" value={stats.pendingOrders} detail="Created, awaiting checkout" icon={ActivityIcon} tone="yellow" />
          <MetricCard label="Gross Revenue" value={money(stats.totalRevenueCents)} detail="Settled transaction volume" icon={DollarSign} tone="coral" />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))]">
        <div className="hidden grid-cols-[minmax(180px,1.2fr)_1fr_1fr_100px_90px_100px_80px] gap-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.45)] px-5 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))] md:grid">
          <span>Order ID</span>
          <span>Customer</span>
          <span>Shipping Address</span>
          <span>Date</span>
          <span>Total</span>
          <span>Status</span>
          <span />
        </div>
        {orders.length === 0 ? (
          <EmptyState icon={Receipt} title="No orders match filters" detail="Adjust your status or date range to inspect historical orders." />
        ) : (
          orders.map((order) => (
            <div key={order.id} className="grid gap-3 border-b border-[hsl(var(--border))] px-4 py-4 last:border-0 md:grid-cols-[minmax(180px,1.2fr)_1fr_1fr_100px_90px_100px_80px] md:items-center md:gap-4 md:px-5">
              <div><div className="font-mono text-xs font-extrabold">{order.id.slice(0, 14)}...</div><div className="text-[11px] text-[hsl(var(--muted-foreground))]">{order.razorpayOrderId || 'Local Sandbox'}</div></div>
              <div className="text-xs"><div className="font-bold">{order.customerName || 'Customer'}</div><div className="text-[hsl(var(--muted-foreground))]">{order.customerEmail || 'No email'}</div></div>
              <div className="text-xs truncate text-[hsl(var(--muted-foreground))]">{order.shippingAddress || 'Store Pickup'}</div>
              <div className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{new Date(order.createdAt).toLocaleDateString()}</div>
              <div className="text-sm font-bold">{money(order.totalCents)}</div>
              <div><StatusPill tone={order.status === 'paid' ? 'green' : order.status === 'created' ? 'yellow' : 'coral'}>{order.status === 'paid' ? 'Paid' : order.status === 'created' ? 'Pending' : 'Cancelled'}</StatusPill></div>
              <div className="flex justify-end">{order.status === 'created' && <Button variant="danger" className="!h-8 !px-2 text-xs" onClick={() => handleCancelOrder(order.id)} disabled={cancellingId === order.id}>Cancel</Button>}</div>
            </div>
          ))
        )}
      </div>
    </AdminGate>
  );
}

function Discounts() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchDiscounts = () => {
    setLoading(true);
    setError(false);
    fetch(getApiUrl('/api/v1/admin/discounts'))
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((items) => setData(Array.isArray(items) ? items : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  return (
    <AdminGate isLoading={loading} isError={error} retry={fetchDiscounts}>
      <PageIntro eyebrow="Offers" title="Discount Engine" detail="Configure percentage and fixed price discount offers." />
      <div className="overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] divide-y divide-[hsl(var(--border))]">
        {data.length === 0 ? (
          <EmptyState icon={BadgePercent} title="No active discount codes" detail="Create percentage or fixed discounts for customer checkout." />
        ) : (
          data.map((d) => (
            <div key={d.id} className="p-4 flex items-center justify-between font-mono">
              <span className="font-bold text-sm">{d.code}</span>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {d.type === 'percentage' ? `${d.value}% off` : `${money(d.value)} off`}
              </span>
            </div>
          ))
        )}
      </div>
    </AdminGate>
  );
}

function Registrations() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchPolicies = () => {
    setLoading(true);
    setError(false);
    fetch(getApiUrl('/api/v1/admin/registrations'))
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((items) => setData(Array.isArray(items) ? items : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  return (
    <AdminGate isLoading={loading} isError={error} retry={fetchPolicies}>
      <PageIntro eyebrow="Growth" title="Welcome Policies" detail="Configure first-order customer reward rules." />
      <div className="overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] divide-y divide-[hsl(var(--border))]">
        {data.length === 0 ? (
          <EmptyState icon={UserRoundPlus} title="No registration policies configured" detail="Welcome policies grant automatic discounts to newly registered users." />
        ) : (
          data.map((p) => (
            <div key={p.id} className="p-4 flex items-center justify-between">
              <span className="font-bold text-sm">{p.name}</span>
              <StatusPill tone={p.active ? 'green' : 'slate'}>{p.offerCode}</StatusPill>
            </div>
          ))
        )}
      </div>
    </AdminGate>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', testId }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; testId?: string }) {
  return (
    <label className="text-xs font-extrabold">
      {label}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-2 h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm font-medium outline-none transition focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.12)]" data-testid={testId} />
    </label>
  );
}

function DialogFrame({ title, detail, children, onClose }: { title: string; detail: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(var(--foreground)/.38)] p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-2xl sm:rounded-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-xl font-extrabold tracking-[-.04em]">{title}</h2><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{detail}</p></div>
          <button onClick={onClose} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"><X size={18} /></button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

function Router() {
  const [location] = useLocation();

  return (
    <ErrorBoundary resetKey={location}>
      <Shell>
        <Switch>
          <Route path="/" component={Overview} />
          <Route path="/admin" component={Overview} />
          <Route path="/orders" component={Orders} />
          <Route path="/products" component={Products} />
          <Route path="/approvals" component={Approvals} />
          <Route path="/staff" component={StaffManagement} />
          <Route path="/discounts" component={Discounts} />
          <Route path="/registrations" component={Registrations} />
          <Route path="/settings" component={StoreSettings} />
          <Route component={NotFound} />
        </Switch>
      </Shell>
    </ErrorBoundary>
  );
}

function App() {
  const [shopInfo, setShopInfo] = useState({ shopName: 'RAJ TRADERS', shopDomain: 'sundarvan.xyz' });

  useEffect(() => {
    const apiTarget = import.meta.env.VITE_API_TARGET || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://api.sundarvan.xyz' : '');
    const url = apiTarget ? `${apiTarget.replace(/\/+$/, '')}/api/v1/admin/shop-settings` : '/api/v1/admin/shop-settings';
    fetch(url)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setShopInfo({ shopName: data.shopName || 'RAJ TRADERS', shopDomain: data.shopDomain || 'sundarvan.xyz' });
      })
      .catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ShopContext.Provider value={shopInfo}>
          <WouterRouter base={basePath}>
            <Router />
          </WouterRouter>
        </ShopContext.Provider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;