/**
 * Check-in and check-out through the offline engine. The punch time is the
 * phone's clock at the tap; the server accepts it later (up to 12 hours back)
 * and the board shows the saved punch at once, marked as waiting to send.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { enqueueCheckIn, enqueueCheckOut, offline } from '@/core/offline';
import { toast } from '@/design';
import type { Board, DayCell } from '../api/attendance';
import { ATT_KEY } from './meta';

type Local = Record<string, { in?: string; out?: string }>;
const LOCAL_KEY = [ATT_KEY, 'local'];

/** Punches saved on this phone today (UTC date of the tap, so also the day before for early-morning punches). */
async function readLocal(): Promise<Local> {
  const now = Date.now();
  const days = [new Date(now - 86_400_000), new Date(now)].map((d) => d.toISOString().slice(0, 10));
  const merged: Local = {};
  for (const day of days) {
    const map = await offline.attendance.today(day).catch(() => ({}));
    for (const [id, p] of Object.entries(map as Local)) {
      const cur = merged[id] ?? {};
      merged[id] = { in: later(cur.in, p.in), out: later(cur.out, p.out) };
    }
  }
  return merged;
}
const later = (a?: string, b?: string) => (a && b ? (a > b ? a : b) : a ?? b);

export function useLocalPunches() {
  return useQuery({ queryKey: LOCAL_KEY, queryFn: readLocal, staleTime: 0 });
}

/** Lays the phone's own unsent punches over the server board. */
export function overlayBoard(board: Board | undefined, local: Local | undefined): Board | undefined {
  if (!board || !local) return board;
  const counts = { ...board.counts };
  const rows = board.rows.map((r) => {
    const p = local[r.staff.id];
    if (!p) return r;
    let day: DayCell = r.day;
    if (p.in && !day.in) {
      day = { ...day, in: p.in, code: day.code === 'NONE' || day.code === 'A' || day.code === 'FUT' ? 'P' : day.code, pending: true };
      counts.notIn = Math.max(0, counts.notIn - 1);
      counts.inside += 1;
      counts.present += 1;
    }
    if (p.out && day.in && !day.out && p.out > day.in) {
      day = { ...day, out: p.out, pending: true };
      counts.inside = Math.max(0, counts.inside - 1);
      counts.out += 1;
    }
    return day === r.day ? r : { ...r, day };
  });
  return { ...board, rows, counts };
}

export function usePunch() {
  const qc = useQueryClient();
  const run = useCallback(async (staff: { id: string; fullName: string }, action: 'in' | 'out') => {
    try {
      if (action === 'in') await enqueueCheckIn(staff.id);
      else await enqueueCheckOut(staff.id);
      toast.success(action === 'in'
        ? t('{{fullName}} — check-in ho gaya', { fullName: staff.fullName })
        : t('{{fullName}} — check-out ho gaya', { fullName: staff.fullName }));
      await qc.invalidateQueries({ queryKey: LOCAL_KEY });
      // The engine sends the punch a moment later; then the server board is current.
      setTimeout(() => void qc.invalidateQueries({ queryKey: [ATT_KEY] }), 2000);
    } catch (e) {
      toast.error(apiErrorMessage(e, t('Nahi hua')));
    }
  }, [qc]);
  return useMemo(() => ({ checkIn: (s: { id: string; fullName: string }) => run(s, 'in'), checkOut: (s: { id: string; fullName: string }) => run(s, 'out') }), [run]);
}
