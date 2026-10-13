/**
 * Referrals: your signup link and code, how many shops joined through it,
 * what each one earned, the credit history (rewards and payouts) and the
 * top referrers. Sharing by copy, WhatsApp, email or the phone share sheet.
 *
 * Keys: C copy link · S WhatsApp · / search · 1-3 tabs · G guide.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Award, CheckCircle2, Clock, Copy, Gift, GraduationCap, Link2, ListFilter, Mail, MessageCircle, Share2, Trophy,
  UserPlus, Users, Wallet, XCircle, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge, Button, Card, EmptyState, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField,
  Skeleton, ViewTabs, heroButton, heroIconButton, type BadgeVariant, type FilterOption,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { supportWhatsapp } from '@modules/help/support';
import { referralsApi, type CreditType, type ReferralStatus } from '../api/referrals.api';

type Tab = 'friends' | 'credits' | 'top';
type StatusFilter = 'all' | ReferralStatus;

const STATUS: Record<ReferralStatus, { label: string; hint: string; icon: LucideIcon; color: string; badge: BadgeVariant }> = {
  PENDING: { label: 'Intezar', hint: 'Jur gaye, abhi payment nahi ki', icon: Clock, color: '#d97706', badge: 'warning' },
  CONVERTED: { label: 'Inaam mila', hint: 'Pehli payment ho gayi, credit jur gaya', icon: CheckCircle2, color: '#16a34a', badge: 'success' },
  PAID: { label: 'Payout ho gaya', hint: 'Inaam ada kar diya gaya', icon: Award, color: '#7c3aed', badge: 'brand' },
  EXPIRED: { label: 'Khatam', hint: 'Muddat guzar gayi', icon: XCircle, color: '#94a3b8', badge: 'default' },
};
const CREDIT: Record<CreditType, { label: string; color: string }> = {
  REFERRAL_BONUS: { label: 'Referral inaam', color: '#16a34a' },
  PROMOTIONAL: { label: 'Promotion', color: '#2563eb' },
  REFUND: { label: 'Wapsi', color: '#0891b2' },
  ADJUSTMENT: { label: 'Durusti', color: '#64748b' },
};
const FILTERS: Array<FilterOption<StatusFilter>> = [
  { value: 'all', label: 'Sab' },
  ...(Object.keys(STATUS) as ReferralStatus[]).map((s) => ({ value: s, label: STATUS[s].label, hint: STATUS[s].hint, icon: STATUS[s].icon, color: STATUS[s].color })),
];

const day = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));

export default function ReferralsPage() {
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('friends');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const q = useQuery({ queryKey: ['referrals-me'], queryFn: referralsApi.myDashboard });
  const top = useQuery({ queryKey: ['referrals-leaderboard'], queryFn: referralsApi.leaderboard, enabled: tab === 'top', staleTime: 10 * 60_000 });
  const d = q.data;
  const code = d?.tenant.referralCode ?? '';
  const link = code ? `${window.location.origin}/register?ref=${code}` : '';

  const message = [
    'Assalam-o-Alaikum! Main apni dukaan Nafaa POS par chalata hoon — bikri, stock, khata aur reports sab ek jagah.',
    '',
    `Mere code se shuru karein: ${code}`,
    link,
  ].join('\n');

  const copyLink = () => { if (!link) return; void navigator.clipboard?.writeText(link); toast.success('Link copy ho gaya'); };
  const copyCode = () => { if (!code) return; void navigator.clipboard?.writeText(code); toast.success('Code copy ho gaya'); };
  const whatsapp = () => { if (link) window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener'); };
  const email = () => { if (link) window.location.href = `mailto:?subject=${encodeURIComponent('Nafaa POS try karein')}&body=${encodeURIComponent(message)}`; };
  const share = async () => {
    if (!link) return;
    if (navigator.share) { try { await navigator.share({ title: 'Nafaa POS', text: message, url: link }); } catch { /* closed by the user */ } }
    else copyLink();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (k === 'c') copyLink();
      if (k === 's') whatsapp();
      if (e.key === '/') { e.preventDefault(); setTab('friends'); setTimeout(() => searchRef.current?.focus(), 30); }
      if (e.key === '1') setTab('friends');
      if (e.key === '2') setTab('credits');
      if (e.key === '3') setTab('top');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const friends = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (d?.referrals ?? []).filter((r) => (status === 'all' || r.status === status) && (!term || r.referee?.name?.toLowerCase().includes(term)));
  }, [d?.referrals, search, status]);

  const st = d?.stats;
  const rewardRule = st ? `${formatPKR(st.rewardAmount ?? 0)} ya ${st.rewardPercentage ?? 0}% — jo zyada ho` : '';

  return (
    <PageShell>
      {guide.isOpen && <ReferralGuide rule={rewardRule} onClose={guide.close} />}

      <PageHero
        title="Referrals"
        chip={code ? <><Gift />Code: {code}</> : <><Gift />Dost ko bulayein</>}
        meta="Dukaan-daar dost ko Nafaa par layein, inaam paayein"
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <button type="button" onClick={copyLink} disabled={!link} title="Link copy (C)" className={heroButton}><Copy className="h-4 w-4" /> <span className="hidden sm:inline">Link copy</span></button>
          <button type="button" onClick={whatsapp} disabled={!link} title="WhatsApp par bhejein (S)" className={heroButton}><MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">WhatsApp</span></button>
          <button type="button" onClick={() => void share()} disabled={!link} aria-label="Share" title="Share" className={heroIconButton}><Share2 className="h-4 w-4" /></button>
          <button type="button" onClick={guide.open} aria-label="Guide" title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: 'Kul kamaai', value: st ? formatPKR(st.totalEarned) : '' },
          { label: 'Aap ka credit', value: st ? formatPKR(st.currentCredit) : '' },
          { label: 'Dost jure', value: st ? String(st.totalReferrals) : '' },
          { label: 'Inaam wale', value: st ? String(st.convertedCount) : '' },
        ]}
      />

      <KpiRow cols={4}>
        {q.isLoading || !st ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Clock} color="#d97706" label="Intezar me" value={String(st.pendingCount)} hint="Payment ka intezar · dabayein"
              onClick={() => { setTab('friends'); setStatus(status === 'PENDING' ? 'all' : 'PENDING'); }} active={status === 'PENDING'} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Inaam mila" value={String(st.convertedCount)} hint="dabayein"
              onClick={() => { setTab('friends'); setStatus(status === 'CONVERTED' ? 'all' : 'CONVERTED'); }} active={status === 'CONVERTED'} />
            <KpiCard icon={Gift} color="#db2777" label="Har dost par" value={formatPKR(st.rewardAmount ?? 0)} hint={`ya bill ka ${st.rewardPercentage ?? 0}%, jo zyada ho`} />
            <KpiCard icon={Wallet} color="#7c3aed" label="Credit" value={formatPKR(st.currentCredit)} hint="History · dabayein" onClick={() => setTab('credits')} active={tab === 'credits'} />
          </>
        )}
      </KpiRow>

      <Card className="rounded-3xl">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-[0.8125rem] font-semibold text-slate-800">Aap ka link</p>
            <div className="mt-1.5 flex gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-100/80 px-3 ring-1 ring-slate-200">
                <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate py-2.5 font-mono text-[0.8125rem] text-slate-800">{link || '…'}</span>
              </div>
              <Button onClick={copyLink} disabled={!link}><Copy className="h-4 w-4" /> Copy</Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={copyCode} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 font-mono text-[0.8125rem] font-bold text-brand-800 ring-1 ring-brand-100 hover:bg-brand-100" title="Code copy">
                {code || '—'} <Copy className="h-3.5 w-3.5" />
              </button>
              <Button size="sm" variant="secondary" onClick={whatsapp} disabled={!link}><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
              <Button size="sm" variant="secondary" onClick={email} disabled={!link}><Mail className="h-4 w-4" /> Email</Button>
              <Button size="sm" variant="ghost" onClick={() => void share()} disabled={!link}><Share2 className="h-4 w-4" /> Share</Button>
            </div>
          </div>
          <ol className="space-y-2 text-[0.8125rem] text-slate-700">
            {[
              [UserPlus, 'Dost aap ke link ya code se Nafaa par account banata hai.'],
              [Wallet, 'Wo apni pehli payment karta hai.'],
              [Gift, `Aap ke credit me inaam jur jata hai: ${rewardRule || '…'}.`],
            ].map(([Icon, text], i) => {
              const I = Icon as LucideIcon;
              return (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><I className="h-3.5 w-3.5" /></span>
                  <span className="pt-1">{text as string}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </Card>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd>–<Kbd>3</Kbd> se badlein</>}
        tabs={[
          { id: 'friends', label: 'Dost', icon: Users, count: d?.referrals.length ?? null },
          { id: 'credits', label: 'Credit history', icon: Wallet, count: d?.credits.length ?? null },
          { id: 'top', label: 'Top referrers', icon: Trophy },
        ]} />

      {tab === 'friends' && (
        <>
          <FilterBar
            search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Dukaan ka naam…" label="Dost dhoondein" />}
            chips={status !== 'all' || search.trim() ? <>
              {status !== 'all' && <FilterChip onRemove={() => setStatus('all')}>{STATUS[status].label}</FilterChip>}
              {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
            </> : undefined}
            onClear={() => { setSearch(''); setStatus('all'); }}>
            <FilterMenu icon={ListFilter} label="Haal" value={status} active={status !== 'all'} options={FILTERS} onChange={setStatus} />
          </FilterBar>
          <Box loading={q.isLoading} error={q.isError} onRetry={() => q.refetch()} empty={!friends.length}
            emptyIcon={<UserPlus className="h-6 w-6" />}
            emptyTitle={d?.referrals.length ? 'Is filter me koi nahi' : 'Abhi koi dost nahi jura'}
            emptyText={d?.referrals.length ? 'Filter badal kar dekhein' : 'Link WhatsApp par bhejein — pehla dost judte hi yahan nazar aayega'}
            action={d?.referrals.length ? <Button variant="secondary" onClick={() => { setStatus('all'); setSearch(''); }}>Filter hatayein</Button> : <Button onClick={whatsapp} disabled={!link}><MessageCircle className="h-4 w-4" /> WhatsApp par bhejein</Button>}>
            <ul className="divide-y divide-slate-100">
              {friends.map((r) => {
                const s = STATUS[r.status];
                return (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}17`, color: s.color }}><s.icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-[0.875rem] font-semibold text-slate-900">{r.referee?.name ?? 'Dukaan'} <Badge variant={s.badge} size="xs">{s.label}</Badge></p>
                      <p className="text-[0.75rem] text-slate-500">Jure: {day(r.referee?.createdAt ?? r.createdAt)}{r.convertedAt ? ` · Payment: ${day(r.convertedAt)}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{r.rewardAmount ? formatPKR(r.rewardAmount) : '—'}</p>
                      <p className="text-[0.6875rem] text-slate-500">{r.rewardPaid ? 'ada ho gaya' : r.rewardAmount ? 'credit me' : 'inaam'}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Box>
        </>
      )}

      {tab === 'credits' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
            <p className="text-[0.8125rem] text-slate-600">Credit nikalwane ya agle bill me lagwane ke liye Nafaa support se rabta karein.</p>
            <a href={supportWhatsapp(`Assalam-o-Alaikum, mera referral code ${code} hai. Mujhe apne ${st ? formatPKR(st.currentCredit) : ''} credit ke baare me baat karni hai.`)} target="_blank" rel="noreferrer">
              <Button size="sm" variant="secondary"><MessageCircle className="h-4 w-4" /> Support WhatsApp</Button>
            </a>
          </div>
          <Box loading={q.isLoading} error={q.isError} onRetry={() => q.refetch()} empty={!d?.credits.length}
            emptyIcon={<Wallet className="h-6 w-6" />} emptyTitle="Abhi koi credit nahi" emptyText="Dost ki pehli payment par inaam yahan aayega" action={null}>
            <ul className="divide-y divide-slate-100">
              {(d?.credits ?? []).map((c) => {
                const t = CREDIT[c.type] ?? { label: c.type, color: '#64748b' };
                return (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.875rem] font-semibold text-slate-900">{t.label}</p>
                      <p className="truncate text-[0.75rem] text-slate-500">{day(c.createdAt)}{c.note ? ` · ${c.note}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[0.9375rem] font-bold tabular-nums ${c.amount < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{c.amount < 0 ? '−' : '+'}{formatPKR(Math.abs(c.amount))}</p>
                      <p className="text-[0.6875rem] text-slate-500">Baqi {formatPKR(c.balanceAfter)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Box>
        </>
      )}

      {tab === 'top' && (
        <Box loading={top.isLoading} error={top.isError} onRetry={() => top.refetch()} empty={!top.data?.length}
          emptyIcon={<Trophy className="h-6 w-6" />} emptyTitle="Abhi koi top referrer nahi" emptyText="Pehle dost ko bulayein — aap is list me sab se upar ho sakte hain" action={null}>
          <ol className="divide-y divide-slate-100">
            {(top.data ?? []).map((t, i) => (
              <li key={`${t.name}-${i}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-bold ${i < 3 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{i + 1}</span>
                <span className="flex-1 truncate text-[0.875rem] font-medium text-slate-800">{t.name}</span>
                <span className="text-[0.875rem] font-bold tabular-nums text-slate-900">{t.successfulReferrals}</span>
              </li>
            ))}
          </ol>
        </Box>
      )}
    </PageShell>
  );
}

function Box({ loading, error, onRetry, empty, emptyIcon, emptyTitle, emptyText, action, children }: {
  loading: boolean; error: boolean; onRetry: () => void; empty: boolean; emptyIcon: ReactNode; emptyTitle: string; emptyText: string;
  action: ReactNode; children: ReactNode;
}) {
  if (loading) return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;
  if (error) return <div className="rounded-3xl bg-white ring-1 ring-slate-200/80"><EmptyState title="Load nahi hua" description="Internet check karke dobara koshish karein" action={<Button variant="secondary" onClick={onRetry}>Dobara koshish</Button>} /></div>;
  if (empty) return <div className="rounded-3xl bg-white ring-1 ring-slate-200/80"><EmptyState icon={emptyIcon} title={emptyTitle} description={emptyText} action={action} /></div>;
  return <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">{children}</section>;
}

function ReferralGuide({ rule, onClose }: { rule: string; onClose: () => void }) {
  return (
    <PageGuide title="Referrals — aasaan tareeqa" onClose={onClose}
      steps={[
        { icon: Link2, color: '#2563eb', title: 'Link copy karein', text: 'Upar "Link copy" ya C dabayein. Code alag bhi copy ho sakta hai.' },
        { icon: MessageCircle, color: '#16a34a', title: 'Dost ko bhejein', text: 'WhatsApp, email ya phone ke share se kisi bhi dukaan-daar ko bhejein.' },
        { icon: UserPlus, color: '#7c3aed', title: 'Dost jurta hai', text: 'Wo link se account banata hai — "Dost" tab me "Intezar" me nazar aata hai.' },
        { icon: Gift, color: '#db2777', title: 'Inaam', text: `Us ki pehli payment par aap ke credit me inaam: ${rule || 'tay shuda raqam'}.` },
        { icon: Wallet, color: '#d97706', title: 'Credit history', text: 'Har inaam aur payout ki tareekh aur baqi credit yahan likha hota hai.' },
        { icon: Trophy, color: '#0891b2', title: 'Top referrers', text: 'Sab se zyada dost lane wali dukaanein — doosri dukaanon ke naam chhupe hote hain.' },
      ]}
      tips={['Code bade huroof me hota hai — dost register karte waqt "Referral code" me likh sakta hai.', 'Credit nikalwane ke liye Credit history tab se support ko WhatsApp karein.']}
      shortcuts={[['C', 'link copy'], ['S', 'WhatsApp'], ['/', 'dhoondein'], ['1-3', 'tabs'], ['G', 'guide']]}
    />
  );
}
