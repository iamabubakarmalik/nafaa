/**
 * Appliance products on the shared products page: type, brand and model,
 * ton / liter / kg / inch under every name, warranty months and fitting
 * marks, and links to the serial register and installations.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Barcode, HardHat, ShieldCheck, Truck, Zap } from 'lucide-react';
import { Badge, heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import type { ApplianceProductProfile } from '../api/products.api';
import { applianceSerialApi } from '../api/serial-tracking.api';
import { useApplianceProfiles } from '../components/profiles';
import { catLabel, energyLabel } from '../components/meta';

/** Size line for a profile: "1.5 ton · inverter", "14 cu ft", "8 kg", "55 inch". */
export function sizeLine(p?: ApplianceProductProfile | null) {
  if (!p) return '';
  return [
    p.acTonnage && `${p.acTonnage} ton`, p.fridgeCapacityLiters && `${p.fridgeCapacityLiters} liter`, p.washingCapacityKg && `${p.washingCapacityKg} kg`,
    p.screenSizeInch && `${p.screenSizeInch} inch`, !p.acTonnage && !p.fridgeCapacityLiters && !p.washingCapacityKg && !p.screenSizeInch ? p.capacity : '',
    p.isInverter ? 'Inverter' : energyLabel(p.energyRating) && p.energyRating !== 'NOT_RATED' ? energyLabel(p.energyRating) : '',
  ].filter(Boolean).join(' · ');
}

function HeroLinks() {
  return (
    <>
      <Link to="/appliances/serials" className={heroButton}><Barcode className="h-4 w-4" /><span className="hidden sm:inline">Serials</span></Link>
      <Link to="/appliances/installations" className={heroButton}><HardHat className="h-4 w-4" /><span className="hidden sm:inline">Installations</span></Link>
    </>
  );
}


export default function ApplianceProducts() {
  const profiles = useApplianceProfiles();
  const config = useMemo<ProductsPageConfig>(() => ({
    label: 'Appliances',
    noun: 'product',
    paths: { detail: (id) => `/appliances-products/${id}`, edit: (id) => `/appliances-products/${id}/edit`, create: '/appliances-products/new' },
    HeroExtra: HeroLinks,
    filters: ['tags'],
    stockChips: () => [1, 2, 5, 10, 20],
    extras: (item) => {
      const p = profiles.get(item.id);
      if (!p) return {};
      return {
        line: [item.brand?.name, p.modelNumber, sizeLine(p)].filter(Boolean).join(' · ') || undefined,
        badges: (
          <>
            {p.warrantyMonths > 0 && <Badge size="xs" variant="success" className="gap-1 shadow-sm"><ShieldCheck className="h-3 w-3" />{p.warrantyMonths}m</Badge>}
            {p.requiresInstallation && <Badge size="xs" variant="info" className="gap-1 shadow-sm"><HardHat className="h-3 w-3" />Fitting</Badge>}
          </>
        ),
        chips: (
          <>
            {p.categoryType && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-600">{catLabel(p.categoryType)}</span>}
            {p.isInverter && <Badge size="xs" variant="warning" className="gap-1"><Zap className="h-3 w-3" />Inverter</Badge>}
            {p.freeDelivery && <Badge size="xs" variant="success" className="gap-1"><Truck className="h-3 w-3" />Free delivery</Badge>}
          </>
        ),
      };
    },
    columns: [
      { id: 'type', label: 'Type / size', cell: (i) => { const p = profiles.get(i.id); return p ? <span className="text-[0.8125rem] text-slate-700">{[catLabel(p.categoryType), sizeLine(p)].filter(Boolean).join(' · ')}</span> : <span className="text-slate-400">—</span>; } },
      { id: 'warranty', label: 'Warranty', align: 'right', cell: (i) => { const p = profiles.get(i.id); return p?.warrantyMonths ? <span className="tabular-nums">{p.warrantyMonths} mahine{p.compressorWarrantyMonths ? ` · comp ${p.compressorWarrantyMonths}` : ''}</span> : <span className="text-slate-400">—</span>; } },
    ],
    onScanMiss: async (code, navigate) => {
      const hit = await applianceSerialApi.lookup(code).catch(() => null);
      if (!hit) return false;
      navigate(`/appliances/serials?q=${encodeURIComponent(code)}`);
      return true;
    },
    guide: [
      { icon: Barcode, color: '#7c3aed', title: 'Serial', text: 'Har AC, fridge, LED ka serial register me hota hai — naye product par serial yahin likhein, baad wala maal Serial register me.' },
      { icon: ShieldCheck, color: '#16a34a', title: 'Warranty', text: 'Company aur compressor/motor ki warranty product par likhein — bechte hi har unit ki warranty bill ki date se chalti hai.' },
      { icon: HardHat, color: '#2563eb', title: 'Fitting', text: 'Jis product ki fitting hoti hai (AC, geyser) us par "Fitting" lagayein — POS par bechte hi installation book karne ka option aata hai.' },
    ],
  }), [profiles]);
  return <ProductsPage config={config} />;
}
