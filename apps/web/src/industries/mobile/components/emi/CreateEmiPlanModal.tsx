import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, CreditCard, User, DollarSign, Calendar, CheckCircle2, Calculator,
  Search, Phone, AlertTriangle, Sparkles, Info, Percent, Copy,
  Star, ChevronRight, Undo2, Keyboard, Printer, TrendingUp,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { emiApi } from '../../api/emi.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';

interface Props {
  onSuccess?: (planId: string) => void;
  onClose: () => void;
  presetTotal?: number;
  presetCustomerId?: string;
}

const INSTALLMENT_OPTIONS = [3, 6, 9, 12, 18, 24];
const DOWN_PAYMENT_QUICK = [10, 15, 20, 25, 30, 40, 50];
const DRAFT_KEY = 'nafaa:emi-draft:v1';

interface Draft {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount?: string;
  downPayment?: string;
  installmentCount?: number;
  startDate?: string;
  notes?: string;
  savedAt?: number;
}

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 4) return d;
  return `${d.slice(0, 4)}-${d.slice(4)}`;
};

export function CreateEmiPlanModal({ onSuccess, onClose, presetTotal, presetCustomerId }: Props) {
  const queryClient = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);

  // Load draft
  const draft: Draft = useMemo(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}'); }
    catch { return {}; }
  }, []);

  const [customerId, setCustomerId] = useState(presetCustomerId || draft.customerId || '');
  const [customerName, setCustomerName] = useState(draft.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(draft.customerPhone || '');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);

  const [totalAmount, setTotalAmount] = useState(presetTotal ? String(presetTotal) : (draft.totalAmount || ''));
  const [downPayment, setDownPayment] = useState(draft.downPayment || '');
  const [installmentCount, setInstallmentCount] = useState(draft.installmentCount || 6);
  const [startDate, setStartDate] = useState(draft.startDate || new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(draft.notes || '');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [customCount, setCustomCount] = useState('');

  const [history, setHistory] = useState<any[]>([]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      if (e.key === 'Escape') {
        if (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA') tgt.blur();
        else onClose();
      }
      if ((tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA')) return;
      if (e.key === '?' && e.shiftKey) setShowShortcuts((v) => !v);
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitPlan();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save draft
  useEffect(() => {
    const t = setTimeout(() => {
      const d: Draft = {
        customerId, customerName, customerPhone,
        totalAmount, downPayment, installmentCount,
        startDate, notes, savedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    }, 700);
    return () => clearTimeout(t);
  }, [customerId, customerName, customerPhone, totalAmount, downPayment, installmentCount, startDate, notes]);

  const clearDraft = () => localStorage.removeItem(DRAFT_KEY);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-emi'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
  });

  const filteredCustomers = useMemo(() => {
    const list = customersData?.items ?? [];
    const q = customerSearch.toLowerCase().trim().replace(/-/g, '');
    if (!q) return [];
    return list
      .filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone || '').replace(/\D/g, '').includes(q) ||
        (c.cnic || '').replace(/\D/g, '').includes(q),
      )
      .slice(0, 8);
  }, [customersData, customerSearch]);

  // Preload preset customer
  useEffect(() => {
    if (presetCustomerId && customersData?.items) {
      const c = customersData.items.find((x) => x.id === presetCustomerId);
      if (c) {
        setCustomerId(c.id);
        setCustomerName(c.name);
        setCustomerPhone(c.phone || '');
      }
    }
  }, [presetCustomerId, customersData]);

  const selectedCustomer = customersData?.items.find((c) => c.id === customerId);

  const total = Number(totalAmount) || 0;
  const down = Number(downPayment) || 0;
  const financed = Math.max(total - down, 0);
  const perInstallment = installmentCount > 0 ? financed / installmentCount : 0;
  const downPct = total > 0 ? (down / total) * 100 : 0;

  const isValid =
    customerId &&
    customerName.trim() &&
    total > 0 &&
    down >= 0 &&
    down < total &&
    installmentCount > 0 &&
    startDate;

  // Smart warnings
  const warnings = useMemo(() => {
    const w: { level: 'error' | 'warn' | 'info'; msg: string }[] = [];
    if (selectedCustomer && (selectedCustomer as any).balance > 0)
      w.push({ level: 'warn', msg: `Is customer par pehle se udhaar hai: ${formatPKR((selectedCustomer as any).balance)}` });
    if (total > 0 && downPct < 15)
      w.push({ level: 'warn', msg: `Down payment sirf ${downPct.toFixed(0)}% hai — 20% ya zyada safer hoga` });
    if (total > 0 && downPct >= 20 && downPct < 30)
      w.push({ level: 'info', msg: `Down payment ${downPct.toFixed(0)}% acha hai` });
    if (installmentCount > 12)
      w.push({ level: 'warn', msg: 'Long tenure (12+ months) mein default ka risk zyada hota hai' });
    if (perInstallment > 0 && perInstallment > 30000)
      w.push({ level: 'info', msg: `Per-month installment ${formatPKR(perInstallment)} kaafi zyada hai — customer ki income confirm karo` });
    if (startDate && new Date(startDate).getTime() < Date.now() - 86400000)
      w.push({ level: 'error', msg: 'Start date past mein hai!' });
    return w;
  }, [selectedCustomer, total, down, downPct, installmentCount, perInstallment, startDate]);

  // Installment preview
  const installmentPreview = useMemo(() => {
    if (!total || !installmentCount) return [];
    const start = new Date(startDate);
    let runningTotal = 0;
    const list = [];
    for (let i = 1; i <= installmentCount; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));
      const amount = i === installmentCount
        ? Number((financed - runningTotal).toFixed(2))
        : Number(perInstallment.toFixed(2));
      runningTotal += amount;
      list.push({ num: i, dueDate, amount });
    }
    return list;
  }, [total, installmentCount, financed, perInstallment, startDate]);

  const applyDownPercent = (pct: number) => {
    if (!total) return toast.error('Pehle total daalo');
    saveHistory();
    const newDown = Math.round(total * (pct / 100));
    setDownPayment(String(newDown));
    toast.success(`${pct}% down payment: ${formatPKR(newDown)}`);
  };

  const saveHistory = () => {
    setHistory((h) => [...h.slice(-9), {
      customerId, customerName, customerPhone,
      totalAmount, downPayment, installmentCount, startDate, notes,
    }]);
  };

  const undo = () => {
    if (!history.length) return toast.error('Kuch undo karne ke liye nahi');
    const last = history[history.length - 1];
    setCustomerId(last.customerId);
    setCustomerName(last.customerName);
    setCustomerPhone(last.customerPhone);
    setTotalAmount(last.totalAmount);
    setDownPayment(last.downPayment);
    setInstallmentCount(last.installmentCount);
    setStartDate(last.startDate);
    setNotes(last.notes);
    setHistory((h) => h.slice(0, -1));
    toast.success('Undo done');
  };

  const handleKeyNav = (e: React.KeyboardEvent) => {
    if (!showCustomerResults || !filteredCustomers.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % filteredCustomers.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => (i - 1 + filteredCustomers.length) % filteredCustomers.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pickCustomer(filteredCustomers[highlightIdx]);
    }
  };

  const pickCustomer = (c: any) => {
    saveHistory();
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone || '');
    setCustomerSearch('');
    setShowCustomerResults(false);
    toast.success(`${c.name} selected`);
  };

  const mutation = useMutation({
    mutationFn: () =>
      emiApi.create({
        customerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        totalAmount: total,
        downPayment: down || undefined,
        installmentCount,
        startDate,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (plan) => {
      toast.success(`EMI Plan ${plan.planNumber} ban gaya — ${installmentCount} installments`);
      queryClient.invalidateQueries({ queryKey: ['emi-plans'] });
      queryClient.invalidateQueries({ queryKey: ['emi-stats'] });
      clearDraft();
      onSuccess?.(plan.id);
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const submitPlan = () => {
    if (!customerId) return toast.error('Customer required');
    if (total <= 0) return toast.error('Total amount required');
    if (down >= total) return toast.error('Down payment total se kam honi chahiye');
    if (installmentCount <= 0) return toast.error('Installment count required');
    if (warnings.some((w) => w.level === 'error')) {
      return toast.error('Errors fix karein pehle');
    }
    if (warnings.some((w) => w.level === 'warn')) {
      if (!confirm('Kuch warnings hain. Phir bhi create karna hai?')) return;
    }
    mutation.mutate();
  };

  const printPreview = () => {
    if (!installmentPreview.length) return toast.error('Data nahi hai');
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>EMI Schedule</title>
<style>
body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
h1 { color: #6366f1; margin: 0; }
.info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0; padding: 12px; background: #eef2ff; border-radius: 8px; }
.info div { font-size: 11px; }
.info b { display: block; font-size: 14px; margin-top: 2px; }
table { width: 100%; border-collapse: collapse; margin-top: 12px; }
th { background: #6366f1; color: white; padding: 8px; font-size: 11px; }
td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
tr:nth-child(even) { background: #f8fafc; }
</style></head><body>
<h1>EMI Installment Schedule (Preview)</h1>
<div style="color:#64748b;font-size:11px">${customerName} · ${customerPhone || ''}</div>
<div class="info">
  <div>Total<b>${formatPKR(total)}</b></div>
  <div>Down<b>${formatPKR(down)}</b></div>
  <div>Financed<b>${formatPKR(financed)}</b></div>
  <div>Months<b>${installmentCount}</b></div>
  <div>Per Month<b>${formatPKR(perInstallment)}</b></div>
  <div>Start<b>${new Date(startDate).toLocaleDateString('en-PK')}</b></div>
</div>
<table>
  <thead><tr><th>#</th><th>Due Date</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>
${installmentPreview.map((i) => `<tr><td>${i.num}</td><td>${i.dueDate.toLocaleDateString('en-PK')}</td><td style="text-align:right"><b>${formatPKR(i.amount)}</b></td></tr>`).join('')}
  </tbody>
</table>
<script>window.onload = () => window.print();</script>
</body></html>`;
    const w = window.open('', '_blank');
    if (!w) return toast.error('Popup blocked');
    w.document.write(html); w.document.close();
  };

  const hasDraft = draft.savedAt && (Date.now() - draft.savedAt) < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-3xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-indigo-700 dark:text-indigo-300 font-bold">
                EMI / Installments
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">New EMI Plan</h3>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {history.length > 0 && (
              <button
                onClick={undo}
                className="h-9 px-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300"
                title="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setShowShortcuts(true)}
              className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center"
              title="Shortcuts (Shift+?)"
            >
              <Keyboard className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </button>
            <button
              onClick={printPreview}
              className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center"
              title="Print schedule preview"
              disabled={!isValid}
            >
              <Printer className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </button>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center"
            >
              <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

        {/* Draft restore banner */}
        {hasDraft && !presetTotal && !presetCustomerId && (
          <div className="px-5 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
            <span>💾 Draft restore ho gaya (last saved {new Date(draft.savedAt!).toLocaleTimeString('en-PK')})</span>
            <button
              onClick={() => {
                clearDraft();
                setCustomerId(''); setCustomerName(''); setCustomerPhone('');
                setTotalAmount(''); setDownPayment(''); setNotes('');
                setInstallmentCount(6);
                toast.success('Draft clear ho gaya');
              }}
              className="font-bold hover:underline"
            >
              Clear draft
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-1.5">
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 text-xs flex items-start gap-2 border ${
                    w.level === 'error' ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200' :
                    w.level === 'warn' ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200' :
                    'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                  }`}
                >
                  {w.level === 'error' ? <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> :
                    w.level === 'warn' ? <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> :
                    <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />}
                  {w.msg}
                </div>
              ))}
            </div>
          )}

          {/* Customer */}
          <div className="rounded-2xl bg-violet-50 dark:bg-violet-950/40 border-2 border-violet-200 dark:border-violet-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-violet-900 dark:text-violet-100">
                <User className="h-4 w-4" /> Customer
              </div>
              {customerId && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold inline-flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Linked
                </span>
              )}
            </div>

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchRef}
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerResults(true);
                  setHighlightIdx(0);
                }}
                onFocus={() => setShowCustomerResults(true)}
                onKeyDown={handleKeyNav}
                placeholder="Search naam, phone, ya CNIC... (↑↓ Enter)"
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pl-9 pr-3 text-sm focus:outline-none focus:border-violet-500"
              />
              {showCustomerResults && filteredCustomers.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredCustomers.map((c: any, i) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseEnter={() => setHighlightIdx(i)}
                      onClick={() => pickCustomer(c)}
                      className={`w-full px-3 py-2 text-left transition ${
                        i === highlightIdx
                          ? 'bg-violet-50 dark:bg-violet-950/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1">
                        {c.name}
                        {c.isVip && <Star className="h-3 w-3 text-amber-500 fill-current" />}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                        {c.phone && <span className="inline-flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{c.phone}</span>}
                        {c.cnic && <span>CNIC: {c.cnic}</span>}
                        {c.balance > 0 && (
                          <span className="text-amber-700 dark:text-amber-400 font-bold inline-flex items-center gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Udhaar: {formatPKR(c.balance)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {customerId && (
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-violet-300 dark:border-violet-700 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-sm">
                    {customerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-violet-900 dark:text-violet-100 truncate">{customerName}</div>
                    {customerPhone && (
                      <div className="text-xs text-violet-700 dark:text-violet-300 font-mono">{customerPhone}</div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    saveHistory();
                    setCustomerId(''); setCustomerName(''); setCustomerPhone('');
                  }}
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  Clear
                </button>
              </div>
            )}

            {!customerId && customerSearch && filteredCustomers.length === 0 && (
              <div className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">
                Koi customer match nahi mila. Pehle Customers page se add karo.
              </div>
            )}

            {/* Manual phone entry if customer selected but phone missing */}
            {customerId && !customerPhone && (
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                placeholder="Phone number (recommended for reminders)"
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 text-sm font-mono focus:outline-none focus:border-violet-500"
              />
            )}
          </div>

          {/* Amounts */}
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-100">
              <DollarSign className="h-4 w-4" /> Amounts
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="Total Amount (PKR) *"
                type="number"
                value={totalAmount}
                onChange={(e) => { saveHistory(); setTotalAmount(e.target.value); }}
                placeholder="150000"
              />
              <div>
                <Input
                  label={`Down Payment (${downPct.toFixed(0)}%)`}
                  type="number"
                  value={downPayment}
                  onChange={(e) => { saveHistory(); setDownPayment(e.target.value); }}
                  placeholder="30000"
                />
              </div>
            </div>

            {/* Quick down payment % */}
            {total > 0 && (
              <div>
                <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                  <Percent className="h-3 w-3" /> Quick Down Payment
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DOWN_PAYMENT_QUICK.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyDownPercent(pct)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        Math.round(downPct) === pct
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-emerald-100 dark:bg-emerald-950/40 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => { saveHistory(); setDownPayment('0'); }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                  >
                    None
                  </button>
                </div>
              </div>
            )}

            {financed > 0 && (
              <div className="rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 p-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Total</div>
                  <div className="font-extrabold text-slate-900 dark:text-white text-sm">{formatPKR(total)}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Down</div>
                  <div className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">
                    {formatPKR(down)}
                  </div>
                  <div className="text-[8px] text-emerald-600 dark:text-emerald-500">
                    {downPct.toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-bold text-indigo-700 dark:text-indigo-400">Financed</div>
                  <div className="font-extrabold text-indigo-700 dark:text-indigo-400 text-sm">
                    {formatPKR(financed)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Installments */}
          <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-100">
              <Calendar className="h-4 w-4" /> Installment Plan
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Number of Installments
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {INSTALLMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => { saveHistory(); setInstallmentCount(opt); setCustomCount(''); }}
                    className={`py-2 rounded-lg border-2 text-sm font-extrabold transition ${
                      installmentCount === opt && !customCount
                        ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg scale-105'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {opt}
                    <div className="text-[8px] font-normal opacity-70">{opt <= 6 ? 'short' : opt <= 12 ? 'mid' : 'long'}</div>
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                max="60"
                value={customCount}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(60, Number(e.target.value) || 1));
                  setCustomCount(e.target.value);
                  setInstallmentCount(v);
                }}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 text-sm mt-2 focus:outline-none focus:border-indigo-500"
                placeholder="Or custom count (1-60)..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                First Installment Due Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { saveHistory(); setStartDate(e.target.value); }}
                min={new Date().toISOString().slice(0, 10)}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 text-sm focus:outline-none focus:border-indigo-500"
              />
              <div className="flex gap-1 mt-1">
                {[
                  { label: 'Aaj', days: 0 },
                  { label: '1 hafta', days: 7 },
                  { label: '15 din', days: 15 },
                  { label: '1 mahina', days: 30 },
                ].map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + q.days);
                      setStartDate(d.toISOString().slice(0, 10));
                    }}
                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {financed > 0 && installmentCount > 0 && (
              <div className="rounded-xl bg-white dark:bg-slate-800 border-2 border-indigo-300 dark:border-indigo-700 p-3 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-indigo-200/30 dark:bg-indigo-700/30" />
                <div className="relative flex items-center gap-2 mb-1">
                  <Calculator className="h-4 w-4 text-indigo-700 dark:text-indigo-400" />
                  <div className="text-xs font-bold text-indigo-900 dark:text-indigo-100">
                    Per-Installment Amount
                  </div>
                </div>
                <div className="relative text-3xl font-extrabold text-indigo-700 dark:text-indigo-400">
                  {formatPKR(perInstallment)}
                  <span className="text-xs text-indigo-500 font-normal ml-1">/month</span>
                </div>
                <div className="relative text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-2.5 w-2.5" />
                  × {installmentCount} months = {formatPKR(financed)}
                </div>
              </div>
            )}
          </div>

          {/* Schedule preview */}
          {installmentPreview.length > 0 && (
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Schedule Preview
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                    ({installmentPreview.length} installments)
                  </span>
                </div>
                <button
                  onClick={printPreview}
                  className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 hover:underline inline-flex items-center gap-1"
                >
                  <Printer className="h-3 w-3" /> Print
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {installmentPreview.map((inst) => (
                  <div
                    key={inst.num}
                    className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs hover:shadow transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                        {inst.num}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {inst.dueDate.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <span className="font-extrabold text-indigo-700 dark:text-indigo-400">
                      {formatPKR(inst.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Guarantor, extra terms, delivery info..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Draft auto-save · <kbd className="px-1 py-0 rounded bg-slate-200 dark:bg-slate-700 font-mono">Ctrl+Enter</kbd> to save
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button
              onClick={submitPlan}
              loading={mutation.isPending}
              disabled={!isValid}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <CheckCircle2 className="h-4 w-4" /> Create Plan
            </Button>
          </div>
        </div>

        {showShortcuts && (
          <div className="absolute inset-0 z-10 bg-slate-950/70 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-blue-600" />
                  <span className="font-bold text-slate-900 dark:text-white text-sm">Shortcuts</span>
                </div>
                <button onClick={() => setShowShortcuts(false)} className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="p-4 space-y-1.5 text-xs">
                {[
                  ['Ctrl+Enter', 'Save plan'],
                  ['Esc', 'Close / blur field'],
                  ['↑↓ Enter', 'Navigate customer list'],
                  ['Shift+?', 'Toggle shortcuts'],
                ].map(([k, d]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-300">{d}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                      {k}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
