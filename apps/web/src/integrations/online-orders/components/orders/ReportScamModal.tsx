/**
 * Report the customer of an order as a scammer: reason and evidence note,
 * with the number's history at this shop so the decision is explained.
 * Saving blocks the number; new orders from it are held, not accepted.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShieldAlert } from 'lucide-react';
import { Button, Input, Modal, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage, type OnlineOrder } from '../../api/online-orders.api';
import { growthApi } from '../../api/growth.api';
import { orderNo } from '../../lib/orders';
import { useBoardRefresh } from './useMoveOrder';

const REASONS = [t('Fake order'), t('Parcel lene se inkaar'), t('Ghalat number / address'), t('Baar baar RTO'), t('Dhoka / fraud')];

export function ReportScamModal({ order: o, onClose }: { order: OnlineOrder; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const refresh = useBoardRefresh();
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: () => growthApi.reportScam(o.id, { reason: reason.trim(), evidence: evidence.trim() || undefined }),
    onSuccess: () => {
      toast.success(t('Number block ho gaya — is se naye order khud accept nahi honge'));
      qc.invalidateQueries({ queryKey: ['blocklist'] });
      qc.invalidateQueries({ queryKey: ['scam-report'] });
      refresh(o.id);
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const r = o.risk;
  return (
    <Modal open onClose={onClose} size="sm" title={t('Scammer report karein')} description={`#${orderNo(o)} · ${o.customerName} · ${o.customerPhone ?? ''}`}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t('Rehne dein')}</Button>
          <Button variant="critical" loading={save.isPending} disabled={reason.trim().length < 3} onClick={() => save.mutate()} leftIcon={<ShieldAlert className="h-4 w-4" />}>{t('Report aur block')}</Button>
        </div>
      }>
      <div className="space-y-3">
        {r && (
          <div className="rounded-xl bg-slate-50 p-3 text-[0.8125rem] text-slate-700 ring-1 ring-slate-200">
            <p className="font-semibold text-slate-900">{t('Is number ki history (aap ki dukaan)')}</p>
            <p className="mt-0.5">{t('{{total}} order · {{delivered}} liye · {{returned}} wapas · {{cancelled}} cancel', { total: r.total, delivered: r.delivered, returned: r.returned, cancelled: r.cancelled })}</p>
            {r.reason && <p className="mt-0.5 text-slate-500">{r.reason}</p>}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {REASONS.map((x) => (
            <button key={x} type="button" onClick={() => setReason(x)}
              className={cn('rounded-full px-2.5 py-1 text-[0.75rem] font-medium ring-1', reason === x ? 'bg-rose-50 text-rose-700 ring-rose-300' : 'text-slate-600 ring-slate-200 hover:bg-slate-50')}>{x}</button>
          ))}
        </div>
        <Input size="sm" label={t('Wajah')} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
        <Textarea label={t('Saboot / note (optional)')} value={evidence} onChange={(e) => setEvidence(e.target.value)} maxLength={1000} rows={3}
          placeholder={t('Masalan: rider ne 3 dafa call ki, customer ne kaha order nahi kiya')} />
        <p className="text-[0.75rem] text-slate-500">{t('Sirf number block hota hai — naam ya shehar se koi khud block nahi hota. Baad me Block list se hata sakte hain.')}</p>
      </div>
    </Modal>
  );
}
