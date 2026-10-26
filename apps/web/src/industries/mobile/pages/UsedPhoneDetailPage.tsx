/**
 * One used phone: device, IMEI, PTA and condition, who it came from (with
 * CNIC), where the money went (drawer, trade-in bill, resale bill), its
 * checks, and the next step — check it, put it on sale, or set it aside.
 *
 * Keys: E edit · K check · P print slip · Esc back.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, BadgeCheck, CheckCircle2, ClipboardCheck, History, IdCard, MessageCircle, Pencil, Printer, Receipt, Recycle, ShoppingCart, Smartphone, Wallet, XCircle } from 'lucide-react';
import { Button, Card, Modal, PageHero, PageShell, Skeleton, Textarea, heroButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { usedPhonesApi } from '../api/used-phones.api';
import { InspectionModal } from '../components/used/InspectionModal';
import { printBuybackSlip } from '../components/slips';
import { MONEY_KEYS, USED_KEY, apiError, conditionOf, dateTime, dayOnly, ptaOf, sourceOf, usedStatusOf, waLink } from '../components/meta';

export default function UsedPhoneDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canManage = usePermission(PERMISSIONS.MOBILE_IMEI_MANAGE);
  const canSell = usePermission(PERMISSIONS.POS_USE);
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const { cost, sales } = useMasked();
  useReceiptSetup();
  const [checking, setChecking] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [reason, setReason] = useState('');

  const q = useQuery({ queryKey: [USED_KEY, 'detail', id], queryFn: () => usedPhonesApi.detail(id), enabled: !!id });
  const p = q.data;
  const refresh = () => [USED_KEY, 'used-phones-stats', ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const ready = useMutation({
    mutationFn: () => usedPhonesApi.markInStock(id),
    onSuccess: () => { toast.success('Bikne ko tayyar — POS par aa gaya'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const discard = useMutation({
    mutationFn: () => usedPhonesApi.discard(id, reason.trim() || undefined),
    onSuccess: () => { toast.success('Phone hata diya — record mehfooz hai'); setDiscarding(false); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  const open = !!p && !['SOLD', 'DISCARDED'].includes(p.status);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen() || !p) return;
      if ((e.key === 'e' || e.key === 'E') && canManage) navigate(`/used-phones/${p.id}/edit`);
      if ((e.key === 'k' || e.key === 'K') && canManage && open) setChecking(true);
      if (e.key === 'p' || e.key === 'P') printBuybackSlip(p, shopName);
      if (e.key === 'Escape') navigate('/used-phones');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [p, canManage, open, navigate, shopName]);

  if (q.isLoading) return <PageShell><Skeleton className="h-28 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-72 rounded-2xl lg:col-span-2" /><Skeleton className="h-72 rounded-2xl" /></div></PageShell>;
  if (!p) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Ye phone nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/used-phones')}>Used phones par wapas</Button></div></PageShell>;

  const st = usedStatusOf(p.status);
  const margin = Number(p.resalePrice) - Number(p.totalCost);
  const sold = p.status === 'SOLD';
  const wa = waLink(p.fromCustomerPhone, `Assalam o alaikum ${p.fromCustomerName ?? ''},\n${shopName}: aap se liya gaya ${p.brand} ${p.model} (${p.usedPhoneCode}) — ${formatPKR(p.buybackPrice)}. Shukriya!`);
  const extras = [
    p.hasOriginalBox && 'Dabba', p.hasOriginalCharger && 'Charger', p.hasOriginalCable && 'Cable', p.hasOriginalEarphones && 'Handsfree',
    p.hasOriginalReceipt && 'Pakki raseed', p.hasWarrantyLeft && `Company warranty${p.warrantyExpiryDate ? ` ${dayOnly(p.warrantyExpiryDate)} tak` : ''}`,
  ].filter(Boolean) as string[];

  return (
    <PageShell>
      <PageHero
        title={<>{p.brand} {p.model}{p.storage ? ` ${p.storage}` : ''}</>}
        chip={st.label}
        subtitle={<span className="font-mono">{p.usedPhoneCode} · IMEI {p.imei1}{p.imei2 ? ` / ${p.imei2}` : ''}</span>}
        back="/used-phones"
        backLabel="Wapas (Esc)"
        actions={(
          <>
            <button type="button" onClick={() => printBuybackSlip(p, shopName)} title="Parchi (P)" className={heroButton}><Printer className="h-4 w-4" />Parchi</button>
            {wa && <a href={wa} target="_blank" rel="noreferrer" className={heroButton}><MessageCircle className="h-4 w-4" />WhatsApp</a>}
            {canManage && <Link to={`/used-phones/${p.id}/edit`} title="Badlein (E)" className={heroButton}><Pencil className="h-4 w-4" />Badlein</Link>}
          </>
        )}
        stats={[
          { label: 'Cost', value: cost(p.totalCost), hint: Number(p.refurbishCost) ? `repair ${cost(p.refurbishCost)}` : undefined },
          { label: sold ? 'Bika' : 'Bechne ki qeemat', value: sales(sold ? Number(p.finalSoldPrice ?? 0) : p.resalePrice) },
          { label: 'Profit', value: cost(sold ? Number(p.finalSoldPrice ?? 0) - Number(p.totalCost) : margin), hint: sold ? 'asal' : 'bikne par' },
          { label: sold ? 'Aaya tha' : 'Shop me', value: sold ? dayOnly(p.receivedAt) : `${Math.max(0, Math.floor((Date.now() - new Date(p.receivedAt).getTime()) / 86_400_000))} din`, hint: p.shop?.name },
        ]}
      />

      {open && canManage && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80">
          <span className="mr-auto text-[0.8125rem] text-slate-600">
            {p.status === 'PENDING_INSPECTION' ? 'Agla qadam: phone check karein' : p.status === 'REPAIRING' ? 'Repair ke baad bikne ko tayyar karein' : p.status === 'IN_STOCK' ? 'POS ke "Used" tab me bikne ko tayyar' : 'Halat dekhein'}
          </span>
          <Button variant="secondary" leftIcon={<ClipboardCheck className="h-4 w-4" />} onClick={() => setChecking(true)}>Check (K)</Button>
          {p.status !== 'IN_STOCK' && <Button variant="secondary" leftIcon={<CheckCircle2 className="h-4 w-4" />} loading={ready.isPending} onClick={() => ready.mutate()}>Bikne ko tayyar</Button>}
          {p.status === 'IN_STOCK' && canSell && <Button leftIcon={<ShoppingCart className="h-4 w-4" />} onClick={() => navigate('/pos')}>POS par bechein</Button>}
          {!p.tradeInBill && <Button variant="ghost" className="text-rose-700" leftIcon={<Ban className="h-4 w-4" />} onClick={() => setDiscarding(true)}>Hata dein</Button>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Smartphone className="h-4 w-4 text-brand-600" />Phone</span>}>
            <dl className="grid gap-x-8 sm:grid-cols-2">
              <Fact label="PTA"><span className="font-semibold" style={{ color: ptaOf(p.ptaStatus).color }}>{ptaOf(p.ptaStatus).label}</span>{p.ptaTaxPaid ? ` · tax ${formatPKR(p.ptaTaxPaid)}` : ''}</Fact>
              <Fact label="Halat"><span className={cn('rounded-full px-2 py-0.5 text-[0.75rem] font-medium ring-1', conditionOf(p.condition).tone)}>{conditionOf(p.condition).label} ({conditionOf(p.condition).score})</span></Fact>
              <Fact label="RAM / Storage">{[p.ram, p.storage].filter(Boolean).join(' / ') || '—'}</Fact>
              <Fact label="Rang / saal">{[p.color, p.modelYear].filter(Boolean).join(' · ') || '—'}</Fact>
              <Fact label="Saath">{extras.join(', ') || 'Sirf phone'}</Fact>
              <Fact label="Aaya">{dateTime(p.receivedAt)}</Fact>
            </dl>
            {p.conditionNotes && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700">{p.conditionNotes}</p>}
          </Card>

          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-brand-600" />Check</span>}
            description={p.inspections.length ? `${p.inspections.length} dafa check hua` : 'Abhi check nahi hua'}>
            {p.inspections.length === 0 ? (
              <p className="text-[0.8125rem] text-slate-500">Bechne se pehle camera, speaker, charging, battery aur account lock check karein.</p>
            ) : (
              <ul className="space-y-3">
                {p.inspections.map((i) => {
                  const bad = [
                    i.cameraWorks === false && 'Camera', i.speakerWorks === false && 'Speaker', i.microphoneWorks === false && 'Mic',
                    i.chargingPortWorks === false && 'Charging', i.buttonsWork === false && 'Buttons', i.faceIdFingerprintWorks === false && 'Fingerprint/Face',
                    i.imeiUnlocked === false && 'SIM', i.icloudUnlocked === false && 'Account lock',
                  ].filter(Boolean);
                  return (
                    <li key={i.id} className="rounded-xl bg-slate-50 p-3 text-[0.8125rem]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{dateTime(i.inspectedAt)}</span>
                        {i.batteryHealth != null && <span className={cn('rounded-md px-1.5 py-0.5 text-[0.75rem] font-medium', i.batteryHealth < 80 ? 'bg-amber-100 text-amber-800' : 'bg-success-100 text-success-800')}>Battery {i.batteryHealth}%</span>}
                        {i.needsRepair && <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[0.75rem] font-medium text-orange-800">Repair {formatPKR(i.estimatedRepairCost)}</span>}
                      </div>
                      <p className="mt-1 text-slate-600">Screen: {i.screenCondition ?? '—'} · Body: {i.bodyCondition ?? '—'}</p>
                      <p className={cn('mt-0.5', bad.length ? 'text-rose-700' : 'text-success-700')}>{bad.length ? `Kharab: ${bad.join(', ')}` : 'Sab theek chal raha hai'}</p>
                      {i.recommendedActions && <p className="mt-0.5 text-slate-600">{i.recommendedActions}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><IdCard className="h-4 w-4 text-brand-600" />{p.source === 'CONSIGNMENT' ? 'Malik' : 'Kis se liya'}</span>}>
            <dl className="space-y-1.5 text-[0.8125rem]">
              <Fact label="Naam">{p.fromCustomer ? <Link to={`/customers/${p.fromCustomer.id}`} className="font-semibold text-brand-700 hover:underline">{p.fromCustomerName ?? p.fromCustomer.name}</Link> : p.fromCustomerName ?? '—'}</Fact>
              <Fact label="Phone">{p.fromCustomerPhone ?? '—'}</Fact>
              <Fact label="CNIC"><span className="font-mono">{p.fromCustomerCnic ?? '—'}</span></Fact>
            </dl>
            {(p.cnicPhotoUrl || p.imeiPhotoUrl) && (
              <div className="mt-3 flex gap-2">
                {p.cnicPhotoUrl && <a href={p.cnicPhotoUrl} target="_blank" rel="noreferrer"><img src={p.cnicPhotoUrl} alt="CNIC" className="h-20 w-28 rounded-lg object-cover ring-1 ring-slate-200" /></a>}
                {p.imeiPhotoUrl && <a href={p.imeiPhotoUrl} target="_blank" rel="noreferrer"><img src={p.imeiPhotoUrl} alt="IMEI" className="h-20 w-28 rounded-lg object-cover ring-1 ring-slate-200" /></a>}
              </div>
            )}
          </Card>

          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-brand-600" />Paise kahan gaye</span>}>
            <ul className="space-y-2 text-[0.8125rem]">
              <Trail icon={Recycle} label={sourceOf(p.source).label} value={formatPKR(p.buybackPrice)} />
              {p.source === 'CASH_BUYBACK' && (
                <Trail icon={p.paidFromDrawer ? CheckCircle2 : XCircle} tone={p.paidFromDrawer ? 'text-success-700' : 'text-amber-700'}
                  label={p.paidFromDrawer ? 'Galle se diye (register me likha)' : 'Galla khula nahi tha — register me nahi likha'} />
              )}
              {p.source === 'EXCHANGE' && (
                <Trail icon={p.tradeInBill ? Receipt : XCircle} tone={p.tradeInBill ? 'text-success-700' : 'text-amber-700'}
                  label={p.tradeInBill ? `Trade-in bill ${p.tradeInBill.saleNumber}` : 'Abhi kisi bill me trade-in nahi laga — POS par Split / Trade-in se lagayein'} />
              )}
              {p.sale && <Trail icon={ShoppingCart} tone="text-violet-700" label={`Bika: ${p.sale.saleNumber}${p.sale.customer ? ` · ${p.sale.customer.name}` : ''}`} value={formatPKR(p.sale.total)} />}
            </ul>
          </Card>

          {(p.history ?? []).length > 0 && (
            <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><History className="h-4 w-4 text-brand-600" />Is phone ki history</span>}
              description="Same IMEI — pehle khareeda, becha ya baad me wapas liya">
              <ul className="space-y-1.5 text-[0.8125rem]">
                {p.history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2">
                    <Link to={`/used-phones/${h.id}`} className="font-mono font-semibold text-brand-700 hover:underline">{h.usedPhoneCode}</Link>
                    <span className="min-w-0 flex-1 truncate text-slate-600">{dayOnly(h.receivedAt)}{h.fromCustomerName ? ` · ${h.fromCustomerName}` : ''}{h.soldAt ? ` · bika ${dayOnly(h.soldAt)}` : ''}</span>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', usedStatusOf(h.status).tone)}>{usedStatusOf(h.status).label}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {p.notes && <Card className="rounded-2xl" title="Note"><p className="whitespace-pre-line text-[0.8125rem] text-slate-700">{p.notes}</p></Card>}
        </div>
      </div>

      {checking && <InspectionModal phone={p} onClose={() => setChecking(false)} />}
      {discarding && (
        <Modal open onClose={() => setDiscarding(false)} size="sm" title="Phone hata dein?" description="Bechne layak nahi, ya ghalat entry — record mehfooz rahega"
          footer={<><Button variant="secondary" onClick={() => setDiscarding(false)}>Rehne dein</Button><Button variant="danger" loading={discard.isPending} onClick={() => discard.mutate()}>Hata dein</Button></>}>
          <Textarea label="Wajah" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Board kharab, parts me laga…" />
        </Modal>
      )}
    </PageShell>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5 text-[0.8125rem]"><dt className="text-slate-500">{label}</dt><dd className="text-right text-slate-800">{children}</dd></div>;
}

function Trail({ icon: Icon, label, value, tone = 'text-slate-700' }: { icon: typeof Wallet; label: string; value?: string; tone?: string }) {
  return (
    <li className={cn('flex items-start gap-2', tone)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {value && <span className="font-semibold tabular-nums">{value}</span>}
    </li>
  );
}
