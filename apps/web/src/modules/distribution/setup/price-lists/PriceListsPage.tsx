/**
 * Price lists (Distribution → Price lists). Each list is a set of rates for a
 * group of customers (retailers, key accounts, wholesalers). An item the list
 * does not name is priced by the list's rule: its base (retail, wholesale or
 * cost) plus or minus a percent. The left column picks a list; the right side
 * is its grid of item × pack rates with quick fill, Excel import and the
 * customers who buy on it.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Star, Tags, Users } from 'lucide-react';
import { EmptyState, PageHero, PageShell, Skeleton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { DIST_KEY, distError, distSetupApi, type PriceList, type SavePriceList } from '../../api/distribution.api';
import { DistributionGate } from '../../components/DistributionGate';
import { PRICE_LISTS_KEY } from '../shared';
import { PriceListEditor } from './PriceListEditor';
import { PriceListFormModal, ruleText } from './PriceListFormModal';

export default function PriceListsPage() {
  return (
    <DistributionGate>
      <PageShell><PriceListsBody /></PageShell>
    </DistributionGate>
  );
}

function PriceListsBody() {
  const qc = useQueryClient();
  const canManage = usePermission(PERMISSIONS.DISTRIBUTION_PRICELISTS_MANAGE);
  const [params, setParams] = useSearchParams();
  const listsQ = useQuery({ queryKey: PRICE_LISTS_KEY, queryFn: distSetupApi.priceLists });
  const lists = useMemo(() => [...(listsQ.data ?? [])].sort((a, b) => Number(b.isActive) - Number(a.isActive) || Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name)), [listsQ.data]);
  const [form, setForm] = useState<PriceList | 'new' | null>(null);

  const selectedId = params.get('list') ?? lists[0]?.id ?? '';
  const selected = lists.find((l) => l.id === selectedId) ?? lists[0];
  const pick = (id: string) => setParams((p) => { p.set('list', id); return p; }, { replace: true });
  useEffect(() => { if (!params.get('list') && lists[0]) pick(lists[0].id); }, [lists]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = useMutation({
    mutationFn: (body: SavePriceList) => distSetupApi.createPriceList(body),
    onSuccess: (l) => { qc.invalidateQueries({ queryKey: PRICE_LISTS_KEY }); setForm(null); pick(l.id); toast.success(`${l.name} ban gayi`); },
    onError: (e) => toast.error(distError(e, 'List nahi bani')),
  });
  const update = useMutation({
    mutationFn: (v: { id: string; body: Partial<SavePriceList> }) => distSetupApi.updatePriceList(v.id, v.body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [DIST_KEY] }); setForm(null); toast.success('Save ho gaya'); },
    onError: (e) => toast.error(distError(e, 'Save nahi hua')),
  });

  const totals = useMemo(() => ({
    customers: lists.reduce((s, l) => s + (l.customerCount ?? 0), 0),
    items: lists.reduce((s, l) => s + (l.itemCount ?? 0), 0),
    def: lists.find((l) => l.isDefault && l.isActive),
  }), [lists]);

  return (
    <>
      <PageHero
        title="Price lists"
        chip={<><Tags />Wholesale rates</>}
        meta="Har customer group ka apna rate — jo item list me nahi, us par list ka rule (base ± %) chalta hai"
        loading={listsQ.isLoading}
        stats={[
          { label: 'Lists', value: String(lists.length) },
          { label: 'Customers list par', value: String(totals.customers) },
          { label: 'Apne rates', value: String(totals.items), hint: 'baqi rule se' },
          { label: 'Default list', value: totals.def?.name ?? '—' },
        ]}
        actions={canManage ? <button type="button" className={heroPrimaryButton} onClick={() => setForm('new')}><Plus className="h-4 w-4" />Nayi list</button> : undefined}
      />

      {listsQ.isLoading ? (
        <div className="space-y-3"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-[30rem] rounded-2xl" /></div>
      ) : !lists.length ? (
        <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <EmptyState icon={<Tags className="h-6 w-6" />} title="Abhi koi price list nahi"
            description="Misal: 'Retailers' list Wholesale par, 'Key accounts' list Wholesale −3% par. Customer ko list do — POS aur booker app wohi rate lagayenge."
            action={canManage ? <button type="button" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-brand-fg hover:bg-brand-700" onClick={() => setForm('new')}><Plus className="h-4 w-4" />Pehli list banayein</button> : undefined} />
        </div>
      ) : (
        <div className="space-y-3">
          <nav aria-label="Price lists" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible">
            {lists.map((l) => (
              <button key={l.id} type="button" onClick={() => pick(l.id)} aria-current={l.id === selected?.id}
                className={cn('min-w-[13.5rem] shrink-0 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 transition lg:min-w-0 lg:shrink',
                  l.id === selected?.id ? 'ring-2 ring-brand-500' : 'ring-slate-200/80 hover:ring-slate-300', !l.isActive && 'opacity-70')}>
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[0.9375rem] font-semibold text-slate-900">{l.name}</span>
                  {l.code && <span className="shrink-0 rounded bg-slate-100 px-1.5 text-[0.6875rem] font-semibold text-slate-600">{l.code}</span>}
                  {l.isDefault && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-label="Default" />}
                </div>
                <p className="mt-0.5 truncate text-[0.75rem] text-slate-500">{ruleText(l)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.6875rem] font-semibold">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">{l.itemCount ?? 0} rates</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600"><Users className="h-3 w-3" />{l.customerCount ?? 0}</span>
                  {!l.isActive && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">Band</span>}
                </div>
              </button>
            ))}
          </nav>
          {selected && <PriceListEditor key={selected.id} list={selected} canManage={canManage} onEdit={() => setForm(selected)} />}
        </div>
      )}

      {form && (
        <PriceListFormModal
          list={form === 'new' ? null : form}
          saving={create.isPending || update.isPending}
          onClose={() => setForm(null)}
          onSave={(body) => (form === 'new' ? create.mutate(body) : update.mutate({ id: form.id, body }))}
        />
      )}
    </>
  );
}
