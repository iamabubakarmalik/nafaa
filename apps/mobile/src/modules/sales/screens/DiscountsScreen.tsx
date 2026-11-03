/**
 * Discount codes: what each code brought in (bills, sales, discount given,
 * customers, branches) for a period; create and edit with branch and
 * per-customer limits and dates; share on WhatsApp; used codes are switched
 * off rather than deleted. Codes are saved on the phone so the counter can
 * still check them without internet.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarClock, Copy, MessageCircle, Pencil, Plus, Power, Tag, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Share, View } from 'react-native';
import { daysLeft } from '@nafaa/core/customers';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatDate, formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Amount, Badge, Button, Card, ChipGroup, confirm, EmptyState, IconButton, ListTemplate, ProgressBar, Row, StatTile, Text, toast, useTheme, type StatusTone } from '@/design';
import { copyText } from '@/modules/customers/lib/contact';
import { queryClient } from '@/core/query/client';
import { CachedNote } from '../components/CachedNote';
import { DiscountEditorSheet } from '../components/DiscountEditorSheet';
import { discountsApi, type DiscountCode, type DiscountStatus } from '../api/discounts';
import { PERIOD_PRESETS, usePeriod } from '../lib/period';

const STATUS: Record<DiscountStatus, { label: string; tone: StatusTone }> = {
  active: { label: msg('Chalu'), tone: 'success' }, scheduled: { label: msg('Shuru hoga'), tone: 'info' }, expired: { label: msg('Period khatam'), tone: 'neutral' },
  used_up: { label: msg('Had poori'), tone: 'warning' }, inactive: { label: msg('Band'), tone: 'neutral' },
};
const TABS: Array<{ value: 'all' | DiscountStatus; label: string }> = [
  { value: 'active', label: msg('Chalu') }, { value: 'scheduled', label: msg('Shuru hone wale') }, { value: 'used_up', label: msg('Had poori') },
  { value: 'expired', label: msg('Period khatam') }, { value: 'inactive', label: msg('Band') }, { value: 'all', label: msg('Sab') },
];

const offText = (d: Pick<DiscountCode, 'type' | 'value' | 'maxDiscount'>) =>
  d.type === 'PERCENTAGE'
    ? t('{{value}}% off{{value2}}', { value: d.value, value2: d.maxDiscount ? t(' (zyada se zyada {{maxDiscount}})', { maxDiscount: formatMoney(d.maxDiscount) }) : '' })
    : t('{{amount}} off', { amount: formatMoney(d.value) });

export function DiscountsScreen() {
  const th = useTheme();
  const can = usePermission();
  const lang = useBillLanguage();
  const shop = useAuthStore((s) => s.tenant?.name) ?? t('Hamari dukaan');
  const canManage = can(P.DISCOUNTS_MANAGE);
  const { preset, setPreset, period } = usePeriod('month');
  const [tab, setTab] = useState<'all' | DiscountStatus>('active');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<DiscountCode | 'new' | null>(null);
  const range = period.from === 'all' ? { to: period.to } : period;
  const list = useQuery({ queryKey: ['discounts', range], queryFn: () => discountsApi.list(range), placeholderData: (p) => p });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['discounts'] });
  const toggle = useMutation({ mutationFn: discountsApi.toggle, onSuccess: (d) => { toast.success(d.isActive ? t('Code chalu') : t('Code band')); refresh(); }, onError: (e) => toast.error(apiErrorMessage(e)) });
  const all = useMemo(() => list.data?.items ?? [], [list.data]);
  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((d) => (tab === 'all' || d.status === tab) && (!q || d.code.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q))).sort((a, b) => b.revenue - a.revenue);
  }, [all, tab, search]);
  const counts = useMemo(() => { const m: Record<string, number> = { all: all.length }; for (const d of all) m[d.status] = (m[d.status] ?? 0) + 1; return m; }, [all]);
  const tot = list.data?.totals;

  const share = (d: DiscountCode) => {
    const body = offText(d) + (d.minPurchase > 0 ? ` · ${t('Kam se kam {{minPurchase}}', { minPurchase: formatMoney(d.minPurchase) })}` : '') + (d.validUntil ? ` · ${formatDate(d.validUntil)}` : '');
    const text = lang === 'en' ? `🎁 A special offer from ${shop}!\n\nCode: *${d.code}* — ${body}\n\nTell us the code when you buy. Thank you!`
      : lang === 'ur' ? `🎁 ${shop} کی طرف سے خاص آفر!\n\nکوڈ: *${d.code}* — ${body}\n\nبل بنواتے وقت یہ کوڈ بتائیں۔ شکریہ!`
        : `🎁 ${shop} ki taraf se khaas offer!\n\nCode: *${d.code}* — ${body}\n\nBill banwate waqt yeh code batayein. Shukriya!`;
    void Share.share({ message: text });
  };
  const remove = async (d: DiscountCode) => {
    const ok = await confirm({ title: d.usageCount ? t('{{code}} band karein?', { code: d.code }) : t('{{code}} mitayein?', { code: d.code }), tone: 'danger', confirmLabel: d.usageCount ? t('Band karein') : t('Mitayein'),
      message: d.usageCount ? t('Yeh code bills par lag chuka hai — mitega nahi, band ho jayega. Purane bills ka hisaab bacha rahega.') : t('Yeh code kabhi istemal nahi hua — hamesha ke liye mit jayega.') });
    if (!ok) return;
    try { const r = await discountsApi.remove(d.id); toast.success(r.message); refresh(); } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Codes se Sale')} loading={!tot} value={<Amount value={tot?.revenue ?? 0} size="lg" weight="bold" compact />} hint={t('{{value}} bill', { value: tot?.uses ?? 0 })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="warning" label={t('Discount diya')} loading={!tot} value={<Amount value={tot?.discountGiven ?? 0} size="lg" weight="bold" compact />} hint={t('{{value}} customers', { value: tot?.customers ?? 0 })} />
      </Row>
      <ChipGroup value={preset} onChange={(v) => setPreset(v as typeof preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.filter((x) => x.value !== 'yesterday').map((x) => ({ value: x.value, label: t(x.label) }))} />
      <ChipGroup value={tab} onChange={(v) => setTab(v as typeof tab)} style={{ marginHorizontal: -th.space(4) }} options={TABS.map((x) => ({ value: x.value, label: t(x.label), count: counts[x.value] ?? 0 }))} />
      <CachedNote query={list} />
    </View>
  );

  return (
    <>
      <ListTemplate<DiscountCode>
        title={t('Discount codes')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Code ya details…') }}
        summary={header}
        data={items}
        loading={list.isLoading}
        error={!list.data ? list.error : undefined}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        keyExtractor={(d) => d.id}
        renderItem={({ item: d }) => {
          const left = daysLeft(d.validUntil);
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(3) }}>
              <Card>
                <Row justify="between" gap={2}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Row gap={2} wrap><Text size="lg" weight="bold" ltr>{d.code}</Text><Badge tone={STATUS[d.status].tone}>{t(STATUS[d.status].label)}</Badge></Row>
                    <Text size="sm" weight="semibold" tone="brand">{offText(d)}</Text>
                    {!!d.description && <Text size="sm" tone="muted">{d.description}</Text>}
                  </View>
                  <IconButton icon={Copy} label={t('Copy')} onPress={() => void copyText(d.code)} />
                </Row>
                <Row gap={1.5} wrap style={{ marginTop: th.space(2) }}>
                  {d.minPurchase > 0 && <Badge>{t('Kam se kam {{minPurchase}}', { minPurchase: formatMoney(d.minPurchase) })}</Badge>}
                  {!!d.perCustomerLimit && <Badge>{t('Har customer {{perCustomerLimit}} dafa', { perCustomerLimit: d.perCustomerLimit })}</Badge>}
                  {(d.validFrom || d.validUntil) && <Badge icon={CalendarClock}>{[d.validFrom && formatDate(d.validFrom), d.validUntil && formatDate(d.validUntil)].filter(Boolean).join(' — ')}{left !== null && left >= 0 && left <= 30 ? t(' · {{left}} din baqi', { left }) : ''}</Badge>}
                </Row>
                {!!d.usageLimit && (
                  <View style={{ gap: 4, marginTop: th.space(2) }}>
                    <Row justify="between"><Text size="xs" tone="muted">{t('Istemal')}</Text><Text size="xs" tone="muted" ltr>{`${d.usageCount} / ${d.usageLimit}`}</Text></Row>
                    <ProgressBar value={d.usageCount / d.usageLimit} tone={d.usageCount >= d.usageLimit ? 'danger' : 'brand'} />
                  </View>
                )}
                <Row style={{ marginTop: th.space(3) }}>
                  <View style={{ flex: 1 }}><Text size="2xs" tone="muted">{t('Bill')}</Text><Text weight="bold" ltr>{String(d.uses)}</Text></View>
                  <View style={{ flex: 1.5 }}><Text size="2xs" tone="muted">{t('Sale')}</Text><Amount value={d.revenue} weight="bold" compact /></View>
                  <View style={{ flex: 1.5 }}><Text size="2xs" tone="muted">{t('Diya')}</Text><Amount value={d.discountGiven} weight="bold" tone="warning" compact /></View>
                </Row>
                <Row gap={2} style={{ marginTop: th.space(3) }}>
                  <Button size="sm" variant="secondary" icon={MessageCircle} style={{ flex: 1 }} onPress={() => share(d)}>{t('Bhejein')}</Button>
                  {canManage && <IconButton icon={Pencil} label={t('Badlein')} onPress={() => setEditing(d)} />}
                  {canManage && <IconButton icon={Power} label={d.isActive ? t('Band karein') : t('Chalu karein')} onPress={() => toggle.mutate(d.id)} />}
                  {canManage && <IconButton icon={Trash2} label={d.usageCount ? t('Band karein') : t('Mitayein')} variant="danger" onPress={() => void remove(d)} />}
                </Row>
              </Card>
            </View>
          );
        }}
        empty={<EmptyState icon={Tag} title={search || tab !== 'all' ? t('Is filter mein koi code nahi') : t('Abhi koi discount code nahi')} message={t('Code banayein, WhatsApp par customers ko bhejein — POS par bill banate waqt lagta hai.')}
          action={canManage ? <Button icon={Plus} onPress={() => setEditing('new')}>{t('Naya code')}</Button> : undefined} />}
        fab={canManage ? { icon: Plus, label: t('Naya code'), onPress: () => setEditing('new') } : undefined}
      />
      <DiscountEditorSheet open={!!editing} code={editing === 'new' ? null : editing} shops={list.data?.shops ?? []} onClose={() => setEditing(null)} />
    </>
  );
}

