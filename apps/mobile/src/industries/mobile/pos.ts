/**
 * Mobile shop counter (web mobile/pos/config.ts) on the shared POS. A phone
 * model opens the list of its in-stock IMEIs in this branch, and scanning an
 * IMEI puts that exact phone on the bill. Used phones and repaired phones
 * waiting to go back sit on the "Used / Repairs" tab, accessories sell like
 * any product (offline too). A phone line is checked on the server when sold,
 * so such a bill needs internet. After a phone is sold on udhaar to a named
 * customer the counter offers a qist plan.
 */

import { useQuery } from '@tanstack/react-query';
import { Recycle } from 'lucide-react-native';
import { useMemo } from 'react';
import { msg, t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { offline } from '@/core/offline';
import { queryClient } from '@/core/query/client';
import { toast } from '@/design';
import { generalPos, registerPosIndustry, type PosIndustryConfig, type PosTradeIn } from '@/modules/pos/engine/industry';
import { useBill } from '@/modules/pos/engine/bill';
import { mobilePosApi, repairsApi, usedPhonesApi } from './api';
import { CounterNotes, MobileOverlay, UsedRepairTab, addPhone, addUsedPhone, setMobilePos } from './components/PosPieces';

const allowOnce = new Set<string>();

const needInternet = (what: string) => {
  if (isOnline()) return false;
  toast.error(t('Internet nahi — {{what}} sirf online hota hai. Accessories offline bik sakti hain.', { what }));
  return true;
};

/** Exchange phones taken in and not yet on a bill; offered as a Trade-in payment (online only). */
function useMobileTradeIns(): PosTradeIn[] {
  const { data } = useQuery({ queryKey: ['used-phones', 'trade-ins-open'], queryFn: usedPhonesApi.openTradeIns, staleTime: 30_000, enabled: isOnline() });
  return useMemo(() => (data ?? []).map((p) => ({
    code: p.usedPhoneCode,
    label: [`${p.brand} ${p.model}`, p.storage, p.fromCustomerName].filter(Boolean).join(' · '),
    value: Number(p.buybackPrice) || 0,
  })), [data]);
}

export const mobilePos: PosIndustryConfig = {
  ...generalPos,
  id: 'mobile',
  searchHint: msg('Model, accessory — ya IMEI / barcode scan karein'),
  receiptFooter: 'Warranty ke liye ye bill aur dabba sambhaal kar rakhein. Paani ya tootne ka nuqsan warranty me nahi.',
  CartExtra: CounterNotes,
  useTradeIns: useMobileTradeIns,
  afterSale: () => { void queryClient.invalidateQueries({ queryKey: ['used-phones'] }); },
  Overlay: MobileOverlay,
  extraView: { label: msg('Used / Repairs'), icon: Recycle, Component: UsedRepairTab },
  // A phone line is checked on the server when sold, so such a bill is never queued offline.
  beforeCheckout: () => (!isOnline() && useBill.getState().lines.some((l) => l.imeiId || l.usedPhoneId) ? t('Internet nahi — phone wala bill online hi banta hai') : null),
  beforeAdd: (productId, opts, api) => {
    if (opts.imei) return 'continue';
    if (allowOnce.delete(productId)) return 'continue';
    void (async () => {
      const product = await offline.products.get(productId, api.shopId).catch(() => null);
      const go = async () => { allowOnce.add(productId); const ok = await api.addProduct(productId, opts); if (!ok) allowOnce.delete(productId); };
      if (product?.productType !== 'PHONE') { await go(); return; }
      if (needInternet(t('naya phone (IMEI) bechna'))) return;
      setMobilePos({ imei: { productId, name: product.name, opts } });
    })();
    return 'handled';
  },
  scan: async (code, api) => {
    const c = code.trim();
    if (c.length < 5) return false;
    const digitsOnly = /^\d{8,15}$/.test(c);
    if (!digitsOnly && !/^(REP|UP)/i.test(c)) return false;
    if (!isOnline()) return false;
    try {
      const cat = await mobilePosApi.catalog({ shopId: api.shopId ?? undefined, search: c });
      const phone = cat.phones.find((p) => p.imei1 === c || p.imei2 === c);
      if (phone) { await addPhone(phone.productId, phone, (id, o) => api.addProduct(id, o)); return true; }
      const used = cat.usedPhones.find((u) => u.imei1 === c || u.imei2 === c || u.usedPhoneCode.toLowerCase() === c.toLowerCase());
      if (used) { addUsedPhone(used); return true; }
      const jobs = await repairsApi.list({ view: 'handover', shopId: api.shopId ?? undefined, search: c, limit: 5 });
      const job = jobs.items.find((r) => r.ticketNumber.toLowerCase() === c.toLowerCase() || r.imei1 === c);
      if (job) { setMobilePos({ repair: job }); return true; }
    } catch { /* not a phone code; the shared scan goes on */ }
    return false;
  },
};

registerPosIndustry(mobilePos);
