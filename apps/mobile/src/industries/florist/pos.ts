/**
 * Florist counter (web florist/pos/config.ts) on the shared POS: a bill can
 * carry a delivery or event order (recipient, card, day, slot); after the bill
 * is saved the order is written from it. Delivery orders need the server.
 * A wilted flower warns before it goes on the bill.
 */

import { toOrderBody, freshState } from '@nafaa/core/industries/florist';
import { queryClient } from '@/core/query/client';
import { msg, t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { confirm, toast } from '@/design';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { errorText, todayKey, waitServerSaleId } from '../_shared/deskKit';
import { floristOrdersApi, floristProductsApi, type FloristProfile } from './api';
import { DeliveryCard } from './components/DeliveryCard';
import { deliveryStore, draftProblemTexts } from './deliveryDraft';
import { FLORIST_KEYS, refreshFlorist } from './meta';

const profiles = () => queryClient.fetchQuery({ queryKey: [FLORIST_KEYS.profiles], queryFn: () => floristProductsApi.list(), staleTime: 60_000 }).catch(() => [] as FloristProfile[]);
const allowOnce = new Set<string>();

export const floristPos: PosIndustryConfig = {
  ...generalPos,
  id: 'florist',
  searchHint: msg('Phool, bouquet, rang ya mauqa (birthday, shaadi)…'),
  receiptFooter: 'Phoolon ko thande paani me rakhein aur roz paani badlein.',
  CartExtra: DeliveryCard,
  beforeAdd: (productId, opts, api) => {
    if (allowOnce.delete(productId)) return 'continue';
    void (async () => {
      const p = (await profiles()).find((x) => x.productId === productId);
      if (freshState(p?.freshUntil, todayKey()) === 'wilted') {
        const ok = await confirm({ title: t('Ye phool murjha chuka hai'), message: t('Check kar ke dein.'), confirmLabel: t('Phir bhi bechein'), tone: 'danger' });
        if (!ok) return;
      }
      allowOnce.add(productId);
      await api.addProduct(productId, opts);
    })();
    return 'handled';
  },
  beforeCheckout: () => {
    const { draft } = deliveryStore.get();
    if (!draft) return null;
    const problems = draftProblemTexts(draft);
    if (problems.length) return t('Delivery: {{value}}', { value: problems[0] });
    if (!isOnline()) return t('Delivery order ke liye internet chahiye — delivery hata kar bill banayein');
    return null;
  },
  afterSale: (sale) => {
    const { draft } = deliveryStore.get();
    if (!draft) return;
    deliveryStore.set({ draft: null });
    void (async () => {
      try {
        const id = (await waitServerSaleId(sale.id)) ?? sale.id;
        const o = await floristOrdersApi.fromSale(toOrderBody(id, draft));
        refreshFlorist([FLORIST_KEYS.orders]);
        toast.success(t('Delivery order {{orderNumber}} ban gaya', { orderNumber: o.orderNumber }));
      } catch (e) {
        deliveryStore.set({ failed: { saleId: sale.id, saleNumber: sale.saleNumber, draft } });
        toast.error(errorText(e, t('Bill ban gaya magar delivery order nahi bana — cart me "Dobara" dabayein')));
      }
    })();
  },
};

registerPosIndustry(floristPos);
