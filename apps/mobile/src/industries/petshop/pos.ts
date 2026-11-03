/**
 * Pet shop counter (web petshop/pos/config.ts) on the shared POS: live
 * animals sit on their own "Janwar" tab; adding one puts the animal's
 * catalogue line (stock 1) on the bill, and after the bill is saved the
 * animal is marked sold. Animals need the server. Expired medicine warns.
 */

import { queryClient } from '@/core/query/client';
import { msg, t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { confirm } from '@/design';
import { PawPrint } from 'lucide-react-native';
import { expiryDays } from '@nafaa/core/industries/petshop';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { useBill } from '@/modules/pos/engine/bill';
import { todayKey } from '../_shared/deskKit';
import { petProductsApi, type PetProfile } from './api';
import { animalLines, markAnimalsSold } from './animalBill';
import { AnimalBillRetry, AnimalPicker } from './components/AnimalPicker';
import { PET_KEYS } from './meta';

const profiles = () => queryClient.fetchQuery({ queryKey: [PET_KEYS.profiles], queryFn: () => petProductsApi.list(), staleTime: 60_000 }).catch(() => [] as PetProfile[]);
const allowOnce = new Set<string>();

export const petshopPos: PosIndustryConfig = {
  ...generalPos,
  id: 'petshop',
  searchHint: msg('Khana, dawai, brand ya janwar (Persian, tota)…'),
  receiptFooter: 'Janwar ki vaccine ka record sambhal kar rakhein.',
  extraView: { label: msg('Janwar'), icon: PawPrint, Component: AnimalPicker },
  CartExtra: AnimalBillRetry,
  hideProduct: (p) => p.productType === 'PET_ANIMAL' || /^PET-/.test(p.sku ?? ''),
  beforeAdd: (productId, opts, api) => {
    if (allowOnce.delete(productId) || animalLines.has(productId)) return 'continue';
    void (async () => {
      const p = (await profiles()).find((x) => x.productId === productId);
      const left = expiryDays(p?.expiryDate, todayKey());
      if (left !== null && left < 0) {
        const ok = await confirm({ title: t('Ye dawai expire ho chuki hai'), message: t('Check kar lein, expire cheez na bike.'), confirmLabel: t('Phir bhi bechein'), tone: 'danger' });
        if (!ok) return;
      }
      allowOnce.add(productId);
      await api.addProduct(productId, opts);
    })();
    return 'handled';
  },
  beforeCheckout: () => {
    const hasAnimal = useBill.getState().lines.some((l) => l.productId && animalLines.has(l.productId));
    return hasAnimal && !isOnline() ? t('Janwar ke bill ke liye internet chahiye') : null;
  },
  afterSale: (sale) => {
    if (!animalLines.size) return;
    const sold = sale.productIds.some((id) => animalLines.has(id));
    animalLines.clear();
    if (sold) void markAnimalsSold(sale.id, sale.saleNumber);
  },
};

registerPosIndustry(petshopPos);
