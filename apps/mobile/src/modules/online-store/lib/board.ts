/**
 * The orders board: every status tile in order (same keys as the web
 * lib/orders BOARD), where an order sits on the board, the statuses an order
 * can be moved to, and the work tiles of the online store home. Labels are
 * msg() keys; screens translate them with t().
 */

import type { LucideIcon } from 'lucide-react-native';
import {
  AlertOctagon, Ban, BadgeCheck, CalendarClock, CalendarDays, CircleDollarSign, CircleHelp, Clock3, Hourglass, Inbox, Layers, PackageCheck,
  PackageX, PauseCircle, Repeat, ShieldAlert, Tag, Trash2, Truck, Undo2, Wallet,
} from 'lucide-react-native';
import { msg } from '@/core/i18n';
import type { StatusTone } from '@/design';
import type { BoardOrder, BoardStatus, CustomStage } from '../api/board';

export type BoardGroup = 'work' | 'shipping' | 'done' | 'other';

export interface BoardEntry {
  key: string;
  label: string;
  hint: string;
  /** Theme tone, so the owner's appearance colors apply. */
  tone: StatusTone;
  icon: LucideIcon;
  group: BoardGroup;
  /** Open-work tiles ignore the date filter, so nothing old hides. */
  queue: boolean;
  /** Can be picked in the Status sheet / bulk move. */
  move: boolean;
}

export const BOARD_GROUPS: Array<{ id: BoardGroup; label: string }> = [
  { id: 'work', label: msg('Kaam') },
  { id: 'shipping', label: msg('Shipping') },
  { id: 'done', label: msg('Mukammal') },
  { id: 'other', label: msg('Doosre') },
];

const b = (key: string, label: string, hint: string, tone: StatusTone, icon: LucideIcon, group: BoardGroup, queue: boolean, move: boolean): BoardEntry =>
  ({ key, label, hint, tone, icon, group, queue, move });

export const BOARD: BoardEntry[] = [
  b('TODAY', msg('Aaj'), msg('Aaj aaye orders'), 'info', CalendarDays, 'work', false, false),
  b('ALL', msg('Sab'), msg('Har order'), 'neutral', Layers, 'work', false, false),
  b('NEW', msg('New'), msg('Abhi dekhna hai'), 'warning', Inbox, 'work', true, true),
  b('PAY_PENDING', msg('Pay pending'), msg('Advance ka intezar'), 'warning', CircleDollarSign, 'work', true, true),
  b('ON_HOLD', msg('On hold'), msg('Abhi rok diya'), 'neutral', PauseCircle, 'work', true, true),
  b('NO_STOCK', msg('No stock'), msg('Maal khatam'), 'danger', PackageX, 'work', true, true),
  b('CUSTOMER_QUERY', msg('Customer query'), msg('Customer ka sawal'), 'accent', CircleHelp, 'work', true, true),
  b('CONFIRMED', msg('Confirmed'), msg('Bill ban gaya, pack karna hai'), 'info', BadgeCheck, 'work', true, true),
  b('FOLLOW_UP', msg('Follow-up'), msg('Aaj dobara rabta'), 'accent', CalendarClock, 'work', true, false),
  b('PACKED', msg('Packed'), msg('Pack ho gaya'), 'brand', PackageCheck, 'shipping', true, true),
  b('PACKED_NOT_SENT', msg('Packed not sent'), msg('Pack hai, gaya nahi'), 'warning', Hourglass, 'shipping', true, true),
  b('DISPATCHED', msg('Dispatched'), msg('Courier ko de diya'), 'info', Truck, 'shipping', true, true),
  b('OUT_FOR_DELIVERY', msg('Out for delivery'), msg('Aaj pohanchna hai'), 'info', Truck, 'shipping', true, false),
  b('STUCK', msg('Stuck 5+ din'), msg('5 din se raste me'), 'danger', Clock3, 'shipping', true, false),
  b('ISSUES', msg('Issues'), msg('Courier ya order me masla'), 'danger', AlertOctagon, 'shipping', true, false),
  b('RETURNING', msg('Returning'), msg('Wapas aa raha'), 'accent', Undo2, 'shipping', true, false),
  b('DELIVERED', msg('Delivered'), msg('Mil gaya'), 'success', PackageCheck, 'done', false, true),
  b('COD_DUE', msg('COD baqi'), msg('Courier se paisa aana hai'), 'warning', Wallet, 'done', true, false),
  b('RETURNED', msg('Returned'), msg('Wapas mil gaya (RTO)'), 'accent', Undo2, 'done', false, true),
  b('CANCELLED', msg('Cancelled'), msg('Cancel ya reject'), 'danger', Ban, 'done', false, true),
  b('REPLACEMENT', msg('Replacement'), msg('Badle me bheja'), 'info', Repeat, 'other', false, false),
  b('CLAIM', msg('Claim'), msg('Courier se claim'), 'danger', ShieldAlert, 'other', true, true),
  b('ISSUE', msg('Issue'), msg('Masla hai'), 'danger', AlertOctagon, 'other', true, true),
  b('DELETED', msg('Deleted'), msg('Mitaye gaye'), 'neutral', Trash2, 'other', false, false),
];

/** The ISSUE stage is a move target only; its orders show under the Issues tile. */
export const TILES = BOARD.filter((x) => x.key !== 'ISSUE');

const STAGE_KEYS = ['PAY_PENDING', 'ON_HOLD', 'NO_STOCK', 'CUSTOMER_QUERY', 'PACKED_NOT_SENT', 'CLAIM', 'ISSUE'];

/** Board entry for a key, including custom stages (`custom:<key>`, label not translated). */
export function boardEntry(key: string, custom: CustomStage[] = []): BoardEntry | undefined {
  const known = BOARD.find((x) => x.key === key);
  if (known) return known;
  if (!key.startsWith('custom:')) return undefined;
  const c = custom.find((s) => `custom:${s.key}` === key);
  return b(key, c?.label ?? key.slice(7), msg('Apna status'), 'neutral', Tag, 'other', true, true);
}

export const isCustom = (key: string) => key.startsWith('custom:');

/** Statuses an order can be moved to, built-in first. */
export const moveTargets = (custom: CustomStage[] = []) => [...BOARD.filter((x) => x.move), ...custom.map((c) => boardEntry(`custom:${c.key}`, custom)!)];

/** Where an order sits right now: the API's column, else its stage, else its lifecycle status. */
export function boardOf(o: Pick<BoardOrder, 'orderStatus' | 'stage' | 'deletedAt' | 'board'>): string {
  if (o.board) return o.board;
  if (o.deletedAt) return 'DELETED';
  if (o.stage && (STAGE_KEYS.includes(o.stage) || isCustom(o.stage))) return o.stage;
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

/** Moves that ask for more first: a reason (cancel, return) or a CN (dispatch). */
export const moveNeedsDetail = (to: string) => to === 'CANCELLED' || to === 'RETURNED' || to === 'DISPATCHED';

/** Board keys a deep link may open (?board=…). */
export const isBoardKey = (k?: string | null): k is BoardStatus | string => !!k && (TILES.some((x) => x.key === k) || isCustom(k));

/** The statuses that need someone's hands, for the home screen. */
export const WORK_KEYS = ['NEW', 'PAY_PENDING', 'ON_HOLD', 'NO_STOCK', 'CONFIRMED', 'PACKED_NOT_SENT', 'STUCK', 'ISSUES', 'RETURNING', 'FOLLOW_UP'];
