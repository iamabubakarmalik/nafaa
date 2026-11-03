/**
 * Courier on an order: book it (CN and label from the courier), its live
 * status and trail, label print / share, refresh and cancel; the "best
 * courier for this city" hint; handing over to a rider or a manual courier
 * with a CN; and Daraz's own ready-to-ship and label.
 */

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, ExternalLink, Printer, RefreshCw, Share2, Sparkles, Truck, Wallet, X, Zap } from 'lucide-react-native';
import {
  COURIER_CODES, COURIER_NAMES, COURIER_STATE_TONE, codDue, findCity, orderNo, type CourierState, type OnlineOrderDetail,
} from '@nafaa/core/online-store';
import { haptic } from '@/core/device/haptics';
import { formatDateTime, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import {
  Badge, Button, Card, ChipGroup, Input, ListRow, MoneyInput, PressableScale, SearchBar, Sheet, Text, confirm, toast, useTheme,
  type StatusTone,
} from '@/design';
import { apiClient } from '@/core/api/client';
import { apiErrorMessage, couriersApi, moneyApi } from '../../api/online';
import { COURIER_LABEL_OVERRIDES, COURIER_STATE_LABEL } from '../../lib/labels';
import { KEYS } from '../../lib/online';
import { copyText, openInApp } from '../../lib/device';
import { openCourierLabel, openDarazLabel } from '../../lib/docs';
import { BrandLogo, CourierLogo, brandForCourierCode } from '../BrandLogo';
import { useConnectedCouriers } from '../../hooks/useOrderActions';

const courierName = (code: string) => (COURIER_LABEL_OVERRIDES[code] ? t(COURIER_LABEL_OVERRIDES[code]) : COURIER_NAMES[code as keyof typeof COURIER_NAMES] ?? code);

/** "Best courier here": the shop's own delivered share and average charge for the customer's city. */
export function CourierHint({ orderId, current, pickable, onPick }: { orderId: string; current?: string; pickable?: string[]; onPick?: (code: string) => void }) {
  const th = useTheme();
  const { data } = useQuery({ queryKey: ['courier-suggest', orderId], queryFn: () => moneyApi.courierSuggest(orderId), staleTime: 10 * 60_000 });
  const best = data?.couriers.find((c) => c.best);
  if (!data || !best) return null;
  const where = data.basis === 'CITY' && data.city ? t('{{city}} me', { city: data.city }) : t('aap ke sab shehron me');
  const others = data.couriers.filter((c) => c.code !== best.code && c.delivered + c.returned >= 3).slice(0, 2);
  return (
    <View style={{ backgroundColor: th.colors.brand.soft, borderRadius: th.radius('md'), padding: th.space(2.5), gap: th.space(1) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1.5), flexWrap: 'wrap' }}>
        <Sparkles size={14} color={th.colors.brand.text} />
        <Text size="xs" weight="bold">{t('Sab se behtar:')}</Text>
        <CourierLogo code={best.code} size={18} />
        <Text size="xs" weight="semibold">{best.name}</Text>
        {onPick && best.code !== current && (!pickable || pickable.includes(best.code)) && (
          <PressableScale onPress={() => onPick(best.code)} style={{ marginStart: 'auto' }}><Text size="xs" weight="bold" tone="brand">{t('Ye chunein')}</Text></PressableScale>
        )}
      </View>
      <Text size="2xs" tone="secondary">
        {t('— {{where}} {{successRate}}% deliver{{value}} ({{value2}} parcel)', { where, successRate: best.successRate, value: best.avgCharge ? t(' · ausat {{avgCharge}}', { avgCharge: formatMoney(best.avgCharge) }) : '', value2: best.delivered + best.returned })}
      </Text>
      {others.length > 0 && <Text size="2xs" tone="muted">{others.map((c) => `${c.name} ${c.successRate}%${c.avgCharge ? ` · ${formatMoney(c.avgCharge)}` : ''}`).join('  ·  ')}</Text>}
    </View>
  );
}

