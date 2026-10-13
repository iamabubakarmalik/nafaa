/** Hardware-only dashboard widgets. */

import { AlertTriangle, Building2, Clock, CreditCard, FileText, HardHat, RefreshCw, Truck } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { cn } from '@core/lib/cn';
import { useHardwareOps } from './useHardwareOps';

/** Hardware headline numbers, offered next to the common ones. */
export const hardwareKpis: KpiDef[] = [
  {
    id: 'hardware-deliveries', label: 'Aaj ki delivery', icon: Truck, tone: 'info',
    useValue: () => {
      const { delivery, loading } = useHardwareOps();
      return {
        loading, to: '/hardware/deliveries', value: delivery.today,
        hint: delivery.inTransit ? `${delivery.inTransit} raste me` : `${delivery.open} baqi`,
      };
    },
  },
  {
    id: 'hardware-credit', label: 'Contractor udhaar', icon: CreditCard, tone: 'danger', sensitive: true,
    useValue: () => {
      const { credit, loading } = useHardwareOps();
      const { cost } = useMasked();
      return {
        loading, to: '/hardware/credit-accounts', value: cost(credit.outstanding), alert: credit.overdueAccounts > 0,
        hint: credit.overdueAccounts ? `${credit.overdueAccounts} account overdue` : `${credit.accounts} account`,
      };
    },
  },
  {
    id: 'hardware-quotes', label: 'Quotation jawab baqi', icon: FileText, tone: 'warning',
    useValue: () => {
      const { quotations, loading } = useHardwareOps();
      return {
        loading, to: '/hardware/quotations', value: quotations.pending,
        hint: quotations.expired ? `${quotations.expired} expire` : `${quotations.acceptedCount} mani gayin`,
      };
    },
  },
  {
    id: 'hardware-projects', label: 'Chalte projects', icon: Building2, tone: 'brand',
    useValue: () => {
      const { projects, loading } = useHardwareOps();
      return { loading, to: '/hardware/projects', value: projects.active, hint: 'construction sites' };
    },
  },
  {
    id: 'hardware-reorder', label: 'Mangwana hai', icon: RefreshCw, tone: 'warning',
    useValue: () => {
      const { reorder, loading } = useHardwareOps();
      return { loading, to: '/hardware/reorder-rules', value: reorder, alert: reorder > 0, hint: 'reorder point se neeche' };
    },
  },
];

export function useHardwareAttention(): AttentionItem[] {
  const { credit, delivery, quotations, reorder } = useHardwareOps();
  const { cost } = useMasked();
  const items: AttentionItem[] = [];
  if (credit.overdueAccounts) items.push({ icon: CreditCard, level: 'danger', text: `${credit.overdueAccounts} contractor ka udhaar waqt se guzar gaya — receiving karein`, to: '/hardware/credit-accounts', cta: 'Accounts' });
  if (credit.over90 > 0) items.push({ icon: Clock, level: 'warning', text: `${cost(credit.over90)} udhaar 90 din se purana hai`, to: '/hardware/credit-accounts', cta: 'Dekhein' });
  if (delivery.today) items.push({ icon: Truck, level: 'info', text: `Aaj ${delivery.today} delivery bhejni hai — gaari aur maal tayyar rakhein`, to: '/hardware/deliveries', cta: 'Delivery' });
  if (reorder) items.push({ icon: RefreshCw, level: 'warning', text: `${reorder} cheezein reorder point se neeche — cement, sarya waqt par mangwayein`, to: '/hardware/reorder-rules', cta: 'Reorder' });
  if (quotations.pending) items.push({ icon: FileText, level: 'neutral', text: `${quotations.pending} quotation ka jawab nahi aaya — customer ko call karein`, to: '/hardware/quotations', cta: 'Follow up' });
  return items;
}

