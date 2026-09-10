import { useState, useMemo } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldOff, Package, Plus, X,
  Globe, Barcode, CalendarClock, Lightbulb, Check, Receipt, Sparkles,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import type { ElectronicsWizardWarranty } from '../../hooks/useElectronicsWizard';
import {
  CATEGORY_META, CONDITION_META, SERIAL_SUGGESTED,
  type CategoryType, type ConditionType,
} from '../../constants';

/* ═════════════════════════════════════════════════════════════
   STEP 3 — WARRANTY & DABBA
   ─────────────────────────────────────────────────────────────
   🛡️ Warranty kitni — aur LIVE dikhta hai ke khatam kab hogi
   🔖 Serial/IMEI — category ke hisab se mashwara
   📦 Dabbe me kya kya — receipt par chhapta hai
   🧾 Neeche live preview: customer ki receipt par kya aayega
   ═════════════════════════════════════════════════════════════ */

interface Props {
  warranty: ElectronicsWizardWarranty;
  onChange: (patch: Partial<ElectronicsWizardWarranty>) => void;
  categoryType?: string;
  conditionType?: string;
  errors: string[];
}

const WARRANTY_PRESETS = [
  { label: 'Koi nahi', months: 0, emoji: '🚫' },
  { label: '1 Mahina', months: 1, emoji: '📅' },
  { label: '3 Mahine', months: 3, emoji: '📅' },
  { label: '6 Mahine', months: 6, emoji: '📆' },
  { label: '1 Saal', months: 12, emoji: '🗓️' },
  { label: '2 Saal', months: 24, emoji: '🗓️' },
  { label: '3 Saal', months: 36, emoji: '🏆' },
];

const WARRANTY_TYPES = [
  { v: 'Manufacturer', hint: 'Company khud degi — sab se mazboot' },
  { v: 'Local Dealer', hint: 'Pakistan ka importer/dealer dega' },
  { v: 'Shop Warranty', hint: 'Aap ki apni dukan ki zimmedari' },
  { v: 'Extended', hint: 'Alag se khareedi hui warranty' },
  { v: 'International', hint: 'Duniya bhar me chalegi' },
  { v: 'No Warranty', hint: 'Bina warranty — sasta maal' },
];

/* Dabbe ki cheezein — kisam ke hisab se, dhoondna aasan */
const BOX_GROUPS: { label: string; emoji: string; items: string[] }[] = [
  { label: 'Bunyadi', emoji: '📦', items: ['Device', 'User Manual', 'Warranty Card', 'Quick Start Guide'] },
  { label: 'Power', emoji: '⚡', items: ['Charger', 'Wall Plug', 'Adapter', 'Batteries (AA/AAA)'] },
  { label: 'Taarein', emoji: '🔌', items: ['USB Cable', 'Type-C Cable', 'Lightning Cable', 'HDMI Cable', 'AUX Cable'] },
  { label: 'Audio', emoji: '🎧', items: ['Earphones', 'Wired Earbuds', 'Extra Ear Tips'] },
  { label: 'Hifazat', emoji: '🛡️', items: ['Silicon Case', 'Screen Protector', 'Carrying Pouch', 'Cleaning Cloth'] },
  { label: 'Baqi', emoji: '🧩', items: ['SIM Ejector', 'Remote Control', 'Mounting Kit', 'Tripod Mount', 'Stickers'] },
];

const addMonths = (iso: string, months: number): string => {
  if (!iso || !months) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

const prettyDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
};