/** Booked: status, trail, label, refresh, cancel. Not booked: book on a connected courier. */
export function CourierCard({ order: o, canManage, onChanged }: { order: OnlineOrderDetail; canManage: boolean; onChanged: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const [bookOpen, setBookOpen] = useState(false);
  const [trailOpen, setTrailOpen] = useState(false);
  const { data: accounts, connected } = useConnectedCouriers();
  const mine = (accounts ?? []).find((a) => a.code === o.courierCode);
  const canLabel = mine?.connect?.features.label ?? true;
  const canCancel = mine?.connect?.features.cancel ?? true;
  const isClosed = ['CANCELLED', 'REJECTED', 'RETURNED'].includes(o.orderStatus);
  const canBook = canManage && !!o.nafaaSaleId && !isClosed && o.orderStatus !== 'DELIVERED' && !o.courierBooked && !o.dispatchedAt;

  const refresh = useMutation({
    mutationFn: () => couriersApi.refresh(o.id),
    onSuccess: (r) => { onChanged(); toast.success(r.label ? t('Courier: {{label}}', { label: r.label }) : t('Taaza status le liya')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const cancel = useMutation({
    mutationFn: () => couriersApi.cancel(o.id),
    onSuccess: () => { onChanged(); toast.success(t('Booking cancel ho gayi')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });

  if (o.courierBooked && o.trackingNumber) {
    const state = (o.courierStatus ?? 'BOOKED') as CourierState | 'BOOKING';
    const history = o.courierTrail?.history ?? [];
    return (
      <Card title={t('Courier')}>
        <View style={{ flexDirection: 'row', gap: th.space(3), alignItems: 'flex-start' }}>
          <CourierLogo code={o.courierCode} size={40} />
          <View style={{ flex: 1, gap: th.space(1) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), flexWrap: 'wrap' }}>
              <Text size="sm" weight="bold">{o.courierLabel ?? t('Courier')}</Text>
              <PressableScale onPress={() => copyText(o.trackingNumber!, t('CN copy ho gaya'))} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text size="sm" weight="bold" ltr>{o.trackingNumber}</Text>
                <Copy size={12} color={th.colors.textMuted} />
              </PressableScale>
            </View>
            <Badge tone={COURIER_STATE_TONE[state] as StatusTone}>{t(COURIER_STATE_LABEL[state] ?? COURIER_STATE_LABEL.UNKNOWN)}</Badge>
            {(o.courierTrail?.label || o.courierStatusAt) && (
              <Text size="2xs" tone="muted">{[o.courierTrail?.label ? `“${o.courierTrail.label}”` : null, o.courierStatusAt ? formatDateTime(o.courierStatusAt) : null].filter(Boolean).join(' · ')}</Text>
            )}
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2), marginTop: th.space(3) }}>
          {canLabel && <Button size="sm" icon={Printer} onPress={() => openCourierLabel(o.id, orderNo(o), 'print')}>{t('Label print')}</Button>}
          {canLabel && <Button size="sm" variant="secondary" icon={Share2} onPress={() => openCourierLabel(o.id, orderNo(o), 'share')}>{t('Share')}</Button>}
          <Button size="sm" variant="secondary" icon={RefreshCw} loading={refresh.isPending} onPress={() => refresh.mutate()}>{t('Taaza status')}</Button>
          {history.length > 1 && <Button size="sm" variant="ghost" onPress={() => setTrailOpen(true)}>{t('Courier ka safar ({{count}})', { count: history.length })}</Button>}
          {o.courierSite && <Button size="sm" variant="ghost" icon={ExternalLink} onPress={() => openInApp(o.courierSite)}>{t('Courier site')}</Button>}
          {canManage && o.courierStatus === 'BOOKED' && canCancel && (
            <Button size="sm" variant="critical" icon={X} loading={cancel.isPending}
              onPress={async () => { if (await confirm({ title: t('Courier booking cancel karein?'), message: t('CN khatam ho jayega.'), tone: 'danger', confirmLabel: t('Booking cancel') })) cancel.mutate(); }}>
              {t('Booking cancel')}
            </Button>
          )}
        </View>
        <Text size="2xs" tone="muted" style={{ marginTop: th.space(2) }}>{t('Nafaa har 30 minute courier se status leta hai — deliver ya wapas (RTO) hote hi order khud update hota hai.')}</Text>
        <Sheet open={trailOpen} onClose={() => setTrailOpen(false)} title={t('Courier ka safar ({{count}})', { count: history.length })}>
          <View style={{ gap: th.space(2) }}>
            {[...history].reverse().map((h, i) => <Text key={i} size="sm">{h.label}{h.at ? <Text size="xs" tone="muted"> · {h.at}</Text> : null}</Text>)}
          </View>
        </Sheet>
      </Card>
    );
  }

  if (!canBook) return null;

  if (!connected.length) {
    return (
      <Card onPress={() => router.push('/online/couriers' as never)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>{(['postex', 'leopards', 'tcs'] as const).map((b) => <BrandLogo key={b} name={b} size={26} />)}</View>
          <Text size="xs" tone="secondary" style={{ flex: 1 }}><Text size="xs" weight="bold">{t('Courier jorein')}</Text> {t('— phir yahin se ek click me booking, CN aur label.')}</Text>
        </View>
      </Card>
    );
  }

  const due = codDue(o);
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>{connected.slice(0, 3).map((c) => <CourierLogo key={c.code} code={c.code} size={connected.length === 1 ? 40 : 28} />)}</View>
        <View style={{ flex: 1 }}>
          <Text size="sm" weight="bold">{t('Courier par book karein')}</Text>
          <Text size="xs" tone="muted">{t('CN khud banega · COD {{value}}', { value: due ? formatMoney(due) : t('nahi (paid)') })}</Text>
        </View>
      </View>
      <Button icon={Zap} style={{ marginTop: th.space(3) }} onPress={() => setBookOpen(true)}>
        {connected.length === 1 ? t('{{name}} par book', { name: connected[0].name }) : t('Book karein')}
      </Button>
      <BookSheet open={bookOpen} order={o}
        couriers={connected.map((c) => ({ code: c.code, name: c.name, defaultWeightKg: c.settings?.defaultWeightKg ?? null, missing: c.missingSettings, label: !!c.connect?.features.label }))}
        onClose={() => setBookOpen(false)}
        onBooked={(tn, name, hasLabel) => {
          setBookOpen(false);
          onChanged();
          qc.invalidateQueries({ queryKey: KEYS.couriers });
          haptic('success');
          toast.success(t('{{name}} par book ho gaya · CN {{tn}}', { name, tn }), hasLabel
            ? { message: t('Label print karke parcel par lagayein'), action: { label: t('Label print'), onPress: () => openCourierLabel(o.id, orderNo(o)) } }
            : { message: t('Label {{name}} portal se print karein', { name }) });
        }} />
    </Card>
  );
}

function BookSheet({ open, order: o, couriers, onClose, onBooked }: {
  open: boolean; order: OnlineOrderDetail;
  couriers: { code: string; name: string; defaultWeightKg: number | null; missing: string[]; label: boolean }[];
  onClose: () => void; onBooked: (trackingNumber: string, courierName: string, hasLabel: boolean) => void;
}) {
  const th = useTheme();
  const [courier, setCourier] = useState(couriers[0]?.code ?? '');
  const current = couriers.find((c) => c.code === courier) ?? couriers[0];
  const pieces0 = o.lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0) || 1;
  const [weight, setWeight] = useState('0.5');
  const [pieces, setPieces] = useState(String(pieces0));
  const [cod, setCod] = useState<number | null>(codDue(o));
  const [notes, setNotes] = useState('');
  const [cityId, setCityId] = useState('');
  const [cityQ, setCityQ] = useState('');
  const opts = useQuery({ queryKey: ['courier-options', courier], queryFn: () => couriersApi.options(courier), staleTime: 30 * 60_000, enabled: open && !!courier });

  useEffect(() => {
    if (!open) return;
    setWeight(String(current?.defaultWeightKg ?? 0.5));
    setCod(codDue(o));
    if (!opts.data) return;
    setCityId(findCity(opts.data.cities, o.customerCity)?.id ?? '');
    setCityQ('');
  }, [open, opts.data, courier]); // eslint-disable-line react-hooks/exhaustive-deps

  const cities = useMemo(() => {
    const q = cityQ.trim().toLowerCase();
    return (opts.data?.cities ?? []).filter((c) => !q || c.name.toLowerCase().includes(q)).slice(0, 60);
  }, [opts.data, cityQ]);
  const cityName = opts.data?.cities.find((c) => c.id === cityId)?.name;

  const book = useMutation({
    mutationFn: () => couriersApi.book(o.id, { courier, cityId: cityId || undefined, weightKg: Number(weight), pieces: Number(pieces), codAmount: cod ?? 0, notes: notes.trim() || undefined }),
    onSuccess: (r) => onBooked(r.trackingNumber, current.name, current.label),
    onError: (e) => toast.error(apiErrorMessage(e, t('Booking nahi hui'))),
  });
  if (!current) return null;
  const valid = !current.missing.length && !!cityId && Number(weight) > 0 && Number(pieces) >= 1 && (cod ?? 0) >= 0;

  return (
    <Sheet open={open} onClose={onClose} height={0.9} title={t('Order #{{value}} — courier booking', { value: orderNo(o) })}
      description={`${o.customerName} · ${o.customerPhone ?? ''} · ${[o.customerAddress, o.customerCity].filter(Boolean).join(', ')}`}
      footer={<Button fullWidth size="lg" icon={Zap} loading={book.isPending} disabled={!valid} onPress={() => book.mutate()}>
        {cityName ? `${t('Book karein')} · ${current.name} → ${cityName}` : t('Shehar chunein')}
      </Button>}>
      <View style={{ gap: th.space(3) }}>
        {current.missing.length > 0 && (
          <Card tone="warning" onPress={() => { onClose(); router.push(`/online/couriers/${current.code.toLowerCase()}` as never); }}>
            <Text size="sm">{t('{{name}} ki settings poori karein: {{value}} —', { name: current.name, value: current.missing.join(', ') })} <Text size="sm" weight="bold">{t('Settings kholein')}</Text></Text>
          </Card>
        )}
        {couriers.length > 1 && <ChipGroup wrap value={courier} onChange={setCourier} options={couriers.map((c) => ({ value: c.code, label: c.name }))} />}
        <CourierHint orderId={o.id} current={courier} pickable={couriers.map((c) => c.code)} onPick={setCourier} />
        <Text size="sm" weight="semibold">{t('Shehar')} {o.customerCity ? <Text size="xs" tone="muted">{t('(customer ne likha: {{customerCity}})', { customerCity: o.customerCity })}</Text> : null}</Text>
        {opts.isLoading ? (
          <View style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'center' }}><ActivityIndicator /><Text size="xs" tone="muted">{t('{{name}} ke shehar aa rahe hain…', { name: current.name })}</Text></View>
        ) : opts.error ? <Text size="xs" tone="danger">{apiErrorMessage(opts.error, t('Nahi hua'))}</Text> : (
          <View style={{ gap: th.space(2) }}>
            {cityName && <ListRow dense title={cityName} selected trailing={<Badge tone="success">{t('Chuna')}</Badge>} />}
            <SearchBar value={cityQ} onChangeText={setCityQ} placeholder={t('Shehar search…')} />
            {!!cityQ.trim() && (
              <View style={{ borderWidth: 1, borderColor: th.colors.border, borderRadius: th.radius('md'), overflow: 'hidden' }}>
                {cities.slice(0, 12).map((c) => <ListRow key={c.id} dense title={c.name} selected={c.id === cityId} onPress={() => { setCityId(c.id); setCityQ(''); }} />)}
              </View>
            )}
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: th.space(2) }}>
          <Input containerStyle={{ flex: 1 }} label={t('Wazan (kg)')} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" ltr />
          <Input containerStyle={{ flex: 1 }} label={t('Pieces')} value={pieces} onChangeText={setPieces} keyboardType="number-pad" ltr />
        </View>
        <MoneyInput label={t('COD (Rs)')} value={cod} onChangeValue={setCod}
          hint={(cod ?? 0) !== codDue(o) ? t('Customer se lena {{rs}} hai — COD alag rakh rahe hain', { rs: formatMoney(codDue(o)) })
            : codDue(o) > 0 && codDue(o) < Math.round(o.total) ? t('Advance {{rs}} mil chuka — COD utna kam', { rs: formatMoney(Math.round(o.total) - codDue(o)) }) : undefined} />
        <Input label={t('Courier ke liye note (optional)')} value={notes} onChangeText={setNotes} maxLength={200} placeholder={t('Fragile, call karke aayein…')} />
      </View>
    </Sheet>
  );
}

