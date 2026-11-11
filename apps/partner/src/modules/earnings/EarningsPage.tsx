/**
 * Money: balances, payout request, the earnings ledger (by month and
 * status), payout history and the monthly statement link.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { FileText, Receipt, Wallet } from 'lucide-react';
import { Alert, Badge, Button, EmptyState, PageHero, PageShell, Select, Skeleton, Tabs, heroButton } from '@/design-system/components';
import { partnerApi } from '@/api/partner.api';
import type { EarningStatus } from '@/api/types';
import { useAuthStore } from '@/store/auth.store';
import { EARNING_KIND, EARNING_STATUS, PAYOUT_METHOD, PAYOUT_STATUS } from '@/lib/labels';
import { day, monthLabel, num, pkMonth, pkr, recentMonths } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Section } from '@/ui/Section';
import { QueryError } from '@/ui/QueryState';
import { usePayout } from './usePayout';

type StatusTab = EarningStatus | 'ALL';
const MONTHS = recentMonths(12);

function Payouts() {
  const q = useQuery({ queryKey: ['payouts'], queryFn: partnerApi.payouts });
  return (
    <Section title="Payouts">
      {q.isPending ? <Skeleton className="h-24 rounded-2xl" /> : q.isError ? <QueryError error={q.error} onRetry={() => void q.refetch()} /> : q.data.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-[0.875rem] text-slate-500">Abhi tak koi payout nahi mangwaya.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {q.data.map((p) => (
            <li key={p.id} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-bold tabular-nums text-slate-900">{pkr(p.amount)}</p>
                <Badge variant={PAYOUT_STATUS[p.status].badge}>{PAYOUT_STATUS[p.status].label}</Badge>
              </div>
              <p className="mt-0.5 text-[0.8125rem] text-slate-500">
                {[p.method ? PAYOUT_METHOD[p.method as keyof typeof PAYOUT_METHOD] ?? p.method : null, p.account].filter(Boolean).join(' · ')}
              </p>
              <p className="text-[0.8125rem] text-slate-500">
                Mangwaya {day(p.requestedAt)}{p.paidAt ? ` · Bheja ${day(p.paidAt)}` : ''}{p.reference ? ` · Ref: ${p.reference}` : ''}
              </p>
              {p.status === 'REJECTED' && p.rejectReason && <p className="mt-1 text-[0.8125rem] text-rose-700">Wajah: {p.rejectReason}</p>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export default function EarningsPage() {
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.me);
  const [month, setMonth] = useState('');
  const [status, setStatus] = useState<StatusTab>('ALL');
  const { ask, busy } = usePayout();

  const q = useInfiniteQuery({
    queryKey: ['earnings', month, status],
    queryFn: ({ pageParam }) => partnerApi.earnings({ month, status: status === 'ALL' ? '' : status, page: pageParam, limit: 25 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });
  const b = q.data?.pages[0]?.balances;
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const statementMonth = month || pkMonth();
  const canPay = !!b && b.available >= b.minPayout;

  return (
    <PageShell>
      <PageHero title="Kamai" loading={!b} busy={q.isFetching}
        actions={<button type="button" className={heroButton} onClick={() => navigate(`/statement/${statementMonth}`)}><FileText className="h-4 w-4" />Statement</button>}
        stats={[
          { label: 'Payout ke liye tayyar', value: pkr(b?.available) },
          { label: 'Intezar me', value: pkr(b?.pending), hint: 'Kuch din baad tayyar hoga' },
          { label: 'Request me', value: pkr(b?.requested) },
          { label: 'Mil chuka', value: pkr(b?.paid) },
        ]} />

      <Section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900">Payout mangwayein</p>
            <p className="text-[0.875rem] text-slate-500">
              {me?.payoutMethod ? `${PAYOUT_METHOD[me.payoutMethod]} · ${me.payoutAccount ?? ''}` : 'Payout account abhi nahi likha'}
              {' · '}<Link to="/profile#payout" className="font-semibold text-brand-700">Badlein</Link>
            </p>
          </div>
          <Button size="lg" disabled={!canPay} loading={busy} onClick={() => b && void ask(b.available)} leftIcon={<Wallet className="h-5 w-5" />}>
            {canPay ? `${pkr(b.available)} mangwayein` : 'Payout mangwayein'}
          </Button>
        </div>
        {b && b.requested > 0 && <Alert tone="warning" className="mt-3">{pkr(b.requested)} ki payout request Nafaa ke paas hai. Paise bhejte hi neeche "Paid" likha aayega.</Alert>}
        {b && !canPay && b.requested === 0 && <Alert tone="info" className="mt-3">Kam az kam {pkr(b.minPayout)} hone par payout mangwa sakte hain. Commission pehle "Intezar me" rehta hai, phir tayyar hota hai.</Alert>}
      </Section>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Section title="Hisaab" flush>
          <div className="space-y-3 px-4 pb-1 pt-1 sm:px-5">
            <Select aria-label="Mahina" value={month} onChange={(e) => setMonth(e.target.value)}
              options={[{ value: '', label: 'Sab mahine' }, ...MONTHS.map((m) => ({ value: m, label: monthLabel(m) }))]} />
            <Tabs<StatusTab> label="Status" value={status} onChange={setStatus}
              items={[{ value: 'ALL', label: 'Sab' }, ...(Object.keys(EARNING_STATUS) as EarningStatus[]).map((s) => ({ value: s, label: EARNING_STATUS[s].label }))]} />
          </div>
          {q.isPending ? (
            <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : q.isError ? (
            <div className="p-4"><QueryError error={q.error} onRetry={() => void q.refetch()} /></div>
          ) : items.length === 0 ? (
            <EmptyState icon={<Receipt className="h-6 w-6" />} title="Is filter me koi kamai nahi" description="Dukaan ka paid Signup hote hi yahan Commission dikhega." />
          ) : (
            <>
              <ul className="divide-y divide-slate-100">
                {items.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{EARNING_KIND[e.kind] ?? e.kind}</p>
                      {e.description && <p className="truncate text-[0.8125rem] text-slate-600">{e.description}</p>}
                      <p className="text-[0.75rem] text-slate-500">
                        {day(e.createdAt)}
                        {e.status === 'PENDING' && e.availableAt ? ` · ${day(e.availableAt)} ko tayyar` : ''}
                        {e.status === 'PAYABLE' && e.payoutId ? ' · Payout request me' : ''}
                      </p>
                      {e.status === 'REVERSED' && e.reversedReason && <p className="text-[0.75rem] text-rose-700">Wajah: {e.reversedReason}</p>}
                    </div>
                    <div className="shrink-0 text-end">
                      <p className={cn('font-bold tabular-nums', e.status === 'REVERSED' ? 'text-slate-400 line-through' : e.amount < 0 ? 'text-rose-700' : 'text-slate-900')}>{pkr(e.amount)}</p>
                      <Badge size="xs" variant={EARNING_STATUS[e.status].badge} className="mt-1">{EARNING_STATUS[e.status].label}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
              {q.hasNextPage && (
                <div className="p-4"><Button variant="secondary" fullWidth loading={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>Aur dikhayein</Button></div>
              )}
              <p className="px-4 pb-4 text-[0.75rem] text-slate-500 sm:px-5">{num(q.data.pages[0].meta.total)} entries</p>
            </>
          )}
        </Section>
        <div className="space-y-4">
          <Payouts />
          <Section>
            <Link to={`/statement/${statementMonth}`} className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><FileText className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">{monthLabel(statementMonth)} ki statement</span>
                <span className="block text-[0.8125rem] text-slate-500">Print ya PDF save karein</span>
              </span>
            </Link>
          </Section>
        </div>
      </div>
    </PageShell>
  );
}
