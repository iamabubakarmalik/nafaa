/** Guide for the Products & stock page: Nafaa is the main list, channels follow it. */

import { Boxes, Download, Eye, Link2, Package, Send, Store, Upload } from 'lucide-react';
import { PageGuide } from '@core/components/PageGuide';
import { t } from '@core/i18n';

export function ProductsGuide({ onClose }: { onClose: () => void }) {
  return (
    <PageGuide title={t('Products aur Stock — Nafaa se sab control')} onClose={onClose}
      flowTitle={t('Kaam kaise chalta hai')}
      flow={[
        { label: t('Nafaa products'), hint: t('Asal list yahan'), icon: Package, color: '#2563eb' },
        { label: t('Jorein / le aayein'), hint: t('Ek click: sab'), icon: Link2, color: '#7c3aed' },
        { label: t('Stock ka hissa'), hint: t('100 → 30 · 20 · 50'), icon: Boxes, color: '#16a34a' },
        { label: t('Channels'), hint: t('Daraz, Shopify, Website'), icon: Store, color: '#ea580c' },
      ]}
      steps={[
        { icon: Download, color: '#7c3aed', title: t('Sab le aayein'), text: t('Channel card par "Sab le aayein" dabayein — jo products Nafaa me nahi, sizes ke saath ban jate hain. Hazaron hon to bhi, progress oopar dikhti hai.') },
        { icon: Link2, color: '#2563eb', title: t('Sab pakke jorein'), text: t('Jin ka SKU ya barcode Nafaa se bilkul milta hai wo ek click me jur jate hain. Sirf naam milne wale "Jorein" screen me khud dekhein.') },
        { icon: Boxes, color: '#16a34a', title: t('Stock ka hissa'), text: t('Har channel ko poora, % ya fixed Stock. Kisi product ka apna number us ke khane me. Nafaa ke Stock se zyada kabhi nahi jata.') },
        { icon: Eye, color: '#0891b2', title: t('Listed ya band'), text: t('Har khane me switch: band karein to Shopify/WooCommerce par draft, Daraz par Stock 0.') },
        { icon: Send, color: '#ea580c', title: t('Chunein aur bhejein'), text: t('Products chunein (ya "sab chunein") — Listed, Stock, Price, Sale price ya "Abhi bhejein" sab par ek saath.') },
        { icon: Upload, color: '#db2777', title: t('Channel par banayein'), text: t('Nafaa me bana product (sizes ke saath) Shopify ya WooCommerce par ek click me. Daraz par naya product Coming soon.') },
      ]}
      tips={[
        t('Har khane me aakhri push dikhta hai — masla ho to khana kholein aur "Dobara bhejein".'),
        t('Channel settings me chunein ke "Abhi bhejein" par naam, description, tasveer, SKU ya weight bhi jaye.'),
      ]}
      shortcuts={[['/', t('Search')], ['R', t('Taaza karein')], ['G', t('Guide')]]}
    />
  );
}
