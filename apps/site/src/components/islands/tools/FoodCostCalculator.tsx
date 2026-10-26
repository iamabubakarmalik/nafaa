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
import { BigResult, Breakdown, Field, Glyph, InputsPanel, ResultPanel, SmallButton, ToolFrame, pick, useToolUsed } from './kit';

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

const en = {
  frame: 'Food cost calculator',
  recipe: 'Recipe',
  recipeSub: 'Quantity used in one batch, and the rate you buy it at (per kg, litre or piece).',
  colIngredient: 'Ingredient',
  colQty: 'Qty used',
  colRate: 'Rate per unit',
  ingredient: (i: number) => `Ingredient ${i}`,
  namePlaceholder: 'e.g. Chicken (kg)',
  qtyLabel: (i: number) => `Quantity used, ingredient ${i}`,
  qtyPlaceholder: 'Qty',
  rateLabel: (i: number) => `Rate per unit, ingredient ${i}`,
  ratePlaceholder: 'Rate',
  remove: (i: number) => `Remove ingredient ${i}`,
  add: 'Add ingredient',
  plates: 'Plates from this batch',
  wastage: 'Wastage and trimming',
  wastageHint: 'Bones, spills, oil left in the pan.',
  menuPrice: 'Menu price per plate',
  target: 'Target food cost',
  targetPlaceholder: 'e.g. 30',
  targetHint: 'The share of the price you plan to spend on ingredients.',
  big: 'Cost per plate',
  foodCostNote: (p: string) => `${p} food cost`,
  addMenu: 'Add the menu price to see food cost %',
  rowBatch: 'Ingredients for the batch',
  rowPlates: 'Plates',
  rowMenu: 'Menu price',
  rowLeft: 'Left after ingredients',
  priceFor: (p: string) => `Price for ${p} food cost`,
  footnote: 'Food cost % = ingredient cost per plate ÷ menu price × 100. The rest of the price pays for staff, rent, gas and profit.',
};

const STRINGS: { en: typeof en; ur: typeof en } = {
  en,
  ur: {
    frame: 'فوڈ کاسٹ کیلکولیٹر',
    recipe: 'ریسیپی',
    recipeSub: 'ایک بیچ (ایک دفعہ کی پکائی) میں کتنا سامان لگا، اور کس ریٹ پر خریدا (فی کلو، لیٹر یا پیس)۔',
    colIngredient: 'سامان',
    colQty: 'کتنا لگا',
    colRate: 'فی یونٹ ریٹ',
    ingredient: (i) => `سامان ${i}`,
    namePlaceholder: 'مثلاً چکن (کلو)',
    qtyLabel: (i) => `کتنا لگا، سامان ${i}`,
    qtyPlaceholder: 'مقدار',
    rateLabel: (i) => `فی یونٹ ریٹ، سامان ${i}`,
    ratePlaceholder: 'ریٹ',
    remove: (i) => `سامان ${i} ہٹائیں`,
    add: 'سامان شامل کریں',
    plates: 'اس بیچ سے کتنی پلیٹیں بنیں',
    wastage: 'ضائع اور کٹائی',
    wastageHint: 'ہڈیاں، گرا ہوا سامان، کڑاہی میں بچا تیل۔',
    menuPrice: 'فی پلیٹ مینو قیمت',
    target: 'فوڈ کاسٹ کا ہدف',
    targetPlaceholder: 'مثلاً 30',
    targetHint: 'قیمت کا وہ حصہ جو آپ سامان پر خرچ کرنا چاہتے ہیں۔',
    big: 'فی پلیٹ کاسٹ',
    foodCostNote: (p) => `${p} فوڈ کاسٹ`,
    addMenu: 'فوڈ کاسٹ % دیکھنے کے لیے مینو قیمت لکھیں',
    rowBatch: 'پورے بیچ کا سامان',
    rowPlates: 'پلیٹیں',
    rowMenu: 'مینو قیمت',
    rowLeft: 'سامان کے بعد بچا',
    priceFor: (p) => `${p} فوڈ کاسٹ کے لیے قیمت`,
    footnote: 'فوڈ کاسٹ % = فی پلیٹ سامان کی کاسٹ ÷ مینو قیمت × 100۔ باقی قیمت سے اسٹاف، کرایہ، گیس اور پرافٹ نکلتا ہے۔',
  },
};

export default function FoodCostCalculator({ locale }: { locale?: string }) {
  const tx = pick(STRINGS, locale);
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
    <ToolFrame label={tx.frame}>
      <InputsPanel className="space-y-5">
        <div>
          <h3 className="text-h4 text-fg-strong">{tx.recipe}</h3>
          <p className="mt-1 text-small text-fg-subtle">{tx.recipeSub}</p>
        </div>
        <div className="hidden grid-cols-[minmax(0,1fr)_5.5rem_7.5rem_2.25rem] gap-2 text-small font-medium text-fg-muted sm:grid">
          <span>{tx.colIngredient}</span>
          <span>{tx.colQty}</span>
          <span>{tx.colRate}</span>
          <span />
        </div>
        <div className="space-y-3 sm:space-y-2">
          {lines.map((line, index) => (
            <div key={line.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)_2.25rem] gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_7.5rem_2.25rem]">
              <Field label={tx.ingredient(index + 1)} hideLabel inputMode="text" placeholder={tx.namePlaceholder} value={line.name} onChange={(v) => update(line.id, { name: v })} className="col-span-3 sm:col-span-1" />
              <Field label={tx.qtyLabel(index + 1)} hideLabel placeholder={tx.qtyPlaceholder} value={line.qty} onChange={(v) => update(line.id, { qty: v })} />
              <Field label={tx.rateLabel(index + 1)} hideLabel prefix="Rs" placeholder={tx.ratePlaceholder} value={line.rate} onChange={(v) => update(line.id, { rate: v })} />
              <button
                type="button"
                aria-label={tx.remove(index + 1)}
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
          {Glyph.plus}
          {` ${tx.add}`}
        </SmallButton>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tx.plates} value={plates} onChange={touch(setPlates)} inputMode="numeric" />
          <Field label={tx.wastage} suffix="%" value={wastage} onChange={touch(setWastage)} placeholder="0" hint={tx.wastageHint} />
          <Field label={tx.menuPrice} prefix="Rs" value={price} onChange={touch(setPrice)} placeholder="0" />
          <Field label={tx.target} suffix="%" value={target} onChange={touch(setTarget)} placeholder={tx.targetPlaceholder} hint={tx.targetHint} />
        </div>
      </InputsPanel>

      <ResultPanel>
        <BigResult label={tx.big} value={rupees(cost.perPlate)} note={pct !== null ? tx.foodCostNote(percent(pct, 1)) : tx.addMenu} />
        <Breakdown
          className="mt-6"
          rows={[
            { label: tx.rowBatch, value: rupees(cost.batch) },
            { label: tx.rowPlates, value: plain(n(plates)) },
            ...(menuPrice > 0
              ? [
                  { label: tx.rowMenu, value: rupees(menuPrice) },
                  { label: tx.rowLeft, value: rupees(round2(menuPrice - cost.perPlate)) },
                ]
              : []),
            { label: tx.priceFor(t > 0 && t < 100 ? percent(t) : '—'), value: suggested !== null ? rupees(suggested) : '—', strong: true },
          ]}
        />
        <p className="mt-5 text-small text-fg-muted">{tx.footnote}</p>
      </ResultPanel>
    </ToolFrame>
  );
}
