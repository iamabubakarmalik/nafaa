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
import { AlertTriangle, Plus, Save, Trash2 } from 'lucide-react';
import { adminCommerceApi, type CommerceControls } from '@/api/admin-commerce.api';
import { Button } from '@/components/ui/Button';
import { Card, CommerceHero, dateTime, Empty, enumLabel, inputCls, kindLabel, labelCls, Toggle } from '../components/CommerceUi';

const BUILT_IN_CHUNK: Record<string, string> = { IMPORT_ALL: '25', LINK_ALL: '200', PUSH: '25–100 by channel', PUBLISH: '10–20 by channel' };
const MODULE_LABEL: Record<string, string> = {
  orders: 'Orders board', catalog: 'Master catalog', dispatch: 'Dispatch', couriers: 'Courier booking', cod: 'COD reconcile', returns: 'Returns (RTO)',
  abandoned_carts: 'Abandoned carts', growth: 'Growth', whatsapp: 'WhatsApp messages', storefront: 'Storefront', payment_links: 'Payment links',
};
const errMsg = (e: any) => e?.response?.data?.message ?? e?.message ?? 'Could not save';

export default function CommerceControlsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-commerce-controls'], queryFn: adminCommerceApi.controls });
  const [c, setC] = useState<CommerceControls | null>(null);
  useEffect(() => { if (data) setC(data.controls); }, [data]);
  const dirty = !!c && !!data && JSON.stringify(c) !== JSON.stringify(data.controls);

  const save = useMutation({
    mutationFn: (v: CommerceControls) => adminCommerceApi.saveControls(v),
    onSuccess: (res) => { qc.setQueryData(['admin-commerce-controls'], res); setC(res.controls); toast.success('Controls saved'); },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (isLoading || !c || !data) return <Card>{error ? <Empty>Could not load controls.</Empty> : <Empty>Loading…</Empty>}</Card>;
  const patch = (p: Partial<CommerceControls>) => setC({ ...c, ...p });
  const paused = Object.keys(c.killSwitch).filter((k) => c.killSwitch[k]);

  const onSave = () => {
    const newlyPaused = paused.filter((k) => !data.controls.killSwitch[k]);
    if (newlyPaused.length && !window.confirm(`Pause all stock, price and content pushes to ${newlyPaused.map(kindLabel).join(', ')} for every shop?`)) return;
    save.mutate(c);
  };

  return (
    <div className="space-y-6">
      <CommerceHero title="Controls" subtitle="Platform switches for every shop's online store. Saved changes reach the server within 30 seconds.">
        <Button onClick={onSave} disabled={!dirty} loading={save.isPending} className="bg-white text-indigo-800 hover:bg-white/90"><Save className="h-4 w-4" />Save changes</Button>
      </CommerceHero>
      <p className="text-xs text-slate-500">{data.updatedAt ? `Last saved ${dateTime(data.updatedAt)}${data.updatedBy ? ` by ${data.updatedBy.fullName}` : ''}.` : 'Never saved; built-in defaults apply.'} Every save is written to the activity log.</p>

      <Card title="Kill switch" subtitle="Pause all pushes to one channel type for every shop, for example when that platform's API is down. Orders still come in.">
        {!!paused.length && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800"><AlertTriangle className="h-4 w-4" />Paused: {paused.map(kindLabel).join(', ')}</div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.options.channelTypes.map((t) => (
            <Row key={t} label={kindLabel(t)} hint={['SHOPIFY', 'DARAZ', 'WOOCOMMERCE'].includes(t) ? 'Stock, price and content pushes' : 'Stored; Nafaa does not push to this type today'}>
              <Toggle label={`Pause ${kindLabel(t)}`} checked={!!c.killSwitch[t]} onChange={(v) => patch({ killSwitch: { ...c.killSwitch, [t]: v } })} />
            </Row>
          ))}
        </div>
        <label className={`${labelCls} mt-4`}>Reason (internal)</label>
        <input value={c.killSwitchNote ?? ''} onChange={(e) => patch({ killSwitchNote: e.target.value || null })} maxLength={300} placeholder="e.g. Daraz API returning 500 since 14:00" className={inputCls} />
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card title="Defaults for new shops" subtitle="Offered to merchant screens for new channels. Existing channels keep their own settings.">
          <div className="space-y-3">
            <Row label="Auto-link sure matches" hint="Link products with the same SKU or barcode on their own">
              <Toggle label="Auto-link" checked={c.newShopDefaults.autoLink} onChange={(v) => patch({ newShopDefaults: { ...c.newShopDefaults, autoLink: v } })} />
            </Row>
            <Row label="Post order costs to expenses" hint="Courier, COD and packaging costs as an expense">
              <Toggle label="Post order costs" checked={c.newShopDefaults.postOrderCosts} onChange={(v) => patch({ newShopDefaults: { ...c.newShopDefaults, postOrderCosts: v } })} />
            </Row>
            <Row label="Stock mode" hint="How much stock a channel is shown">
              <select value={c.newShopDefaults.stockMode} onChange={(e) => patch({ newShopDefaults: { ...c.newShopDefaults, stockMode: e.target.value as any } })} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm">
                <option value="all">All stock</option><option value="percent">A percentage</option><option value="fixed">A fixed amount</option>
              </select>
            </Row>
          </div>
        </Card>

        <Card title="Catalog job limits" subtitle="Items per chunk and the pause between chunks. Leave empty for the built-in value.">
          <div className="grid grid-cols-2 gap-3">
            {data.options.jobKinds.map((k) => (
              <div key={k}>
                <label className={labelCls}>{enumLabel(k)} chunk</label>
                <input type="number" min={1} max={500} value={c.catalogJobs.chunkSize[k] ?? ''} placeholder={BUILT_IN_CHUNK[k]}
                  onChange={(e) => {
                    const next = { ...c.catalogJobs.chunkSize };
                    if (e.target.value) next[k] = Math.max(1, Math.min(500, Number(e.target.value))); else delete next[k];
                    patch({ catalogJobs: { ...c.catalogJobs, chunkSize: next } });
                  }} className={inputCls} />
              </div>
            ))}
            <div className="col-span-2">
              <label className={labelCls}>Pause between chunks (ms)</label>
              <input type="number" min={100} max={60000} value={c.catalogJobs.delayMs ?? ''} placeholder="800–1500 by channel"
                onChange={(e) => patch({ catalogJobs: { ...c.catalogJobs, delayMs: e.target.value ? Number(e.target.value) : null } })} className={inputCls} />
            </div>
          </div>
        </Card>
      </section>

      <Card title="Coming soon tiles" subtitle="Switched on: merchants see a Coming soon tile for that module instead of the module.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.options.modules.map((m) => (
            <Row key={m} label={MODULE_LABEL[m] ?? enumLabel(m)}>
              <Toggle label={`Coming soon: ${m}`} checked={!!c.comingSoon[m]} onChange={(v) => patch({ comingSoon: { ...c.comingSoon, [m]: v } })} />
            </Row>
          ))}
        </div>
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card title="Default WhatsApp templates" subtitle="Offered to shops that have not written their own. Use {name}, {order}, {total}, {tracking}."
          action={<Button size="sm" variant="secondary" disabled={c.whatsappTemplates.length >= 30} onClick={() => patch({ whatsappTemplates: [...c.whatsappTemplates, { key: '', label: '', text: '' }] })}><Plus className="h-4 w-4" />Add</Button>}>
          {!c.whatsappTemplates.length ? <Empty>No default templates.</Empty> : (
            <div className="space-y-4">
              {c.whatsappTemplates.map((t, i) => {
                const set = (p: Partial<typeof t>) => patch({ whatsappTemplates: c.whatsappTemplates.map((x, j) => (j === i ? { ...x, ...p } : x)) });
                return (
                  <div key={i} className="rounded-2xl border border-slate-200 p-3">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <input value={t.key} onChange={(e) => set({ key: e.target.value })} placeholder="Key, e.g. confirm" className={inputCls} />
                      <input value={t.label} onChange={(e) => set({ label: e.target.value })} placeholder="Label" className={inputCls} />
                      <Button size="sm" variant="ghost" aria-label="Remove template" onClick={() => patch({ whatsappTemplates: c.whatsappTemplates.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <textarea value={t.text} onChange={(e) => set({ text: e.target.value })} rows={3} maxLength={2000} placeholder="Message text" className={`${inputCls} mt-2 h-auto py-2`} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Default custom statuses" subtitle="Extra order stages offered to shops with none of their own."
          action={<Button size="sm" variant="secondary" disabled={c.customStatuses.length >= 20} onClick={() => patch({ customStatuses: [...c.customStatuses, { key: '', label: '', color: 'slate' }] })}><Plus className="h-4 w-4" />Add</Button>}>
          {!c.customStatuses.length ? <Empty>No default statuses.</Empty> : (
            <div className="space-y-2">
              {c.customStatuses.map((s, i) => {
                const set = (p: Partial<typeof s>) => patch({ customStatuses: c.customStatuses.map((x, j) => (j === i ? { ...x, ...p } : x)) });
                return (
                  <div key={i} className="grid grid-cols-[1fr_1fr_7rem_auto] gap-2">
                    <input value={s.key} onChange={(e) => set({ key: e.target.value })} placeholder="Key, e.g. call_back" className={inputCls} />
                    <input value={s.label} onChange={(e) => set({ label: e.target.value })} placeholder="Label" className={inputCls} />
                    <select value={s.color} onChange={(e) => set({ color: e.target.value })} className={inputCls}>
                      {['slate', 'indigo', 'sky', 'emerald', 'amber', 'rose', 'violet'].map((col) => <option key={col} value={col}>{enumLabel(col)}</option>)}
                    </select>
                    <Button size="sm" variant="ghost" aria-label="Remove status" onClick={() => patch({ customStatuses: c.customStatuses.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={!dirty} loading={save.isPending}><Save className="h-4 w-4" />Save changes</Button>
      </div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
      {children}
    </div>
  );
}
