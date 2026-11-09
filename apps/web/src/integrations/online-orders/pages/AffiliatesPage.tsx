/**
 * Influencers and affiliates. Each partner has discount codes and a link
 * tag; orders are counted by the code on the order, else the link's
 * utm_campaign, else linked by hand. Commission is a percent of the goods or
 * a fixed amount per delivered order. Paying a period writes an Expense in
 * accounts. Nafaa cannot create Shopify discount codes, so the merchant makes
 * the code on the store and types it here.
 *
 * Keys: N new partner · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BadgePercent, CircleDollarSign, Copy, GraduationCap, Link2, Pencil, Plus, Receipt, ShoppingBag, Tag, Trash2, TrendingUp, Truck, UserPlus, Users, Wallet, X,
} from 'lucide-react';
import {
  Badge, Button, confirmDialog, DateRangeMenu, Drawer, EmptyState, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, resolveRange, Select, Skeleton, Switch,
  Table, TBody, Td, Textarea, Th, THead, Tr, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { useBusinessDayStart } from '@core/lib/business-day';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { useReportRange } from '@modules/reports/prefs';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../api/online-orders.api';
import { retentionApi, type Affiliate, type AffiliateBody, type CommissionType } from '../api/retention.api';
import { OrderDrawer } from '../components/orders/OrderDrawer';
import { STATUS_LABEL, whenText } from '../lib/labels';

const PLATFORMS = [
  { value: 'INSTAGRAM', label: 'Instagram' }, { value: 'TIKTOK', label: 'TikTok' }, { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'FACEBOOK', label: 'Facebook' }, { value: 'OTHER', label: t('Doosra') },
];
const METHODS = [
  { value: 'CASH', label: t('Cash') }, { value: 'BANK_TRANSFER', label: t('Bank transfer') }, { value: 'JAZZCASH', label: 'JazzCash' }, { value: 'EASYPAISA', label: 'Easypaisa' },
];
const LS_STORE = 'nafaa:affiliates:store-url';

/** Link with the partner's tag; the store URL is remembered in this browser. */
export function affiliateLink(base: string, a: Pick<Affiliate, 'slug' | 'platform'>) {
  const clean = base.trim() || 'https://';
  const sep = clean.includes('?') ? '&' : '?';
  return `${clean}${sep}utm_source=${encodeURIComponent((a.platform ?? 'influencer').toLowerCase())}&utm_medium=affiliate&utm_campaign=${encodeURIComponent(a.slug)}`;
}

const commissionText = (a: Pick<Affiliate, 'commissionType' | 'commissionValue'>, money: (n: number) => string) =>
  a.commissionType === 'PERCENT' ? `${a.commissionValue}%` : t('{{value}} / order', { value: money(a.commissionValue) });

