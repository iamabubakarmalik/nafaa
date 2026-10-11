/** Electronics-only dashboard widgets. */

import { Award, Barcode, CheckCircle2, Clock, PackageCheck, PackageX, Send, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, MetricTile, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { useElectronicsOps } from './useElectronicsOps';

/** Electronics headline numbers, offered next to the common ones. */
export const electronicsKpis: KpiDef[] = [
  {
    id: 'electronics-claims', label: 'Warranty claim khule', icon: Shield, tone: 'warning',
    useValue: () => {
      const { claims, loading } = useElectronicsOps();
      return {
        loading, to: '/electronics/warranty-claims', value: claims.pending, alert: claims.stale > 0,
        hint: claims.stale ? `${claims.stale} hafte se purane` : `${claims.thisMonth} is mahine`,
      };
    },
  },
  {
    id: 'electronics-serials', label: 'Serial stock me', icon: Barcode, tone: 'brand',
    useValue: () => {
      const { serials, loading } = useElectronicsOps();
      return { loading, to: '/electronics/serials', value: serials.inStock, hint: serials.defective ? `${serials.defective} kharab` : `${serials.sold} bik chuke` };
    },
  },
  {
    id: 'electronics-expiring', label: 'Warranty khatam hone wali', icon: ShieldAlert, tone: 'neutral',
    useValue: () => {
      const { serials, loading } = useElectronicsOps();
      return { loading, to: '/electronics/serials', value: serials.expiring, hint: 'agle 30 din me' };
    },
  },
];

export function useElectronicsAttention(): AttentionItem[] {
  const { claims, serials } = useElectronicsOps();
  const items: AttentionItem[] = [];

  if (claims.stale) items.push({ icon: Clock, level: 'danger', text: `${claims.stale} warranty claim ek hafte se zyada purane — customer intezar me hai`, to: '/electronics/warranty-claims', cta: 'Claims dekhein' });
  if (claims.pending > claims.stale) items.push({ icon: Shield, level: 'warning', text: `${claims.pending - claims.stale} warranty claim khule hain`, to: '/electronics/warranty-claims', cta: 'Hal karein' });
  if (serials.defective) items.push({ icon: PackageX, level: 'warning', text: `${serials.defective} unit kharab pare hain — brand ko wapas bhejein ya repair karwayein`, to: '/electronics/serials', cta: 'Serial dekhein' });
  if (claims.sentToBrand) items.push({ icon: Send, level: 'info', text: `${claims.sentToBrand} claim brand ke paas — jawab ka pata karein`, to: '/electronics/warranty-claims', cta: 'Follow up' });
  if (serials.expiring) items.push({ icon: ShieldAlert, level: 'neutral', text: `${serials.expiring} unit ki warranty 30 din me khatam — customer ko service ya extended warranty offer karein`, to: '/electronics/serials', cta: 'Dekhein' });
  return items;
}

export function ElectronicsWarranty() {
  const { claims } = useElectronicsOps();
  const { cost, costHidden } = useMasked();
  return (
    <WidgetCard
      title="Warranty claims"
      icon={Shield}
      description={claims.shopBore > 0 && !costHidden ? `Is mahine dukaan ki jeb se ${cost(claims.shopBore)}` : `${claims.pending} khule · ${claims.resolved} hal hue`}
      to="/electronics/warranty-claims"
      flush
    >
      <RowList empty="Koi claim khula nahi" emptyIcon={ShieldCheck}>
        {claims.list.map((c) => {
          const late = c.ageDays >= 7;
          return (
            <ListRow
              key={c.id}
              to="/electronics/warranty-claims"
              leading={<IconBubble icon={late ? Clock : Shield} tone={late ? 'danger' : 'warning'} />}
              title={c.productName}
              meta={<span><span className="font-mono">{c.claimNumber}</span> · {c.customerName}{c.sentToBrand ? ' · brand ke paas' : ''}</span>}
              value={<Badge variant={late ? 'danger' : 'default'} size="xs">{c.ageDays === 0 ? 'Aaj' : `${c.ageDays} din`}</Badge>}
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
    <WidgetCard title="Serial stock" icon={Barcode} description="Har unit ka serial / IMEI" to="/electronics/serials" flush>
      <div className="grid grid-cols-2 gap-2 px-4 pb-3 sm:px-5">
        <MetricTile icon={PackageCheck} tone="brand" label="Stock me" value={serials.inStock} hint={`${serials.total} kul serial`} />
        <MetricTile icon={CheckCircle2} tone="success" label="Bik chuke" value={serials.sold} />
        <MetricTile icon={PackageX} tone="danger" label="Kharab" value={serials.defective} alert={serials.defective > 0} />
        <MetricTile icon={ShieldAlert} tone="warning" label="Warranty khatam" value={serials.expiring} hint="30 din me" />
      </div>
      <RowList empty="Koi serial stock me nahi" emptyIcon={Barcode}>
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
    <WidgetCard title="Top brands" icon={Award} description="Bikri ke hisaab se" to="/brands" flush>
      <RowList empty="Abhi kisi brand ki bikri nahi" emptyIcon={Award}>
        {brands.map((b, i) => (
          <ListRow
            key={b.id}
            to="/brands"
            leading={b.logoUrl
              ? <img src={b.logoUrl} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1" />
              : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[0.8125rem] font-bold text-slate-600">{i + 1}</span>}
            title={b.name}
            meta={`${b.unitsSold} units`}
            value={sales(b.totalRevenue)}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}
