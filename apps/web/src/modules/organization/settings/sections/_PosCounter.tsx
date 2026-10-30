/**
 * Settings → Counter & POS → POS counter: the shop's default counter layout
 * and which parts the counter shows. Each user can still pick their own
 * layout and density on their counter (⚙️ on the POS screen).
 *
 * Price tiers (Retail / Wholesale / Credit) are set here too: on or off,
 * which tiers the counter offers, the default, and the automatic rules.
 *
 * Saved through PATCH /settings/pos-counter (needs settings permission).
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BookOpen, Bell, Image, Layers, LayoutGrid, Receipt, SplitSquareHorizontal, Users, LayoutTemplate, ListOrdered, Package, Pencil, Percent, Printer, Repeat, Rows3, StickyNote, Tag, Truck,
  UserCheck, Zap,
} from 'lucide-react';
import { PosLayoutPicker } from '@modules/pos/components/PosLayoutPreview';
import { normalizePosCounter, type PosCounterConfig } from '@modules/pos/lib/posCounterConfig';
import { settingsApi } from '../api/settings.api';
import { ChoiceGroup, Divider, Field, SectionCard, Toggle } from '../components/SettingsBlocks';
import { Badge } from '@/design-system/components';
import { PRICE_TIERS, PRICE_TIER_LABEL, type PriceTier } from '@core/lib/priceTiers';
import { t as tr } from '@core/i18n';

type BoolKey = { [K in keyof PosCounterConfig]: PosCounterConfig[K] extends boolean ? K : never }[keyof PosCounterConfig];

const TOGGLES: Array<{ key: BoolKey; label: string; desc: string; icon: typeof Image }> = [
  { key: 'showImages', label: tr('Products ki tasveerein'), desc: tr('Band karein to cards aur bill me sirf naam — tez aur saaf'), icon: Image },
  { key: 'showCategories', label: tr('Categories ki patti'), desc: tr('Search ke neeche category chips'), icon: LayoutGrid },
  { key: 'showQuickKeys', label: tr('Quick keys'), desc: tr('Quick keys ka tab aur patti'), icon: Zap },
  { key: 'recentItems', label: tr('Aksar bikne wali cheezein'), desc: tr('Is counter par sab se zyada bikne wali 9 cheezein (Alt 1–9)'), icon: Repeat },
  { key: 'showStock', label: tr('Tiles par stock'), desc: tr('Har card par kitna baqi hai'), icon: Package },
  { key: 'showReceiver', label: tr('Lene wala (maal kis ne liya)'), desc: tr('Customer chunne par chhota "+ Lene wala" button'), icon: UserCheck },
  { key: 'showDelivery', label: tr('Delivery'), desc: tr('Bill par Delivery ka button'), icon: Truck },
  { key: 'showDiscount', label: tr('Discount ka button'), desc: tr('Band ho to counter par Discount nahi dikhta (F4 bhi band)'), icon: Tag },
  { key: 'lineNotes', label: tr('Har line ka note'), desc: tr('Cashier kisi cheez par note likh sake (N key)'), icon: StickyNote },
  { key: 'priceEdit', label: tr('Cashier rate badal sake'), desc: tr('Band ho to sirf "Had se zyada Discount" wale staff rate badal sakte hain'), icon: Pencil },
  { key: 'changeDue', label: tr('Wapas dene wali raqam'), desc: tr('Sale ke baad khaali bill me pichhle bill ka change dikhe'), icon: ListOrdered },
  { key: 'sounds', label: tr('Awaaz'), desc: tr('Cheez add hone par beep, ghalti par alag awaaz'), icon: Bell },
  { key: 'autoPrint', label: tr('Bill khud print ho'), desc: tr('Naye counters ke liye; har counter ⚙️ se apna chun sakta hai'), icon: Printer },
];

const QUICK_PCT = [2, 5, 10, 15, 20, 25];

export function PosCounterSettings({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data: rules } = useQuery({ queryKey: ['settings', 'counter'], queryFn: () => settingsApi.counter(), staleTime: 5 * 60_000 });
  const [draft, setDraft] = useState<PosCounterConfig>(() => normalizePosCounter(rules?.posCounter));
  const pending = useRef<Partial<PosCounterConfig>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (!Object.keys(pending.current).length) setDraft(normalizePosCounter(rules?.posCounter)); }, [rules]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const save = useMutation({
    mutationFn: (patch: Partial<PosCounterConfig>) => settingsApi.updatePosCounter(patch),
    onSuccess: (cfg) => {
      qc.setQueryData(['settings', 'counter'], (old: object | null | undefined) => (old ? { ...old, posCounter: cfg } : old));
      toast.success(tr('POS counter save ho gaya'));
    },
    onError: (e: { response?: { data?: { message?: string | string[] } } }) => {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || tr('Save nahi hua'));
    },
  });

  const set = <K extends keyof PosCounterConfig>(key: K, value: PosCounterConfig[K]) => {
    if (!canEdit) return;
    setDraft((d) => ({ ...d, [key]: value }));
    pending.current = { ...pending.current, [key]: value };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { const p = pending.current; pending.current = {}; save.mutate(p); }, 600);
  };
  const togglePct = (p: number) => {
    const has = draft.quickDiscounts.includes(p);
    set('quickDiscounts', (has ? draft.quickDiscounts.filter((x) => x !== p) : [...draft.quickDiscounts, p]).sort((a, b) => a - b));
  };
  const onCount = TOGGLES.filter((t) => draft[t.key]).length;
  const toggleTier = (t: PriceTier) => {
    if (t === draft.defaultPriceTier) { toast.info(tr('Default price tier band nahi ho sakti — pehle default badlein')); return; }
    const has = draft.priceTierList.includes(t);
    set('priceTierList', PRICE_TIERS.filter((x) => (x === t ? !has : draft.priceTierList.includes(x))));
  };

  return (
    <SectionCard title={tr('POS counter')} desc={tr('Counter ki shakal aur us par kya dikhe — har cashier apna layout ⚙️ se badal sakta hai')} icon={LayoutTemplate} color="blue"
      badge={<Badge size="xs" variant="info"><span className="opacity-70">{tr('Layout')}</span>{draft.layout === 'cartfocus' ? tr('Bill bara') : draft.layout[0].toUpperCase() + draft.layout.slice(1)}</Badge>}>
      <Field label={tr('Dukaan ka layout')} hint={tr('Naye aur purane sab counters isi se khulte hain, jab tak cashier apna na chune.')}>
        <PosLayoutPicker value={draft.layout} onChange={(v) => v && set('layout', v)} disabled={!canEdit} />
      </Field>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label={tr('Bill ki lines')} hint={tr('Patli lines me 768px screen par bhi 10 cheezein nazar aati hain.')}>
          <ChoiceGroup value={draft.density} onChange={(v) => set('density', v as PosCounterConfig['density'])} columns={2}
            options={[{ value: 'compact', label: tr('Patli') }, { value: 'comfortable', label: tr('Khuli') }]} />
        </Field>
        <Field label={tr('Jaldi Discount buttons')} hint={tr('Bill par ek click wale Discount; cashier ko sirf apni had tak wale dikhte hain.')}>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PCT.map((p) => {
              const on = draft.quickDiscounts.includes(p);
              return (
                <button key={p} type="button" disabled={!canEdit} onClick={() => togglePct(p)} aria-pressed={on}
                  className={on ? 'inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-brand-fg' : 'inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'}>
                  <Percent className="h-3 w-3" />{p}
                </button>
              );
            })}
          </div>
        </Field>
      </div>
      <Divider label={tr('Counter par kya dikhe ({{onCount}}/{{count}})', { onCount, count: TOGGLES.length })} />
      <div className="grid gap-x-6 md:grid-cols-2">
        {TOGGLES.map((t) => (
          <Toggle key={t.key} checked={draft[t.key]} onChange={(v) => set(t.key, v)} label={t.label} desc={t.desc} icon={t.icon} disabled={!canEdit} />
        ))}
      </div>

      <Divider label={tr('Price tiers — Retail / Wholesale / Credit')} />
      <Toggle checked={draft.priceTiers} onChange={(v) => set('priceTiers', v)} icon={Layers} disabled={!canEdit}
        label={tr('Price tiers on karein')}
        desc={tr('Ek hi cheez Retail, Wholesale aur Credit (udhaar) price par. Band ho to counter pehle jaisa retail price par chalta hai.')} />
      {draft.priceTiers && (
        <div className="mt-2 space-y-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr('Counter par kaun si prices')} hint={tr('Jo band hai wo counter par nahi dikhti. Default hamesha on rehti hai.')}>
              <div className="flex flex-wrap gap-1.5">
                {PRICE_TIERS.map((t) => {
                  const on = draft.priceTierList.includes(t);
                  return (
                    <button key={t} type="button" disabled={!canEdit} onClick={() => toggleTier(t)} aria-pressed={on}
                      className={on ? 'inline-flex items-center rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-brand-fg' : 'inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'}>
                      {PRICE_TIER_LABEL[t]}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label={tr('Har naya bill kis price par')} hint={tr('Bill ke baad counter wapas isi par aata hai.')}>
              <ChoiceGroup value={draft.defaultPriceTier} columns={3}
                onChange={(v) => {
                  const t = v as PriceTier;
                  set('defaultPriceTier', t);
                  if (!draft.priceTierList.includes(t)) set('priceTierList', PRICE_TIERS.filter((x) => x === t || draft.priceTierList.includes(x)));
                }}
                options={PRICE_TIERS.map((t) => ({ value: t, label: PRICE_TIER_LABEL[t] }))} />
            </Field>
          </div>
          <div className="grid gap-x-6 md:grid-cols-2">
            <Toggle checked={draft.tierCreditOnUdhaar} onChange={(v) => set('tierCreditOnUdhaar', v)} icon={BookOpen} disabled={!canEdit}
              label={tr('Udhaar par Credit price')} desc={tr('Checkout me Udhaar ya Kuch paisa chunte hi bill Credit price par — total pehle hi badal jata hai')} />
            <Toggle checked={draft.tierFromCustomer} onChange={(v) => set('tierFromCustomer', v)} icon={Users} disabled={!canEdit}
              label={tr('Customer ki apni price')} desc={tr('Customer ke form me Default price ho (jaise Wholesale) to usay chunte hi wohi lagti hai')} />
            <Toggle checked={draft.tierLineOverride} onChange={(v) => set('tierLineOverride', v)} icon={SplitSquareHorizontal} disabled={!canEdit}
              label={tr('Ek line alag price par')} desc={tr('Bill ki kisi ek line par doosri price (line par chip ya T key)')} />
            <Toggle checked={draft.tierOnReceipt} onChange={(v) => set('tierOnReceipt', v)} icon={Receipt} disabled={!canEdit}
              label={tr('Bill par price tier chhape')} desc={tr('Raseed par likha aaye ke Retail, Wholesale ya Credit price lagi')} />
          </div>
          <p className="text-xs text-slate-500">
            {tr('Hath se Wholesale / Credit chunne ke liye staff ko “Price tier badalna” permission chahiye (Owner aur Manager ke paas pehle se hai). Wholesale aur Credit price Discount nahi ginti.')}
          </p>
        </div>
      )}

      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        <Rows3 className="h-3.5 w-3.5" /> {' '}{tr('“Har bill par customer zaroori” aur “pehle se chuna payment” neeche hain.')}
      </p>
    </SectionCard>
  );
}
