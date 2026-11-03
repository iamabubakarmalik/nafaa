/**
 * Selling costs of online orders: whether Nafaa writes them in Expenses by
 * itself (P&L), each courier's rate card (base charge and weight, extra
 * kilo, city prices, COD fee and return charge), packaging per channel and
 * gateway fees. Orders use these until the courier's own figure arrives.
 * Mirrors the web OrderCostsPage.
 */

import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Package, Plus, Receipt, Save, Trash2, Truck, Wallet } from 'lucide-react-native';
import type { CostSettings, CourierRate } from '@nafaa/core/online-store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import {
  Badge, Button, Card, ErrorState, Input, MoneyInput, PressableScale, Screen, SkeletonRows, Switch, Text, toast, useTheme,
} from '@/design';
import { apiErrorMessage, moneyApi } from '../api/online';
import { BrandLogo, ChannelLogo, CourierLogo, brandForPayment } from '../components/BrandLogo';
import { KEYS, useOnlineGuard } from '../lib/online';

const GATEWAYS = [{ code: 'SAFEPAY', name: 'Safepay' }, { code: 'JAZZCASH', name: 'JazzCash' }, { code: 'EASYPAISA', name: 'Easypaisa' }];
const blankRate = (): CourierRate => ({ base: 0, baseKg: 0.5, perKg: 0, cities: [], codPct: 0, codFixed: 0, rtoPct: 100 });
const num = (v: string, d = 0) => (v.trim() === '' || !Number.isFinite(Number(v)) ? d : Number(v));

