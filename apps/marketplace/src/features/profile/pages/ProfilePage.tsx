import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  User, Edit3, LogOut, ShoppingBag, Heart, MapPin, CreditCard,
  Bell, MessageCircle, Sparkles, Star, Award, Gift, ChevronRight,
  Shield, Package, Trophy, Users, Leaf, RefreshCw, Calendar,
  Building2, Eye, Download, GitCompare, HelpCircle, KeyRound,
  CheckCircle2, AlertCircle, Wallet, Tag, Moon, Mail,
} from 'lucide-react';
import { authApi } from '@/features/auth/api/auth.api';
import { profileApi } from '../api/profile.api';
import { useAuthStore } from '@/stores/auth.store';
import { Avatar, Badge, Button, Card } from '@/ui';
import { formatPrice } from '@/lib/format';
import { toast } from 'sonner';
import { SetPasswordCard } from '@/features/auth/components/SetPasswordCard';
import { cn } from '@/lib/cn';

interface ProfileStats {
  totalOrders?: number;
  wishlistCount?: number;
  addressCount?: number;
  reviewCount?: number;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const customer = useAuthStore((s) => s.customer);
  const logout = useAuthStore((s) => s.logout);

  // Safely call stats if it exists on profileApi
  const { data: stats } = useQuery<ProfileStats>({
    queryKey: ['profile-stats'],
    queryFn: async () => {
      const api = profileApi as any;
      if (typeof api.stats === 'function') return api.stats();
      // Fallback — derive from other endpoints if available
      return {} as ProfileStats;
    },
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const api = profileApi as any;
      if (typeof api.wallet === 'function') return api.wallet();
      return { balance: 0, loyaltyPoints: 0 };
    },
  });

  const { data: me } = useQuery({
    queryKey: ['auth-me'],
    queryFn: authApi.me,
    initialData: customer ?? undefined,
  });

  const u = (me || customer) as any;

  const handleLogout = async () => {
    if (!confirm('Logout karna chahte hain?')) return;
    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {}
    logout();
    toast.success('Logged out ✓');
    navigate('/login');
  };

  if (!u) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Sparkles className="h-10 w-10 text-brand-600 animate-pulse" />
      </div>
    );
  }

  const emailVerified = u.emailVerified || u.isEmailVerified;
  const phoneVerified = u.phoneVerified;
  const hasPassword = u.hasPassword !== false;
  const hasGoogle = !!u.googleId;

  const securityChecks = [emailVerified, phoneVerified, hasPassword];
  const securityScore = Math.round((securityChecks.filter(Boolean).length / securityChecks.length) * 100);
  const securityColor = securityScore >= 80 ? 'emerald' : securityScore >= 50 ? 'amber' : 'rose';

  const menuSections = [
    {
      label: 'Orders & Shopping',
      items: [
        { icon: Package, label: 'My Orders', to: '/orders', badge: stats?.totalOrders?.toString() },
        { icon: Calendar, label: 'Scheduled orders', to: '/profile/scheduled-orders' },
        { icon: RefreshCw, label: 'Subscriptions', to: '/profile/subscriptions' },
        { icon: Heart, label: 'Wishlist', to: '/wishlist', badge: stats?.wishlistCount?.toString() },
        { icon: Star, label: 'My Reviews', to: '/profile/reviews' },
        { icon: MessageCircle, label: 'Messages', to: '/messages' },
        { icon: GitCompare, label: 'Compare products', to: '/compare' },
        { icon: Eye, label: 'Recently viewed', to: '/profile/recently-viewed' },
        { icon: Heart, label: 'Followed shops', to: '/profile/followed-shops' },
      ],
    },
    {
      label: 'Wallet & Rewards',
      items: [
        { icon: Wallet, label: 'Wallet', to: '/profile/wallet', value: wallet ? formatPrice((wallet as any).balance ?? 0) : undefined },
        { icon: Sparkles, label: 'Loyalty points', to: '/profile/loyalty', value: wallet ? `${(wallet as any).loyaltyPoints ?? 0} pts` : undefined },
        { icon: Award, label: 'Loyalty tiers', to: '/profile/loyalty' },
        { icon: Trophy, label: 'Achievements', to: '/profile/achievements' },
        { icon: Gift, label: 'Gift cards', to: '/gift-cards' },
        { icon: Tag, label: 'Deals & offers', to: '/deals' },
        { icon: Users, label: 'Refer & earn', to: '/profile/referrals' },
      ],
    },
    {
      label: 'Account',
      items: [
        { icon: User, label: 'Edit profile', to: '/profile/edit' },
        { icon: MapPin, label: 'Addresses', to: '/profile/addresses', badge: stats?.addressCount?.toString() },
        { icon: CreditCard, label: 'Saved cards', to: '/profile/cards' },
        { icon: KeyRound, label: 'Password & security', to: '/profile/security' },
        { icon: Shield, label: 'Active sessions', to: '/profile/security' },
        { icon: Bell, label: 'Notification settings', to: '/profile/notifications' },
        { icon: Download, label: 'Export my data', to: '/profile/data-export' },
      ],
    },
    {
      label: 'Support & More',
      items: [
        { icon: HelpCircle, label: 'Help center', to: '/support' },
        { icon: Moon, label: 'Prayer & Ramzan mode', to: '/profile/prayer-mode' },
        { icon: Leaf, label: 'Green impact', to: '/profile/sustainability' },
        { icon: Building2, label: 'B2B Wholesale', to: '/b2b' },
      ],
    },
  ];

  return (
    <>
      <Helmet><title>{u.fullName} — My Profile | Nafaa Bazaar</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-5">
        {/* Hero */}
        <Card className="p-6 md:p-8 bg-gradient-brand text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-accent-400/20 blur-3xl translate-y-1/4 -translate-x-1/4" />
          <div className="relative z-10">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="relative">
                <Avatar
                  src={u.avatarUrl}
                  name={u.fullName}
                  size="xl"
                  className="ring-4 ring-white/30 shadow-2xl"
                />
                {emailVerified && (
                  <div className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-4 ring-brand-700 shadow-lg">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-2xs font-black mb-2">
                  <Sparkles className="h-3 w-3 text-accent-300" />
                  My Profile
                </div>
                <h1 className="text-2xl md:text-3xl font-black">{u.fullName}</h1>
                <div className="flex items-center gap-1.5 text-sm text-white/90 mt-1 font-bold">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{u.email || 'No email set'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-white/90 mt-1 font-bold">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{u.phone}</span>
                </div>
                {u.referralCode && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent-500/20 border border-accent-300/40 backdrop-blur px-2.5 py-1 text-2xs font-black">
                    <Gift className="h-3 w-3" />
                    Code: {u.referralCode}
                  </div>
                )}
              </div>

              <Button
                variant="glass"
                size="md"
                onClick={() => navigate('/profile/edit')}
                leftIcon={<Edit3 className="h-4 w-4" />}
                className="text-white"
              >
                Edit
              </Button>
            </div>

            {/* Stats grid */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { label: 'Orders', value: stats?.totalOrders ?? 0, icon: ShoppingBag },
                { label: 'Points', value: (wallet as any)?.loyaltyPoints ?? 0, icon: Sparkles },
                { label: 'Wallet', value: formatPrice((wallet as any)?.balance ?? 0), icon: Wallet },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="p-3 rounded-2xl bg-white/15 backdrop-blur border border-white/20 text-center">
                    <Icon className="h-4 w-4 mx-auto mb-1 opacity-80" />
                    <div className="text-lg font-black">{s.value}</div>
                    <div className="text-2xs opacity-90 font-bold uppercase">{s.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Verification banners */}
        {(!emailVerified || !hasPassword) && (
          <div className="space-y-2">
            {!emailVerified && u.email && (
              <Card className="p-4 bg-accent-50 dark:bg-accent-950/30 border-accent-300 dark:border-accent-800">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-500 to-orange-600 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm text-accent-800 dark:text-accent-300">Verify your email</div>
                    <div className="text-2xs text-accent-700 dark:text-accent-400 truncate">{u.email}</div>
                  </div>
                  <Button variant="accent" size="sm" onClick={() => navigate('/verify-email')}>
                    Verify
                  </Button>
                </div>
              </Card>
            )}

            <SetPasswordCard />
          </div>
        )}

        {/* Security Score */}
        <Card className={cn(
          'p-4',
          securityColor === 'emerald' && 'bg-brand-50 dark:bg-brand-950/30 border-brand-300 dark:border-brand-800',
          securityColor === 'amber' && 'bg-accent-50 dark:bg-accent-950/30 border-accent-300 dark:border-accent-800',
          securityColor === 'rose' && 'bg-danger/10 border-danger/30',
        )}>
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              'h-11 w-11 rounded-xl flex items-center justify-center shrink-0',
              securityColor === 'emerald' && 'bg-gradient-to-br from-brand-500 to-emerald-600',
              securityColor === 'amber' && 'bg-gradient-to-br from-accent-500 to-orange-600',
              securityColor === 'rose' && 'bg-gradient-to-br from-danger to-red-700',
            )}>
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-2xs font-black text-content-muted uppercase tracking-wider">Security score</div>
              <div className="text-xl font-black">{securityScore}%</div>
            </div>
            <Link
              to="/profile/security"
              className="text-2xs font-black text-brand-600 dark:text-brand-400 hover:underline"
            >
              Improve →
            </Link>
          </div>
          <div className="h-2 rounded-full bg-white/60 dark:bg-black/20 overflow-hidden">
            <div
              className={cn(
                'h-full transition-all',
                securityColor === 'emerald' && 'bg-gradient-to-r from-brand-400 to-emerald-600',
                securityColor === 'amber' && 'bg-gradient-to-r from-accent-400 to-orange-600',
                securityColor === 'rose' && 'bg-gradient-to-r from-danger to-red-700',
              )}
              style={{ width: `${securityScore}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <SecurityCheck label="Email" done={emailVerified} />
            <SecurityCheck label="Phone" done={phoneVerified} />
            <SecurityCheck label="Password" done={hasPassword} />
          </div>
        </Card>

        {/* Menu sections */}
        {menuSections.map((section) => (
          <div key={section.label}>
            <h3 className="text-xs font-black text-content-muted uppercase tracking-wider px-1 mb-2">
              {section.label}
            </h3>
            <Card className="divide-y divide-border overflow-hidden">
              {section.items.map((item: any) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-3 p-4 hover:bg-surface-muted transition group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="flex-1 font-bold text-sm">{item.label}</span>
                    {item.value && (
                      <span className="text-2xs font-black text-brand-600 dark:text-brand-400">{item.value}</span>
                    )}
                    {item.badge && (
                      <Badge variant="default" size="sm">{item.badge}</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-content-subtle group-hover:text-content group-hover:translate-x-1 transition" />
                  </Link>
                );
              })}
            </Card>
          </div>
        ))}

        {/* Logout */}
        <Card className="p-4">
          <button
            onClick={handleLogout}
            className="w-full h-12 rounded-2xl bg-danger/10 hover:bg-danger/20 border-2 border-danger/30 text-danger font-black text-sm inline-flex items-center justify-center gap-2 transition"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </Card>

        <div className="text-center text-2xs text-content-subtle pb-8">
          Nafaa Bazaar · 🇵🇰 Made in Pakistan · © 2026
        </div>
      </div>
    </>
  );
}

function SecurityCheck({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white/60 dark:bg-black/20">
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-brand-600 shrink-0" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 text-content-subtle shrink-0" />
      )}
      <span className={cn(
        'text-2xs font-black',
        done ? 'text-content' : 'text-content-muted',
      )}>
        {label}
      </span>
    </div>
  );
}
