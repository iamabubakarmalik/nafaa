// apps/web/src/industries/mobile/components/UsedPhoneDetailsModal.tsx
import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  X, Smartphone, Star, User, Calendar, TrendingUp, MessageCircle,
  ReceiptText, Pencil, Save, Trash2, CheckCircle2, Clock, FileText,
  Loader2, Printer, Phone as PhoneIcon, MapPin, BadgeDollarSign,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import {
  usedPhonesApi,
  type UsedPhoneStatus,
  type UsedPhoneCondition,
  STATUS_LABELS,
  STATUS_COLORS,
  CONDITION_LABELS,
  CONDITION_COLORS,
} from '../api/used-phones.api';
import { PtaStatusBadge } from './PtaStatusBadge';
import { PTA_STATUS_LABELS, type PtaStatus } from '../api/imei.api';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { buildTradeInMsg, toWhatsAppNumber } from '../pages/UsedPhonesPage';

/* ═════════════════════════════════════════════════════════════
   USED PHONE DETAILS MODAL — FULL BEST v5
   ─────────────────────────────────────────────────────────────
   👁️ Details • ✏️ Edit • 💬 WhatsApp • 🖨️ Receipt IN-MODAL
   ✅ Print FIXED — overflow clip bug khatam (blank page solved)
   ✅ TradeInReceipt EXPORTED — page bhi directly use karta hai
   ✅ PTA values real: APPROVED/NON_PTA/PATCH/PENDING/EXEMPT
   ⌨️ Esc: receipt → edit → close • 🌙 Dark complete
   ═════════════════════════════════════════════════════════════ */

