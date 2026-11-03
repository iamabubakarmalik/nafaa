/**
 * Agri counter (web agri/pos/config.ts) on the shared POS: a seed, fertilizer or
 * spray whose government registration has expired cannot be sold, restricted
 * sprays remind about the license once per bill session, and the farmer on the
 * bill shows village, land, udhaar by crop season and the credit limit.
 */

import { needsGovtReg, type AgriKind } from '@nafaa/core/industries/agri';
import { msg, t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { queryClient } from '@/core/query/client';
import { toast } from '@/design';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { agriProductsApi, type AgriFacts } from './api';
import { FarmerStrip } from './components/FarmerStrip';
import { AGRI_KEYS, certText } from './meta';

const facts = () => queryClient.fetchQuery({ queryKey: [AGRI_KEYS.facts], queryFn: () => agriProductsApi.facts(), staleTime: 5 * 60_000 }).catch(() => [] as AgriFacts[]);
/** Restricted items already noted on this bill session. */
const warned = new Set<string>();
const allowOnce = new Set<string>();

export const agriPos: PosIndustryConfig = {
  ...generalPos,
  id: 'agri',
  searchHint: msg('Naam, fasal (gandum), keera (sundi), formula ya barcode…'),
  receiptFooter: 'Spray karte waqt mask aur dastane pehnein. Khula beej aur khuli dawa wapas nahi hoti.',
  CartExtra: FarmerStrip,
  beforeAdd: (productId, opts, api) => {
    if (allowOnce.delete(productId)) return 'continue';
    // Registration comes from the server's facts; offline the cached copy is used and a missing one lets the sale through.
    void (async () => {
      const f = (isOnline() ? await facts() : queryClient.getQueryData<AgriFacts[]>([AGRI_KEYS.facts]) ?? []).find((x) => x.productId === productId);
      const cert = certText(f?.govtRegExpiry);
      if (f && needsGovtReg(f.category as AgriKind) && cert.state === 'expired') {
        toast.error(t('Registration renew karwa kar product me nayi date likhein.'), { message: cert.text });
        return;
      }
      if ((f?.isRestricted || f?.requiresLicense) && !warned.has(productId)) {
        warned.add(productId);
        toast.info(t('Pabandi wali dawa hai — license / ijazat dekh kar bechein'));
      }
      allowOnce.add(productId);
      await api.addProduct(productId, opts);
    })();
    return 'handled';
  },
  // Bulk rate: the percent comes off while the line holds the bulk quantity (the farmer's total, not one add).
  repriceLine: (line) => {
    const f = queryClient.getQueryData<AgriFacts[]>([AGRI_KEYS.facts])?.find((x) => x.productId === line.productId);
    const min = Number(f?.bulkDiscountThreshold) || 0;
    const pct = Number(f?.bulkDiscountPct) || 0;
    if (!(min > 0) || !(pct > 0)) return undefined;
    return line.baseQuantity >= min ? Math.round(line.basePrice * (1 - pct / 100) * 100) / 100 : line.basePrice;
  },
};

registerPosIndustry(agriPos);