export default function AffiliatesPage() {
  const guide = usePageGuide();
  const qc = useQueryClient();
  const { sales: money } = useMasked();
  const startHour = useBusinessDayStart();
  const [range, setRange] = useReportRange('thisMonth');
  const period = resolveRange(range, startHour);
  const [editing, setEditing] = useState<Affiliate | 'new' | null>(null);
  const [open, setOpen] = useState<Affiliate | null>(null);
  const [store, setStore] = useState(() => { try { return localStorage.getItem(LS_STORE) ?? ''; } catch { return ''; } });
  useEffect(() => { try { localStorage.setItem(LS_STORE, store); } catch { /* storage blocked */ } }, [store]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setEditing('new'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const q = useQuery({
    queryKey: ['affiliates', period?.from, period?.to],
    queryFn: () => retentionApi.affiliates({ from: period?.from, to: period?.to }),
    placeholderData: (p) => p,
  });
  const remove = useMutation({
    mutationFn: retentionApi.removeAffiliate,
    onSuccess: (r) => { toast.success(r.archived ? t('Band kar diya (payouts ka hisaab rehta hai)') : t('Hata diya')); qc.invalidateQueries({ queryKey: ['affiliates'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const askRemove = async (a: Affiliate) => {
    if (await confirmDialog({ title: t('{{name}} hatayein?', { name: a.name }), text: t('Jin ko commission di ja chuki hai woh sirf band hote hain.'), danger: true })) remove.mutate(a.id);
  };
  const copyLink = (a: Affiliate) => {
    if (!/^https?:\/\//.test(store.trim())) { toast.error(t('Pehle upar apne store ka link likhein')); return; }
    void navigator.clipboard?.writeText(affiliateLink(store, a));
    toast.success(t('Link copy'));
  };

  const d = q.data;
  const tt = d?.totals;
  return (
    <PageShell>
      <PageHero
        title={t('Influencers & affiliates')}
        chip={<><Users />{t('Codes aur commission')}</>}
        meta={t('Har partner ka code aur link — kitne order aaye, kitni commission banti hai, kitna wapas mila')}
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="thisMonth" allowAll={false} />
          <button type="button" onClick={() => setEditing('new')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {t('Naya partner')}</button>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={tt ? [
          { label: t('Deliver orders'), value: String(tt.delivered), hint: t('{{count}} kul', { count: tt.orders }) },
          { label: t('Partners se sale'), value: money(tt.sales) },
          { label: t('Commission baqi'), value: money(tt.due), hint: t('kul {{value}}', { value: money(tt.commission) }) },
          { label: t('ROI'), value: tt.roi ? t('Rs {{value}}', { value: tt.roi }) : '—', hint: t('har Rs 1 commission par sale') },
        ] : [{ label: t('Deliver orders'), value: '' }, { label: t('Partners se sale'), value: '' }, { label: t('Commission baqi'), value: '' }, { label: t('ROI'), value: '' }]}
      />

      <div className="rounded-2xl bg-sky-50 px-4 py-3 text-[0.8125rem] text-sky-900 ring-1 ring-sky-200">
        {t('Discount code pehle apne store (Shopify / WooCommerce) par khud banayein, phir yahan partner ke saath likhein. Nafaa ko Shopify par code banane ki ijazat nahi — is liye code aap banate hain, ginti Nafaa karta hai.')}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
        <Input wrapperClassName="min-w-[16rem] flex-1" label={t('Store ya product ka link (partner links ke liye)')} value={store} onChange={(e) => setStore(e.target.value)} placeholder="https://yourstore.pk/products/…" />
        <p className="pb-2 text-[0.75rem] text-slate-500">{t('Har partner ke "Link" button se is link me us ka tag jur kar copy hota hai.')}</p>
      </div>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {q.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          : q.isError ? <EmptyState title={t('List nahi khuli')} description={apiErrorMessage(q.error)} action={<Button variant="secondary" onClick={() => q.refetch()}>{t('Dobara koshish')}</Button>} />
          : !d?.affiliates.length ? (
            <EmptyState icon={<UserPlus className="h-5 w-5" />} title={t('Abhi koi partner nahi')} description={t('Influencer ya affiliate jorein — un ke code se aane wale orders khud ginti honge.')}
              action={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>{t('Naya partner')}</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <Table minWidth="58rem" className="[&_table]:text-[0.8125rem]">
                <THead className="text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                  <Tr>
                    <Th className="px-4 py-2 sm:px-5">{t('Partner')}</Th><Th className="px-3 py-2">{t('Code / tag')}</Th><Th className="px-3 py-2 text-end">{t('Orders')}</Th>
                    <Th className="px-3 py-2 text-end">{t('Sale')}</Th><Th className="px-3 py-2 text-end">{t('Commission')}</Th><Th className="px-3 py-2 text-end">{t('Baqi')}</Th>
                    <Th className="px-3 py-2 text-end">{t('ROI')}</Th><Th className="px-4 py-2 sm:px-5" />
                  </Tr>
                </THead>
                <TBody className="divide-y divide-slate-100">
                  {d.affiliates.map((a) => (
                    <Tr key={a.id} className={cn('hover:bg-slate-50/80', !a.active && 'opacity-60')}>
                      <Td className="px-4 py-2.5 sm:px-5">
                        <button type="button" onClick={() => setOpen(a)} className="text-start">
                          <span className="flex items-center gap-1.5 font-semibold text-slate-900 hover:underline">{a.name}{!a.active && <Badge>{t('Band')}</Badge>}</span>
                          <span className="block text-[0.75rem] text-slate-500">{[a.handle && `@${a.handle}`, PLATFORMS.find((p) => p.value === a.platform)?.label, commissionText(a, money)].filter(Boolean).join(' · ')}</span>
                        </button>
                      </Td>
                      <Td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">{a.codes.map((c) => <span key={c} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.6875rem] font-semibold text-slate-700">{c}</span>)}</div>
                        <span className="font-mono text-[0.6875rem] text-slate-400">utm: {a.slug}</span>
                      </Td>
                      <Td className="px-3 py-2.5 text-end tabular-nums">{a.stats.delivered}<span className="text-slate-400"> / {a.stats.orders}</span></Td>
                      <Td className="px-3 py-2.5 text-end tabular-nums">{money(a.stats.sales)}</Td>
                      <Td className="px-3 py-2.5 text-end tabular-nums">{money(a.stats.commission)}</Td>
                      <Td className={cn('px-3 py-2.5 text-end font-semibold tabular-nums', a.stats.due > 0 ? 'text-orange-700' : 'text-slate-400')}>{money(a.stats.due)}</Td>
                      <Td className="px-3 py-2.5 text-end tabular-nums">{a.stats.roi ? `${a.stats.roi}×` : '—'}</Td>
                      <Td className="px-4 py-2.5 sm:px-5">
                        <div className="flex justify-end gap-1">
                          <Button size="xs" variant="secondary" leftIcon={<Receipt className="h-3.5 w-3.5" />} onClick={() => setOpen(a)}>{t('Hisaab')}</Button>
                          <button type="button" onClick={() => copyLink(a)} title={t('Link copy')} aria-label={t('Link copy')} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Link2 className="h-4 w-4" /></button>
                          <button type="button" onClick={() => setEditing(a)} title={t('Badlein')} aria-label={t('Badlein')} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                          <button type="button" onClick={() => void askRemove(a)} title={t('Hatayein')} aria-label={t('Hatayein')} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
      </section>

      {editing && <AffiliateModal a={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {open && <StatementDrawer a={open} from={period?.from} to={period?.to} onClose={() => setOpen(null)} />}
      {guide.isOpen && (
        <PageGuide
          title={t('Influencers & affiliates — aasaan tareeqa')}
          onClose={guide.close}
          flow={[
            { label: t('Partner'), hint: t('Code + link'), icon: UserPlus, color: '#7c3aed' },
            { label: t('Order aaya'), hint: t('Code ya link se'), icon: ShoppingBag, color: '#2563eb' },
            { label: t('Deliver'), hint: t('Tab commission'), icon: Truck, color: '#0d9488' },
            { label: t('Paid'), hint: t('Expense me'), icon: Wallet, color: '#16a34a' },
          ]}
          steps={[
            { icon: Tag, color: '#7c3aed', title: t('Code'), text: t('Store par discount code banayein (jaise AYESHA10), phir partner ke saath yahan likhein. Order par woh code laga ho to order partner ka.') },
            { icon: Link2, color: '#2563eb', title: t('Link'), text: t('Partner ke link me utm_campaign tag hota hai. Code na laga ho to link wala order bhi partner ka ginta hai.') },
            { icon: BadgePercent, color: '#d97706', title: t('Commission'), text: t('Percent (delivery charge ke bagair) ya har deliver order par fixed rupay. RTO aur cancel par kuch nahi.') },
            { icon: Receipt, color: '#0d9488', title: t('Hisaab'), text: t('"Hisaab" me muddat ke orders, commission aur baqi. WhatsApp / phone wala order "Order jorein" se haath se.') },
            { icon: CircleDollarSign, color: '#16a34a', title: t('Paid'), text: t('"Paid karein" commission ko Expense (Influencer & affiliates) me likhta hai. Wohi order dobara kabhi nahi ginta.') },
            { icon: TrendingUp, color: '#db2777', title: t('ROI'), text: t('Har Rs 1 commission par kitni sale aayi. Kam ROI wale partner ko badlein.') },
          ]}
          shortcuts={[['N', t('Naya partner')], ['G', t('Guide')]]}
        />
      )}
    </PageShell>
  );
}

function AffiliateModal({ a, onClose }: { a: Affiliate | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: a?.name ?? '', phone: a?.phone ?? '', kind: a?.kind ?? 'INFLUENCER', platform: a?.platform ?? 'INSTAGRAM', handle: a?.handle ?? '',
    codes: (a?.codes ?? []).join(', '), commissionType: (a?.commissionType ?? 'PERCENT') as CommissionType, commissionValue: String(a?.commissionValue ?? 10),
    slug: a?.slug ?? '', notes: a?.notes ?? '', active: a?.active ?? true,
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const save = useMutation({
    mutationFn: () => {
      const body: AffiliateBody = {
        name: f.name, phone: f.phone || null, kind: f.kind, platform: f.platform, handle: f.handle || null,
        codes: f.codes.split(/[,\n]/).map((c) => c.trim()).filter(Boolean), commissionType: f.commissionType, commissionValue: Number(f.commissionValue) || 0,
        notes: f.notes || null, active: f.active, ...(f.slug.trim() && { slug: f.slug.trim() }),
      };
      return a ? retentionApi.updateAffiliate(a.id, body) : retentionApi.createAffiliate(body);
    },
    onSuccess: () => { toast.success(t('Save ho gaya')); qc.invalidateQueries({ queryKey: ['affiliates'] }); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <Modal open onClose={onClose} size="lg" title={a ? t('{{name}} badlein', { name: a.name }) : t('Naya partner')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('Band karein')}</Button><Button loading={save.isPending} disabled={!f.name.trim()} onClick={() => save.mutate()}>{t('Save karein')}</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label={t('Naam')} value={f.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} autoFocus />
        <Input label={t('Phone (marzi)')} value={f.phone} onChange={(e) => set({ phone: e.target.value })} inputMode="tel" />
        <Select label={t('Qism')} value={f.kind} onChange={(e) => set({ kind: e.target.value as typeof f.kind })} options={[{ value: 'INFLUENCER', label: t('Influencer') }, { value: 'AFFILIATE', label: t('Affiliate') }]} />
        <div className="grid grid-cols-2 gap-2">
          <Select label={t('Platform')} value={f.platform} onChange={(e) => set({ platform: e.target.value })} options={PLATFORMS} />
          <Input label={t('Handle')} value={f.handle} onChange={(e) => set({ handle: e.target.value })} placeholder="@ayesha" />
        </div>
        <Input wrapperClassName="sm:col-span-2" label={t('Discount codes (comma se alag)')} value={f.codes} onChange={(e) => set({ codes: e.target.value.toUpperCase() })} placeholder="AYESHA10, AYESHA15"
          hint={t('Code pehle store par banayein — Nafaa Shopify par code nahi banata.')} />
        <div className="grid grid-cols-2 gap-2">
          <Select label={t('Commission')} value={f.commissionType} onChange={(e) => set({ commissionType: e.target.value as CommissionType })}
            options={[{ value: 'PERCENT', label: t('Percent %') }, { value: 'FIXED', label: t('Fixed / order') }]} />
          <Input type="number" min={0} label={f.commissionType === 'PERCENT' ? t('Kitna %') : t('Rupay har order')} value={f.commissionValue} onChange={(e) => set({ commissionValue: e.target.value })} />
        </div>
        <Input label={t('Link tag (utm_campaign)')} value={f.slug} onChange={(e) => set({ slug: e.target.value })} placeholder={t('Khali = naam se')} className="font-mono" />
        <Textarea wrapperClassName="sm:col-span-2" label={t('Note')} value={f.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} maxLength={500} />
        {a && <Switch label={t('Chalu')} checked={f.active} onChange={(e) => set({ active: e.target.checked })} />}
      </div>
    </Modal>
  );
}

function StatementDrawer({ a, from, to, onClose }: { a: Affiliate; from?: string; to?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { sales: money } = useMasked();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [linkNo, setLinkNo] = useState('');
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [note, setNote] = useState('');
  const key = ['affiliates', 'statement', a.id, from, to];
  const q = useQuery({ queryKey: key, queryFn: () => retentionApi.statement(a.id, { from, to }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['affiliates'] });
  const link = useMutation({
    mutationFn: () => retentionApi.linkOrder(a.id, { orderNo: linkNo.trim() }),
    onSuccess: () => { toast.success(t('Order jur gaya')); setLinkNo(''); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const unlink = useMutation({ mutationFn: (oid: string) => retentionApi.unlinkOrder(a.id, oid), onSuccess: refresh, onError: (e) => toast.error(apiErrorMessage(e)) });
  const pay = useMutation({
    mutationFn: () => retentionApi.pay(a.id, { from, to, paymentMethod: method, note: note || undefined }),
    onSuccess: (p) => { toast.success(t('{{amount}} paid — Expense {{no}}', { amount: money(p.amount), no: p.expenseNumber ?? '' })); setPaying(false); setNote(''); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const st = q.data;
  const SRC = useMemo(() => ({ CODE: t('Code'), UTM: t('Link'), MANUAL: t('Haath se') }), []);
  return (
    <Drawer open onClose={onClose} size="lg" title={a.name} description={`${commissionText(a, money)} · ${from ?? ''} → ${to ?? ''}`}
      footer={st && st.totals.due > 0 ? (
        paying ? (
          <div className="flex w-full flex-wrap items-end gap-2">
            <Select wrapperClassName="w-40" size="sm" label={t('Kaise diya')} value={method} onChange={(e) => setMethod(e.target.value)} options={METHODS} />
            <Input wrapperClassName="min-w-[10rem] flex-1" size="sm" label={t('Note')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
            <Button size="sm" variant="ghost" onClick={() => setPaying(false)}>{t('Rehne dein')}</Button>
            <Button size="sm" variant="success" loading={pay.isPending} onClick={() => pay.mutate()}>{t('{{amount}} paid', { amount: money(st.totals.due) })}</Button>
          </div>
        ) : <Button className="w-full" variant="success" leftIcon={<Wallet className="h-4 w-4" />} onClick={() => setPaying(true)}>{t('Paid karein — {{amount}}', { amount: money(st.totals.due) })}</Button>
      ) : undefined}>
      {!st ? <Skeleton className="h-48 rounded-xl" /> : (
        <div className="space-y-4">
          <KpiRow cols={4}>
            <KpiCard icon={Truck} color="#0d9488" label={t('Deliver')} value={st.totals.delivered} hint={t('{{count}} raste me', { count: st.totals.pending })} />
            <KpiCard icon={ShoppingBag} color="#2563eb" label={t('Sale')} value={money(st.totals.sales)} />
            <KpiCard icon={BadgePercent} color="#d97706" label={t('Commission')} value={money(st.totals.commission)} hint={t('{{value}} paid', { value: money(st.totals.paid) })} />
            <KpiCard icon={Wallet} color="#ea580c" label={t('Baqi')} value={money(st.totals.due)} hint={st.totals.roi ? t('ROI {{value}}×', { value: st.totals.roi }) : undefined} />
          </KpiRow>
          <div className="flex items-end gap-2">
            <Input wrapperClassName="flex-1" size="sm" label={t('Order jorein (WhatsApp / phone wala)')} value={linkNo} onChange={(e) => setLinkNo(e.target.value)} placeholder={t('Order no, jaise M-1024')} />
            <Button size="sm" variant="secondary" leftIcon={<Plus className="h-4 w-4" />} disabled={!linkNo.trim()} loading={link.isPending} onClick={() => link.mutate()}>{t('Jorein')}</Button>
          </div>
          {!st.lines.length ? <EmptyState icon={<ShoppingBag className="h-5 w-5" />} title={t('Is muddat me koi order nahi')} /> : (
            <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
              {st.lines.map((l) => {
                const s = STATUS_LABEL[l.status as keyof typeof STATUS_LABEL] ?? STATUS_LABEL.PENDING;
                return (
                  <li key={l.orderId} className="flex items-center gap-3 px-3 py-2.5">
                    <button type="button" onClick={() => setOrderId(l.orderId)} className="min-w-0 flex-1 text-start">
                      <span className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-900">
                        #{l.no} <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem]', s.tone)}>{s.short}</span>
                        <Badge variant={l.source === 'CODE' ? 'brand' : l.source === 'UTM' ? 'info' : 'default'}>{SRC[l.source]}{l.code ? ` ${l.code}` : ''}</Badge>
                        {l.paid && <Badge variant="success">{t('Paid')}</Badge>}
                      </span>
                      <span className="block truncate text-[0.75rem] text-slate-500">{l.customer}{l.city ? ` · ${l.city}` : ''} · {whenText(l.receivedAt)}</span>
                    </button>
                    <span className="text-end text-[0.8125rem] tabular-nums">
                      <span className="block font-semibold text-slate-900">{money(l.commission)}</span>
                      <span className="block text-[0.6875rem] text-slate-400">{money(l.total)}</span>
                    </span>
                    {l.manual && <button type="button" onClick={() => unlink.mutate(l.orderId)} title={t('Hatayein')} aria-label={t('Hatayein')} className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button>}
                  </li>
                );
              })}
            </ul>
          )}
          {!!st.payouts.length && (
            <div>
              <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-400">{t('Pichhli payments')}</p>
              <div className="overflow-x-auto">
                <Table className="[&_table]:text-[0.8125rem]">
                  <TBody className="divide-y divide-slate-100">
                    {st.payouts.map((p) => (
                      <Tr key={p.id}>
                        <Td className="py-2">{whenText(p.paidAt)}</Td>
                        <Td className="py-2 text-slate-500">{t('{{count}} order', { count: p.orders })}</Td>
                        <Td className="py-2 font-mono text-[0.75rem] text-slate-500">{p.expenseNumber}</Td>
                        <Td className="py-2 text-end font-semibold tabular-nums">{money(p.amount)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            </div>
          )}
          <button type="button" onClick={() => { void navigator.clipboard?.writeText(a.codes.join(', ')); toast.success(t('Codes copy')); }}
            className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-slate-500 hover:underline"><Copy className="h-3.5 w-3.5" />{t('Codes copy')}</button>
        </div>
      )}
      {orderId && <OrderDrawer orderId={orderId} onClose={() => setOrderId(null)} />}
    </Drawer>
  );
}