export function ElectronicsWizardStep3Warranty({
  warranty, onChange, categoryType, conditionType, errors,
}: Props) {
  const [newItem, setNewItem] = useState('');

  const cat = (categoryType as CategoryType) || 'OTHER';
  const catMeta = CATEGORY_META[cat];
  const condMeta = conditionType ? CONDITION_META[conditionType as ConditionType] : null;
  const serialSuggested = SERIAL_SUGGESTED.includes(cat);

  const months = typeof warranty.warrantyMonths === 'number' ? warranty.warrantyMonths : 0;
  const noWarranty = months === 0;

  /* Start date se khatam ki tareekh — live */
  const computedEnd = useMemo(
    () => addMonths(warranty.warrantyStartDate, months),
    [warranty.warrantyStartDate, months],
  );
  const effectiveEnd = warranty.warrantyEndDate || computedEnd;

  const addBoxItem = (item: string) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    const current = warranty.boxContents ?? [];
    if (current.includes(trimmed)) return;
    onChange({ boxContents: [...current, trimmed] });
    setNewItem('');
  };

  const removeBoxItem = (item: string) => {
    onChange({ boxContents: (warranty.boxContents ?? []).filter((x) => x !== item) });
  };

  const setMonths = (m: number) => {
    const patch: Partial<ElectronicsWizardWarranty> = { warrantyMonths: m };
    if (m === 0) {
      patch.warrantyType = 'No Warranty';
      patch.warrantyEndDate = '';
      patch.hasInternationalWarranty = false;
    } else if (warranty.warrantyType === 'No Warranty' || !warranty.warrantyType) {
      patch.warrantyType = 'Manufacturer';
    }
    onChange(patch);
  };

  const allBoxItems = BOX_GROUPS.flatMap((g) => g.items);
  const customItems = (warranty.boxContents ?? []).filter((c) => !allBoxItems.includes(c));

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900 font-semibold">{errors.join(' · ')}</div>
        </div>
      )}

      {/* ══ 1. WARRANTY ══ */}
      <section className={[
        'rounded-2xl border-2 p-5 space-y-4 transition',
        noWarranty ? 'border-slate-300 bg-slate-50' : 'border-blue-300 bg-gradient-to-br from-blue-50 to-white',
      ].join(' ')}>
        <Head icon={noWarranty ? ShieldOff : Shield} n={1} t="Warranty"
          d="Electronics me sab se ahem — customer isi par bharosa karta hai"
          tone={noWarranty ? 'slate' : 'blue'} />

        <div>
          <Lbl>Kitni Warranty?</Lbl>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {WARRANTY_PRESETS.map((p) => {
              const a = warranty.warrantyMonths === p.months;
              return (
                <button key={p.months} type="button" onClick={() => setMonths(p.months)}
                  className={['px-3 py-2 rounded-xl border-2 text-xs font-extrabold transition inline-flex items-center gap-1.5',
                    a ? (p.months === 0
                        ? 'border-slate-600 bg-slate-600 text-white shadow-md'
                        : 'border-blue-600 bg-blue-600 text-white shadow-md')
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'].join(' ')}>
                  <span>{p.emoji}</span> {p.label}
                </button>
              );
            })}
          </div>
          <input type="number" min="0" value={warranty.warrantyMonths}
            onChange={(e) => setMonths(e.target.value === '' ? 0 : Number(e.target.value))}
            placeholder="Ya apne mahine likhein"
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500 transition" />
        </div>

        {!noWarranty && (
          <>
            <div>
              <Lbl>Warranty Kaun Dega?</Lbl>
              <div className="grid sm:grid-cols-2 gap-2">
                {WARRANTY_TYPES.filter((t) => t.v !== 'No Warranty').map((t) => {
                  const a = warranty.warrantyType === t.v;
                  return (
                    <button key={t.v} type="button" onClick={() => onChange({ warrantyType: t.v })}
                      className={['text-left px-3 py-2.5 rounded-xl border-2 transition',
                        a ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'].join(' ')}>
                      <div className="flex items-center gap-1.5">
                        {a && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                        <span className="font-extrabold text-sm text-slate-900">{t.v}</span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500 mt-0.5">{t.hint}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Warranty Shuru" type="date" value={warranty.warrantyStartDate}
                onChange={(e) => onChange({ warrantyStartDate: e.target.value })} />
              <div>
                <Lbl>Warranty Khatam</Lbl>
                <input type="date" value={effectiveEnd}
                  onChange={(e) => onChange({ warrantyEndDate: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500 transition" />
                {computedEnd && !warranty.warrantyEndDate && (
                  <p className="mt-1.5 text-[11px] font-bold text-blue-700 inline-flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" /> {months} mahine ke hisab se khud nikala gaya
                  </p>
                )}
                {warranty.warrantyEndDate && computedEnd && warranty.warrantyEndDate !== computedEnd && (
                  <button type="button" onClick={() => onChange({ warrantyEndDate: '' })}
                    className="mt-1.5 text-[11px] font-extrabold text-slate-500 hover:text-blue-700 underline">
                    Wapas khud-ba-khud par le jayen
                  </button>
                )}
              </div>
            </div>

            {effectiveEnd && (
              <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-3 flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                <div className="text-sm font-bold text-emerald-900">
                  Warranty <b>{prettyDate(effectiveEnd)}</b> tak chalegi
                  <span className="font-semibold text-emerald-800/80"> — yehi tareekh receipt par chhapegi</span>
                </div>
              </div>
            )}

            <button type="button"
              onClick={() => onChange({ hasInternationalWarranty: !warranty.hasInternationalWarranty })}
              className={['w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left',
                warranty.hasInternationalWarranty ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'].join(' ')}>
              <div className={['h-5 w-5 rounded border-2 flex items-center justify-center shrink-0',
                warranty.hasInternationalWarranty ? 'bg-blue-600 border-blue-600' : 'border-slate-300'].join(' ')}>
                {warranty.hasInternationalWarranty && <Check className="h-3.5 w-3.5 text-white" />}
              </div>
              <Globe className="h-5 w-5 text-blue-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-sm text-slate-900">International Warranty</div>
                <div className="text-xs text-slate-500 font-semibold">Bahar mulk me bhi claim ho sakti hai</div>
              </div>
            </button>
          </>
        )}

        {noWarranty && (
          <div className="rounded-xl bg-white border-2 border-slate-200 p-3 flex items-start gap-2.5">
            <ShieldOff className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
            <div className="text-sm font-semibold text-slate-600">
              Is product par koi warranty nahi. Receipt par saaf likha aayega — baad me
              customer se behes nahi hogi.
              {condMeta && (condMeta.label === 'Used' || condMeta.label === 'For Parts') && (
                <> <b>{condMeta.emoji} {condMeta.label}</b> maal me ye aam baat hai.</>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ══ 2. SERIAL / IMEI ══ */}
      <section className={[
        'rounded-2xl border-2 p-5 space-y-3 transition',
        warranty.hasImei ? 'border-violet-300 bg-gradient-to-br from-violet-50 to-white' : 'border-slate-200 bg-white',
      ].join(' ')}>
        <Head icon={Barcode} n={2} t="IMEI Number"
          d="Sirf un cheezon me hota hai jo SIM ya cellular chalati hain" tone="violet" />

        <button type="button" onClick={() => onChange({ hasImei: !warranty.hasImei })}
          className={['w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left',
            warranty.hasImei ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-300'].join(' ')}>
          <div className={['h-5 w-5 rounded border-2 flex items-center justify-center shrink-0',
            warranty.hasImei ? 'bg-violet-600 border-violet-600' : 'border-slate-300'].join(' ')}>
            {warranty.hasImei && <Check className="h-3.5 w-3.5 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-sm text-slate-900">Is me IMEI number hota hai</div>
            <div className="text-xs text-slate-500 font-semibold">
              Smartwatch (LTE), 4G router, tablet, dashcam — jin me SIM lagti hai
            </div>
          </div>
        </button>

        <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 flex items-start gap-2.5">
          <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs font-semibold text-slate-600 leading-relaxed">
            <b>Farq samajh lein:</b> <b>Serial number</b> har mehngi cheez par hota hai (laptop,
            camera, drone) — wo agle step me daalte hain. <b>IMEI</b> sirf un me hota hai jo
            mobile network par chalti hain.
            {serialSuggested && catMeta && (
              <> <span className="text-violet-700 font-extrabold">
                {catMeta.emoji} {catMeta.label} me serial rakhna behtar hota hai — agle step me daal dein.
              </span></>
            )}
          </div>
        </div>
      </section>

      {/* ══ 3. BOX CONTENTS ══ */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Package} n={3} t="Dabbe Me Kya Kya Hai"
          d="Receipt par chhapta hai — wapsi ke waqt jhagra nahi hota" tone="amber" />

        {BOX_GROUPS.map((g) => (
          <div key={g.label}>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">
              {g.emoji} {g.label}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {g.items.map((item) => {
                const added = warranty.boxContents?.includes(item);
                return (
                  <button key={item} type="button"
                    onClick={() => (added ? removeBoxItem(item) : addBoxItem(item))}
                    className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition inline-flex items-center gap-1',
                      added ? 'border-emerald-500 bg-emerald-500 text-white shadow'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'].join(' ')}>
                    {added ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />} {item}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="pt-2 border-t-2 border-slate-100">
          <Lbl>Ya apni cheez likhein</Lbl>
          <div className="flex gap-2">
            <input value={newItem} onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBoxItem(newItem); } }}
              placeholder="jaise: Extra charger head"
              className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500 transition" />
            <button type="button" onClick={() => addBoxItem(newItem)} disabled={!newItem.trim()}
              className="h-11 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50 transition">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          {customItems.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {customItems.map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 border-2 border-amber-300 text-xs font-extrabold text-amber-800">
                  {item}
                  <button type="button" onClick={() => removeBoxItem(item)} className="hover:text-rose-700">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-slate-100">
          <Tog checked={warranty.hasManual} onChange={(v: boolean) => onChange({ hasManual: v })}
            emoji="📖" label="User Manual" />
          <Tog checked={warranty.hasWarrantyCard} onChange={(v: boolean) => onChange({ hasWarrantyCard: v })}
            emoji="📄" label="Warranty Card" />
        </div>
      </section>

      {/* ══ LIVE PREVIEW — receipt par kya aayega ══ */}
      <section className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0">
            <Receipt className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Customer Ki Receipt Par</h3>
            <p className="text-[11px] font-semibold text-slate-500">Aise nazar aayega</p>
          </div>
        </div>

        <div className="rounded-xl bg-white border-2 border-slate-300 p-4 font-mono text-xs text-slate-800 space-y-1.5">
          <div className="flex justify-between border-b border-dashed border-slate-300 pb-1.5">
            <span className="font-extrabold">🛡️ WARRANTY</span>
            <span className="font-extrabold">
              {noWarranty ? 'KOI NAHI' : effectiveEnd ? prettyDate(effectiveEnd) : `${months} mahine`}
            </span>
          </div>
          {!noWarranty && warranty.warrantyType && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Type</span>
              <span>{warranty.warrantyType}{warranty.hasInternationalWarranty ? ' + International' : ''}</span>
            </div>
          )}
          {(warranty.boxContents ?? []).length > 0 && (
            <div className="pt-1.5 border-t border-dashed border-slate-300">
              <div className="text-slate-500 text-[11px] mb-0.5">Dabbe me:</div>
              <div className="text-[11px] leading-relaxed">{(warranty.boxContents ?? []).join(' · ')}</div>
            </div>
          )}
          {(warranty.boxContents ?? []).length === 0 && (
            <div className="text-[11px] text-slate-400 italic">Dabbe ki cheezein abhi nahi chuni</div>
          )}
        </div>
      </section>

      {/* ── Tip ── */}
      <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm font-semibold text-amber-900">
          <b>Mashwara:</b> Warranty ki tareekh saaf likhne se claim ke waqt jhagra nahi hota.
          Stock Report page par aap ko wo units bhi nazar aayenge jinki warranty
          <b> 30 din me khatam</b> ho rahi hai — unhe pehle bech dena chahiye.
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function Head({ icon: Icon, n, t, d, tone = 'slate' }: any) {
  const g: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    blue: 'from-blue-500 to-cyan-700',
    violet: 'from-violet-500 to-purple-700',
    amber: 'from-amber-500 to-orange-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
      <div className={['h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md bg-gradient-to-br shrink-0', g[tone]].join(' ')}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h3 className="font-extrabold text-slate-900 text-base leading-tight">
          <span className="text-slate-400">{n}.</span> {t}
        </h3>
        <p className="text-xs text-slate-500 font-semibold">{d}</p>
      </div>
    </div>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider mb-1.5 text-slate-600">{children}</label>;
}

function Tog({ checked, onChange, emoji, label }: any) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={['flex items-center gap-2 p-2.5 rounded-xl border-2 transition text-left',
        checked ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-amber-300'].join(' ')}>
      <div className={['h-4 w-4 rounded border-2 flex items-center justify-center shrink-0',
        checked ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'].join(' ')}>
        {checked && <Check className="h-3 w-3 text-white" />}
      </div>
      <span className="text-xs font-extrabold text-slate-700">{emoji} {label}</span>
    </button>
  );
}
