/**
 * What Nafaa does with each sales channel, in one place. Every channel page
 * builds its "Kya kya hota hai" card from this list, and the owner's copy
 * (~/nafaa-backups/wip/channel-matrix.md) is generated from it, so the card,
 * the code and the document cannot tell different stories.
 *
 * level: yes = Nafaa does it by itself, setting = on/off or a choice in
 * Settings, partial = some of it, no = the channel's API does not allow it
 * (the note says where to do it instead), soon = possible, coming later,
 * na = does not apply to this channel.
 */

import { t } from '@core/i18n';

export type MatrixChannel = 'shopify' | 'woocommerce' | 'daraz' | 'custom' | 'indolj' | 'foodpanda' | 'manual';
export type MatrixLevel = 'yes' | 'setting' | 'partial' | 'no' | 'soon' | 'na';
export interface MatrixCell { level: MatrixLevel; note: string }
export interface MatrixRow { key: string; label: string; cells: Record<MatrixChannel, MatrixCell> }

export const MATRIX_CHANNELS: MatrixChannel[] = ['shopify', 'woocommerce', 'daraz', 'custom', 'indolj', 'foodpanda', 'manual'];

const c = (level: MatrixLevel, note: string): MatrixCell => ({ level, note });

export function channelMatrix(): MatrixRow[] {
  return [
    {
      key: 'orders_in',
      label: t('Naye orders Nafaa me'),
      cells: {
        shopify: c('yes', t('Webhook se foran. Har 30 minute chhoote orders ki check; "Sync now" pichle 3 din dekhta hai.')),
        woocommerce: c('yes', t('Webhook se foran. Har 30 minute chhoote orders ki check; "Sync now" pichle 3 din dekhta hai.')),
        daraz: c('yes', t('Har 5 minute aur Daraz ki push par. Jorte waqt pichle 3 din ke orders.')),
        custom: c('yes', t('Website API se foran — website order bhejti hai.')),
        indolj: c('yes', t('Indolj webhook se foran.')),
        foodpanda: c('yes', t('Delivery Hero se foran.')),
        manual: c('yes', t('Add order, paste ya Excel se.')),
      },
    },
    {
      key: 'status_out',
      label: t('Nafaa ka status channel par'),
      cells: {
        shopify: c('setting', t('Accept/pack par tag, dispatch par fulfillment (courier, tracking number, link), deliver par Delivered, cancel par cancel, paisa milne par Paid. Settings → Order status me badlein.')),
        woocommerce: c('setting', t('Har status par Woo status aur note; dispatch par customer ko tracking note. Settings → Order status me badlein.')),
        daraz: c('setting', t('Pack par "Ready to ship" aur cancel par Daraz cancel (wajah ke saath) — Settings → Order status me chalu karein. Shipped aur Delivered Daraz khud lagata hai.')),
        custom: c('setting', t('Status URL par har badlav (signed), apne status naam ke saath.')),
        indolj: c('no', t('Indolj par status Indolj panel se badlein.')),
        foodpanda: c('yes', t('Accept, reject aur ready Delivery Hero ko khud.')),
        manual: c('na', t('Kisi store par nahi jata.')),
      },
    },
    {
      key: 'status_in',
      label: t('Channel ka status Nafaa me'),
      cells: {
        shopify: c('setting', t('Cancel, refund aur Paid khud. Fulfilled aur Delivered ko board status se jorein.')),
        woocommerce: c('setting', t('Cancelled, refunded, failed khud. Completed ya apne statuses ko board status se jorein.')),
        daraz: c('setting', t('Shipped, delivered, returned aur cancel khud. Ready to ship ko Packed se jor sakte hain.')),
        custom: c('setting', t('Website status bheje to mapping ke mutabiq.')),
        indolj: c('partial', t('Sirf cancel.')),
        foodpanda: c('partial', t('Cancel aur pickup.')),
        manual: c('na', t('Nafaa ka apna order.')),
      },
    },
    {
      key: 'returns',
      label: t('Return / refund channel par'),
      cells: {
        shopify: c('partial', t('RTO par tag, ya fulfillment cancel + order cancel (Settings → Order status). Customer ko paisa wapas Shopify admin se — Nafaa paisa khud nahi lautata.')),
        woocommerce: c('partial', t('RTO par Failed / Refunded / Cancelled status. Paisa wapas WooCommerce admin se.')),
        daraz: c('soon', t('Return request ka accept/reject abhi Seller Center me. Wapas aaya parcel Nafaa me khud Returned.')),
        custom: c('yes', t('Returned status URL par jata hai.')),
        indolj: c('no', t('Indolj panel se.')),
        foodpanda: c('no', t('Refund Foodpanda khud karta hai.')),
        manual: c('na', t('Return Nafaa me hi.')),
      },
    },
    {
      key: 'stock',
      label: t('Stock'),
      cells: {
        shopify: c('setting', t('Har sale/purchase par 1 minute me, Shopify location par. Buffer, % ya fixed hissa.')),
        woocommerce: c('setting', t('Har sale/purchase par 1 minute me. Buffer, % ya fixed hissa.')),
        daraz: c('setting', t('Har sale/purchase par, SKU se. Buffer, % ya fixed hissa.')),
        custom: c('yes', t('Website API se khud leti hai (buffer ke baad).')),
        indolj: c('no', t('Indolj stock track nahi karta.')),
        foodpanda: c('no', t('Item band/khula Foodpanda app se.')),
        manual: c('na', t('Nafaa ka stock hi.')),
      },
    },
    {
      key: 'price',
      label: t('Price aur sale price'),
      cells: {
        shopify: c('setting', t('Price rule (+/− %, Rs, rounding) aur compare-at sale price.')),
        woocommerce: c('setting', t('Price rule aur Woo sale price.')),
        daraz: c('setting', t('Price rule; sale price Daraz SalePrice ban kar jati hai (1 saal). Purani sale hatani ho to Seller Center se.')),
        custom: c('partial', t('Nafaa price website API se; sale price website khud rakhti hai.')),
        indolj: c('no', t('Price Indolj panel se.')),
        foodpanda: c('soon', t('Menu ki price Foodpanda par.')),
        manual: c('na', t('Bill me Nafaa price.')),
      },
    },
    {
      key: 'content',
      label: t('Title, tasveer, description'),
      cells: {
        shopify: c('setting', t('Title, description, tasveerein, SKU/barcode, weight — Settings me chunein.')),
        woocommerce: c('setting', t('Title, description, tasveerein, SKU, weight — Settings me chunein.')),
        daraz: c('soon', t('Daraz category ke attributes maangta hai — Coming soon. Abhi Seller Center se.')),
        custom: c('yes', t('Website API me naam, tasveer, description sab.')),
        indolj: c('no', t('Indolj menu panel se.')),
        foodpanda: c('soon', t('Menu Foodpanda par.')),
        manual: c('na', t('—')),
      },
    },
    {
      key: 'listing',
      label: t('Listed / publish, naye products'),
      cells: {
        shopify: c('yes', t('Active/Draft, aur Nafaa se naya product Shopify par.')),
        woocommerce: c('yes', t('Publish/Draft, aur Nafaa se naya product Woo par.')),
        daraz: c('partial', t('Unlisted = stock 0. Naya product Seller Center se (category attributes).')),
        custom: c('partial', t('Unlisted = stock 0; website apni listing khud banati hai.')),
        indolj: c('no', t('Indolj panel se.')),
        foodpanda: c('no', t('Foodpanda par.')),
        manual: c('na', t('—')),
      },
    },
    {
      key: 'variants',
      label: t('Sizes / variants'),
      cells: {
        shopify: c('yes', t('Har size alag jurta hai; Nafaa ke naye sizes Shopify par ban jate hain.')),
        woocommerce: c('yes', t('Har variation alag jurti hai; naye sizes Woo par ban jate hain.')),
        daraz: c('partial', t('Har SKU alag jurta hai; naya size Seller Center se.')),
        custom: c('yes', t('Website API me har size ka stock.')),
        indolj: c('no', t('—')),
        foodpanda: c('no', t('—')),
        manual: c('na', t('—')),
      },
    },
    {
      key: 'order_edit',
      label: t('Order edit channel par'),
      cells: {
        shopify: c('yes', t('Items, qty, Discount, address aur note Shopify order par bhi.')),
        woocommerce: c('yes', t('Items, qty, address aur note Woo order par bhi.')),
        daraz: c('no', t('Daraz order Nafaa se nahi badalta — Seller Center me.')),
        custom: c('no', t('Website par khud badlein.')),
        indolj: c('no', t('Indolj panel se.')),
        foodpanda: c('no', t('Foodpanda order nahi badalta.')),
        manual: c('yes', t('Nafaa ka apna order — poora edit.')),
      },
    },
    {
      key: 'abandoned',
      label: t('Adhoore checkout (abandoned carts)'),
      cells: {
        shopify: c('yes', t('Pichle 30 din ke adhoore checkout, WhatsApp recovery link ke saath.')),
        woocommerce: c('soon', t('WooCommerce ki apni API nahi — Nafaa plugin me Coming soon.')),
        daraz: c('no', t('Daraz ye data nahi deta.')),
        custom: c('yes', t('Website "checkout.abandoned" bheje to.')),
        indolj: c('no', t('—')),
        foodpanda: c('no', t('—')),
        manual: c('na', t('—')),
      },
    },
    {
      key: 'customer',
      label: t('Customer ka data'),
      cells: {
        shopify: c('yes', t('Naam, phone, email, address.')),
        woocommerce: c('yes', t('Naam, phone, email, address.')),
        daraz: c('partial', t('Naam, phone, address — email Daraz chhupata hai.')),
        custom: c('yes', t('Jo website bheje.')),
        indolj: c('yes', t('Naam, phone, address.')),
        foodpanda: c('partial', t('Naam aur address; phone Foodpanda ka ho sakta hai.')),
        manual: c('yes', t('Jo aap likhein.')),
      },
    },
  ];
}

