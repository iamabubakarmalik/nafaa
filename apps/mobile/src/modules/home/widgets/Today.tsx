/**
 * Day-to-day widgets: what needs doing now ("Aaj ka kaam"), shortcuts
 * ("Jaldi kaam") and the day report summary ("Din ka hisaab").
 */

import {
  AlertTriangle, ArrowLeftRight, Banknote, BarChart3, BookOpen, Building2, CheckCircle2, Package, PackageX, Plus, Receipt, ShoppingBag,
  ShoppingCart, Users, Wallet, type LucideIcon,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, Icon, ListRow, PressableScale, Text, useLayout, useTheme, withAlpha, type StatusTone } from '@/design';
import { useModuleFlags } from '@/modules/shell/appControl';
import { useDashboard, useDayReport, useMoneyMap } from '../api/dashboard';
import { Money, WidgetCard } from '../components/parts';
import { MASK, useMasked } from '../lib/privacy';

interface AttentionItem { icon: LucideIcon; level: 'danger' | 'warning' | 'info' | 'neutral'; text: string; href: string; cta: string }

export function Attention() {
  const th = useTheme();
  const { data } = useDashboard();
  const { data: money } = useMoneyMap();
  const s = data?.stats;
  const items: AttentionItem[] = [];
  if (s?.outOfStockCount) items.push({ icon: PackageX, level: 'danger', text: t('{{outOfStockCount}} cheezein khatam ho gayin — customer khali haath lautega', { outOfStockCount: s.outOfStockCount }), href: '/low-stock', cta: t('Restock') });
  if (s?.lowStockCount) items.push({ icon: AlertTriangle, level: 'warning', text: t('{{lowStockCount}} cheezein kam reh gayin — mangwane ka waqt', { lowStockCount: s.lowStockCount }), href: '/low-stock', cta: t('Dekhein') });
  if (s?.pendingTransfers) items.push({ icon: ArrowLeftRight, level: 'info', text: t('{{pendingTransfers}} transfer aane wale hain', { pendingTransfers: s.pendingTransfers }), href: '/transfers', cta: t('Receive') });
  if (money && !money.cash.registerOpen) items.push({ icon: Banknote, level: 'neutral', text: t('Cash register abhi nahi khula — galle ka hisaab register se banta hai'), href: '/cash-register', cta: t('Register kholein') });

  return (
    <WidgetCard title={t('Aaj ka kaam')} description={items.length ? t('{{count}} cheezein tawajjo maangti hain — sab se zaroori upar', { count: items.length }) : undefined} flush>
      {items.length === 0 ? (
        <ListRow icon={CheckCircle2} iconTone="success" title={<Text size="sm" weight="medium" numberOfLines={2}>{t('Sab theek hai — koi kaam latka hua nahi.')}</Text>} />
      ) : items.map((a, i) => (
        <ListRow key={a.text} divider={i < items.length - 1} icon={a.icon} iconTone={a.level as StatusTone} title={<Text size="sm" weight="medium" numberOfLines={3}>{a.text}</Text>}
          trailing={<Button size="sm" variant={a.level === 'danger' ? 'danger' : 'secondary'} onPress={() => router.push(a.href as never)}>{a.cta}</Button>}
          onPress={() => router.push(a.href as never)} />
      ))}
      <View style={{ height: th.space(1) }} />
    </WidgetCard>
  );
}

interface QuickAction { key: string; href: string; icon: LucideIcon; label: string; color: string; ok: boolean }

