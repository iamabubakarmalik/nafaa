/** Hardware-only dashboard widgets. */

import { AlertTriangle, Building2, Clock, CreditCard, FileText, HardHat, RefreshCw, Truck } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { cn } from '@core/lib/cn';
import { useHardwareOps } from './useHardwareOps';
import { t } from '@core/i18n';

/** Hardware headline numbers, offered next to the common ones. */
export const hardwareKpis: KpiDef[] = [
  {
    id: 'hardware-deliveries', label: t('Aaj ki delivery'), icon: Truck, tone: 'info',
    useValue: () => {
      const { delivery, loading } = useHardwareOps();
      return {
        loading, to: '/hardware/deliveries', value: delivery.today,
        hint: delivery.inTransit ? t('{{inTransit}} raste me', { inTransit: delivery.inTransit }) : t('{{open}} baqi', { open: delivery.open }),
      };
    },
  },
  {
    id: 'hardware-credit', label: t('Contractor udhaar'), icon: CreditCard, tone: 'danger', sensitive: true,
    useValue: () => {
      const { credit, loading } = useHardwareOps();
      const { cost } = useMasked();
      return {
        loading, to: '/hardware/credit-accounts', value: cost(credit.outstanding), alert: credit.overdueAccounts > 0,
        hint: credit.overdueAccounts ? t('{{overdueAccounts}} account overdue', { overdueAccounts: credit.overdueAccounts }) : t('{{accounts}} account', { accounts: credit.accounts }),
      };
    },
  },
  {
    id: 'hardware-quotes', label: t('Quotation jawab baqi'), icon: FileText, tone: 'warning',
    useValue: () => {
      const { quotations, loading } = useHardwareOps();
      return {
        loading, to: '/hardware/quotations', value: quotations.pending,
        hint: quotations.expired ? t('{{expired}} expire', { expired: quotations.expired }) : t('{{acceptedCount}} mani gayin', { acceptedCount: quotations.acceptedCount }),
      };
    },
  },
  {
    id: 'hardware-projects', label: t('Chalte projects'), icon: Building2, tone: 'brand',
    useValue: () => {
      const { projects, loading } = useHardwareOps();
      return { loading, to: '/hardware/projects', value: projects.active, hint: t('construction sites') };
    },
  },
  {
    id: 'hardware-reorder', label: t('Mangwana hai'), icon: RefreshCw, tone: 'warning',
    useValue: () => {
      const { reorder, loading } = useHardwareOps();
      return { loading, to: '/hardware/reorder-rules', value: reorder, alert: reorder > 0, hint: t('reorder point se neeche') };
    },
  },
];

export function useHardwareAttention(): AttentionItem[] {
  const { credit, delivery, quotations, reorder } = useHardwareOps();
  const { cost } = useMasked();
  const items: AttentionItem[] = [];
  if (credit.overdueAccounts) items.push({ icon: CreditCard, level: 'danger', text: t('{{overdueAccounts}} contractor ka udhaar waqt se guzar gaya — receiving karein', { overdueAccounts: credit.overdueAccounts }), to: '/hardware/credit-accounts', cta: t('Accounts') });
  if (credit.over90 > 0) items.push({ icon: Clock, level: 'warning', text: t('{{over90}} udhaar 90 din se purana hai', { over90: cost(credit.over90) }), to: '/hardware/credit-accounts', cta: t('Dekhein') });
  if (delivery.today) items.push({ icon: Truck, level: 'info', text: t('Aaj {{today}} delivery bhejni hai — gaari aur maal tayyar rakhein', { today: delivery.today }), to: '/hardware/deliveries', cta: t('Delivery') });
  if (reorder) items.push({ icon: RefreshCw, level: 'warning', text: t('{{reorder}} cheezein reorder point se neeche — cement, sarya waqt par mangwayein', { reorder }), to: '/hardware/reorder-rules', cta: t('Reorder') });
  if (quotations.pending) items.push({ icon: FileText, level: 'neutral', text: t('{{pending}} quotation ka jawab nahi aaya — customer ko call karein', { pending: quotations.pending }), to: '/hardware/quotations', cta: t('Follow up') });
  return items;
}

