/** Pure rules of the pet shop pack (shared by web and mobile): grooming money, animal profit, health dates, product kinds. */

export type PetSpecies = 'DOG' | 'CAT' | 'BIRD' | 'FISH' | 'RABBIT' | 'HAMSTER' | 'GUINEA_PIG' | 'TURTLE' | 'REPTILE' | 'SNAKE' | 'FERRET' | 'OTHER';
export type AnimalStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'DECEASED' | 'RETURNED';
export type GroomingStatus = 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Fee, extra and discount of a grooming visit. Never negative. */
export function groomingTotal(fee: number, extra = 0, discount = 0): number {
  return Math.max(round2(fee + extra - discount), 0);
}

/** What is still to be paid at pickup (advance already taken is out). */
export function groomingDue(a: { totalFee: number; paidAmount: number }): number {
  return Math.max(round2(a.totalFee - a.paidAmount), 0);
}

/** Message when the total would fall under money already received, else ''. */
export function groomingTotalIssue(total: number, paid: number): 'below_paid' | '' {
  return total < paid - 0.01 ? 'below_paid' : '';
}

/** The next step button of a grooming visit. */
export function groomingNext(status: GroomingStatus): 'start' | 'ready' | 'pickup' | null {
  if (status === 'SCHEDULED' || status === 'CONFIRMED') return 'start';
  if (status === 'IN_PROGRESS') return 'ready';
  if (status === 'READY_FOR_PICKUP') return 'pickup';
  return null;
}

export const isOpenGrooming = (s: GroomingStatus) => s === 'SCHEDULED' || s === 'CONFIRMED' || s === 'IN_PROGRESS' || s === 'READY_FOR_PICKUP';

/** Profit of an animal: what it sold for (or its asking price) less its cost. Null when the cost is unknown. */
export function animalProfit(a: { status: AnimalStatus; askingPrice: number; soldPrice?: number | null; costPrice?: number | null }): number | null {
  if (a.costPrice == null) return null;
  const price = a.status === 'SOLD' ? a.soldPrice ?? a.askingPrice : a.askingPrice;
  return round2(price - a.costPrice);
}

export const isOnSale = (s: AnimalStatus) => s === 'AVAILABLE' || s === 'RESERVED';

/** Whole days an animal has been in the shop (null without an acquired date). */
export function daysInShop(acquiredDate: string | null | undefined, today: string): number | null {
  if (!acquiredDate) return null;
  const a = Date.parse(`${acquiredDate.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  return Math.max(Math.round((b - a) / 86_400_000), 0);
}

export const LONG_STAY_DAYS = 60;

/** The earliest next dose date in a medical history. */
export function nextDueDate(history: Array<{ nextDueDate?: string | null }>): string | null {
  return history.map((h) => h.nextDueDate).filter((v): v is string => !!v).sort()[0] ?? null;
}

/** Age text parts: under a year in months, else years and months. */
export function ageParts(months: number | null | undefined): { years: number; months: number } | null {
  if (months == null) return null;
  return { years: Math.floor(months / 12), months: months % 12 };
}

/** A grooming time slot "13:30" as "1:30 PM". */
export function slotLabel(s: string): string {
  const [h, m] = s.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Counter filter group of a product category type: food, medicine, care, gear or aquarium. */
export function categoryGroup(type: string | null | undefined): 'food' | 'medicine' | 'care' | 'gear' | 'aquarium' | null {
  if (!type) return null;
  if (type.startsWith('AQUARIUM_')) return 'aquarium';
  if (type === 'VET_MEDICINE' || type === 'VET_VACCINE' || type === 'VET_DEWORMER' || type === 'VET_SUPPLEMENT') return 'medicine';
  if (type === 'VET_SHAMPOO' || type === 'VET_GROOMING' || type === 'VET_HYGIENE' || type === 'CAT_LITTER') return 'care';
  if (/(_FOOD|_FOOD_DRY|_FOOD_WET|_TREATS)$/.test(type) || type === 'TRAINING_TREATS') return 'food';
  return 'gear';
}

/** Days from `today` (yyyy-mm-dd) to an expiry date; negative when expired. */
export function expiryDays(expiry: string | null | undefined, today: string): number | null {
  if (!expiry) return null;
  return Math.round((Date.parse(`${expiry.slice(0, 10)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}
