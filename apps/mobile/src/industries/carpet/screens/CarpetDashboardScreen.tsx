/**
 * Carpet dashboard (web carpet/dashboard): roll stock, short rolls, new rolls
 * and cut pieces, what needs attention and quick actions. The numbers come
 * from the dashboard overview's carpetStats; the last loaded ones show offline.
 */

import { router } from 'expo-router';
import { AlertTriangle, BarChart3, Download, Layers, Package, Plus, Receipt, Ruler, Scissors, ShoppingCart, Users } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Card, ListRow, Text, useTheme } from '@/design';
import { useDashboard } from '@/modules/home/api/dashboard';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { PendingBanner } from '../components/PendingCuts';

interface CarpetStats {
  totalActiveRolls: number; totalSqft: number; totalLengthFt: number; cutPiecesCount: number; cutPiecesSqft: number; cutPiecesValue: number;
  lowStockRolls: Array<{ id: string; rollNumber: string; productName?: string; remainingLengthFt: number; remainingSqft: number; salePricePerSqft: number }>;
  recentRolls: Array<{ id: string; rollNumber: string; productName?: string; variantName?: string; variantColorHex?: string; remainingSqft: number; salePricePerSqft: number }>;
}
const n0 = (v: number) => Math.round(v).toLocaleString('en-PK');

