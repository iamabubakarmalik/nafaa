/**
 * Salon counter (PosGate opens this page). Pick the customer from the
 * waiting queue or today's bookings, or start a walk-in; tap services
 * (each with its stylist), add retail products, products used on a
 * service, membership discount or a package session, discount and tip,
 * then take the money in the shared checkout (cash, card, wallet, split,
 * part or full udhaar). The bill goes through the shared sale engine.
 *
 * Keys: / search · 1 services · 2 products · F12 bill · G guide.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CalendarPlus, Clock, Crown, Droplet, GraduationCap, Hourglass, Package, Receipt, Scissors, Sparkles, Star, UserRound, Wallet,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { Badge, PageHero, SearchField, ViewTabs, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { withManagerPin } from '@core/security/ManagerPin';
import { getReceiptSetup, useReceiptSetup } from '@core/receipt/setup';
import { printReceipt } from '@core/receipt/print';
import { RequireShop, PosCheckoutModal, PosSuccessModal, type PosCheckoutResult, type PosLastSale } from '@modules/pos/components';
import { keepAdvance, salePayment } from '@modules/pos/lib/posCheckout';
import { usePosPreferences } from '@modules/pos/hooks/usePosPreferences';
import { loadReceipt } from '@modules/sales/receipt/industryReceipt';
import { receiptText } from '@modules/sales/receipt/fromSale';
import { appointmentsApi, type Appointment } from '../api/appointments.api';
import { salonBillsApi } from '../api/bills.api';
import type { SalonService } from '../api/services.api';
import { useProductFinder, useServices, useStylists } from '../components/fields';
import { EmptyList } from '../components/ui';
import { CATEGORIES, SALON_KEYS, STATUS, apiError, minutes, serviceLine, timeOf, waLink } from '../lib/meta';
import { useSalonCan } from '../lib/permissions';
import { BillPanel } from '../pos/BillPanel';
import { useSalonBill } from '../pos/useSalonBill';

type Tab = 'services' | 'products';

export default function SalonPosPage() {
  return <RequireShop action="Salon ka bill banane"><SalonCounter /></RequireShop>;
}

function SalonCounter() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const guide = usePageGuide();
  const can = useSalonCan();
  const prefs = usePosPreferences('salon');
  const setupQ = useReceiptSetup();
  const { services, loading: svcLoading } = useServices();
  const stylists = useStylists();
  const bill = useSalonBill(services, stylists.all);
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('services');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [checkout, setCheckout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [last, setLast] = useState<(PosLastSale & { phone?: string }) | null>(null);

  const queueQ = useQuery({ queryKey: [SALON_KEYS.appointments, 'counter-queue'], queryFn: () => appointmentsApi.page({ view: 'queue', limit: 30 }), refetchInterval: 30_000 });
  const todayQ = useQuery({ queryKey: [SALON_KEYS.appointments, 'counter-today'], queryFn: () => appointmentsApi.page({ view: 'today', limit: 60 }), refetchInterval: 60_000 });
  const waiting = useMemo(() => {
    const seen = new Set<string>();
    return [...(queueQ.data?.items ?? []), ...(todayQ.data?.items ?? [])]
      .filter((a) => !a.saleId && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status) && !seen.has(a.id) && seen.add(a.id));
  }, [queueQ.data, todayQ.data]);

  // Open an appointment sent from another screen (?appointment=id).
  const wanted = params.get('appointment');
  useEffect(() => {
    if (!wanted || svcLoading || stylists.loading) return;
    appointmentsApi.getOne(wanted).then((a) => {
      if (a.saleId) toast.error(`${a.appointmentNumber} ka bill pehle hi ban chuka hai`);
      else bill.loadAppointment(a);
    }).catch((e) => toast.error(apiError(e, 'Appointment nahi mili'))).finally(() => {
      const next = new URLSearchParams(params); next.delete('appointment'); setParams(next, { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, svcLoading, stylists.loading]);

  const term = search.trim().toLowerCase();
  const shownServices = services.filter((s) => (!category || s.category === category) && (!term || `${s.name} ${s.code ?? ''}`.toLowerCase().includes(term)));
  const usedCats = CATEGORIES.filter((c) => services.some((s) => s.category === c.value));
  const finder = useProductFinder(tab === 'products' ? search : '', tab === 'products');
  const retail = finder.products.filter((p) => !(p as { isRawMaterial?: boolean }).isRawMaterial);

  const addService = (s: SalonService) => {
    const only = stylists.bookable.length === 1 ? stylists.bookable[0].id : '';
    bill.addService(s, only);
  };

  const openCheckout = () => {
    if (!bill.count) return;
    if (!can.bill) { toast.error('Bill banane ki permission nahi (POS)'); return; }
    if (bill.lines.some((l) => !l.staffProfileId) && stylists.bookable.length) toast.message('Kuch services par stylist nahi chuna — un ki commission nahi banegi');
    if (bill.due <= 0.009) { void submit({ paymentMethod: 'CASH', paidAmount: 0, isCredit: false, depositExtra: false }); return; }
    setCheckout(true);
  };

  const submit = async (d: PosCheckoutResult) => {
    if (saving) return;
    setSaving(true);
    const body = bill.body();
    const pay = salePayment(d, bill.due);
    try {
      const sale = await withManagerPin('Discount', (pin) => salonBillsApi.create({ ...body, ...pay, managerPin: pin }), 'discount');
      const deposited = await keepAdvance(d, bill.due, bill.customer.customerId || undefined, sale.saleNumber);
      setCheckout(false);
      setLast({
        id: sale.id, number: sale.saleNumber, total: Number(sale.total), change: deposited ? 0 : Number(sale.changeAmount || 0), deposited,
        credit: Math.max(Number(sale.creditAmount || 0) - bill.advance, 0) || undefined, phone: bill.customer.phone,
      });
      if (prefs.autoPrint) void print(sale.id);
      bill.reset();
      [SALON_KEYS.appointments, SALON_KEYS.staff, SALON_KEYS.customers, 'salon-perks', 'products-for-pos', 'customers'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    } catch (e) {
      toast.error(apiError(e, 'Bill nahi bana'));
    } finally {
      setSaving(false);
    }
  };

  const receiptOf = async (id: string) => {
    const setup = setupQ.data ?? getReceiptSetup();
    return { setup, loaded: await loadReceipt(id, 'salon', setup) };
  };
  const print = async (id: string) => {
    try { const { setup, loaded } = await receiptOf(id); printReceipt(loaded.doc, { setup }); } catch (e) { toast.error(apiError(e, 'Bill print nahi hua')); }
  };
  const share = async () => {
    if (!last) return;
    try {
      const { setup, loaded } = await receiptOf(last.id);
      window.open(waLink(last.phone, receiptText(loaded.doc, setup.shop.name, setup.design.payAccounts)), '_blank', 'noopener');
    } catch (e) { toast.error(apiError(e, 'Bill nahi mila')); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F12') { e.preventDefault(); if (!isDialogOpen()) openCheckout(); return; }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === '1') setTab('services');
      if (e.key === '2') setTab('products');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="mx-auto w-full max-w-[var(--page-max,96rem)] space-y-3 pb-6">
      <PageHero
        title="Salon counter"
        chip={<><Scissors /> Bill</>}
        meta="Service, stylist, istemal ki cheezein aur products — ek bill"
        actions={<>
          <Link to="/salon/appointments" className={heroButton}><Clock className="h-4 w-4" /><span className="hidden sm:inline">Appointments</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to="/salon/appointments/new" className={heroPrimaryButton}><CalendarPlus className="h-4 w-4" /> Booking</Link>
        </>}
      />

      <div className="grid gap-3 lg:h-[calc(100dvh-11rem)] lg:grid-cols-[minmax(0,1fr)_25rem]">
        <section className="flex min-h-0 flex-col gap-3">
          {waiting.length > 0 && (
            <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200/80">
              <p className="flex items-center gap-1.5 px-1 pb-1.5 text-[0.75rem] font-semibold text-slate-600"><Hourglass className="h-3.5 w-3.5" /> Queue aur aaj ki bookings — click karein, bill me aa jayega</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {waiting.map((a) => <QueueChip key={a.id} a={a} active={bill.appointment?.id === a.id} onPick={() => bill.loadAppointment(a)} />)}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1"><SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tab === 'services' ? 'Service dhoondein…' : 'Product ka naam ya barcode…'} /></div>
            <ViewTabs value={tab} onChange={setTab} tabs={[
              { id: 'services', label: 'Services', icon: Scissors, count: services.length },
              { id: 'products', label: 'Products', icon: Package },
            ]} />
          </div>

          {tab === 'services' && usedCats.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              <CatChip active={!category} onClick={() => setCategory('')}>Sab</CatChip>
              {usedCats.map((c) => <CatChip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>{c.label}</CatChip>)}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === 'services' ? (
              !svcLoading && !services.length ? (
                <EmptyList icon={Sparkles} title="Abhi koi service nahi" text="Pehle services aur un ke rate daalein — phir yahan click se bill banta hai.">
                  <Link to="/salon-services/new" className="inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white">Service daalein</Link>
                </EmptyList>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  {shownServices.map((s) => (
                    <button key={s.id} type="button" onClick={() => addService(s)}
                      className="group flex min-h-[5.5rem] flex-col rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:ring-brand-300">
                      <span className="flex items-start justify-between gap-1">
                        <span className="line-clamp-2 text-[0.875rem] font-semibold text-slate-900">{s.name}</span>
                        {(s.isPopular || s.isFeatured) && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                      </span>
                      <span className="mt-auto flex items-end justify-between gap-1 pt-2">
                        <span className="text-[0.75rem] text-slate-500">{minutes(s.durationMinutes)}</span>
                        <span className="text-[0.875rem] font-bold tabular-nums text-brand-700">{formatPKR(Number(s.discountPrice ?? s.price))}</span>
                      </span>
                    </button>
                  ))}
                  {!shownServices.length && <p className="col-span-full py-10 text-center text-[0.875rem] text-slate-500">Is search me koi service nahi</p>}
                </div>
              )
            ) : (
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
                {finder.loading ? <p className="p-4 text-[0.875rem] text-slate-500">Load ho raha hai…</p>
                  : !retail.length ? <p className="p-6 text-center text-[0.875rem] text-slate-500">Koi product nahi mila. Bechne wali cheezein (shampoo, serum) Products me daalein.</p>
                  : retail.map((p) => {
                    const stock = Number((p as { shopStock?: number }).shopStock ?? p.stock ?? 0);
                    return (
                      <button key={p.id} type="button" onClick={() => bill.addProduct(p)} className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-slate-50">
                        <Package className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.875rem] font-medium text-slate-900">{p.name}</span>
                          <span className={cn('text-[0.75rem]', stock <= 0 ? 'text-rose-600' : 'text-slate-500')}>Stock {stock} {p.unit}</span>
                        </span>
                        <span className="text-[0.875rem] font-semibold tabular-nums text-slate-800">{formatPKR(Number(p.price || 0))}</span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </section>

        <BillPanel bill={bill} stylists={stylists.bookable.length ? stylists.bookable : stylists.all} onCheckout={openCheckout} busy={saving} />
      </div>

      {checkout && (
        <PosCheckoutModal
          total={bill.due}
          itemCount={bill.count}
          loading={saving}
          customerName={bill.customer.customerId ? bill.customer.name : undefined}
          customerBalance={Number(bill.customer.balance ?? 0)}
          hasCustomer={!!bill.customer.customerId}
          customerId={bill.customer.customerId || undefined}
          initMode="full"
          allowCredit={!!bill.customer.customerId}
          onConfirm={submit}
          onClose={() => setCheckout(false)}
        />
      )}
      {last && (
        <PosSuccessModal lastSale={last} autoClose={prefs.autoClose} autoPrint={prefs.autoPrint}
          onPrintAgain={() => print(last.id)} onShare={last.phone ? share : undefined} onClose={() => setLast(null)} />
      )}

      {guide.isOpen && (
        <PageGuide title="Salon counter — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Hourglass, color: '#7c3aed', title: 'Queue se shuru', text: 'Upar queue me jo customer aa kar baitha ya chair par hai us par click karein — us ki services, stylist aur advance bill me aa jate hain.' },
            { icon: Scissors, color: '#db2777', title: 'Service aur stylist', text: 'Walk-in ho to seedha service par click karein. Har service par stylist chunein — usi ko commission milti hai. Rate badalna ho to bill me likh dein.' },
            { icon: Droplet, color: '#0891b2', title: 'Istemal ki cheezein', text: '"Istemal" se colour, shampoo, wax ki miqdaar likhein. Stock se kat jata hai aur profit me Cost ginti hai — customer se paisa nahi lagta.' },
            { icon: Crown, color: '#ca8a04', title: 'Membership aur package', text: 'Membership wale customer par discount ka nishan lagayein. Package wali service par "Package" chunein — session kat jata hai, paisa nahi lagta.' },
            { icon: Package, color: '#16a34a', title: 'Products bhi isi bill me', text: '"Products" tab se shampoo, serum waghera bechein — stock aur profit khud theek rehte hain.' },
            { icon: Receipt, color: '#ea580c', title: 'Payment', text: 'F12 dabayein: cash, card, JazzCash, kai tareeqon se mila kar (split), ya kuch paisa aur baqi udhaar. Advance pehle se mila ho to sirf baqi maangta hai.' },
          ]}
          tips={[
            'Bill ghalat ban jaye to Sales se "Void" karein — appointment dobara "bill baqi" me aa jati hai.',
            'Service wapas karni ho (customer na-khush) to Sales → Return — us service ki commission bhi wapas ho jati hai.',
            'Tip poori staff ki hoti hai — bill me jurti hai magar profit nahi barhati.',
          ]}
          shortcuts={[['/', 'dhoondein'], ['1', 'services'], ['2', 'products'], ['F12', 'bill'], ['G', 'guide']]}
        />
      )}
    </div>
  );
}

function CatChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-medium ring-1 transition', active ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
      {children}
    </button>
  );
}

function QueueChip({ a, active, onPick }: { a: Appointment; active: boolean; onPick: () => void }) {
  const st = STATUS[a.status];
  return (
    <button type="button" onClick={onPick}
      className={cn('flex w-56 shrink-0 flex-col rounded-xl px-3 py-2 text-left ring-1 transition', active ? 'bg-brand-50 ring-brand-400' : 'bg-slate-50 ring-slate-200 hover:bg-white')}>
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-[0.8125rem] font-semibold text-slate-900"><UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />{a.customerName || 'Walk-in'}</span>
        <Badge size="xs" variant={st.variant}>{st.label}</Badge>
      </span>
      <span className="mt-0.5 truncate text-[0.75rem] text-slate-500">{timeOf(a.scheduledStart)} · {serviceLine(a.services)}</span>
      <span className="mt-0.5 flex items-center justify-between text-[0.75rem]">
        <span className="truncate text-slate-500">{a.services[0]?.staffName ?? 'Stylist baad me'}</span>
        {Number(a.paidAmount) > 0 && <span className="inline-flex items-center gap-1 font-semibold text-success-700"><Wallet className="h-3 w-3" />{formatPKR(Number(a.paidAmount))}</span>}
      </span>
    </button>
  );
}
