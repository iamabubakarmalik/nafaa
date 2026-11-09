/**
 * Bar at the bottom while orders are picked on the board: move to any
 * status, assign, tag, follow-up, book courier, labels and invoices.
 * Orders that failed stay picked with their reason.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, CalendarClock, FileText, Printer, Tag, Truck, UserRound, X } from 'lucide-react-native';
import { t } from '@/core/i18n';
import { Button, IconButton, Text, toast, useTheme } from '@/design';
import { apiErrorMessage } from '../../api/online';
import { boardApi, type BoardOrder, type BoardStatus, type CustomStage } from '../../api/board';
import { boardEntry, moveNeedsDetail } from '../../lib/board';
import { printLabels } from '../../lib/docs';
import { refreshOrders } from '../../lib/online';
import { MoveSheet, entryLabel, type MoveExtra } from '../../hooks/useMoveOrder';
import { BookCourierSheet } from './BookCourierSheet';
import { StatusSheet } from './StatusSheet';
import { TeamToolSheet, reportBulk, type TeamTool } from './TeamSheets';

export function BoardBulkBar({ orders, picked, custom, onClear, onKeep, onInvoices }: {
  orders: BoardOrder[]; picked: Set<string>; custom: CustomStage[];
  onClear: () => void; onKeep: (ids: string[]) => void; onInvoices: (ids: string[]) => void;
}) {
  const th = useTheme();
  const qc = useQueryClient();
  const [statusOpen, setStatusOpen] = useState(false);
  const [ask, setAsk] = useState<BoardStatus | null>(null);
  const [tool, setTool] = useState<TeamTool | null>(null);
  const [book, setBook] = useState<BoardOrder[] | null>(null);
  const ids = [...picked];
  const sel = orders.filter((o) => picked.has(o.id));
  const after = (failed: string[]) => (failed.length ? onKeep(failed) : onClear());

  const move = useMutation({
    mutationFn: ({ to, extra }: { to: BoardStatus; extra?: MoveExtra }) => boardApi.bulkMove(ids, to, extra?.reason),
    onSuccess: (r, { to }) => {
      refreshOrders(qc);
      setAsk(null);
      after(reportBulk(r.results, `→ ${entryLabel(boardEntry(to, custom), to)}`));
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Status nahi badla'))),
  });

  if (!picked.size) return null;
  const pick = (to: BoardStatus) => (moveNeedsDetail(to) && to !== 'DISPATCHED' ? setAsk(to) : move.mutate({ to }));
  const bookable = sel.filter((o) => !o.courierBooked && !o.dispatchedAt && !['CANCELLED', 'REJECTED', 'RETURNED', 'DELIVERED'].includes(o.orderStatus));
  const booked = sel.filter((o) => o.trackingNumber).map((o) => o.id);
  const busy = move.isPending;

  return (
    <>
      <View style={{
        position: 'absolute', start: th.space(3), end: th.space(3), bottom: th.space(6), borderRadius: th.radius('xl'),
        backgroundColor: th.colors.brand.solid, padding: th.space(3), gap: th.space(2),
        shadowColor: th.colors.shadow, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
          <Text size="base" weight="bold" color={th.colors.brand.onSolid} style={{ flex: 1 }}>{t('{{size}} chune', { size: picked.size })}</Text>
          <IconButton icon={X} label={t('Chhoro')} onPress={onClear} color={th.colors.brand.onSolid} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          <Button size="sm" variant="inverse" icon={ArrowRightLeft} loading={busy} disabled={busy} onPress={() => setStatusOpen(true)}>{t('Status')}</Button>
          {bookable.length > 0 && <Button size="sm" variant="inverse" icon={Truck} disabled={busy} onPress={() => setBook(bookable)}>{t('Book courier ({{count}})', { count: bookable.length })}</Button>}
          <Button size="sm" variant="inverse" icon={UserRound} disabled={busy} onPress={() => setTool('assign')}>{t('Assign')}</Button>
          <Button size="sm" variant="inverse" icon={Tag} disabled={busy} onPress={() => setTool('tag')}>{t('Tag')}</Button>
          <Button size="sm" variant="inverse" icon={CalendarClock} disabled={busy} onPress={() => setTool('follow-up')}>{t('Follow-up')}</Button>
          {booked.length > 0 && <Button size="sm" variant="inverse" icon={Printer} disabled={busy} onPress={() => void printLabels(booked)}>{t('Labels')}</Button>}
          <Button size="sm" variant="inverse" icon={FileText} disabled={busy} onPress={() => onInvoices(ids)}>{t('Invoice')}</Button>
        </View>
      </View>
      <StatusSheet open={statusOpen} title={t('{{count}} orders ka status', { count: picked.size })} custom={custom} onClose={() => setStatusOpen(false)} onPick={pick} />
      <MoveSheet entry={ask ? boardEntry(ask, custom) ?? null : null} count={picked.size} loading={busy} onClose={() => setAsk(null)}
        onConfirm={(extra) => move.mutate({ to: ask!, extra })} />
      <TeamToolSheet tool={tool} ids={ids} onClose={() => setTool(null)} onDone={after} />
      <BookCourierSheet orders={book} onClose={() => setBook(null)} onDone={after} />
    </>
  );
}
