/**
 * Order status mapping for one channel: which channel status moves the
 * Nafaa order where (inbound), and what each Nafaa board status does on the
 * channel (outbound). Choices are saved together; anything not changed
 * keeps Nafaa's default.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Plus, RotateCcw, X } from 'lucide-react';
import { Alert, Button, Input, Select, Skeleton } from '@/design-system/components';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../../api/online-orders.api';
import { channelOpsApi, type InboundTarget, type OutboundBoard, type StatusMapView } from '../../api/channel-ops.api';
import { boardEntry } from '../../lib/orders';

/** Words for an outbound action (also used by the activity log). */
export function actionLabel(a: string): string {
  const words: Record<string, string> = {
    none: t('Kuch nahi'), tag: t('Tag lagayein'), fulfill: t('Fulfill + tracking'), delivered: t('Fulfill + Delivered'),
    cancel: t('Order cancel'), paid: t('Paid mark karein'), note: t('Sirf note'), rts: t('Ready to ship'), send: t('Nafaa status bhejein'),
  };
  return words[a] ?? t('Status: {{status}}', { status: a });
}

const boardLabel = (b: OutboundBoard | InboundTarget) =>
  b === 'PAID' ? t('Paisa mila (Paid)') : b === 'NONE' ? t('Kuch nahi') : boardEntry(b)?.label ?? b;

const CUSTOM = '__custom';

