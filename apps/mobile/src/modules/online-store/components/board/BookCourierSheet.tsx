/**
 * Book one or many orders on a courier (web dispatch/BookCourierDialog):
 * each connected courier's price from the rate card and the RTO rate from
 * this shop's history, with the cheapest good one picked; "Auto" follows the
 * courier rules and "Best" picks per order. Weight, pieces and what happens
 * after booking; then the result per order with labels to print or share.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Printer, Share2, Sparkles, Wand2, XCircle } from 'lucide-react-native';
import { orderNo } from '@nafaa/core/online-store';
import { haptic } from '@/core/device/haptics';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge, Button, Icon, Input, PressableScale, Segmented, Sheet, SkeletonRows, Text, toast, useTheme } from '@/design';
import type { LucideIcon } from 'lucide-react-native';
import type { StatusTone } from '@/design';
import { apiErrorMessage } from '../../api/online';
import { dispatchApi, type AfterBook, type BoardOrder, type BookResultRow } from '../../api/board';
import { printLabels } from '../../lib/docs';
import { refreshOrders } from '../../lib/online';
import { Note } from '../bits';
import { CourierLogo } from '../BrandLogo';

export function BookCourierSheet({ orders, onClose, onDone }: {
  orders: BoardOrder[] | null; onClose: () => void; onDone?: (failed: string[]) => void;
}) {
  const th = useTheme();
  const qc = useQueryClient();
  const open = !!orders?.length;
  const ids = (orders ?? []).map((o) => o.id);
  const [weight, setWeight] = useState('');
  const [pieces, setPieces] = useState('');
  const [choice, setChoice] = useState('');
  const [after, setAfter] = useState<AfterBook | ''>('');
  const [results, setResults] = useState<BookResultRow[] | null>(null);
  useEffect(() => { if (open) { setWeight(''); setPieces(''); setChoice(''); setAfter(''); setResults(null); } }, [open, ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const w = Number(weight) > 0 ? Number(weight) : undefined;

  const settings = useQuery({ queryKey: ['dispatch-settings'], queryFn: dispatchApi.settings, staleTime: 5 * 60_000, enabled: open });
  const rates = useQuery({ queryKey: ['dispatch-rates', ids.join(','), w], queryFn: () => dispatchApi.rates(ids, w), enabled: open, placeholderData: (p) => p });
  const data = rates.data;
  useEffect(() => { if (!choice && data?.pick) setChoice(data.pick); }, [data?.pick]); // eslint-disable-line react-hooks/exhaustive-deps
  const afterValue: AfterBook = after || settings.data?.afterBook || 'PACKED';

  const book = useMutation({
    mutationFn: () => dispatchApi.book({ orderIds: ids, courier: choice, weightKg: w, pieces: Number(pieces) > 0 ? Number(pieces) : undefined, after: afterValue }),
    onSuccess: (r) => {
      setResults(r.results);
      refreshOrders(qc);
      if (r.booked) { haptic('success'); toast.success(t('{{count}} orders book ho gaye', { count: r.booked })); }
      if (r.failed) toast.error(t('{{count}} orders book nahi hue', { count: r.failed }));
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Book nahi hua'))),
  });

  const byId = new Map((orders ?? []).map((o) => [o.id, o]));
  const booked = (results ?? []).filter((r) => r.ok).map((r) => r.id);
  const finish = () => { onDone?.((results ?? []).filter((r) => !r.ok).map((r) => r.id)); onClose(); };

  return (
    <Sheet open={open} onClose={results ? finish : onClose} title={t('{{count}} orders courier par book', { count: ids.length })}
      description={results ? undefined : t('Rate card se qeemat aur aap ki history se RTO — sab se sasta achha courier pehle se chuna hai')}
      footer={results ? (
        <View style={{ gap: th.space(2) }}>
          {booked.length > 0 && (
            <View style={{ flexDirection: 'row', gap: th.space(2) }}>
              <Button variant="secondary" icon={Printer} style={{ flex: 1 }} onPress={() => void printLabels(booked, 'print')}>{t('Labels print')}</Button>
              <Button variant="secondary" icon={Share2} style={{ flex: 1 }} onPress={() => void printLabels(booked, 'share')}>{t('Share')}</Button>
            </View>
          )}
          <Button size="lg" fullWidth onPress={finish}>{t('Theek hai')}</Button>
        </View>
      ) : (
        <Button size="lg" fullWidth disabled={!choice || !data?.couriers.length} loading={book.isPending} onPress={() => book.mutate()}>{t('Book karein')}</Button>
      )}>
      {results ? (
        <View style={{ gap: th.space(2) }}>
          {results.map((r) => (
            <View key={r.id} style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'flex-start' }}>
              <Icon icon={r.ok ? CheckCircle2 : XCircle} size={16} color={r.ok ? th.colors.success.text : th.colors.danger.text} />
              <Text size="sm" weight="bold" ltr>#{byId.has(r.id) ? orderNo(byId.get(r.id)!) : r.id.slice(-6)}</Text>
              <Text size="sm" tone={r.ok ? 'secondary' : 'danger'} style={{ flex: 1 }}>
                {r.ok ? [r.courier, r.trackingNumber, r.moved ? `→ ${r.moved}` : '', r.moveError ?? ''].filter(Boolean).join(' · ') : r.error}
              </Text>
            </View>
          ))}
        </View>
      ) : rates.isLoading ? <SkeletonRows count={3} /> : rates.isError ? (
        <Note tone="danger">{apiErrorMessage(rates.error, t('Nahi hua'))}</Note>
      ) : !data?.couriers.length ? (
        <Note tone="warning" action={<Button size="sm" variant="secondary" onPress={() => { onClose(); router.push('/online/couriers' as never); }}>{t('Courier jorein')}</Button>}>
          {t('Koi courier API se jura nahi.')}
        </Note>
      ) : (
        <View style={{ gap: th.space(2) }}>
          {data.ready < data.orders && (
            <Note tone="warning">{t('{{count}} orders abhi book nahi ho sakte (accept nahi hue, pehle se book ya bhej diye) — un ka natija alag dikhega', { count: data.orders - data.ready })}</Note>
          )}
          {data.auto && (
            <Choice active={choice === 'AUTO'} onPress={() => setChoice('AUTO')} icon={Wand2} tone="accent" title={t('Auto — courier rules se')}
              text={Object.entries(data.auto.byCourier).map(([c, n]) => `${c} ${n}`).join(' · ') + (data.auto.ask ? t(' · {{count}} ruke rahenge', { count: data.auto.ask }) : '')} />
          )}
          {data.couriers.length > 1 && (
            <Choice active={choice === 'BEST'} onPress={() => setChoice('BEST')} icon={Sparkles} tone="warning" title={t('Har order ka best courier')}
              text={t('Har order ke shehar ke hisaab se sasta aur kam RTO wala')} />
          )}
          {data.couriers.map((c) => (
            <Choice key={c.code} active={choice === c.code} onPress={() => setChoice(c.code)} logo={c.code}
              title={c.name ?? c.code} best={c.code === data.pick}
              text={c.rtoRate == null ? t('RTO history nahi') : t('RTO {{rate}}% ({{basis}})', { rate: c.rtoRate, basis: c.basis === 'CITY' ? t('in shehron me') : t('sab shehar') })}
              right={c.charge == null ? <Text size="xs" weight="semibold" tone="warning">{t('Rate card nahi')}</Text>
                : <View style={{ alignItems: 'flex-end' }}><Text size="sm" weight="bold" ltr>{formatMoney(c.charge + c.codFee)}</Text><Text size="2xs" tone="muted">{t('andaza {{value}}', { value: formatMoney(c.expected ?? 0) })}</Text></View>} />
          ))}
          <View style={{ flexDirection: 'row', gap: th.space(2) }}>
            <Input containerStyle={{ flex: 1 }} label={t('Wazan (kg)')} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} placeholder={t('Har order ka apna')} />
            <Input containerStyle={{ flex: 1 }} label={t('Pieces')} keyboardType="number-pad" value={pieces} onChangeText={setPieces} placeholder={t('Ginti')} />
          </View>
          <Text size="sm" weight="semibold" tone="secondary">{t('Book hone ke baad')}</Text>
          <Segmented size="sm" value={afterValue} onChange={(v) => setAfter(v as AfterBook)}
            options={[{ value: 'NONE', label: t('Wahi rahe') }, { value: 'PACKED', label: 'PACKED' }, { value: 'DISPATCHED', label: 'DISPATCHED' }]} />
        </View>
      )}
    </Sheet>
  );
}

function Choice({ active, onPress, icon, tone = 'brand', logo, title, text, best, right }: {
  active: boolean; onPress: () => void; icon?: LucideIcon; tone?: StatusTone; logo?: string; title: string; text: string; best?: boolean; right?: React.ReactNode;
}) {
  const th = useTheme();
  return (
    <PressableScale onPress={onPress} haptic="select" accessibilityRole="radio" accessibilityState={{ selected: active }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: th.space(3), padding: th.space(3), borderRadius: th.radius('lg'), borderWidth: 2,
        borderColor: active ? th.colors.brand.solid : th.colors.border, backgroundColor: active ? th.colors.brand.soft : th.colors.surface,
      }}>
      {logo ? <CourierLogo code={logo} size={30} /> : icon ? <Icon icon={icon} size={22} color={th.colors[tone].text} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1.5) }}>
          <Text size="sm" weight="semibold" numberOfLines={1}>{title}</Text>
          {best && <Badge tone="success">{t('Best')}</Badge>}
        </View>
        <Text size="xs" tone="muted" numberOfLines={2}>{text}</Text>
      </View>
      {right}
    </PressableScale>
  );
}
