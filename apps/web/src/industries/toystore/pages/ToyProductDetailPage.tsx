/** Toy detail on the shared product page: age, type, brand, safety marks, cells and gift marks. */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Baby, BatteryCharging, Gift, Moon, ShieldCheck } from 'lucide-react';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { toyProductsApi, type ToyProductProfile } from '../api/products.api';
import { cellsNeeded } from '../hooks/useToyFacts';
import { CATEGORIES, CERTIFICATIONS, GENDERS, KEYS, ageText, labelOf } from '../lib/meta';
import { t as tr } from '@core/i18n';

interface Extra { toy: ToyProductProfile | null }

const pill = 'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.75rem] font-semibold';

const config: DetailConfig<Extra> = {
  label: tr('Toy shop'),
  paths: { list: '/products', edit: (id) => `/toystore-products/${id}/edit` },
  stockChips: [1, 6, 12, 24],
  extra: {
    key: KEYS.detail,
    load: async (id) => ({ toy: await toyProductsApi.byProduct(id).catch(() => null) }),
  },
  badges: ({ extra }) => {
    const t = extra?.toy;
    if (!t) return null;
    return (
      <>
        <span className={`${pill} bg-pink-50 text-pink-700 ring-1 ring-pink-200`}><Baby className="h-3 w-3" />{ageText(t)}</span>
        {t.categoryType && <span className={`${pill} bg-slate-100 text-slate-700`}>{labelOf(CATEGORIES, t.categoryType)}</span>}
        {t.chokingHazard && <span className={`${pill} bg-amber-50 text-amber-800 ring-1 ring-amber-200`}><AlertTriangle className="h-3 w-3" />{tr('Chhote purze')}</span>}
        {t.isEidGift && <span className={`${pill} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200`}><Moon className="h-3 w-3" />{tr('Eid gift')}</span>}
      </>
    );
  },
  facts: ({ extra, money }) => {
    const t = extra?.toy;
    if (!t) return [];
    const certs = (t.safetyCertifications ?? []).map((c) => labelOf(CERTIFICATIONS, c)).join(', ');
    const rows: Array<[string, ReactNode]> = [
      [tr('Brand'), t.brand], [tr('Character'), t.characterFranchise], [tr('Kis ke liye'), labelOf(GENDERS, t.genderTarget)],
      [tr('Material'), t.material], [tr('Piece'), t.numberOfPieces ? String(t.numberOfPieces) : undefined],
      [tr('Cell'), t.requiresBatteries ? `${[t.batteryQuantity, t.batteryType].filter(Boolean).join(' x ') || tr('Haan')}${t.batteriesIncluded ? tr(' (dabbe me)') : tr(' (alag)')}` : undefined],
      [tr('Remote'), t.isRemoteControlled ? tr('Haan') : undefined],
      [tr('Certificate'), certs || undefined], [tr('Warranty'), t.warrantyMonths ? tr('{{count}} mahine', { count: t.warrantyMonths }) : undefined],
      ['MRP', t.mrp ? money(t.mrp) : undefined],
      [tr('Gift'), [t.isBirthdayGift && tr('Saalgirah'), t.isEidGift && tr('Eid'), t.giftWrapAvailable && tr('Gift wrap')].filter(Boolean).join(' · ') || undefined],
    ];
    return rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  },
  alerts: ({ extra }) => {
    const t = extra?.toy;
    if (!t) return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-slate-700 ring-1 ring-slate-200">
        <Baby className="h-4 w-4" /><span className="text-[0.875rem]">{tr('Is khilone par umar aur safety nahi likhi — Edit se likhein, POS ke umar chips me aa jayega.')}</span>
      </div>
    );
    const cells = cellsNeeded(t);
    if (!t.chokingHazard && !cells) return null;
    return (
      <div className="space-y-2">
        {t.chokingHazard && (
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="h-4 w-4" /><span className="text-[0.875rem] font-medium">{tr('Chhote purze hain — 3 saal se chhote bachay ke liye na dein.')}</span>
            <Link to="/toystore/safety-review" className="ms-auto text-[0.8125rem] font-semibold hover:underline">{tr('Safety review →')}</Link>
          </div>
        )}
        {cells && (
          <div className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-sky-900 ring-1 ring-sky-200">
            <BatteryCharging className="h-4 w-4" /><span className="text-[0.875rem] font-medium">{tr('Cell dabbe me nahi ({{cells}}) — bechte waqt cell bhi pesh karein.', { cells })}</span>
          </div>
        )}
      </div>
    );
  },
  guide: [
    { icon: ShieldCheck, color: '#16a34a', title: tr('Umar aur safety'), text: tr('Umar, chhote purze aur certificate Edit se badlein — POS aur Gift finder foran naya dikhate hain.') },
    { icon: Gift, color: '#db2777', title: tr('Gift pack'), text: tr('Ye khilona Gift packs me jor kar Eid ya saalgirah ka set bana sakte hain.') },
  ],
};

export default function ToyProductDetailPage() {
  return <ProductDetailPage config={config} />;
}
