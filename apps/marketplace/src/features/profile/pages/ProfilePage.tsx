import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin, Wallet, Gift, Heart, Package, HelpCircle,
  LogOut, ChevronRight, Star, Sparkles, Share2,
} from 'lucide-react';
import { useCustomerAuthStore } from '@/stores/customerAuth.store';
import { profileApi } from '../api/profile.api';
import { Avatar } from '@shared/ui/Avatar';
import { Badge } from '@shared/ui/Badge';

export default function ProfilePage() {
  const navigate = useNavigate();
  const customer = useCustomerAuthStore((s) => s.customer);
  const logout = useCustomerAuthStore((s) => s.logout);

  const { data: wallet } = useQuery({
    queryKey: ['market-wallet'],
    queryFn: profileApi.wallet,
    enabled: !!customer,
  });

  if (!customer) {
    navigate('/login');
    return null;
  }

  const menuItems = [
    { icon: MapPin,   label: 'Addresses',      to: '/profile/addresses',   color: 'text-brand-600' },
    { icon: Package,  label: 'My Orders',      to: '/orders',              color: 'text-blue-600' },
    { icon: Heart,    label: 'Wishlist',       to: '/wishlist',            color: 'text-rose-600' },
    { icon: Star,     label: 'My Reviews',     to: '/profile/reviews',     color: 'text-amber-600' },
    { icon: Gift,     label: 'Refer & Earn',   to: '/profile/referrals',   color: 'text-purple-600', badge: 'Earn Rs 100' },
    { icon: HelpCircle, label: 'Help & Support', to: '/support',            color: 'text-slate-600' },
  ];

  return (
    <div className="space-y-4 pb-8">
      {/* Profile Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-emerald-700 to-teal-800 p-5 text-white shadow-brand-lg">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <Avatar src={customer.avatarUrl} name={customer.fullName} size="xl" ring />
          <div className="flex-1 min-w-0">
            <div className="font-black text-xl truncate">{customer.fullName}</div>
            <div className="text-sm text-white/80 truncate">{customer.phone}</div>
            <button className="mt-2 inline-flex items-center gap-1 text-[11px] font-extrabold bg-white/20 backdrop-blur px-2.5 py-1 rounded-full">
              <Sparkles className="h-3 w-3" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-950/30 dark:to-emerald-950/30 border border-brand-200 dark:border-brand-800 p-4">
          <Wallet className="h-5 w-5 text-brand-600 mb-2" />
          <div className="text-[10px] font-extrabold text-brand-700 dark:text-brand-400 uppercase tracking-widest">Wallet</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            Rs {wallet?.balance?.toFixed(0) || 0}
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 p-4">
          <Star className="h-5 w-5 text-amber-600 mb-2" />
          <div className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-widest">Points</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {wallet?.loyaltyPoints || 0}
          </div>
          <div className="text-[10px] text-slate-500 font-bold">= Rs {wallet?.loyaltyValue?.toFixed(0) || 0}</div>
        </div>
      </div>

      {/* Referral Card */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 p-5 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-90">Refer & Earn</div>
            <div className="text-lg font-black mt-1">Rs 100 for each friend! 🎁</div>
            <div className="mt-2 inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1.5 rounded-full">
              <code className="text-sm font-black">{customer.referralCode}</code>
              <button onClick={() => {
                navigator.clipboard.writeText(customer.referralCode);
              }}>
                <Share2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft overflow-hidden">
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800 transition ${i > 0 ? 'border-t border-slate-100 dark:border-neutral-800' : ''}`}
            >
              <div className={`h-10 w-10 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center ${item.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left font-extrabold text-sm text-slate-900 dark:text-white">
                {item.label}
              </div>
              {item.badge && <Badge variant="accent" size="xs">{item.badge}</Badge>}
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          );
        })}
      </div>

      {/* Logout */}
      <button
        onClick={() => {
          if (confirm('Logout karna hai?')) {
            logout();
            navigate('/');
          }
        }}
        className="w-full p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 font-extrabold flex items-center justify-center gap-2 transition"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </div>
  );
}
