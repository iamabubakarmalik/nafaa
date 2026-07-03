import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, Alert, TextInput, Image,
  RefreshControl, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  User, Bell, HelpCircle, FileText, LogOut, ChevronRight, ChevronDown,
  Sparkles, Building2, CreditCard, Award, Settings as SettingsIcon,
  Receipt, BarChart3, Gift, Hash, Package, Truck, BookOpen, ShoppingCart,
  RotateCcw, Percent, Pill, Utensils, Scissors, Smartphone, Wallet,
  AlertTriangle, ScanLine, Activity, ClipboardCheck, ArrowRightLeft,
  PackagePlus, Tag, ShieldCheck, Database, Download, TrendingUp, Gauge,
  Crown, Search, X, Store, UserCog, Layers, Upload, RefreshCw, Wrench,
  BookmarkPlus, Star, StarOff, LayoutDashboard, Eye, LifeBuoy, ScrollText,
  UserCircle, CheckCircle2, Wallet2, Zap,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth.store';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { hasPermission, PERMISSIONS, type PermissionKey } from '@/lib/permissions';
import { authApi } from '@/api/auth.api';
import { apiClient } from '@/api/client';
import Toast from 'react-native-toast-message';
import { useTranslation } from '@/i18n/useTranslation';

const FAVORITES_KEY = 'nafaa-more-favorites-v1';
const GROUPS_KEY = 'nafaa-more-groups-v1';

const DEFAULT_FAVORITES = ['/(tabs)/index', '/(tabs)/pos', '/sales', '/stock-report', '/(tabs)/customers', '/(tabs)/products', '/khata'];

type NavItem = {
  to: string;
  label: string;
  description?: string;
  icon: any;
  color: string;
  bg: string;
  permission?: PermissionKey;
  badge?: string;
};

type NavGroup = {
  label: string;
  icon: any;
  items: NavItem[];
  defaultOpen?: boolean;
  industryOnly?: 'carpet' | 'mobile';
};

// ─── localStorage helpers ────────────────────────────
const loadFavorites = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_FAVORITES;
};

const saveFavorites = async (favs: string[]) => {
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  } catch {}
};

const loadGroupState = async (): Promise<Record<string, boolean>> => {
  try {
    const raw = await AsyncStorage.getItem(GROUPS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
};

const saveGroupState = async (state: Record<string, boolean>) => {
  try {
    await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(state));
  } catch {}
};

// ─── ROLE CONFIG ─────────────────────────────────────
const roleConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  OWNER:       { label: 'Owner',       color: '#b45309', bg: 'rgba(254,243,199,0.9)', icon: Crown },
  MANAGER:     { label: 'Manager',     color: '#6d28d9', bg: 'rgba(237,233,254,0.9)', icon: ShieldCheck },
  CASHIER:     { label: 'Cashier',     color: '#1d4ed8', bg: 'rgba(219,234,254,0.9)', icon: User },
  STAFF:       { label: 'Staff',       color: '#4b5563', bg: 'rgba(243,244,246,0.9)', icon: User },
  SUPER_ADMIN: { label: 'Super Admin', color: '#dc2626', bg: 'rgba(254,226,226,0.9)', icon: Crown },
};

