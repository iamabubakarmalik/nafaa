/** Pure rules of the florist pack (shared by web and mobile): order steps, wedding money, freshness and delivery drafts. */

export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PREPARATION' | 'READY_FOR_DELIVERY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
export type OrderType = 'WALK_IN' | 'DELIVERY' | 'EVENT' | 'WEDDING' | 'SUBSCRIPTION' | 'CORPORATE';
export type DeliverySlot = 'MORNING_9_12' | 'AFTERNOON_12_3' | 'EVENING_3_6' | 'NIGHT_6_9' | 'URGENT' | 'SCHEDULED';
export type CategoryGroup = 'stem' | 'made' | 'decor' | 'plant' | 'gift';

export const round2 = (n: number) => Math.round(n * 100) / 100;

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  DRAFT: 'CONFIRMED', CONFIRMED: 'IN_PREPARATION', IN_PREPARATION: 'READY_FOR_DELIVERY', READY_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
};
/** The next status an open order moves to by its step button; null when it only ends by delivery or cancel. */
export const nextStatus = (s: OrderStatus): OrderStatus | null => NEXT[s] ?? null;
export const isOpenOrder = (s: OrderStatus) => s !== 'DELIVERED' && s !== 'CANCELLED';

/** Money still to collect on an order or contract. */
export const orderDue = (o: { totalAmount: number; advancePaid: number }) => Math.max(round2(o.totalAmount - o.advancePaid), 0);
export const weddingDue = (c: { quotedAmount: number; advanceAmount: number }) => Math.max(round2(c.quotedAmount - c.advanceAmount), 0);

/** Whole days from `today` (yyyy-mm-dd) to a date; negative when past. */
export function daysUntil(date: string | null | undefined, today: string): number | null {
  if (!date) return null;
  return Math.round((Date.parse(`${date.slice(0, 10)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

/** How a flower item stands on the shelf: wilted, last day, soon or fine. */
export function freshState(freshUntil: string | null | undefined, today: string): 'wilted' | 'today' | 'soon' | 'ok' | null {
  const d = daysUntil(freshUntil, today);
  if (d === null) return null;
  if (d < 0) return 'wilted';
  if (d === 0) return 'today';
  return d <= 2 ? 'soon' : 'ok';
}

/** Fresh-until date from the arrival date and the days a flower lasts. */
export function freshUntilDate(arrival: string, daysToWither: number): string {
  const [y, m, d] = arrival.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + daysToWither));
  return t.toISOString().slice(0, 10);
}

export function categoryGroup(type: string | null | undefined): CategoryGroup | null {
  if (!type) return null;
  if (/^(ROSE_|TULIP|LILY|ORCHID|SUNFLOWER|CARNATION|GERBERA|CHRYSANTHEMUM|DAISY|JASMINE|MARIGOLD|IRIS|HYDRANGEA|PEONY|ANTHURIUM|BIRD_OF_PARADISE|BABY_BREATH|GREENERY_FILLER)/.test(type)) return 'stem';
  if (/^(BOUQUET_|BASKET_|VASE_ARRANGEMENT|BOX_ARRANGEMENT|TABLE_CENTREPIECE|STANDING_ARRANGEMENT|BRIDAL_BOUQUET|BOUTONNIERE|FUNERAL_WREATH|SYMPATHY_ARRANGEMENT)/.test(type)) return 'made';
  if (/^(WEDDING_GARLAND|CAR_DECORATION|STAGE_DECORATION|MEHNDI_DECORATION)$/.test(type)) return 'decor';
  if (/^(POTTED_PLANT_|SUCCULENT|BONSAI|AIR_PLANT)/.test(type)) return 'plant';
  return 'gift';
}

export interface DeliveryDraft {
  orderType: OrderType; recipientName: string; recipientPhone: string; deliveryAddress: string; area: string; landmark: string; messageCard: string;
  senderName: string; isAnonymous: boolean; deliveryTimeSlot: DeliverySlot; scheduledDeliveryDate: string; scheduledDeliveryTime: string;
  eventName: string; eventVenue: string; specialInstructions: string;
}

export const blankDraft = (today: string): DeliveryDraft => ({
  orderType: 'DELIVERY', recipientName: '', recipientPhone: '', deliveryAddress: '', area: '', landmark: '', messageCard: '', senderName: '', isAnonymous: false,
  deliveryTimeSlot: 'EVENING_3_6', scheduledDeliveryDate: today, scheduledDeliveryTime: '', eventName: '', eventVenue: '', specialInstructions: '',
});

export const phoneOk = (v: string) => /^[0-9+\-\s]{10,15}$/.test(v.trim());

export type DraftProblem = 'date' | 'past' | 'recipient' | 'phone' | 'address' | 'venue' | 'card';

/** What is missing before a delivery can be saved; empty when ready. */
export function draftProblems(d: DeliveryDraft, today: string): DraftProblem[] {
  const out: DraftProblem[] = [];
  if (d.orderType === 'WALK_IN') return out;
  if (!d.scheduledDeliveryDate) out.push('date'); else if (d.scheduledDeliveryDate < today) out.push('past');
  if (d.orderType === 'DELIVERY' || d.orderType === 'CORPORATE') {
    if (!d.recipientName.trim()) out.push('recipient');
    if (!phoneOk(d.recipientPhone)) out.push('phone');
    if (!d.deliveryAddress.trim()) out.push('address');
  }
  if (d.orderType === 'EVENT' && !d.eventVenue.trim()) out.push('venue');
  if (d.messageCard.length > 500) out.push('card');
  return out;
}

/** The order sent with a saved bill: blanks dropped, sender hidden when anonymous. */
export function toOrderBody(saleId: string, d: DeliveryDraft) {
  const o = (v: string) => v.trim() || undefined;
  return {
    saleId, orderType: d.orderType, recipientName: o(d.recipientName), recipientPhone: o(d.recipientPhone), deliveryAddress: o(d.deliveryAddress), area: o(d.area),
    landmark: o(d.landmark), messageCard: o(d.messageCard), senderName: d.isAnonymous ? undefined : o(d.senderName), isAnonymous: d.isAnonymous,
    deliveryTimeSlot: d.deliveryTimeSlot, scheduledDeliveryDate: d.scheduledDeliveryDate || undefined, scheduledDeliveryTime: o(d.scheduledDeliveryTime),
    eventName: o(d.eventName), eventVenue: o(d.eventVenue), specialInstructions: o(d.specialInstructions),
  };
}
