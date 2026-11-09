/**
 * Call center rules without a database: the order of the confirmation
 * queue, what each call outcome does to the order, and agent figures.
 */

export const CALL_OUTCOMES = ['CONFIRMED', 'NO_ANSWER', 'BUSY', 'WRONG_NUMBER', 'CALL_BACK', 'CANCELLED'] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];
export const isOutcome = (v: unknown): v is CallOutcome => typeof v === 'string' && (CALL_OUTCOMES as readonly string[]).includes(v);

/** Outcomes where the customer picked up. */
export const REACHED: CallOutcome[] = ['CONFIRMED', 'CALL_BACK', 'CANCELLED'];

/** The order's COD confirmation result an outcome writes (null = leave it). */
export function confirmationFor(outcome: CallOutcome): 'CONFIRMED' | 'NO_ANSWER' | 'REFUSED' | null {
  switch (outcome) {
    case 'CONFIRMED': return 'CONFIRMED';
    case 'NO_ANSWER': case 'BUSY': case 'WRONG_NUMBER': return 'NO_ANSWER';
    case 'CANCELLED': return 'REFUSED';
    default: return null;
  }
}

const RISK_POINTS: Record<string, number> = { BLOCKED: 50, HIGH: 40, WATCH: 25, NEW: 15, OK: 5, TRUSTED: 0 };
const HOUR = 3_600_000;

export interface QueueFacts {
  receivedAt: Date;
  riskLevel?: string | null;
  attempts: number;
  /** The last call asked to call back at this time. */
  callBackAt?: Date | null;
  lastCallAt?: Date | null;
  cod: boolean;
  total: number;
}

/**
 * Priority of an order in the confirmation queue: older orders and risky
 * customers first, COD before prepaid, bigger orders a little higher. An
 * order is held back while a callback time is still ahead, and for an hour
 * after an unanswered call, so the agent does not dial the same number again
 * at once. Returns null when the order should not be shown now.
 */
export function queueScore(f: QueueFacts, now: Date): number | null {
  if (f.callBackAt && f.callBackAt.getTime() > now.getTime()) return null;
  if (!f.callBackAt && f.lastCallAt && now.getTime() - f.lastCallAt.getTime() < HOUR) return null;
  const ageHours = Math.max(0, (now.getTime() - f.receivedAt.getTime()) / HOUR);
  let score = Math.min(48, ageHours) * 1.5;
  score += RISK_POINTS[f.riskLevel ?? 'NEW'] ?? 10;
  if (f.cod) score += 10;
  score += Math.min(10, f.total / 2000);
  // A due callback was promised to the customer: put it on top.
  if (f.callBackAt) score += 60;
  // Each unanswered try lowers it a little, so fresh orders get a turn.
  score -= Math.min(30, f.attempts * 6);
  return Math.round(score * 10) / 10;
}

export interface CallRow { agentId: string | null; outcome: string; channelOrderId: string | null }
export interface AgentStats {
  agentId: string | null;
  calls: number;
  orders: number;
  confirmed: number;
  cancelled: number;
  noAnswer: number;
  callBack: number;
  wrongNumber: number;
  /** Confirmed orders ÷ orders called, %. */
  confirmRate: number;
  /** Calls the customer picked up ÷ calls, %. */
  reachRate: number;
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

/** Calls, confirm rate and reach rate per agent, busiest first. */
export function agentStats(rows: CallRow[]): AgentStats[] {
  const by = new Map<string, { agentId: string | null; calls: number; orders: Set<string>; confirmedOrders: Set<string>; out: Record<string, number> }>();
  for (const r of rows) {
    const k = r.agentId ?? '-';
    const a = by.get(k) ?? { agentId: r.agentId, calls: 0, orders: new Set<string>(), confirmedOrders: new Set<string>(), out: {} };
    a.calls += 1;
    a.out[r.outcome] = (a.out[r.outcome] ?? 0) + 1;
    if (r.channelOrderId) {
      a.orders.add(r.channelOrderId);
      if (r.outcome === 'CONFIRMED') a.confirmedOrders.add(r.channelOrderId);
    }
    by.set(k, a);
  }
  return [...by.values()].map((a) => {
    const reached = REACHED.reduce((s, o) => s + (a.out[o] ?? 0), 0);
    return {
      agentId: a.agentId,
      calls: a.calls,
      orders: a.orders.size,
      confirmed: a.out.CONFIRMED ?? 0,
      cancelled: a.out.CANCELLED ?? 0,
      noAnswer: (a.out.NO_ANSWER ?? 0) + (a.out.BUSY ?? 0),
      callBack: a.out.CALL_BACK ?? 0,
      wrongNumber: a.out.WRONG_NUMBER ?? 0,
      confirmRate: pct(a.confirmedOrders.size, a.orders.size),
      reachRate: pct(reached, a.calls),
    };
  }).sort((x, y) => y.calls - x.calls);
}
