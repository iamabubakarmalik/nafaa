/**
 * One transfer: every line (product, variant, roll, IMEI, used phone or
 * serial) with sent against received, its value, the timeline from sending
 * to receiving or cancelling, and the actions the user's branch allows.
 */

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowRight, Ban, CheckCircle2, PackageCheck, Printer, Send, Truck } from 'lucide-react';
import { Button, Modal, Table, TBody, THead, Td, Th, Tr, controlClass } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { transfersApi, type StockTransfer } from '../api/transfers.api';
import { StatusBadge, dayTime, duration, lineName, lineRef, lineUnit, qty, shortValue } from './transferMeta';

export function TransferDetail({ row, money, canReceive, canCancel, onReceive, onPrint, onClose, onChanged }: {
  row: StockTransfer;
  money: (n: number) => string;
  canReceive: (t: StockTransfer) => boolean;
  canCancel: (t: StockTransfer) => boolean;
  onReceive: (t: StockTransfer) => void;
  onPrint: (t: StockTransfer) => void;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const q = useQuery({ queryKey: ['transfers', 'one', row.id], queryFn: () => transfersApi.getOne(row.id), placeholderData: row });
  const t = q.data ?? row;
  const short = shortValue(t);
  const sentAt = t.transferredAt ?? t.createdAt;

  return (
    <Modal open onClose={onClose} size="lg"
      title={<span className="flex flex-wrap items-center gap-2">{t.transferNumber}<StatusBadge status={t.status} /></span>}
      description={<span className="inline-flex flex-wrap items-center gap-1.5 font-medium text-slate-700">{t.fromShop.name}<ArrowRight className="h-3.5 w-3.5 text-slate-400" />{t.toShop.name}</span>}
      footer={<>
        <Button variant="secondary" className="mr-auto" onClick={() => onPrint(t)} leftIcon={<Printer className="h-4 w-4" />}>Print slip</Button>
        {canCancel(t) && <Button variant="secondary" onClick={() => setCancelling(true)} leftIcon={<Ban className="h-4 w-4 text-rose-600" />}>Cancel</Button>}
        {canReceive(t) && <Button onClick={() => onReceive(t)} leftIcon={<PackageCheck className="h-4 w-4" />}>Receive karein</Button>}
      </>}>
      <div className="space-y-4">
        <ol className="relative space-y-3 border-l-2 border-slate-200 pl-5">
          <Step icon={Send} tone="bg-blue-50 text-blue-700 ring-blue-200" title="Bheja" text={`${dayTime(sentAt)}${t.createdBy ? ` · ${t.createdBy.fullName}` : ''}`} sub={`${t.fromShop.name} ke stock se nikla`} />
          {t.status === 'IN_TRANSIT' && <Step icon={Truck} tone="bg-amber-50 text-amber-700 ring-amber-200" title="Raste me" text={`${duration(sentAt)} se`} sub={`${t.toShop.name} me receive hone ka intezar`} />}
          {t.status === 'RECEIVED' && (
            <Step icon={CheckCircle2} tone="bg-success-50 text-success-700 ring-success-200" title="Receive" text={`${dayTime(t.receivedAt)}${t.receivedBy ? ` · ${t.receivedBy.fullName}` : ''}`}
              sub={`${duration(sentAt, t.receivedAt)} laga · ${t.toShop.name} ke stock me gaya`} />
          )}
          {t.status === 'CANCELLED' && (
            <Step icon={Ban} tone="bg-slate-100 text-slate-600 ring-slate-200" title="Cancel" text={`${dayTime(t.cancelledAt)}${t.cancelledBy ? ` · ${t.cancelledBy.fullName}` : ''}`}
              sub={`${t.cancelReason ? `Wajah: ${t.cancelReason} · ` : ''}maal ${t.fromShop.name} ke stock me wapas`} />
          )}
        </ol>

        {short > 0 && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {money(short)} ka maal kam aaya — neeche laal lines dekhein
          </p>
        )}

        <Table minWidth="30rem" className="rounded-xl border border-slate-200">
            <THead>
              <Tr><Th className="px-3 py-2">Cheez</Th><Th align="right" className="px-3 py-2">Bheja</Th><Th align="right" className="px-3 py-2">Aaya</Th><Th align="right" className="px-3 py-2">Qeemat</Th></Tr>
            </THead>
            <TBody>
              {t.items.map((i) => {
                const less = t.status === 'RECEIVED' && i.receivedQty < i.quantity;
                return (
                  <Tr key={i.id} className={cn('align-top', less && 'bg-rose-50/50')}>
                    <Td className="px-3 py-2">
                      <p className="font-medium text-slate-900">{lineName(i)}</p>
                      {(lineRef(i) || i.notes) && <p className="text-[0.75rem] text-slate-500">{[lineRef(i), i.notes].filter(Boolean).join(' · ')}</p>}
                    </Td>
                    <Td align="right" className="px-3 py-2">{qty(i.quantity)} <span className="text-[0.75rem] text-slate-500">{lineUnit(i)}</span></Td>
                    <Td align="right" className={cn('px-3 py-2', less ? 'font-semibold text-rose-700' : 'text-slate-600')}>
                      {t.status === 'RECEIVED' ? qty(i.receivedQty) : t.status === 'CANCELLED' ? '—' : 'Raste me'}
                    </Td>
                    <Td align="right" className="px-3 py-2">{money(i.quantity * i.unitCost)}<span className="block text-[0.6875rem] text-slate-400">{money(i.unitCost)}/{lineUnit(i)}</span></Td>
                  </Tr>
                );
              })}
            </TBody>
            <tfoot>
              <Tr className="border-t border-slate-200 font-semibold"><Td className="px-3 py-2 text-slate-900" colSpan={3}>Kul qeemat (cost par)</Td><Td align="right" className="px-3 py-2 text-slate-900">{money(t.value)}</Td></Tr>
            </tfoot>
        </Table>

        {t.notes && <p className="whitespace-pre-line rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700 ring-1 ring-slate-100">{t.notes}</p>}
      </div>

      {cancelling && <CancelModal t={t} onClose={() => setCancelling(false)} onDone={() => { setCancelling(false); onChanged(); }} />}
    </Modal>
  );
}