export function QuickActions() {
  const th = useTheme();
  const can = usePermission();
  const moduleOn = useModuleFlags();
  const { isTablet } = useLayout();
  const c = th.colors;
  const actions: QuickAction[] = ([
    { key: 'pos', href: '/pos', icon: ShoppingCart, label: t('New sale'), color: c.brand.solid, ok: can(P.POS_USE) && moduleOn('pos') },
    { key: 'product', href: '/products/new', icon: Plus, label: t('Naya product'), color: '#7c3aed', ok: can(P.PRODUCTS_CREATE) && moduleOn('products') },
    { key: 'products', href: '/products', icon: Package, label: t('Products'), color: '#0d9488', ok: can(P.PRODUCTS_VIEW) && moduleOn('products') },
    { key: 'customers', href: '/customers', icon: Users, label: t('Customers'), color: '#0284c7', ok: can(P.CUSTOMERS_VIEW) && moduleOn('customers') },
    { key: 'khata', href: '/khata', icon: BookOpen, label: t('Khata'), color: '#db2777', ok: can(P.KHATA_VIEW) && moduleOn('khata') },
    { key: 'sales', href: '/sales', icon: Receipt, label: t('Sales history'), color: '#0891b2', ok: can(P.SALES_VIEW) && moduleOn('sales') },
    { key: 'purchase', href: '/purchases', icon: ShoppingBag, label: t('Purchase'), color: '#e11d48', ok: can(P.PURCHASES_VIEW) && moduleOn('purchases') },
    { key: 'suppliers', href: '/suppliers', icon: Building2, label: t('Suppliers'), color: '#4f46e5', ok: can(P.SUPPLIERS_VIEW) && moduleOn('suppliers') },
    { key: 'expenses', href: '/expenses', icon: Wallet, label: t('Expenses'), color: '#d97706', ok: can(P.EXPENSES_VIEW) && moduleOn('expenses') },
    { key: 'register', href: '/cash-register', icon: Banknote, label: t('Cash register'), color: '#16a34a', ok: can(P.CASH_REGISTER_VIEW) && moduleOn('cash-register') },
    { key: 'reports', href: '/reports', icon: BarChart3, label: t('Reports'), color: '#2563eb', ok: can(P.REPORTS_VIEW) && moduleOn('reports') },
  ] satisfies QuickAction[]).filter((a) => a.ok);
  if (!actions.length) return null;
  const per = isTablet ? 6 : 4;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingVertical: th.space(1.5), borderRadius: th.radius('xl'), backgroundColor: c.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: c.border }}>
      {actions.map((a) => (
        <View key={a.key} style={{ width: `${100 / per}%` }}>
          <PressableScale onPress={() => router.push(a.href as never)} haptic="tap" accessibilityLabel={a.label}
            style={{ alignItems: 'center', gap: th.space(1.5), paddingVertical: th.space(2.5) }}>
            <View style={{ width: 46, height: 46, borderRadius: th.radius('lg'), backgroundColor: withAlpha(a.color, th.isDark ? 0.2 : 0.1), alignItems: 'center', justifyContent: 'center' }}>
              <Icon icon={a.icon} size={21} color={a.color} />
            </View>
            <Text size="xs" weight="medium" tone="secondary" align="center" numberOfLines={1} style={{ paddingHorizontal: 2 }}>{a.label}</Text>
          </PressableScale>
        </View>
      ))}
    </View>
  );
}

function Line({ label, value, kind = 'sales', bold, tone }: { label: string; value: number; kind?: 'sales' | 'cost'; bold?: boolean; tone?: 'success' | 'danger' }) {
  const th = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: th.space(1.5), gap: th.space(3) }}>
      <Text size="sm" weight={bold ? 'bold' : 'regular'} tone={bold ? 'default' : 'secondary'} style={{ flex: 1 }} numberOfLines={1}>{label}</Text>
      <Money value={value} kind={kind} weight={bold ? 'bold' : 'medium'} tone={tone} />
    </View>
  );
}

export function DayReportCard() {
  const th = useTheme();
  const q = useDayReport();
  const { salesHidden } = useMasked();
  const d = q.data;
  const change = d && d.sales.previousTotal > 0 ? ((d.sales.total - d.sales.previousTotal) / d.sales.previousTotal) * 100 : undefined;
  return (
    <WidgetCard title={t('Din ka hisaab')} description={t('Opening se closing tak, har item aur payment — WhatsApp aur print')} href="/day-report" linkLabel={t('Kholein')}>
      {!d ? <Text tone="muted" size="sm">{q.isError ? t('Abhi hisaab nahi mila') : '…'}</Text> : (
        <View>
          <View style={{ flexDirection: 'row', gap: th.space(2), marginBottom: th.space(2) }}>
            <Stat label={t('Sale')} value={salesHidden ? MASK : formatMoney(d.sales.total)} hint={change !== undefined && !salesHidden ? `${change >= 0 ? '+' : ''}${change.toFixed(0)}%` : undefined} />
            <Stat label={t('Bill')} value={String(d.sales.bills)} />
            <Stat label={t('Ausat')} value={salesHidden ? MASK : formatMoney(d.sales.average)} />
          </View>
          <Line label={t('Cash aaya')} value={d.cashCollected} />
          <Line label={t('Online aaya')} value={d.onlineCollected} />
          {d.sales.credit > 0 && <Line label={t('Udhaar diya')} value={d.sales.credit} />}
          {d.sales.refunds > 0 && <Line label={t('Wapsi')} value={-d.sales.refunds} tone="danger" />}
          {d.expenses.total > 0 && <Line label={t('Expenses')} value={-d.expenses.total} kind="cost" />}
          {d.cash.registers > 0 && <Line bold label={d.cash.allClosed ? t('Galla band hua') : t('Galle me hona chahiye')} value={d.cash.allClosed && d.cash.countedClosing != null ? d.cash.countedClosing : d.cash.expectedClosing} />}
        </View>
      )}
    </WidgetCard>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const th = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 0, padding: th.space(2.5), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
      <Text size="2xs" tone="muted" numberOfLines={1}>{label}</Text>
      <Text size="md" weight="bold" ltr tabular numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {hint && <Text size="2xs" weight="semibold" tone={hint.startsWith('-') ? 'danger' : 'success'} ltr>{hint}</Text>}
    </View>
  );
}