/** Hand over to a rider or a courier booked outside Nafaa: courier and CN. */
export function DispatchSheet({ open, order: o, loading, onClose, onConfirm }: {
  open: boolean; order: OnlineOrderDetail; loading: boolean; onClose: () => void;
  onConfirm: (courierCode?: string, courierName?: string, trackingNumber?: string) => void;
}) {
  const th = useTheme();
  const [code, setCode] = useState(o.courierCode ?? '');
  const [other, setOther] = useState(o.courierCode === 'OTHER' ? o.courierName ?? '' : '');
  const [tracking, setTracking] = useState(o.trackingNumber ?? '');
  useEffect(() => { if (open) { setCode(o.courierCode ?? ''); setTracking(o.trackingNumber ?? ''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const isRider = code === 'RIDER';
  const due = codDue(o);
  return (
    <Sheet open={open} onClose={onClose} title={t('Rider / courier ko de diya')} description={t('Courier chunein aur CN daalein — tracking aur COD ka hisaab courier-wise banega.')}
      footer={<Button fullWidth size="lg" icon={Truck} loading={loading} disabled={!code}
        onPress={() => onConfirm(code || undefined, code === 'OTHER' ? other.trim() || undefined : undefined, tracking.trim() || undefined)}>{t('Raste me hai')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          {COURIER_CODES.map((c) => {
            const on = code === c;
            return (
              <PressableScale key={c} onPress={() => setCode(c)} haptic="select" accessibilityState={{ selected: on }}
                style={{ width: '31%', flexDirection: 'row', alignItems: 'center', gap: th.space(1.5), padding: th.space(2), borderRadius: th.radius('md'),
                  borderWidth: on ? 2 : 1, borderColor: on ? th.colors.brand.solid : th.colors.border, backgroundColor: on ? th.colors.brand.soft : th.colors.surface }}>
                <BrandLogo name={brandForCourierCode(c)} size={22} />
                <Text size="xs" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>{courierName(c)}</Text>
              </PressableScale>
            );
          })}
        </View>
        <CourierHint orderId={o.id} current={code} pickable={[...COURIER_CODES]} onPick={setCode} />
        {code === 'OTHER' && <Input label={t('Courier ka naam')} value={other} onChangeText={setOther} />}
        {!isRider && <Input label={t('CN / tracking number')} value={tracking} onChangeText={setTracking} ltr autoCapitalize="characters" />}
        {o.isCod && due > 0 && (
          <View style={{ flexDirection: 'row', gap: th.space(1.5), alignItems: 'center' }}>
            <Wallet size={14} color={th.colors.warning.text} />
            <Text size="xs" weight="semibold" tone="warning" style={{ flex: 1 }}>
              {isRider ? t('Rider ko {{codDue}} wasool karne hain', { codDue: formatMoney(due) }) : t('COD {{codDue}} — deliver ke baad courier ke paas, settlement par aap ko milega', { codDue: formatMoney(due) })}
            </Text>
          </View>
        )}
      </View>
    </Sheet>
  );
}

/** A manual courier CN (no booking): copy it and open the courier's tracking page. */
export function ManualTrackCard({ order: o }: { order: OnlineOrderDetail }) {
  const th = useTheme();
  if (!o.trackingNumber || o.courierBooked) return null;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
        <CourierLogo code={o.courierCode ?? o.courierLabel ?? o.courierName} size={32} />
        <View style={{ flex: 1 }}>
          <Text size="sm" weight="bold">{t('{{value}} · CN {{trackingNumber}}', { value: o.courierLabel ?? o.courierName ?? 'Courier', trackingNumber: o.trackingNumber })}</Text>
          <Text size="xs" tone="muted">{t('Track dabane se CN copy hota hai aur courier ka safha khulta hai')}</Text>
        </View>
        <Button size="sm" variant="secondary" icon={ExternalLink} onPress={() => { void copyText(o.trackingNumber!, t('CN {{trackingNumber}} copy — courier ke safhe par paste karein', { trackingNumber: o.trackingNumber })); if (o.courierSite) void openInApp(o.courierSite); }}>{t('Track')}</Button>
      </View>
    </Card>
  );
}

/** Daraz orders: Daraz sends its own rider on "Ready to ship", with its label. */
export function DarazCard({ order: o, canManage, onChanged }: { order: OnlineOrderDetail; canManage: boolean; onChanged: () => void }) {
  const th = useTheme();
  const meta = ((o.metadata as { daraz?: { rtsAt?: string; trackingNumber?: string } } | null)?.daraz) ?? {};
  const rts = useMutation({
    mutationFn: () => apiClient.post(`/online-orders/${o.id}/daraz/rts`, {}).then((r) => r.data as { trackingNumber: string | null; provider: string | null }),
    onSuccess: (r) => {
      onChanged();
      toast.success(t('Daraz par Ready to ship ✓'), { message: r?.trackingNumber ? t('Tracking {{trackingNumber}}{{value}}', { trackingNumber: r.trackingNumber, value: r.provider ? ` · ${r.provider}` : '' }) : t('Ab label print karein') });
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  if (o.integration?.type !== 'DARAZ' || ['CANCELLED', 'REJECTED', 'RETURNED'].includes(o.orderStatus)) return null;
  const isRts = !!meta.rtsAt;
  return (
    <Card tone="warning" title={t('Daraz delivery')} action={isRts ? <Badge tone="success">{t('Ready to ship')}</Badge> : undefined}>
      <Text size="xs" tone="secondary">
        {!o.nafaaSaleId ? t('Pehle Accept karein (bill + stock), phir Daraz par ready to ship.')
          : isRts ? t('Daraz ka rider parcel uthayega{{value}}. Label print karke parcel par lagayein.', { value: meta.trackingNumber ? t(' · tracking {{trackingNumber}}', { trackingNumber: meta.trackingNumber }) : '' })
            : t('Pack karke "Ready to ship" dabayein — Daraz ko khabar, tracking number aur label yahin.')}
      </Text>
      {o.nafaaSaleId && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2), marginTop: th.space(3) }}>
          {canManage && !isRts && <Button size="sm" icon={Zap} loading={rts.isPending} onPress={() => rts.mutate()}>{t('Daraz: Ready to ship')}</Button>}
          <Button size="sm" variant="secondary" icon={Printer} disabled={!isRts} onPress={() => openDarazLabel(o.id, orderNo(o))}>{t('Daraz label')}</Button>
        </View>
      )}
    </Card>
  );
}
