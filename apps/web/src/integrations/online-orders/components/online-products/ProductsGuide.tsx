/** Guide for the Products & stock page: Nafaa is the main list, channels follow it. */

import { BadgeDollarSign, Boxes, Download, Eye, Link2, MousePointerClick, Package, Send, Store, Upload } from 'lucide-react';
import { PageGuide } from '@core/components/PageGuide';
import { t } from '@core/i18n';

export function ProductsGuide({ onClose }: { onClose: () => void }) {
  return (
    <PageGuide title={t('Products aur Stock — Nafaa se sab control')} onClose={onClose}
      flowTitle={t('Kaam kaise chalta hai')}
      flow={[
        { label: t('Nafaa products'), hint: t('Asal list yahan'), icon: Package, color: '#2563eb' },
        { label: t('Link'), hint: t('SKU ya naam se'), icon: Link2, color: '#7c3aed' },
        { label: t('Price / Stock rule'), hint: t('+10% · 100 → 30'), icon: BadgeDollarSign, color: '#16a34a' },
        { label: t('Channels'), hint: t('Daraz, Shopify, Website'), icon: Store, color: '#ea580c' },
      ]}
      steps={[
        { icon: Download, color: '#7c3aed', title: t('Sab le aayein'), text: t('Oopar "Import / Link" ya channel ke ⋯ se "Sab le aayein" — jo products Nafaa me nahi, sizes ke saath ban jate hain. Progress "Activity" me dikhti hai.') },
        { icon: Link2, color: '#2563eb', title: t('Sab pakke jorein'), text: t('Jin ka SKU ya barcode Nafaa se bilkul milta hai wo ek click me jur jate hain. Sirf naam milne wale "Jorein" screen me khud dekhein.') },
        { icon: Boxes, color: '#16a34a', title: t('Stock ka hissa'), text: t('Har channel ko poora, % ya fixed Stock. Kisi product ka apna number us ke khane me. Nafaa ke Stock se zyada kabhi nahi jata.') },
        { icon: Eye, color: '#0891b2', title: t('Listed ya band'), text: t('Har khane me switch: band karein to Shopify/WooCommerce par draft, Daraz par Stock 0.') },
        { icon: MousePointerClick, color: '#0f766e', title: t('Seedha badlein'), text: t('Khane me Price ya Stock par click karein, number likh kar Enter. Product par click karein to har channel ki poori settings khulti hain.') },
        { icon: Send, color: '#ea580c', title: t('Chunein aur bhejein'), text: t('Products chunein (ya "sab chunein") — Listed, Stock, Price, Sale price ya "Abhi bhejein" sab par ek saath.') },
        { icon: Upload, color: '#db2777', title: t('Channel par banayein'), text: t('Nafaa me bana product (sizes ke saath) Shopify ya WooCommerce par ek click me. Daraz par naya product Coming soon.') },
      ]}
      tips={[
        t('Laal nuqta = nahi gaya. Product kholein ya oopar "Theek karein" se masle wajah ke hisaab se dekhein.'),
        t('Channel chip dabayein to sirf us channel ke products; dobara dabayein to sab.'),
        t('Channel settings me chunein ke "Abhi bhejein" par naam, description, tasveer, SKU ya weight bhi jaye.'),
      ]}
      shortcuts={[['/', t('Search')], ['↑ ↓', t('Rows')], ['Enter', t('Product kholein')], ['R', t('Taaza karein')], ['G', t('Guide')]]}
    />
  );
}
