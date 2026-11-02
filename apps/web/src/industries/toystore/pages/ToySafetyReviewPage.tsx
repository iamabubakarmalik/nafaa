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
import { t } from '@core/i18n';

type Flag = 'UNDER_THREE' | 'CHOKING_HAZARD' | 'SMALL_PARTS' | 'NOT_CERTIFIED_NON_TOXIC' | 'NO_SAFETY_CERTIFICATION';
type Tab = 'all' | Flag;
interface Row {
  id: string; productId: string; ageGroup?: string; ageMinYears?: number | null; ageMaxYears?: number | null; riskFlags: Flag[];
  product: { id: string; name: string; sku?: string | null; price: number; stock: number };
}

const FLAG: Record<Flag, { label: string; tone: string }> = {
  UNDER_THREE: { label: t('Chhote bachon par chhote purze'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  CHOKING_HAZARD: { label: t('Gale me phans sakta hai'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  SMALL_PARTS: { label: t('Chhote purze'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  NOT_CERTIFIED_NON_TOXIC: { label: t('Non-toxic nahi likha'), tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  NO_SAFETY_CERTIFICATION: { label: t('Certificate nahi'), tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
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
    title: t('Khilonon ki safety'),
    sections: [{
      kind: 'table' as const,
      columns: [{ label: t('Khilona') }, { label: t('Umar') }, { label: t('Masla') }, { label: t('Stock'), align: 'right' as const }],
      rows: rows.map((r) => [r.product.name, ageText(r), r.riskFlags.map((f) => FLAG[f]?.label ?? f).join(', '), String(r.product.stock)]),
    }],
  });

  return (
    <PageShell>
      <PageHero
        title={t('Safety review')}
        chip={<><ShieldAlert /> {' '}{t('Bachon ki hifazat')}</>}
        meta={t('Jin khilonon par chhote purze hain ya certificate nahi — bechne se pehle dekh lein')}
        loading={q.isLoading}
        actions={<button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>}
        stats={[{ label: t('Dekhne wale'), value: all.length }, { label: t('Foran theek karein'), value: count('UNDER_THREE') }]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={Baby} color="#e11d48" label={t('3 saal se kam par purze')} value={count('UNDER_THREE')} onClick={() => setTab('UNDER_THREE')} active={tab === 'UNDER_THREE'} hint={t('Umar ya nishan ghalat')} />
        <KpiCard icon={AlertTriangle} color="#d97706" label={t('Chhote purze')} value={count('CHOKING_HAZARD')} onClick={() => setTab('CHOKING_HAZARD')} active={tab === 'CHOKING_HAZARD'} />
        <KpiCard icon={FlaskConical} color="#7c3aed" label={t('Non-toxic nahi')} value={count('NOT_CERTIFIED_NON_TOXIC')} onClick={() => setTab('NOT_CERTIFIED_NON_TOXIC')} active={tab === 'NOT_CERTIFIED_NON_TOXIC'} />
        <KpiCard icon={ShieldCheck} color="#64748b" label={t('Certificate nahi')} value={count('NO_SAFETY_CERTIFICATION')} onClick={() => setTab('NO_SAFETY_CERTIFICATION')} active={tab === 'NO_SAFETY_CERTIFICATION'} />
      </KpiRow>

      <ViewTabs<Tab> tabs={[{ id: 'all', label: t('Sab') }, { id: 'UNDER_THREE', label: t('Foran') }, { id: 'CHOKING_HAZARD', label: t('Purze') }, { id: 'NO_SAFETY_CERTIFICATION', label: t('Certificate') }]} value={tab} onChange={setTab}
        right={<PrintButton doc={doc} disabled={!rows.length} size="sm" />} />
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={t('Khilone ka naam ya SKU')} label={t('Search')} />} />

      {q.isLoading ? <SkeletonTable /> : rows.length === 0 ? (
        <EmptyBox icon={ShieldCheck} title={all.length ? t('Is tab me kuch nahi') : t('Sab khilone theek hain')} text={t('Khilone ki umar, chhote purze aur certificate uske Edit me likhe jate hain.')} />
      ) : (
        <Table minWidth="48rem">
          <THead><Tr><Th>{t('Khilona')}</Th><Th>{t('Umar')}</Th><Th>{t('Masla')}</Th><Th align="right">{t('Stock')}</Th><Th align="right">{' '}</Th></Tr></THead>
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
                  {canEdit && <Link to={`/toystore-products/${r.productId}/edit`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50"><Pencil className="h-3.5 w-3.5" />{t('Theek karein')}</Link>}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}

      <p className="hidden items-center gap-1 px-1 text-[0.75rem] text-slate-500 sm:flex"><Kbd>/</Kbd> {' '}{t('search ·')}{' '} <Kbd>G</Kbd> {' '}{t('guide')}</p>

      {guide.isOpen && (
        <PageGuide title={t('Safety review — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Baby, color: '#e11d48', title: t('Foran'), text: t('Chhote purze wala khilona 3 saal se kam umar par likha hai — ya umar ghalat hai ya nishan. Edit se theek karein.') },
            { icon: AlertTriangle, color: '#d97706', title: t('Counter par'), text: t('Chhote purze wale khilone POS par peeli nishani ke saath aate hain — chhote bachay ke walidain ko bata dein.') },
            { icon: ShieldCheck, color: '#16a34a', title: t('Certificate'), text: t('Dabbe par CE, EN71 ya ASTM likha ho to Edit me chun lein — list se hat jayega.') },
          ]}
          shortcuts={[['/', t('dhoondein')], ['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
