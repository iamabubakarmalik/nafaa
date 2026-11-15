'use client';
/**
 * Everything needed to add one product to the cart, driven by the shop's
 * flow: size/colour lines, restaurant add-ons (POS modifier groups: radio
 * when max is 1, checkboxes otherwise), quantity, special instructions,
 * cake form, gift message, substitutes. Used on the product page and in the
 * options sheet on shop pages.
 */
import { useMemo, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { Button, Input, Price, Stepper, Textarea, cn } from '@/components/ui';
import { money } from '@/lib/format';
import type { Flow, ModifierGroup, ProductDetail, ProductLine } from '@/lib/types';
import { useCart } from './useCart';

const uniq = (xs: Array<string | null>) => [...new Set(xs.filter((x): x is string => !!x))];

export function ProductOptions({ product, flow, onAdded, sticky }: { product: ProductDetail; flow: Flow; onAdded?: () => void; sticky?: boolean }) {
  const { t } = useApp();
  const cart = useCart();
  const lines = product.lines.length ? product.lines : [];
  const sizes = uniq(lines.map((l) => l.size));
  const colors = uniq(lines.map((l) => l.color));
  const byName = lines.length > 1 && !sizes.length && !colors.length;

  const firstOk = lines.find((l) => l.maxQty > 0) ?? lines[0];
  const [size, setSize] = useState<string | null>(sizes.length ? firstOk?.size ?? null : null);
  const [color, setColor] = useState<string | null>(colors.length ? firstOk?.color ?? null : null);
  const [variantId, setVariantId] = useState<string | null>(byName ? firstOk?.variantId ?? null : null);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [cake, setCake] = useState({ weight: '2 lb', flavour: '', message: '', date: '' });
  const [gift, setGift] = useState({ message: '', date: '' });
  const [substitute, setSubstitute] = useState(true);
  const groups = product.modifierGroups ?? [];
  const [picks, setPicks] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(groups.map((g) => [g.id, g.options.filter((o) => o.isDefault).slice(0, g.max).map((o) => o.id)])),
  );
  const need = (g: ModifierGroup) => (g.required ? Math.max(g.min, 1) : g.min);
  const missing = groups.filter((g) => (picks[g.id]?.length ?? 0) < need(g));
  const addOns = groups.reduce((sum, g) => sum + g.options.filter((o) => picks[g.id]?.includes(o.id)).reduce((a, o) => a + o.price, 0), 0);
  const toggle = (g: ModifierGroup, id: string) =>
    setPicks((cur) => {
      const now = cur[g.id] ?? [];
      if (g.max <= 1) return { ...cur, [g.id]: now.includes(id) && !g.required ? [] : [id] };
      if (now.includes(id)) return { ...cur, [g.id]: now.filter((x) => x !== id) };
      return now.length >= g.max ? cur : { ...cur, [g.id]: [...now, id] };
    });

  const line: ProductLine | undefined = useMemo(() => {
    if (lines.length <= 1) return lines[0];
    if (byName) return lines.find((l) => l.variantId === variantId);
    return lines.find((l) => (!sizes.length || l.size === size) && (!colors.length || l.color === color));
  }, [lines, byName, variantId, size, color, sizes.length, colors.length]);

  const isCake = !!flow.customCake && /cake/i.test(`${product.name} ${product.category ?? ''}`);
  const max = line?.maxQty ?? 0;
  const out = !line || max <= 0;
  const price = (line?.price ?? product.price) + addOns;

  const submit = async () => {
    if (!line || missing.length) return;
    const options: Record<string, unknown> = {};
    if (flow.substitutes) options.substitute = substitute;
    if (isCake) Object.assign(options, { cakeWeight: cake.weight, cakeFlavour: cake.flavour || undefined, cakeMessage: cake.message || undefined, cakeDate: cake.date || undefined });
    if (flow.giftMessage) Object.assign(options, { giftMessage: gift.message || undefined, deliveryDate: gift.date || undefined });
    const ok = await cart.add({
      productId: product.productId,
      variantId: line.variantId,
      quantity: qty,
      notes: flow.modifiers && notes.trim() ? notes.trim() : undefined,
      options: Object.keys(options).length ? JSON.parse(JSON.stringify(options)) : undefined,
      modifiers: groups.length ? groups.map((g) => ({ groupId: g.id, optionIds: picks[g.id] ?? [] })).filter((x) => x.optionIds.length) : undefined,
    });
    if (ok) onAdded?.();
  };

  const chip = (on: boolean, disabled: boolean) =>
    cn('min-w-[3rem] rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition', on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-gray-800 ring-gray-300 hover:ring-gray-400', disabled && 'opacity-40 line-through');

  return (
    <div className="space-y-5">
      {colors.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-gray-900">{t('product.colour')}{color ? <span className="font-normal text-gray-500"> · {color}</span> : null}</legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const l = lines.find((x) => x.color === c);
              const none = lines.filter((x) => x.color === c).every((x) => x.maxQty <= 0);
              return (
                <button key={c} type="button" aria-pressed={color === c} aria-label={c} onClick={() => setColor(c)} className={cn('flex items-center gap-2', chip(color === c, none))}>
                  {l?.colorHex && <span className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: l.colorHex }} />}
                  {c}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      {sizes.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-gray-900">{t('product.size')}</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const none = lines.filter((x) => x.size === s && (!colors.length || x.color === color)).every((x) => x.maxQty <= 0);
              return <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)} className={chip(size === s, none)}>{s}</button>;
            })}
          </div>
        </fieldset>
      )}
      {byName && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-gray-900">{t('product.option')}</legend>
          <div className="grid gap-2">
            {lines.map((l) => (
              <button key={l.variantId ?? 'x'} type="button" aria-pressed={variantId === l.variantId} disabled={l.maxQty <= 0} onClick={() => setVariantId(l.variantId)} className={cn('flex items-center justify-between rounded-xl px-4 py-3 text-sm ring-1', variantId === l.variantId ? 'bg-brand-50 ring-brand-500' : 'bg-white ring-gray-200', l.maxQty <= 0 && 'opacity-50')}>
                <span className="font-semibold text-gray-900">{l.name}</span>
                <span className="num text-gray-700">{l.maxQty <= 0 ? t('common.outOfStock') : money(l.price)}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {groups.map((g) => {
        const chosen = picks[g.id] ?? [];
        const short = chosen.length < need(g);
        return (
          <fieldset key={g.id} className="rounded-2xl ring-1 ring-gray-200">
            <legend className="sr-only">{g.name}</legend>
            <div className="flex items-center justify-between gap-2 rounded-t-2xl bg-gray-50 px-4 py-2.5">
              <span className="text-sm font-bold text-gray-900">{g.name}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-2xs font-bold', g.required ? (short ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800') : 'bg-gray-200 text-gray-700')}>
                {g.required ? t('product.required') : t('product.optional')}
                {g.max > 1 ? ` · ${t('product.upTo', { n: g.max })}` : ''}
              </span>
            </div>
            <ul className="divide-y divide-gray-100">
              {g.options.map((o) => {
                const on = chosen.includes(o.id);
                const full = !on && g.max > 1 && chosen.length >= g.max;
                return (
                  <li key={o.id}>
                    <label className={cn('flex cursor-pointer items-center gap-3 px-4 py-3 text-sm', full && 'cursor-not-allowed opacity-50')}>
                      <input
                        type={g.max <= 1 ? 'radio' : 'checkbox'}
                        name={`mod-${g.id}`}
                        checked={on}
                        disabled={full}
                        onChange={() => toggle(g, o.id)}
                        onClick={() => g.max <= 1 && on && !g.required && toggle(g, o.id)}
                        className="h-5 w-5 accent-brand-600"
                      />
                      <span className="flex-1 text-gray-900">{o.emoji ? `${o.emoji} ` : ''}{o.name}</span>
                      {o.price > 0 && <span className="num text-gray-600">+ {money(o.price)}</span>}
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        );
      })}

      {isCake && (
        <fieldset className="space-y-3 rounded-2xl bg-gray-50 p-4">
          <legend className="text-sm font-bold text-gray-900">{t('product.cakeTitle')}</legend>
          <div className="flex flex-wrap gap-2">
            {['1 lb', '2 lb', '3 lb', '4 lb'].map((w) => (
              <button key={w} type="button" aria-pressed={cake.weight === w} onClick={() => setCake({ ...cake, weight: w })} className={chip(cake.weight === w, false)}>{w}</button>
            ))}
          </div>
          <Input label={t('product.cakeFlavour')} value={cake.flavour} maxLength={60} onChange={(e) => setCake({ ...cake, flavour: e.target.value })} />
          <Input label={t('product.cakeMessage')} value={cake.message} maxLength={60} onChange={(e) => setCake({ ...cake, message: e.target.value })} />
          <Input label={t('product.cakeDate')} type="date" value={cake.date} onChange={(e) => setCake({ ...cake, date: e.target.value })} />
        </fieldset>
      )}
      {flow.giftMessage && (
        <fieldset className="space-y-3 rounded-2xl bg-gray-50 p-4">
          <legend className="text-sm font-bold text-gray-900">{t('product.giftTitle')}</legend>
          <Textarea label={t('product.giftMessage')} value={gift.message} maxLength={200} rows={2} onChange={(e) => setGift({ ...gift, message: e.target.value })} />
          <Input label={t('product.giftDate')} type="date" value={gift.date} onChange={(e) => setGift({ ...gift, date: e.target.value })} />
        </fieldset>
      )}
      {flow.modifiers && (
        <Textarea label={t('product.notes')} placeholder={t('product.notesPlaceholder')} value={notes} maxLength={300} rows={2} onChange={(e) => setNotes(e.target.value)} />
      )}
      {flow.substitutes && (
        <label className="flex items-start gap-3 rounded-2xl bg-gray-50 p-3 text-sm text-gray-700">
          <input type="checkbox" checked={substitute} onChange={(e) => setSubstitute(e.target.checked)} className="mt-0.5 h-5 w-5 rounded accent-brand-600" />
          {t('shop.substitute')}
        </label>
      )}
      {product.requiresPrescription && flow.prescription && (
        <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-800">{t('product.rxNote')}</p>
      )}

      <div className={cn('flex items-center gap-3', sticky && 'sticky bottom-[calc(var(--bottom-nav)+0.5rem)] z-10 -mx-1 rounded-2xl bg-white/95 p-2 shadow-soft-lg ring-1 ring-gray-200 backdrop-blur md:static md:bg-transparent md:p-0 md:shadow-none md:ring-0')}>
        {!out && <Stepper value={qty} min={1} max={max} onChange={setQty} />}
        <Button block size="lg" disabled={out || missing.length > 0} loading={cart.busy === product.productId} onClick={submit}>
          {out ? t('common.outOfStock') : missing.length ? t('product.chooseGroup', { group: missing[0]!.name }) : (
            <span className="flex w-full items-center justify-between gap-3">
              <span>{t('common.addToCart')}</span>
              <Price value={price * qty} className="[&>span]:text-brand-fg" />
            </span>
          )}
        </Button>
      </div>
      {!out && max <= 5 && <p className="text-xs font-semibold text-amber-700">{t('common.lowStock', { n: max })}</p>}
    </div>
  );
}
