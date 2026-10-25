/**
 * Settings → Counter & POS → POS counter: the shop's default counter layout
 * and which parts the counter shows. Each user can still pick their own
 * layout and density on their counter (⚙️ on the POS screen).
 *
 * Saved through PATCH /settings/pos-counter (needs settings permission).
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bell, Image, LayoutGrid, LayoutTemplate, ListOrdered, Package, Pencil, Percent, Printer, Repeat, Rows3, StickyNote, Tag, Truck,
  UserCheck, Zap,
} from 'lucide-react';
import { PosLayoutPicker } from '@modules/pos/components/PosLayoutPreview';
import { normalizePosCounter, type PosCounterConfig } from '@modules/pos/lib/posCounterConfig';
import { settingsApi } from '../api/settings.api';
import { ChoiceGroup, Divider, Field, SectionCard, StatPill, Toggle } from '../components/UI';

type BoolKey = { [K in keyof PosCounterConfig]: PosCounterConfig[K] extends boolean ? K : never }[keyof PosCounterConfig];

const TOGGLES: Array<{ key: BoolKey; label: string; desc: string; icon: typeof Image }> = [
  { key: 'showImages', label: 'Products ki tasveerein', desc: 'Band karein to cards aur bill me sirf naam — tez aur saaf', icon: Image },
  { key: 'showCategories', label: 'Categories ki patti', desc: 'Search ke neeche category chips', icon: LayoutGrid },
  { key: 'showQuickKeys', label: 'Quick keys', desc: 'Quick keys ka tab aur patti', icon: Zap },
  { key: 'recentItems', label: 'Aksar bikne wali cheezein', desc: 'Is counter par sab se zyada bikne wali 9 cheezein (Alt 1–9)', icon: Repeat },
  { key: 'showStock', label: 'Tiles par stock', desc: 'Har card par kitna baqi hai', icon: Package },
  { key: 'showReceiver', label: 'Lene wala (maal kis ne liya)', desc: 'Customer chunne par chhota "+ Lene wala" button', icon: UserCheck },
  { key: 'showDelivery', label: 'Delivery', desc: 'Bill par Delivery ka button', icon: Truck },
  { key: 'showDiscount', label: 'Discount ka button', desc: 'Band ho to counter par Discount nahi dikhta (F4 bhi band)', icon: Tag },
  { key: 'lineNotes', label: 'Har line ka note', desc: 'Cashier kisi cheez par note likh sake (N key)', icon: StickyNote },
  { key: 'priceEdit', label: 'Cashier rate badal sake', desc: 'Band ho to sirf "Had se zyada Discount" wale staff rate badal sakte hain', icon: Pencil },
  { key: 'changeDue', label: 'Wapas dene wali raqam', desc: 'Sale ke baad khaali bill me pichhle bill ka change dikhe', icon: ListOrdered },
  { key: 'sounds', label: 'Awaaz', desc: 'Cheez add hone par beep, ghalti par alag awaaz', icon: Bell },
  { key: 'autoPrint', label: 'Bill khud print ho', desc: 'Naye counters ke liye; har counter ⚙️ se apna chun sakta hai', icon: Printer },
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
      toast.success('POS counter save ho gaya');
    },
    onError: (e: { response?: { data?: { message?: string | string[] } } }) => {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'Save nahi hua');
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

  return (
    <SectionCard title="POS counter" desc="Counter ki shakal aur us par kya dikhe — har cashier apna layout ⚙️ se badal sakta hai" icon={LayoutTemplate} color="blue"
      badge={<StatPill label="Layout" value={draft.layout === 'cartfocus' ? 'Bill bara' : draft.layout[0].toUpperCase() + draft.layout.slice(1)} tone="blue" />}>
      <Field label="Dukaan ka layout" hint="Naye aur purane sab counters isi se khulte hain, jab tak cashier apna na chune.">
        <PosLayoutPicker value={draft.layout} onChange={(v) => v && set('layout', v)} disabled={!canEdit} />
      </Field>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Bill ki lines" hint="Patli lines me 768px screen par bhi 10 cheezein nazar aati hain.">
          <ChoiceGroup value={draft.density} onChange={(v) => set('density', v as PosCounterConfig['density'])} columns={2}
            options={[{ value: 'compact', label: 'Patli' }, { value: 'comfortable', label: 'Khuli' }]} />
        </Field>
        <Field label="Jaldi Discount buttons" hint="Bill par ek click wale Discount; cashier ko sirf apni had tak wale dikhte hain.">
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
      <Divider label={`Counter par kya dikhe (${onCount}/${TOGGLES.length})`} />
      <div className="grid gap-x-6 md:grid-cols-2">
        {TOGGLES.map((t) => (
          <Toggle key={t.key} checked={draft[t.key]} onChange={(v) => set(t.key, v)} label={t.label} desc={t.desc} icon={t.icon} disabled={!canEdit} />
        ))}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        <Rows3 className="h-3.5 w-3.5" /> &ldquo;Har bill par customer zaroori&rdquo; aur &ldquo;pehle se chuna payment&rdquo; neeche hain.
      </p>
    </SectionCard>
  );
}
