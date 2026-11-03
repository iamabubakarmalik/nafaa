/**
 * Default look of the mobile app. These are the mobile-only fields of the
 * platform appearance layer (the same layer as Platform design), so each
 * business and user can still override them in the app. Colors, mode and
 * text size come from Platform design and apply to web and mobile alike.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowRight, Home, LayoutGrid, RotateCcw, Save, ShoppingCart, Package, Menu, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { adminAppearanceApi, type PlatformAppearance } from '@/api/admin-appearance.api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { Card, MobileHero, Toggle } from '../components/MobileUi';

type MobileKeys = Pick<PlatformAppearance, 'mobileTabBar' | 'mobileStartScreen' | 'mobilePosGrid' | 'mobileHomeWidgets' | 'mobileAnimations' | 'mobileHaptics'>;

const MOBILE_KEYS = ['mobileTabBar', 'mobileStartScreen', 'mobilePosGrid', 'mobileHomeWidgets', 'mobileAnimations', 'mobileHaptics'] as const;

const WIDGETS: { id: string; label: string }[] = [
  { id: 'sales-today', label: "Today's sales" },
  { id: 'quick-actions', label: 'Quick actions' },
  { id: 'cash-register', label: 'Cash register' },
  { id: 'low-stock', label: 'Low stock' },
  { id: 'khata-due', label: 'Customer credit due' },
  { id: 'top-products', label: 'Top products' },
  { id: 'recent-sales', label: 'Recent sales' },
  { id: 'online-orders', label: 'Online orders' },
  { id: 'ai-insights', label: 'Nafaa AI tips' },
  { id: 'sales-trend', label: 'Sales trend' },
  { id: 'peak-hours', label: 'Peak hours' },
  { id: 'payment-mix', label: 'Payment mix' },
  { id: 'profit-loss', label: 'Profit and loss' },
  { id: 'money-map', label: 'Where the money is' },
  { id: 'category-mix', label: 'Sales by category' },
  { id: 'staff-sales', label: 'Staff sales' },
  { id: 'weekday', label: 'Weekdays' },
  { id: 'top-customers', label: 'Top customers' },
  { id: 'monthly', label: '6-month comparison' },
  { id: 'expenses-month', label: 'Expenses by category' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'slow-movers', label: 'Slow movers' },
  { id: 'day-report', label: 'Day report' },
  { id: 'kpis', label: 'Month numbers' },
];
/** The blocks shown when nothing is set; the extra widgets stay off until chosen. */
const DEFAULT_WIDGETS = WIDGETS.slice(0, 9).map((w) => w.id);