export function StatusMapSection({ id, channelName }: { id: string; channelName: string }) {
  const qc = useQueryClient();
  const key = ['channel-status-map', id];
  const q = useQuery({ queryKey: key, queryFn: () => channelOpsApi.statusMap(id) });
  const [inbound, setInbound] = useState<Record<string, InboundTarget>>({});
  const [outbound, setOutbound] = useState<Record<string, string>>({});
  const [customOut, setCustomOut] = useState<Record<string, boolean>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newTarget, setNewTarget] = useState<InboundTarget>('DISPATCHED');

  const reset = (d?: StatusMapView) => {
    if (!d) return;
    setInbound(Object.fromEntries(d.inbound.map((r) => [r.key, r.target])));
    setOutbound(Object.fromEntries(d.outbound.map((r) => [r.board, r.action])));
    setCustomOut(Object.fromEntries(d.outbound.map((r) => [r.board, !r.options.includes(r.action)])));
    setRemoved([]);
  };
  useEffect(() => reset(q.data), [q.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => {
    const d = q.data;
    if (!d) return false;
    if (removed.length) return true;
    const inChanged = Object.entries(inbound).some(([k, v]) => d.inbound.find((r) => r.key === k)?.target !== v);
    return inChanged || d.outbound.some((r) => (outbound[r.board] ?? r.action) !== r.action);
  }, [q.data, inbound, outbound, removed]);

  const save = useMutation({
    mutationFn: () => channelOpsApi.saveStatusMap(id, { inbound, outbound, remove: removed }),
    onSuccess: (d) => { qc.setQueryData(key, d); toast.success(t('Status mapping save ho gayi')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (q.isLoading) return <div className="space-y-2 py-4">{[0, 1, 2].map((k) => <Skeleton key={k} className="h-9 rounded-xl" />)}</div>;
  if (q.error) return <p className="py-4 text-[0.8125rem] text-rose-600">{apiErrorMessage(q.error)}</p>;
  const d = q.data!;
  if (!d.channel) {
    return <p className="py-4 text-[0.8125rem] text-slate-500">{t('{{name}} ke status pakke hain — accept, cancel aur deliver khud jate hain.', { name: channelName })}</p>;
  }
  const rows = Object.keys(inbound).filter((k) => !removed.includes(k));
  const isCustom = (k: string) => d.inbound.find((r) => r.key === k)?.custom ?? !d.inbound.some((r) => r.key === k);
  const addCustom = () => {
    const k = newKey.trim().toLowerCase().replace(/^wc-/, '').replace(/\s+/g, '_');
    if (!/^[a-z0-9][a-z0-9_-]{0,39}$/.test(k)) { toast.error(t('Status ka naam chhota aur angrezi harfon me likhein (maslan shipped)')); return; }
    setInbound((m) => ({ ...m, [k]: newTarget }));
    setRemoved((r) => r.filter((x) => x !== k));
    setNewKey('');
  };

  return (
    <div className="divide-y divide-slate-100">
      <div className="py-3.5">
        <p className="text-[0.875rem] font-medium text-slate-900">{t('{{name}} → Nafaa', { name: channelName })}</p>
        <p className="mt-0.5 text-[0.78125rem] leading-relaxed text-slate-500">
          {t('{{name}} par status badle to Nafaa ka order kahan jaye. Sirf accept ho chuke orders aage barhte hain — bill khud kabhi nahi banta, aur order peeche nahi jata.', { name: channelName })}
        </p>
        <ul className="mt-2.5 space-y-1.5">
          {rows.map((k) => (
            <li key={k} className="flex flex-wrap items-center gap-2">
              <code className="min-w-[8.5rem] rounded-lg bg-slate-100 px-2 py-1 font-mono text-[0.75rem] text-slate-700">{k}</code>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              <Select size="sm" aria-label={t('{{status}} par Nafaa', { status: k })} wrapperClassName="w-52 max-w-full" value={inbound[k]}
                onChange={(e) => setInbound((m) => ({ ...m, [k]: e.target.value as InboundTarget }))}>
                {d.targets.map((x) => <option key={x} value={x}>{boardLabel(x)}</option>)}
              </Select>
              {isCustom(k) && (
                <button type="button" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600" aria-label={t('Hatayein')}
                  onClick={() => setRemoved((r) => [...r, k])}><X className="h-4 w-4" /></button>
              )}
            </li>
          ))}
        </ul>
        {d.customInbound && (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <Input size="sm" label={t('Apna status')} placeholder="shipped" value={newKey} onChange={(e) => setNewKey(e.target.value)} wrapperClassName="w-40" />
            <Select size="sm" aria-label={t('Nafaa me')} wrapperClassName="w-44" value={newTarget} onChange={(e) => setNewTarget(e.target.value as InboundTarget)}>
              {d.targets.filter((x) => x !== 'NONE').map((x) => <option key={x} value={x}>{boardLabel(x)}</option>)}
            </Select>
            <Button size="sm" variant="secondary" disabled={!newKey.trim()} onClick={addCustom} leftIcon={<Plus className="h-4 w-4" />}>{t('Jorein')}</Button>
          </div>
        )}
      </div>

      <div className="py-3.5">
        <p className="text-[0.875rem] font-medium text-slate-900">{t('Nafaa → {{name}}', { name: channelName })}</p>
        <p className="mt-0.5 text-[0.78125rem] leading-relaxed text-slate-500">{t('Board par status badle to {{name}} par kya ho.', { name: channelName })}</p>
        {!d.outboundLive && (
          <Alert tone="info" className="mt-2">{t('Abhi Nafaa {{name}} ko status nahi bhej sakta — pehle Setup se jorein (website ho to Status URL lagayein).', { name: channelName })}</Alert>
        )}
        <ul className="mt-2.5 space-y-1.5">
          {d.outbound.map((r) => {
            const v = outbound[r.board] ?? r.action;
            const own = customOut[r.board];
            return (
              <li key={r.board} className="flex flex-wrap items-center gap-2">
                <span className="min-w-[8.5rem] text-[0.8125rem] font-semibold text-slate-800">{boardLabel(r.board)}</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                <Select size="sm" aria-label={t('{{status}} par {{name}}', { status: boardLabel(r.board), name: channelName })} wrapperClassName="w-52 max-w-full"
                  value={own ? CUSTOM : v}
                  onChange={(e) => {
                    const x = e.target.value;
                    if (x === CUSTOM) { setCustomOut((m) => ({ ...m, [r.board]: true })); setOutbound((m) => ({ ...m, [r.board]: '' })); }
                    else { setCustomOut((m) => ({ ...m, [r.board]: false })); setOutbound((m) => ({ ...m, [r.board]: x })); }
                  }}>
                  {r.options.map((o) => <option key={o} value={o}>{actionLabel(o)}{o === r.defaultAction ? t(' (default)') : ''}</option>)}
                  {d.freeOutbound && <option value={CUSTOM}>{t('Apna status…')}</option>}
                </Select>
                {own && (
                  <Input size="sm" aria-label={t('Apna status')} placeholder={d.channel === 'WOOCOMMERCE' ? 'shipped' : 'on_the_way'} value={v}
                    onChange={(e) => setOutbound((m) => ({ ...m, [r.board]: e.target.value.trim().toLowerCase() }))} wrapperClassName="w-40" />
                )}
              </li>
            );
          })}
        </ul>
        {d.channel === 'WOOCOMMERCE' && <p className="mt-2 text-[0.75rem] text-slate-500">{t('Apna Woo status (maslan "shipped") pehle WooCommerce me bana hona chahiye — warna Woo use nahi leta.')}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2 py-3">
        <Button size="sm" loading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>{t('Save')}</Button>
        <Button size="sm" variant="ghost" disabled={!dirty} onClick={() => reset(q.data)} leftIcon={<RotateCcw className="h-4 w-4" />}>{t('Wapas')}</Button>
      </div>
    </div>
  );
}
