/** Pure rules of the gaming pack (shared by web and mobile): the station clock and its bill, same as the server. */

export const round2 = (n: number) => Math.round(n * 100) / 100;

export interface TimerSession { startedAt: number; /** Pause minutes already closed. */ totalPauseMinutes: number; pausedAt?: number | null; paused?: boolean; ratePerHour: number; minimumMinutes?: number }

/** Minutes played and the bill so far (billable time never goes under the station minimum). */
export function liveBill(s: TimerSession, now: number) {
  const actualMinutes = Math.max(Math.floor((now - s.startedAt) / 60000), 0);
  const openPause = s.paused && s.pausedAt ? Math.max(Math.floor((now - s.pausedAt) / 60000), 0) : 0;
  const billableMinutes = Math.max(actualMinutes - s.totalPauseMinutes - openPause, s.minimumMinutes ?? 0, 0);
  return { actualMinutes, billableMinutes, pauseMinutes: s.totalPauseMinutes + openPause, currentAmount: round2((billableMinutes / 60) * s.ratePerHour) };
}

/** Total of a session bill: station time, food and extras, less discount. Null when the discount is more than the bill. */
export function sessionTotal(input: { billableMinutes: number; ratePerHour: number; food?: number; extra?: number; discount?: number }): { base: number; gross: number; total: number } | null {
  const base = round2((input.billableMinutes / 60) * input.ratePerHour);
  const gross = round2(base + (input.food ?? 0) + (input.extra ?? 0));
  const discount = round2(Math.max(input.discount ?? 0, 0));
  if (discount > gross) return null;
  return { base, gross, total: round2(gross - discount) };
}

/** "1:05:09" for the running clock. */
export function clockText(totalSeconds: number): string {
  const s = Math.max(Math.floor(totalSeconds), 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${h}:${p(m)}:${p(s % 60)}`;
}
