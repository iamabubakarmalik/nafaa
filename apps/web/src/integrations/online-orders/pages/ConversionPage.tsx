/**
 * Website conversion tools: products bought together (for the website
 * snippet and API), the free-delivery amount advice and coupon automation
 * (personal codes for abandoned carts and customers who stopped ordering).
 *
 * Keys: G guide.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BadgePercent, CheckCircle2, Code2, Copy, GraduationCap, Link2, MessageCircle, Package, Play, Settings2, ShoppingCart, Truck, UserRoundCheck,
} from 'lucide-react';
import {
  Button, EmptyState, Field, Input, PageHero, PageShell, Select, Skeleton, Switch, ViewTabs, heroButton, heroIconButton,
} from '@/design-system/components';
import { apiClient } from '@core/api/client';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { useAuthStore } from '@core/stores/auth.store';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../api/online-orders.api';
import { conversionApi, type CouponRow, type CouponRule, type CouponSettings, type CouponStatus, type ProductCard } from '../api/conversion.api';
import { timeAgo, waNumber } from '../lib/labels';

type Tab = 'together' | 'shipping' | 'coupons' | 'website';

const KIND_LABEL: Record<string, string> = { ABANDONED_CART: t('Chhoda cart'), WIN_BACK: t('Wapas bulao'), MANUAL: t('Haath se') };
const STATUS_LABEL: Record<CouponStatus, { label: string; tone: string }> = {
  OPEN: { label: t('Bhejna hai'), tone: 'bg-amber-50 text-amber-800' },
  SENT: { label: t('Bhej diya'), tone: 'bg-sky-50 text-sky-700' },
  USED: { label: t('Istemal hua'), tone: 'bg-success-50 text-success-700' },
  EXPIRED: { label: t('Muddat khatam'), tone: 'bg-slate-100 text-slate-500' },
};

const copy = (text: string) => {
  navigator.clipboard?.writeText(text).then(() => toast.success(t('Copy ho gaya')), () => toast.error(t('Copy nahi hua')));
};

function Thumb({ p }: { p: ProductCard }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {p.image ? <img src={p.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" loading="lazy" />
        : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400"><Package className="h-4 w-4" /></span>}
      <div className="min-w-0">
        <p className="truncate text-[0.8125rem] font-semibold text-slate-900">{p.name}</p>
        <p className="text-[0.6875rem] text-slate-500">{p.sku ?? ''}{!p.inStock ? ` · ${t('Stock nahi')}` : ''}</p>
      </div>
    </div>
  );
}

export default function ConversionPage() {
  const guide = usePageGuide();
  const qc = useQueryClient();
  const { sales: money } = useMasked();
  const shopName = useAuthStore((s) => s.tenant?.name);
  const [tab, setTab] = useState<Tab>('together');
  const [status, setStatus] = useState<CouponStatus>('OPEN');

  const together = useQuery({ queryKey: ['conv-together'], queryFn: conversionApi.together, staleTime: 5 * 60_000 });
  const shipping = useQuery({ queryKey: ['conv-shipping'], queryFn: conversionApi.freeShipping, staleTime: 5 * 60_000 });
  const coupons = useQuery({ queryKey: ['conv-coupons', status], queryFn: () => conversionApi.coupons({ status }), placeholderData: (p) => p });

  const refreshCoupons = () => qc.invalidateQueries({ queryKey: ['conv-coupons'] });
  const run = useMutation({
    mutationFn: conversionApi.run,
    onSuccess: (r) => { toast.success(t('{{count}} naye code bane', { count: r.abandoned + r.winBack })); refreshCoupons(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const sent = useMutation({ mutationFn: conversionApi.sent, onSuccess: refreshCoupons });
  const apply = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number | null }) => conversionApi.setFreeAbove(id, amount),
    onSuccess: () => { toast.success(t('Free delivery ki had lag gayi')); qc.invalidateQueries({ queryKey: ['conv-shipping'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const tg = together.data;
  const sh = shipping.data;
  const cs = coupons.data?.stats;

  const sendWa = (c: CouponRow) => {
    const wa = waNumber(c.customerPhone);
    if (!wa) return;
    const value = c.type === 'PERCENT' ? `${c.value}%` : money(c.value);
    const until = c.expiresAt ? new Date(c.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
    const text = c.kind === 'ABANDONED_CART'
      ? t('Salam {{name}}! Aap ka cart {{shop}} par aap ka intezar kar raha hai. Ye code lagayein: {{code}} — {{value}} discount, {{until}} tak.', { name: (c.customerName ?? '').split(' ')[0], shop: shopName ?? '', code: c.code, value, until })
      : t('Salam {{name}}! {{shop}} aap ko yaad karta hai. Aap ke liye khaas code: {{code}} — {{value}} discount, {{until}} tak.', { name: (c.customerName ?? '').split(' ')[0], shop: shopName ?? '', code: c.code, value, until });
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    sent.mutate(c.id);
  };

  return (
    <PageShell>
      <PageHero
        title={t('Website conversion')}
        chip={<><BadgePercent />{t('Zyada bikri')}</>}
        meta={t('Saath bikne wali cheezein, free delivery ki had, aur khud banne wale discount codes')}
        busy={(together.isFetching || shipping.isFetching) && !together.isLoading}
        loading={together.isLoading && shipping.isLoading}
        actions={<>
          <Link to="/online-store/channels" className={heroButton}><Settings2 className="h-4 w-4" /> <span className="hidden sm:inline">{t('Channels')}</span></Link>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: t('Saath bikne wale jore'), value: tg ? String(tg.pairs.length) : '', hint: tg ? t('{{count}} bills se', { count: tg.basis.bills }) : undefined },
          { label: t('Free delivery ki had'), value: sh ? (sh.threshold ? money(sh.threshold) : '—') : '', hint: sh?.threshold ? t('{{pct}}% orders pehle se upar', { pct: sh.alreadyAbove }) : undefined },
          { label: t('Codes istemal hue'), value: cs ? String(cs.used) : '', hint: cs ? t('{{rate}}% bheje hue', { rate: cs.rate }) : undefined },
          { label: t('Codes se sale'), value: cs ? money(cs.usedValue) : '' },
        ]}
      />

      <ViewTabs value={tab} onChange={setTab}
        tabs={[
          { id: 'together', label: t('Saath bikta hai'), icon: ShoppingCart },
          { id: 'shipping', label: t('Free delivery'), icon: Truck },
          { id: 'coupons', label: t('Discount codes'), icon: BadgePercent },
          { id: 'website', label: t('Website par lagayein'), icon: Code2 },
        ]} />

      {tab === 'together' && (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {together.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            : together.isError ? <EmptyState title={t('List nahi khuli')} description={apiErrorMessage(together.error)} />
            : !tg?.pairs.length ? <EmptyState icon={<ShoppingCart className="h-5 w-5" />} title={t('Abhi koi jora nahi mila')} description={t('Jab customer do cheezein ek bill me lete hain to yahan aati hain. Thori aur bikri ke baad dekhein.')} />
            : (
              <>
                <p className="border-b border-slate-100 px-4 py-2.5 text-[0.75rem] text-slate-500">
                  {tg.basis.online ? t('Pichhle {{days}} din ke {{bills}} online bills se', { days: tg.basis.days, bills: tg.basis.bills }) : t('Pichhle {{days}} din ke {{bills}} bills se (online bills kam the, is liye dukaan ke bills bhi)', { days: tg.basis.days, bills: tg.basis.bills })}
                </p>
                <ul className="divide-y divide-slate-100">
                  {tg.pairs.map((p) => (
                    <li key={`${p.a.id}-${p.b.id}`} className="grid grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_1fr_auto]">
                      <Thumb p={p.a} />
                      <span className="hidden text-slate-300 sm:block">+</span>
                      <Thumb p={p.b} />
                      <div className="text-end text-[0.75rem] text-slate-500">
                        <p className="font-semibold text-slate-900">{t('{{count}} bills me saath', { count: p.together })}</p>
                        <p>{t('{{lift}}x zyada saath', { lift: p.lift })}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
        </section>
      )}

      {tab === 'shipping' && (
        <section className="space-y-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
          {shipping.isLoading ? <Skeleton className="h-40 rounded-xl" />
            : !sh ? null
            : !sh.threshold ? <EmptyState icon={<Truck className="h-5 w-5" />} title={t('Abhi orders kam hain')} description={t('Kam az kam 20 online orders ke baad mashwara milega. Abhi {{count}} hain.', { count: sh.orders })} />
            : (
              <>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Stat label={t('Mashwara: free delivery')} value={t('{{amount}} se upar', { amount: money(sh.threshold) })} strong />
                  <Stat label={t('Aam order')} value={money(sh.median)} hint={t('Average {{avg}}', { avg: money(sh.average) })} />
                  <Stat label={t('Qareeb wale orders')} value={`${sh.nearBelow}%`} hint={t('Ek cheez aur le kar had paar karenge')} />
                  <Stat label={t('Har order par izafa')} value={money(sh.liftPerOrder)} hint={t('Andaza, aadhe qareeb wale barhayein to')} />
                </div>
                <p className="text-[0.8125rem] text-slate-600">
                  {t('{{pct}}% orders pehle se is had se upar hain. Un par delivery aap denge — har order ka andazan kharcha {{cost}}{{estimate}}.', { pct: sh.alreadyAbove, cost: money(sh.shippingCost), estimate: sh.shippingCostKnown ? '' : t(' (andaza)') })}
                </p>
                <div className="space-y-1.5">
                  {sh.bands.map((b) => {
                    const max = Math.max(1, ...sh.bands.map((x) => x.orders));
                    return (
                      <div key={b.from} className="flex items-center gap-2 text-[0.75rem]">
                        <span className="w-32 shrink-0 tabular-nums text-slate-500">{money(b.from)}{b.to ? ` – ${money(b.to)}` : '+'}</span>
                        <span className={cn('h-3 rounded-full', b.to !== null && b.to <= sh.threshold! ? 'bg-slate-300' : 'bg-brand-500')} style={{ width: `${(b.orders / max) * 70}%` }} />
                        <span className="tabular-nums text-slate-600">{b.orders}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <p className="text-[0.8125rem] font-semibold text-slate-900">{t('Nafaa order form par lagayein')}</p>
                  {!sh.forms.length ? <p className="text-[0.8125rem] text-slate-500">{t('Abhi koi order form nahi. Website channel me order form chalu karein.')}</p>
                    : sh.forms.map((f) => (
                      <div key={f.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem]">
                        <span className="flex-1 font-medium text-slate-800">{f.name}</span>
                        <span className="text-slate-500">{f.freeAbove ? t('Abhi: {{amount}} se upar free', { amount: money(f.freeAbove) }) : t('Abhi free delivery nahi')}</span>
                        <Button size="xs" variant="primary" disabled={f.freeAbove === sh.threshold} loading={apply.isPending && apply.variables?.id === f.id}
                          onClick={() => apply.mutate({ id: f.id, amount: sh.threshold })}>{f.freeAbove === sh.threshold ? t('Laga hua hai') : t('{{amount}} lagayein', { amount: money(sh.threshold!) })}</Button>
                      </div>
                    ))}
                  <p className="text-[0.75rem] text-slate-500">{t('Shopify ya WooCommerce: unki Shipping settings me "free shipping" ki minimum amount yahi rakhein.')}</p>
                </div>
              </>
            )}
        </section>
      )}

      {tab === 'coupons' && (
        <>
          {coupons.data && <CouponSettingsCard initial={coupons.data.settings} running={run.isPending} onRun={() => run.mutate()} onSaved={refreshCoupons} />}
          <ViewTabs value={status} onChange={setStatus}
            tabs={[
              { id: 'OPEN', label: t('Bhejna hai'), icon: MessageCircle },
              { id: 'SENT', label: t('Bhej diya'), icon: Link2 },
              { id: 'USED', label: t('Istemal hua'), icon: CheckCircle2 },
              { id: 'EXPIRED', label: t('Muddat khatam'), icon: BadgePercent },
            ]} />
          <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {coupons.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
              : coupons.isError ? <EmptyState title={t('List nahi khuli')} description={apiErrorMessage(coupons.error)} />
              : !coupons.data?.items.length ? <EmptyState icon={<BadgePercent className="h-5 w-5" />} title={t('Is list me koi code nahi')} description={t('Rule on karein — codes roz subah khud bante hain, ya "Abhi banayein" dabayein.')} />
              : (
                <ul className="divide-y divide-slate-100">
                  {coupons.data.items.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <button type="button" onClick={() => copy(c.code)} title={t('Copy')} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 font-mono text-[0.8125rem] font-bold text-slate-800 hover:bg-slate-200">
                        {c.code}<Copy className="h-3 w-3 text-slate-400" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.875rem] font-semibold text-slate-900">
                          {c.customerName ?? t('Naam nahi')}
                          {c.customerPhone && <span className="ms-2 font-mono text-[0.75rem] font-normal text-slate-500">{c.customerPhone}</span>}
                        </p>
                        <p className="text-[0.75rem] text-slate-500">
                          {KIND_LABEL[c.kind] ?? c.kind} · {c.type === 'PERCENT' ? `${c.value}%` : money(c.value)}
                          {c.expiresAt ? ` · ${t('{{date}} tak', { date: new Date(c.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) })}` : ''}
                          {` · ${timeAgo(c.createdAt)}`}
                        </p>
                      </div>
                      <span className={cn('rounded-full px-2.5 py-1 text-[0.75rem] font-semibold', STATUS_LABEL[c.status].tone)}>{STATUS_LABEL[c.status].label}</span>
                      {c.status === 'USED' && c.usedOrderNo && (
                        <Link to={`/online-orders?search=${encodeURIComponent(c.usedOrderNo)}`} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">#{c.usedOrderNo} · {money(c.usedOrderTotal ?? 0)}</Link>
                      )}
                      {(c.status === 'OPEN' || c.status === 'SENT') && (
                        <Button size="xs" variant="success" disabled={!waNumber(c.customerPhone)} onClick={() => sendWa(c)} leftIcon={<MessageCircle className="h-3.5 w-3.5" />}>
                          {c.status === 'SENT' ? t('Dobara') : t('WhatsApp')}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
          </section>
        </>
      )}

      {tab === 'website' && <WebsiteCode />}

      {guide.isOpen && (
        <PageGuide
          title={t('Website conversion — aasaan tareeqa')}
          description={t('Har order thora bara ho, aur jo customer ruk gaya wo wapas aaye.')}
          onClose={guide.close}
          flow={[
            { label: t('Saath bikta hai'), hint: t('Bills se'), icon: ShoppingCart, color: '#2563eb' },
            { label: t('Website par'), hint: t('"Ye bhi lein"'), icon: Code2, color: '#7c3aed' },
            { label: t('Free delivery'), hint: t('Had se upar'), icon: Truck, color: '#0d9488' },
            { label: t('Discount code'), hint: t('Cart aur wapas bulao'), icon: BadgePercent, color: '#16a34a' },
          ]}
          steps={[
            { icon: ShoppingCart, color: '#2563eb', title: t('Saath bikne wali cheezein'), text: t('Jo cheezein aksar ek hi bill me hoti hain. Website par product ke neeche "Saath me ye bhi" dikhayein.') },
            { icon: Truck, color: '#0d9488', title: t('Free delivery ki had'), text: t('Aam order se thori upar rakhein — customer ek cheez aur le leta hai.') },
            { icon: BadgePercent, color: '#16a34a', title: t('Khud banne wale codes'), text: t('Chhode hue cart aur purane customers ke liye har ek ka apna code. WhatsApp par ek click me bhejein; istemal ho to order ke saath jur jata hai.') },
            { icon: UserRoundCheck, color: '#7c3aed', title: t('Shopify / WooCommerce'), text: t('Wahan Nafaa khud code nahi bana sakta. Wahan ek code banayein aur "Shopify/Woo ka code" me likhein — Nafaa wahi bhejega aur phone se jorega.') },
          ]}
          shortcuts={[['G', t('Guide')]]}
        />
      )}
    </PageShell>
  );
}

function Stat({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className={cn('rounded-2xl px-3 py-2.5 ring-1', strong ? 'bg-brand-50 ring-brand-200' : 'bg-slate-50 ring-slate-200')}>
      <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('text-[1.0625rem] font-bold tabular-nums', strong ? 'text-brand-800' : 'text-slate-900')}>{value}</p>
      {hint && <p className="text-[0.6875rem] text-slate-500">{hint}</p>}
    </div>
  );
}

function RuleEditor({ title, hint, rule, extra, onChange }: {
  title: string; hint: string; rule: CouponRule; extra: React.ReactNode; onChange: (r: CouponRule) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.875rem] font-semibold text-slate-900">{title}</p>
          <p className="text-[0.75rem] text-slate-500">{hint}</p>
        </div>
        <Switch checked={rule.enabled} onChange={(e) => onChange({ ...rule, enabled: e.currentTarget.checked })} aria-label={title} />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label={t('Discount')}>{(id) => (<Select id={id} value={rule.type} onChange={(e) => onChange({ ...rule, type: e.target.value as CouponRule['type'] })}>
            <option value="PERCENT">%</option>
            <option value="FIXED">Rs</option>
          </Select>)}</Field>
        <Field label={rule.type === 'PERCENT' ? t('Kitna %') : t('Kitne Rs')}>{(id) => (<Input id={id} type="number" min={1} value={rule.value} onChange={(e) => onChange({ ...rule, value: Number(e.target.value) })} />)}</Field>
        <Field label={t('Kitne din chalega')}>{(id) => (<Input id={id} type="number" min={1} max={60} value={rule.validDays} onChange={(e) => onChange({ ...rule, validDays: Number(e.target.value) })} />)}</Field>
        {extra}
      </div>
    </div>
  );
}

function CouponSettingsCard({ initial, running, onRun, onSaved }: { initial: CouponSettings; running: boolean; onRun: () => void; onSaved: () => void }) {
  const [s, setS] = useState(initial);
  useEffect(() => setS(initial), [initial]);
  const save = useMutation({
    mutationFn: conversionApi.saveSettings,
    onSuccess: (r) => { setS(r); toast.success(t('Save ho gaya')); onSaved(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);
  return (
    <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
      <div className="grid gap-3 lg:grid-cols-2">
        <RuleEditor title={t('Chhode hue cart')} hint={t('Cart chhodne ke kuch ghante baad us customer ka apna code')} rule={s.abandoned}
          onChange={(r) => setS({ ...s, abandoned: { ...s.abandoned, ...r } })}
          extra={<Field label={t('Kitne ghante baad')}>{(id) => (<Input id={id} type="number" min={1} max={72} value={s.abandoned.afterHours} onChange={(e) => setS({ ...s, abandoned: { ...s.abandoned, afterHours: Number(e.target.value) } })} />)}</Field>} />
        <RuleEditor title={t('Wapas bulao')} hint={t('Jo customer itne din se order nahi kar raha')} rule={s.winBack}
          onChange={(r) => setS({ ...s, winBack: { ...s.winBack, ...r } })}
          extra={<Field label={t('Kitne din se')}>{(id) => (<Input id={id} type="number" min={30} max={365} value={s.winBack.afterDays} onChange={(e) => setS({ ...s, winBack: { ...s.winBack, afterDays: Number(e.target.value) } })} />)}</Field>} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t('Shopify / WooCommerce ka code (optional)')}>{(id) => (<Input id={id} value={s.sharedCode ?? ''} placeholder="WAPAS10" onChange={(e) => setS({ ...s, sharedCode: e.target.value.toUpperCase() || null })} className="font-mono" />)}</Field>
        <p className="flex-1 text-[0.75rem] text-slate-500">{t('Khali chhorein to har customer ka apna code banega (Nafaa order form par chalta hai).')}</p>
        <Button variant="secondary" loading={running} disabled={dirty || (!s.abandoned.enabled && !s.winBack.enabled)} onClick={onRun} leftIcon={<Play className="h-4 w-4" />}>{t('Abhi banayein')}</Button>
        <Button variant="primary" loading={save.isPending} disabled={!dirty} onClick={() => save.mutate(s)}>{t('Save karein')}</Button>
      </div>
    </section>
  );
}

function WebsiteCode() {
  const api = String(apiClient.defaults.baseURL ?? '').replace(/\/+$/, '');
  const snippet = '<div data-nafaa-together="PRODUCT-SKU" data-title="Saath me ye bhi lein"></div>';
  const curl = `curl -H "X-Nafaa-Key: YOUR_KEY" "${api}/integrations/website/v1/recommendations?sku=PRODUCT-SKU&limit=4"`;
  return (
    <section className="space-y-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
      <div className="space-y-2">
        <p className="text-[0.875rem] font-semibold text-slate-900">{t('Nafaa order form wali website')}</p>
        <p className="text-[0.8125rem] text-slate-600">{t('Order form ka script pehle se laga ho to product page par ye ek line lagayein. Wahan "Saath me ye bhi" ke cards khud aa jayenge, har card par Order button ke saath.')}</p>
        <CodeBox text={snippet} />
      </div>
      <div className="space-y-2 border-t border-slate-100 pt-4">
        <p className="text-[0.875rem] font-semibold text-slate-900">{t('Apni website (developer ke liye)')}</p>
        <p className="text-[0.8125rem] text-slate-600">{t('Website ki Nafaa key ke saath ye link product ke saath bikne wali cheezein deta hai (naam, SKU, price, tasveer, stock).')}</p>
        <CodeBox text={curl} />
      </div>
      <p className="text-[0.75rem] text-slate-500">{t('Shopify aur WooCommerce: "Saath bikta hai" tab ki list dekh kar wahan "related products" ya bundle bana lein.')}</p>
    </section>
  );
}

function CodeBox({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-slate-900 p-3">
      <code className="min-w-0 flex-1 break-all font-mono text-[0.75rem] text-slate-100">{text}</code>
      <button type="button" onClick={() => copy(text)} className="shrink-0 rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20" aria-label={t('Copy')}><Copy className="h-3.5 w-3.5" /></button>
    </div>
  );
}
