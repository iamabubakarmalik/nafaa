/**
 * Support reports: chats per day, how fast the team first replies, how long
 * chats take to resolve, shop ratings and numbers per agent, for a period.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bot, CheckCircle2, Clock, Lightbulb, MessagesSquare, ThumbsUp } from 'lucide-react';
import { Card, KpiCard, KpiRow, PageHero, PageShell, Segmented, Table, TBody, Td, Th, THead, Tr, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminSupportApi } from '@/api/admin-support.api';
import { num } from '@/lib/format';
import { SERIES, useChartColors } from '@/ui';
import { durationText } from '../lib/live';

const pkDay = (offsetDays: number) => new Date(Date.now() - offsetDays * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });

export default function SupportReportsPage() {
  const guide = usePageGuide();
  const [days, setDays] = useState<'7' | '30' | '90'>('30');
  const from = pkDay(Number(days) - 1);
  const to = pkDay(0);
  const q = useQuery({ queryKey: ['support', 'reports', from, to], queryFn: () => adminSupportApi.reports(from, to) });
  const d = q.data;
  const colors = useChartColors();

  return (
    <PageShell>
      <PageHero
        title="Support reports"
        back="/support"
        backLabel="Support"
        chip={`Last ${days} days`}
        busy={q.isFetching}
        loading={q.isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={d ? [
          { label: 'Chats', value: num(d.totals.conversations), hint: `${num(d.totals.handedOver)} came to the team` },
          { label: 'First reply (median)', value: durationText(d.firstResponse.medianSec), hint: `average ${durationText(d.firstResponse.avgSec)}` },
          { label: 'Resolved in (median)', value: durationText(d.resolution.medianSec), hint: `${num(d.totals.resolved)} resolved` },
          { label: 'Happy shops', value: d.rating.score == null ? '—' : `${d.rating.score}%`, hint: `${num(d.rating.up)} 👍 · ${num(d.rating.down)} 👎` },
        ] : undefined}
      />
      <Segmented value={days} onChange={setDays} label="Period" items={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} />
      {d && (
        <>
          <KpiRow cols={4}>
            <KpiCard icon={MessagesSquare} color="#0ea5e9" label="Chats" value={num(d.totals.conversations)} />
            <KpiCard icon={Bot} color="#7c3aed" label="Answered by Nafaa AI only" value={num(d.totals.answeredByAiOnly)} />
            <KpiCard icon={Clock} color="#d97706" label="Still open" value={num(d.totals.open)} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Resolved" value={num(d.totals.resolved)} />
          </KpiRow>
          <Card title="Chats per day">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.perDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: colors.text }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: colors.text }} width={32} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="conversations" name="Chats" fill={colors.line} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="handedOver" name="Came to the team" fill={SERIES[2]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" name="Resolved" fill={colors.second} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="By agent" flush>
            <Table minWidth="36rem">
              <THead><Tr><Th>Agent</Th><Th align="right">Replies</Th><Th align="right">Chats</Th><Th align="right">Resolved</Th><Th align="right"><ThumbsUp className="inline h-3.5 w-3.5" /> / 👎</Th></Tr></THead>
              <TBody>
                {d.agents.map((a) => (
                  <Tr key={a.id}><Td className="font-medium">{a.name}</Td><Td align="right">{num(a.replies)}</Td><Td align="right">{num(a.conversations)}</Td><Td align="right">{num(a.resolved)}</Td><Td align="right">{num(a.up)} / {num(a.down)}</Td></Tr>
                ))}
                {!d.agents.length && <Tr><Td colSpan={5} className="py-6 text-center text-slate-500">No team replies in this period.</Td></Tr>}
              </TBody>
            </Table>
          </Card>
        </>
      )}
      {guide.isOpen && (
        <PageGuide
          title="Support reports"
          steps={[
            { icon: Clock, color: '#d97706', title: 'First reply', text: 'Time from the shop asking for the team to the first team reply (chats the team started are left out).' },
            { icon: CheckCircle2, color: '#16a34a', title: 'Resolution', text: 'Time from the start of a chat to Resolved.' },
            { icon: ThumbsUp, color: '#0ea5e9', title: 'Ratings', text: 'Shops rate a chat after it is resolved.' },
          ]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