export function CarpetDashboardScreen() {
  const th = useTheme();
  const can = usePermission();
  const { cost } = useCostMask();
  const q = useDashboard();
  const c = (q.data as unknown as { carpetStats?: CarpetStats | null } | undefined)?.carpetStats ?? null;
  const ops = useMemo(() => {
    const rolls = c?.totalActiveRolls ?? 0;
    const short = c?.lowStockRolls ?? [];
    return { rolls, short, healthy: Math.max(rolls - short.length, 0), health: rolls > 0 ? Math.round((Math.max(rolls - short.length, 0) / rolls) * 100) : 0 };
  }, [c]);

  const attention: DashAttention[] = [];
  if (ops.short.length) attention.push({ icon: AlertTriangle, tone: 'warning', text: t('{{count}} roll 10 ft se kam reh gaye — naya roll mangwayein ya baqi tukda cut piece bana dein', { count: ops.short.length }), href: '/carpet/rolls' });
  if ((c?.cutPiecesCount ?? 0) >= 10) attention.push({ icon: Scissors, tone: 'info', text: t('{{pieces}} cut pieces pare hain ({{piecesSqft}} sqft) — chhote order par pehle ye dikhayein', { pieces: c!.cutPiecesCount, piecesSqft: n0(c!.cutPiecesSqft) }), href: '/carpet/cut-pieces' });
  if (c && ops.rolls === 0) attention.push({ icon: Layers, tone: 'neutral', text: t('Abhi koi roll darj nahi — roll daalein to lambai aur sqft ka hisaab khud chalega'), href: '/carpet/rolls' });

  const actions: DashAction[] = [
    { href: '/pos', icon: ShoppingCart, label: t('POS'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/products/new', icon: Plus, label: t('Naya carpet'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/carpet/rolls', icon: Layers, label: t('Rolls'), hint: t('{{rolls}} chaalu', { rolls: ops.rolls }), show: can(P.PRODUCTS_VIEW) },
    { href: '/carpet/cut-pieces', icon: Scissors, label: t('Cut pieces'), hint: t('{{pieces}} pieces', { pieces: c?.cutPiecesCount ?? 0 }), show: can(P.PRODUCTS_VIEW) },
    { href: '/reports', icon: BarChart3, label: t('Carpet reports'), hint: t('Sqft ka hisaab'), show: can(P.REPORTS_VIEW) },
    { href: '/carpet/rolls/bulk-import', icon: Download, label: t('Bulk import'), hint: t('Excel / CSV'), show: can(P.PRODUCTS_CREATE) },
    { href: '/products', icon: Package, label: t('Maal'), hint: t('{{value}} cheezein', { value: q.data?.stats?.totalProducts ?? 0 }), show: can(P.PRODUCTS_VIEW) },
    { href: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: q.data?.stats?.totalCustomers ?? 0 }), show: can(P.CUSTOMERS_VIEW) },
    { href: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill'), show: can(P.SALES_VIEW) },
  ];

  return (
    <PackDashboard
      title={t('Carpet')}
      stats={[
        { label: t('Chaalu rolls'), value: String(ops.rolls) },
        { label: t('Bikne wala sqft'), value: n0(c?.totalSqft ?? 0) },
        { label: t('Cut pieces'), value: String(c?.cutPiecesCount ?? 0) },
      ]}
      attention={attention}
      actions={actions}
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
    >
      <CachedNote query={q} />
      <PendingBanner />
      {c && (
        <Card title={t('Rolls ka stock')} description={t('{{rolls}} rolls · {{sqft}} sqft baqi', { rolls: ops.rolls, sqft: n0(c.totalSqft) })}>
          <View style={{ gap: th.space(2) }}>
            <Text size="sm" ltr>{t('rolls theek')}: <Text size="sm" weight="bold" tone={ops.health > 70 ? 'success' : ops.health > 40 ? 'warning' : 'danger'}>{ops.rolls ? `${ops.health}%` : '—'}</Text></Text>
            <Text size="sm" tone="secondary" ltr>{t('{{lengthFt}} ft lambai', { lengthFt: n0(c.totalLengthFt) })} · {t('{{piecesSqft}} sqft', { piecesSqft: n0(c.cutPiecesSqft) })} {t('Cut pieces')}</Text>
            <Text size="sm" tone="secondary">{t('Pieces ki qeemat {{piecesValue}}', { piecesValue: cost(c.cutPiecesValue) })}</Text>
          </View>
        </Card>
      )}
      {ops.short.length > 0 && (
        <Card flush title={t('Chhote rolls')} description={t('10 ft se kam lambai baqi')}>
          {ops.short.slice(0, 6).map((r, i) => (
            <ListRow key={r.id} divider={i < Math.min(ops.short.length, 6) - 1} icon={Layers} iconTone={r.remainingLengthFt <= 2 ? 'danger' : 'warning'} title={<Text weight="semibold" ltr>{r.rollNumber}</Text>}
              subtitle={t('{{value}} · {{remainingSqft}} sqft · {{salePricePerSqft}}/sqft', { value: r.productName ?? 'Roll', remainingSqft: n0(r.remainingSqft), salePricePerSqft: formatMoney(r.salePricePerSqft) })}
              trailing={<Badge tone={r.remainingLengthFt <= 2 ? 'danger' : 'warning'}>{t('{{value}} ft', { value: r.remainingLengthFt.toFixed(1) })}</Badge>}
              chevron onPress={() => router.push(`/carpet/rolls/${r.id}` as never)} />
          ))}
        </Card>
      )}
      {(c?.recentRolls.length ?? 0) > 0 && (
        <Card flush title={t('Naye rolls')} description={t('Haal hi me aaye rolls')}>
          {c!.recentRolls.slice(0, 6).map((r, i) => (
            <ListRow key={r.id} divider={i < Math.min(c!.recentRolls.length, 6) - 1} icon={Ruler} title={r.productName ?? r.rollNumber}
              subtitle={`${r.rollNumber}${r.variantName ? ` · ${r.variantName}` : ''}`}
              trailing={<View style={{ alignItems: 'flex-end' }}><Text size="sm" weight="semibold" ltr>{n0(r.remainingSqft)} sqft</Text><Amount value={r.salePricePerSqft} size="xs" tone="muted" /></View>}
              chevron onPress={() => router.push(`/carpet/rolls/${r.id}` as never)} />
          ))}
        </Card>
      )}
    </PackDashboard>
  );
}
