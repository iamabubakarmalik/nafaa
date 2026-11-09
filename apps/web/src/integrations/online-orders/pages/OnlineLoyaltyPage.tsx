/**
 * Loyalty and referral for online customers, on the counter's own loyalty
 * program (same points balance, same rate and redemption). With online
 * loyalty on, an online order earns points when it is delivered, never on a
 * parcel that comes back. Each customer can get a referral code: the friend
 * gets a discount, the customer gets points when the friend's order is
 * delivered.
 *
 * Keys: / search customer · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Award, Copy, Gift, GraduationCap, Link2, MessageCircle, Package, Save, Share2, Truck, UserPlus, Users, X } from 'lucide-react';
import {
  Badge, Button, Card, EmptyState, Input, KpiCard, KpiRow, PageHero, PageShell, SearchField, Select, Skeleton, Switch, Table, TBody, Td, Th, THead, Tr, heroButton, heroIconButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { t } from '@core/i18n';
import { apiErrorMessage, onlineOrdersApi } from '../api/online-orders.api';
import { retentionApi, type LoyaltyCustomer, type RetentionSettings } from '../api/retention.api';
import { OrderDrawer } from '../components/orders/OrderDrawer';
import { timeAgo, waNumber } from '../lib/labels';
import { waLink } from '../lib/retention';

const STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'default' | 'danger' }> = {
  DONE: { label: t('Mil gaye'), variant: 'success' },
  PENDING: { label: t('Deliver ka intezar'), variant: 'warning' },
  REVERSED: { label: t('Wapas liye'), variant: 'danger' },
  CANCELLED: { label: t('Hataya'), variant: 'default' },
};

export default function OnlineLoyaltyPage() {
  const guide = usePageGuide();
  const qc = useQueryClient();
  const { sales: money } = useMasked();
  const shop = useAuthStore((s) => s.tenant?.name) ?? '';
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [draft, setDraft] = useState<RetentionSettings | null>(null);
  const [perRupees, setPerRupees] = useState<string | null>(null);
  const [linkNo, setLinkNo] = useState('');
  const [linkCode, setLinkCode] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  useEffect(() => { const id = setTimeout(() => setTerm(search.trim()), 300); return () => clearTimeout(id); }, [search]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const q = useQuery({ queryKey: ['online-loyalty'], queryFn: () => retentionApi.loyalty(90) });
  const people = useQuery({ queryKey: ['online-loyalty', 'customers', term], queryFn: () => retentionApi.loyaltyCustomers(term || undefined), placeholderData: (p) => p });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['online-loyalty'] }); qc.invalidateQueries({ queryKey: ['retention-settings'] }); };
  const d = q.data;
  const s = draft ?? d?.settings ?? null;
  const per = perRupees ?? (s?.loyalty.pointsPerRupee ? String(Math.round(1 / s.loyalty.pointsPerRupee)) : '');
  const counterPer = d?.counter.pointsPerRupee ? Math.round(1 / d.counter.pointsPerRupee) : 100;

  const save = useMutation({
    mutationFn: () => {
      if (!s) throw new Error('');
      const n = Number(per);
      return retentionApi.saveSettings({ loyalty: { enabled: s.loyalty.enabled, pointsPerRupee: per && n > 0 ? 1 / n : null }, referral: s.referral });
    },
    onSuccess: () => { toast.success(t('Save ho gaya')); setDraft(null); setPerRupees(null); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const code = useMutation({
    mutationFn: (c: LoyaltyCustomer) => retentionApi.referralCode(c.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['online-loyalty', 'customers'] }),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const link = useMutation({
    mutationFn: async () => {
      const no = linkNo.trim().replace(/^#/, '');
      const found = (await onlineOrdersApi.list({ search: no, limit: 5 } as never)).items.find((o) => [o.externalOrderNumber, o.externalOrderId].some((x) => String(x ?? '').replace(/^#/, '') === no));
      if (!found) throw new Error(t('Order #{{no}} nahi mila', { no }));
      return retentionApi.linkReferral({ orderId: found.id, code: linkCode.trim() });
    },
    onSuccess: (e) => { toast.success(e.status === 'DONE' ? t('Referral jur gaya — points de diye') : t('Referral jur gaya — deliver hone par points milenge')); setLinkNo(''); setLinkCode(''); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const unlink = useMutation({
    mutationFn: retentionApi.unlinkReferral,
    onSuccess: refresh,
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const discountText = s ? (s.referral.friendDiscountType === 'PERCENT' ? `${s.referral.friendDiscount}%` : money(s.referral.friendDiscount)) : '';
  const shareText = (c: LoyaltyCustomer, cd: string) => t('Assalam o Alaikum {{name}}! Ye aap ka {{shop}} referral code hai: {{code}}. Dost ko dein — unhein {{discount}} discount, aur un ka order deliver hone par aap ko {{points}} points.', {
    name: c.name.split(' ')[0], shop, code: cd, discount: discountText, points: s?.referral.referrerPoints ?? 0,
  });
  const share = async (c: LoyaltyCustomer) => {
    const cd = c.code ?? (await code.mutateAsync(c)).code;
    const href = waLink(waNumber(c.phone), shareText(c, cd));
    if (href) window.open(href, '_blank', 'noopener');
    else { await navigator.clipboard?.writeText(cd); toast.success(t('Code copy: {{code}}', { code: cd })); }
  };
  const set = (patch: Partial<RetentionSettings['loyalty']> | null, ref?: Partial<RetentionSettings['referral']>) => {
    if (!s) return;
    setDraft({ ...s, loyalty: { ...s.loyalty, ...(patch ?? {}) }, referral: { ...s.referral, ...(ref ?? {}) } });
  };

  return (
    <PageShell>
      <PageHero
        title={t('Loyalty & referral')}
        chip={<><Award />{t('Online customers')}</>}
        meta={t('Deliver hone par points, aur dost laane par inaam — counter wala loyalty program hi')}
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <Link to="/loyalty" className={heroButton}><Award className="h-4 w-4" /> <span className="hidden sm:inline">{t('Points ki list')}</span></Link>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={d ? [
          { label: t('Points diye'), value: d.stats.pointsGiven.toLocaleString(), hint: t('{{count}} order (90 din)', { count: d.stats.ordersEarned }) },
          { label: t('Referral'), value: String(d.stats.referralsDone), hint: t('{{count}} intezar me', { count: d.stats.referralsPending }) },
          { label: t('Referral se sale'), value: money(d.stats.referralSales) },
          { label: t('Codes diye'), value: String(d.stats.codes) },
        ] : [{ label: t('Points diye'), value: '' }, { label: t('Referral'), value: '' }, { label: t('Referral se sale'), value: '' }, { label: t('Codes diye'), value: '' }]}
      />

      {d && !d.counter.enabled && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <span className="min-w-0 flex-1">{t('Loyalty program abhi band hai. Online points aur referral isi program se chalte hain — pehle use chalu karein.')}</span>
          <Link to="/loyalty" className="font-semibold underline">{t('Loyalty chalu karein')}</Link>
        </div>
      )}

      {!s ? <Skeleton className="h-56 rounded-3xl" /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl" title={t('Online orders par points')} description={t('Points sirf deliver hone par — wapas aaye parcel par kabhi nahi.')}>
            <Switch label={t('Deliver hone par points dein')} checked={s.loyalty.enabled} onChange={(e) => set({ enabled: e.target.checked })}
              description={t('Band ho to online bill banate hi counter jaise points milte hain.')} />
            <Input wrapperClassName="mt-3" type="number" min={1} label={t('Har kitne rupay par 1 point')} value={per} onChange={(e) => setPerRupees(e.target.value)}
              placeholder={String(counterPer)} hint={t('Khali chhorein to counter wala: Rs {{value}} par 1 point', { value: counterPer })} />
          </Card>
          <Card className="rounded-2xl" title={t('Referral')} description={t('Customer apna code dost ko deta hai.')}>
            <Switch label={t('Referral chalu')} checked={s.referral.enabled} onChange={(e) => set(null, { enabled: e.target.checked })} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Select label={t('Dost ka discount')} value={s.referral.friendDiscountType} onChange={(e) => set(null, { friendDiscountType: e.target.value as 'PERCENT' | 'FIXED' })}
                options={[{ value: 'PERCENT', label: t('Percent %') }, { value: 'FIXED', label: t('Rupay') }]} />
              <Input type="number" min={0} label={s.referral.friendDiscountType === 'PERCENT' ? t('Kitna %') : t('Kitne rupay')} value={String(s.referral.friendDiscount)}
                onChange={(e) => set(null, { friendDiscount: Number(e.target.value) || 0 })} />
              <Input type="number" min={0} label={t('Customer ko points')} value={String(s.referral.referrerPoints)} onChange={(e) => set(null, { referrerPoints: Number(e.target.value) || 0 })} />
              <div className="flex items-end pb-1"><Switch size="sm" label={t('Sirf naya dost')} checked={s.referral.newOnly} onChange={(e) => set(null, { newOnly: e.target.checked })} /></div>
            </div>
          </Card>
          <div className="flex justify-end lg:col-span-2">
            <Button leftIcon={<Save className="h-4 w-4" />} loading={save.isPending} disabled={!draft && perRupees === null} onClick={() => save.mutate()}>{t('Save karein')}</Button>
          </div>
        </div>
      )}

      <KpiRow cols={3}>
        <KpiCard icon={Truck} color="#0d9488" label={t('Deliver par points')} value={d ? d.stats.ordersEarned : '—'} hint={t('orders, 90 din')} />
        <KpiCard icon={UserPlus} color="#7c3aed" label={t('Naye dost aaye')} value={d ? d.stats.referralsDone : '—'} hint={d ? money(d.stats.referralSales) : undefined} />
        <KpiCard icon={Gift} color="#ea580c" label={t('Dost ka discount')} value={discountText || '—'} hint={t('{{count}} points customer ko', { count: s?.referral.referrerPoints ?? 0 })} />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="rounded-2xl lg:col-span-3" flush title={t('Referral code dein')} description={t('Customer chunein — code ban kar WhatsApp par chala jata hai.')}>
          <div className="px-4 pb-3 sm:px-5"><SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={t('Naam ya phone…')} label={t('Customer search')} /></div>
          {people.isLoading ? <div className="p-4"><Skeleton className="h-32 rounded-xl" /></div> : !people.data?.length ? (
            <EmptyState icon={<Users className="h-5 w-5" />} title={t('Koi customer nahi mila')} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {people.data.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] font-medium text-slate-900">{c.name}</span>
                    <span className="block text-[0.75rem] text-slate-500">{c.phone} · {t('{{count}} points', { count: c.loyaltyPoints })}</span>
                  </span>
                  {c.code && (
                    <button type="button" onClick={() => { void navigator.clipboard?.writeText(c.code!); toast.success(t('Code copy: {{code}}', { code: c.code })); }}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 font-mono text-[0.75rem] font-semibold text-slate-700 hover:bg-slate-200"><Copy className="h-3 w-3" />{c.code}</button>
                  )}
                  <Button size="xs" variant="success" disabled={!s?.referral.enabled} loading={code.isPending && code.variables?.id === c.id} leftIcon={<Share2 className="h-3.5 w-3.5" />} onClick={() => void share(c)}>
                    {c.code ? t('Bhejein') : t('Code banayein')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="rounded-2xl lg:col-span-2" title={t('Order par referral lagayein')} description={t('Dost ne code bataya? Order no aur code likhein. Store par code laga ho to khud jur jata hai.')}>
          <div className="space-y-3">
            <Input label={t('Order no')} value={linkNo} onChange={(e) => setLinkNo(e.target.value)} placeholder="M-1024" />
            <Input label={t('Referral code')} value={linkCode} onChange={(e) => setLinkCode(e.target.value.toUpperCase())} placeholder="AYESHA4821" className="font-mono" />
            <Button className="w-full" leftIcon={<Link2 className="h-4 w-4" />} disabled={!linkNo.trim() || !linkCode.trim() || !s?.referral.enabled} loading={link.isPending} onClick={() => link.mutate()}>{t('Jorein')}</Button>
            <p className="text-[0.75rem] text-slate-500">{t('Dost ko discount order banate waqt khud dein (Add order me Discount). Shopify par har customer ka code Nafaa nahi bana sakta.')}</p>
          </div>
          {!!d?.topReferrers.length && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-400">{t('Sab se zyada dost laane wale')}</p>
              <ul className="space-y-1.5">
                {d.topReferrers.slice(0, 5).map((r) => (
                  <li key={r.customerId} className="flex items-center justify-between text-[0.8125rem]">
                    <span className="truncate text-slate-800">{r.name}</span>
                    <span className="tabular-nums text-slate-500">{t('{{count}} dost · {{sales}}', { count: r.friends, sales: money(r.sales) })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <h2 className="px-4 pt-4 text-[0.9375rem] font-semibold text-slate-900 sm:px-5">{t('Haal ke points (90 din)')}</h2>
        {!d ? <div className="p-4"><Skeleton className="h-32 rounded-xl" /></div> : !d.entries.length ? (
          <EmptyState icon={<Package className="h-5 w-5" />} title={t('Abhi koi online points nahi')} description={t('Online points ON karein — deliver hone wale orders yahan aayenge.')} />
        ) : (
          <div className="overflow-x-auto">
            <Table minWidth="40rem" className="[&_table]:text-[0.8125rem]">
              <THead className="text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                <Tr><Th className="px-4 py-2 sm:px-5">{t('Order')}</Th><Th className="px-3 py-2">{t('Kis ko')}</Th><Th className="px-3 py-2 text-end">{t('Points')}</Th><Th className="px-3 py-2">{t('Haal')}</Th><Th className="px-4 py-2 sm:px-5" /></Tr>
              </THead>
              <TBody className="divide-y divide-slate-100">
                {d.entries.map((e) => (
                  <Tr key={e.id}>
                    <Td className="px-4 py-2.5 sm:px-5">
                      <button type="button" onClick={() => setOrderId(e.orderId)} className="font-mono text-brand-700 hover:underline">#{e.orderNo}</button>
                      <span className="ms-2 text-slate-500">{e.friend} · {timeAgo(e.createdAt)}</span>
                    </Td>
                    <Td className="px-3 py-2.5">{e.kind === 'REFERRAL' ? <span className="inline-flex items-center gap-1"><UserPlus className="h-3.5 w-3.5 text-violet-600" />{e.customer}</span> : e.customer}</Td>
                    <Td className="px-3 py-2.5 text-end font-semibold tabular-nums">{e.points}</Td>
                    <Td className="px-3 py-2.5"><Badge variant={STATUS[e.status]?.variant ?? 'default'}>{STATUS[e.status]?.label ?? e.status}</Badge></Td>
                    <Td className="px-4 py-2.5 text-end sm:px-5">
                      {e.kind === 'REFERRAL' && e.status === 'PENDING' && (
                        <button type="button" onClick={() => unlink.mutate(e.id)} title={t('Referral hatayein')} aria-label={t('Referral hatayein')} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </section>

      {orderId && <OrderDrawer orderId={orderId} onClose={() => setOrderId(null)} />}
      {guide.isOpen && (
        <PageGuide
          title={t('Loyalty & referral — aasaan tareeqa')}
          onClose={guide.close}
          flow={[
            { label: t('Order deliver'), icon: Truck, color: '#0d9488' },
            { label: t('Points'), hint: t('Counter wale hi'), icon: Award, color: '#d97706' },
            { label: t('Referral code'), hint: t('Dost ko'), icon: Share2, color: '#7c3aed' },
            { label: t('Dost ka order'), hint: t('Deliver par points'), icon: UserPlus, color: '#16a34a' },
          ]}
          steps={[
            { icon: Award, color: '#d97706', title: t('Ek hi program'), text: t('Online aur counter ke points ek hi khate me. Customer counter par ya agle order par istemal kar sakta hai.') },
            { icon: Truck, color: '#0d9488', title: t('Deliver par'), text: t('Points tab milte hain jab parcel deliver ho. RTO / wapas par points nahi milte, diye hue wapas ho jate hain.') },
            { icon: Share2, color: '#7c3aed', title: t('Referral code'), text: t('Customer ke saamne "Code banayein" — code WhatsApp par chala jata hai. Har customer ka ek hi code.') },
            { icon: Link2, color: '#2563eb', title: t('Order se jorna'), text: t('Store par code discount ke taur par laga ho to khud jurta hai. Warna order no aur code likh kar "Jorein".') },
            { icon: MessageCircle, color: '#16a34a', title: t('Sirf naya dost'), text: t('Ye ON ho to sirf pehli dafa lene wala dost ginta hai — apne hi code se ya purane customer se referral nahi.') },
          ]}
          shortcuts={[['/', t('Customer dhoondein')], ['G', t('Guide')]]}
        />
      )}
    </PageShell>
  );
}