export function HardwareCredit() {
  const { credit } = useHardwareOps();
  const { cost } = useMasked();
  return (
    <WidgetCard
      title="Contractor udhaar"
      icon={CreditCard}
      description={credit.outstanding > 0 ? `${cost(credit.outstanding)} lena hai${credit.over90 > 0 ? ` · ${cost(credit.over90)} 90+ din` : ''}` : 'Kisi ka udhaar baqi nahi'}
      to="/hardware/credit-accounts"
      flush
    >
      <RowList empty="Kisi contractor ka udhaar baqi nahi" emptyIcon={CreditCard}>
        {credit.list.map((a) => {
          const late = a.status === 'OVERDUE' || Number(a.ageOver90Days) > 0;
          return (
            <ListRow
              key={a.id}
              to="/hardware/credit-accounts"
              leading={<IconBubble icon={HardHat} tone={late ? 'danger' : 'warning'} />}
              title={a.businessName || a.customerName}
              meta={a.businessName ? a.customerName : a.lastPaymentDate ? `Aakhri payment ${new Date(a.lastPaymentDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}` : 'Payment nahi aayi'}
              value={cost(a.currentBalance)}
              valueHint={a.overLimit
                ? <Badge variant="danger" size="xs">Limit se zyada</Badge>
                : a.old > 0 ? <Badge variant="warning" size="xs">{cost(a.old)} 60+ din</Badge> : undefined}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function HardwareDeliveries() {
  const { delivery } = useHardwareOps();
  const { sales } = useMasked();
  return (
    <WidgetCard
      title="Aane wali delivery"
      icon={Truck}
      description={`${delivery.pending} dispatch baqi · ${delivery.inTransit} raste me`}
      to="/hardware/deliveries"
      flush
    >
      <RowList empty="Koi delivery schedule nahi" emptyIcon={Truck}>
        {delivery.list.map((d) => {
          const when = d.left === null ? '—' : d.left <= 0 ? 'Aaj' : d.left === 1 ? 'Kal' : `${d.left} din`;
          return (
            <ListRow
              key={d.id}
              to="/hardware/deliveries"
              icon={Truck}
              title={d.customerName}
              meta={<span><span className="font-mono">{d.deliveryNumber}</span>{d.area || d.city ? ` · ${d.area || d.city}` : ''}{d.totalCharges ? ` · ${sales(d.totalCharges)}` : ''}</span>}
              value={<Badge variant={d.left !== null && d.left <= 0 ? 'warning' : 'default'} size="xs">{when}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function HardwareProjects() {
  const { projects } = useHardwareOps();
  const { sales } = useMasked();
  return (
    <WidgetCard
      title="Chalte projects"
      icon={Building2}
      description={`${projects.active} construction site par maal ja raha hai`}
      to="/hardware/projects"
      flush
    >
      <RowList empty="Koi project nahi — bare contractor ka kaam project bana kar track karein" emptyIcon={Building2}>
        {projects.list.map((p) => (
          <div key={p.id} className="px-4 py-2.5 sm:px-5">
            <div className="flex items-center gap-3">
              <IconBubble icon={Building2} tone="brand" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.875rem] font-medium text-slate-900">{p.name}</div>
                <div className="truncate text-[0.75rem] text-slate-500">{p.contractorName || p.customerName}{p.area || p.city ? ` · ${p.area || p.city}` : ''}</div>
              </div>
              <div className="shrink-0 text-right text-[0.875rem] font-semibold tabular-nums text-slate-900">{sales(p.totalDelivered)}</div>
            </div>
            {p.pct !== null && (
              <div className="mt-2 flex items-center gap-2 pl-12">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className={cn('h-full rounded-full', p.pct >= 100 ? 'bg-success-600' : 'bg-brand-600')} style={{ width: `${p.pct}%` }} />
                </div>
                <span className="text-[0.75rem] tabular-nums text-slate-500">{p.pct}% pahuncha</span>
              </div>
            )}
          </div>
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function HardwareQuotes() {
  const { quotations } = useHardwareOps();
  const { sales } = useMasked();
  const rows: Array<[string, number | string, string]> = [
    ['Jawab baqi', quotations.pending, 'text-amber-700'],
    ['Mani gayin', quotations.acceptedCount, 'text-success-700'],
    ['Expire', quotations.expired, 'text-rose-700'],
  ];
  return (
    <WidgetCard title="Quotations" icon={FileText} description={`${sales(quotations.acceptedValue)} ki quotation mani gayin`} to="/hardware/quotations">
      <dl className="grid grid-cols-3 gap-2 text-center">
        {rows.map(([label, n, color]) => (
          <div key={label} className="rounded-lg bg-slate-50 py-2.5">
            <dd className={cn('text-xl font-bold tabular-nums', color)}>{n}</dd>
            <dt className="text-[0.75rem] text-slate-500">{label}</dt>
          </div>
        ))}
      </dl>
      {quotations.pending > 0 && (
        <p className="mt-3 flex items-center gap-2 text-[0.8125rem] text-slate-600">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          Jawab na aaye to 2-3 din me call karein — bara order aksar follow-up se milta hai.
        </p>
      )}
    </WidgetCard>
  );
}
