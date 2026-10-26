'use client';

/**
 * Restaurant food cost calculator island. Each ingredient line is the
 * quantity used in the batch and its purchase rate (per kg, litre, dozen or
 * piece); the batch makes N plates. Optional wastage is added on top. With
 * the menu price it gives food cost %, and with a target % the price to set.
 *   cost per plate = Σ(quantity × rate) × (1 + wastage) ÷ plates
 *   food cost %    = cost per plate ÷ menu price × 100
 *   price          = cost per plate ÷ target %
 */
import { useMemo, useState } from 'react';
import { parseAmount, percent, plain, round2, rupees } from './format';
import { BigResult, Breakdown, Field, Glyph, InputsPanel, ResultPanel, SmallButton, ToolFrame, useToolUsed } from './kit';

interface Line {
  id: number;
  name: string;
  qty: string;
  rate: string;
}

const n = (raw: string) => Math.max(parseAmount(raw) ?? 0, 0);

export function plateCost(lines: { qty: number; rate: number }[], plates: number, wastagePct: number): { batch: number; perPlate: number } {
  const batch = lines.reduce((sum, l) => sum + l.qty * l.rate, 0) * (1 + wastagePct / 100);
  return { batch: round2(batch), perPlate: plates > 0 ? round2(batch / plates) : 0 };
}

export default function FoodCostCalculator() {
  const used = useToolUsed('food-cost-calculator');
  const [lines, setLines] = useState<Line[]>([
    { id: 1, name: '', qty: '', rate: '' },
    { id: 2, name: '', qty: '', rate: '' },
    { id: 3, name: '', qty: '', rate: '' },
  ]);
  const [plates, setPlates] = useState('1');
  const [wastage, setWastage] = useState('');
  const [price, setPrice] = useState('');
  const [target, setTarget] = useState('');

  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    used();
    setter(v);
  };
  const update = (id: number, patch: Partial<Line>) => {
    used();
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const parsed = lines.map((l) => ({ ...l, q: n(l.qty), r: n(l.rate) }));
  const cost = useMemo(() => plateCost(parsed.map((l) => ({ qty: l.q, rate: l.r })), n(plates), n(wastage)), [parsed, plates, wastage]);
  const menuPrice = n(price);
  const pct = menuPrice > 0 && cost.perPlate > 0 ? (cost.perPlate / menuPrice) * 100 : null;
  const t = n(target);
  const suggested = t > 0 && t < 100 && cost.perPlate > 0 ? Math.ceil(cost.perPlate / (t / 100)) : null;

  return (
    <ToolFrame label="Food cost calculator">
      <InputsPanel className="space-y-5">
        <div>
          <h3 className="text-h4 text-fg-strong">Recipe</h3>
          <p className="mt-1 text-small text-fg-subtle">Quantity used in one batch, and the rate you buy it at (per kg, litre or piece).</p>
        </div>
        <div className="hidden grid-cols-[minmax(0,1fr)_5.5rem_7.5rem_2.25rem] gap-2 text-small font-medium text-fg-muted sm:grid">
          <span>Ingredient</span>
          <span>Qty used</span>
          <span>Rate per unit</span>
          <span />
        </div>
        <div className="space-y-3 sm:space-y-2">
          {lines.map((line, index) => (
            <div key={line.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)_2.25rem] gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_7.5rem_2.25rem]">
              <Field label={`Ingredient ${index + 1}`} hideLabel inputMode="text" placeholder="e.g. Chicken (kg)" value={line.name} onChange={(v) => update(line.id, { name: v })} className="col-span-3 sm:col-span-1" />
              <Field label={`Quantity used, ingredient ${index + 1}`} hideLabel placeholder="Qty" value={line.qty} onChange={(v) => update(line.id, { qty: v })} />
              <Field label={`Rate per unit, ingredient ${index + 1}`} hideLabel prefix="Rs" placeholder="Rate" value={line.rate} onChange={(v) => update(line.id, { rate: v })} />
              <button
                type="button"
                aria-label={`Remove ingredient ${index + 1}`}
                disabled={lines.length === 1}
                onClick={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
                className="inline-flex h-11 items-center justify-center rounded-md text-fg-subtle transition-colors duration-fast hover:bg-surface-3 hover:text-fg-strong disabled:opacity-40"
              >
                {Glyph.x}
              </button>
            </div>
          ))}
        </div>
        <SmallButton
          variant="ghost"
          className="-ml-2"
          onClick={() => setLines((prev) => [...prev, { id: Math.max(0, ...prev.map((l) => l.id)) + 1, name: '', qty: '', rate: '' }])}
        >
          {Glyph.plus} Add ingredient
        </SmallButton>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Plates from this batch" value={plates} onChange={touch(setPlates)} inputMode="numeric" />
          <Field label="Wastage and trimming" suffix="%" value={wastage} onChange={touch(setWastage)} placeholder="0" hint="Bones, spills, oil left in the pan." />
          <Field label="Menu price per plate" prefix="Rs" value={price} onChange={touch(setPrice)} placeholder="0" />
          <Field label="Target food cost" suffix="%" value={target} onChange={touch(setTarget)} placeholder="e.g. 30" hint="The share of the price you plan to spend on ingredients." />
        </div>
      </InputsPanel>

      <ResultPanel>
        <BigResult label="Cost per plate" value={rupees(cost.perPlate)} note={pct !== null ? `${percent(pct, 1)} food cost` : 'Add the menu price to see food cost %'} />
        <Breakdown
          className="mt-6"
          rows={[
            { label: 'Ingredients for the batch', value: rupees(cost.batch) },
            { label: 'Plates', value: plain(n(plates)) },
            ...(menuPrice > 0
              ? [
                  { label: 'Menu price', value: rupees(menuPrice) },
                  { label: 'Left after ingredients', value: rupees(round2(menuPrice - cost.perPlate)) },
                ]
              : []),
            { label: `Price for ${t > 0 && t < 100 ? percent(t) : '—'} food cost`, value: suggested !== null ? rupees(suggested) : '—', strong: true },
          ]}
        />
        <p className="mt-5 text-small text-fg-muted">
          Food cost % = ingredient cost per plate ÷ menu price × 100. The rest of the price pays for staff, rent, gas and profit.
        </p>
      </ResultPanel>
    </ToolFrame>
  );
}
