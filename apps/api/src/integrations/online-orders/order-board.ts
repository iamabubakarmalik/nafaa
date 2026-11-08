/**
 * Orders board: the statuses a merchant picks, and how each one maps onto
 * the stored lifecycle (`orderStatus`) and the `stage` flag.
 *
 *   Board            orderStatus                 stage
 *   NEW              PENDING                     null
 *   PAY_PENDING ...  PENDING (before accept)     that stage
 *   CONFIRMED        CONFIRMED / PREPARING       null
 *   PACKED           READY                       null
 *   PACKED_NOT_SENT  READY                       PACKED_NOT_SENT
 *   DISPATCHED       OUT_FOR_DELIVERY            null
 *   DELIVERED        DELIVERED                   null
 *   RETURNED         RETURNED                    null
 *   CANCELLED        CANCELLED / REJECTED        null
 *   CLAIM, ISSUE     unchanged                   that stage (a flag)
 *   custom:<key>     unchanged                   custom:<key>
 *
 * "Column" stages (holds, PACKED_NOT_SENT, custom) move the order out of its
 * lifecycle column; "flag" stages (CLAIM, ISSUE) are shown on top of it.
 * Pure functions only, so the rules are unit tested without a database.
 */

export const HOLD_STAGES = ['PAY_PENDING', 'ON_HOLD', 'NO_STOCK', 'CUSTOMER_QUERY'] as const;
export const FLAG_STAGES = ['CLAIM', 'ISSUE'] as const;
export const SYSTEM_STAGES = [...HOLD_STAGES, 'PACKED_NOT_SENT', ...FLAG_STAGES] as const;

