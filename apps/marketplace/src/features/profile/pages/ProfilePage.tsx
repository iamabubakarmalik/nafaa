import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  User, MapPin, CreditCard, Wallet, Gift, Bell, ShieldCheck,
  MessageCircle, LogOut, ChevronRight, Star, Package, Heart,
  Sparkles, Users, HelpCircle, Award, Globe,
  Trophy, Eye, Tag,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { profileApi } from '../api/profile.api';
import { ordersApi } from '@/features/orders/api/orders.api';
import { Avatar, Card, Button, Badge } from '@/ui';
import { formatPrice } from '@/lib/format';
import { toast } from 'sonner';

export default function ProfilePage() {
  const navigate = useNavigate();
  const customer = useAuthStore((s) => s.customer);
  const logout = useAuthStore((s) => s.logout);

  const { data: wallet } = useQuery({ queryKey: ['wallet'], queryFn: profileApi.wallet });
  const { data: stats } = useQuery({ queryKey: ['order-stats'], queryFn: ordersApi.stats });
  const { data: referrals } = useQuery({ queryKey: ['referrals'], queryFn: profileApi.referrals });

  if (!customer) return null;

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/');
  };

  const menuSections: Array<{
    title: string;
    items: Array<{
      icon: any;
      label: string;
      to: string;
      badge?: string;
      value?: string;
    }>;
  }> = [
    {
      title: 'Orders & shopping',
      items: [
        { icon: Package, label: 'My Orders', to: '/orders', badge: stats?.totalOrders?.toString() },
        { icon: Heart, label: 'Wishlist', to: '/wishlist' },
        { icon: Star, label: 'My Reviews', to: '/profile/reviews' },
        { icon: Heart, label: 'Followed shops', to: '/profile/followed-shops' },
        { icon: Eye, label: 'Recently viewed', to: '/profile/recently-viewed' },
        { icon: MessageCircle, label: 'Messages', to: '/messages' },
        { icon: Gift, label: 'Gift cards', to: '/gift-cards' },
        { icon: Tag, label: 'Deals & offers', to: '/deals' },
        { icon: 'GitCompare' as any, label: 'Compare', to: '/compare' },
      ],
    },
    {
      title: 'Payments & rewards',
      items: [
        { icon: Wallet, label: 'Wallet', to: '/profile/wallet', value: wallet ? formatPrice(wallet.balance) : undefined },
        { icon: Sparkles, label: 'Loyalty points', to: '/profile/loyalty', value: wallet ? `${wallet.loyaltyPoints} pts` : undefined },
        { icon: Award, label: 'Loyalty tiers', to: '/profile/loyalty' },
        { icon: Trophy, label: 'Achievements', to: '/profile/achievements' },
        { icon: CreditCard, label: 'Saved cards', to: '/profile/cards' },
        { icon: Gift, label: 'Referral program', to: '/profile/referrals', badge: referrals ? `${referrals.totalReferrals}` : undefined },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: MapPin, label: 'Addresses', to: '/profile/addresses' },
        { icon: Bell, label: 'Notification settings', to: '/profile/notifications' },
        { icon: 'BellRing' as any, label: 'Price alerts', to: '/profile/price-alerts' },
        { icon: 'PackageCheck' as any, label: 'Restock alerts', to: '/profile/restock-alerts' },
        { icon: Globe, label: 'Language & region', to: '/profile/language' },
        { icon: ShieldCheck, label: 'Privacy & security', to: '/profile/security' },
        { icon: 'Download' as any, label: 'Export my data', to: '/profile/data-export' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: MessageCircle, label: 'Help center', to: '/support' },
        { icon: HelpCircle, label: 'About Nafaa', to: '/about' },
      ],
    },
  ];

  return (
    <>
      <Helmet><title>My Profile — Nafaa Bazaar</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-5">
        {/* Profile header */}
        <Card className="p-5 md:p-6 bg-gradient-brand text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10 flex items-center gap-4">
            <Avatar src={customer.avatarUrl} name={customer.fullName} size="xl" ring />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-black truncate">{customer.fullName}</h1>
              <p className="text-brand-50 text-sm truncate">{customer.phone}</p>
              {customer.email && (
                <p className="text-brand-50 text-xs truncate">{customer.email}</p>
              )}
            </div>
            <Button
              variant="glass"
              size="sm"
              onClick={() => navigate('/profile/edit')}
            >
              Edit
            </Button>
          </div>
        </Card>

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center">
              <Package className="h-5 w-5 text-brand-600 mx-auto mb-1" />
              <div className="text-lg font-black">{stats.totalOrders}</div>
              <div className="text-2xs text-content-muted font-bold">Orders</div>
            </Card>
            <Card className="p-3 text-center">
              <Award className="h-5 w-5 text-accent-500 mx-auto mb-1" />
              <div className="text-lg font-black">{wallet?.loyaltyPoints || 0}</div>
              <div className="text-2xs text-content-muted font-bold">Points</div>
            </Card>
            <Card className="p-3 text-center">
              <Wallet className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
              <div className="text-lg font-black tabular-nums">
                {wallet ? formatPrice(wallet.balance).replace('PKR ', '') : '0'}
              </div>
              <div className="text-2xs text-content-muted font-bold">Wallet</div>
            </Card>
          </div>
        )}

        {/* Menu sections */}
        {menuSections.map((section) => (
          <div key={section.title}>
            <div className="text-2xs font-black text-content-subtle uppercase tracking-wider mb-2 px-1">
              {section.title}
            </div>
            <Card className="divide-y divide-border overflow-hidden">
              {section.items.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="flex items-center gap-3 p-4 hover:bg-surface-muted transition group"
                >
                  <div className="h-10 w-10 rounded-xl bg-surface-muted group-hover:bg-brand-100 dark:group-hover:bg-brand-900/40 flex items-center justify-center transition">
                    <item.icon className="h-4 w-4 text-content-muted group-hover:text-brand-600 transition" />
                  </div>
                  <div className="flex-1 font-bold text-sm">{item.label}</div>
                  {item.value && (
                    <span className="text-xs font-bold text-brand-600">{item.value}</span>
                  )}
                  {item.badge && (
                    <Badge variant="brand" size="sm">{item.badge}</Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-content-subtle" />
                </Link>
              ))}
            </Card>
          </div>
        ))}

        {/* Logout */}
        <Button
          variant="ghost"
          fullWidth
          size="lg"
          onClick={handleLogout}
          leftIcon={<LogOut className="h-4 w-4" />}
          className="text-danger hover:bg-danger/10"
        >
          Logout
        </Button>

        {/* Version */}
        <div className="text-center text-2xs text-content-subtle pb-8">
          Nafaa Bazaar v1.0.0 · Made in Pakistan 🇵🇰
        </div>
      </div>
    </>
  );
}
