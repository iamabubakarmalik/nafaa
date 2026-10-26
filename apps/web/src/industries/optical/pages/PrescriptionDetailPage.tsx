/**
 * One nuskha: the eye power as printed, who prescribed it and until when,
 * the glasses ordered on it, and the actions — make a glasses order,
 * correct, renew, switch off, print, WhatsApp the customer.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, Eye, Glasses, MessageCircle, Pencil, Printer, RefreshCw } from 'lucide-react';
import { Button, Card, Modal, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr, heroButton, heroPrimaryButton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { usePrinter } from '@core/print';
import { prescriptionsApi } from '../api/prescriptions.api';
import { Pill, PowerTable } from '../components/ui';
import { OPTICAL_KEYS, apiError, dayOnly, daysFrom, orderStatusOf, rxTypeLabel, waLink } from '../lib/meta';
import { rxDoc } from '../lib/print';

export default function PrescriptionDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { print } = usePrinter();
  const [confirmOff, setConfirmOff] = useState(false);
  const q = useQuery({ queryKey: [OPTICAL_KEYS.rx, 'one', id], queryFn: () => prescriptionsApi.getOne(id) });
  const rx = q.data;
  const refresh = () => qc.invalidateQueries({ queryKey: [OPTICAL_KEYS.rx] });
  const renew = useMutation({
    mutationFn: () => prescriptionsApi.renew(id),
    onSuccess: (n) => { toast.success(`Naya nuskha ${n.prescriptionNumber}`); refresh(); navigate(`/optical/prescriptions/${n.id}/edit`); },
    onError: (e) => toast.error(apiError(e, 'Renew nahi hua')),
  });
  const off = useMutation({
    mutationFn: () => prescriptionsApi.deactivate(id),
    onSuccess: () => { toast.success('Nuskha band kar diya'); setConfirmOff(false); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Band nahi hua')),
  });

  if (q.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-72 rounded-2xl" /></PageShell>;
  if (!rx) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold">Ye nuskha nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/optical/prescriptions')}>Nuskhe par wapas</Button></div></PageShell>;

  const d = daysFrom(rx.expiryDate);
  const usable = rx.isActive && (d == null || d >= 0);
  const wa = waLink(rx.customerPhone, `Assalam o alaikum ${rx.customerName}, aap ka nuskha ${rx.prescriptionNumber}: ${dayOnly(rx.prescriptionDate)}. Shukriya.`);

  return (
    <PageShell>
      {confirmOff && (
        <Modal open onClose={() => setConfirmOff(false)} size="sm" title="Nuskha band karein?" description="Ye nuskha naye chashma order me nahi aayega. Record aur purane order rehte hain."
          footer={<><Button variant="secondary" onClick={() => setConfirmOff(false)}>Rehne dein</Button><Button variant="danger" loading={off.isPending} onClick={() => off.mutate()}>Band karein</Button></>}>
          <p className="text-[0.875rem] text-slate-600">{rx.prescriptionNumber} · {rx.customerName}</p>
        </Modal>
      )}
      <PageHero
        title={(
          <span className="inline-flex items-center gap-2">
            {rx.customerName}
            {!rx.isActive ? <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[0.6875rem] font-semibold text-slate-700">Band</span>
              : d != null && d < 0 ? <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[0.6875rem] font-semibold">Muddat khatam</span>
              : d != null && d <= 60 ? <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-950">{d} din baqi</span> : null}
          </span>
        )}
        chip={rx.prescriptionNumber}
        subtitle={<>{rxTypeLabel(rx.prescriptionType)} · {dayOnly(rx.prescriptionDate)} se {dayOnly(rx.expiryDate)} tak{rx.customerPhone ? ` · ${rx.customerPhone}` : ''}</>}
        back={() => navigate(-1)}
        actions={(
          <>
            {wa && <a href={wa} target="_blank" rel="noreferrer" className={heroButton}><MessageCircle className="h-4 w-4" />WhatsApp</a>}
            <button type="button" onClick={() => void print(rxDoc(rx))} className={heroButton}><Printer className="h-4 w-4" />Print</button>
            {usable && <Link to={`/optical/lens-orders/new?rx=${rx.id}`} className={heroPrimaryButton}><Glasses className="h-4 w-4" />Chashma order</Link>}
          </>
        )}
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => navigate(`/optical/prescriptions/${rx.id}/edit`)}>Badlein</Button>
        {rx.isActive && <Button variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} loading={renew.isPending} onClick={() => renew.mutate()}>Renew (nayi muddat)</Button>}
        {rx.isActive && <Button variant="ghost" className="text-rose-700" leftIcon={<Ban className="h-4 w-4" />} onClick={() => setConfirmOff(true)}>Band karein</Button>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Eye className="h-4 w-4 text-brand-600" />Number</span>}>
            <PowerTable p={rx} />
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-[0.875rem] sm:grid-cols-3">
              {(rx.rightVa || rx.leftVa) && <div><dt className="text-[0.75rem] text-slate-500">Nazar R / L</dt><dd>{[rx.rightVa, rx.leftVa].filter(Boolean).join(' / ')}</dd></div>}
              {rx.segHeight != null && <div><dt className="text-[0.75rem] text-slate-500">Fitting height</dt><dd>{rx.segHeight} mm</dd></div>}
              {(rx.clRightBaseCurve || rx.clLeftBaseCurve) && <div><dt className="text-[0.75rem] text-slate-500">Contact lens BC / DIA</dt><dd>R {[rx.clRightBaseCurve, rx.clRightDiameter].filter(Boolean).join(' / ') || '—'} · L {[rx.clLeftBaseCurve, rx.clLeftDiameter].filter(Boolean).join(' / ') || '—'}</dd></div>}
            </dl>
          </Card>
          <Card className="rounded-2xl" flush title={<span className="inline-flex items-center gap-2"><Glasses className="h-4 w-4 text-brand-600" />Is nuskhe ke chashme</span>} description={`${rx.timesUsed} dafa istemal hua`}>
            {!rx.lensOrders?.length ? <p className="px-5 py-6 text-center text-[0.8125rem] text-slate-500">Abhi koi chashma order nahi</p> : (
              <Table>
                <THead><Tr><Th>Order</Th><Th>Frame / lens</Th><Th>Halat</Th><Th align="right">Kul</Th></Tr></THead>
                <TBody>
                  {rx.lensOrders.map((o) => (
                    <Tr key={o.id} interactive onClick={() => navigate(`/optical/lens-orders/${o.id}`)}>
                      <Td><p className="font-semibold">{o.orderNumber}</p><p className="text-[0.75rem] text-slate-500">{dayOnly(o.orderedAt)}</p></Td>
                      <Td>{o.frameName}<p className="text-[0.75rem] text-slate-500">{o.lensType}</p></Td>
                      <Td><Pill meta={orderStatusOf(o.status)} /></Td>
                      <Td align="right">{formatPKR(o.totalPrice)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </div>
        <Card className="rounded-2xl" title="Tafseel">
          <dl className="space-y-2 text-[0.875rem]">
            <div><dt className="text-[0.75rem] text-slate-500">Doctor</dt><dd>{rx.doctorName ?? rx.prescribedBy ?? '—'}{rx.clinicName ? ` · ${rx.clinicName}` : ''}</dd></div>
            <div><dt className="text-[0.75rem] text-slate-500">Umar / jins</dt><dd>{[rx.customerAge != null ? `${rx.customerAge} saal` : '', rx.customerGender === 'MALE' ? 'Mard' : rx.customerGender === 'FEMALE' ? 'Aurat' : ''].filter(Boolean).join(' · ') || '—'}</dd></div>
            {rx.notes && <div><dt className="text-[0.75rem] text-slate-500">Note</dt><dd className="whitespace-pre-line">{rx.notes}</dd></div>}
            {rx.customerId && <Link to={`/customers/${rx.customerId}`} className="inline-block pt-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">Customer ka record →</Link>}
          </dl>
        </Card>
      </div>
    </PageShell>
  );
}
