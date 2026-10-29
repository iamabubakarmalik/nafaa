/**
 * Trade schemes (Distribution → Schemes): free goods (10+1), percent off from
 * a quantity, rupees off per pack, and slabs. Each can be limited to items,
 * brands, categories and price lists, run between dates, and be tagged with
 * the company (principal) that pays for it. One scheme applies per line: the
 * one worth most. The test box shows what a scheme gives on a real order.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgePercent, CalendarRange, Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, EmptyState, PageHero, PageShell, Segmented, Skeleton, confirmDialog, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { distError, distSetupApi, type SchemeRow } from '../../api/distribution.api';
import { DistributionGate } from '../../components/DistributionGate';
import { dayLabel } from '../../lib/meta';
import { SCHEMES_KEY } from '../shared';
import { SCHEME_TYPE, schemeRuleText } from './schemeMeta';
import { SchemeEditor } from './SchemeEditor';
import { SchemePreviewBox } from './SchemePreviewBox';

type Filter = 'live' | 'off' | 'all';

export default function SchemesPage() {
  return <DistributionGate><PageShell><SchemesBody /></PageShell></DistributionGate>;
}

function SchemesBody() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: SCHEMES_KEY, queryFn: () => distSetupApi.schemes() });
  const [filter, setFilter] = useState<Filter>('live');
  const [edit, setEdit] = useState<SchemeRow | 'new' | null>(null);
  const all = q.data ?? [];
  const shown = useMemo(() => all.filter((s) => (filter === 'all' ? true : filter === 'live' ? s.live : !s.live)), [all, filter]);

  const del = useMutation({
    mutationFn: (id: string) => distSetupApi.deleteScheme(id),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: SCHEMES_KEY }); toast.success(r.deleted ? 'Scheme mita di' : 'Scheme band kar di (orders me lag chuki thi)'); },
    onError: (e) => toast.error(distError(e)),
  });

  const live = all.filter((s) => s.live);
  const first = live.find((s) => s.productIds.length) ?? null;
  const sample = first ? { id: first.productIds[0], name: first.productNames[0] ?? 'Item' } : null;
  return (
    <>
      <PageHero
        title="Schemes"
        chip={<><BadgePercent />Trade offers</>}
        meta="10+1, % Discount, Rs per pack aur slab — booker app, order desk aur POS par khud lagti hain"
        loading={q.isLoading}
        stats={[
          { label: 'Chal rahi', value: String(live.length) },
          { label: 'Band / khatam', value: String(all.length - live.length) },
          { label: 'Company claim wali', value: String(all.filter((s) => s.isClaimable).length) },
        ]}
        actions={<button type="button" className={heroPrimaryButton} onClick={() => setEdit('new')}><Plus className="h-4 w-4" />Nayi scheme</button>}
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-3">
          <Segmented label="Dikhayein" value={filter} onChange={setFilter}
            items={[{ value: 'live', label: 'Chal rahi', count: live.length }, { value: 'off', label: 'Band', count: all.length - live.length }, { value: 'all', label: 'Sab', count: all.length }]} />

          {q.isLoading ? <Skeleton className="h-72 rounded-2xl" /> : !shown.length ? (
            <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <EmptyState icon={<BadgePercent className="h-6 w-6" />} title={all.length ? 'Is list me koi scheme nahi' : 'Abhi koi scheme nahi'}
                description="Misal: Banaspati Ghee par 10 Carton lein, 1 Carton free. Ya 2 Carton se 3% Discount."
                action={<button type="button" onClick={() => setEdit('new')} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-brand-fg hover:bg-brand-700"><Plus className="h-4 w-4" />Scheme banayein</button>} />
            </div>
          ) : (
            <ul className="grid gap-3 2xl:grid-cols-2">
              {shown.map((s) => {
                const t = SCHEME_TYPE[s.type];
                const scope = [
                  s.productIds.length ? (s.productNames.filter(Boolean).slice(0, 3).join(', ') + (s.productIds.length > 3 ? ` +${s.productIds.length - 3}` : '')) : '',
                  s.brandIds.length ? `${s.brandIds.length} brand` : '', s.categoryIds.length ? `${s.categoryIds.length} category` : '',
                ].filter(Boolean).join(' · ') || 'Sab items';
                return (
                  <li key={s.id} className={cn('flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80', !s.live && 'opacity-75')}>
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${t.color}17`, color: t.color }}><t.icon className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">
                          {s.name}{' '}
                          <Badge size="xs" variant={s.live ? 'success' : 'default'} className="ml-1 align-middle">{s.live ? 'Chal rahi' : s.isActive ? 'Waqt se bahar' : 'Band'}</Badge>
                        </p>
                        <p className="mt-0.5 text-[0.8125rem] font-medium" style={{ color: t.color }}>{schemeRuleText(s, s.freeProductName)}</p>
                      </div>
                      <div className="flex shrink-0">
                        <button type="button" aria-label="Badlein" onClick={() => setEdit(s)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                        <button type="button" aria-label="Mitayein" onClick={async () => {
                          if (await confirmDialog({ title: `${s.name} mitayein?`, text: 'Jin orders me lag chuki hai un ki wajah se scheme sirf band hogi.', yes: 'Mitayein', danger: true })) del.mutate(s.id);
                        }} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-1 gap-1.5 border-t border-slate-100 pt-3 text-[0.75rem] text-slate-600 sm:grid-cols-2">
                      <div className="min-w-0 sm:col-span-2"><dt className="sr-only">Items</dt><dd className="truncate" title={scope}><b className="text-slate-800">Items:</b> {scope}</dd></div>
                      <div className="flex items-center gap-1"><CalendarRange className="h-3.5 w-3.5 text-slate-400" />{s.startsAt || s.endsAt ? `${s.startsAt ? dayLabel(s.startsAt) : 'Shuru se'} – ${s.endsAt ? dayLabel(s.endsAt) : 'jab tak band na ho'}` : 'Hamesha'}</div>
                      <div className="flex min-w-0 items-center gap-1"><Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{s.supplierName ?? 'Apni scheme'}{s.isClaimable ? ' · claim' : ''}</span></div>
                      {s.priceListIds.length > 0 && <div className="sm:col-span-2">Sirf {s.priceListIds.length} price list wale customers</div>}
                    </dl>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="xl:sticky xl:top-4">
          <SchemePreviewBox title="Test karein" hint="Koi item aur qty likhein — dekhein kaun si chalti scheme lagti hai." initialProduct={sample} />
        </div>
      </div>

      {edit && <SchemeEditor scheme={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </>
  );
}
