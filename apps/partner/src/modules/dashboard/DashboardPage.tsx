/**
 * Partner home: this month against target, money, today's follow-ups,
 * lead funnel, the partner's plan, next bonus and the leaderboard.
 */

import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarClock, Crown, Gift, Link2, MapPinPlus, MessageCircle, Phone, Sparkles, Trophy, Wallet } from 'lucide-react';
import { Badge, Button, PageHero, PageShell, heroButton, heroPrimaryButton } from '@/design-system/components';
import { partnerApi } from '@/api/partner.api';
import type { Dashboard, Plan } from '@/api/types';
import { useAuthStore } from '@/store/auth.store';
import { STAGES, STAGE, STAGE_PATH, INTEREST } from '@/lib/labels';
import { monthLabel, num, percent, pkr, relativeDay } from '@/lib/format';
import { telLink, waLink } from '@/lib/phone';
import { cn } from '@/lib/cn';
import { Progress } from '@/ui/Progress';
import { Section } from '@/ui/Section';
import { PageSkeleton, QueryError } from '@/ui/QueryState';
import { usePayout } from '@/modules/earnings/usePayout';

function planLines(plan: Plan): string[] {
  const out: string[] = [];
  if (plan.signupBonus > 0) out.push(`Har paid Signup par ${pkr(plan.signupBonus)}`);
  if (plan.activationBonus > 0) out.push(`Dukaan ${plan.activationDays} din me ${plan.activationSales} ${plan.activationSales === 1 ? 'bill' : 'bills'} bana le to ${pkr(plan.activationBonus)} alag se`);
  if (plan.recurringPercent > 0) out.push(`Dukaan ki har payment ka ${plan.recurringPercent}%, ${plan.recurringMonths} mahine tak`);
  if (plan.managerOverridePercent > 0) out.push(`Aap ki team ki kamai par ${plan.managerOverridePercent}% alag se`);
  for (const s of plan.slabs) out.push(`Ek mahine me ${s.signups} paid Signups par ${pkr(s.bonus)} bonus`);
  return out;
}

function Money({ d }: { d: Dashboard }) {
  const { ask, busy } = usePayout();
  const e = d.earnings;
  const can = e.available >= e.minPayout;
  const tiles = [
    { label: 'Payout ke liye tayyar', value: e.available, tone: 'text-brand-700', big: true },
    { label: 'Intezar me', value: e.pending, tone: 'text-amber-700' },
    { label: 'Mil chuka', value: e.paid, tone: 'text-slate-900' },
  ];
  return (
    <Section title="Kamai" action={<Link to="/earnings" className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700">Tafseel <ArrowRight className="h-3.5 w-3.5" /></Link>}>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className={cn('rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/70', t.big && 'col-span-2 bg-brand-50 ring-brand-100 sm:col-span-1')}>
            <p className="text-[0.75rem] font-medium text-slate-500">{t.label}</p>
            <p className={cn('mt-0.5 font-bold tabular-nums tracking-tight', t.tone, t.big ? 'text-2xl' : 'text-lg')}>{pkr(t.value)}</p>
          </div>
        ))}
      </div>
      {e.requested > 0 && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] font-medium text-amber-900 ring-1 ring-amber-200">{pkr(e.requested)} ki payout request Nafaa ke paas hai.</p>}
      <Button className="mt-3" size="lg" fullWidth disabled={!can} loading={busy} onClick={() => void ask(e.available)} leftIcon={<Wallet className="h-5 w-5" />}>
        Payout mangwayein
      </Button>
      {!can && e.requested === 0 && <p className="mt-1.5 text-center text-[0.8125rem] text-slate-500">Kam az kam {pkr(e.minPayout)} hone par payout mangwa sakte hain</p>}
    </Section>
  );
}

function TargetCard({ d }: { d: Dashboard }) {
  const m = d.thisMonth;
  const t = d.target;
  return (
    <Section title={`${monthLabel(d.month)} ka Target`} action={!t ? <Badge size="sm">Target set nahi</Badge> : undefined}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Progress label="Visits" value={m.visits} target={t?.visits} tone="blue" />
        <Progress label="Signups" value={m.signups} target={t?.signups} />
        <Progress label="Activations" value={m.activations} target={t?.activations} tone="amber" />
        <Progress label="Paid" value={m.paid} tone="green" />
      </div>
    </Section>
  );
}

