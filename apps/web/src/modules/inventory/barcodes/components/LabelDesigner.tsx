/**
 * Label design: roll or A4 sticker sheet, what shows on the sticker,
 * barcode type, price, text size and extra lines. Saved for the whole shop.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, Loader2, Ruler } from 'lucide-react';
import { Segmented, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { LabelConfig, LabelSheet } from '../api/barcode-labels.api';
import { A4_SHEETS, THERMAL_SIZES, type SheetLayout } from './renderLabels';

type Kind = 'thermal' | 'a4' | 'custom';
const kindOf = (s: LabelSheet): Kind => (s === 'thermal' ? 'thermal' : s === 'custom' ? 'custom' : 'a4');

const Hint = ({ children }: { children: ReactNode }) => <p className="mt-1 text-[0.6875rem] leading-snug text-slate-500">{children}</p>;

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Millimetre / number box that saves a clamped value on blur or Enter. */
function NumBox({ label, value, min, max, step = 0.1, unit = 'mm', hint, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; hint?: string; onChange: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);
  const commit = () => {
    const n = Number(text);
    if (!Number.isFinite(n) || text.trim() === '') { setText(String(value)); return; }
    const v = Math.min(max, Math.max(min, Math.round(n / step) * step));
    const clean = Number(v.toFixed(2));
    setText(String(clean));
    if (clean !== value) onChange(clean);
  };
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[0.75rem] font-medium text-slate-700">{label}</span>
      <span className="relative block">
        <input type="number" inputMode="decimal" min={min} max={max} step={step} value={text}
          onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
          className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-2.5 pr-9 text-sm tabular-nums text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.6875rem] text-slate-400">{unit}</span>
      </span>
      {hint && <Hint>{hint}</Hint>}
    </label>
  );
}

function Range({ label, value, min, max, step, show, hint, onChange }: {
  label: string; value: number; min: number; max: number; step: number; show: string; hint: string; onChange: (v: number) => void;
}) {
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  return (
    <div>
      <div className="flex items-center justify-between text-[0.8125rem]">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-500">{show}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={v} aria-label={label}
        onChange={(e) => setV(Number(e.target.value))}
        onPointerUp={() => v !== value && onChange(v)} onKeyUp={() => v !== value && onChange(v)} onBlur={() => v !== value && onChange(v)}
        className="mt-1 w-full accent-brand-600" />
      <Hint>{hint}</Hint>
    </div>
  );
}

