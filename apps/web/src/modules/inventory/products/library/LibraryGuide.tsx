/** Guide for the product library: choose ready-made products, set the margin, add them. */

import { BadgeDollarSign, Beaker, BookOpen, CheckSquare, PackagePlus, ScanLine, Search, ShoppingCart } from 'lucide-react';
import { PageGuide } from '@core/components/PageGuide';
import { t } from '@core/i18n';

export function LibraryGuide({ pharmacy, onClose }: { pharmacy: boolean; onClose: () => void }) {
  return (
    <PageGuide title={t('Library se products — minton me dukaan tayyar')} onClose={onClose}
      flowTitle={t('Kaam kaise chalta hai')}
      flow={[
        { label: t('Library'), hint: pharmacy ? t('DRAP ki dawaiyan') : t('Tayyar products'), icon: BookOpen, color: '#2563eb' },
        { label: t('Chunein'), hint: t('Ek ek ya sab'), icon: CheckSquare, color: '#7c3aed' },
        { label: t('Price / Margin'), hint: pharmacy ? t('MRP − 15%') : t('Apni price'), icon: BadgeDollarSign, color: '#16a34a' },
        { label: t('Add'), hint: t('Products ban gaye'), icon: PackagePlus, color: '#ea580c' },
        { label: t('Sale'), hint: t('POS par bechein'), icon: ShoppingCart, color: '#0891b2' },
      ]}
      steps={[
        { icon: Search, color: '#2563eb', title: t('Dhoondein'), text: pharmacy ? t('Naam, formula (salt), company ya registration number likhein — "panadol 500" ya "paracetamol".') : t('Naam, brand, category ya barcode likhein.') },
        { icon: CheckSquare, color: '#7c3aed', title: t('Chunein'), text: t('Khane ke checkbox se chunein. Filter laga kar "Sab chunein" dabayein to saare results ek saath — kai hazaar bhi.') },
        ...(pharmacy ? [{ icon: Beaker, color: '#0891b2', title: t('Same formula'), text: t('Kisi dawai par "Same formula" dabayein — us salt aur strength ki har company ki dawai saamne aa jati hai. In ko add karein to POS par substitute khud milta hai.') }] : []),
        { icon: BadgeDollarSign, color: '#16a34a', title: t('Price aur margin'), text: pharmacy ? t('Sale price = MRP. Cost = MRP se aap ka margin kam (aam taur par 15%). Margin badal sakte hain.') : t('Price andaza hai — add karne se pehle ya baad me apni price check kar lein. Jis par price nahi, us ki price khane me likhein.') },
        { icon: PackagePlus, color: '#ea580c', title: t('Add karein'), text: t('Branch aur opening stock chunein (warna stock 0). Jo pehle se hai wo dobara nahi banta.') },
        { icon: ScanLine, color: '#db2777', title: t('Barcode'), text: t('Barcode scan karein to library me dhoondta hai. POS par anjaan barcode aaye to "Library me dhoondo" se cheez chun kar usi barcode ke saath add karein.') },
      ]}
      tips={[
        t('Search box me barcode scan karein — library me mil jaye to wahi cheez dikhti hai.'),
        t('"Added" wali cheez pehle se aap ke products me hai.'),
      ]}
      shortcuts={[['/', t('Search')], ['G', t('Guide')]]}
    />
  );
}
