/**
 * Direct status moves for one order (web components/orders/useMoveOrder).
 * Moving a new order forward runs accept on the server; when items are not
 * linked to Nafaa products the server answers 409 UNMATCHED_ITEMS and the
 * match sheet opens, then the move runs again. A move the server wants
 * confirmed (NEEDS_FORCE, e.g. back from a dispatched order) asks first and
 * is sent again with `force`. Cancel, return and dispatch ask for a reason
 * or CN first.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { COURIER_CODES, COURIER_NAMES, orderNo, type OnlineOrderDetail } from '@nafaa/core/online-store';
import { haptic } from '@/core/device/haptics';
import { t } from '@/core/i18n';
import { Button, ChipGroup, Input, Sheet, confirm, toast, useTheme } from '@/design';
import { apiErrorMessage, ordersApi, unmatchedFromError } from '../api/online';
import { boardApi, errorCode, type BoardOrder, type BoardStatus, type CustomStage, type MoveBody } from '../api/board';
import { MatchSheet, type Matches } from '../components/order/OrderTools';
import { boardEntry, isCustom, moveNeedsDetail, type BoardEntry } from '../lib/board';
import { CANCEL_REASONS, RTO_REASONS } from '../lib/labels';
import { refreshOrders } from '../lib/online';

const FORCE_CODES = ['CONFIRM_FORCE', 'NEEDS_FORCE', 'FORCE_REQUIRED'];

export interface MoveExtra { reason?: string; trackingNumber?: string; courierCode?: string }

export const entryLabel = (e: BoardEntry | undefined, fallback: string) => (e ? (isCustom(e.key) ? e.label : t(e.label)) : fallback);

export function useMoveOrder(custom: CustomStage[]) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ order: BoardOrder; to: BoardStatus } | null>(null);
  const [match, setMatch] = useState<{ order: BoardOrder; detail: OnlineOrderDetail; body: MoveBody } | null>(null);
  const [matching, setMatching] = useState(false);

  const label = (to: string) => entryLabel(boardEntry(to, custom), to);
  const send = async (o: BoardOrder, body: MoveBody): Promise<void> => {
    setBusyId(o.id);
    try {
      await boardApi.move(o.id, body);
      haptic('success');
      toast.success(t('#{{no}} → {{status}}', { no: orderNo(o), status: label(body.to) }));
      refreshOrders(qc, o.id);
    } catch (err) {
      if (unmatchedFromError(err) !== null) {
        toast.info(t('#{{orderNo}} · kuch items Nafaa product se jodne hain', { orderNo: orderNo(o) }));
        try { setMatch({ order: o, detail: await ordersApi.detail(o.id), body }); } catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); }
        return;
      }
      if (FORCE_CODES.includes(errorCode(err) ?? '') && !body.force) {
        setBusyId(null);
        const yes = await confirm({ title: t('Pakka badalna hai?'), message: apiErrorMessage(err, ''), tone: 'danger', confirmLabel: t('Haan, badlein') });
        if (yes) await send(o, { ...body, force: true });
        return;
      }
      haptic('error');
      toast.error(apiErrorMessage(err, t('Status nahi badla')));
      refreshOrders(qc, o.id);
    } finally {
      setBusyId((cur) => (cur === o.id ? null : cur));
    }
  };

  /** Move one order; asks for the reason / CN first when the target needs it. */
  const request = (o: BoardOrder, to: BoardStatus) => {
    if (moveNeedsDetail(to) && !(to === 'DISPATCHED' && o.trackingNumber)) { setAsk({ order: o, to }); return; }
    void send(o, { to });
  };

  const confirmMatch = async (matches: Matches) => {
    if (!match) return;
    setMatching(true);
    try {
      const picked = Object.fromEntries(Object.entries(matches).map(([k, v]) => [k, { productId: v.productId, variantId: v.variantId ?? null }]));
      await ordersApi.accept(match.order.id, { matches: picked });
      const { order, body } = match;
      setMatch(null);
      // Accept leaves the order at Confirmed; carry on to the status that was picked.
      if (body.to !== 'CONFIRMED') await send(order, body);
      else { toast.success(t('#{{no}} → {{status}}', { no: orderNo(order), status: label('CONFIRMED') })); refreshOrders(qc, order.id); }
    } catch (e) {
      toast.error(apiErrorMessage(e, t('Nahi hua')));
    } finally {
      setMatching(false);
    }
  };

  const askEntry = ask ? boardEntry(ask.to, custom) : undefined;
  const ui = (
    <>
      <MoveSheet entry={askEntry ?? null} count={1} loading={!!ask && busyId === ask.order.id} onClose={() => setAsk(null)}
        onConfirm={(extra) => { const a = ask!; setAsk(null); void send(a.order, { to: a.to, ...extra }); }} />
      <MatchSheet open={!!match} lines={match?.detail.lines ?? []} loading={matching} onClose={() => setMatch(null)} onConfirm={(m) => void confirmMatch(m)} />
    </>
  );

  return { request, send, busyId, ui };
}