function TextBox({ label, value, placeholder, hint, onChange }: { label: string; value: string; placeholder: string; hint: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  useEffect(() => {
    if (text === value) return;
    const t = setTimeout(() => onChange(text), 400);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className="block">
      <span className="mb-1 block text-[0.75rem] font-medium text-slate-700">{label}</span>
      <input value={text} maxLength={40} placeholder={placeholder} onChange={(e) => setText(e.target.value)}
        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
      <Hint>{hint}</Hint>
    </label>
  );
}

const SHOW: Array<{ k: keyof LabelConfig; label: string; hint: string }> = [
  { k: 'showShop', label: 'Dukaan ka naam', hint: 'Sab se upar chhoti line' },
  { k: 'showName', label: 'Cheez ka naam', hint: 'Lamba naam 2 line tak' },
  { k: 'showVariant', label: 'Variant (size / rang)', hint: 'Jaise "Large · Laal"' },
  { k: 'showUnit', label: 'Unit (piece / carton)', hint: 'Pack ke label par zaroori' },
  { k: 'showSku', label: 'SKU', hint: 'Dukaan ka apna code' },
  { k: 'showCode', label: 'Barcode ke number', hint: 'Scanner na chale to haath se likh sakein' },
  { k: 'showPrice', label: 'Qeemat', hint: 'Rs ke saath, bari likhai me' },
  { k: 'showOldPrice', label: 'Purani qeemat (kati hui)', hint: 'Sirf jab unit ki MRP qeemat se zyada ho' },
  { k: 'showExpiry', label: 'Expiry', hint: 'Sab se qareeb batch ki expiry' },
  { k: 'border', label: 'Label ke gird lakeer', hint: 'Saada kaghaz par kaatne ke liye' },
];

export function LabelDesigner({ config: c, set, saving, layout, skip, onSkip }: {
  config: LabelConfig;
  set: (patch: Partial<LabelConfig>) => void;
  saving: boolean;
  layout: SheetLayout;
  skip: number;
  onSkip: (n: number) => void;
}) {
  const kind = kindOf(c.sheet);
  const chooseKind = (k: Kind) => {
    if (k === kind) return;
    if (k === 'thermal') set({ sheet: 'thermal', widthMm: 50, heightMm: 30, cols: 1, gapMm: 2, marginMm: 0 });
    else if (k === 'a4') pickA4('a4-40');
    else set({ sheet: 'custom', widthMm: layout.w, heightMm: layout.h, cols: kind === 'thermal' ? 3 : layout.cols, gapMm: 2, marginMm: 8 });
  };
  const pickA4 = (s: keyof typeof A4_SHEETS) => {
    const p = A4_SHEETS[s];
    set({ sheet: s, widthMm: p.w, heightMm: p.h, cols: p.cols, gapMm: p.gapX, marginMm: 0 });
  };

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[0.9375rem] font-semibold text-slate-900">Label ka design</h2>
          <p className="text-[0.75rem] text-slate-500">Har counter par yehi design chhapega</p>
        </div>
        <span className={cn('inline-flex items-center gap-1 text-[0.75rem]', saving ? 'text-slate-500' : 'text-emerald-600')}>
          {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Save ho raha hai</> : <><CheckCircle2 className="h-3.5 w-3.5" /> Save hai</>}
        </span>
      </div>

      <div className="space-y-4">
        <Section title="Kaghaz" aside={<span className="inline-flex items-center gap-1 text-[0.75rem] text-slate-500"><Ruler className="h-3.5 w-3.5" />{layout.w}×{layout.h} mm</span>}>
          <Segmented label="Kaghaz" value={kind} onChange={chooseKind} className="w-full [&>button]:flex-1 [&>button]:justify-center"
            items={[{ value: 'thermal', label: 'Thermal roll' }, { value: 'a4', label: 'A4 sheet' }, { value: 'custom', label: 'Apna naap' }]} />

          {kind === 'thermal' && (
            <div className="mt-3 space-y-3">
              <div>
                <div className="flex flex-wrap gap-1.5">
                  {THERMAL_SIZES.map(([w, h]) => {
                    const on = c.widthMm === w && c.heightMm === h;
                    return (
                      <button key={`${w}x${h}`} type="button" onClick={() => set({ widthMm: w, heightMm: h })} aria-pressed={on}
                        className={cn('rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium tabular-nums ring-1 transition', on ? 'bg-brand-600 text-white ring-brand-600' : 'text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                        {w}×{h}
                      </button>
                    );
                  })}
                </div>
                <Hint>Roll ke dabbe par likha naap chunein — ya neeche apna likhein</Hint>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumBox label="Chaurai" value={c.widthMm} min={15} max={150} onChange={(v) => set({ widthMm: v })} />
                <NumBox label="Unchai" value={c.heightMm} min={10} max={150} onChange={(v) => set({ heightMm: v })} />
                <NumBox label="Ek line me label" value={c.cols} min={1} max={4} step={1} unit="" hint="Roll par saath saath kitne label" onChange={(v) => set({ cols: v })} />
                {c.cols > 1 && <NumBox label="Beech ka faasla" value={c.gapMm} min={0} max={20} hint="Do label ke darmiyan" onChange={(v) => set({ gapMm: v })} />}
              </div>
            </div>
          )}

          {kind === 'a4' && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(A4_SHEETS) as Array<keyof typeof A4_SHEETS>).map((k) => {
                const s = A4_SHEETS[k];
                const on = c.sheet === k;
                return (
                  <button key={k} type="button" onClick={() => pickA4(k)} aria-pressed={on}
                    className={cn('rounded-xl p-2.5 text-left ring-1 transition', on ? 'bg-brand-50 ring-2 ring-brand-500' : 'ring-slate-200 hover:bg-slate-50')}>
                    <span className="flex items-center gap-2">
                      <SheetIcon cols={s.cols} rows={s.rows} on={on} />
                      <span className="min-w-0">
                        <span className="block text-[0.8125rem] font-semibold text-slate-900">{s.label}</span>
                        <span className="block text-[0.6875rem] tabular-nums text-slate-500">{s.w}×{s.h} mm · {s.cols} column</span>
                      </span>
                    </span>
                    <span className="mt-1 block text-[0.6875rem] leading-snug text-slate-500">{s.hint}</span>
                  </button>
                );
              })}
            </div>
          )}

          {kind === 'custom' && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NumBox label="Chaurai" value={c.widthMm} min={15} max={150} onChange={(v) => set({ widthMm: v })} />
              <NumBox label="Unchai" value={c.heightMm} min={10} max={150} onChange={(v) => set({ heightMm: v })} />
              <NumBox label="Columns" value={c.cols} min={1} max={8} step={1} unit="" hint="Ek line me kitne" onChange={(v) => set({ cols: v })} />
              <NumBox label="Faasla" value={c.gapMm} min={0} max={20} hint="Label ke beech" onChange={(v) => set({ gapMm: v })} />
              <NumBox label="Kinara" value={c.marginMm} min={0} max={30} hint="Sheet ke kinare se" onChange={(v) => set({ marginMm: v })} />
            </div>
          )}

          {!layout.roll && (
            <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-3">
              <p className="flex-1 text-[0.8125rem] text-slate-700">
                Ek sheet par <b className="tabular-nums">{layout.perPage}</b> label ({layout.cols} × {layout.rows})
                {kind === 'custom' && layout.cols < c.cols && <span className="block text-[0.6875rem] text-amber-700">{c.cols} column A4 par nahi aate — {layout.cols} lagaye</span>}
              </p>
              <div className="w-36">
                <NumBox label="Shuru kahan se" value={skip + 1} min={1} max={layout.perPage} step={1} unit="#" onChange={(v) => onSkip(v - 1)} />
              </div>
              <Hint>Aadhi istemaal hui sheet? Jis label se shuru karna hai us ka number likhein (upar baein se ginti).</Hint>
            </div>
          )}
        </Section>

        <Section title="Label par kya ho">
          <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
            {SHOW.map((s) => (
              <Switch key={s.k} size="sm" label={s.label} description={s.hint} checked={!!c[s.k]} onChange={(e) => set({ [s.k]: e.target.checked })} />
            ))}
          </div>
        </Section>

        <Section title="Barcode">
          <Segmented label="Barcode ki qisam" value={c.format} onChange={(v) => set({ format: v })}
            items={[{ value: 'CODE128', label: 'Code 128' }, { value: 'EAN13', label: 'EAN-13' }, { value: 'QR', label: 'QR' }]} />
          <Hint>
            {c.format === 'CODE128' ? 'Har scanner parhta hai, har code chalta hai — yehi rakhein.'
              : c.format === 'EAN13' ? 'Sirf sahi 13 hindson wale code EAN-13 banenge; baqi khud Code 128 me chhapenge.'
                : 'Mobile camera se bhi parha jata hai. Purane laser scanner QR nahi parhte.'}
          </Hint>
          <div className="mt-3">
            <Range label="Barcode ki unchai" value={c.barHeight} min={0.4} max={1} step={0.05} show={`${Math.round(c.barHeight * 100)}%`}
              hint="Bachi hui jagah ka kitna hissa barcode le. Chhota karein to likhai ko jagah milti hai." onChange={(v) => set({ barHeight: v })} />
          </div>
        </Section>

        <Section title="Qeemat aur likhai">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Segmented label="Kaun si qeemat" value={c.priceSource === 'wholesale' ? 'wholesale' : 'retail'} onChange={(v) => set({ priceSource: v })}
                items={[{ value: 'retail', label: 'Retail' }, { value: 'wholesale', label: 'Wholesale' }]} />
              <Hint>Wholesale na likhi ho to retail qeemat chhapti hai</Hint>
            </div>
            <div>
              <Segmented label="Likhai kis taraf" value={c.align} onChange={(v) => set({ align: v })}
                items={[{ value: 'center', label: 'Beech me' }, { value: 'left', label: 'Baein' }]} />
              <Hint>Label par likhai ki jagah</Hint>
            </div>
          </div>
          <div className="mt-3">
            <Range label="Likhai ka size" value={c.fontScale} min={0.6} max={1.6} step={0.05} show={`${Math.round(c.fontScale * 100)}%`}
              hint="Naap ke hisaab se khud set hota hai; yahan se chhota bara karein" onChange={(v) => set({ fontScale: v })} />
          </div>
        </Section>

        <Section title="Apni lines">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextBox label="Dukaan ki line" value={c.shopText} placeholder="Khaali = dukaan ka naam" hint="Shop ke naam ki jagah kuch aur, jaise brand" onChange={(v) => set({ shopText: v })} />
            <TextBox label="Neeche ki line" value={c.footerText} placeholder="Jaise: Exchange 7 din" hint="Har label ke neeche, 40 harf tak" onChange={(v) => set({ footerText: v })} />
          </div>
        </Section>

        <Section title="Naye item ke kitne label">
          <Segmented label="Naye item ke label" value={c.copies} onChange={(v) => set({ copies: v })}
            items={[{ value: 'one', label: 'Ek label' }, { value: 'stock', label: 'Stock jitne' }]} />
          <Hint>Queue me nayi cheez dalte waqt ginti. "Stock jitne" naye maal par har piece ka label deta hai.</Hint>
        </Section>
      </div>
    </div>
  );
}

/** Tiny picture of a sticker sheet's grid. */
function SheetIcon({ cols, rows, on }: { cols: number; rows: number; on: boolean }) {
  const w = 22; const h = 30;
  const cw = (w - 4) / cols; const rh = (h - 4) / rows;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden>
      <rect x="0.5" y="0.5" width={w - 1} height={h - 1} rx="2" className={cn('fill-white', on ? 'stroke-brand-500' : 'stroke-slate-300')} />
      {Array.from({ length: cols * rows }, (_, i) => (
        <rect key={i} x={2 + (i % cols) * cw + 0.3} y={2 + Math.floor(i / cols) * rh + 0.3} width={Math.max(0.6, cw - 0.6)} height={Math.max(0.6, rh - 0.6)} rx="0.4" className={on ? 'fill-brand-300' : 'fill-slate-200'} />
      ))}
    </svg>
  );
}
