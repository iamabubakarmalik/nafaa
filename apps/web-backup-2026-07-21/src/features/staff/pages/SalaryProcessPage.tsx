import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Wallet, Calendar, Plus, Minus, Save, Sparkles,
} from 'lucide-react';
import { staffApi } from '@/api/staff.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

export default function SalaryProcessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [staffId, setStaffId] = useState(params.get('staffId') || '');
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split('T')[0];
  });
  const [overtimePay, setOvertimePay] = useState('0');
  const [commissionEarned, setCommissionEarned] = useState('0');
  const [bonuses, setBonuses] = useState('0');
  const [advances, setAdvances] = useState('0');
  const [otherDeductions, setOtherDeductions] = useState('0');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-list-active'],
    queryFn: () => staffApi.list({ status: 'ACTIVE' }),
  });

  const selectedStaff = staff.find((s) => s.id === staffId);

  // Estimated calculations preview
  const estimatedBase = selectedStaff
    ? selectedStaff.salaryType === 'MONTHLY'
      ? selectedStaff.baseSalary
      : 0
    : 0;

  const totalAdditions = Number(overtimePay) + Number(commissionEarned) + Number(bonuses);
  const totalDeductions = Number(advances) + Number(otherDeductions);
  const estimatedNet = Math.max(estimatedBase + totalAdditions - totalDeductions, 0);

  useEffect(() => {
    if (estimatedNet > 0 && !paidAmount) {
      setPaidAmount(String(estimatedNet));
    }
  }, [estimatedNet]);

  const processMutation = useMutation({
    mutationFn: () =>
      staffApi.processSalary({
        staffId,
        periodStart,
        periodEnd,
        overtimePay: Number(overtimePay) || 0,
        commissionEarned: Number(commissionEarned) || 0,
        bonuses: Number(bonuses) || 0,
        advances: Number(advances) || 0,
        otherDeductions: Number(otherDeductions) || 0,
        paidAmount: paidAmount ? Number(paidAmount) : undefined,
        paymentMethod,
        notes: notes || undefined,
      }),
    onSuccess: (payment) => {
      toast.success(`Salary processed: ${payment.paymentNumber}`);
      queryClient.invalidateQueries({ queryKey: ['staff', staffId] });
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      navigate(`/staff/${staffId}`);
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Failed to process salary');
    },
  });

  return (
    <div className="space-y-6">
      <Link to="/staff" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600">
        <ArrowLeft className="h-4 w-4" /> Back to Staff
      </Link>

      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Process Salary
            </div>
            <h1 className="mt-3 text-3xl font-extrabold">Salary Payment</h1>
            <p className="mt-2 text-sm text-white/75">
              Period select karein, additions/deductions add karein
            </p>
          </div>
          <Button
            onClick={() => {
              if (!staffId) { toast.error('Select staff'); return; }
              processMutation.mutate();
            }}
            loading={processMutation.isPending}
            className="bg-white text-emerald-900 hover:bg-slate-100"
          >
            <Save className="h-4 w-4" />
            Process Payment
          </Button>
        </div>
      </section>

      <div className="grid xl:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-5">
          {/* Staff selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Staff *</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">Choose employee...</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} • {s.designation} • {s.salaryType} {formatPKR(s.baseSalary)}
                </option>
              ))}
            </select>
          </div>

          {/* Period */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Period Start *"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
            <Input
              label="Period End *"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>

          {/* Additions */}
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 space-y-3">
            <h3 className="font-bold text-emerald-900 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Additions
            </h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <Input
                label="Overtime Pay"
                type="number"
                step="0.01"
                value={overtimePay}
                onChange={(e) => setOvertimePay(e.target.value)}
              />
              <Input
                label="Commission"
                type="number"
                step="0.01"
                value={commissionEarned}
                onChange={(e) => setCommissionEarned(e.target.value)}
              />
              <Input
                label="Bonuses"
                type="number"
                step="0.01"
                value={bonuses}
                onChange={(e) => setBonuses(e.target.value)}
              />
            </div>
          </div>

          {/* Deductions */}
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 space-y-3">
            <h3 className="font-bold text-rose-900 flex items-center gap-2">
              <Minus className="h-4 w-4" /> Deductions
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="Advances Taken"
                type="number"
                step="0.01"
                value={advances}
                onChange={(e) => setAdvances(e.target.value)}
              />
              <Input
                label="Other Deductions"
                type="number"
                step="0.01"
                value={otherDeductions}
                onChange={(e) => setOtherDeductions(e.target.value)}
              />
            </div>
          </div>

          {/* Payment */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Amount to Pay Now"
              type="number"
              step="0.01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              hint="Leave full to mark fully paid"
            />
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Method</label>
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="JAZZCASH">JazzCash</option>
                <option value="EASYPAISA">EasyPaisa</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes (Optional)</label>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this salary payment..."
            />
          </div>
        </div>

        {/* Preview */}
        <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 sticky top-6">
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-3">
            Estimated Calculation
          </div>

          {selectedStaff ? (
            <>
              <div className="rounded-2xl bg-violet-50 border border-violet-200 p-3 mb-4">
                <div className="font-bold text-slate-900">{selectedStaff.fullName}</div>
                <div className="text-xs text-violet-700">{selectedStaff.designation}</div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Base Salary</span>
                  <span className="font-bold">{formatPKR(estimatedBase)}</span>
                </div>
                {Number(overtimePay) > 0 && (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>+ Overtime</span>
                    <span className="font-bold">{formatPKR(Number(overtimePay))}</span>
                  </div>
                )}
                {Number(commissionEarned) > 0 && (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>+ Commission</span>
                    <span className="font-bold">{formatPKR(Number(commissionEarned))}</span>
                  </div>
                )}
                {Number(bonuses) > 0 && (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>+ Bonuses</span>
                    <span className="font-bold">{formatPKR(Number(bonuses))}</span>
                  </div>
                )}
                {Number(advances) > 0 && (
                  <div className="flex items-center justify-between text-rose-700">
                    <span>- Advances</span>
                    <span className="font-bold">{formatPKR(Number(advances))}</span>
                  </div>
                )}
                {Number(otherDeductions) > 0 && (
                  <div className="flex items-center justify-between text-rose-700">
                    <span>- Other</span>
                    <span className="font-bold">{formatPKR(Number(otherDeductions))}</span>
                  </div>
                )}

                <div className="pt-3 border-t-2 border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-900">Net Payable</span>
                    <span className="text-2xl font-extrabold text-emerald-700">{formatPKR(estimatedNet)}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50 border border-amber-200 p-2 mt-3 text-[11px] text-amber-900">
                  ℹ️ Actual amount auto-calculates from attendance after processing
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">
              Select staff to see preview
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
