import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Alert, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  User, Bell, HelpCircle, FileText, LogOut, ChevronRight, Sparkles,
  Building2, CreditCard, Award, Settings, Receipt, BarChart3, Gift,
  Hash, Package, Truck, BookOpen, ShoppingCart, RotateCcw, Percent,
  Pill, Utensils, Scissors, Smartphone, Calendar,
  Wallet, AlertTriangle, ScanLine, Activity, ClipboardCheck,
  ArrowRightLeft, PackagePlus, Tag, ShieldCheck, Database, Download,
  TrendingUp, Gauge, Crown, Search, X, Store, UserCog,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth.store';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { useThemeStore } from '@/store/theme.store';
import { authApi } from '@/api/auth.api';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
interface NavItem {
  icon: any;
  label: string;
  description?: string;
  onPress: () => void;
  color: string;
  bg: string;
  badge?: string;
}

interface NavSection {
  title: string;
  icon: any;
  items: NavItem[];
}

export default function MoreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, tenant, refreshToken, logout } = useAuthStore();
  const { isDark } = useThemeStore();
  const { features: businessFeatures, businessType } = useBusinessFeatures();
  const [search, setSearch] = useState('');

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            if (refreshToken) await authApi.logout(refreshToken);
          } catch {}
          await logout();
          Toast.show({ type: 'success', text1: 'Logged out' });
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const go = (path: string) => () => {
    Haptics.selectionAsync();
    router.push(path as any);
  };

  const comingSoon = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Toast.show({ type: 'info', text1: 'Coming soon' });
  };

  const sections: NavSection[] = [
    {
      title: 'Overview',
      icon: BarChart3,
      items: [
        {
          icon: BarChart3,
          label: 'Reports',
          description: 'Sales, profit & analytics',
          onPress: go('/reports'),
          color: '#2563eb',
          bg: '#dbeafe',
        },
        {
          icon: TrendingUp,
          label: 'Profit by Product',
          description: 'Best performers',
          onPress: go('/profit-report'),
          color: '#16a34a',
          bg: '#dcfce7',
        },
      ],
    },
    {
      title: 'Sales',
      icon: ShoppingCart,
      items: [
        {
          icon: Receipt,
          label: 'Sales History',
          description: 'All transactions',
          onPress: go('/sales'),
          color: '#16a34a',
          bg: '#dcfce7',
        },
        {
          icon: RotateCcw,
          label: 'Returns',
          description: 'Refunds & exchanges',
          onPress: go('/returns'),
          color: '#f97316',
          bg: '#ffedd5',
        },
        {
          icon: BookOpen,
          label: 'Khata (Udhaar)',
          description: 'Credit ledger',
          onPress: go('/khata'),
          color: '#dc2626',
          bg: '#fee2e2',
        },
        {
          icon: Award,
          label: 'Loyalty Points',
          description: 'Customer rewards',
          onPress: go('/loyalty'),
          color: '#f59e0b',
          bg: '#fef3c7',
        },
        {
          icon: Percent,
          label: 'Discount Codes',
          description: 'Promo codes',
          onPress: go('/discounts'),
          color: '#ec4899',
          bg: '#fce7f3',
        },
        {
          icon: Wallet,
          label: 'Cash Register',
          description: 'Daily cash management',
          onPress: go('/cash-register'),
          color: '#16a34a',
          bg: '#dcfce7',
        },
      ],
    },
    {
      title: 'Customers',
      icon: User,
      items: [
        {
          icon: User,
          label: 'Customers',
          description: 'All customers',
          onPress: go('/(tabs)/customers'),
          color: '#8b5cf6',
          bg: '#ede9fe',
        },
        {
          icon: Truck,
          label: 'Suppliers',
          description: 'Vendor management',
          onPress: go('/suppliers'),
          color: '#f97316',
          bg: '#ffedd5',
        },
      ],
    },
    {
      title: 'Staff Management',
      icon: UserCog,
      items: [
        {
          icon: UserCog,
          label: 'All Staff',
          description: 'Employees, attendance, salary',
          onPress: go('/staff'),
          color: '#7c3aed',
          bg: '#ede9fe',
          badge: 'NEW',
        },
        {
          icon: ClipboardCheck,
          label: 'Attendance',
          description: 'Daily check-in / out',
          onPress: go('/staff/attendance'),
          color: '#0ea5e9',
          bg: '#e0f2fe',
        },
        {
          icon: Wallet,
          label: 'Process Salary',
          description: 'Pay employees',
          onPress: go('/staff/salary/new'),
          color: '#16a34a',
          bg: '#dcfce7',
        },
      ],
    },
    {
      title: 'Industry Tools',
      icon: Sparkles,
      items: [
        ...(businessFeatures.expiry || businessFeatures.batches
          ? [
              {
                icon: Pill,
                label: 'Expiry Dashboard',
                description: 'Pharmacy expiry tracking',
                onPress: go('/expiry-dashboard'),
                color: '#dc2626',
                bg: '#fee2e2',
                badge: 'PHARMACY',
              },
            ]
          : []),
        ...(businessFeatures.tables
          ? [
              {
                icon: Utensils,
                label: 'Tables / Floor Plan',
                description: 'Restaurant seating',
                onPress: go('/tables'),
                color: '#ea580c',
                bg: '#ffedd5',
                badge: 'RESTAURANT',
              },
            ]
          : []),
        ...(businessFeatures.appointments
          ? [
              {
                icon: Scissors,
                label: 'Appointments',
                description: 'Salon bookings',
                onPress: go('/appointments'),
                color: '#a855f7',
                bg: '#f3e8ff',
                badge: 'SALON',
              },
            ]
          : []),
      ],
    },
    {
      title: 'Inventory',
      icon: Package,
      items: [
        {
          icon: Package,
          label: 'Products',
          description: 'All inventory',
          onPress: go('/(tabs)/products'),
          color: '#16a34a',
          bg: '#dcfce7',
        },
        {
          icon: Building2,
          label: 'Brands',
          description: 'Product brands',
          onPress: go('/brands'),
          color: '#8b5cf6',
          bg: '#ede9fe',
        },
        {
          icon: Hash,
          label: 'Tags',
          description: 'Product tags',
          onPress: go('/tags'),
          color: '#ec4899',
          bg: '#fce7f3',
        },
        {
          icon: Tag,
          label: 'Categories',
          description: 'Group products',
          onPress: go('/categories'),
          color: '#2563eb',
          bg: '#dbeafe',
        },
        {
          icon: AlertTriangle,
          label: 'Low Stock Alerts',
          description: 'Items running low',
          onPress: go('/low-stock'),
          color: '#f59e0b',
          bg: '#fef3c7',
        },
        {
          icon: ScanLine,
          label: 'Barcode Labels',
          description: 'Print labels',
          onPress: go('/barcode-labels'),
          color: '#0891b2',
          bg: '#cffafe',
        },
        {
          icon: Activity,
          label: 'Stock Movements',
          description: 'Track changes',
          onPress: go('/stock-movements'),
          color: '#737373',
          bg: '#f3f4f6',
        },
        {
          icon: ClipboardCheck,
          label: 'Stock Adjustments',
          description: 'Manual updates',
          onPress: go('/stock-adjustments'),
          color: '#f97316',
          bg: '#ffedd5',
        },
        {
          icon: ArrowRightLeft,
          label: 'Stock Transfers',
          description: 'Between shops',
          onPress: go('/transfers'),
          color: '#0891b2',
          bg: '#cffafe',
        },
        {
          icon: PackagePlus,
          label: 'Purchases',
          description: 'Stock incoming',
          onPress: go('/purchases'),
          color: '#7c3aed',
          bg: '#ede9fe',
        },
      ],
    },
    {
      title: 'Finance & Plan',
      icon: CreditCard,
      items: [
        {
          icon: Wallet,
          label: 'Expenses',
          description: 'Business spending',
          onPress: go('/expenses'),
          color: '#dc2626',
          bg: '#fee2e2',
        },
        {
          icon: CreditCard,
          label: 'Billing & Invoices',
          description: 'Subscription & payments',
          onPress: go('/billing'),
          color: '#0ea5e9',
          bg: '#e0f2fe',
        },
        {
          icon: Sparkles,
          label: 'Plans & Pricing',
          description: 'Upgrade plan',
          onPress: go('/plan'),
          color: '#16a34a',
          bg: '#dcfce7',
        },
        {
          icon: Gauge,
          label: 'Plan Usage',
          description: 'Track limits',
          onPress: go('/plan-usage'),
          color: '#737373',
          bg: '#f3f4f6',
        },
        {
          icon: Gift,
          label: 'Referrals',
          description: 'Invite & earn',
          onPress: go('/referrals'),
          color: '#ec4899',
          bg: '#fce7f3',
        },
      ],
    },
    {
      title: 'Data',
      icon: Database,
      items: [
        {
          icon: Download,
          label: 'Exports',
          description: 'CSV / Excel',
          onPress: go('/exports'),
          color: '#16a34a',
          bg: '#dcfce7',
        },
        {
          icon: Database,
          label: 'Backup',
          description: 'Cloud backups',
          onPress: go('/backup'),
          color: '#2563eb',
          bg: '#dbeafe',
        },
      ],
    },
    {
      title: 'System',
      icon: Settings,
      items: [
        {
          icon: ShieldCheck,
          label: 'Team Members',
          description: 'Manage staff',
          onPress: go('/team'),
          color: '#7c3aed',
          bg: '#ede9fe',
        },
        {
          icon: Store,
          label: 'Shops / Branches',
          description: 'Multi-location',
          onPress: go('/shops'),
          color: '#0891b2',
          bg: '#cffafe',
        },
        {
          icon: Activity,
          label: 'Activity Log',
          description: 'Audit trail',
          onPress: go('/activity-log'),
          color: '#737373',
          bg: '#f3f4f6',
        },
        {
          icon: Bell,
          label: 'Notifications',
          description: 'Alert center',
          onPress: go('/notifications'),
          color: '#f59e0b',
          bg: '#fef3c7',
        },
        {
          icon: Settings,
          label: 'Settings',
          description: 'App preferences',
          onPress: go('/settings'),
          color: '#525252',
          bg: '#f3f4f6',
        },
      ],
    },
    {
      title: 'Help & Account',
      icon: HelpCircle,
      items: [
        {
          icon: User,
          label: 'Profile',
          description: 'Your info',
          onPress: go('/profile'),
          color: '#525252',
          bg: '#f3f4f6',
        },
        {
          icon: HelpCircle,
          label: 'Help Center',
          description: 'Get support',
          onPress: go('/help'),
          color: '#2563eb',
          bg: '#dbeafe',
        },
        {
          icon: FileText,
          label: 'Terms & Privacy',
          description: 'Legal info',
          onPress: go('/legal'),
          color: '#737373',
          bg: '#f3f4f6',
        },
      ],
    },
  ];

  // Filter sections based on search
  const filteredSections = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return sections;
    return sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            (item.description || '').toLowerCase().includes(q),
        ),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [sections, search]);

  const roleColor = useMemo(() => {
    switch (user?.role) {
      case 'OWNER':
        return { bg: '#fef3c7', text: '#b45309' };
      case 'MANAGER':
        return { bg: '#ede9fe', text: '#6d28d9' };
      case 'CASHIER':
        return { bg: '#dbeafe', text: '#1d4ed8' };
      default:
        return { bg: '#f3f4f6', text: '#4b5563' };
    }
  }, [user?.role]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== Premium Profile Card ===== */}
        <View className="px-5 pt-4 pb-3">
          <View
            className="rounded-3xl p-4 overflow-hidden"
            style={{
              backgroundColor: '#16a34a',
              shadowColor: '#16a34a',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-16 w-16 rounded-2xl bg-white/20 items-center justify-center">
                <Text className="text-white text-2xl font-extrabold">
                  {user?.fullName?.charAt(0).toUpperCase() || 'N'}
                </Text>
              </View>
              <View className="flex-1 min-w-0">
                <Text
                  className="font-extrabold text-lg text-white"
                  numberOfLines={1}
                >
                  {user?.fullName || 'User'}
                </Text>
                <Text className="text-xs text-white/80 mt-0.5" numberOfLines={1}>
                  {user?.email}
                </Text>
                <View className="flex-row items-center gap-1.5 mt-2">
                  <View
                    className="flex-row items-center gap-1 px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  >
                    {user?.role === 'OWNER' && (
                      <Crown size={10} color="#fde68a" fill="#fde68a" />
                    )}
                    <Text className="text-[10px] font-extrabold text-white">
                      {user?.role}
                    </Text>
                  </View>
                  <View
                    className="px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <Text
                      className="text-[10px] font-bold text-white"
                      numberOfLines={1}
                    >
                      {tenant?.name}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ===== Quick Actions ===== */}
        <View className="px-5 mb-3">
          <View className="flex-row gap-2">
            <Pressable
              onPress={go('/billing')}
              className="flex-1 rounded-2xl p-3 flex-row items-center gap-2.5"
              style={{
                backgroundColor: '#0ea5e9',
                shadowColor: '#0ea5e9',
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="h-10 w-10 rounded-2xl bg-white/20 items-center justify-center">
                <CreditCard size={18} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-extrabold text-sm">{t('auto.index.billing')}</Text>
                <Text className="text-white/80 text-[10px] mt-0.5">{t('auto.more.manage_subscription')}</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={go('/plan')}
              className="flex-1 rounded-2xl p-3 flex-row items-center gap-2.5"
              style={{
                backgroundColor: '#7c3aed',
                shadowColor: '#7c3aed',
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="h-10 w-10 rounded-2xl bg-white/20 items-center justify-center">
                <Sparkles size={18} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-extrabold text-sm">{t('auto.more.upgrade')}</Text>
                <Text className="text-white/80 text-[10px] mt-0.5">{t('auto.more.see_all_plans')}</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* ===== Search Bar ===== */}
        <View className="px-5 mb-3">
          <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
            <Search size={20} color="#9ca3af" />
            <TextInput
              placeholder="Search menu..."
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
              className="flex-1 text-base text-neutral-900 dark:text-white"
            />
            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch('')}
                hitSlop={12}
                className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={14} color="#9ca3af" />
              </Pressable>
            )}
          </View>
        </View>

        {/* ===== Sections ===== */}
        {filteredSections.length === 0 ? (
          <View className="px-5 py-8 items-center">
            <Search size={36} color="#d1d5db" />
            <Text className="mt-3 text-base font-bold text-neutral-700">{t('auto.more.no_results_found')}</Text>
            <Text className="text-xs text-neutral-500 mt-1">{t('auto.more.try_a_different_search_term')}</Text>
          </View>
        ) : (
          filteredSections.map((section) => {
            const SectionIcon = section.icon;
            return (
              <View key={section.title} className="px-5 mb-5">
                <View className="flex-row items-center gap-2 mb-2 px-1">
                  <SectionIcon size={13} color="#737373" />
                  <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    {section.title}
                  </Text>
                </View>
                <View
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                  style={{
                    shadowColor: '#000',
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                  }}
                >
                  {section.items.map((item, idx) => {
                    const Icon = item.icon;
                    const isLast = idx === section.items.length - 1;
                    return (
                      <Pressable
                        key={item.label}
                        onPress={item.onPress}
                        className={`flex-row items-center px-4 py-3 active:bg-neutral-50 dark:active:bg-neutral-800 ${
                          !isLast
                            ? 'border-b border-neutral-100 dark:border-neutral-800'
                            : ''
                        }`}
                      >
                        <View
                          className="h-10 w-10 rounded-2xl items-center justify-center"
                          style={{ backgroundColor: item.bg }}
                        >
                          <Icon size={18} color={item.color} />
                        </View>
                        <View className="flex-1 ml-3">
                          <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                            {item.label}
                          </Text>
                          {item.description && (
                            <Text className="text-xs text-neutral-500 mt-0.5">
                              {item.description}
                            </Text>
                          )}
                        </View>
                        {item.badge && (
                          <View
                            className="px-2 py-0.5 rounded-md mr-2"
                            style={{ backgroundColor: item.bg }}
                          >
                            <Text
                              className="text-[10px] font-extrabold"
                              style={{ color: item.color }}
                            >
                              {item.badge}
                            </Text>
                          </View>
                        )}
                        <ChevronRight size={18} color="#9ca3af" />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}

        {/* ===== Logout ===== */}
        <View className="px-5 mt-2">
          <Pressable
            onPress={handleLogout}
            className="flex-row items-center justify-center gap-2 py-4 rounded-2xl border-2 active:opacity-70"
            style={{
              borderColor: '#fecaca',
              backgroundColor: '#fee2e2',
            }}
          >
            <LogOut size={18} color="#dc2626" />
            <Text className="text-rose-700 font-extrabold text-base">{t('auto.index.logout')}</Text>
          </Pressable>
        </View>

        {/* ===== Footer ===== */}
        <View className="items-center mt-6">
          <Text className="text-xs text-neutral-400 font-semibold">{t('auto.more.nafaa_v1_0_0')}</Text>
          <Text className="text-[10px] text-neutral-400 mt-0.5">{t('auto.more.made_in_pakistan_with')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
