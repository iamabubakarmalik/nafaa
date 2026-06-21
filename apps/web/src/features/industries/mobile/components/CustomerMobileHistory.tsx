import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Smartphone, Wrench, RefreshCw, CreditCard, ShieldCheck,
  Calendar, Package, ExternalLink, Award, AlertCircle,
  CheckCircle2, Clock,
} from 'lucide-react';
import { apiClient } from '@/api/client';
import { formatPKR } from '@/lib/format';
import { PtaStatusBadge } from './PtaStatusBadge';
import { RepairStatusBadge } from '../repairs/components/RepairStatusBadge';

interface Props {
  customerId: string;
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(iso));

export function CustomerMobileHistory({ customerId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['customer-mobile-history', customerId],
    queryFn: async () => {
      const res = await apiClient.get(`/customers/${customerId}/mobile-history`);
      return res?.data?.data ?? res?.data;
    },
    enabled: !!customerId,
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
        <Smartphone className="h-12 w-12 text-slate-300 mx-auto mb-2" />
        <div className="font-bold text-slate-700">No mobile history</div>
        <div className="text-xs text-slate-500 mt-1">
          Customer ne abhi tak koi mobile transaction nahi ki
        </div>
      </div>
    );
  }

  const { summary, imeisPurchased, repairs, usedPhonesSold, emiPlans } = data;

  const hasAny = imeisPurchased.length > 0 || repairs.length > 0 ||
                 usedPhonesSold.length > 0 || emiPlans.length > 0;

  if (!hasAny) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
        <Smartphone className="h-16 w-16 text-slate-300 mx-auto mb-3" />
        <div className="font-bold text-slate-700 text-lg">No mobile activity yet</div>
        <div className="text-sm text-slate-500 mt-1">
          Jab customer phone kharide ya repair karwaye, history yahan dikhe gi
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <StatCard label="Phones Bought" value={summary.totalPhonesPurchased} icon={Smartphone} color="blue" />
        <StatCard label="Under Warranty" value={summary.underWarrantyCount} icon={ShieldCheck} color="emerald" />
        <StatCard label="Repairs" value={summary.repairTicketsCount} icon={Wrench} color="orange" />
        <StatCard label="Trade-Ins" value={summary.usedPhonesSoldCount} icon={RefreshCw} color="violet" />
        <StatCard label="EMI Plans" value={summary.activeEmiPlansCount} icon={CreditCard} color="indigo" />
      </div>

      {/* IMEIs / Phones Purchased */}
      {imeisPurchased.length > 0 && (
        <section className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50">
            <Smartphone className="h-5 w-5 text-blue-700" />
            <h3 className="font-bold text-blue-900">
              Phones Purchased ({imeisPurchased.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {imeisPurchased.map((imei: any) => (
              <div key={imei.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-slate-900 text-sm">
                        {imei.imei1}
                      </span>
                      <PtaStatusBadge status={imei.ptaStatus} size="sm" />
                      {imei.isUnderWarranty && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
                          <ShieldCheck className="h-2.5 w-2.5" /> WARRANTY
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-slate-900 mt-1">
                      {imei.product?.name}
                      {imei.product?.brand?.name && (
                        <span className="text-violet-700 text-sm"> · {imei.product.brand.name}</span>
                      )}
                      {imei.variant?.name && (
                        <span className="text-slate-500 text-sm"> — {imei.variant.name}</span>
                      )}
                    </div>
                    {imei.imei2 && (
                      <div className="text-xs text-slate-500 font-mono">IMEI 2: {imei.imei2}</div>
                    )}
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      {imei.color && <span className="text-violet-700 font-bold">🎨 {imei.color}</span>}
                      {imei.warrantyMonths > 0 && (
                        <span>🛡️ {imei.warrantyMonths}m warranty</span>
                      )}
                      {imei.warrantyExpiry && (
                        <span className={imei.isUnderWarranty ? 'text-emerald-700 font-bold' : 'text-rose-700'}>
                          {imei.isUnderWarranty ? 'Until' : 'Expired'}: {formatDate(imei.warrantyExpiry)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700">
                      {formatPKR(imei.soldPrice || 0)}
                    </div>
                    {imei.sale && (
                      <Link
                        to={`/sales/${imei.sale.id}/receipt`}
                        className="text-[10px] font-bold text-blue-700 hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        {imei.sale.saleNumber} <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    )}
                    {imei.soldAt && (
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {formatDate(imei.soldAt)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Repair Tickets */}
      {repairs.length > 0 && (
        <section className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2 bg-gradient-to-r from-orange-50 to-amber-50">
            <Wrench className="h-5 w-5 text-orange-700" />
            <h3 className="font-bold text-orange-900">
              Repair Tickets ({repairs.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {repairs.map((ticket: any) => (
              <Link
                key={ticket.id}
                to={`/repair-tickets/${ticket.id}`}
                className="block p-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-orange-700 text-sm">
                        {ticket.ticketNumber}
                      </span>
                      <RepairStatusBadge status={ticket.status} size="sm" />
                    </div>
                    <div className="font-bold text-slate-900 mt-1">
                      {ticket.deviceBrand} {ticket.deviceModel}
                      {ticket.imei1 && (
                        <span className="text-xs font-mono text-slate-500 ml-2">
                          IMEI: {ticket.imei1}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-700 mt-1">
                      <strong>Issue:</strong> {ticket.reportedIssue.slice(0, 100)}
                      {ticket.reportedIssue.length > 100 && '...'}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      {formatDate(ticket.receivedAt)}
                      {ticket._count.parts > 0 && ` · ${ticket._count.parts} parts`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-orange-700">
                      {formatPKR(ticket.totalCost || 0)}
                    </div>
                    {ticket.balanceDue > 0 && (
                      <div className="text-[10px] text-amber-700 font-bold">
                        Due: {formatPKR(ticket.balanceDue)}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Used Phones Sold (Trade-In) */}
      {usedPhonesSold.length > 0 && (
        <section className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2 bg-gradient-to-r from-violet-50 to-fuchsia-50">
            <RefreshCw className="h-5 w-5 text-violet-700" />
            <h3 className="font-bold text-violet-900">
              Trade-Ins to Shop ({usedPhonesSold.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {usedPhonesSold.map((phone: any) => (
              <Link
                key={phone.id}
                to={`/used-phones`}
                className="block p-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-violet-700 text-sm">
                        {phone.usedPhoneCode}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {phone.condition}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                        {phone.status}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 mt-1">
                      {phone.brand} {phone.model}
                      {phone.storage && <span className="text-slate-500"> · {phone.storage}</span>}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      IMEI: {phone.imei1}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      {formatDate(phone.receivedAt)} · {phone.source.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Buyback</div>
                    <div className="font-extrabold text-violet-700">
                      {formatPKR(phone.buybackPrice || 0)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* EMI Plans */}
      {emiPlans.length > 0 && (
        <section className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50">
            <CreditCard className="h-5 w-5 text-indigo-700" />
            <h3 className="font-bold text-indigo-900">
              EMI Plans ({emiPlans.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {emiPlans.map((plan: any) => {
              const paidInstallments = plan.installments.filter((i: any) => i.status === 'PAID').length;
              const overdue = plan.installments.filter(
                (i: any) =>
                  i.status !== 'PAID' &&
                  i.status !== 'WAIVED' &&
                  new Date(i.dueDate) < new Date(),
              ).length;
              return (
                <Link
                  key={plan.id}
                  to={`/emi-plans/${plan.id}`}
                  className="block p-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-indigo-700 text-sm">
                          {plan.planNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          plan.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                          plan.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          plan.status === 'DEFAULTED' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {plan.status}
                        </span>
                        {overdue > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                            <AlertCircle className="h-2.5 w-2.5" /> {overdue} OVERDUE
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-900 mt-1">
                        {formatPKR(plan.totalAmount)}
                        <span className="text-xs text-slate-500 font-normal"> total · </span>
                        <span className="text-xs text-indigo-700 font-bold">
                          {plan.installmentCount} months
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Paid: <strong className="text-emerald-700">{paidInstallments}/{plan.installmentCount}</strong>
                        {' · '}
                        Per month: <strong>{formatPKR(plan.installmentAmount)}</strong>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase font-bold text-amber-700">Remaining</div>
                      <div className="font-extrabold text-amber-700">
                        {formatPKR(plan.remainingAmount)}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, color,
}: {
  label: string;
  value: number;
  icon: any;
  color: 'blue' | 'emerald' | 'orange' | 'violet' | 'indigo';
}) {
  const map = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    violet: 'bg-violet-50 border-violet-200 text-violet-900',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  };
  return (
    <div className={`rounded-xl border-2 p-2.5 ${map[color]}`}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        <div className="text-[9px] uppercase tracking-wider font-bold">{label}</div>
      </div>
      <div className="text-2xl font-extrabold mt-1">{value}</div>
    </div>
  );
}