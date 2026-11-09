/**
 * Sends the customer their portal link on WhatsApp (wa.me): order, tracking,
 * bill and return/exchange requests, without a login.
 */

import { toast } from 'sonner';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../api/online-orders.api';
import { waNumber } from '../lib/labels';
import { portalAdmin } from './api';

export function usePortalLink() {
  return async (orderId: string, kind: 'ORDER' | 'CUSTOMER' = 'ORDER', shopName?: string) => {
    // Open the tab first so the browser does not block it as a popup.
    const tab = window.open('', '_blank');
    try {
      const r = await portalAdmin.link(orderId, kind);
      const text = kind === 'CUSTOMER'
        ? t('Assalam o Alaikum {{name}}! {{shop}} se aap ke sab orders, tracking aur wapsi/exchange yahan: {{url}}', { name: r.name, shop: shopName ?? '', url: r.url })
        : t('Assalam o Alaikum {{name}}! Order #{{no}} ka haal, bill aur wapsi/exchange yahan: {{url}}', { name: r.name, no: r.no, url: r.url });
      const wa = waNumber(r.phone);
      const href = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(text)}` : null;
      if (href && tab) tab.location.href = href;
      else {
        tab?.close();
        await navigator.clipboard?.writeText(r.url).catch(() => null);
        toast.success(t('Link copy ho gaya'));
      }
    } catch (e) {
      tab?.close();
      toast.error(apiErrorMessage(e));
    }
  };
}
