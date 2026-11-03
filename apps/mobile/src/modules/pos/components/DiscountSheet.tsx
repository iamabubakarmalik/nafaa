/**
 * Bill discount: a percent, rupees, or rounding the bill down to a whole
 * 10/50/100, plus a discount code and the customer's loyalty points. Over
 * the shop's limit the owner's PIN is asked at checkout (same as web).
 */

import { Award, CloudOff, Tag, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { roundOffOptions, type PosDiscountMode } from '@nafaa/core/pos';
import { apiClient } from '@/core/api/client';
import { apiErrorMessage, isNetworkError } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { apiKey } from '@/core/offline';
import { queryClient } from '@/core/query/client';
import { Amount, Button, Icon, Input, PressableScale, Row, Segmented, Sheet, Text, toast, useTheme } from '@/design';
import { useBill } from '../engine/bill';
import { useCounter } from '../engine/counter';
import { useBillTotals } from '../engine/totals';
import { closeSheet, usePos, usePosUi } from '../engine/usePos';
import { Keypad } from './parts';

const PCT = [5, 10, 15, 20, 25, 50];
const RS = [10, 20, 50, 100, 200, 500];

interface CodeCheck { code: string; discount: number; offline?: boolean }

interface SavedCode { code: string; isActive: boolean; type: 'PERCENTAGE' | 'FIXED_AMOUNT'; value: number; minPurchase: number; maxDiscount?: number | null; usageLimit?: number | null; usageCount: number; shopIds?: string[]; validFrom?: string | null; validUntil?: string | null }

/** Same rules as the server, against codes saved on the phone when there is no internet. */
function checkSavedCode(code: string, amount: number, shopId: string | null): CodeCheck {
  const saved = queryClient.getQueriesData<SavedCode[] | { items?: SavedCode[] }>({ queryKey: apiKey('/discounts') })
    .flatMap(([, d]) => (Array.isArray(d) ? d : d?.items ?? []));
  const dc = saved.find((c) => c.code === code.toUpperCase().replace(/\s+/g, '') && c.isActive);
  if (!dc) throw new Error(t('This code needs internet to check'));
  const now = Date.now();
  if (dc.validFrom && now < new Date(dc.validFrom).getTime()) throw new Error(t('This code has not started yet'));
  if (dc.validUntil && now > new Date(dc.validUntil).getTime()) throw new Error(t('This code has ended'));
  if (dc.usageLimit && dc.usageCount >= dc.usageLimit) throw new Error(t('This code has been used up'));
  if (dc.shopIds?.length && shopId && !dc.shopIds.includes(shopId)) throw new Error(t('This code does not work in this branch'));
  if (amount < dc.minPurchase) throw new Error(t('Works on a bill of at least {{amount}}', { amount: formatMoney(dc.minPurchase) }));
  let discount = dc.type === 'PERCENTAGE' ? (amount * dc.value) / 100 : dc.value;
  if (dc.type === 'PERCENTAGE' && dc.maxDiscount && discount > dc.maxDiscount) discount = dc.maxDiscount;
  return { code: dc.code, discount: Math.min(discount, amount), offline: true };
}

export async function validateCode(code: string, amount: number, customerId: string | null, shopId: string | null): Promise<CodeCheck> {
  try {
    const r = await apiClient.get<{ code: string; discount: number }>('/discounts/validate', { params: { code, amount, customerId: customerId ?? undefined } });
    return { code: r.data.code, discount: Number(r.data.discount) || 0 };
  } catch (e) {
    if (!isNetworkError(e)) throw new Error(apiErrorMessage(e, t('Code did not work')));
    return checkSavedCode(code, amount, shopId);
  }
}

export function DiscountSheet() {
  const th = useTheme();
  const open = usePosUi((s) => s.sheet === 'discount');
  const api = usePos();
  const counter = useCounter();
  const bill = useBill();
  const totals = useBillTotals();
  const subtotal = totals.subtotal;
  const [mode, setMode] = useState<PosDiscountMode>('pct');
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [codeError, setCodeError] = useState('');

  useEffect(() => {
    if (!open) return;
    setMode(bill.discountMode);
    setValue(bill.discountMode === 'pct' ? (bill.discountPct ? String(bill.discountPct) : '') : (bill.discountRs ? String(bill.discountRs) : ''));
    setCode('');
    setCodeError('');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const num = Number(value) || 0;
  const amount = mode === 'pct' ? (subtotal * Math.min(num, 100)) / 100 : Math.min(num, subtotal);
  const share = subtotal > 0 ? (amount / subtotal) * 100 : 0;
  const limit = counter.rules.discountTrusted ? 100 : counter.rules.maxDiscountPercent;
  const overLimit = share > limit + 0.01;

  const apply = (m = mode, v = num) => {
    if (!counter.rules.allowDiscount && v > 0) { toast.error(t('Discounts are turned off in this shop (Settings).')); return; }
    bill.setDiscount(m, m === 'pct' ? Math.min(v, 100) : 0, m === 'rs' ? Math.min(v, subtotal) : 0);
    closeSheet();
  };

  const applyCode = async () => {
    const c = code.trim().toUpperCase().replace(/\s+/g, '');
    if (!c) return;
    setBusy(true);
    setCodeError('');
    try {
      const v = await validateCode(c, subtotal, bill.customer?.id ?? null, api.shopId);
      bill.setPromo(v);
      setCode('');
      toast.success(t('Code {{code}} applied', { code: v.code }));
    } catch (e) {
      setCodeError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const presets = mode === 'pct' ? PCT : RS.filter((n) => n < subtotal);
  const lo = totals;
  return (
    <Sheet open={open} onClose={closeSheet} title={t('Discount')} description={t('Percent, rupees, or round the bill')}
      footer={
        <Row gap={2}>
          {(bill.discountPct > 0 || bill.discountRs > 0) && <Button variant="secondary" onPress={() => apply(mode, 0)}>{t('Remove')}</Button>}
          <Button style={{ flex: 1 }} size="lg" onPress={() => apply()}>{amount > 0 ? t('Give {{amount}} discount', { amount: formatMoney(amount) }) : t('Done')}</Button>
        </Row>
      }>
      <View style={{ gap: th.space(3) }}>
        <Row justify="between" style={{ padding: th.space(3), borderRadius: th.radius('xl'), backgroundColor: th.colors.surfaceMuted }}>
          <View>
            <Text size="xs" tone="muted">{t('Bill')}</Text>
            <Amount value={subtotal} weight="semibold" tone={amount > 0 ? 'muted' : 'default'} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text size="xs" tone="muted">{t('New total')}</Text>
            <Amount value={Math.max(subtotal - amount, 0)} size="2xl" weight="bold" />
          </View>
        </Row>
        {amount > 0 && (
          <Text size="sm" weight="semibold" align="center" color={overLimit ? th.colors.warning.text : th.colors.success.text}>
            {overLimit
              ? t('{{value}}% is over the {{limit}}% limit — the owner\'s PIN is needed at checkout', { value: share.toFixed(1), limit })
              : t('Customer saves {{amount}} · {{value}}%', { amount: formatMoney(amount), value: share.toFixed(1) })}
          </Text>
        )}
        <Segmented options={[{ value: 'pct', label: t('Percent %') }, { value: 'rs', label: t('Rupees') }]} value={mode} onChange={(m) => { setMode(m); setValue(''); }} />
        <View style={{ borderRadius: th.radius('xl'), padding: th.space(3), backgroundColor: th.colors.surfaceSunken, alignItems: 'flex-end' }}>
          <Text size="3xl" weight="bold" ltr tabular tone={value ? 'default' : 'subtle'}>{mode === 'pct' ? `${value || '0'}%` : `Rs ${value || '0'}`}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          {presets.map((n) => (
            <PressableScale key={n} haptic="tap" onPress={() => setValue(String(n))}
              style={{ width: '31.5%', minHeight: 44, borderRadius: th.radius('lg'), alignItems: 'center', justifyContent: 'center', backgroundColor: Number(value) === n ? th.colors.brand.solid : th.colors.surface, borderWidth: 1, borderColor: Number(value) === n ? th.colors.brand.solid : th.colors.border }}>
              <Text weight="semibold" ltr color={Number(value) === n ? th.colors.brand.onSolid : undefined}>{mode === 'pct' ? `${n}%` : `Rs ${n}`}</Text>
            </PressableScale>
          ))}
        </View>
        <Keypad onKey={(k) => setValue((v) => (k === '⌫' ? v.slice(0, -1) : (v === '0' ? k : v + k).slice(0, 7)))} keyHeight={46} />
        <View style={{ gap: th.space(1.5) }}>
          <Text size="xs" weight="semibold" tone="muted">{t('Round the bill')}</Text>
          <Row gap={2}>
            {roundOffOptions(subtotal).map((o) => (
              <PressableScale key={o.step} disabled={o.off === 0} onPress={() => apply('rs', o.off)}
                style={{ flex: 1, padding: th.space(2), borderRadius: th.radius('lg'), alignItems: 'center', backgroundColor: th.colors.warning.soft, opacity: o.off === 0 ? 0.4 : 1 }}>
                <Amount value={o.total} size="sm" weight="bold" color={th.colors.warning.text} />
                <Text size="2xs" color={th.colors.warning.text} ltr>{o.off > 0 ? `−${formatMoney(o.off)}` : t('Already round')}</Text>
              </PressableScale>
            ))}
          </Row>
        </View>

        <View style={{ gap: th.space(1.5), borderTopWidth: 1, borderTopColor: th.colors.divider, paddingTop: th.space(3) }}>
          <Row gap={1.5}><Icon icon={Tag} size={16} tone="muted" /><Text size="xs" weight="semibold" tone="muted">{t('Discount code')}</Text></Row>
          {bill.promo ? (
            <Row gap={2} style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.accent.soft }}>
              <Text weight="bold" ltr color={th.colors.accent.text}>{bill.promo.code}</Text>
              {bill.promo.offline && <Icon icon={CloudOff} size={14} tone="info" />}
              <View style={{ flex: 1 }} />
              <Amount value={-totals.codeDiscount} signed weight="bold" color={th.colors.accent.text} />
              <PressableScale onPress={() => bill.setPromo(null)} accessibilityLabel={t('Remove code')} style={{ padding: 6 }}><Icon icon={X} size={16} /></PressableScale>
            </Row>
          ) : (
            <Row gap={2} align="start">
              <View style={{ flex: 1 }}>
                <Input value={code} onChangeText={(v) => { setCode(v.toUpperCase().replace(/\s+/g, '')); setCodeError(''); }} placeholder="EID2026" autoCapitalize="characters" ltr error={codeError || undefined} onSubmitEditing={() => void applyCode()} returnKeyType="done" />
              </View>
              <Button variant="inverse" loading={busy} disabled={!code} onPress={() => void applyCode()}>{t('Apply')}</Button>
            </Row>
          )}
        </View>

        {counter.loyalty.on && bill.customer && (
          <View style={{ gap: th.space(1.5) }}>
            <Row gap={1.5}><Icon icon={Award} size={16} tone="muted" /><Text size="xs" weight="semibold" tone="muted">{t('{{name}} has {{n}} points ({{amount}})', { name: bill.customer.name, n: bill.customer.loyaltyPoints, amount: formatMoney(bill.customer.loyaltyPoints * counter.loyalty.rate) })}</Text></Row>
            {lo.pointsMax <= 0 ? <Text size="sm" tone="muted">{t('Points cannot be used on this bill')}</Text> : (
              <>
                <Row gap={2}>
                  <Button size="sm" variant="secondary" onPress={() => bill.setPointsWanted(Math.max(0, Math.min(bill.pointsWanted, lo.pointsMax) - 50))}>−50</Button>
                  <Text weight="bold" ltr style={{ flex: 1, textAlign: 'center' }}>{Math.min(bill.pointsWanted, lo.pointsMax)}</Text>
                  <Button size="sm" variant="secondary" onPress={() => bill.setPointsWanted(Math.min(lo.pointsMax, bill.pointsWanted + 50))}>+50</Button>
                  <Button size="sm" variant="soft" onPress={() => bill.setPointsWanted(lo.pointsMax)}>{t('All ({{n}})', { n: lo.pointsMax })}</Button>
                </Row>
                <Text size="sm" tone={lo.pointsUsed ? 'default' : 'muted'}>
                  {lo.pointsUsed > 0 ? t('{{n}} points = −{{amount}}', { n: lo.pointsUsed, amount: formatMoney(lo.loyaltyDiscount) })
                    : bill.pointsWanted > 0 && counter.loyalty.minRedeem > 0 ? t('At least {{n}} points are used at once', { n: counter.loyalty.minRedeem }) : t('No points used')}
                </Text>
              </>
            )}
          </View>
        )}
      </View>
    </Sheet>
  );
}

/**
 * A code's discount is checked again whenever the bill or customer changes
 * (web rule); a code that no longer fits is taken off with a message.
 */
export function usePromoRecheck() {
  const code = useBill((s) => s.promo?.code);
  const offlineCode = useBill((s) => s.promo?.offline);
  const customerId = useBill((s) => s.customer?.id ?? null);
  const subtotal = useBillTotals().subtotal;
  const api = usePos();
  useEffect(() => {
    if (!code) return;
    let alive = true;
    const h = setTimeout(() => {
      validateCode(code, subtotal, customerId, api.shopId)
        .then((v) => { if (alive) useBill.getState().setPromo(v); })
        .catch((e: Error) => {
          if (!alive) return;
          useBill.getState().setPromo(null);
          toast.error(t('Code {{code}} removed: {{reason}}', { code, reason: e.message }));
        });
    }, 300);
    return () => { alive = false; clearTimeout(h); };
  }, [code, offlineCode, subtotal, customerId, api.shopId]);
}

