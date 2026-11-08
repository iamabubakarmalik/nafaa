/**
 * Direct status moves for one order. Moving a new order forward runs accept
 * on the server; when items are not linked to Nafaa products the server
 * answers 409 UNMATCHED_ITEMS and the match dialog opens, then the move runs
 * again. A move the server wants confirmed (e.g. back from a dispatched
 * order) asks first and is sent again with `force`.
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { confirmDialog } from '@/design-system/components';
import { apiErrorMessage, onlineOrdersApi, unmatchedFromError, type OnlineOrder, type OnlineOrderDetail } from '../../api/online-orders.api';
import { errorCode, orderBoardApi, type BoardStatus, type CustomStage, type MoveBody } from '../../api/order-board.api';
import { LIVE_ORDERS_KEY } from '../../hooks/useLiveOnlineOrders';
import { boardEntry, orderNo } from '../../lib/orders';
import { MatchItemsModal, type Matches } from '../MatchItemsModal';
import { MoveDialog, moveNeedsDetail, type MoveExtra } from './MoveDialog';
import { t } from '@core/i18n';

/** Codes the API may send when a move needs the merchant's OK first. */
const FORCE_CODES = ['CONFIRM_FORCE', 'NEEDS_FORCE', 'FORCE_REQUIRED'];

export function useBoardRefresh() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ['online-orders'] });
    if (id) qc.invalidateQueries({ queryKey: ['online-order', id] });
    qc.invalidateQueries({ queryKey: ['online-report'] });
    qc.invalidateQueries({ queryKey: LIVE_ORDERS_KEY });
  };
}

export function useMoveOrder(custom: CustomStage[]) {
  const refresh = useBoardRefresh();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ order: OnlineOrder; to: BoardStatus } | null>(null);
  const [match, setMatch] = useState<{ order: OnlineOrder; detail: OnlineOrderDetail; body: MoveBody } | null>(null);
  const [matching, setMatching] = useState(false);

  const send = async (o: OnlineOrder, body: MoveBody): Promise<void> => {
    setBusyId(o.id);
    try {
      await orderBoardApi.move(o.id, body);
      toast.success(t('#{{no}} → {{status}}', { no: orderNo(o), status: boardEntry(body.to, custom)?.label ?? body.to }));
      refresh(o.id);
    } catch (err) {
      if (unmatchedFromError(err) !== null) {
        toast.message(t('#{{no}} · kuch items Nafaa product se jodne hain', { no: orderNo(o) }));
        try { setMatch({ order: o, detail: await onlineOrdersApi.detail(o.id), body }); } catch (e) { toast.error(apiErrorMessage(e)); }
        return;
      }
      if (FORCE_CODES.includes(errorCode(err) ?? '') && !body.force) {
        const yes = await confirmDialog({ title: t('Pakka badalna hai?'), text: apiErrorMessage(err), yes: t('Haan, badlein'), danger: true });
        if (yes) { setBusyId(null); await send(o, { ...body, force: true }); }
        return;
      }
      toast.error(apiErrorMessage(err, t('Status nahi badla')));
      refresh(o.id);
    } finally {
      setBusyId((cur) => (cur === o.id ? null : cur));
    }
  };

  /** Move one order; opens the detail dialog first when the target needs it. */
  const request = (o: OnlineOrder, to: BoardStatus) => {
    if (moveNeedsDetail(to) && !(to === 'DISPATCHED' && o.trackingNumber)) { setAsk({ order: o, to }); return; }
    void send(o, { to });
  };

  const confirmMatch = async (matches: Matches) => {
    if (!match) return;
    setMatching(true);
    try {
      const picked = Object.fromEntries(Object.entries(matches).map(([k, v]) => [k, { productId: v.productId, variantId: v.variantId ?? null }]));
      await onlineOrdersApi.accept(match.order.id, { matches: picked });
      const { order, body } = match;
      setMatch(null);
      // Accept leaves the order at Confirmed; carry on to the status that was picked.
      if (body.to !== 'CONFIRMED') await send(order, body);
      else { toast.success(t('#{{no}} → {{status}}', { no: orderNo(order), status: boardEntry('CONFIRMED')!.label })); refresh(order.id); }
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setMatching(false);
    }
  };

  const askEntry = ask ? boardEntry(ask.to, custom) : undefined;
  const ui = (
    <>
      {ask && askEntry && (
        <MoveDialog entry={askEntry} count={1} loading={busyId === ask.order.id} onClose={() => setAsk(null)}
          onConfirm={(extra: MoveExtra) => { const a = ask; setAsk(null); void send(a.order, { to: a.to, ...extra }); }} />
      )}
      {match && (
        <MatchItemsModal open lines={match.detail.lines} loading={matching} onClose={() => setMatch(null)} onConfirm={(m) => void confirmMatch(m)} />
      )}
    </>
  );

  return { request, busyId, ui };
}
