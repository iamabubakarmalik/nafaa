import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Sparkles, Package, Users, ShieldCheck, Building2,
  ShoppingCart, Crown, TrendingUp, AlertTriangle, CheckCircle2,
  Award, Rocket, RefreshCw, BarChart3, Wallet, RotateCcw, Bell,
  Activity, Tag, Star, ArrowLeftRight, Download, Save, MessageCircle,
  Palette, Shield, Lock, ChevronRight, Zap, BookOpen, Receipt,
  Check, Infinity as InfinityIcon,
} from 'lucide-react-native';
import { planUsageApi } from '@/api/plan-usage.api';

export default function PlanUsageScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['plan-usage'],
    queryFn: async () => {
      try {
        return await planUsageApi.get();
      } catch { return null; }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const summary = useMemo(() => {
    if (!data) return null;
    const u = data.usage as any;
    const items = [
      u.products,
      u.users,
      u.shops,
      u.salesThisMonth || u.sales,
    ].filter(Boolean);

    let critical = 0;
    let warning = 0;
    let unlimited = 0;
    items.forEach((item: any) => {
      if (!item) return;
      const limit = item.limit;
      const current = item.current;
      if (limit >= 999999 || limit === -1) {
        unlimited++;
      } else {
        const pct = (current / limit) * 100;
        if (pct >= 90) critical++;
        else if (pct >= 75) warning++;
      }
    });

    const features = (data as any).features || {};
    const enabledCount = Object.values(features).filter(Boolean).length;
    const totalFeatures = Object.values(features).length;

    return { critical, warning, unlimited, enabledCount, totalFeatures };
  }, [data]);

  if (!data || !summary) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <Award size={36} color="#9ca3af" />
        <Text className="mt-3 text-neutral-500">Loading plan usage...</Text>
      </SafeAreaView>
    );
  }

  const usage = data.usage as any;
  const features = (data as any).features || {};
  const salesUsage = usage.salesThisMonth || usage.sales;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white items-center justify-center border border-neutral-200"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            Plan Usage
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#16a34a" />
            <Text className="text-xs text-neutral-500">Track your limits & features</Text>
          </View>
        </View>
        <Pressable
          onPress={() => refetch()}
          className="h-10 w-10 rounded-2xl bg-white items-center justify-center border border-neutral-200"
        >
          <RefreshCw size={16} color="#16a34a" style={{ transform: [{ rotate: isRefetching ? '180deg' : '0deg' }] }} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#0f172a',
              shadowColor: '#16a34a',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 rounded-2xl bg-white/15 items-center justify-center">
                <Crown size={28} color="#fde68a" fill="#fde68a" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-extrabold uppercase tracking-wider text-white/70">
                  Current Plan
                </Text>
                <View className="flex-row items-center gap-2 mt-0.5">
                  <Text className="text-2xl font-extrabold text-white">
                    {data.plan?.name || 'Free'}
                  </Text>
                  <View className="px-2 py-0.5 rounded-md bg-amber-400">
                    <View className="flex-row items-center gap-0.5">
                      <Crown size={9} color="#78350f" fill="#78350f" />
                      <Text className="text-[9px] font-extrabold text-amber-900 uppercase">
                        Active
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Quick stats strip */}
            <View className="mt-4 flex-row flex-wrap gap-1.5">
              <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 border border-white/20">
                <Sparkles size={9} color="#86efac" />
                <Text className="text-[10px] font-extrabold text-white">
                  {summary.enabledCount}/{summary.totalFeatures} features
                </Text>
              </View>
              {summary.critical > 0 && (
                <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/30 border border-rose-300/40">
                  <AlertTriangle size={9} color="#fecaca" />
                  <Text className="text-[10px] font-extrabold text-white">
                    {summary.critical} at limit
                  </Text>
                </View>
              )}
              {summary.warning > 0 && (
                <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/30 border border-amber-300/40">
                  <TrendingUp size={9} color="#fde68a" />
                  <Text className="text-[10px] font-extrabold text-white">
                    {summary.warning} warning
                  </Text>
                </View>
              )}
              {summary.unlimited > 0 && (
                <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/30 border border-emerald-300/40">
                  <InfinityIcon size={9} color="#86efac" />
                  <Text className="text-[10px] font-extrabold text-white">
                    {summary.unlimited} unlimited
                  </Text>
                </View>
              )}
            </View>

            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/plan'); }}
              className="mt-4 h-12 rounded-xl bg-white items-center justify-center flex-row gap-2"
            >
              <Rocket size={16} color="#16a34a" />
              <Text className="font-extrabold text-base text-emerald-700">Upgrade Plan</Text>
              <ChevronRight size={16} color="#16a34a" />
            </Pressable>
          </View>
        </View>

        {/* Critical alert */}
        {summary.critical > 0 && (
          <View className="px-5 mb-3">
            <View className="rounded-3xl bg-rose-50 border-2 border-rose-300 p-5">
              <View className="flex-row items-start gap-3">
                <View className="h-12 w-12 rounded-2xl items-center justify-center" style={{ backgroundColor: '#dc2626' }}>
                  <AlertTriangle size={22} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] uppercase tracking-wider font-extrabold text-rose-700">
                    Critical — Limit Reached
                  </Text>
                  <Text className="text-base font-extrabold text-rose-900 mt-0.5">
                    {summary.critical} limit{summary.critical > 1 ? 's' : ''} 90%+
                  </Text>
                  <Text className="text-xs text-rose-800 mt-1 font-semibold">
                    Upgrade karein, warna add nahi ho paayega
                  </Text>
                  <Pressable
                    onPress={() => router.push('/plan')}
                    className="mt-3 self-start px-4 py-2.5 rounded-xl flex-row items-center gap-2"
                    style={{ backgroundColor: '#dc2626' }}
                  >
                    <Rocket size={14} color="#ffffff" />
                    <Text className="text-white font-extrabold text-sm">Upgrade Now</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Usage limits */}
        <View className="px-5 mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <BarChart3 size={18} color="#2563eb" />
            <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
              Usage Limits
            </Text>
          </View>
          <View className="gap-3">
            <UsageCard label="Products" current={usage.products?.current ?? 0} limit={usage.products?.limit ?? 0} icon={Package} color="#16a34a" />
            <UsageCard label="Team Users" current={usage.users?.current ?? 0} limit={usage.users?.limit ?? 0} icon={Users} color="#2563eb" />
            <UsageCard label="Shops / Branches" current={usage.shops?.current ?? 0} limit={usage.shops?.limit ?? 0} icon={Building2} color="#7c3aed" />
            {salesUsage && (
              <UsageCard label="Sales (this month)" current={salesUsage.current ?? 0} limit={salesUsage.limit ?? 0} icon={ShoppingCart} color="#f59e0b" />
            )}
          </View>
        </View>

        {/* Features */}
        {Object.keys(features).length > 0 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <Sparkles size={18} color="#7c3aed" />
                <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                  Features
                </Text>
              </View>
              <Text className="text-xs text-neutral-500 font-bold">
                {summary.enabledCount}/{summary.totalFeatures}
              </Text>
            </View>

            {/* Core */}
            <FeatureGroup title="Core Sales" bg="#dcfce7" borderColor="#86efac" icon={ShoppingCart} iconColor="#15803d">
              <FeatureItem enabled={features.pos} label="POS Counter" icon={ShoppingCart} desc="Point of sale" />
              <FeatureItem enabled={features.barcodeScanner} label="Barcode Scanner" icon={Activity} desc="Quick scan" />
              <FeatureItem enabled={features.cashRegister} label="Cash Register" icon={Wallet} desc="Open/close shifts" />
              <FeatureItem enabled={features.returns} label="Returns" icon={RotateCcw} desc="Process refunds" />
            </FeatureGroup>

            {/* Customer & Loyalty */}
            <FeatureGroup title="Customer & Loyalty" bg="#fef3c7" borderColor="#fcd34d" icon={BookOpen} iconColor="#b45309">
              <FeatureItem enabled={features.khata} label="Khata (Udhaar)" icon={BookOpen} desc="Customer credit" />
              <FeatureItem enabled={features.discounts} label="Discount Codes" icon={Tag} desc="Promotions" />
              <FeatureItem enabled={features.loyalty} label="Loyalty Points" icon={Star} desc="Rewards" />
              <FeatureItem enabled={features.whatsappReceipt} label="WhatsApp Receipt" icon={MessageCircle} desc="Send via WhatsApp" />
            </FeatureGroup>

            {/* Advanced */}
            <FeatureGroup title="Advanced & Multi-Shop" bg="#dbeafe" borderColor="#93c5fd" icon={BarChart3} iconColor="#1d4ed8">
              <FeatureItem enabled={features.reports} label="Reports & Analytics" icon={BarChart3} desc="Sales insights" />
              <FeatureItem enabled={features.profitReport} label="Profit Reports" icon={TrendingUp} desc="Margin analysis" />
              <FeatureItem enabled={features.multiShop} label="Multi-Shop" icon={Building2} desc="Branch management" />
              <FeatureItem enabled={features.stockTransfer} label="Stock Transfer" icon={ArrowLeftRight} desc="Move between shops" />
            </FeatureGroup>

            {/* Pro */}
            <FeatureGroup title="Premium & Enterprise" bg="#ede9fe" borderColor="#c4b5fd" icon={Crown} iconColor="#6d28d9" pro>
              <FeatureItem enabled={features.notifications} label="Smart Notifications" icon={Bell} desc="Real-time alerts" />
              <FeatureItem enabled={features.exports} label="Excel/PDF Exports" icon={Download} desc="Data exports" />
              <FeatureItem enabled={features.backup} label="Backup & Restore" icon={Save} desc="Data protection" />
              <FeatureItem enabled={features.customBranding} label="Custom Branding" icon={Palette} desc="Logo on receipts" />
              <FeatureItem enabled={features.support24x7} label="24/7 Priority Support" icon={Shield} desc="Always available" />
            </FeatureGroup>
          </View>
        )}

        {/* Upgrade CTA */}
        {summary.enabledCount < summary.totalFeatures && (
          <View className="px-5 mb-4">
            <View
              className="rounded-3xl p-5"
              style={{
                backgroundColor: '#0f172a',
                shadowColor: '#16a34a',
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-14 w-14 rounded-2xl bg-white/15 items-center justify-center">
                  <Rocket size={28} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Sparkles size={11} color="#fde68a" />
                    <Text className="text-[10px] font-extrabold uppercase tracking-wider text-white/90">
                      Unlock More
                    </Text>
                  </View>
                  <Text className="text-lg font-extrabold text-white mt-0.5">
                    {summary.totalFeatures - summary.enabledCount} aur features available
                  </Text>
                  <Text className="text-xs text-white/80 mt-0.5 font-semibold">
                    Premium features unlock karein
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push('/plan')}
                className="mt-4 h-12 rounded-xl bg-white items-center justify-center flex-row gap-2"
              >
                <Crown size={16} color="#16a34a" />
                <Text className="font-extrabold text-emerald-700">See All Plans</Text>
                <ChevronRight size={16} color="#16a34a" />
              </Pressable>
            </View>
          </View>
        )}

        {/* Already unlimited */}
        {summary.enabledCount === summary.totalFeatures && summary.unlimited === 4 && (
          <View className="px-5 mb-4">
            <View className="rounded-3xl bg-emerald-50 border-2 border-emerald-300 p-6 items-center">
              <View className="h-16 w-16 rounded-3xl items-center justify-center" style={{ backgroundColor: '#16a34a' }}>
                <Crown size={32} color="#ffffff" />
              </View>
              <Text className="mt-3 text-xl font-extrabold text-emerald-900">
                🎉 You're on the Best Plan!
              </Text>
              <Text className="text-sm text-emerald-700 mt-1 font-semibold text-center">
                All features unlocked + unlimited usage
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function UsageCard({ label, current, limit, icon: Icon, color }: any) {
  const isUnlimited = limit >= 999999 || limit === -1;
  const percentage = isUnlimited ? 0 : Math.min(100, (current / limit) * 100);
  const danger = percentage >= 90;
  const warning = percentage >= 75 && percentage < 90;
  const remaining = isUnlimited ? null : limit - current;

  return (
    <View
      className="rounded-2xl border-2 p-4"
      style={{
        backgroundColor: danger ? '#fef2f2' : warning ? '#fffbeb' : '#ffffff',
        borderColor: danger ? '#fca5a5' : warning ? '#fcd34d' : '#e5e7eb',
      }}
    >
      <View className="flex-row items-start gap-3 mb-3">
        <View
          className="h-12 w-12 rounded-2xl items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <Icon size={20} color="#ffffff" />
        </View>
        <View className="flex-1">
          <Text className="text-[10px] uppercase tracking-wider font-extrabold text-neutral-500">
            {danger ? 'Critical' : warning ? 'Warning' : 'Healthy'}
          </Text>
          <Text className="font-extrabold text-neutral-900 text-sm mt-0.5">{label}</Text>
        </View>
        {isUnlimited ? (
          <View className="flex-row items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-100">
            <InfinityIcon size={9} color="#15803d" />
            <Text className="text-[9px] font-extrabold text-emerald-700 uppercase">
              Unlimited
            </Text>
          </View>
        ) : danger ? (
          <View className="flex-row items-center gap-0.5 px-2 py-0.5 rounded-md bg-rose-100">
            <AlertTriangle size={9} color="#b91c1c" />
            <Text className="text-[9px] font-extrabold text-rose-700 uppercase">
              Limit!
            </Text>
          </View>
        ) : warning ? (
          <View className="flex-row items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-100">
            <AlertTriangle size={9} color="#b45309" />
            <Text className="text-[9px] font-extrabold text-amber-700 uppercase">
              {percentage.toFixed(0)}%
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-100">
            <CheckCircle2 size={9} color="#15803d" />
            <Text className="text-[9px] font-extrabold text-emerald-700 uppercase">
              {percentage.toFixed(0)}%
            </Text>
          </View>
        )}
      </View>

      <View className="flex-row items-baseline gap-1">
        <Text
          className="text-3xl font-extrabold"
          style={{
            color: danger ? '#b91c1c' : warning ? '#b45309' : '#0f172a',
          }}
        >
          {current.toLocaleString()}
        </Text>
        {!isUnlimited && (
          <Text className="text-sm text-neutral-500 font-bold">
            / {limit.toLocaleString()}
          </Text>
        )}
      </View>
      {!isUnlimited && remaining !== null && (
        <Text className="text-[10px] text-neutral-500 font-bold mt-0.5">
          {remaining.toLocaleString()} remaining
        </Text>
      )}

      {!isUnlimited && (
        <View className="mt-3 h-2 bg-neutral-100 rounded-full overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.max(percentage, 3)}%`,
              backgroundColor: danger ? '#dc2626' : warning ? '#f59e0b' : color,
            }}
          />
        </View>
      )}

      {danger && (
        <View className="flex-row items-center gap-1 mt-2">
          <AlertTriangle size={11} color="#b91c1c" />
          <Text className="text-[10px] font-extrabold text-rose-700">
            Upgrade karein
          </Text>
        </View>
      )}
    </View>
  );
}

function FeatureGroup({ title, bg, borderColor, icon: Icon, iconColor, pro, children }: any) {
  return (
    <View className="rounded-2xl bg-white border border-neutral-200 overflow-hidden mb-3">
      <View
        className="px-4 py-3 border-b"
        style={{ backgroundColor: bg, borderColor: borderColor }}
      >
        <View className="flex-row items-center gap-2">
          <Icon size={14} color={iconColor} />
          <Text className="font-extrabold text-sm" style={{ color: iconColor }}>
            {title}
          </Text>
          {pro && (
            <View className="px-1.5 py-0.5 rounded-md bg-violet-100">
              <Text className="text-[9px] font-extrabold text-violet-700 uppercase tracking-wider">
                Pro+
              </Text>
            </View>
          )}
        </View>
      </View>
      <View className="p-3 gap-2">{children}</View>
    </View>
  );
}

function FeatureItem({ enabled, label, icon: Icon, desc }: any) {
  return (
    <View
      className="rounded-xl border-2 p-3 flex-row items-start gap-3"
      style={{
        borderColor: enabled ? '#a7f3d0' : '#e5e7eb',
        backgroundColor: enabled ? '#f0fdf4' : '#f9fafb',
        opacity: enabled ? 1 : 0.7,
      }}
    >
      <View
        className="h-9 w-9 rounded-lg items-center justify-center"
        style={{
          backgroundColor: enabled ? '#16a34a' : '#e5e7eb',
        }}
      >
        {enabled ? (
          <Icon size={16} color="#ffffff" />
        ) : (
          <Lock size={14} color="#94a3b8" />
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text
            className="font-extrabold text-sm"
            style={{ color: enabled ? '#0f172a' : '#64748b' }}
          >
            {label}
          </Text>
          {enabled && <Check size={11} color="#15803d" />}
        </View>
        {desc && (
          <Text
            className="text-[10px] font-semibold mt-0.5"
            style={{ color: enabled ? '#475569' : '#94a3b8' }}
          >
            {desc}
          </Text>
        )}
      </View>
    </View>
  );
}
