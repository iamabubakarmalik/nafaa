/**
 * Books: the shop's titles by ISBN, author, publisher, edition and class,
 * with today's rate and stock. Search goes to the server (title, ISBN or
 * publisher code); class, publisher and textbook filters narrow it. The
 * list prints as a stock or order sheet for a publisher.
 *
 * Keys: N new book · / search · G guide.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Building2, GraduationCap, Package, Plus, ScanLine, Timer, Users } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Select, SkeletonTable, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { PrintButton } from '@core/print';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { bookProfilesApi, type BookProfile } from '../api/book-profiles.api';
import { publishersApi } from '../api/publishers.api';
import { BOOK_CATEGORIES, KEYS, labelOf } from '../lib/meta';
import { EmptyBox, useDebounced, usePageKeys } from '../components/ui';
import { t } from '@core/i18n';

type Tab = 'all' | 'text' | 'rent' | 'low';

const authorsOf = (b: BookProfile) => (b.bookAuthors ?? []).map((a: { author?: { name: string } }) => a.author?.name).filter(Boolean).join(', ');

export default function BooksPage() {
  const navigate = useNavigate();
  const canCreate = usePermission(PERMISSIONS.PRODUCTS_CREATE);
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [grade, setGrade] = useState('');
  const [publisherId, setPublisherId] = useState('');
  const term = useDebounced(search.trim(), 300);

  const listQ = useQuery({
    queryKey: [KEYS.books, term, publisherId],
    queryFn: () => bookProfilesApi.list({ search: term || undefined, publisherId: publisherId || undefined }),
  });
  const pubsQ = useQuery({ queryKey: [KEYS.publishers, 'active'], queryFn: () => publishersApi.list({ active: true }), staleTime: 60_000 });
  const all = useMemo(() => listQ.data ?? [], [listQ.data]);
  const grades = useMemo(() => [...new Set(all.map((b) => b.grade).filter((g): g is string => !!g))].sort(), [all]);
  const stock = (b: BookProfile) => Number(b.product?.stock ?? 0);
  const low = (b: BookProfile) => stock(b) <= Math.max(Number(b.product?.lowStockAlert ?? 0), b.reorderLevel ?? 0, 0);
  const rows = useMemo(() => all.filter((b) => (!grade || b.grade === grade)
    && (tab === 'all' || (tab === 'text' && b.isTextbook) || (tab === 'rent' && b.isRentable) || (tab === 'low' && low(b)))), [all, grade, tab]);
  const copies = all.reduce((s, b) => s + Math.max(stock(b), 0), 0);
  const value = all.reduce((s, b) => s + Math.max(stock(b), 0) * Number(b.product?.price ?? 0), 0);

  usePageKeys(searchRef, canCreate ? { n: () => navigate('/bookstore-products/new') } : {});

  const doc = () => ({
    title: 'Kitabon ki list',
    subtitle: [grade, pubsQ.data?.find((p) => p.id === publisherId)?.name].filter(Boolean).join(' · ') || undefined,
    sections: [{
      kind: 'table' as const,
      columns: [{ label: 'Kitab' }, { label: 'ISBN', wideOnly: true }, { label: 'Publisher', wideOnly: true }, { label: 'Class', wideOnly: true }, { label: 'Rate', align: 'right' as const }, { label: 'Stock', align: 'right' as const }],
      rows: rows.map((b) => [b.product?.name ?? b.title, b.isbn13 ?? b.isbn10 ?? '', b.publisher?.name ?? '', [b.grade, b.subject].filter(Boolean).join(' '), String(b.product?.price ?? ''), String(stock(b))]),
    }],
  });

  return (
    <PageShell>
      <PageHero
        title={t('Kitaben')}
        chip={<><BookOpen /> {' '}{t('ISBN, author, publisher')}</>}
        meta={t('Har kitab ka edition, class, rate aur stock')}
        loading={listQ.isLoading}
        actions={<>
          <Link to="/bookstore/authors" className={heroButton}><Users className="h-4 w-4" /><span className="hidden sm:inline">{t('Authors')}</span></Link>
          <Link to="/bookstore/publishers" className={heroButton}><Building2 className="h-4 w-4" /><span className="hidden sm:inline">{t('Publishers')}</span></Link>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canCreate && <Link to="/bookstore-products/new" title={t('Nayi kitab (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{t('Kitab')}</Link>}
        </>}
        stats={[{ label: t('Kitaben'), value: all.length }, { label: t('Copies'), value: copies }, { label: t('Stock ki value'), value: sales(value) }]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={BookOpen} color="#0891b2" label={t('Titles')} value={all.length} onClick={() => setTab('all')} active={tab === 'all'} />
        <KpiCard icon={GraduationCap} color="#7c3aed" label={t('School ki')} value={all.filter((b) => b.isTextbook).length} onClick={() => setTab('text')} active={tab === 'text'} />
        <KpiCard icon={Timer} color="#d97706" label={t('Kiraye wali')} value={all.filter((b) => b.isRentable).length} onClick={() => setTab('rent')} active={tab === 'rent'} />
        <KpiCard icon={Package} color="#e11d48" label={t('Stock kam')} value={all.filter(low).length} onClick={() => setTab('low')} active={tab === 'low'} hint={t('Mangwani hain')} />
      </KpiRow>

      <ViewTabs<Tab> tabs={[{ id: 'all', label: t('Sab') }, { id: 'text', label: t('School ki') }, { id: 'rent', label: t('Kiraye wali') }, { id: 'low', label: t('Stock kam') }]} value={tab} onChange={setTab}
        right={<PrintButton doc={doc} disabled={!rows.length} size="sm" />} />
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={t('Naam, ISBN ya publisher code')} label={t('Search')} />}>
        <Select size="sm" aria-label={t('Class')} value={grade} onChange={(e) => setGrade(e.target.value)} options={[{ value: '', label: t('Har class') }, ...grades.map((g) => ({ value: g, label: g }))]} />
        <Select size="sm" aria-label={t('Publisher')} value={publisherId} onChange={(e) => setPublisherId(e.target.value)} options={[{ value: '', label: t('Har publisher') }, ...(pubsQ.data ?? []).map((p) => ({ value: p.id, label: p.name }))]} />
      </FilterBar>

      {listQ.isLoading ? <SkeletonTable />
        : rows.length === 0 ? (
          <EmptyBox icon={BookOpen} title={search ? t('Koi kitab nahi mili') : t('Abhi koi kitab nahi')}
            text={t('Nayi kitab banayein: ISBN, author, publisher aur class likhein — POS par in sab se dhoondi jati hai.')}
            action={canCreate && !search ? <Button onClick={() => navigate('/bookstore-products/new')} leftIcon={<Plus className="h-4 w-4" />}>{t('Kitab banayein')}</Button> : undefined} />
        ) : (
          <Table minWidth="56rem">
            <THead><Tr><Th>{t('Kitab')}</Th><Th>{t('Author')}</Th><Th>{t('Publisher')}</Th><Th>{t('Class')}</Th><Th align="right">{t('Rate')}</Th><Th align="right">{t('Stock')}</Th></Tr></THead>
            <TBody>
              {rows.map((b) => (
                <Tr key={b.id} interactive onClick={() => navigate(`/bookstore-products/${b.productId}`)}>
                  <Td>
                    <p className="font-medium text-slate-900">{b.product?.name ?? b.title}</p>
                    <p className="text-[0.75rem] text-slate-500">
                      {[b.isbn13 || b.isbn10, b.edition && `${b.edition} ed`, labelOf(BOOK_CATEGORIES, b.category)].filter(Boolean).join(' · ')}
                      {b.isRentable && <span className="ms-1 font-semibold text-amber-700">{t('· Kiraya')}</span>}
                    </p>
                  </Td>
                  <Td>{authorsOf(b) || <span className="text-slate-400">—</span>}</Td>
                  <Td>{b.publisher?.name ?? <span className="text-slate-400">—</span>}</Td>
                  <Td>{b.isTextbook ? [b.grade, b.subject].filter(Boolean).join(' · ') || '—' : <span className="text-slate-400">—</span>}</Td>
                  <Td align="right" className="tabular-nums">{sales(Number(b.product?.price ?? 0))}</Td>
                  <Td align="right" className={cn('tabular-nums font-semibold', low(b) ? 'text-rose-600' : 'text-slate-900')}>{stock(b)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      {all.length >= 300 && <p className="px-1 text-[0.75rem] text-slate-500">{t('Pehli 300 kitaben dikh rahi hain — naam ya ISBN se dhoondein.')}</p>}

      <p className="hidden items-center gap-1 px-1 text-[0.75rem] text-slate-500 sm:flex">{canCreate && <><Kbd>N</Kbd> {' '}{t('nayi kitab ·')}{' '} </>}<Kbd>/</Kbd> {' '}{t('search ·')}{' '} <Kbd>G</Kbd> {' '}{t('guide')}</p>

      {guide.isOpen && (
        <PageGuide title={t('Kitaben — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: ScanLine, color: '#0891b2', title: t('ISBN se'), text: t('Search me ISBN likhein ya scan karein — kitab foran milti hai. Row dabane se poori tafseel aur stock khulta hai.') },
            { icon: GraduationCap, color: '#7c3aed', title: t('Class aur publisher'), text: t('Class ya publisher chun kar list print karein — publisher ko order bhejne ya season se pehle stock ginne ke liye.') },
            { icon: Package, color: '#e11d48', title: t('Stock kam'), text: t('"Stock kam" tab me wo kitaben jo had tak aa gayin — Publishers se purchase karein.') },
          ]}
          shortcuts={[['N', t('nayi kitab')], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
