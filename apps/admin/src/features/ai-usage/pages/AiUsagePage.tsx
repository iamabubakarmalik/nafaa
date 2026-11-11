/**
 * Nafaa AI usage and cost: messages, tokens and spend per day across all
 * shops, the shops that use it most, and the split by model tier.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bot, Coins, Lightbulb, MessageSquare, Store, Zap } from 'lucide-react';
import { Card, KpiCard, KpiRow, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminAiUsageApi } from '@/api/admin-ai-usage.api';
import { cn } from '@/lib/cn';
import { ListCard } from '@/ui';
import { num } from '@/lib/format';

const RANGES = [7, 14, 30, 90];
const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const compact = (n: number) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : String(n));
const change = (now: number, prev: number) => (!prev ? (now ? 'New' : 'No change') : `${now >= prev ? '+' : ''}${Math.round(((now - prev) / prev) * 100)}% vs prior period`);

export default function AiUsagePage() {
  const navigate = useNavigate();
  const guide = usePageGuide();
  const [days, setDays] = useState(30);
  const q = useQuery({ queryKey: ['admin', 'ai-usage', days], queryFn: () => adminAiUsageApi.summary(days), placeholderData: (p) => p });
  const d = q.data;
  const perShop = d && d.totals.shops ? d.totals.costUsd / d.totals.shops : 0;

  return (
    <PageShell>
      <PageHero
        title="Nafaa AI usage"
        chip={`Last ${days} days`}
        busy={q.isFetching}
        loading={q.isLoading}
        actions={
          <>
            <div className="flex gap-1" role="group" aria-label="Period">
              {RANGES.map((r) => (
                <button key={r} type="button" aria-pressed={days === r} onClick={() => setDays(r)} className={cn(heroButton, days === r && 'bg-[color:var(--hero-primary-bg)] text-[color:var(--hero-primary-fg)]')}>{r}d</button>
              ))}
            </div>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={d ? [
          { label: 'Cost', value: usd(d.totals.costUsd), hint: change(d.totals.costUsd, d.previous.costUsd) },
          { label: 'Messages', value: num(d.totals.messages), hint: change(d.totals.messages, d.previous.messages) },
          { label: 'Shops using it', value: num(d.totals.shops) },
          { label: 'Cost per shop', value: usd(perShop) },
        ] : undefined}
      />

      {d ? (
        <>
          <KpiRow cols={4}>
            <KpiCard icon={Zap} color="#7c3aed" label="Tokens" value={compact(d.totals.tokens)} hint={change(d.totals.tokens, d.previous.tokens)} />
            <KpiCard icon={MessageSquare} color="#0891b2" label="Messages per day" value={num(Math.round(d.totals.messages / days))} />
            <KpiCard icon={Coins} color="#059669" label="Cost per message" value={usd(d.totals.messages ? d.totals.costUsd / d.totals.messages : 0)} />
            <KpiCard icon={Store} color="#d97706" label="Top shop share" value={d.totals.costUsd && d.topShops[0] ? `${Math.round((d.topShops[0].costUsd / d.totals.costUsd) * 100)}%` : '—'} hint={d.topShops[0]?.name} />
          </KpiRow>

          <Card title="Cost per day" description="US dollars, Pakistan days.">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.daily} margin={{ top: 6, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tickFormatter={(x: string) => new Date(`${x}T00:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} minTickGap={24} tickLine={false} axisLine={false} fontSize={11} stroke="#94a3b8" />
                  <YAxis tickFormatter={(v: number) => `$${v}`} tickLine={false} axisLine={false} fontSize={11} stroke="#94a3b8" width={48} />
                  <Tooltip formatter={(v) => [usd(Number(v)), 'Cost']} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="costUsd" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-3">
            <ListCard title="Shops that use it most" empty={!d.topShops.length} emptyTitle="No usage in this period" className="xl:col-span-2">
              <Table minWidth="36rem">
                <THead><Tr><Th>Shop</Th><Th align="right">Messages</Th><Th align="right">Tokens</Th><Th align="right">Cost</Th></Tr></THead>
                <TBody>
                  {d.topShops.map((s) => (
                    <Tr key={s.tenantId} interactive onClick={() => navigate(`/tenants/${s.tenantId}`)}>
                      <Td><div className="font-medium text-slate-900">{s.name}</div>{s.slug && <div className="text-[0.75rem] text-slate-500">@{s.slug}</div>}</Td>
                      <Td align="right">{num(s.messages)}</Td>
                      <Td align="right">{compact(s.tokens)}</Td>
                      <Td align="right" className="font-semibold text-slate-900">{usd(s.costUsd)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </ListCard>
            <Card title="By model tier" description="Fast answers cost less than advanced ones.">
              <ul className="space-y-3">
                {d.tiers.map((t) => (
                  <li key={t.tier}>
                    <div className="mb-1 flex items-baseline justify-between text-[0.8125rem]"><span className="font-medium text-slate-900">Nafaa AI · {t.tier}</span><b className="tabular-nums">{usd(t.costUsd)}</b></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{ width: `${d.totals.costUsd ? Math.max(2, (t.costUsd / d.totals.costUsd) * 100) : 0}%` }} /></div>
                    <div className="mt-0.5 text-[0.75rem] text-slate-500">{num(t.messages)} replies · {compact(t.inputTokens)} in · {compact(t.outputTokens)} out · {compact(t.cachedTokens)} cached</div>
                  </li>
                ))}
                {!d.tiers.length && <li className="text-[0.8125rem] text-slate-500">No replies in this period.</li>}
              </ul>
            </Card>
          </div>
        </>
      ) : <Skeleton className="h-96 rounded-3xl" />}

      {guide.isOpen && (
        <PageGuide
          title="Nafaa AI usage"
          description="How much shops use the Nafaa AI assistant and what it costs."
          flowTitle="Where the cost comes from"
          flow={[
            { label: 'Shop asks', hint: 'Assistant drawer', icon: MessageSquare, color: '#0891b2' },
            { label: 'Nafaa AI answers', hint: 'Fast or standard tier', icon: Bot, color: '#7c3aed' },
            { label: 'Tokens counted', hint: 'Cost per reply', icon: Coins, color: '#059669' },
          ]}
          steps={[
            { icon: Coins, color: '#059669', title: 'Watch the daily cost', text: 'A sudden jump usually means one shop is using it heavily.' },
            { icon: Store, color: '#d97706', title: 'Check top shops', text: 'Open a shop to see who they are and whether their plan covers the usage.' },
            { icon: Zap, color: '#7c3aed', title: 'Tiers', text: 'Most questions should go to the fast tier; cached tokens are cheaper.' },
          ]}
          tips={['Costs are in US dollars, as billed.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
