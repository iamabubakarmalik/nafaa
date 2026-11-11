/**
 * Platform commerce controls, stored as one system setting
 * (commerce.controls). The kill switch and catalog job limits take effect on
 * the server within 30 seconds. Defaults, templates, statuses and "Coming
 * soon" tiles are served to merchant screens at GET
 * /online-store/platform-controls.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Lightbulb, Plus, Power, Save, Settings2, Trash2, Wrench } from 'lucide-react';
import { Alert, Button, Card, Input, PageHero, PageShell, Select, Skeleton, Tabs, Textarea, confirmDialog, heroButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminCommerceApi, type CommerceControls } from '@/api/admin-commerce.api';
import { Empty, errMsg, num, Toggle } from '@/features/shared/kit';
import { dateTime, enumLabel, kindLabel } from '../components/CommerceUi';

const BUILT_IN_CHUNK: Record<string, string> = { IMPORT_ALL: '25', LINK_ALL: '200', PUSH: '25–100 by channel', PUBLISH: '10–20 by channel' };
const MODULE_LABEL: Record<string, string> = {
  orders: 'Orders board', catalog: 'Master catalog', dispatch: 'Dispatch', couriers: 'Courier booking', cod: 'COD reconcile', returns: 'Returns (RTO)',
  abandoned_carts: 'Abandoned carts', growth: 'Growth', whatsapp: 'WhatsApp messages', storefront: 'Storefront', payment_links: 'Payment links', marketing: 'Marketing hub',
  social: 'Social media studio',
  retention: 'Retention (campaigns, reviews, loyalty)', affiliates: 'Influencers & affiliates',
  meta: 'Facebook & Instagram (Meta)',
};

type Tab = 'pushes' | 'shops' | 'messages';

export default function CommerceControlsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [tab, setTab] = useState<Tab>('pushes');
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-commerce-controls'], queryFn: adminCommerceApi.controls });
  const [c, setC] = useState<CommerceControls | null>(null);
  useEffect(() => { if (data) setC(data.controls); }, [data]);
  const dirty = !!c && !!data && JSON.stringify(c) !== JSON.stringify(data.controls);

  const save = useMutation({
    mutationFn: (v: CommerceControls) => adminCommerceApi.saveControls(v),
    onSuccess: (res) => { qc.setQueryData(['admin-commerce-controls'], res); setC(res.controls); toast.success('Controls saved'); },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (isLoading || !c || !data) {
    return (
      <PageShell>
        <PageHero title="Controls" loading />
        {error ? <Card><Empty>Could not load controls.</Empty></Card> : <Skeleton className="h-64 rounded-3xl" />}
      </PageShell>
    );
  }
  const patch = (p: Partial<CommerceControls>) => setC({ ...c, ...p });
  const paused = Object.keys(c.killSwitch).filter((k) => c.killSwitch[k]);
  const soon = Object.keys(c.comingSoon).filter((k) => c.comingSoon[k]);

  const onSave = async () => {
    const newlyPaused = paused.filter((k) => !data.controls.killSwitch[k]);
    if (newlyPaused.length && !(await confirmDialog({
      title: 'Pause pushes for every shop?', text: `Stock, price and content pushes to ${newlyPaused.map(kindLabel).join(', ')} stop for every shop. Orders still come in.`, yes: 'Pause pushes', danger: true,
    }))) return;
    save.mutate(c);
  };

  return (
    <PageShell>
      <PageHero
        title="Controls"
        chip={dirty ? 'Unsaved changes' : undefined}
        busy={save.isPending}
        actions={
          <>
            <button type="button" className={heroPrimaryButton} onClick={onSave} disabled={!dirty || save.isPending}><Save className="h-4 w-4" /> Save changes</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={[
          { label: 'Paused channel types', value: num(paused.length), hint: paused.length ? paused.map(kindLabel).join(', ') : 'All pushes on' },
          { label: 'Coming soon tiles', value: num(soon.length) },
          { label: 'WhatsApp templates', value: num(c.whatsappTemplates.length) },
          { label: 'Custom statuses', value: num(c.customStatuses.length) },
        ]}
      />
      <p className="text-[0.75rem] text-slate-500">{data.updatedAt ? `Last saved ${dateTime(data.updatedAt)}${data.updatedBy ? ` by ${data.updatedBy.fullName}` : ''}.` : 'Never saved; built-in defaults apply.'} Saved changes reach the server within 30 seconds. Every save is written to the activity log.</p>

      <Tabs value={tab} onChange={setTab} label="Control sections" items={[
        { value: 'pushes', label: 'Pushes and jobs', count: paused.length || undefined, tone: 'danger' },
        { value: 'shops', label: 'Shop defaults and modules' },
        { value: 'messages', label: 'Messages and statuses' },
      ]} />

      {tab === 'pushes' && (
        <>
          <Card title="Kill switch" description="Pause all pushes to one channel type for every shop, for example when that platform's API is down. Orders still come in.">
            {!!paused.length && <Alert tone="danger" className="mb-4">Paused: {paused.map(kindLabel).join(', ')}</Alert>}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.options.channelTypes.map((t) => (
                <Row key={t} label={kindLabel(t)} hint={t === 'META_CAPI' ? 'Meta Conversions API events (delivered orders); queued events wait' : t === 'META' ? 'Facebook & Instagram publishing, inbox replies, catalog sync, ads and WhatsApp calls' : ['SHOPIFY', 'DARAZ', 'WOOCOMMERCE'].includes(t) ? 'Stock, price and content pushes' : 'Stored; Nafaa does not push to this type today'}>
                  <Toggle label={`Pause ${kindLabel(t)}`} checked={!!c.killSwitch[t]} onChange={(v) => patch({ killSwitch: { ...c.killSwitch, [t]: v } })} />
                </Row>
              ))}
            </div>
            <Input className="mt-4" label="Reason (internal)" value={c.killSwitchNote ?? ''} onChange={(e) => patch({ killSwitchNote: e.target.value || null })} maxLength={300} placeholder="e.g. Daraz API returning 500 since 14:00" />
          </Card>

          <Card title="Catalog job limits" description="Items per chunk and the pause between chunks. Leave empty for the built-in value.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.options.jobKinds.map((k) => (
                <Input key={k} type="number" min={1} max={500} label={`${enumLabel(k)} chunk`} value={c.catalogJobs.chunkSize[k] ?? ''} placeholder={BUILT_IN_CHUNK[k]}
                  onChange={(e) => {
                    const next = { ...c.catalogJobs.chunkSize };
                    if (e.target.value) next[k] = Math.max(1, Math.min(500, Number(e.target.value))); else delete next[k];
                    patch({ catalogJobs: { ...c.catalogJobs, chunkSize: next } });
                  }} />
              ))}
              <Input type="number" min={100} max={60000} label="Pause between chunks (ms)" value={c.catalogJobs.delayMs ?? ''} placeholder="800–1500 by channel"
                onChange={(e) => patch({ catalogJobs: { ...c.catalogJobs, delayMs: e.target.value ? Number(e.target.value) : null } })} />
            </div>
          </Card>
        </>
      )}

      {tab === 'shops' && (
        <>
          <Card title="Defaults for new shops" description="Offered to merchant screens for new channels. Existing channels keep their own settings.">
            <div className="grid gap-3 lg:grid-cols-3">
              <Row label="Auto-link sure matches" hint="Link products with the same SKU or barcode on their own">
                <Toggle label="Auto-link" checked={c.newShopDefaults.autoLink} onChange={(v) => patch({ newShopDefaults: { ...c.newShopDefaults, autoLink: v } })} />
              </Row>
              <Row label="Post order costs to expenses" hint="Courier, COD and packaging costs as an expense">
                <Toggle label="Post order costs" checked={c.newShopDefaults.postOrderCosts} onChange={(v) => patch({ newShopDefaults: { ...c.newShopDefaults, postOrderCosts: v } })} />
              </Row>
              <Select label="Stock mode" hint="How much stock a channel is shown" value={c.newShopDefaults.stockMode}
                onChange={(e) => patch({ newShopDefaults: { ...c.newShopDefaults, stockMode: e.target.value as CommerceControls['newShopDefaults']['stockMode'] } })}
                options={[{ value: 'all', label: 'All stock' }, { value: 'percent', label: 'A percentage' }, { value: 'fixed', label: 'A fixed amount' }]} />
            </div>
          </Card>

          <Card title="Coming soon tiles" description="Switched on: merchants see a Coming soon tile for that module instead of the module.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.options.modules.map((m) => (
                <Row key={m} label={MODULE_LABEL[m] ?? enumLabel(m)}>
                  <Toggle label={`Coming soon: ${m}`} checked={!!c.comingSoon[m]} onChange={(v) => patch({ comingSoon: { ...c.comingSoon, [m]: v } })} />
                </Row>
              ))}
            </div>
          </Card>

          <Card title="Meta beta shops" description="While the Meta app is in development mode, only these shops see the live Facebook & Instagram connect; others see Coming soon. Each person who connects also needs a tester role on the Meta app. One shop ID per line.">
            <IdList value={c.metaBetaShops ?? []} onChange={(ids) => patch({ metaBetaShops: ids })} />
            <p className="mt-1 text-[0.75rem] text-slate-500">{(c.metaBetaShops ?? []).length} shop(s). After Meta App Review, set META_APP_LIVE=1 on the API to open it for every shop (the Coming soon tile above still wins).</p>
          </Card>
        </>
      )}

      {tab === 'messages' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card title="Default WhatsApp templates" description="Offered to shops that have not written their own. Use {name}, {order}, {total}, {tracking}."
            actions={<Button size="sm" variant="secondary" leftIcon={<Plus className="h-4 w-4" />} disabled={c.whatsappTemplates.length >= 30} onClick={() => patch({ whatsappTemplates: [...c.whatsappTemplates, { key: '', label: '', text: '' }] })}>Add</Button>}>
            {!c.whatsappTemplates.length ? <Empty>No default templates.</Empty> : (
              <div className="space-y-4">
                {c.whatsappTemplates.map((t, i) => {
                  const set = (p: Partial<typeof t>) => patch({ whatsappTemplates: c.whatsappTemplates.map((x, j) => (j === i ? { ...x, ...p } : x)) });
                  return (
                    <div key={i} className="rounded-xl border border-slate-200 p-3">
                      <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                        <Input value={t.key} onChange={(e) => set({ key: e.target.value })} placeholder="Key, e.g. confirm" aria-label="Template key" />
                        <Input value={t.label} onChange={(e) => set({ label: e.target.value })} placeholder="Label" aria-label="Template label" />
                        <Button size="sm" variant="ghost" aria-label="Remove template" onClick={() => patch({ whatsappTemplates: c.whatsappTemplates.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                      <Textarea className="mt-2" value={t.text} onChange={(e) => set({ text: e.target.value })} rows={3} maxLength={2000} placeholder="Message text" aria-label="Message text" />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Default custom statuses" description="Extra order stages offered to shops with none of their own."
            actions={<Button size="sm" variant="secondary" leftIcon={<Plus className="h-4 w-4" />} disabled={c.customStatuses.length >= 20} onClick={() => patch({ customStatuses: [...c.customStatuses, { key: '', label: '', color: 'slate' }] })}>Add</Button>}>
            {!c.customStatuses.length ? <Empty>No default statuses.</Empty> : (
              <div className="space-y-2">
                {c.customStatuses.map((s, i) => {
                  const set = (p: Partial<typeof s>) => patch({ customStatuses: c.customStatuses.map((x, j) => (j === i ? { ...x, ...p } : x)) });
                  return (
                    <div key={i} className="grid grid-cols-[1fr_1fr_7rem_auto] items-center gap-2">
                      <Input value={s.key} onChange={(e) => set({ key: e.target.value })} placeholder="Key, e.g. call_back" aria-label="Status key" />
                      <Input value={s.label} onChange={(e) => set({ label: e.target.value })} placeholder="Label" aria-label="Status label" />
                      <Select value={s.color} onChange={(e) => set({ color: e.target.value })} aria-label="Status color"
                        options={['slate', 'indigo', 'sky', 'emerald', 'amber', 'rose', 'violet'].map((col) => ({ value: col, label: enumLabel(col) }))} />
                      <Button size="sm" variant="ghost" aria-label="Remove status" onClick={() => patch({ customStatuses: c.customStatuses.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </section>
      )}

      {guide.isOpen && (
        <PageGuide
          title="Controls"
          description="Platform switches that apply to every shop’s online store."
          flowTitle="From switch to shop"
          flow={[
            { label: 'You change a switch', hint: 'Here', icon: Settings2, color: '#4f46e5' },
            { label: 'Save', hint: 'Written to activity log', icon: Save, color: '#0284c7' },
            { label: 'Server', hint: 'Applies within 30 seconds', icon: Power, color: '#d97706' },
            { label: 'Shops', hint: 'See the change', icon: Wrench, color: '#059669' },
          ]}
          steps={[
            { icon: AlertTriangle, color: '#e11d48', title: 'Kill switch', text: 'Pauses pushes to one channel type for all shops. Use it when a platform API is down. Orders still come in.' },
            { icon: Settings2, color: '#4f46e5', title: 'Defaults', text: 'Defaults only apply to new channels. Shops that already set theirs keep them.' },
            { icon: Save, color: '#059669', title: 'Save', text: 'Nothing changes until you press Save changes. Pausing asks you to confirm first.' },
          ]}
          tips={['Coming soon hides a module from shops without removing their data.', 'Leave a job limit empty to use the built-in value.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        {hint && <div className="text-[0.75rem] text-slate-500">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

/** One id per line; the text is kept as typed and parsed into ids on every change. */
function IdList({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const [text, setText] = useState(value.join('\n'));
  useEffect(() => {
    if (text.split(/[\s,]+/).filter(Boolean).join() !== value.join()) setText(value.join('\n'));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Textarea rows={4} value={text} placeholder="Shop ID, one per line" aria-label="Meta beta shop IDs" className="font-mono text-xs"
      onChange={(e) => { setText(e.target.value); onChange(e.target.value.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean)); }} />
  );
}
