/**
 * Influencers and affiliates (web AffiliatesPage): each partner's orders,
 * sales, commission due and ROI for a period. Copy a code, WhatsApp the
 * partner, or pay the due commission (written to accounts as an Expense).
 * Adding partners and their codes happens on the web.
 */

import { useState } from 'react';
import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, MessageCircle, UsersRound, Wallet } from 'lucide-react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import { Badge, Button, ChipGroup, EmptyState, HeroAmount, IconButton, ListTemplate, Text, confirm, toast, useTheme } from '@/design';
import { apiErrorMessage } from '../api/online';
import { retentionApi, type Affiliate } from '../api/retention';
import { CommerceHero } from '../components/CommerceHero';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { Note } from '../components/bits';
import { openWhatsApp } from '../lib/device';
import { useOnlineGuard } from '../lib/online';
import { periodOptions, periodRange, type PeriodPreset } from '../lib/period';

const KEY = ['affiliates'] as const;
const METHODS = [{ value: 'CASH', label: t('Cash') }, { value: 'BANK_TRANSFER', label: t('Bank') }, { value: 'JAZZCASH', label: 'JazzCash' }, { value: 'EASYPAISA', label: 'Easypaisa' }];

export function AffiliatesScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const canPay = can(PERMISSIONS.ONLINE_ORDERS_MANAGE) && can(PERMISSIONS.EXPENSES_CREATE);
  const { guard } = useOnlineGuard();
  const [period, setPeriod] = useState<PeriodPreset>('thisMonth');
  const [method, setMethod] = useState('BANK_TRANSFER');
  const range = periodRange(period);
  const q = useQuery({ queryKey: [...KEY, range?.from, range?.to], queryFn: () => retentionApi.affiliates({ from: range?.from, to: range?.to }) });
  const pay = useMutation({
    mutationFn: (a: Affiliate) => retentionApi.pay(a.id, { from: range?.from, to: range?.to, paymentMethod: method }),
    onSuccess: (p) => { toast.success(t('{{amount}} paid — Expense {{no}}', { amount: formatMoney(p.amount), no: p.expenseNumber ?? '' })); qc.invalidateQueries({ queryKey: KEY }); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const askPay = async (a: Affiliate) => {
    const ok = await confirm({
      title: t('{{name}} ko {{amount}} dein?', { name: a.name, amount: formatMoney(a.stats.due) }),
      message: t('{{count}} deliver orders ki commission · {{method}} · Expense me likha jayega', { count: a.stats.delivered, method: METHODS.find((m) => m.value === method)?.label ?? method }),
      confirmLabel: t('Paid karein'), icon: Wallet,
    });
    if (ok) pay.mutate(a);
  };
  const tt = q.data?.totals;

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <CommerceHero chip={t('Codes aur commission')} loading={q.isLoading}
        stats={[
          { label: t('Deliver orders'), value: String(tt?.delivered ?? 0), hint: t('{{count}} kul', { count: tt?.orders ?? 0 }) },
          { label: t('Sale'), value: <HeroAmount value={tt?.sales ?? 0} size="lg" /> },
          { label: t('Commission baqi'), value: <HeroAmount value={tt?.due ?? 0} size="lg" /> },
          { label: t('ROI'), value: tt?.roi ? `${tt.roi}×` : '—' },
        ]} />
      <ChipGroup value={period} onChange={(v) => setPeriod(v as PeriodPreset)} options={periodOptions(['week', 'thisMonth', 'month', 'quarter'])} />
      {canPay && <ChipGroup value={method} onChange={setMethod} options={METHODS} />}
      <Note tone="info">{t('Naya partner aur code web par jorein. Code pehle apne store par banayein — Nafaa Shopify par code nahi banata.')}</Note>
    </View>
  );

  return (
    <ListTemplate
      title={t('Influencers & affiliates')}
      actions={<OnlineMenuButton current="/online/affiliates" />}
      summary={summary}
      data={q.data?.affiliates ?? []}
      loading={q.isLoading}
      error={q.isError ? q.error : undefined}
      onRetry={q.refetch}
      refreshing={q.isRefetching}
      onRefresh={q.refetch}
      keyExtractor={(a) => a.id}
      renderItem={({ item: a }) => (
        <View style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(3), gap: th.space(1.5), opacity: a.active ? 1 : 0.6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
            <Text size="base" weight="bold" numberOfLines={1} style={{ flex: 1 }}>{a.name}</Text>
            <Text size="base" weight="bold" ltr>{formatMoney(a.stats.sales)}</Text>
          </View>
          <Text size="xs" tone="muted" numberOfLines={1}>
            {[a.handle ? `@${a.handle}` : null, a.commissionType === 'PERCENT' ? `${a.commissionValue}%` : t('{{value}} / order', { value: formatMoney(a.commissionValue) }), a.codes.join(', ') || null].filter(Boolean).join(' · ')}
          </Text>
          <Text size="sm" tone="secondary">
            {t('{{delivered}} deliver · {{pending}} raste me · commission {{commission}}{{roi}}', {
              delivered: a.stats.delivered, pending: a.stats.pending, commission: formatMoney(a.stats.commission), roi: a.stats.roi ? ` · ROI ${a.stats.roi}×` : '',
            })}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
            {a.stats.due > 0 ? <Badge tone="warning">{t('Baqi {{amount}}', { amount: formatMoney(a.stats.due) })}</Badge> : a.paidAllTime > 0 ? <Badge tone="success">{t('Sab paid')}</Badge> : null}
            <View style={{ flex: 1 }} />
            {!!a.codes.length && <IconButton icon={Copy} size="sm" label={t('Code copy')} onPress={async () => { await Clipboard.setStringAsync(a.codes.join(', ')); toast.success(t('Code copy')); }} />}
            {!!a.phone && <IconButton icon={MessageCircle} size="sm" label={t('WhatsApp')} onPress={() => void openWhatsApp(a.phone, t('Assalam o Alaikum {{name}}!', { name: a.name.split(' ')[0] }))} />}
            {canPay && a.stats.due > 0 && <Button size="sm" variant="success" icon={Wallet} loading={pay.isPending && pay.variables?.id === a.id} onPress={guard(() => void askPay(a))}>{t('Paid')}</Button>}
          </View>
        </View>
      )}
      empty={<EmptyState icon={UsersRound} title={t('Abhi koi partner nahi')} message={t('Web par Influencers & affiliates me partner jorein.')} />}
    />
  );
}
