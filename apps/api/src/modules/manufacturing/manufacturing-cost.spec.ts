import { blendCost, costRecipe, lineUnitOk, marginPct, toBaseQty, unblendCost } from './manufacturing-cost';

describe('manufacturing cost', () => {
  describe('unit conversion', () => {
    it('converts grams to the kilograms an item is stocked in', () => {
      expect(toBaseQty(250, { unitName: 'g', stockUnit: 'kg' })).toBe(0.25);
      expect(toBaseQty(1.5, { unitName: 'kg', stockUnit: 'g' })).toBe(1500);
      expect(toBaseQty(500, { unitName: 'ml', stockUnit: 'litre' })).toBe(0.5);
    });

    it('uses the pack size when the line is written in one of the item\'s packs', () => {
      // 2 bori of 50 kg each
      expect(toBaseQty(2, { unitName: 'bori', packRate: 50, stockUnit: 'kg' })).toBe(100);
      // a pack rate wins over the unit name
      expect(toBaseQty(1, { unitName: 'dozen', packRate: 10, stockUnit: 'pcs' })).toBe(10);
    });

    it('keeps the quantity for the same or an unknown unit', () => {
      expect(toBaseQty(3, { unitName: 'kg', stockUnit: 'kg' })).toBe(3);
      expect(toBaseQty(4, { unitName: 'bottle', stockUnit: 'bottle' })).toBe(4);
    });

    it('accepts only units that can come out of the stock unit', () => {
      expect(lineUnitOk({ unitName: 'g', stockUnit: 'kg' })).toBe(true);
      expect(lineUnitOk({ unitName: 'dozen', stockUnit: 'pcs' })).toBe(true);
      expect(lineUnitOk({ unitName: 'cup', stockUnit: 'kg' })).toBe(false);
      expect(lineUnitOk({ unitName: 'ml', stockUnit: 'kg' })).toBe(false);
      expect(lineUnitOk({ unitName: 'carton', packRate: 24, stockUnit: 'pcs' })).toBe(true);
    });
  });

  describe('recipe cost', () => {
    // Mix daal: 1 batch = 10 packets of 1 kg.
    const mixDaal = {
      yieldQty: 10,
      packingCost: 50,
      labourCost: 30,
      overheadCost: 20,
      lines: [
        { productId: 'moong', quantity: 4, unitName: 'kg', stockUnit: 'kg', cost: 300 },
        { productId: 'masoor', quantity: 3000, unitName: 'g', stockUnit: 'kg', cost: 250 },
        { productId: 'chana', quantity: 3, unitName: 'kg', stockUnit: 'kg', cost: 200 },
      ],
    };

    it('adds raw material and fixed costs and divides by the yield', () => {
      const c = costRecipe(mixDaal);
      // 4×300 + 3×250 + 3×200 = 2550; fixed 100
      expect(c.materialCost).toBe(2550);
      expect(c.extraCost).toBe(100);
      expect(c.totalCost).toBe(2650);
      expect(c.unitCost).toBe(265);
      expect(c.batches).toBe(1);
      expect(c.lines.map((l) => l.baseQty)).toEqual([4, 3, 3]);
    });

    it('scales raw material and fixed costs with the quantity made', () => {
      const c = costRecipe(mixDaal, 25); // 2.5 batches
      expect(c.batches).toBe(2.5);
      expect(c.lines.map((l) => l.baseQty)).toEqual([10, 7.5, 7.5]);
      expect(c.materialCost).toBe(6375);
      expect(c.extraCost).toBe(250);
      expect(c.unitCost).toBe(265);
    });

    it('takes wastage as extra raw material on every line', () => {
      const c = costRecipe({ ...mixDaal, wastagePercent: 10, packingCost: 0, labourCost: 0, overheadCost: 0 });
      expect(c.lines.map((l) => l.baseQty)).toEqual([4.4, 3.3, 3.3]);
      expect(c.materialCost).toBe(2805);
      expect(c.unitCost).toBe(280.5);
    });

    it('works with pack units (attar: 2 tola of a 12 g pack into 10 ml bottles)', () => {
      const c = costRecipe({
        yieldQty: 4,
        lines: [
          { productId: 'oud', quantity: 2, unitName: 'tola', packRate: 12, stockUnit: 'g', cost: 100 },
          { productId: 'bottle', quantity: 4, unitName: 'pcs', stockUnit: 'pcs', cost: 25 },
        ],
      });
      expect(c.lines[0].baseQty).toBe(24);
      expect(c.materialCost).toBe(2500);
      expect(c.unitCost).toBe(625);
    });

    it('treats a missing yield as one unit per batch', () => {
      expect(costRecipe({ yieldQty: 0, lines: [{ productId: 'a', quantity: 1, unitName: 'kg', stockUnit: 'kg', cost: 90 }] }).unitCost).toBe(90);
    });
  });

  describe('weighted average cost', () => {
    it('blends the made cost into the stock on hand, like a purchase', () => {
      expect(blendCost(10, 200, 10, 300)).toBe(250);
      expect(blendCost(0, 200, 5, 300)).toBe(300);
      expect(blendCost(-3, 200, 5, 300)).toBe(300);
      expect(blendCost(10, 0, 5, 300)).toBe(300);
    });

    it('moves back when the made goods are taken out again', () => {
      const after = blendCost(10, 200, 10, 300);
      expect(unblendCost(20, after, 10, 300)).toBe(200);
      // nothing left: keep the cost
      expect(unblendCost(10, 300, 10, 300)).toBe(300);
    });

    it('works out the margin on the selling price', () => {
      expect(marginPct(400, 265)).toBe(33.8);
      expect(marginPct(0, 265)).toBeNull();
      expect(marginPct(400, 0)).toBeNull();
    });
  });
});