export function CostsScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const canEdit = can(PERMISSIONS.ONLINE_ORDERS_MANAGE);
  const { guard } = useOnlineGuard('settings');
  const q = useQuery({ queryKey: KEYS.costs, queryFn: moneyApi.costSettings });
  const [draft, setDraft] = useState<CostSettings | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { if (q.data && !draft) setDraft(q.data.settings); }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = useMemo(() => !!draft && !!q.data && JSON.stringify(draft) !== JSON.stringify(q.data.settings), [draft, q.data]);
  const save = useMutation({
    mutationFn: () => moneyApi.saveCostSettings(draft!),
    onSuccess: (r) => {
      qc.setQueryData(KEYS.costs, { ...q.data!, settings: r.settings });
      setDraft(r.settings);
      qc.invalidateQueries({ queryKey: ['online-order'] });
      qc.invalidateQueries({ queryKey: KEYS.profit });
      toast.success(t('Selling costs save ho gaye'));
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const setRate = (code: string, patch: Partial<CourierRate>) => setDraft((d) => d && ({ ...d, couriers: { ...d.couriers, [code]: { ...(d.couriers[code] ?? blankRate()), ...patch } } }));

  return (
    <Screen title={t('Selling costs')} subtitle={t('Courier, COD fee, packaging aur gateway fee — har online order ka asli profit inhi se banta hai.')} keyboard
      footer={dirty && canEdit ? (
        <View style={{ flexDirection: 'row', gap: th.space(2) }}>
          <Button variant="secondary" onPress={() => setDraft(q.data!.settings)}>{t('Wapas')}</Button>
          <Button style={{ flex: 1 }} size="lg" icon={Save} loading={save.isPending} onPress={guard(() => save.mutate())}>{t('Save')}</Button>
        </View>
      ) : undefined}>
      {q.isLoading || !draft || !q.data ? (q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : <SkeletonRows count={6} />) : (
        <>
          <Card title={t('P&L me kaise jaye')} description={t('Ek hi jagah se — warna kharcha do dafa ginta hai.')}>
            <Switch value={draft.postExpenses} disabled={!canEdit} onChange={(v) => setDraft({ ...draft, postExpenses: v })} label={t('Courier charges Nafaa khud kharche me likhe')}
              description={draft.postExpenses
                ? t('Chalu: order deliver ya wapas hote hi us ke courier, COD fee, packaging aur gateway fee "Online selling costs" naam se Expenses me khud likhe jayenge. Statement aane par amount asli ho jata hai.')
                : t('Band: Nafaa sirf order par asli profit dikhata hai. Expenses aur P&L me wohi jaata hai jo aap khud likhte hain.')} />
          </Card>

          <Card flush title={t('Courier rates')} description={t('Courier ka apna charge na mile to yahi rate lagta hai. Pehla wazan tak base, phir har agle kilo ka extra.')}>
            {q.data.couriers.map((c) => {
              const r = draft.couriers[c.code];
              const isOpen = open === c.code;
              return (
                <View key={c.code} style={{ borderTopWidth: 1, borderTopColor: th.colors.divider }}>
                  <PressableScale onPress={() => setOpen(isOpen ? null : c.code)} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(3) }}>
                    <CourierLogo code={c.code} size={30} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" weight="semibold">{c.name}</Text>
                      <Text size="xs" tone="muted" numberOfLines={2}>
                        {r && (r.base > 0 || r.perKg > 0)
                          ? [`${formatMoney(r.base)} (${r.baseKg} kg)`, r.perKg ? `+${formatMoney(r.perKg)}/kg` : null, r.codPct || r.codFixed ? `COD ${r.codPct ? `${r.codPct}%` : ''}${r.codPct && r.codFixed ? ' + ' : ''}${r.codFixed ? formatMoney(r.codFixed) : ''}` : null, t('wapsi {{pct}}%', { pct: r.rtoPct }), r.cities.length ? t('{{count}} shehar', { count: r.cities.length }) : null].filter(Boolean).join(' · ')
                          : t('Rate nahi likha')}
                      </Text>
                    </View>
                    <ChevronDown size={16} color={th.colors.textMuted} style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
                  </PressableScale>
                  {isOpen && <RateForm rate={r ?? blankRate()} disabled={!canEdit} onChange={(p) => setRate(c.code, p)}
                    onClear={() => { const { [c.code]: _x, ...rest } = draft.couriers; setDraft({ ...draft, couriers: rest }); }} />}
                </View>
              );
            })}
          </Card>

          <Card title={t('Packaging')} description={t('Har parcel ka dabba, tape, flyer.')} action={<Package size={16} color={th.colors.textMuted} />}>
            <View style={{ gap: th.space(3) }}>
              <MoneyInput label={t('Har order (Rs)')} value={draft.packaging.default || null} disabled={!canEdit} onChangeValue={(v) => setDraft({ ...draft, packaging: { ...draft.packaging, default: v ?? 0 } })} />
              {q.data.channels.map((ch) => (
                <View key={ch.id} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                  <ChannelLogo type={ch.type} platform={ch.platform} size={22} />
                  <Text size="sm" numberOfLines={1} style={{ flex: 1 }}>{ch.displayName}</Text>
                  <MoneyInput containerStyle={{ width: 120 }} value={draft.packaging.byChannel[ch.id] ?? null} disabled={!canEdit} placeholder={String(draft.packaging.default || 0)}
                    onChangeValue={(v) => {
                      const { [ch.id]: _x, ...rest } = draft.packaging.byChannel;
                      setDraft({ ...draft, packaging: { ...draft.packaging, byChannel: v == null ? rest : { ...rest, [ch.id]: v } } });
                    }} />
                </View>
              ))}
              <Text size="2xs" tone="muted">{t('Channel ka khana khali ho to upar wala amount lagta hai.')}</Text>
            </View>
          </Card>

          <Card title={t('Gateway fee')} description={t('Payment link se aaye paise par gateway ka hissa.')} action={<Wallet size={16} color={th.colors.textMuted} />}>
            <View style={{ gap: th.space(3) }}>
              {GATEWAYS.map((g) => {
                const v = draft.gateways[g.code] ?? { pct: 0, fixed: 0 };
                const set = (p: Partial<typeof v>) => setDraft({ ...draft, gateways: { ...draft.gateways, [g.code]: { ...v, ...p } } });
                return (
                  <View key={g.code} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                    <BrandLogo name={brandForPayment(g.code)} size={22} />
                    <Text size="sm" style={{ flex: 1 }}>{g.name}</Text>
                    <Input containerStyle={{ width: 72 }} value={v.pct ? String(v.pct) : ''} placeholder="%" keyboardType="decimal-pad" ltr disabled={!canEdit} onChangeText={(x) => set({ pct: num(x) })} />
                    <Text size="xs" tone="muted">% +</Text>
                    <MoneyInput containerStyle={{ width: 96 }} value={v.fixed || null} placeholder="Rs" disabled={!canEdit} onChangeValue={(x) => set({ fixed: x ?? 0 })} />
                  </View>
                );
              })}
              <Text size="2xs" tone="muted">{t('Gateway khud fee bataye to wahi lagti hai.')}</Text>
            </View>
          </Card>

          <Card>
            <View style={{ gap: th.space(2) }}>
              <Button variant="ghost" icon={Receipt} onPress={() => router.push('/online/cod-reconcile' as never)} style={{ alignSelf: 'flex-start' }}>{t('Statement milayein')}</Button>
              <Button variant="ghost" icon={Truck} onPress={() => router.push('/online/couriers/rules' as never)} style={{ alignSelf: 'flex-start' }}>{t('Auto booking')}</Button>
              <Text size="xs" tone="muted">{t('Courier ki payment statement se asli charges khud aa jate hain.')}</Text>
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}

function RateForm({ rate: r, disabled, onChange, onClear }: { rate: CourierRate; disabled: boolean; onChange: (p: Partial<CourierRate>) => void; onClear: () => void }) {
  const th = useTheme();
  const [city, setCity] = useState('');
  const [cityBase, setCityBase] = useState<number | null>(null);
  const field = (label: string, key: keyof CourierRate, opts: { hint?: string; fallback?: number } = {}) => (
    <Input key={key} containerStyle={{ width: '48%' }} label={label} hint={opts.hint} value={String(r[key] ?? '')} keyboardType="decimal-pad" ltr disabled={disabled}
      onChangeText={(v) => onChange({ [key]: num(v, opts.fallback ?? 0) } as Partial<CourierRate>)} />
  );
  return (
    <View style={{ backgroundColor: th.colors.surfaceMuted, padding: th.space(4), gap: th.space(3) }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2), justifyContent: 'space-between' }}>
        {field(t('Base charge (Rs)'), 'base')}
        {field(t('Base wazan (kg)'), 'baseKg', { fallback: 0.5 })}
        {field(t('Har agla kilo (Rs)'), 'perKg')}
        {field(t('COD fee (%)'), 'codPct')}
        {field(t('COD fee fixed (Rs)'), 'codFixed')}
        {field(t('Wapsi charge (%)'), 'rtoPct', { hint: t('100 = utna hi dobara, 0 = muft wapsi'), fallback: 100 })}
      </View>
      <Text size="xs" weight="semibold" tone="secondary">{t('Shehar ka alag base charge')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(1.5) }}>
        {r.cities.map((c) => (
          <PressableScale key={c.city} disabled={disabled} onPress={() => onChange({ cities: r.cities.filter((x) => x.city !== c.city) })}>
            <Badge icon={Trash2}>{`${c.city} · ${formatMoney(c.base)}`}</Badge>
          </PressableScale>
        ))}
        {!r.cities.length && <Text size="xs" tone="muted">{t('Koi nahi — har shehar par base charge')}</Text>}
      </View>
      {!disabled && (
        <View style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'flex-end' }}>
          <Input containerStyle={{ flex: 1 }} label={t('Shehar')} value={city} onChangeText={setCity} placeholder={t('Karachi')} />
          <MoneyInput containerStyle={{ width: 110 }} label={t('Base (Rs)')} value={cityBase} onChangeValue={setCityBase} />
          <Button variant="secondary" icon={Plus} disabled={!city.trim() || cityBase == null}
            onPress={() => { onChange({ cities: [...r.cities.filter((x) => x.city.toLowerCase() !== city.trim().toLowerCase()), { city: city.trim(), base: cityBase ?? 0 }] }); setCity(''); setCityBase(null); }}>{t('Jorein')}</Button>
        </View>
      )}
      {!disabled && <Button variant="ghost" onPress={onClear} style={{ alignSelf: 'flex-start' }}>{t('Rate hatayein')}</Button>}
    </View>
  );
}