interface Props {
  phone: any;
  shopName?: string;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

const CONDITIONS: UsedPhoneCondition[] = ['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR'];
const PTA_OPTIONS: PtaStatus[] = ['APPROVED', 'PATCH', 'PENDING', 'NON_PTA', 'EXEMPT'];
const PTA_EMOJI: Record<PtaStatus, string> = {
  APPROVED: '✅', PATCH: '🔧', PENDING: '⏳', NON_PTA: '❌', EXEMPT: '📋',
};

export function UsedPhoneDetailsModal({ phone, shopName, onClose, onUpdated, onDeleted }: Props) {
  const [editing, setEditing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const [form, setForm] = useState({
    brand: phone.brand ?? '',
    model: phone.model ?? '',
    storage: phone.storage ?? '',
    color: phone.color ?? '',
    modelYear: phone.modelYear ?? '',
    imei1: phone.imei1 ?? '',
    condition: phone.condition as UsedPhoneCondition,
    ptaStatus: phone.ptaStatus as PtaStatus,
    buybackPrice: Number(phone.buybackPrice) || 0,
    refurbishCost: Number(phone.refurbishCost) || 0,
    resalePrice: Number(phone.resalePrice) || 0,
    fromCustomerName: phone.fromCustomerName ?? '',
    fromCustomerPhone: phone.fromCustomerPhone ?? '',
    notes: phone.notes ?? '',
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const updateMutation = useMutation({
    mutationFn: () => usedPhonesApi.update(phone.id, {
      ...form,
      buybackPrice: Number(form.buybackPrice) || 0,
      refurbishCost: Number(form.refurbishCost) || 0,
      resalePrice: Number(form.resalePrice) || 0,
    } as any),
    onSuccess: () => {
      toast.success('✓ Changes save ho gaye');
      setEditing(false);
      onUpdated();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save fail hua'),
  });

  const markInStockMutation = useMutation({
    mutationFn: () => usedPhonesApi.markInStock(phone.id),
    onSuccess: () => { toast.success('✓ In-stock — ab bik sakta hai'); onUpdated(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Fail hua'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => usedPhonesApi.remove(phone.id),
    onSuccess: () => { toast.success('Delete ho gaya'); onDeleted(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail hua'),
  });

  const sendWhatsApp = () => {
    if (!phone.fromCustomerPhone) return toast.error('Customer ka phone number nahi hai');
    window.open(
      `https://wa.me/${toWhatsAppNumber(phone.fromCustomerPhone)}?text=${encodeURIComponent(buildTradeInMsg(phone, shopName))}`,
      '_blank',
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showReceipt) { setShowReceipt(false); return; }
      if (editing) { setEditing(false); return; }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showReceipt, editing, onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const status = phone.status as UsedPhoneStatus;
  const statusColors = STATUS_COLORS[status];
  const conditionColors = CONDITION_COLORS[phone.condition as UsedPhoneCondition];

  const displayCost = editing
    ? (Number(form.buybackPrice) || 0) + (Number(form.refurbishCost) || 0)
    : Number(phone.totalCost);
  const displayResale = editing ? Number(form.resalePrice) || 0 : Number(phone.finalSoldPrice || phone.resalePrice);
  const profit = displayResale - displayCost;
  const marginPct = displayCost > 0 ? (profit / displayCost) * 100 : 0;

  const receivedDate = new Date(phone.receivedAt);
  const ageDays = Math.floor((Date.now() - receivedDate.getTime()) / 86400000);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 print:hidden" onClick={onClose}>
        <div
          className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-violet-300 dark:border-violet-500/40 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ═══ HEADER ═══ */}
          <div className="px-5 py-4 border-b-2 border-violet-200 dark:border-violet-500/30 bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-500/15 dark:to-fuchsia-500/15 sticky top-0 z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                  status === 'IN_STOCK' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                  : status === 'SOLD' ? 'bg-gradient-to-br from-violet-500 to-purple-700 text-white'
                  : 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300'
                }`}>
                  <Smartphone className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-extrabold text-violet-700 dark:text-violet-300">{phone.usedPhoneCode}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${statusColors.bg} ${statusColors.text}`}>
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg truncate">
                    {editing ? `${form.brand} ${form.model}` : `${phone.brand} ${phone.model}`}
                  </h3>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {!editing && status !== 'SOLD' && (
                  <button
                    onClick={() => setEditing(true)}
                    className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-md transition"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
                <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition" title="Band karo (Esc)">
                  <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* ── Phone Info ── */}
            <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <SectionTitle icon={Smartphone} title="Phone Info" />
              {editing ? (
                <div className="grid grid-cols-2 gap-3">
                  <EditField label="Brand" value={form.brand} onChange={(v) => set('brand', v)} />
                  <EditField label="Model" value={form.model} onChange={(v) => set('model', v)} />
                  <EditField label="Storage" value={form.storage} onChange={(v) => set('storage', v)} placeholder="128GB" />
                  <EditField label="Color" value={form.color} onChange={(v) => set('color', v)} />
                  <EditField label="Year" value={form.modelYear} onChange={(v) => set('modelYear', v)} placeholder="2021" />
                  <EditField label="IMEI" value={form.imei1} onChange={(v) => set('imei1', v)} mono />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <InfoCell label="Brand" value={phone.brand} />
                  <InfoCell label="Model" value={phone.model} />
                  <InfoCell label="Storage" value={phone.storage || '—'} />
                  <InfoCell label="Color" value={phone.color || '—'} />
                  <InfoCell label="Year" value={phone.modelYear || '—'} />
                  <InfoCell label="IMEI" value={phone.imei1} mono />
                </div>
              )}

              {editing ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 mb-1.5">Condition</div>
                    <div className="flex gap-1 flex-wrap">
                      {CONDITIONS.map((c) => (
                        <button
                          key={c}
                          onClick={() => set('condition', c)}
                          className={`px-2 py-1.5 rounded-lg text-[10px] font-extrabold border-2 transition ${form.condition === c ? `${CONDITION_COLORS[c].bg} ${CONDITION_COLORS[c].text} ${CONDITION_COLORS[c].border}` : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
                        >
                          {CONDITION_LABELS[c]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 mb-1.5">PTA Status</div>
                    <div className="flex gap-1 flex-wrap">
                      {PTA_OPTIONS.map((p) => (
                        <button
                          key={p}
                          onClick={() => set('ptaStatus', p)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold border-2 transition ${form.ptaStatus === p ? 'border-violet-600 bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
                        >
                          {PTA_EMOJI[p]} {PTA_STATUS_LABELS[p]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border ${conditionColors.bg} ${conditionColors.text} ${conditionColors.border}`}>
                    <Star className="h-3 w-3 inline mr-1 fill-current" />{CONDITION_LABELS[phone.condition as UsedPhoneCondition]}
                  </span>
                  <PtaStatusBadge status={phone.ptaStatus as PtaStatus} size="sm" />
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {ageDays === 0 ? 'Aaj liya' : `${ageDays} din pehle liya`}
                  </span>
                </div>
              )}

              {!editing && (
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { on: phone.hasOriginalBox, label: '📦 Box' },
                    { on: phone.hasOriginalCharger, label: '🔌 Charger' },
                    { on: phone.hasOriginalCable, label: '🔗 Cable' },
                    { on: phone.hasOriginalEarphones, label: '🎧 Earphones' },
                    { on: phone.hasOriginalReceipt, label: '🧾 Receipt' },
                    { on: phone.hasWarrantyLeft, label: '🛡️ Warranty' },
                  ].map((a) => (
                    <span
                      key={a.label}
                      className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border ${
                        a.on
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 line-through'
                      }`}
                    >
                      {a.label}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* ── Customer ── */}
            <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <SectionTitle icon={User} title="Customer (jis se liya)" />
              {editing ? (
                <div className="grid grid-cols-2 gap-3">
                  <EditField label="Naam" value={form.fromCustomerName} onChange={(v) => set('fromCustomerName', v)} />
                  <EditField label="Phone" value={form.fromCustomerPhone} onChange={(v) => set('fromCustomerPhone', v)} placeholder="03xx-xxxxxxx" mono />
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 flex items-center justify-center font-extrabold text-sm">
                      {(phone.fromCustomerName || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">{phone.fromCustomerName || 'Unknown'}</div>
                      {phone.fromCustomerPhone && (
                        <div className="text-xs font-mono text-slate-500 dark:text-slate-400">{phone.fromCustomerPhone}</div>
                      )}
                    </div>
                  </div>
                  {phone.fromCustomerPhone && (
                    <button
                      onClick={sendWhatsApp}
                      className="ml-auto h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/30 transition"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp Confirmation
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* ── Pricing (internal) ── */}
            <section className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-emerald-100 dark:border-emerald-500/20 flex-wrap">
                <SectionTitle icon={BadgeDollarSign} title="Pricing & Profit" tone="emerald" noBorder />
                <span className="text-[9px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/15 px-2 py-0.5 rounded-full">
                  🔒 Internal — receipt pe nahi jata
                </span>
              </div>
              {editing ? (
                <div className="grid grid-cols-3 gap-3">
                  <EditField label="Buyback (diye)" type="number" value={form.buybackPrice} onChange={(v) => set('buybackPrice', v)} />
                  <EditField label="Repair Cost" type="number" value={form.refurbishCost} onChange={(v) => set('refurbishCost', v)} />
                  <EditField label="Resale Price" type="number" value={form.resalePrice} onChange={(v) => set('resalePrice', v)} />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <PriceCell label="Buyback" value={formatPKR(phone.buybackPrice)} sub="customer ko diye" />
                  <PriceCell label="Repair" value={formatPKR(phone.refurbishCost || 0)} sub="refurbish kharcha" />
                  <PriceCell label={status === 'SOLD' ? 'Sold At' : 'Resale'} value={formatPKR(phone.finalSoldPrice || phone.resalePrice)} sub={status === 'SOLD' ? 'final bikri' : 'asking price'} highlight />
                </div>
              )}

              <div className={`rounded-xl border-2 p-3 flex items-center justify-between ${
                profit >= 0
                  ? 'bg-emerald-100 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/40'
                  : 'bg-rose-100 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/40'
              }`}>
                <div className="flex items-center gap-2">
                  <TrendingUp className={`h-5 w-5 ${profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`} />
                  <div>
                    <div className={`text-[10px] uppercase font-extrabold ${profit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                      {status === 'SOLD' ? '💰 Actual Profit' : '📈 Expected Profit'}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                      {formatPKR(displayResale)} − {formatPKR(displayCost)} cost
                    </div>
                  </div>
                </div>
                <div className={`text-xl font-extrabold tabular-nums ${profit >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>
                  {formatPKR(profit)} <span className="text-xs opacity-70">({marginPct.toFixed(0)}%)</span>
                </div>
              </div>
            </section>

            {/* ── Timeline ── */}
            <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 space-y-2">
              <SectionTitle icon={Calendar} title="Timeline" />
              <TimelineRow label="Trade-in liya" value={receivedDate.toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })} />
              {phone.soldAt && <TimelineRow label="Bik gaya" value={new Date(phone.soldAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })} />}
              {phone.updatedAt && <TimelineRow label="Last update" value={new Date(phone.updatedAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })} />}
            </section>

            {/* ── Notes ── */}
            {(editing || phone.notes) && (
              <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 space-y-2">
                <SectionTitle icon={FileText} title="Notes" />
                {editing ? (
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    placeholder="Screen scratch, battery 85%, box nahi hai..."
                    className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{phone.notes}</p>
                )}
              </section>
            )}

            {/* ── Actions ── */}
            <div className="flex gap-2 flex-wrap pt-1">
              {editing ? (
                <>
                  <Button
                    onClick={() => updateMutation.mutate()}
                    loading={updateMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 font-extrabold h-12"
                  >
                    <Save className="h-4 w-4" /> Save Changes
                  </Button>
                  <Button variant="secondary" onClick={() => setEditing(false)} className="font-extrabold h-12">
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  {status === 'PENDING_INSPECTION' && (
                    <Button
                      onClick={() => { if (confirm('In-stock mark karein? Ab ye bik sakta hai.')) markInStockMutation.mutate(); }}
                      loading={markInStockMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700 font-extrabold h-12"
                    >
                      <CheckCircle2 className="h-4 w-4" /> In-Stock Karo
                    </Button>
                  )}
                  <button
                    onClick={() => setShowReceipt(true)}
                    className="h-12 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-sm font-extrabold inline-flex items-center gap-2 shadow-md shadow-blue-500/30 transition"
                  >
                    <ReceiptText className="h-4 w-4" /> Receipt
                  </button>
                  {status !== 'SOLD' && (
                    <button
                      onClick={() => { if (confirm(`"${phone.usedPhoneCode}" delete karein? Ye wapas nahi aayega.`)) deleteMutation.mutate(); }}
                      disabled={deleteMutation.isPending}
                      className="h-12 px-4 rounded-xl bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 border-2 border-rose-200 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 text-sm font-extrabold inline-flex items-center gap-2 transition disabled:opacity-50"
                    >
                      {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReceipt && (
        <TradeInReceipt phone={phone} onClose={() => setShowReceipt(false)} />
      )}
    </>
  );
}

/* ═════════════════════════════════════════════════════════════
   TRADE-IN RECEIPT — EXPORTED (page bhi direct use karta hai)
   🖨️ Print FIXED: shell classes se overflow clip bug khatam
   Customer-facing SIRF: device + condition + buyback amount
   ═════════════════════════════════════════════════════════════ */
export function TradeInReceipt({ phone, onClose }: { phone: any; onClose: () => void }) {
  const [paperWidth, setPaperWidth] = useState<'58' | '80'>('80');

  const { data: settingsRes } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 60_000,
  });

  const shop = useMemo(() => {
    const s = (settingsRes as any)?.settings ?? {};
    const t = (settingsRes as any)?.tenant ?? {};
    return {
      name: String(t.name ?? t.businessName ?? s.businessName ?? s.shopName ?? 'Nafaa Store'),
      address: String(t.address ?? s.address ?? s.shopAddress ?? ''),
      phone: String(t.phone ?? s.phone ?? s.shopPhone ?? ''),
      footer: String(s.receiptFooter ?? 'Shukriya! Phir tashreef laiye.'),
      logoUrl: String(s.receiptLogoUrl ?? s.logoUrl ?? t.logoUrl ?? ''),
    };
  }, [settingsRes]);

  useEffect(() => {
    const pw = String((settingsRes as any)?.settings?.paperWidth ?? (settingsRes as any)?.settings?.receiptPaperWidth ?? '');
    if (pw === '58') setPaperWidth('58');
  }, [settingsRes]);

  useEffect(() => {
    document.body.dataset.paper = paperWidth;
    return () => { delete document.body.dataset.paper; };
  }, [paperWidth]);

  /* Esc = close */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const doPrint = () => {
    document.body.dataset.paper = paperWidth;
    window.print();
  };

  const dateObj = new Date(phone.receivedAt);
  const accessories = [
    phone.hasOriginalBox && 'Box',
    phone.hasOriginalCharger && 'Charger',
    phone.hasOriginalCable && 'Cable',
    phone.hasOriginalEarphones && 'Earphones',
    phone.hasOriginalReceipt && 'Purchase Receipt',
    phone.hasWarrantyLeft && 'Warranty',
  ].filter(Boolean) as string[];

  return (
    <div className="ti-print-shell fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex flex-col print:bg-white">
      <ReceiptPrintStyles />

      {/* ── Toolbar (screen only) ── */}
      <div className="shrink-0 px-4 py-3 bg-white dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap print:hidden">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition" title="Band karo (Esc)">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
          <div className="min-w-0">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
              <ReceiptText className="h-4 w-4" /> Trade-In Receipt
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold font-mono truncate">{phone.usedPhoneCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
            {(['58', '80'] as const).map((w) => (
              <button
                key={w}
                onClick={() => setPaperWidth(w)}
                className={`px-3 h-9 text-xs font-extrabold tabular-nums transition ${
                  paperWidth === w
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {w}mm
              </button>
            ))}
          </div>
          <Button onClick={doPrint} className="bg-gradient-to-r from-blue-600 to-indigo-700 font-extrabold shadow-lg shadow-blue-500/30">
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* ── Preview / Print area ── */}
      <div className="ti-print-scroll flex-1 overflow-auto p-6 print:p-0 print:overflow-visible">
        <div
          id="tradein-receipt"
          className="ti-paper mx-auto bg-white text-black shadow-2xl print:shadow-none"
          style={{ width: paperWidth === '58' ? 220 : 300 }}
        >
          <div className="ti-center">
            {shop.logoUrl && (
              <img
                src={shop.logoUrl}
                alt=""
                className="ti-logo"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div className="ti-shop">{shop.name}</div>
            {shop.address && <div className="ti-sub"><MapPin className="h-3 w-3 inline" /> {shop.address}</div>}
            {shop.phone && <div className="ti-sub"><PhoneIcon className="h-3 w-3 inline" /> {shop.phone}</div>}
          </div>

          <div className="ti-div" />

          <div className="ti-center ti-title">USED PHONE PURCHASE</div>
          <div className="ti-center ti-subtitle">Trade-In Rasid</div>

          <div className="ti-div" />

          <div className="ti-row"><span>Receipt #</span><b className="ti-mono">{phone.usedPhoneCode}</b></div>
          <div className="ti-row">
            <span>Date</span>
            <b className="tabular-nums">
              {dateObj.toLocaleDateString('en-PK')} {dateObj.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
            </b>
          </div>

          <div className="ti-div" />

          <div className="ti-section">SELLER (PHONE DENE WALA)</div>
          <div className="ti-row"><span>Naam</span><b>{phone.fromCustomerName || 'Walk-in'}</b></div>
          {phone.fromCustomerPhone && (
            <div className="ti-row"><span>Phone</span><b className="ti-mono">{phone.fromCustomerPhone}</b></div>
          )}
          {phone.fromCustomerCnic && (
            <div className="ti-row"><span>CNIC</span><b className="ti-mono">{phone.fromCustomerCnic}</b></div>
          )}

          <div className="ti-div" />

          <div className="ti-section">DEVICE</div>
          <div className="ti-device">{phone.brand} {phone.model}</div>
          {[phone.storage, phone.ram, phone.color].filter(Boolean).length > 0 && (
            <div className="ti-row">
              <span>Specs</span>
              <b>{[phone.storage, phone.ram, phone.color].filter(Boolean).join(' • ')}</b>
            </div>
          )}
          <div className="ti-row"><span>IMEI 1</span><b className="ti-mono">{phone.imei1}</b></div>
          {phone.imei2 && (
            <div className="ti-row"><span>IMEI 2</span><b className="ti-mono">{phone.imei2}</b></div>
          )}
          <div className="ti-row"><span>PTA</span><b>{PTA_STATUS_LABELS[phone.ptaStatus as PtaStatus] || phone.ptaStatus}</b></div>
          <div className="ti-row"><span>Condition</span><b>{CONDITION_LABELS[phone.condition as UsedPhoneCondition]}</b></div>
          {accessories.length > 0 && (
            <div className="ti-row"><span>Sath Mila</span><b>{accessories.join(', ')}</b></div>
          )}
          {phone.conditionNotes && (
            <div className="ti-note">Note: {phone.conditionNotes}</div>
          )}

          <div className="ti-div" />

          <div className="ti-total">
            <span>PHONE KE DIYE GAYE</span>
            <span className="tabular-nums">{formatPKR(phone.buybackPrice)}</span>
          </div>
          <div className="ti-row">
            <span>Type</span>
            <b>{phone.source === 'CASH_BUYBACK' ? 'Cash Buyback' : phone.source === 'EXCHANGE' ? 'Exchange' : 'Consignment'}</b>
          </div>

          <div className="ti-div" />

          <div className="ti-declaration">
            Main tasdeeq karta/kti hoon ke upar likha phone meri
            zaati milkiyat hai, chori ya gumshuda nahi hai, aur maine
            apni marzi se farokht kiya hai. Kisi bhi qanooni moamle
            ki zimmedari meri hogi.
          </div>

          <div className="ti-sign-row">
            <div className="ti-sign">
              <div className="ti-sign-line" />
              <span>Seller Sign</span>
            </div>
            <div className="ti-sign">
              <div className="ti-sign-line" />
              <span>Shop Sign</span>
            </div>
          </div>

          <div className="ti-div" />

          <div className="ti-center ti-sub">{shop.footer}</div>
          <div className="ti-powered">✦ Powered by <b>Nafaa POS</b> ✦</div>
          <div className="ti-cut">— — — — — — — — — — — — ✂</div>
        </div>
      </div>
    </div>
  );
}

/* ═══ RECEIPT CSS — print clip bug FIXED ═══ */
function ReceiptPrintStyles() {
  return (
    <style>{`
      .ti-paper { padding: 16px 12px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #000; }
      .ti-center { text-align: center; }
      .ti-shop { font-size: 17px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; }
      .ti-sub { font-size: 10.5px; color: #444; }
      .ti-logo { max-height: 48px; max-width: 70%; margin: 0 auto 6px; object-fit: contain; filter: grayscale(1) contrast(1.4); }
      .ti-title { font-size: 14px; font-weight: 800; letter-spacing: 1px; margin-top: 2px; }
      .ti-subtitle { font-size: 10px; color: #555; font-weight: 700; }
      .ti-div { border-top: 1px dashed #999; margin: 8px 0; }
      .ti-row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; font-size: 11px; }
      .ti-row b { text-align: right; }
      .ti-mono { font-family: 'Courier New', monospace; font-size: 10.5px; word-break: break-all; }
      .ti-section { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #666; margin: 4px 0 2px; }
      .ti-device { font-size: 15px; font-weight: 800; margin: 2px 0 4px; }
      .ti-note { font-size: 10px; color: #444; font-style: italic; margin-top: 3px; }
      .ti-total { display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 800; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 5px 0; margin: 6px 0; }
      .ti-declaration { font-size: 9.5px; line-height: 1.5; color: #222; border: 1px solid #000; border-radius: 4px; padding: 6px; margin: 8px 0; text-align: justify; }
      .ti-sign-row { display: flex; justify-content: space-between; gap: 24px; margin-top: 22px; }
      .ti-sign { flex: 1; text-align: center; font-size: 9px; font-weight: 700; color: #444; }
      .ti-sign-line { border-top: 1.5px solid #000; margin-bottom: 3px; }
      .ti-powered { text-align: center; font-size: 10px; color: #555; margin-top: 8px; font-weight: 600; }
      .ti-powered b { color: #000; }
      .ti-cut { text-align: center; color: #bbb; font-size: 10px; margin-top: 10px; letter-spacing: 2px; white-space: nowrap; overflow: hidden; }

      @media print {
        /* ── Sab chhupao, sirf receipt shell dikhao ── */
        body * { visibility: hidden !important; }
        .ti-print-shell, .ti-print-shell * { visibility: visible !important; }

        /* ── CLIP BUG FIX: scroll container ka overflow hata do ── */
        .ti-print-shell {
          position: absolute !important; inset: 0 !important;
          background: #fff !important; backdrop-filter: none !important;
          display: block !important; padding: 0 !important;
        }
        .ti-print-scroll {
          overflow: visible !important; padding: 0 !important;
          height: auto !important; max-height: none !important;
        }

        /* ── Receipt ko page ke top-left pe le aao ── */
        #tradein-receipt {
          position: absolute !important; left: 0 !important; top: 0 !important;
          box-shadow: none !important; margin: 0 !important;
          padding: 4mm 2mm !important;
        }
        #tradein-receipt, #tradein-receipt * {
          color: #000 !important; background: #fff !important;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
          text-shadow: none !important; box-shadow: none !important;
        }
        #tradein-receipt .ti-div { border-top-color: #000 !important; }
        #tradein-receipt .ti-logo { filter: grayscale(1) contrast(2) !important; }
        #tradein-receipt svg { display: none; }

        @page { margin: 0; size: auto; }
        body[data-paper="58"] #tradein-receipt { width: 58mm !important; font-size: 10px; }
        body[data-paper="58"] #tradein-receipt .ti-shop { font-size: 13px; }
        body[data-paper="58"] #tradein-receipt .ti-total { font-size: 12px; }
        body[data-paper="58"] #tradein-receipt .ti-device { font-size: 12px; }
        body[data-paper="80"] #tradein-receipt { width: 80mm !important; }

        .ti-row, .ti-total, .ti-declaration, .ti-sign-row { page-break-inside: avoid; break-inside: avoid; }
      }
    `}</style>
  );
}

/* ═══ SMALL COMPONENTS ═══ */
function SectionTitle({ icon: Icon, title, tone = 'slate', noBorder }: { icon: any; title: string; tone?: string; noBorder?: boolean }) {
  return (
    <div className={`flex items-center gap-2 pb-1 ${noBorder ? '' : 'border-b border-slate-100 dark:border-slate-800'}`}>
      <Icon className={`h-4 w-4 ${tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-violet-600 dark:text-violet-400'}`} />
      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">{title}</span>
    </div>
  );
}

function InfoCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5">
      <div className="text-[9px] uppercase font-extrabold text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-sm font-extrabold text-slate-900 dark:text-white truncate ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function PriceCell({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-2.5 text-center border-2 ${highlight ? 'bg-white dark:bg-slate-800 border-emerald-400 dark:border-emerald-500/50' : 'bg-white/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'}`}>
      <div className="text-[9px] uppercase font-extrabold text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-sm font-extrabold tabular-nums ${highlight ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>{value}</div>
      <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500">{sub}</div>
    </div>
  );
}

function EditField({ label, value, onChange, type = 'text', placeholder, mono }: {
  label: string; value: any; onChange: (v: any) => void; type?: string; placeholder?: string; mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="font-bold text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</span>
    </div>
  );
}
