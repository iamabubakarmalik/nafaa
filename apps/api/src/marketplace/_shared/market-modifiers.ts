/**
 * Restaurant add-ons on the Market, priced from the POS modifier groups.
 *
 * A product sold by a restaurant can have modifier groups (Size, Toppings,
 * Spice level) through its RestaurantMenuItem. The customer only sends what
 * they picked, `[{ groupId, optionIds }]`; the price of every option is read
 * from the POS each time the cart is shown, so a changed or removed option
 * can never be bought at an old price.
 */
import { PrismaService } from '../../prisma/prisma.service';

export interface ModifierOptionView { id: string; name: string; price: number; isDefault: boolean; emoji: string | null }
export interface ModifierGroupView {
  id: string; name: string; type: string; required: boolean; min: number; max: number; options: ModifierOptionView[];
}
export interface ModifierPick { groupId: string; optionIds: string[] }
/** What a cart line stores: the picks plus a readable summary for the shop. */
export interface StoredModifiers { picks: ModifierPick[]; summary: Array<{ group: string; options: string[] }> }

export type PriceResult =
  | { ok: true; extra: number; stored: StoredModifiers | null }
  | { ok: false; error: string };

/** Modifier groups for each product (empty list when the product has none). */
export async function modifierGroupsFor(prisma: PrismaService, productIds: string[]): Promise<Map<string, ModifierGroupView[]>> {
  const out = new Map<string, ModifierGroupView[]>();
  if (!productIds.length) return out;
  const items = await prisma.restaurantMenuItem.findMany({
    where: { productId: { in: [...new Set(productIds)] } },
    select: {
      productId: true,
      modifiers: {
        orderBy: { displayOrder: 'asc' },
        select: {
          isRequired: true,
          modifierGroup: {
            select: {
              id: true, name: true, type: true, isRequired: true, minSelections: true, maxSelections: true, isActive: true,
              options: { where: { isActive: true }, orderBy: { displayOrder: 'asc' }, select: { id: true, name: true, priceAdjustment: true, isDefault: true, emoji: true } },
            },
          },
        },
      },
    },
  });
  for (const item of items) {
    const groups = item.modifiers
      .filter((m) => m.modifierGroup.isActive && m.modifierGroup.options.length)
      .map((m): ModifierGroupView => {
        const g = m.modifierGroup;
        const required = m.isRequired || g.isRequired;
        const max = Math.max(1, g.maxSelections || 1);
        return {
          id: g.id, name: g.name, type: String(g.type), required,
          min: Math.min(max, Math.max(required ? 1 : 0, g.minSelections || 0)),
          max,
          options: g.options.map((o) => ({ id: o.id, name: o.name, price: Number(o.priceAdjustment) || 0, isDefault: o.isDefault, emoji: o.emoji })),
        };
      });
    out.set(item.productId, groups);
  }
  return out;
}

/** Read the client's picks from either `[{groupId, optionIds}]` or a stored `{ picks }`. */
function readPicks(raw: unknown): ModifierPick[] {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' && Array.isArray((raw as StoredModifiers).picks) ? (raw as StoredModifiers).picks : [];
  return list
    .filter((p): p is ModifierPick => !!p && typeof p === 'object' && typeof (p as ModifierPick).groupId === 'string' && Array.isArray((p as ModifierPick).optionIds))
    .map((p) => ({ groupId: p.groupId, optionIds: [...new Set(p.optionIds.filter((x) => typeof x === 'string'))] }));
}

/**
 * Check the picks against the product's groups and work out the extra price
 * per unit. Every required group must be answered and each group stays
 * within its min/max.
 */
export function priceModifiers(groups: ModifierGroupView[], raw: unknown): PriceResult {
  const picks = readPicks(raw);
  if (!groups.length) return picks.length ? { ok: false, error: 'Is item ke add-ons badal gaye hain, dobara chunein' } : { ok: true, extra: 0, stored: null };
  const byId = new Map(groups.map((g) => [g.id, g]));
  for (const p of picks) if (!byId.has(p.groupId)) return { ok: false, error: 'Is item ke add-ons badal gaye hain, dobara chunein' };

  let extra = 0;
  const kept: ModifierPick[] = [];
  const summary: StoredModifiers['summary'] = [];
  for (const g of groups) {
    const ids = picks.find((p) => p.groupId === g.id)?.optionIds ?? [];
    const chosen = ids.map((id) => g.options.find((o) => o.id === id));
    if (chosen.some((o) => !o)) return { ok: false, error: `"${g.name}" ka option ab available nahi, dobara chunein` };
    if (chosen.length < g.min) return { ok: false, error: g.min === 1 ? `Pehle "${g.name}" chunein` : `"${g.name}" me kam az kam ${g.min} chunein` };
    if (chosen.length > g.max) return { ok: false, error: `"${g.name}" me zyada se zyada ${g.max} chun sakte hain` };
    if (!chosen.length) continue;
    extra += chosen.reduce((s, o) => s + o!.price, 0);
    kept.push({ groupId: g.id, optionIds: ids });
    summary.push({ group: g.name, options: chosen.map((o) => o!.name) });
  }
  return { ok: true, extra: Math.round(extra * 100) / 100, stored: kept.length ? { picks: kept, summary } : null };
}