export default function MoreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, tenant, refreshToken, logout } = useAuthStore();
  const { features: businessFeatures, businessType } = useBusinessFeatures();

  const [search, setSearch] = useState('');
  const [favoritePaths, setFavoritePaths] = useState<string[]>(DEFAULT_FAVORITES);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

  // Fetch /auth/me for latest avatar + verified status
  const { data: me, refetch: refetchMe } = useQuery({
    queryKey: ['more-me'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/auth/me');
        return res.data?.data ?? res.data;
      } catch {
        return null;
      }
    },
  });

  const u: any = me?.user || user;
  const emailVerified = !!u?.emailVerified;
  const avatarUrl = u?.avatarUrl;

  // Load favorites + group state on mount
  useEffect(() => {
    loadFavorites().then(setFavoritePaths);
    loadGroupState().then(setOpenGroups);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchMe();
    setRefreshing(false);
  };

  // Mark that navigation came from More tab
  const go = (path: string) => async () => {
    Haptics.selectionAsync();
    try {
      await AsyncStorage.setItem('nafaa-nav-source', 'more');
    } catch {}
    router.push(path as any);
  };

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

  // ─── FULL NAV STRUCTURE (matches web) ────────────
  const navGroups: NavGroup[] = useMemo(() => [
    {
      label: 'Overview',
      icon: LayoutDashboard,
      defaultOpen: true,
      items: [
        { to: '/(tabs)/index', label: 'Dashboard', description: 'Home & KPIs', icon: LayoutDashboard, color: '#16a34a', bg: '#dcfce7' },
        { to: '/reports', label: 'All Reports', description: 'Sales, profit, analytics', icon: BarChart3, color: '#2563eb', bg: '#dbeafe', permission: PERMISSIONS.REPORTS_VIEW },
        { to: '/profit-report', label: 'Profit by Product', description: 'Best performers', icon: TrendingUp, color: '#16a34a', bg: '#dcfce7', permission: PERMISSIONS.PROFIT_REPORT_VIEW },
      ],
    },
    {
      label: 'Sales & Orders',
      icon: ShoppingCart,
      defaultOpen: true,
      items: [
        { to: '/sales', label: 'Sales History', description: 'All transactions', icon: Receipt, color: '#16a34a', bg: '#dcfce7', permission: PERMISSIONS.SALES_VIEW },
        { to: '/bookings', label: 'Bookings / Advance', description: 'Reserve items with advance', icon: BookmarkPlus, color: '#2563eb', bg: '#dbeafe', permission: PERMISSIONS.SALES_VIEW, badge: 'NEW' },
        { to: '/returns', label: 'Returns', description: 'Refunds & exchanges', icon: RotateCcw, color: '#f97316', bg: '#ffedd5', permission: PERMISSIONS.RETURNS_VIEW },
        { to: '/khata', label: 'Khata (Udhaar)', description: 'Credit ledger', icon: BookOpen, color: '#dc2626', bg: '#fee2e2', permission: PERMISSIONS.KHATA_VIEW },
        { to: '/loyalty', label: 'Loyalty Points', description: 'Customer rewards', icon: Award, color: '#f59e0b', bg: '#fef3c7', permission: PERMISSIONS.LOYALTY_VIEW },
        { to: '/discounts', label: 'Discount Codes', description: 'Promo codes', icon: Percent, color: '#ec4899', bg: '#fce7f3', permission: PERMISSIONS.DISCOUNTS_VIEW },
        { to: '/cash-register', label: 'Cash Register', description: 'Daily cash management', icon: Wallet, color: '#16a34a', bg: '#dcfce7', permission: PERMISSIONS.CASH_REGISTER_VIEW },
      ],
    },
    {
      label: 'Customers & Vendors',
      icon: User,
      items: [
        { to: '/(tabs)/customers', label: 'Customers', description: 'All customers', icon: User, color: '#8b5cf6', bg: '#ede9fe', permission: PERMISSIONS.CUSTOMERS_VIEW },
        { to: '/suppliers', label: 'Suppliers', description: 'Vendor management', icon: Truck, color: '#f97316', bg: '#ffedd5', permission: PERMISSIONS.SUPPLIERS_VIEW },
      ],
    },
    {
      label: 'Staff & Team',
      icon: UserCog,
      items: [
        { to: '/staff', label: 'All Staff', description: 'Employees, attendance, salary', icon: UserCog, color: '#7c3aed', bg: '#ede9fe', badge: 'NEW' },
        { to: '/staff/attendance', label: 'Attendance', description: 'Daily check-in / out', icon: CheckCircle2, color: '#0ea5e9', bg: '#e0f2fe' },
        { to: '/staff/salary/new', label: 'Process Salary', description: 'Pay employees', icon: Wallet2, color: '#16a34a', bg: '#dcfce7' },
        { to: '/team', label: 'App Users', description: 'Manage staff logins', icon: ShieldCheck, color: '#7c3aed', bg: '#ede9fe', permission: PERMISSIONS.TEAM_VIEW },
      ],
    },
    {
      label: 'Carpet Industry',
      icon: Layers,
      industryOnly: 'carpet',
      items: [
        { to: '/industries/carpet/rolls', label: 'Carpet Rolls', description: 'Roll inventory & cutting', icon: Layers, color: '#16a34a', bg: '#dcfce7', badge: 'NEW' },
        { to: '/industries/carpet/cut-pieces', label: 'Cut Pieces', description: 'Leftover inventory', icon: Scissors, color: '#8b5cf6', bg: '#ede9fe' },
        { to: '/industries/carpet/reports', label: 'Carpet Reports', description: 'Profit & analytics', icon: BarChart3, color: '#0891b2', bg: '#cffafe' },
        { to: '/industries/carpet/rolls/bulk-import', label: 'Bulk Import Rolls', description: 'Add many rolls at once', icon: Upload, color: '#2563eb', bg: '#dbeafe' },
      ],
    },
    {
      label: 'Mobile Industry',
      icon: Smartphone,
      industryOnly: 'mobile',
      items: [
        { to: '/imei-inventory', label: 'IMEI Inventory', description: 'PTA tracking', icon: Smartphone, color: '#2563eb', bg: '#dbeafe' },
        { to: '/industries/mobile/used-phones', label: 'Used Phones', description: 'Trade-in inventory', icon: RefreshCw, color: '#7c3aed', bg: '#ede9fe', badge: 'NEW' },
        { to: '/industries/mobile/repairs', label: 'Repair Tickets', description: 'Service management', icon: Wrench, color: '#ea580c', bg: '#ffedd5', badge: 'NEW' },
        { to: '/industries/mobile/emi', label: 'EMI Plans', description: 'Installments', icon: CreditCard, color: '#f59e0b', bg: '#fef3c7', badge: 'NEW' },
        { to: '/industries/mobile/reports', label: 'Mobile Reports', description: 'Industry analytics', icon: BarChart3, color: '#0891b2', bg: '#cffafe' },
      ],
    },
    {
      label: 'Inventory',
      icon: Package,
      items: [
        { to: '/stock-report', label: 'Stock Report', description: 'Complete inventory snapshot', icon: BarChart3, color: '#0891b2', bg: '#cffafe', permission: PERMISSIONS.PRODUCTS_VIEW, badge: 'NEW' },
        { to: '/(tabs)/products', label: 'Products', description: 'All inventory', icon: Package, color: '#16a34a', bg: '#dcfce7', permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/catalog', label: 'Catalog', description: 'Product catalog view', icon: Eye, color: '#0891b2', bg: '#cffafe', permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/brands', label: 'Brands', description: 'Product brands', icon: Building2, color: '#8b5cf6', bg: '#ede9fe', permission: PERMISSIONS.BRANDS_VIEW },
        { to: '/categories', label: 'Categories', description: 'Group products', icon: Tag, color: '#2563eb', bg: '#dbeafe', permission: PERMISSIONS.CATEGORIES_VIEW },
        { to: '/tags', label: 'Tags', description: 'Product tags', icon: Hash, color: '#ec4899', bg: '#fce7f3', permission: PERMISSIONS.TAGS_VIEW },
        { to: '/low-stock', label: 'Low Stock Alerts', description: 'Items running low', icon: AlertTriangle, color: '#f59e0b', bg: '#fef3c7', permission: PERMISSIONS.LOW_STOCK_VIEW },
        { to: '/barcode-labels', label: 'Barcode Labels', description: 'Print labels', icon: ScanLine, color: '#0891b2', bg: '#cffafe', permission: PERMISSIONS.BARCODE_LABELS_VIEW },
        { to: '/stock-movements', label: 'Stock Movements', description: 'Track changes', icon: Activity, color: '#737373', bg: '#f3f4f6', permission: PERMISSIONS.STOCK_MOVEMENTS_VIEW },
        { to: '/stock-adjustments', label: 'Stock Adjustments', description: 'Manual updates', icon: ClipboardCheck, color: '#f97316', bg: '#ffedd5', permission: PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE },
        { to: '/transfers', label: 'Stock Transfers', description: 'Between shops', icon: ArrowRightLeft, color: '#0891b2', bg: '#cffafe', permission: PERMISSIONS.STOCK_TRANSFERS_MANAGE },
        { to: '/purchases', label: 'Purchases', description: 'Stock incoming', icon: PackagePlus, color: '#7c3aed', bg: '#ede9fe', permission: PERMISSIONS.PURCHASES_VIEW },
      ],
    },
    {
      label: 'Industry Tools (Other)',
      icon: Sparkles,
      items: [
        ...(businessFeatures.expiry || businessFeatures.batches ? [{
          to: '/expiry-dashboard', label: 'Expiry Dashboard', description: 'Pharmacy expiry tracking',
          icon: Pill, color: '#dc2626', bg: '#fee2e2', badge: 'PHARMACY',
        }] : []),
        ...(businessFeatures.tables ? [{
          to: '/tables', label: 'Tables / Floor Plan', description: 'Restaurant seating',
          icon: Utensils, color: '#ea580c', bg: '#ffedd5', badge: 'RESTAURANT',
        }] : []),
        ...(businessFeatures.appointments ? [{
          to: '/appointments', label: 'Appointments', description: 'Salon bookings',
          icon: Scissors, color: '#a855f7', bg: '#f3e8ff', badge: 'SALON',
        }] : []),
      ],
    },
    {
      label: 'Finance & Plan',
      icon: CreditCard,
      items: [
        { to: '/expenses', label: 'Expenses', description: 'Business spending', icon: Wallet, color: '#dc2626', bg: '#fee2e2', permission: PERMISSIONS.EXPENSES_VIEW },
        { to: '/billing', label: 'Billing & Invoices', description: 'Subscription & payments', icon: CreditCard, color: '#0ea5e9', bg: '#e0f2fe', permission: PERMISSIONS.BILLING_VIEW },
        { to: '/plan', label: 'Plans & Pricing', description: 'Upgrade plan', icon: Sparkles, color: '#16a34a', bg: '#dcfce7', permission: PERMISSIONS.PLANS_VIEW },
        { to: '/plan-usage', label: 'Plan Usage', description: 'Track limits', icon: Gauge, color: '#737373', bg: '#f3f4f6', permission: PERMISSIONS.PLAN_USAGE_VIEW },
        { to: '/referrals', label: 'Referrals', description: 'Invite & earn', icon: Gift, color: '#ec4899', bg: '#fce7f3', permission: PERMISSIONS.REFERRALS_VIEW },
      ],
    },
    {
      label: 'Data',
      icon: Database,
      items: [
        { to: '/exports', label: 'Exports', description: 'CSV / Excel', icon: Download, color: '#16a34a', bg: '#dcfce7', permission: PERMISSIONS.EXPORTS_VIEW },
        { to: '/backup', label: 'Backup', description: 'Cloud backups', icon: Database, color: '#2563eb', bg: '#dbeafe', permission: PERMISSIONS.BACKUP_MANAGE },
      ],
    },
    {
      label: 'System',
      icon: SettingsIcon,
      items: [
        { to: '/shops', label: 'Shops / Branches', description: 'Multi-location', icon: Store, color: '#0891b2', bg: '#cffafe', permission: PERMISSIONS.SHOPS_VIEW },
        { to: '/activity-log', label: 'Activity Log', description: 'Audit trail', icon: Activity, color: '#737373', bg: '#f3f4f6', permission: PERMISSIONS.ACTIVITY_VIEW },
        { to: '/notifications', label: 'Notifications', description: 'Alert center', icon: Bell, color: '#f59e0b', bg: '#fef3c7' },
        { to: '/settings', label: 'Settings', description: 'App preferences', icon: SettingsIcon, color: '#525252', bg: '#f3f4f6', permission: PERMISSIONS.SETTINGS_VIEW },
      ],
    },
    {
      label: 'Account & Help',
      icon: HelpCircle,
      items: [
        { to: '/profile', label: 'My Profile', description: 'Your info & security', icon: UserCircle, color: '#525252', bg: '#f3f4f6' },
        { to: '/help', label: 'Help Center', description: 'Get support', icon: LifeBuoy, color: '#2563eb', bg: '#dbeafe' },
        { to: '/legal', label: 'Terms & Privacy', description: 'Legal info', icon: ScrollText, color: '#737373', bg: '#f3f4f6' },
      ],
    },
  ], [businessFeatures]);

  // ─── Filter by permissions + industry ────────────
  const filteredGroups = useMemo(() => {
    const type = (businessType ?? '').toUpperCase();
    const isCarpet = type.includes('CARPET') || type.includes('FLOORING') || businessFeatures?.lengthWidthCalc === true;
    const isMobile = type.includes('MOBILE') || type.includes('PHONE') || type.includes('ELECTRONICS') || businessFeatures?.imei === true;

    return navGroups
      .filter((g) => {
        if (g.industryOnly === 'carpet' && !isCarpet) return false;
        if (g.industryOnly === 'mobile' && !isMobile) return false;
        return true;
      })
      .map((g) => ({
        ...g,
        items: g.items.filter((it) =>
          it.permission ? hasPermission(user?.role, user?.permissions, it.permission) : true,
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [navGroups, businessType, businessFeatures, user]);

  // Flat map for favorites lookup
  const allItemsByPath = useMemo(() => {
    const map = new Map<string, NavItem>();
    for (const g of filteredGroups) {
      for (const it of g.items) map.set(it.to, it);
    }
    return map;
  }, [filteredGroups]);

  const visiblePathSet = useMemo(() => {
    const set = new Set<string>();
    for (const g of filteredGroups) {
      for (const it of g.items) set.add(it.to);
    }
    return set;
  }, [filteredGroups]);

  const favoriteItems = useMemo(() => {
    return favoritePaths
      .map((p) => allItemsByPath.get(p))
      .filter((it): it is NavItem => !!it && visiblePathSet.has(it.to));
  }, [favoritePaths, allItemsByPath, visiblePathSet]);

  const isFavorite = (path: string) => favoritePaths.includes(path);

  const toggleFavorite = async (path: string) => {
    Haptics.selectionAsync();
    const next = isFavorite(path)
      ? favoritePaths.filter((p) => p !== path)
      : [...favoritePaths, path];
    setFavoritePaths(next);
    await saveFavorites(next);
    Toast.show({
      type: 'success',
      text1: isFavorite(path) ? 'Removed from favorites' : 'Added to favorites',
      visibilityTime: 1500,
    });
  };

  // Search filter
  const searchQuery = search.toLowerCase().trim();
  const searchedGroups = useMemo(() => {
    if (!searchQuery) return filteredGroups;
    return filteredGroups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (it) =>
            it.label.toLowerCase().includes(searchQuery) ||
            (it.description || '').toLowerCase().includes(searchQuery),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [filteredGroups, searchQuery]);

  const searchedFavorites = useMemo(() => {
    if (!searchQuery) return favoriteItems;
    return favoriteItems.filter(
      (it) =>
        it.label.toLowerCase().includes(searchQuery) ||
        (it.description || '').toLowerCase().includes(searchQuery),
    );
  }, [favoriteItems, searchQuery]);

  const totalMatches = searchedFavorites.length + searchedGroups.reduce((s, g) => s + g.items.length, 0);

  const isGroupOpen = (group: NavGroup) => {
    if (searchQuery) return true;
    const userState = openGroups[group.label];
    if (userState !== undefined) return userState;
    return group.defaultOpen ?? false;
  };

  const toggleGroup = async (label: string, currentlyOpen: boolean) => {
    Haptics.selectionAsync();
    const next = { ...openGroups, [label]: !currentlyOpen };
    setOpenGroups(next);
    await saveGroupState(next);
  };

  const expandAll = async () => {
    Haptics.selectionAsync();
    const next: Record<string, boolean> = {};
    filteredGroups.forEach((g) => { next[g.label] = true; });
    setOpenGroups(next);
    await saveGroupState(next);
  };

  const collapseAll = async () => {
    Haptics.selectionAsync();
    const next: Record<string, boolean> = {};
    filteredGroups.forEach((g) => { next[g.label] = false; });
    setOpenGroups(next);
    await saveGroupState(next);
  };

  const rc = roleConfig[user?.role || 'STAFF'] || roleConfig.STAFF;
  const RoleIcon = rc.icon;
  const initial = user?.fullName?.charAt(0)?.toUpperCase() || 'U';

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ═════ PREMIUM PROFILE CARD ═════ */}
        <View className="px-5 pt-4 pb-3">
          <Pressable
            onPress={() => router.push('/profile' as any)}
            className="rounded-3xl overflow-hidden active:opacity-90"
            style={{
              backgroundColor: '#064e3b',
              shadowColor: '#16a34a',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="p-4">
              <View className="flex-row items-center gap-3">
                <View className="relative">
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 20,
                        borderWidth: 3,
                        borderColor: 'rgba(255,255,255,0.3)',
                      }}
                    />
                  ) : (
                    <View
                      className="h-16 w-16 rounded-3xl bg-white/20 items-center justify-center"
                      style={{ borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' }}
                    >
                      <Text className="text-white text-2xl font-extrabold">{initial}</Text>
                    </View>
                  )}
                  {emailVerified && (
                    <View
                      className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 items-center justify-center"
                      style={{ borderWidth: 2, borderColor: '#064e3b' }}
                    >
                      <CheckCircle2 size={12} color="#ffffff" />
                    </View>
                  )}
                </View>
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-1 mb-0.5">
                    <Sparkles size={9} color="#fde68a" />
                    <Text className="text-[9px] uppercase tracking-wider text-white/70 font-extrabold">
                      My Account
                    </Text>
                  </View>
                  <Text className="font-extrabold text-lg text-white" numberOfLines={1}>
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
                      <RoleIcon size={10} color="#ffffff" />
                      <Text className="text-[10px] font-extrabold text-white uppercase">{rc.label}</Text>
                    </View>
                    {tenant?.name && (
                      <View
                        className="flex-row items-center gap-1 px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                      >
                        <Store size={10} color="#ffffff" />
                        <Text className="text-[10px] font-bold text-white" numberOfLines={1}>
                          {tenant.name}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View className="h-9 w-9 rounded-2xl bg-white/15 items-center justify-center">
                  <ChevronRight size={16} color="#ffffff" />
                </View>
              </View>
            </View>
          </Pressable>
        </View>

        {/* ═════ EMAIL VERIFY BANNER ═════ */}
        {!emailVerified && (
          <View className="px-5 mb-3">
            <Pressable
              onPress={() => router.push('/auth/verify-email' as any)}
              className="rounded-2xl border-2 border-amber-300 p-3 flex-row items-center gap-3 active:opacity-80"
              style={{ backgroundColor: '#fffbeb' }}
            >
              <View className="h-10 w-10 rounded-xl bg-amber-500 items-center justify-center">
                <AlertTriangle size={18} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="font-extrabold text-amber-900 text-sm">Email Verify Karein</Text>
                <Text className="text-[10px] text-amber-700 mt-0.5">Security ke liye zaroori</Text>
              </View>
              <ChevronRight size={16} color="#92400e" />
            </Pressable>
          </View>
        )}

        {/* ═════ QUICK ACTIONS (matches web QuickActionsDropdown) ═════ */}
        <View className="px-5 mb-3">
          <Text className="text-[10px] uppercase tracking-wider font-extrabold text-amber-600 mb-2 flex-row items-center gap-1">
            ⚡ QUICK ACTIONS
          </Text>
          <View className="flex-row flex-wrap -mx-1">
            {[
              { to: '/(tabs)/pos', label: 'New Sale', icon: ShoppingCart, color: '#16a34a' },
              { to: '/bookings/new', label: 'New Booking', icon: BookmarkPlus, color: '#2563eb' },
              { to: '/products/new', label: 'Add Product', icon: Package, color: '#7c3aed' },
              { to: '/customers/new', label: 'Add Customer', icon: User, color: '#ec4899' },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <View key={a.to} className="w-1/2 p-1">
                  <Pressable
                    onPress={go(a.to)}
                    className="rounded-2xl p-3 active:opacity-80"
                    style={{
                      backgroundColor: a.color,
                      shadowColor: a.color,
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  >
                    <View className="flex-row items-center gap-2.5">
                      <View className="h-9 w-9 rounded-xl bg-white/20 items-center justify-center">
                        <Icon size={16} color="#ffffff" />
                      </View>
                      <Text className="text-white font-extrabold text-sm flex-1" numberOfLines={1}>
                        {a.label}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        {/* ═════ SEARCH BAR ═════ */}
        <View className="px-5 mb-3">
          <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
            <Search size={18} color="#9ca3af" />
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
          {searchQuery ? (
            <Text className="text-[10px] text-neutral-500 font-bold text-center mt-2">
              {totalMatches === 0 ? 'No matches' : `${totalMatches} result${totalMatches > 1 ? 's' : ''}`}
            </Text>
          ) : (
            <View className="flex-row gap-2 mt-2">
              <Pressable
                onPress={expandAll}
                className="flex-1 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <Text className="text-[10px] font-extrabold text-neutral-700 dark:text-neutral-300">
                  Expand All
                </Text>
              </Pressable>
              <Pressable
                onPress={collapseAll}
                className="flex-1 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <Text className="text-[10px] font-extrabold text-neutral-700 dark:text-neutral-300">
                  Collapse All
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ═════ FAVORITES ═════ */}
        {searchedFavorites.length > 0 && (
          <View className="px-5 mb-5">
            <View className="flex-row items-center gap-2 mb-2 px-1">
              <Star size={12} color="#f59e0b" fill="#f59e0b" />
              <Text className="text-xs font-extrabold uppercase tracking-wider text-amber-600">
                My Favorites
              </Text>
              <View className="px-1.5 py-0.5 rounded bg-amber-100 ml-auto">
                <Text className="text-[10px] font-extrabold text-amber-700">
                  {searchedFavorites.length}
                </Text>
              </View>
            </View>
            <View
              className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-amber-200 overflow-hidden"
              style={{
                shadowColor: '#f59e0b',
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              {searchedFavorites.map((item, idx) => (
                <NavRow
                  key={item.to}
                  item={item}
                  isLast={idx === searchedFavorites.length - 1}
                  isFav={true}
                  onPress={go(item.to)}
                  onToggleFav={() => toggleFavorite(item.to)}
                />
              ))}
            </View>
          </View>
        )}

        {/* ═════ GROUPS (collapsible) ═════ */}
        {searchedGroups.map((group) => {
          const isOpen = isGroupOpen(group);
          const GroupIcon = group.icon;
          return (
            <View key={group.label} className="px-5 mb-4">
              <Pressable
                onPress={() => toggleGroup(group.label, isOpen)}
                className="flex-row items-center gap-2 py-2 px-1 active:opacity-70"
              >
                <GroupIcon size={13} color="#737373" />
                <Text className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex-1">
                  {group.label}
                </Text>
                <View className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                  <Text className="text-[10px] font-extrabold text-neutral-500">
                    {group.items.length}
                  </Text>
                </View>
                {isOpen ? (
                  <ChevronDown size={14} color="#737373" />
                ) : (
                  <ChevronRight size={14} color="#737373" />
                )}
              </Pressable>

              {isOpen && (
                <View
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden mt-1"
                  style={{
                    shadowColor: '#000',
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                >
                  {group.items.map((item, idx) => (
                    <NavRow
                      key={item.to}
                      item={item}
                      isLast={idx === group.items.length - 1}
                      isFav={isFavorite(item.to)}
                      onPress={go(item.to)}
                      onToggleFav={() => toggleFavorite(item.to)}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Empty state */}
        {searchedFavorites.length === 0 && searchedGroups.length === 0 && (
          <View className="px-5 py-16 items-center">
            <View className="h-20 w-20 rounded-3xl bg-neutral-100 items-center justify-center">
              <Search size={36} color="#d1d5db" />
            </View>
            <Text className="mt-4 text-base font-extrabold text-neutral-700">No matches</Text>
            <Text className="text-xs text-neutral-500 mt-1">Try a different search term</Text>
            <Pressable
              onPress={() => setSearch('')}
              className="mt-4 px-4 py-2 rounded-xl bg-brand-100"
            >
              <Text className="text-xs font-extrabold text-brand-700">Clear search</Text>
            </Pressable>
          </View>
        )}

        {/* ═════ TIP CARD ═════ */}
        {!searchQuery && (
          <View className="px-5 mb-4">
            <View
              className="rounded-2xl border p-3 flex-row items-center gap-2"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                borderColor: 'rgba(245, 158, 11, 0.25)',
              }}
            >
              <Sparkles size={14} color="#f59e0b" />
              <Text className="text-[11px] text-neutral-700 dark:text-neutral-300 leading-relaxed flex-1">
                <Text className="font-extrabold text-amber-700">Tip:</Text> Long-press ya ⭐ tap karke apne pasandeeda items favorites mein add karein
              </Text>
            </View>
          </View>
        )}

        {/* ═════ LOGOUT ═════ */}
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
            <Text className="text-rose-700 font-extrabold text-base">Logout</Text>
          </Pressable>
        </View>

        {/* ═════ FOOTER ═════ */}
        <View className="items-center mt-6">
          <Text className="text-xs text-neutral-400 font-semibold">Nafaa v1.0.0</Text>
          <Text className="text-[10px] text-neutral-400 mt-0.5">Made in Pakistan 🇵🇰 with ❤️</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Individual Nav Row (with star toggle) ────────
function NavRow({
  item, isLast, isFav, onPress, onToggleFav,
}: {
  item: NavItem;
  isLast: boolean;
  isFav: boolean;
  onPress: () => void;
  onToggleFav: () => void;
}) {
  const Icon = item.icon;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onToggleFav}
      delayLongPress={300}
      className={`flex-row items-center px-4 py-3 active:bg-neutral-50 dark:active:bg-neutral-800 ${
        !isLast ? 'border-b border-neutral-100 dark:border-neutral-800' : ''
      }`}
    >
      <View
        className="h-10 w-10 rounded-2xl items-center justify-center"
        style={{ backgroundColor: item.bg }}
      >
        <Icon size={18} color={item.color} />
      </View>
      <View className="flex-1 ml-3 min-w-0">
        <Text
          className="text-sm font-bold text-neutral-900 dark:text-white"
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {item.description && (
          <Text
            className="text-xs text-neutral-500 mt-0.5"
            numberOfLines={1}
          >
            {item.description}
          </Text>
        )}
      </View>
      {item.badge && (
        <View
          className="px-2 py-0.5 rounded-md mr-2"
          style={{ backgroundColor: item.color }}
        >
          <Text className="text-[9px] font-extrabold text-white">
            {item.badge}
          </Text>
        </View>
      )}
      <Pressable
        onPress={onToggleFav}
        hitSlop={10}
        className="h-8 w-8 rounded-lg items-center justify-center mr-1"
      >
        {isFav ? (
          <Star size={14} color="#f59e0b" fill="#f59e0b" />
        ) : (
          <StarOff size={14} color="#cbd5e1" />
        )}
      </Pressable>
      <ChevronRight size={16} color="#9ca3af" />
    </Pressable>
  );
}
