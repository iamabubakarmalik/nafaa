/** Electronics-only dashboard widgets. */

import { Award, Barcode, CheckCircle2, Clock, PackageCheck, PackageX, Send, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, MetricTile, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { useElectronicsOps } from './useElectronicsOps';
import { t } from '@core/i18n';

/** Electronics headline numbers, offered next to the common ones. */
export const electronicsKpis: KpiDef[] = [
  {
    id: 'electronics-claims', label: t('Warranty claim khule'), icon: Shield, tone: 'warning',
    useValue: () => {
      const { claims, loading } = useElectronicsOps();
      return {
        loading, to: '/electronics/warranty-claims', value: claims.pending, alert: claims.stale > 0,
        hint: claims.stale ? t('{{stale}} hafte se purane', { stale: claims.stale }) : t('{{thisMonth}} is mahine', { thisMonth: claims.thisMonth }),
      };
    },
  },
  {
    id: 'electronics-serials', label: t('Serial stock me'), icon: Barcode, tone: 'brand',
    useValue: () => {
      const { serials, loading } = useElectronicsOps();
      return { loading, to: '/electronics/serials', value: serials.inStock, hint: serials.defective ? t('{{defective}} kharab', { defective: serials.defective }) : t('{{sold}} bik chuke', { sold: serials.sold }) };
    },
  },
  {
    id: 'electronics-expiring', label: t('Warranty khatam hone wali'), icon: ShieldAlert, tone: 'neutral',
    useValue: () => {
      const { serials, loading } = useElectronicsOps();
      return { loading, to: '/electronics/serials', value: serials.expiring, hint: t('agle 30 din me') };
    },
  },
];

export function useElectronicsAttention(): AttentionItem[] {
  const { claims, serials } = useElectronicsOps();
  const items: AttentionItem[] = [];

  if (claims.stale) items.push({ icon: Clock, level: 'danger', text: t('{{stale}} warranty claim ek hafte se zyada purane — customer intezar me hai', { stale: claims.stale }), to: '/electronics/warranty-claims', cta: t('Claims dekhein') });
  if (claims.pending > claims.stale) items.push({ icon: Shield, level: 'warning', text: t('{{value}} warranty claim khule hain', { value: claims.pending - claims.stale }), to: '/electronics/warranty-claims', cta: t('Hal karein') });
  if (serials.defective) items.push({ icon: PackageX, level: 'warning', text: t('{{defective}} unit kharab pare hain — brand ko wapas bhejein ya repair karwayein', { defective: serials.defective }), to: '/electronics/serials', cta: t('Serial dekhein') });
  if (claims.sentToBrand) items.push({ icon: Send, level: 'info', text: t('{{sentToBrand}} claim brand ke paas — jawab ka pata karein', { sentToBrand: claims.sentToBrand }), to: '/electronics/warranty-claims', cta: t('Follow up') });
  if (serials.expiring) items.push({ icon: ShieldAlert, level: 'neutral', text: t('{{expiring}} unit ki warranty 30 din me khatam — customer ko service ya extended warranty offer karein', { expiring: serials.expiring }), to: '/electronics/serials', cta: t('Dekhein') });
  return items;
}

export function ElectronicsWarranty() {
  const { claims } = useElectronicsOps();
  const { cost, costHidden } = useMasked();
  return (
    <WidgetCard
      title={t('Warranty claims')}
      icon={Shield}
      description={claims.shopBore > 0 && !costHidden ? t('Is mahine dukaan ki jeb se {{shopBore}}', { shopBore: cost(claims.shopBore) }) : t('{{pending}} khule · {{resolved}} hal hue', { pending: claims.pending, resolved: claims.resolved })}
      to="/electronics/warranty-claims"
      flush
    >
      <RowList empty={t('Koi claim khula nahi')} emptyIcon={ShieldCheck}>
        {claims.list.map((c) => {
          const late = c.ageDays >= 7;
          return (
            <ListRow
              key={c.id}
              to="/electronics/warranty-claims"
              leading={<IconBubble icon={late ? Clock : Shield} tone={late ? 'danger' : 'warning'} />}
              title={c.productName}
              meta={<span><span className="font-mono">{c.claimNumber}</span> · {c.customerName}{c.sentToBrand ? t(' · brand ke paas') : ''}</span>}
              value={<Badge variant={late ? 'danger' : 'default'} size="xs">{c.ageDays === 0 ? t('Aaj') : t('{{ageDays}} din', { ageDays: c.ageDays })}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function ElectronicsSerials() {
  const { serials } = useElectronicsOps();
  return (
    <WidgetCard title={t('Serial stock')} icon={Barcode} description={t('Har unit ka serial / IMEI')} to="/electronics/serials" flush>
      <div className="grid grid-cols-2 gap-2 px-4 pb-3 sm:px-5">
        <MetricTile icon={PackageCheck} tone="brand" label={t('Stock me')} value={serials.inStock} hint={t('{{total}} kul serial', { total: serials.total })} />
        <MetricTile icon={CheckCircle2} tone="success" label={t('Bik chuke')} value={serials.sold} />
        <MetricTile icon={PackageX} tone="danger" label={t('Kharab')} value={serials.defective} alert={serials.defective > 0} />
        <MetricTile icon={ShieldAlert} tone="warning" label={t('Warranty khatam')} value={serials.expiring} hint={t('30 din me')} />
      </div>
      <RowList empty={t('Koi serial stock me nahi')} emptyIcon={Barcode}>
        {serials.recent.map((s) => (
          <ListRow
            key={s.id}
            to="/electronics/serials"
            icon={Barcode}
            title={<span className="font-mono">{s.serialNumber}</span>}
            meta={`${s.product?.name ?? 'Product'}${s.imei ? ` · IMEI ${s.imei}` : ''}`}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function ElectronicsBrands() {
  const { brands } = useElectronicsOps();
  const { sales } = useMasked();
  return (
    <WidgetCard title={t('Top brands')} icon={Award} description={t('Sale ke hisaab se')} to="/brands" flush>
      <RowList empty={t('Abhi kisi brand ki sale nahi')} emptyIcon={Award}>
        {brands.map((b, i) => (
          <ListRow
            key={b.id}
            to="/brands"
            leading={b.logoUrl
              ? <img src={b.logoUrl} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1" />
              : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[0.8125rem] font-bold text-slate-600">{i + 1}</span>}
            title={b.name}
            meta={t('{{unitsSold}} units', { unitsSold: b.unitsSold })}
            value={sales(b.totalRevenue)}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}