function FollowUps({ d }: { d: Dashboard }) {
  return (
    <Section title={<span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-brand-600" />Aaj ke follow-up</span>}
      action={d.followUps.length ? <Link to="/leads?due=1" className="text-[0.8125rem] font-semibold text-brand-700">Sab dekhein</Link> : undefined}>
      {d.followUps.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-[0.875rem] text-slate-500">Aaj koi follow-up nahi. Naye Visit karein!</p>
      ) : (
        <ul className="-mx-1 divide-y divide-slate-100">
          {d.followUps.map((f) => (
            <li key={f.id} className="flex items-center gap-2 px-1 py-2.5">
              <Link to={`/leads/${f.id}`} className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{f.shopName}</p>
                <p className="flex items-center gap-1.5 truncate text-[0.8125rem] text-slate-500">
                  <span className={cn(relativeDay(f.followUpAt) !== 'Aaj' && 'font-semibold text-rose-600')}>{relativeDay(f.followUpAt)}</span>
                  {f.ownerName && <>· {f.ownerName}</>}
                  {f.interest && INTEREST[f.interest] && <Badge size="xs" variant={INTEREST[f.interest].badge}>{INTEREST[f.interest].label}</Badge>}
                </p>
              </Link>
              <a href={telLink(f.phone)} aria-label="Call" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Phone className="h-4 w-4" /></a>
              <a href={waLink(f.phone)} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700"><MessageCircle className="h-4 w-4" /></a>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/** Leads that reached each stage (a paid shop also counts as visited, signed up…); Lost on its own. */
function reached(d: Dashboard): Record<string, number> {
  const out: Record<string, number> = {};
  let running = 0;
  for (const s of [...STAGE_PATH].reverse()) { running += d.leads[s] ?? 0; out[s] = running; }
  out.VISITED += d.leads.LOST ?? 0;
  out.LOST = d.leads.LOST ?? 0;
  return out;
}

function Funnel({ d }: { d: Dashboard }) {
  const counts = reached(d);
  const max = Math.max(1, ...STAGES.map((s) => counts[s] ?? 0));
  return (
    <Section title="Leads ka safar" action={<Link to="/leads" className="text-[0.8125rem] font-semibold text-brand-700">Leads</Link>}>
      <ul className="space-y-2">
        {STAGES.map((s) => (
          <li key={s}>
            <Link to={`/leads?stage=${s}`} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-[0.875rem] font-medium text-slate-600">{STAGE[s].label}</span>
              <span className="relative h-7 flex-1 overflow-hidden rounded-lg bg-slate-100">
                <span className="absolute inset-y-0 start-0 rounded-lg" style={{ width: `${Math.max(counts[s] ? 6 : 0, percent(counts[s] ?? 0, max))}%`, backgroundColor: STAGE[s].color, opacity: 0.85 }} />
              </span>
              <span className="w-8 shrink-0 text-end font-bold tabular-nums text-slate-900">{num(counts[s] ?? 0)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[0.75rem] text-slate-500">Har stage tak pohanchne wali leads</p>
    </Section>
  );
}

function PlanCard({ d }: { d: Dashboard }) {
  if (!d.plan) return null;
  const lines = planLines(d.plan);
  const slab = d.nextSlab;
  return (
    <Section title={<span className="flex items-center gap-2"><Gift className="h-4 w-4 text-brand-600" />Aap ka plan: {d.plan.name}</span>}>
      {slab && (
        <div className="mb-3 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-3.5 ring-1 ring-amber-200">
          <p className="flex items-center gap-1.5 text-[0.8125rem] font-bold text-amber-800"><Sparkles className="h-4 w-4" /> Agla bonus</p>
          <p className="mt-1 text-[0.9375rem] font-semibold text-slate-900">
            {Math.max(0, slab.signups - d.thisMonth.paid)} aur paid Signups par {pkr(slab.bonus)}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80">
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${percent(d.thisMonth.paid, slab.signups)}%` }} />
          </div>
          <p className="mt-1 text-[0.75rem] text-amber-800/80">Is mahine {d.thisMonth.paid} / {slab.signups}</p>
        </div>
      )}
      {lines.length ? (
        <ul className="space-y-2">
          {lines.map((l) => (
            <li key={l} className="flex gap-2.5 text-[0.9375rem] text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />{l}</li>
          ))}
        </ul>
      ) : <p className="text-[0.875rem] text-slate-500">Plan ki raqam abhi set nahi hui.</p>}
      {d.plan.clawbackDays > 0 && <p className="mt-3 text-[0.8125rem] text-slate-500">Commission {d.plan.clawbackDays} din baad payout ke liye tayyar hota hai (agar dukaan ne paise wapas na liye hon).</p>}
    </Section>
  );
}

function Leaderboard({ d }: { d: Dashboard }) {
  const lb = d.leaderboard;
  return (
    <Section title={<span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" />Top partners</span>}
      action={<span className="whitespace-nowrap rounded-full bg-brand-50 px-2.5 py-1 text-[0.75rem] font-bold text-brand-800 ring-1 ring-brand-100">Aap ka number: {lb.myRank ? `#${lb.myRank}` : '—'}</span>}>
      {lb.top.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-[0.875rem] text-slate-500">Is mahine abhi kisi ka Signup nahi. Pehle aap!</p>
      ) : (
        <ol className="space-y-1">
          {lb.top.map((r) => (
            <li key={r.rank} className={cn('flex items-center gap-3 rounded-xl px-2.5 py-2', r.me ? 'bg-brand-50 ring-1 ring-brand-200' : '')}>
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-bold',
                r.rank === 1 ? 'bg-amber-100 text-amber-700' : r.rank === 2 ? 'bg-slate-200 text-slate-700' : r.rank === 3 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500')}>
                {r.rank === 1 ? <Crown className="h-3.5 w-3.5" /> : r.rank}
              </span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold text-slate-900">{r.name || 'Partner'}{r.me && ' (aap)'}</span>
                {r.city && <span className="text-[0.8125rem] text-slate-500"> · {r.city}</span>}
              </span>
              <span className="shrink-0 text-end text-[0.8125rem] tabular-nums text-slate-500"><b className="text-slate-900">{r.paid}</b> paid · {r.signups} signup</span>
            </li>
          ))}
        </ol>
      )}
      {lb.total > 0 && <p className="mt-2 text-[0.75rem] text-slate-500">Kul {lb.total} partners ke Signups is mahine</p>}
    </Section>
  );
}

export default function DashboardPage() {
  const me = useAuthStore((s) => s.me);
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ['dashboard'], queryFn: partnerApi.dashboard, refetchInterval: 2 * 60_000 });
  const first = (me?.fullName ?? '').split(' ')[0];

  if (q.isPending) return <PageShell><PageSkeleton /></PageShell>;
  if (q.isError) return <PageShell><QueryError error={q.error} onRetry={() => void q.refetch()} /></PageShell>;
  const d = q.data;

  return (
    <PageShell>
      <PageHero
        title={`Salaam, ${first}`}
        chip={monthLabel(d.month)}
        busy={q.isFetching}
        actions={<>
          <button type="button" className={heroButton} onClick={() => navigate('/share')}><Link2 className="h-4 w-4" />Mera link</button>
          <button type="button" className={heroPrimaryButton} onClick={() => navigate('/visit/new')}><MapPinPlus className="h-4 w-4" />Naya Visit</button>
        </>}
        stats={[
          { label: 'Payout ke liye tayyar', value: pkr(d.earnings.available) },
          { label: 'Aaj ke visits', value: num(d.today.visits) },
          { label: 'Is mahine Signups', value: num(d.thisMonth.signups) },
          { label: 'Is mahine Paid', value: num(d.thisMonth.paid) },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <TargetCard d={d} />
          <FollowUps d={d} />
          <Funnel d={d} />
        </div>
        <div className="space-y-4">
          <Money d={d} />
          <PlanCard d={d} />
          <Leaderboard d={d} />
        </div>
      </div>
    </PageShell>
  );
}