/** Reason for Cancelled / Returned, optional courier and CN for Dispatched. */
export function MoveSheet({ entry, count, loading, onClose, onConfirm }: {
  entry: BoardEntry | null; count: number; loading?: boolean; onClose: () => void; onConfirm: (extra: MoveExtra) => void;
}) {
  const th = useTheme();
  const [reason, setReason] = useState('');
  const [cn, setCn] = useState('');
  const [courier, setCourier] = useState('');
  useEffect(() => { if (entry) { setReason(''); setCn(''); setCourier(''); } }, [entry?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const key = entry?.key ?? '';
  const dispatch = key === 'DISPATCHED';
  const needsReason = key === 'CANCELLED';
  const status = entryLabel(entry ?? undefined, key);
  return (
    <Sheet open={!!entry} onClose={onClose}
      title={count > 1 ? t('{{count}} orders → {{status}}', { count, status }) : t('Order → {{status}}', { status })}
      description={dispatch ? t('CN ho to likh dein — customer ko tracking milegi. Courier se book kiya ho to khali chhor dein.')
        : needsReason ? t('Bill bana ho to void ho jayega aur stock wapas aa jayega.') : t('Parcel wapas mil gaya? Stock wapas aa jayega.')}
      footer={<Button fullWidth size="lg" variant={needsReason ? 'danger' : 'primary'} loading={loading} disabled={needsReason && !reason.trim()}
        onPress={() => onConfirm({ reason: reason.trim() || undefined, trackingNumber: cn.trim() || undefined, courierCode: courier || undefined })}>
        {t('Haan, {{status}}', { status })}
      </Button>}>
      <View style={{ gap: th.space(3) }}>
        {dispatch ? (
          <>
            <ChipGroup wrap value={courier} onChange={setCourier}
              options={[{ value: '', label: t('Courier (zaroori nahi)') }, ...COURIER_CODES.filter((c) => c !== 'OTHER').map((c) => ({ value: c, label: COURIER_NAMES[c] }))]} />
            {count === 1 && <Input label={t('CN / tracking number')} value={cn} onChangeText={setCn} ltr autoCapitalize="characters" placeholder="1234567890" />}
          </>
        ) : (
          <>
            <ChipGroup wrap value={reason} onChange={setReason} options={(needsReason ? CANCEL_REASONS : RTO_REASONS).map((r) => ({ value: t(r), label: t(r) }))} />
            <Input label={needsReason ? t('Wajah') : t('Wajah (zaroori nahi)')} value={reason} onChangeText={setReason} maxLength={200}
              placeholder={needsReason ? t('Jaise: Fake order, customer ne mana kiya') : t('Jaise: Customer ghar par nahi tha')} />
          </>
        )}
      </View>
    </Sheet>
  );
}
