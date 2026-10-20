/**
 * Safety review: toys with small parts, no non-toxic mark or no safety
 * certificate. A small-parts toy marked for children under three comes
 * first — its age or its marking is wrong and should be fixed before it is
 * sold. Rows open the toy; Edit fixes the marks.
 *
 * Keys: / search · G guide.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Baby, FlaskConical, GraduationCap, Pencil, ShieldAlert, ShieldCheck } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  FilterBar, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, SkeletonTable, Table, TBody, THead, Td, Th, Tr, ViewTabs, heroIconButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { PrintButton } from '@core/print';
import { toyProductsApi } from '../api/products.api';
import { KEYS, ageText } from '../lib/meta';
import { EmptyBox, usePageKeys } from '../components/ui';

type Flag = 'UNDER_THREE' | 'CHOKING_HAZARD' | 'SMALL_PARTS' | 'NOT_CERTIFIED_NON_TOXIC' | 'NO_SAFETY_CERTIFICATION';
type Tab = 'all' | Flag;
interface Row {
  id: string; productId: string; ageGroup?: string; ageMinYears?: number | null; ageMaxYears?: number | null; riskFlags: Flag[];
  product: { id: string; name: string; sku?: string | null; price: number; stock: number };
}

const FLAG: Record<Flag, { label: string; tone: string }> = {
  UNDER_THREE: { label: 'Chhote bachon par chhote purze', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  CHOKING_HAZARD: { label: 'Gale me phans sakta hai', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  SMALL_PARTS: { label: 'Chhote purze', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  NOT_CERTIFIED_NON_TOXIC: { label: 'Non-toxic nahi likha', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  NO_SAFETY_CERTIFICATION: { label: 'Certificate nahi', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

export default function ToySafetyReviewPage() {
  const navigate = useNavigate();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('all');

  const q = useQuery({ queryKey: [KEYS.safety], queryFn: () => toyProductsApi.safetyReview() as Promise<Row[]> });
  const all = useMemo(() => [...(q.data ?? [])].sort((a, b) => Number(b.riskFlags.includes('UNDER_THREE')) - Number(a.riskFlags.includes('UNDER_THREE'))), [q.data]);
  const count = (f: Flag) => all.filter((r) => r.riskFlags.includes(f)).length;
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter((r) => (tab === 'all' || r.riskFlags.includes(tab)) && (!s || [r.product.name, r.product.sku].some((v) => v?.toLowerCase().includes(s))));
  }, [all, tab, search]);

  usePageKeys(searchRef);

  const doc = () => ({
    title: 'Khilonon ki safety',
    sections: [{
      kind: 'table' as const,
      columns: [{ label: 'Khilona' }, { label: 'Umar' }, { label: 'Masla' }, { label: 'Stock', align: 'right' as const }],
      rows: rows.map((r) => [r.product.name, ageText(r), r.riskFlags.map((f) => FLAG[f]?.label ?? f).join(', '), String(r.product.stock)]),
    }],
  });

  return (
    <PageShell>
      <PageHero
        title="Safety review"
        chip={<><ShieldAlert /> Bachon ki hifazat</>}
        meta="Jin khilonon par chhote purze hain ya certificate nahi — bechne se pehle dekh lein"
        loading={q.isLoading}
        actions={<button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>}
        stats={[{ label: 'Dekhne wale', value: all.length }, { label: 'Foran theek karein', value: count('UNDER_THREE') }]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={Baby} color="#e11d48" label="3 saal se kam par purze" value={count('UNDER_THREE')} onClick={() => setTab('UNDER_THREE')} active={tab === 'UNDER_THREE'} hint="Umar ya nishan ghalat" />
        <KpiCard icon={AlertTriangle} color="#d97706" label="Chhote purze" value={count('CHOKING_HAZARD')} onClick={() => setTab('CHOKING_HAZARD')} active={tab === 'CHOKING_HAZARD'} />
        <KpiCard icon={FlaskConical} color="#7c3aed" label="Non-toxic nahi" value={count('NOT_CERTIFIED_NON_TOXIC')} onClick={() => setTab('NOT_CERTIFIED_NON_TOXIC')} active={tab === 'NOT_CERTIFIED_NON_TOXIC'} />
        <KpiCard icon={ShieldCheck} color="#64748b" label="Certificate nahi" value={count('NO_SAFETY_CERTIFICATION')} onClick={() => setTab('NO_SAFETY_CERTIFICATION')} active={tab === 'NO_SAFETY_CERTIFICATION'} />
      </KpiRow>

      <ViewTabs<Tab> tabs={[{ id: 'all', label: 'Sab' }, { id: 'UNDER_THREE', label: 'Foran' }, { id: 'CHOKING_HAZARD', label: 'Purze' }, { id: 'NO_SAFETY_CERTIFICATION', label: 'Certificate' }]} value={tab} onChange={setTab}
        right={<PrintButton doc={doc} disabled={!rows.length} size="sm" />} />
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Khilone ka naam ya SKU" label="Search" />} />

      {q.isLoading ? <SkeletonTable /> : rows.length === 0 ? (
        <EmptyBox icon={ShieldCheck} title={all.length ? 'Is tab me kuch nahi' : 'Sab khilone theek hain'} text="Khilone ki umar, chhote purze aur certificate uske Edit me likhe jate hain." />
      ) : (
        <Table minWidth="48rem">
          <THead><Tr><Th>Khilona</Th><Th>Umar</Th><Th>Masla</Th><Th align="right">Stock</Th><Th align="right">{' '}</Th></Tr></THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.id} interactive onClick={() => navigate(`/toystore-products/${r.productId}`)}>
                <Td><p className="font-medium text-slate-900">{r.product.name}</p>{r.product.sku && <p className="font-mono text-[0.75rem] text-slate-500">{r.product.sku}</p>}</Td>
                <Td>{ageText(r) || <span className="text-slate-400">—</span>}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {r.riskFlags.map((f) => <span key={f} className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold ring-1', FLAG[f]?.tone)}>{FLAG[f]?.label ?? f}</span>)}
                  </div>
                </Td>
                <Td align="right">{r.product.stock}</Td>
                <Td align="right" onClick={(e) => e.stopPropagation()}>
                  {canEdit && <Link to={`/toystore-products/${r.productId}/edit`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50"><Pencil className="h-3.5 w-3.5" />Theek karein</Link>}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}

      <p className="hidden items-center gap-1 px-1 text-[0.75rem] text-slate-500 sm:flex"><Kbd>/</Kbd> search · <Kbd>G</Kbd> guide</p>

      {guide.isOpen && (
        <PageGuide title="Safety review — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Baby, color: '#e11d48', title: 'Foran', text: 'Chhote purze wala khilona 3 saal se kam umar par likha hai — ya umar ghalat hai ya nishan. Edit se theek karein.' },
            { icon: AlertTriangle, color: '#d97706', title: 'Counter par', text: 'Chhote purze wale khilone POS par peeli nishani ke saath aate hain — chhote bachay ke walidain ko bata dein.' },
            { icon: ShieldCheck, color: '#16a34a', title: 'Certificate', text: 'Dabbe par CE, EN71 ya ASTM likha ho to Edit me chun lein — list se hat jayega.' },
          ]}
          shortcuts={[['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
