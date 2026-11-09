/**
 * WhatsApp campaigns sent one by one (wa.me, no bot): pick a customer
 * segment and a template, then the queue opens each chat with the message
 * filled in. The merchant presses send, the queue moves on. An order from the
 * same phone within 7 days counts as converted.
 *
 * Keys: N new campaign · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, CircleDollarSign, GraduationCap, Megaphone, MessageCircle, Plus, Send, ShoppingBag, Trash2, Users } from 'lucide-react';
import {
  Button, confirmDialog, EmptyState, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, Select, Skeleton, Textarea, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { t } from '@core/i18n';
import { apiErrorMessage, onlineOrdersApi } from '../api/online-orders.api';
import { retentionApi, type Campaign, type CampaignTemplate } from '../api/retention.api';
import { timeAgo } from '../lib/labels';
import { CAMPAIGN_TEMPLATES, SEGMENTS, segmentLabel, templateInfo } from '../lib/retention';

export default function CampaignsPage() {
  const guide = usePageGuide();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { sales: money } = useMasked();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState<boolean>(() => params.has('segment'));
  const q = useQuery({ queryKey: ['online-campaigns'], queryFn: retentionApi.campaigns });
  const remove = useMutation({
    mutationFn: retentionApi.removeCampaign,
    onSuccess: () => { toast.success(t('Campaign hata diya')); qc.invalidateQueries({ queryKey: ['online-campaigns'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setCreating(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const d = q.data;
  const tt = d?.totals;
  const askRemove = async (c: Campaign) => {
    if (await confirmDialog({ title: t('"{{name}}" hatayein?', { name: c.name }), text: t('Is campaign ki list aur hisaab mit jayega.'), danger: true })) remove.mutate(c.id);
  };

  return (
    <PageShell>
      <PageHero
        title={t('WhatsApp campaigns')}
        chip={<><Megaphone />{t('Ek ek karke')}</>}
        meta={t('Customer list chunein, message likhein — har chat tayyar khulti hai, aap Send dabayein')}
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <Link to="/online-orders/customers" className={heroButton}><Users className="h-4 w-4" /> <span className="hidden sm:inline">{t('Customers')}</span></Link>
          <button type="button" onClick={() => setCreating(true)} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {t('Naya campaign')}</button>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={tt ? [
          { label: t('Bheje'), value: String(tt.sent), hint: t('{{count}} baqi', { count: tt.pending }) },
          { label: t('Order aaye'), value: String(tt.converted), hint: t('7 din me · {{rate}}%', { rate: tt.rate }) },
          { label: t('Campaign se sale'), value: money(tt.revenue) },
          { label: t('Campaigns'), value: String(tt.campaigns) },
        ] : [{ label: t('Bheje'), value: '' }, { label: t('Order aaye'), value: '' }, { label: t('Campaign se sale'), value: '' }, { label: t('Campaigns'), value: '' }]}
      />

      <KpiRow cols={3}>
        {CAMPAIGN_TEMPLATES.filter((x) => x.key !== 'CUSTOM').slice(0, 3).map((x) => (
          <KpiCard key={x.key} icon={x.icon} color={x.color} label={x.label} value={<span className="text-[0.875rem] font-medium text-slate-600">{x.hint}</span>}
            onClick={() => { setParams({ template: x.key }); setCreating(true); }} />
        ))}
      </KpiRow>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {q.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          : q.isError ? <EmptyState title={t('List nahi khuli')} description={apiErrorMessage(q.error)} action={<Button variant="secondary" onClick={() => q.refetch()}>{t('Dobara koshish')}</Button>} />
          : !d?.campaigns.length ? (
            <EmptyState icon={<Megaphone className="h-5 w-5" />} title={t('Abhi koi campaign nahi')} description={t('Khamosh customers ko wapas bulayein ya naye maal ki khabar dein.')}
              action={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>{t('Naya campaign')}</Button>} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.campaigns.map((c) => {
                const info = templateInfo(c.template);
                const Icon = info.icon;
                const done = c.stats.sent + c.stats.skipped;
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: info.color }}><Icon className="h-5 w-5" /></span>
                    <button type="button" onClick={() => navigate(`/online-store/campaigns/${c.id}`)} className="min-w-0 flex-1 text-start">
                      <p className="truncate text-[0.875rem] font-semibold text-slate-900 hover:underline">{c.name}</p>
                      <p className="text-[0.75rem] text-slate-500">{segmentLabel(c.segment)} · {info.label} · {timeAgo(c.createdAt)}{c.code ? ` · ${t('Code')} ${c.code}` : ''}</p>
                      <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-success-500" style={{ width: `${c.stats.recipients ? Math.round((done / c.stats.recipients) * 100) : 0}%` }} />
                      </div>
                    </button>
                    <dl className="grid grid-cols-3 gap-4 text-end text-[0.75rem]">
                      <div><dt className="text-slate-400">{t('Bheje')}</dt><dd className="font-semibold tabular-nums text-slate-900">{c.stats.sent}/{c.stats.recipients}</dd></div>
                      <div><dt className="text-slate-400">{t('Order')}</dt><dd className="font-semibold tabular-nums text-success-700">{c.stats.converted}</dd></div>
                      <div><dt className="text-slate-400">{t('Sale')}</dt><dd className="font-semibold tabular-nums text-slate-900">{money(c.stats.revenue)}</dd></div>
                    </dl>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant={c.stats.pending ? 'success' : 'secondary'} leftIcon={<Send className="h-4 w-4" />} onClick={() => navigate(`/online-store/campaigns/${c.id}`)}>
                        {c.stats.pending ? t('Bhejein ({{count}})', { count: c.stats.pending }) : t('Dekhein')}
                      </Button>
                      <button type="button" onClick={() => void askRemove(c)} title={t('Hatayein')} aria-label={t('Hatayein')} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
      </section>

      {creating && (
        <NewCampaignModal
          initialSegment={params.get('segment') ?? undefined}
          initialTemplate={(params.get('template') as CampaignTemplate | null) ?? undefined}
          onClose={() => { setCreating(false); setParams({}, { replace: true }); }}
          onCreated={(id) => { qc.invalidateQueries({ queryKey: ['online-campaigns'] }); navigate(`/online-store/campaigns/${id}`); }}
        />
      )}

      {guide.isOpen && (
        <PageGuide
          title={t('WhatsApp campaigns — aasaan tareeqa')}
          description={t('Bot ke bagair: har customer ki chat aap ke apne WhatsApp me tayyar message ke saath khulti hai.')}
          onClose={guide.close}
          flow={[
            { label: t('List chunein'), hint: t('VIP, khatre me…'), icon: Users, color: '#2563eb' },
            { label: t('Message'), hint: t('Template ya apna'), icon: MessageCircle, color: '#7c3aed' },
            { label: t('Ek ek bhejein'), hint: t('Send dabayein'), icon: Send, color: '#16a34a' },
            { label: t('Order aaya'), hint: t('7 din me'), icon: ShoppingBag, color: '#0d9488' },
          ]}
          steps={[
            { icon: Users, color: '#2563eb', title: t('Kis ko bhejein'), text: t('Customers page ki list (VIP, dobara lene wale, khatre me, chale gaye) ya agle 7 din ki salgirah. Blocked kabhi nahi.') },
            { icon: MessageCircle, color: '#7c3aed', title: t('Message'), text: t('{name} customer ka naam, {shop} dukaan, {code} discount code, {link} link, {product} product ban jata hai.') },
            { icon: Send, color: '#16a34a', title: t('Queue'), text: t('"WhatsApp kholein" chat kholta hai aur bheja hua nishan lagata hai. Agla customer khud saamne aa jata hai.') },
            { icon: CheckCircle2, color: '#0d9488', title: t('Nateeja'), text: t('Usi phone se 7 din me order aaye to "Order aaya" — sale bhi ginti hoti hai. Jawab aaye to "Jawab aaya" dabayein.') },
            { icon: CircleDollarSign, color: '#ea580c', title: t('Discount code'), text: t('Code pehle apne store (Shopify / WooCommerce) par banayein — Nafaa store par code nahi banata.') },
          ]}
          tips={[t('Ek campaign me zyada se zyada 500 customers.'), t('Bahut zyada message ek dam na bhejein — WhatsApp number band kar sakta hai. Din me thore thore bhejein.')]}
          shortcuts={[['N', t('Naya campaign')], ['G', t('Guide')]]}
        />
      )}
    </PageShell>
  );
}

function NewCampaignModal({ initialSegment, initialTemplate, onClose, onCreated }: {
  initialSegment?: string; initialTemplate?: CampaignTemplate; onClose: () => void; onCreated: (id: string) => void;
}) {
  const first = templateInfo(initialTemplate ?? (initialSegment === 'lost' || initialSegment === 'at_risk' ? 'WIN_BACK' : 'NEW_ARRIVAL'));
  const [template, setTemplate] = useState<CampaignTemplate>(first.key);
  const [segment, setSegment] = useState(initialSegment ?? first.segment);
  const [message, setMessage] = useState(first.text());
  const [code, setCode] = useState('');
  const [link, setLink] = useState('');
  const [product, setProduct] = useState('');
  const [name, setName] = useState('');
  const info = templateInfo(template);
  const counts = useQuery({ queryKey: ['online-customers', 'all', '', 0], queryFn: () => onlineOrdersApi.customers({ segment: 'all', limit: 1, offset: 0 }) }).data?.counts ?? {};

  const pick = (k: CampaignTemplate) => {
    const x = templateInfo(k);
    setTemplate(k);
    setMessage(x.text());
    if (!initialSegment) setSegment(x.segment);
  };
  const preview = useMemo(() => message
    .replace(/\{name\}/g, t('Ayesha'))
    .replace(/\{shop\}/g, t('Aap ki dukaan'))
    .replace(/\{code\}/g, code || '—')
    .replace(/\{link\}/g, link || '')
    .replace(/\{product\}/g, product || '—'), [message, code, link, product]);

  const create = useMutation({
    mutationFn: () => retentionApi.createCampaign({ name: name.trim() || `${info.label} · ${segmentLabel(segment)}`, segment, template, message, code: code || undefined, link: link || undefined, product: product || undefined }),
    onSuccess: (c) => { toast.success(t('{{count}} customers ki list tayyar', { count: c.stats.recipients })); onCreated(c.id); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const segOptions = [...SEGMENTS.filter((s) => s.value !== 'blocked'), { value: 'birthday', label: t('Salgirah (agle 7 din)'), hint: '' }]
    .map((s) => ({ value: s.value, label: s.value === 'birthday' ? s.label : `${s.label}${counts[s.value] !== undefined ? ` (${counts[s.value]})` : ''}` }));
  const missing = info.needs.filter((k) => (k === 'code' ? !code : k === 'link' ? !link : !product) && message.includes(`{${k}}`));

  return (
    <Modal open onClose={onClose} size="lg" title={t('Naya WhatsApp campaign')} description={t('List aur message chunein — phir ek ek chat khulegi.')}
      footer={<>
        <Button variant="ghost" onClick={onClose}>{t('Band karein')}</Button>
        <Button leftIcon={<Send className="h-4 w-4" />} loading={create.isPending} disabled={!message.trim()} onClick={() => create.mutate()}>{t('List banayein')}</Button>
      </>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CAMPAIGN_TEMPLATES.map((x) => {
            const Icon = x.icon;
            return (
              <button key={x.key} type="button" onClick={() => pick(x.key)}
                className={cn('flex items-start gap-2 rounded-xl px-3 py-2 text-start ring-1 transition', template === x.key ? 'bg-brand-50 ring-brand-300' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: x.color }} />
                <span className="min-w-0"><span className="block text-[0.8125rem] font-semibold text-slate-900">{x.label}</span><span className="block text-[0.6875rem] text-slate-500">{x.hint}</span></span>
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label={t('Kis ko')} value={segment} onChange={(e) => setSegment(e.target.value)} options={segOptions} />
          <Input label={t('Campaign ka naam (marzi)')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Masalan: Eid win-back')} maxLength={80} />
        </div>
        <Textarea label={t('Message')} value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={1000} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={t('Discount code {code}')} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WAPAS10" maxLength={40} />
          <Input label={t('Link {link}')} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
          <Input label={t('Product {product}')} value={product} onChange={(e) => setProduct(e.target.value)} placeholder={t('Lawn suit')} maxLength={120} />
        </div>
        {missing.length > 0 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200">{t('Message me {{list}} hai lekin khali hai.', { list: missing.map((k) => `{${k}}`).join(', ') })}</p>}
        {code && <p className="text-[0.75rem] text-slate-500">{t('Code pehle apne store par banayein — Nafaa Shopify par discount code nahi bana sakta.')}</p>}
        <div className="rounded-2xl bg-brand-50 p-3 text-[0.8125rem] text-brand-950 ring-1 ring-brand-100">
          <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-700">{t('Aise jayega')}</p>
          <p className="whitespace-pre-line">{preview}</p>
        </div>
      </div>
    </Modal>
  );
}
