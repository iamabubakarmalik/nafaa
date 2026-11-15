/**
 * Market customers: everyone who ordered from this shop on Nafaa Market,
 * searchable and paged on the server, with orders, spend and last order.
 * The header adds the last 30 days from Market analytics.
 */

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageCircle, Phone, Repeat, Search, ShoppingBag, Users } from 'lucide-react';
import {
  Avatar, EmptyState, FilterBar, FilterChip, PageHero, PageShell, SearchField, SkeletonTable, Table, TBody, Td, Th, THead, Tr, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { formatPKR, formatRelative } from '@core/lib/format';
import { t } from '@core/i18n';
import { marketApi } from '../api/market.api';
import { GuideButton, Pager, TONE } from '../components/parts';

export default function MarketCustomersPage() {
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { const h = setTimeout(() => setQ(search.trim()), 250); return () => clearTimeout(h); }, [search]);
  useEffect(() => { setPage(1); }, [q]);

  const params = { search: q || undefined, page, limit: 30 };
  const listQ = useQuery({ queryKey: ['market', 'customers', params], queryFn: () => marketApi.customers(params), placeholderData: (prev) => prev });
  const statsQ = useQuery({ queryKey: ['market', 'analytics', '30d'], queryFn: () => marketApi.analytics('30d'), staleTime: 60_000 });
  const items = listQ.data?.items ?? [];
  const meta = listQ.data?.meta;
  const a = statsQ.data;
  const repeatPct = a && a.overview.totalCustomers ? Math.round((a.overview.returningCustomers / a.overview.totalCustomers) * 100) : 0;

  return (
    <PageShell>
      <PageHero
        back="/market" backLabel={t('Market')}
        title={t('Market customers')}
        chip={<><Users /> {t('Jo Market se khareedte hain')}</>}
        loading={listQ.isLoading}
        busy={listQ.isFetching && !listQ.isLoading}
        actions={<>
          <Link to="/market/messages" className={heroButton}><MessageCircle className="h-4 w-4" /> {t('Messages')}</Link>
          <GuideButton onClick={guide.open} />
        </>}
        stats={[
          { label: t('Kul customers'), value: meta?.total ?? 0 },
          { label: t('30 din me customers'), value: a?.overview.totalCustomers ?? 0, hint: a ? t('{{count}}% dobara aaye', { count: repeatPct }) : undefined },
          { label: t('30 din ke orders'), value: a?.overview.totalOrders ?? 0 },
          { label: t('Average order'), value: a ? formatPKR(a.overview.avgOrderValue) : '—' },
        ]}
      />

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={t('Naam, phone ya shehar…')} label={t('Search')} />}
        chips={q ? <FilterChip onRemove={() => setSearch('')}>"{q}"</FilterChip> : undefined}
        onClear={() => setSearch('')} />

      {listQ.isLoading ? <SkeletonTable /> : !items.length ? (
        <EmptyState icon={q ? <Search className="h-6 w-6" /> : <Users className="h-6 w-6" />}
          title={q ? t('Koi customer nahi mila') : t('Abhi koi Market customer nahi')}
          description={q ? t('Kuch aur likh kar dhoondein') : t('Market se order aate hi customer yahan dikhenge.')} />
      ) : (
        <Table minWidth="40rem">
          <THead><Tr><Th>{t('Customer')}</Th><Th>{t('Shehar')}</Th><Th align="right">{t('Orders')}</Th><Th align="right">{t('Kul kharch')}</Th><Th>{t('Aakhri order')}</Th></Tr></THead>
          <TBody>
            {items.map((c) => (
              <Tr key={c.customerId} data-nav-row>
                <Td>
                  <span className="flex items-center gap-2.5">
                    <Avatar name={c.name || '?'} url={c.avatarUrl ?? undefined} size={32} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900">{c.name || t('Customer')}</span>
                      {c.phone && <span className="dir-ltr block truncate text-[0.75rem] text-slate-500">{c.phone}</span>}
                    </span>
                  </span>
                </Td>
                <Td className="text-slate-600">{c.city || '—'}</Td>
                <Td align="right" className="tabular-nums">{c.ordersCount}</Td>
                <Td align="right" className="font-semibold tabular-nums text-slate-900">{formatPKR(c.totalSpent)}</Td>
                <Td className="text-slate-600">{c.lastOrderAt ? formatRelative(c.lastOrderAt) : '—'}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}

      {meta && <Pager page={page} totalPages={meta.totalPages} onPage={setPage} />}
      {listQ.data?.phoneMasked && <p className="text-center text-[0.75rem] text-slate-500">{t('Customer ka poora number order ke andar dikhta hai.')}</p>}

      {guide.isOpen && (
        <PageGuide title={t('Market customers')} onClose={guide.close}
          flow={[
            { label: t('Pehla order'), icon: ShoppingBag, color: TONE.blue },
            { label: t('Achi service'), icon: Users, color: TONE.violet },
            { label: t('Dobara order'), icon: Repeat, color: TONE.green },
          ]}
          steps={[
            { icon: Search, color: TONE.blue, title: t('Dhoondein'), text: t('Naam, phone ya shehar likh kar customer dhoondein.') },
            { icon: Repeat, color: TONE.green, title: t('Dobara aane wale'), text: t('Jitne zyada log dobara aayen utna acha. Offers aur jaldi jawab se yeh barhta hai.') },
            { icon: Phone, color: TONE.amber, title: t('Rabta'), text: t('Customer ke sawal Messages me aate hain.') },
          ]}
          shortcuts={[['/', t('search')], ['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