export function HardwareCredit() {
  const { credit } = useHardwareOps();
  const { cost } = useMasked();
  return (
    <WidgetCard
      title={t('Contractor udhaar')}
      icon={CreditCard}
      description={credit.outstanding > 0 ? t('{{outstanding}} lena hai{{value}}', { outstanding: cost(credit.outstanding), value: credit.over90 > 0 ? t(' · {{over90}} 90+ din', { over90: cost(credit.over90) }) : '' }) : t('Kisi ka udhaar baqi nahi')}
      to="/hardware/credit-accounts"
      flush
    >
      <RowList empty={t('Kisi contractor ka udhaar baqi nahi')} emptyIcon={CreditCard}>
        {credit.list.map((a) => {
          const late = a.status === 'OVERDUE' || Number(a.ageOver90Days) > 0;
          return (
            <ListRow
              key={a.id}
              to="/hardware/credit-accounts"
              leading={<IconBubble icon={HardHat} tone={late ? 'danger' : 'warning'} />}
              title={a.businessName || a.customerName}
              meta={a.businessName ? a.customerName : a.lastPaymentDate ? t('Aakhri payment {{value}}', { value: new Date(a.lastPaymentDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) }) : t('Payment nahi aayi')}
              value={cost(a.currentBalance)}
              valueHint={a.overLimit
                ? <Badge variant="danger" size="xs">{t('Limit se zyada')}</Badge>
                : a.old > 0 ? <Badge variant="warning" size="xs">{t('{{old}} 60+ din', { old: cost(a.old) })}</Badge> : undefined}
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
      title={t('Aane wali delivery')}
      icon={Truck}
      description={t('{{pending}} dispatch baqi · {{inTransit}} raste me', { pending: delivery.pending, inTransit: delivery.inTransit })}
      to="/hardware/deliveries"
      flush
    >
      <RowList empty={t('Koi delivery schedule nahi')} emptyIcon={Truck}>
        {delivery.list.map((d) => {
          const when = d.left === null ? '—' : d.left <= 0 ? t('Aaj') : d.left === 1 ? t('Kal') : t('{{left}} din', { left: d.left });
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
      title={t('Chalte projects')}
      icon={Building2}
      description={t('{{active}} construction site par maal ja raha hai', { active: projects.active })}
      to="/hardware/projects"
      flush
    >
      <RowList empty={t('Koi project nahi — bare contractor ka kaam project bana kar track karein')} emptyIcon={Building2}>
        {projects.list.map((p) => (
          <div key={p.id} className="px-4 py-2.5 sm:px-5">
            <div className="flex items-center gap-3">
              <IconBubble icon={Building2} tone="brand" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.875rem] font-medium text-slate-900">{p.name}</div>
                <div className="truncate text-[0.75rem] text-slate-500">{p.contractorName || p.customerName}{p.area || p.city ? ` · ${p.area || p.city}` : ''}</div>
              </div>
              <div className="shrink-0 text-end text-[0.875rem] font-semibold tabular-nums text-slate-900">{sales(p.totalDelivered)}</div>
            </div>
            {p.pct !== null && (
              <div className="mt-2 flex items-center gap-2 ps-12">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className={cn('h-full rounded-full', p.pct >= 100 ? 'bg-success-600' : 'bg-brand-600')} style={{ width: `${p.pct}%` }} />
                </div>
                <span className="text-[0.75rem] tabular-nums text-slate-500">{t('{{pct}}% pahuncha', { pct: p.pct })}</span>
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
    [t('Jawab baqi'), quotations.pending, 'text-amber-700'],
    [t('Mani gayin'), quotations.acceptedCount, 'text-success-700'],
    [t('Expire'), quotations.expired, 'text-rose-700'],
  ];
  return (
    <WidgetCard title={t('Quotations')} icon={FileText} description={t('{{acceptedValue}} ki quotation mani gayin', { acceptedValue: sales(quotations.acceptedValue) })} to="/hardware/quotations">
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
          {t('Jawab na aaye to 2-3 din me call karein — bara order aksar follow-up se milta hai.')}
        </p>
      )}
    </WidgetCard>
  );
}
