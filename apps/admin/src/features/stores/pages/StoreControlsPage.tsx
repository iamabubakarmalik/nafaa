/**
 * Platform controls for Nafaa Stores, kept in one system setting
 * (stores_platform_controls): the checkout kill switch, the maintenance
 * banner on every website, which themes and payment methods shops may use,
 * limits, blocked words and domains, and the default policy templates.
 * Saved changes reach every website within about 30 seconds.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CreditCard, FileText, Globe, Lightbulb, Megaphone, Palette, Power, Save, ShieldAlert } from 'lucide-react';
import {
  Alert, Card, Input, PageHero, PageShell, Segmented, Skeleton, Tabs, Textarea, confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminStoresApi, POLICY_KINDS, THEME_IDS, type PaymentKey, type PolicyKind, type StoreControls } from '@/api/admin-stores.api';
import { DetailList } from '@/ui';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { num } from '@/lib/format';
import { Empty, Pill, Toggle } from '@/features/shared/kit';
import { THEME_LABEL } from '../components/StoresUi';

type Tab = 'checkout' | 'catalog' | 'limits' | 'policies';
const PAYMENTS: Array<[PaymentKey, string, string]> = [
  ['COD', 'Cash on delivery', 'Pay the rider at the door'],
  ['SAFEPAY', 'Card (Safepay)', 'Debit and credit cards'],
  ['JAZZCASH', 'JazzCash', 'Mobile wallet'],
  ['EASYPAISA', 'Easypaisa', 'Mobile wallet'],
];
const POLICY_TITLE: Record<PolicyKind, string> = { refund: 'Refund policy', privacy: 'Privacy policy', terms: 'Terms of service', shipping: 'Shipping policy' };

/** Form state: the controls plus the two block lists as editable text. */
type Form = StoreControls & { keywordsText: string; domainsText: string; policies: Record<PolicyKind, { title: string; bodyHtml: string }> };

const toForm = (c: StoreControls): Form => ({
  ...c,
  keywordsText: c.blockedKeywords.join('\n'),
  domainsText: c.blockedDomains.join('\n'),
  policies: Object.fromEntries(POLICY_KINDS.map((k) => [k, { title: c.policyTemplates[k]?.title ?? POLICY_TITLE[k], bodyHtml: c.policyTemplates[k]?.bodyHtml ?? '' }])) as Form['policies'],
});
const lines = (t: string) => [...new Set(t.split(/[\n,]/).map((x) => x.trim().toLowerCase()).filter(Boolean))];

