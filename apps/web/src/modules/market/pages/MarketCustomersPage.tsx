/**
 * Market customers: how many people bought through the Market, how many came
 * back, and the best customers by spend for the chosen period.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageCircle, Repeat, ShoppingBag, Users } from 'lucide-react';
import {
  Avatar, EmptyState, KpiCard, KpiRow, PageHero, PageShell, SkeletonTable, Table, TBody, Td, Th, THead, Tr, ViewTabs, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { formatPKR } from '@core/lib/format';
import { t } from '@core/i18n';
import { marketApi, type AnalyticsRange } from '../api/market.api';
import { GuideButton, TONE, rangeTabs } from '../components/parts';

export default function MarketCustomersPage() {
  const guide = usePageGuide();
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const q = useQuery({ queryKey: ['market', 'analytics', range], queryFn: () => marketApi.analytics(range), placeholderData: (prev) => prev });
  const a = q.data;
  const top = a?.topCustomers ?? [];
  const repeatPct = a && a.overview.totalCustomers ? Math.round((a.overview.returningCustomers / a.overview.totalCustomers) * 100) : 0;

  return (
    <PageShell>
      <PageHero
        back="/market" backLabel={t('Market')}
        title={t('Market customers')}
        chip={<><Users /> {t('Jo Market se khareedte hain')}</>}
        loading={q.isLoading}
        busy={q.isFetching && !q.isLoading}
        actions={<>
          <Link to="/market/messages" className={heroButton}><MessageCircle className="h-4 w-4" /> {t('Messages')}</Link>
          <GuideButton onClick={guide.open} />
        </>}
        stats={a ? [
          { label: t('Customers'), value: a.overview.totalCustomers },
          { label: t('Dobara aaye'), value: a.overview.returningCustomers, hint: `${repeatPct}%` },
          { label: t('Orders'), value: a.overview.totalOrders },
          { label: t('Average order'), value: formatPKR(a.overview.avgOrderValue) },
        ] : undefined}
      />

      <ViewTabs value={range} onChange={setRange} tabs={rangeTabs()} />

      {a && (
        <KpiRow cols={3}>
          <KpiCard icon={Users} color={TONE.blue} label={t('Naye customers')} value={Math.max(0, a.overview.totalCustomers - a.overview.returningCustomers)} />
          <KpiCard icon={Repeat} color={TONE.green} label={t('Dobara aane wale')} value={`${repeatPct}%`} />
          <KpiCard icon={ShoppingBag} color={TONE.amber} label={t('Kul Sale')} value={formatPKR(a.overview.totalRevenue)} />
        </KpiRow>
      )}

      {q.isLoading ? <SkeletonTable /> : !top.length ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title={t('Is muddat me koi Market customer nahi')} description={t('Market se order aate hi customer yahan dikhenge.')} />
      ) : (
        <Table minWidth="32rem">
          <THead><Tr><Th>#</Th><Th>{t('Customer')}</Th><Th align="right">{t('Orders')}</Th><Th align="right">{t('Kul kharch')}</Th></Tr></THead>
          <TBody>
            {top.map((c, i) => (
              <Tr key={c.customerId} data-nav-row>
                <Td className="w-10 tabular-nums text-slate-500">{i + 1}</Td>
                <Td><span className="flex items-center gap-2.5"><Avatar name={c.fullName} size={32} /><span className="font-semibold text-slate-900">{c.fullName}</span></span></Td>
                <Td align="right" className="tabular-nums">{c.orderCount}</Td>
                <Td align="right" className="font-semibold tabular-nums text-slate-900">{formatPKR(c.totalSpent)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}

      {guide.isOpen && (
        <PageGuide title={t('Market customers')} onClose={guide.close}
          flow={[
            { label: t('Pehla order'), icon: ShoppingBag, color: TONE.blue },
            { label: t('Achi service'), icon: Users, color: TONE.violet },
            { label: t('Dobara order'), icon: Repeat, color: TONE.green },
          ]}
          steps={[
            { icon: Users, color: TONE.blue, title: t('Sab se ache customers'), text: t('Upar wale customers ne is muddat me sab se zyada khareeda.') },
            { icon: Repeat, color: TONE.green, title: t('Dobara aane wale'), text: t('Jitne zyada log dobara aayen utna acha. Offers aur jaldi jawab se yeh barhta hai.') },
            { icon: MessageCircle, color: TONE.amber, title: t('Baat karein'), text: t('Customer ke sawal Messages me aate hain.') },
          ]}
          shortcuts={[['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