function Choice<T extends string>({ label, help, value, options, onChange }: {
  label: string; help: string; value: T | undefined; options: [T, string][]; onChange: (v: T | undefined) => void;
}) {
  return (
    <div className="py-3">
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      <div className="text-xs text-slate-500">{help}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange(undefined)}
          className={cn('rounded-full border px-3 py-1 text-xs font-semibold', value === undefined ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 text-slate-600')}>
          Built-in
        </button>
        {options.map(([v, l]) => (
          <button key={v} type="button" onClick={() => onChange(v)}
            className={cn('rounded-full border px-3 py-1 text-xs font-semibold', value === v ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Rough phone preview of the chosen tab bar, start screen and grid size. */
function PhonePreview({ v }: { v: MobileKeys }) {
  const tab = v.mobileTabBar ?? 'labels';
  const grid = v.mobilePosGrid ?? 'medium';
  const cols = grid === 'small' ? 4 : grid === 'large' ? 2 : 3;
  const pos = v.mobileStartScreen === 'pos';
  const widgets = (v.mobileHomeWidgets ?? DEFAULT_WIDGETS).slice(0, 4);
  const tabs = [{ i: Home, l: 'Home' }, { i: ShoppingCart, l: 'Sell' }, { i: Package, l: 'Products' }, { i: BarChart3, l: 'Reports' }, { i: Menu, l: 'More' }];
  return (
    <div className="mx-auto w-[220px] rounded-[2rem] border-[6px] border-slate-900 bg-slate-50 p-2 shadow-xl">
      <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-slate-900" />
      <div className="h-[340px] overflow-hidden rounded-2xl bg-white p-2">
        <div className="mb-2 text-[10px] font-bold text-slate-800">{pos ? 'Sell' : 'Home'}</div>
        {pos ? (
          grid === 'list' ? (
            <div className="space-y-1">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-6 rounded-md bg-slate-100" />)}</div>
          ) : (
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {Array.from({ length: cols * 4 }).map((_, i) => <div key={i} className="aspect-square rounded-md bg-teal-100" />)}
            </div>
          )
        ) : (
          <div className="space-y-1.5">
            {widgets.map((w) => (
              <div key={w} className="rounded-lg bg-slate-100 px-2 py-2 text-[9px] font-semibold text-slate-600">{WIDGETS.find((x) => x.id === w)?.label}</div>
            ))}
          </div>
        )}
      </div>
      <div className={cn('mt-2 flex items-center justify-around px-1 py-1.5',
        tab === 'floating' ? 'mx-2 rounded-full bg-slate-900 text-white shadow-lg' : 'rounded-xl bg-white text-slate-600')}>
        {tabs.map(({ i: Icon, l }, idx) => (
          <div key={l} className={cn('flex flex-col items-center', (pos ? idx === 1 : idx === 0) && (tab === 'floating' ? 'text-teal-300' : 'text-teal-600'))}>
            <Icon className="h-3.5 w-3.5" />
            {tab === 'labels' && <span className="text-[7px]">{l}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MobileAppearancePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-appearance'], queryFn: adminAppearanceApi.get });
  const [draft, setDraft] = useState<PlatformAppearance>({});
  useEffect(() => { if (data !== undefined) setDraft(data ?? {}); }, [data]);

  const save = useMutation({
    // The whole platform layer is saved so the web fields stay as they are.
    // Mobile fields set back to built-in are sent as null; the server keeps any it is not told about.
    mutationFn: () => {
      const payload: Record<string, unknown> = { ...draft };
      for (const key of MOBILE_KEYS) if (!(key in payload)) payload[key] = null;
      return adminAppearanceApi.save(payload as PlatformAppearance);
    },
    onSuccess: (saved) => { qc.setQueryData(['admin-appearance'], saved); toast.success('Mobile look saved. Apps pick it up on next start.'); },
    onError: () => toast.error('Could not save'),
  });

  const set = <K extends keyof MobileKeys>(key: K, value: MobileKeys[K] | undefined) =>
    setDraft((d) => {
      const next = { ...d };
      if (value === undefined) delete next[key]; else next[key] = value;
      return next;
    });

  const widgets = draft.mobileHomeWidgets ?? DEFAULT_WIDGETS;
  const hidden = WIDGETS.filter((w) => !widgets.includes(w.id));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...widgets];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set('mobileHomeWidgets', next);
  };
  const mobileOnly = (o: PlatformAppearance) => JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k]) => k.startsWith('mobile')).sort()));
  const dirty = mobileOnly(draft) !== mobileOnly(data ?? {});

  return (
    <div className="space-y-6">
      <MobileHero title="Appearance defaults" subtitle="The starting look of the mobile app. Owners and users can change it for themselves in the app. Colors, dark mode and text size come from Platform design.">
        <Button variant="secondary" onClick={() => setDraft((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith('mobile'))))}>
          <RotateCcw className="h-4 w-4" />Built-in defaults
        </Button>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}><Save className="h-4 w-4" />Save</Button>
      </MobileHero>

      {isLoading ? <div className="h-64 animate-pulse rounded-3xl bg-slate-100" /> : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr_280px]">
          <Card title="Layout">
            <div className="divide-y divide-slate-100">
              <Choice label="Tab bar" help="Bottom navigation style" value={draft.mobileTabBar}
                options={[['labels', 'Icons + labels'], ['icons', 'Icons only'], ['floating', 'Floating']]} onChange={(v) => set('mobileTabBar', v)} />
              <Choice label="Opens on" help="First screen after sign-in" value={draft.mobileStartScreen}
                options={[['home', 'Home'], ['pos', 'Sell (POS)']]} onChange={(v) => set('mobileStartScreen', v)} />
              <Choice label="POS product grid" help="Size of product tiles on the sell screen" value={draft.mobilePosGrid}
                options={[['list', 'List'], ['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']]} onChange={(v) => set('mobilePosGrid', v)} />
              <div className="flex items-center justify-between gap-4 py-3">
                <div><div className="text-sm font-semibold text-slate-900">Animations</div><div className="text-xs text-slate-500">Screen transitions and the opening animation</div></div>
                <Toggle checked={draft.mobileAnimations ?? true} onChange={(v) => set('mobileAnimations', v ? undefined : false)} label="Animations" />
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <div><div className="text-sm font-semibold text-slate-900">Haptics</div><div className="text-xs text-slate-500">Small vibration on scan, add to cart and payment</div></div>
                <Toggle checked={draft.mobileHaptics ?? true} onChange={(v) => set('mobileHaptics', v ? undefined : false)} label="Haptics" />
              </div>
            </div>
            <Link to="/appearance" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900">Colors, mode and fonts in Platform design <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Card>

          <Card title="Home screen blocks" subtitle="Order of blocks on the home screen. Blocks a person has no permission for stay hidden."
            action={draft.mobileHomeWidgets ? <button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-900" onClick={() => set('mobileHomeWidgets', undefined)}>Reset</button> : undefined}>
            <div className="space-y-1.5">
              {widgets.map((id, i) => (
                <div key={id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <LayoutGrid className="h-4 w-4 text-slate-400" />
                  <span className="flex-1 text-sm font-medium text-slate-800">{WIDGETS.find((w) => w.id === id)?.label ?? id}</span>
                  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" aria-label="Move down" disabled={i === widgets.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" onClick={() => set('mobileHomeWidgets', widgets.filter((w) => w !== id))} className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600">Hide</button>
                </div>
              ))}
              {hidden.length > 0 && (
                <div className="pt-3">
                  <div className="mb-1.5 text-xs font-semibold text-slate-500">Hidden</div>
                  <div className="flex flex-wrap gap-2">
                    {hidden.map((w) => (
                      <button key={w.id} type="button" onClick={() => set('mobileHomeWidgets', [...widgets, w.id])}
                        className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-teal-500 hover:text-teal-700">+ {w.label}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <div className="lg:sticky lg:top-0 lg:self-start">
            <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</div>
            <PhonePreview v={draft} />
          </div>
        </div>
      )}
    </div>
  );
}
