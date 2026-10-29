/**
 * True profit of a period's online orders: what the customers paid, the
 * product cost, every selling cost and what is left, with margin %, by
 * channel, courier, city or product. Shown on the Online reports page to
 * users who may see cost.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Globe, MapPin, Package, Settings2, Truck } from 'lucide-react';
import { Button, Card, KpiCard, KpiRow, Segmented, Skeleton, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { BrandLogo, brandForChannel } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { apiErrorMessage } from '../../api/online-orders.api';
import { orderMoneyApi, type ProfitReport } from '../../api/order-money.api';
import { courierBrand } from '../../lib/labels';

type Group = 'channel' | 'courier' | 'city' | 'product';
const GROUPS: Array<{ value: Group; label: string; icon: typeof Globe }> = [
  { value: 'channel', label: 'Channel', icon: Globe },
  { value: 'courier', label: 'Courier', icon: Truck },
  { value: 'city', label: 'Shehar', icon: MapPin },
  { value: 'product', label: 'Product', icon: Package },
];

const marginTone = (m: number | null | undefined) =>
  m == null ? 'bg-slate-100 text-slate-500' : m < 0 ? 'bg-rose-50 text-rose-700' : m < 10 ? 'bg-amber-50 text-amber-800' : 'bg-success-50 text-success-700';

export function OnlineProfit({ q, money }: { q: { from: string; to: string; integrationId?: string }; money: (n: number) => string }) {
  const [group, setGroup] = useState<Group>('channel');
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['online-profit', q.from, q.to, q.integrationId],
    queryFn: () => orderMoneyApi.profitReport(q),
    placeholderData: (p) => p,
  });

  if (isLoading) return <div className="grid gap-4"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>;
  if (isError || !data) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <p className="font-semibold text-slate-900">Profit nahi nikla</p>
        <p className="mt-1 text-[0.8125rem] text-slate-500">{apiErrorMessage(error)}</p>
        <Button className="mt-3" variant="secondary" onClick={() => refetch()}>Dobara koshish</Button>
      </div>
    );
  }
  const t = data.totals;
  const rows = group === 'channel' ? data.byChannel : group === 'courier' ? data.byCourier : group === 'city' ? data.byCity : data.byProduct;
  const paid = t.sale + t.deliveryCollected;
  const pct = (n: number) => (paid > 0 ? `${Math.round((n / paid) * 1000) / 10}%` : '—');

  return (
    <div className="space-y-4">
      {data.missingRates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">{data.missingRates.map((r) => r.name).join(', ')} ka rate likha nahi — in ke parcels ka courier charge 0 gina gaya hai.</span>
          <Link to="/online-store/costs" className="font-semibold underline">Rate likhein</Link>
        </div>
      )}

      <KpiRow>
        <KpiCard icon={Package} color="#2563eb" label="Customer ne diya" value={money(paid)} hint={`${t.orders} order`} />
        <KpiCard icon={Package} color="#64748b" label="Product cost" value={money(t.cost ?? 0)} hint={`${pct(t.cost ?? 0)} sale ka`} />
        <KpiCard icon={Truck} color="#ea580c" label="Selling costs" value={money(t.sellingCosts)} hint={`${pct(t.sellingCosts)} sale ka`} />
        <KpiCard icon={Truck} color="#e11d48" label="RTO ka nuqsan" value={money(t.rtoCost)} hint="Wapsi ka courier charge" />
        <KpiCard icon={Globe} color={(t.profit ?? 0) >= 0 ? '#16a34a' : '#e11d48'} label="Asli profit" value={money(t.profit ?? 0)} hint={t.margin == null ? '—' : `Margin ${t.margin}%`} />
      </KpiRow>

      <Card className="rounded-2xl" flush title="Asli profit — kis cheez se kitna"
        description={`Sale − product cost + delivery mili − courier, COD fee, gateway fee, packaging aur RTO.${t.estimated ? ` ${t.estimated} order me kuch costs rate card se andaza hain.` : ''}`}
        actions={<Link to="/online-store/costs" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"><Settings2 className="h-3.5 w-3.5" /> Rates</Link>}>
        <div className="px-4 pb-3 sm:px-5">
          <Segmented label="Group" value={group} onChange={setGroup} className="flex-wrap"
            items={GROUPS.map((g) => ({ value: g.value, label: <><g.icon className="h-3.5 w-3.5" />{g.label}</> }))} />
        </div>
        {!rows.length ? (
          <p className="px-5 pb-8 pt-4 text-center text-[0.8125rem] text-slate-500">Is period me bill wala koi online order nahi.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table minWidth="60rem" className="[&_table]:text-[0.8125rem] [&_td]:whitespace-nowrap">
              <THead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                <Tr>
                  <Th className="px-4 py-2 sm:px-5">{GROUPS.find((g) => g.value === group)!.label}</Th>
                  <Th className="px-3 py-2 text-right">Order</Th>
                  <Th className="px-3 py-2 text-right">Sale</Th>
                  <Th className="px-3 py-2 text-right">Cost</Th>
                  <Th className="px-3 py-2 text-right">Courier</Th>
                  <Th className="px-3 py-2 text-right">COD fee</Th>
                  <Th className="px-3 py-2 text-right">Packaging</Th>
                  <Th className="px-3 py-2 text-right">RTO</Th>
                  <Th className="px-3 py-2 text-right">Asli profit</Th>
                  <Th className="px-4 py-2 text-right sm:px-5">Margin</Th>
                </Tr>
              </THead>
              <TBody className="divide-y divide-slate-100">
                {rows.map((r: any, i) => (
                  <Tr key={i} className="hover:bg-slate-50/80">
                    <Td className="max-w-[16rem] px-4 py-2.5 sm:px-5">
                      <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-900">
                        {group === 'channel' && <BrandLogo name={brandForChannel(r.type)} size={18} />}
                        {group === 'courier' && <BrandLogo name={courierBrand(r.code)} size={18} />}
                        <span className="truncate">{r.name ?? r.city}</span>
                      </span>
                      {group === 'product' && r.qty > 0 && <span className="text-[0.75rem] text-slate-500">{Math.round(r.qty)} bike</span>}
                    </Td>
                    <Td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{r.orders}</Td>
                    <Td className="px-3 py-2.5 text-right tabular-nums">{money(r.sale + r.deliveryCollected)}</Td>
                    <Td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{money(r.cost ?? 0)}</Td>
                    <Td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{money(r.courierCharge)}</Td>
                    <Td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{money(r.codFee + r.gatewayFee)}</Td>
                    <Td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{money(r.packagingCost)}</Td>
                    <Td className={cn('px-3 py-2.5 text-right tabular-nums', r.rtoCost > 0 ? 'text-rose-600' : 'text-slate-400')}>{money(r.rtoCost)}</Td>
                    <Td className={cn('px-3 py-2.5 text-right font-semibold tabular-nums', (r.profit ?? 0) < 0 ? 'text-rose-600' : 'text-slate-900')}>{money(r.profit ?? 0)}</Td>
                    <Td className="px-4 py-2.5 text-right sm:px-5"><span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', marginTone(r.margin))}>{r.margin == null ? '—' : `${r.margin}%`}</span></Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        )}
        <p className="px-4 py-3 text-[0.6875rem] text-slate-400 sm:px-5">
          {data.posting
            ? 'Deliver aur wapas orders ke selling costs Expenses ("Online selling costs") me khud likhe jate hain — P&L me ek hi dafa.'
            : 'Selling costs abhi Expenses me khud nahi likhe jate (Selling costs → setting). P&L me sirf wohi jo aap khud likhte hain.'}
          {' '}COD fee me gateway fee bhi shamil hai. Product me order ke costs us ke hisse ke mutabiq baante gaye hain.
        </p>
      </Card>
    </div>
  );
}