function Step({ icon: I, tone, title, text, sub }: { icon: typeof Send; tone: string; title: string; text: string; sub?: string }) {
  return (
    <li className="relative">
      <span className="absolute -left-[2.2rem] -top-1 rounded-full bg-white p-1"><span className={cn('flex h-6 w-6 items-center justify-center rounded-full ring-1 ring-inset', tone)}><I className="h-3.5 w-3.5" /></span></span>
      <p className="text-sm font-semibold text-slate-900">{title} <span className="font-normal text-slate-600">· {text}</span></p>
      {sub && <p className="text-[0.75rem] text-slate-500">{sub}</p>}
    </li>
  );
}

function CancelModal({ t, onClose, onDone }: { t: StockTransfer; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const mut = useMutation({
    mutationFn: () => transfersApi.cancel(t.id, reason),
    onSuccess: () => { toast.success(`Transfer cancel — maal ${t.fromShop.name} ke stock me wapas`); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cancel nahi hua'),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Transfer cancel karein?"
      description={`Saara maal ${t.fromShop.name} ke stock me wapas aa jayega. Receive ho chuka transfer cancel nahi hota.`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button variant="danger" loading={mut.isPending} disabled={!reason.trim()} onClick={() => mut.mutate()}>Cancel karein</Button></>}>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {['Ghalat branch chuni', 'Ghalat maal chuna', 'Gaari nahi gayi', 'Wahan zaroorat nahi rahi'].map((r) => (
          <button key={r} type="button" onClick={() => setReason(r)} className={cn('rounded-full px-3 py-1 text-[0.8125rem] ring-1', reason === r ? 'bg-rose-50 font-semibold text-rose-700 ring-rose-300' : 'text-slate-600 ring-slate-200 hover:bg-slate-50')}>{r}</button>
        ))}
      </div>
      <input data-autofocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Wajah likhein" aria-label="Wajah"
        className={cn(controlClass(), 'h-10 px-3 text-sm')} />
      <p className="mt-1 text-[0.6875rem] text-slate-400">Wajah list aur print par dikhegi</p>
    </Modal>
  );
}