/** The body sent to PUT /admin/stores/controls. An empty policy body clears the override. */
const toBody = (f: Form): StoreControls => ({
  themes: f.themes,
  payments: f.payments,
  maxCustomDomains: f.maxCustomDomains,
  maxStoresPerShop: f.maxStoresPerShop,
  blockedKeywords: lines(f.keywordsText),
  blockedDomains: lines(f.domainsText).map((d) => d.replace(/^https?:\/\//, '').replace(/\/.*$/, '')),
  checkout: { paused: f.checkout.paused, message: f.checkout.message?.trim() || null },
  banner: { enabled: f.banner.enabled, message: f.banner.message?.trim() || null, tone: f.banner.tone },
  policyTemplates: Object.fromEntries(POLICY_KINDS.map((k) => [k, { title: f.policies[k].title.trim() || POLICY_TITLE[k], bodyHtml: f.policies[k].bodyHtml.trim() }])),
});

export default function StoreControlsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const can = useCan();
  const canManage = can('stores.manage');
  const [tab, setTab] = useState<Tab>('checkout');
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-stores-controls'], queryFn: adminStoresApi.controls });
  const [f, setF] = useState<Form | null>(null);
  useEffect(() => { if (data) setF(toForm(data)); }, [data]);
  const saved = useMemo(() => (data ? JSON.stringify(toBody(toForm(data))) : ''), [data]);
  const dirty = !!f && JSON.stringify(toBody(f)) !== saved;

  const save = useMutation({
    mutationFn: (body: StoreControls) => adminStoresApi.saveControls(body),
    onSuccess: (res) => {
      if (data) qc.setQueryData(['admin-stores-controls'], { ...data, ...res });
      setF(toForm(res));
      toast.success('Controls saved. Websites pick them up within 30 seconds.');
    },
    onError: (e) => toast.error(apiError(e)),
  });

  if (isLoading || !f || !data) {
    return (
      <PageShell>
        <PageHero title="Website controls" loading />
        {error ? <Card><Empty>Could not load controls. The stores service may not be running yet.</Empty></Card> : <Skeleton className="h-64 rounded-3xl" />}
      </PageShell>
    );
  }

  const patch = (p: Partial<Form>) => setF({ ...f, ...p });
  const enabledThemes = THEME_IDS.filter((t) => f.themes[t]?.enabled).length;
  const enabledPayments = PAYMENTS.filter(([k]) => f.payments[k]).length;

  const onSave = async () => {
    const body = toBody(f);
    if (body.checkout.paused && !data.checkout.paused && !(await confirmDialog({
      title: 'Pause checkout on every website?', text: 'Buyers on every Nafaa Stores website will not be able to place orders until you switch this off. They see your message instead.', yes: 'Pause checkout', danger: true,
    }))) return;
    const offPayments = PAYMENTS.filter(([k]) => data.payments[k] && !body.payments[k]).map(([, l]) => l);
    if (offPayments.length && !(await confirmDialog({
      title: `Switch off ${offPayments.join(', ')}?`, text: 'This payment method disappears from checkout on every website at once.', yes: 'Switch off', danger: true,
    }))) return;
    if (!enabledThemes) { toast.error('Keep at least one theme on.'); return; }
    save.mutate(body);
  };

  return (
    <PageShell>
      <PageHero
        title="Website controls"
        chip={dirty ? 'Unsaved changes' : undefined}
        busy={save.isPending}
        actions={
          <>
            {canManage && <button type="button" className={heroPrimaryButton} onClick={onSave} disabled={!dirty || save.isPending}><Save className="h-4 w-4" /> Save changes</button>}
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={[
          { label: 'Checkout', value: f.checkout.paused ? 'Paused' : 'On', hint: f.checkout.paused ? 'Kill switch is on' : 'Orders can be placed' },
          { label: 'Maintenance banner', value: f.banner.enabled ? 'Showing' : 'Off' },
          { label: 'Themes on', value: `${enabledThemes} of ${THEME_IDS.length}` },
          { label: 'Payment methods on', value: `${enabledPayments} of ${PAYMENTS.length}` },
        ]}
      />

      {!canManage && <Alert tone="info">Your role can view these controls but not change them.</Alert>}
      {f.checkout.paused && <Alert tone="danger" title="Checkout is paused on every website">Buyers cannot place orders. Switch the kill switch off and save to open checkout again.</Alert>}

      <Card title="Platform" description="Where websites live. Set on the API server; shown here for reference.">
        <DetailList cols={3} items={[
          { label: 'Root domain', value: <span className="font-mono text-[0.8125rem]">{data.rootDomain}</span> },
          { label: 'Free store address', value: <span className="font-mono text-[0.8125rem]">&lt;store&gt;.{data.rootDomain}</span> },
          { label: 'Storefront app', value: <a href={data.storefrontUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">{data.storefrontUrl.replace(/^https?:\/\//, '')}</a> },
          { label: 'Custom domain hosting', value: data.vercelReady ? <Pill tone="emerald">Connected</Pill> : <Pill tone="amber">Not connected</Pill> },
        ]} />
      </Card>

      <Tabs value={tab} onChange={setTab} label="Control sections" items={[
        { value: 'checkout', label: 'Checkout and banner', tone: 'danger', count: f.checkout.paused ? 1 : undefined },
        { value: 'catalog', label: 'Themes and payments' },
        { value: 'limits', label: 'Limits and blocks' },
        { value: 'policies', label: 'Policy templates' },
      ]} />

      <fieldset disabled={!canManage || save.isPending} className="space-y-4">
        {tab === 'checkout' && (
          <>
            <Card title="Checkout kill switch" description="Stops new orders on every website at once, for example during a payment outage or an abuse wave.">
              <Row icon={Power} label="Pause checkout on every website" hint="Carts still work; placing an order is refused with your message.">
                <Toggle label="Pause checkout" checked={f.checkout.paused} onChange={(v) => patch({ checkout: { ...f.checkout, paused: v } })} />
              </Row>
              <Input className="mt-4" label="Message to buyers" maxLength={300} value={f.checkout.message ?? ''} onChange={(e) => patch({ checkout: { ...f.checkout, message: e.target.value } })}
                placeholder="e.g. Checkout is paused for a short while. Please try again in an hour." />
            </Card>
            <Card title="Maintenance banner" description="A strip at the top of every website. Use it for planned work or a known problem.">
              <Row icon={Megaphone} label="Show the banner" hint="Shown on every Nafaa Stores website.">
                <Toggle label="Show banner" checked={f.banner.enabled} onChange={(v) => patch({ banner: { ...f.banner, enabled: v } })} />
              </Row>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <Input label="Banner text" maxLength={300} value={f.banner.message ?? ''} onChange={(e) => patch({ banner: { ...f.banner, message: e.target.value } })} placeholder="e.g. Some payments may be slow tonight between 1 and 3 am." />
                <Segmented value={f.banner.tone} onChange={(v) => patch({ banner: { ...f.banner, tone: v } })} label="Banner tone"
                  items={[{ value: 'info', label: 'Info' }, { value: 'warning', label: 'Warning' }]} />
              </div>
              {f.banner.enabled && f.banner.message && (
                <div className={`mt-4 rounded-xl px-4 py-2 text-center text-[0.8125rem] font-medium ${f.banner.tone === 'warning' ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-900'}`}>{f.banner.message}</div>
              )}
            </Card>
          </>
        )}

        {tab === 'catalog' && (
          <>
            <Card title="Themes" description="A theme switched off is hidden from shops choosing a design. Websites already on it keep working.">
              <div className="grid gap-3 sm:grid-cols-2">
                {THEME_IDS.map((t) => (
                  <div key={t} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <Row icon={Palette} label={THEME_LABEL[t]} hint={f.themes[t]?.enabled ? 'Shops can pick it' : 'Hidden from shops'}>
                      <Toggle label={`${THEME_LABEL[t]} on`} checked={!!f.themes[t]?.enabled} onChange={(v) => patch({ themes: { ...f.themes, [t]: { ...f.themes[t], enabled: v } } })} />
                    </Row>
                    <label className="mt-2 flex items-center gap-2 text-[0.8125rem] text-slate-600">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={!!f.themes[t]?.featured} disabled={!f.themes[t]?.enabled}
                        onChange={(e) => patch({ themes: { ...f.themes, [t]: { ...f.themes[t], featured: e.target.checked } } })} />
                      Featured (shown first)
                    </label>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Payment methods" description="The allow-list for every website. A shop can only offer methods that are on here and set up in its own checkout.">
              <div className="grid gap-3 sm:grid-cols-2">
                {PAYMENTS.map(([k, label, hint]) => (
                  <Row key={k} icon={CreditCard} label={label} hint={hint}>
                    <Toggle label={label} checked={f.payments[k]} onChange={(v) => patch({ payments: { ...f.payments, [k]: v } })} />
                  </Row>
                ))}
              </div>
            </Card>
          </>
        )}

        {tab === 'limits' && (
          <>
            <Card title="Limits" description="Per shop and per website.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input type="number" min={0} max={20} label="Custom domains per website" hint="A www and root pair counts as one. 0 turns custom domains off."
                  value={f.maxCustomDomains} onChange={(e) => patch({ maxCustomDomains: Math.max(0, Math.min(20, Math.floor(Number(e.target.value) || 0))) })} />
                <Input type="number" min={1} max={20} label="Websites per shop" hint="Existing websites above the limit keep working."
                  value={f.maxStoresPerShop} onChange={(e) => patch({ maxStoresPerShop: Math.max(1, Math.min(20, Math.floor(Number(e.target.value) || 1))) })} />
              </div>
            </Card>
            <Card title="Blocked words and domains" description="One per line. Checked when a shop names a website, picks its address or adds a domain.">
              <div className="grid gap-4 lg:grid-cols-2">
                <Textarea label={`Blocked words (${num(lines(f.keywordsText).length)})`} rows={8} value={f.keywordsText} onChange={(e) => patch({ keywordsText: e.target.value })}
                  placeholder={'e.g.\nofficial\nreplica'} hint="A store name or address that contains one of these is refused. At least 2 letters each." />
                <Textarea label={`Blocked domains (${num(lines(f.domainsText).length)})`} rows={8} value={f.domainsText} onChange={(e) => patch({ domainsText: e.target.value })}
                  placeholder={'e.g.\ndaraz.pk\ngov.pk'} hint="The domain and every subdomain under it cannot be added." />
              </div>
            </Card>
          </>
        )}

        {tab === 'policies' && (
          <Card title="Default policy templates" description="Shops start from these when they add a policy page. Leave the text empty to use the built-in template. Changing a template does not change policies shops already saved.">
            <div className="space-y-5">
              {POLICY_KINDS.map((k) => (
                <div key={k} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100 sm:p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-[0.875rem] font-semibold text-slate-900"><FileText className="h-4 w-4 text-slate-500" />{POLICY_TITLE[k]}</span>
                    {f.policies[k].bodyHtml.trim() ? <Pill tone="indigo">Custom template</Pill> : <Pill>Built-in</Pill>}
                  </div>
                  <div className="space-y-3">
                    <Input label="Title" maxLength={120} value={f.policies[k].title} onChange={(e) => patch({ policies: { ...f.policies, [k]: { ...f.policies[k], title: e.target.value } } })} />
                    <Textarea label="Text (HTML allowed: paragraphs, headings, lists, links)" rows={6} value={f.policies[k].bodyHtml}
                      onChange={(e) => patch({ policies: { ...f.policies, [k]: { ...f.policies[k], bodyHtml: e.target.value } } })}
                      placeholder="Empty: the built-in template is used." hint="Unsafe HTML is removed when saved. Shops get this text as written, so use general wording instead of a store name." />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </fieldset>

      {guide.isOpen && (
        <PageGuide
          title="Website controls"
          description="Rules that apply to every Nafaa Stores website at once."
          flowTitle="How a change spreads"
          flow={[
            { label: 'Change', hint: 'On this page', icon: Power, color: '#4f46e5' },
            { label: 'Save', hint: 'Asks for risky steps', icon: Save, color: '#0284c7' },
            { label: 'Every website', hint: 'Within 30 seconds', icon: Globe, color: '#059669' },
          ]}
          steps={[
            { icon: ShieldAlert, color: '#e11d48', title: 'Emergencies', text: 'Pause checkout to stop new orders everywhere, and show a banner to explain why.' },
            { icon: Palette, color: '#4f46e5', title: 'Themes and payments', text: 'Hide a theme from new websites, or switch a payment method off for every checkout.' },
            { icon: Ban, color: '#d97706', title: 'Limits and blocks', text: 'Set how many domains and websites a shop may have, and block words or domains used for abuse.' },
            { icon: FileText, color: '#0d9488', title: 'Policy templates', text: 'Write the starting text shops get for refund, privacy, terms and shipping pages.' },
          ]}
          tips={['Every save is written to the admin audit log.', 'Nothing here deletes store data; switching things off only hides or pauses them.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

function Row({ icon: Icon, label, hint, children }: { icon: typeof Power; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <div className="min-w-0">
          <p className="text-[0.875rem] font-medium text-slate-900">{label}</p>
          {hint && <p className="text-[0.75rem] text-slate-500">{hint}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