export const LIFECYCLE_BOARDS = ['NEW', 'CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'RETURNED', 'CANCELLED'] as const;
/** Every fixed board status a merchant can move an order to. */
export const MOVE_TARGETS = [...LIFECYCLE_BOARDS, ...HOLD_STAGES, 'PACKED_NOT_SENT', ...FLAG_STAGES] as const;

/** Tiles with counts on the orders page (custom stages are added per shop). */
export const BOARD_TILES = [
  'TODAY', 'ALL', 'NEW', ...HOLD_STAGES, 'CONFIRMED', 'PACKED', 'PACKED_NOT_SENT', 'DISPATCHED', 'OUT_FOR_DELIVERY',
  'STUCK', 'ISSUES', 'RETURNING', 'DELIVERED', 'RETURNED', 'CANCELLED', 'REPLACEMENT', 'CLAIM', 'FOLLOW_UP', 'COD_DUE', 'DELETED',
] as const;

export type BoardStatus = (typeof MOVE_TARGETS)[number] | `custom:${string}`;

/** Lifecycle statuses in order; a move compares ranks to tell forward from back. */
export const LIFECYCLE_RANK: Record<string, number> = {
  PENDING: 0, ACCEPTING: 0, CONFIRMED: 1, PREPARING: 1, READY: 2, OUT_FOR_DELIVERY: 3, DELIVERED: 4,
};
export const CLOSED_STATUSES = ['CANCELLED', 'REJECTED', 'RETURNED'];

/** Days a dispatched parcel may travel before it counts as stuck. */
export const STUCK_DAYS = 5;

export const isCustomStage = (s: string | null | undefined): s is `custom:${string}` => !!s && /^custom:[a-z0-9_-]{1,30}$/.test(s);
export const isFlagStage = (s: string | null | undefined) => !!s && (FLAG_STAGES as readonly string[]).includes(s);
export const isHoldStage = (s: string | null | undefined) => !!s && (HOLD_STAGES as readonly string[]).includes(s);
/** A stage that takes the order out of its lifecycle column. */
export const isColumnStage = (s: string | null | undefined) => !!s && !isFlagStage(s);

export function isBoardStatus(v: unknown): v is BoardStatus {
  return typeof v === 'string' && ((MOVE_TARGETS as readonly string[]).includes(v) || isCustomStage(v));
}

/** The lifecycle a board status asks for; null = the lifecycle stays as it is. */
export function lifecycleOf(to: BoardStatus): string | null {
  switch (to) {
    case 'NEW': return 'PENDING';
    case 'PAY_PENDING': case 'ON_HOLD': case 'NO_STOCK': case 'CUSTOMER_QUERY': return 'PENDING';
    case 'CONFIRMED': return 'CONFIRMED';
    case 'PACKED': case 'PACKED_NOT_SENT': return 'READY';
    case 'DISPATCHED': return 'OUT_FOR_DELIVERY';
    case 'DELIVERED': return 'DELIVERED';
    case 'RETURNED': return 'RETURNED';
    case 'CANCELLED': return 'CANCELLED';
    default: return null;
  }
}

/** Where an order sits on the board. */
export function boardOf(o: { orderStatus: string; stage?: string | null }): BoardStatus {
  const stage = o.stage ?? null;
  if (stage && isColumnStage(stage) && !CLOSED_STATUSES.includes(o.orderStatus)) return stage as BoardStatus;
  switch (o.orderStatus) {
    case 'PENDING': case 'ACCEPTING': return 'NEW';
    case 'CONFIRMED': case 'PREPARING': return 'CONFIRMED';
    case 'READY': return 'PACKED';
    case 'OUT_FOR_DELIVERY': return 'DISPATCHED';
    case 'DELIVERED': return 'DELIVERED';
    case 'RETURNED': return 'RETURNED';
    default: return 'CANCELLED';
  }
}

export interface MoveOrder {
  orderStatus: string;
  stage?: string | null;
  nafaaSaleId?: string | null;
  dispatchedAt?: Date | null;
  codSettledAt?: Date | null;
  courierBooked?: boolean;
}

export type MoveStep =
  /** Closed order back to PENDING (its bill is void already). */
  | { op: 'reopen' }
  /** Accepted order back to PENDING: void the bill, stock comes back. */
  | { op: 'revert' }
  | { op: 'accept' }
  /** Forward lifecycle step through the normal status path. */
  | { op: 'forward'; status: string }
  /** Backward lifecycle step among accepted statuses. */
  | { op: 'back'; status: string }
  | { op: 'cancel' }
  | { op: 'return' };

export type MoveError = 'COD_SETTLED' | 'NEEDS_FORCE' | 'BUSY' | 'BAD_TARGET';

export interface MovePlan {
  steps: MoveStep[];
  /** The stage to store after the steps run. */
  stage: string | null;
}

/**
 * The steps that take an order to a board status. Throws a MoveError code
 * (as a plain object) when the move is not allowed; the service turns it
 * into a message.
 */
export function planMove(o: MoveOrder, to: BoardStatus, opts: { force?: boolean } = {}): MovePlan | { error: MoveError } {
  if (!isBoardStatus(to)) return { error: 'BAD_TARGET' };
  if (o.orderStatus === 'ACCEPTING') return { error: 'BUSY' };
  const status = o.orderStatus;
  const closed = CLOSED_STATUSES.includes(status);
  const want = lifecycleOf(to);
  const keepFlag = isFlagStage(o.stage) ? o.stage! : null;

  // Flag and custom stages only set the stage.
  if (want === null) return { steps: [], stage: to };

  if (want === 'CANCELLED') {
    if (status === 'CANCELLED' || status === 'REJECTED') return { steps: [], stage: keepFlag };
    return { steps: [{ op: 'cancel' }], stage: keepFlag };
  }
  if (want === 'RETURNED') {
    if (status === 'RETURNED') return { steps: [], stage: keepFlag };
    return { steps: [{ op: 'return' }], stage: keepFlag };
  }

  const stage = isHoldStage(to) || to === 'PACKED_NOT_SENT' ? to : keepFlag;
  const steps: MoveStep[] = [];
  let rank: number;
  if (closed) {
    if (o.codSettledAt) return { error: 'COD_SETTLED' };
    steps.push({ op: 'reopen' });
    rank = 0;
  } else {
    rank = LIFECYCLE_RANK[status] ?? 0;
  }
  const target = LIFECYCLE_RANK[want];

  if (target === 0) {
    if (rank > 0) {
      if (o.codSettledAt) return { error: 'COD_SETTLED' };
      if ((o.dispatchedAt || o.courierBooked) && !opts.force) return { error: 'NEEDS_FORCE' };
      steps.push({ op: 'revert' });
    }
    return { steps, stage };
  }

  if (rank === 0) {
    steps.push({ op: 'accept' });
    if (want !== 'CONFIRMED') steps.push({ op: 'forward', status: want });
    return { steps, stage };
  }
  if (target > rank) steps.push({ op: 'forward', status: want });
  else if (target < rank) {
    if (status === 'DELIVERED' && o.codSettledAt) return { error: 'COD_SETTLED' };
    steps.push({ op: 'back', status: want });
  }
  return { steps, stage };
}

/** Appends one entry to metadata.timeline (newest last, at most 100). */
export function withTimeline(meta: Record<string, any>, entry: { at: string; by: string | null; byName: string | null; from: string; to: string; note?: string | null }) {
  const list = Array.isArray(meta?.timeline) ? meta.timeline : [];
  return { ...meta, timeline: [...list, { ...entry, note: entry.note ?? null }].slice(-100) };
}

/** Custom stage key from a label: "Rider pe hai" -> "rider_pe_hai". */
export function stageKey(label: string): string {
  return String(label ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
}
