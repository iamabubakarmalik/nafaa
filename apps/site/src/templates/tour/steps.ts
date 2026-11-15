/**
 * Product tour steps: which real screenshot each step shows and the part of
 * it to highlight.
 *
 * Screenshots are the marketing media library captures (seed-marketing-cms
 * media manifest keys, already on Cloudinary); `url` is the stored delivery
 * URL, and lib/media builds the resized renditions from it. Boxes are
 * [x, y, width, height] in percent of the capture, measured on the images.
 * Update the box when a capture is replaced.
 */
import type { DeliverableMedia } from '@/lib/media';
import type { TourStepId } from '@/lib/i18n/tour';

export type Box = readonly [x: number, y: number, w: number, h: number];

interface Shot {
  key: string;
  url: string;
  width: number;
  height: number;
  /** English alt text from the media library (Urdu pages use the step title). */
  alt: string;
  /** Address shown in the browser bar ("" for phone captures). */
  address: string;
}

const SHOTS = {
  bill: {
    key: 'help-make-a-bill',
    alt: 'Nafaa POS counter with three items on the bill: product search, product tiles, the bill with Walk-in customer, Cash and print (F12) and Checkout buttons',
    url: 'https://res.cloudinary.com/dan734vj4/image/upload/v1792980462/nafaa/site/w1xszejzogbz4qcedc6z.png',
    width: 3200,
    height: 2000,
    address: 'app.nafaa.pk/pos',
  },
  checkout: {
    key: 'help-make-a-bill-2',
    alt: 'Nafaa POS checkout window: paid in full, part paid or udhaar, payment method buttons (Cash, JazzCash, Easypaisa, Card, Bank), amount received keypad and the Bill complete button',
    url: 'https://res.cloudinary.com/dan734vj4/image/upload/v1792980458/nafaa/site/pt2j5lvov3pytqcjggkc.png',
    width: 3200,
    height: 2000,
    address: 'app.nafaa.pk/pos',
  },
  udhaar: {
    key: 'help-udhaar-sale',
    alt: 'Nafaa POS checkout with Udhaar selected: the full bill goes to the customer\'s khata and the previous udhaar is shown',
    url: 'https://res.cloudinary.com/dan734vj4/image/upload/v1792980534/nafaa/site/hmzgq8vkjbvf0kig7iz5.png',
    width: 3200,
    height: 2000,
    address: 'app.nafaa.pk/pos',
  },
  khata: {
    key: 'retail-khata',
    alt: 'Nafaa digital khata: total receivable, ageing buckets and customers with pending udhaar',
    url: 'https://res.cloudinary.com/dan734vj4/image/upload/v1792516528/nafaa/site/zsnacfogjgs6kw6ltrvs.png',
    width: 3200,
    height: 2000,
    address: 'app.nafaa.pk/khata',
  },
  reminder: {
    key: 'help-whatsapp-reminders',
    alt: 'Nafaa Yaad-dihani reminder wizard: polite, firm or final tone, greeting choice and the WhatsApp message with the amount due',
    url: 'https://res.cloudinary.com/dan734vj4/image/upload/v1792980541/nafaa/site/ckvkes3h81sgzqcccny3.png',
    width: 3200,
    height: 2000,
    address: 'app.nafaa.pk/khata',
  },
  products: {
    key: 'retail-products',
    alt: 'Nafaa inventory: product cards with price, cost, margin and stock, plus stock value and low stock alerts',
    url: 'https://res.cloudinary.com/dan734vj4/image/upload/v1792516522/nafaa/site/pnwhfdxp7b7ljm2qjljq.png',
    width: 3200,
    height: 2000,
    address: 'app.nafaa.pk/products',
  },
  lowStock: {
    key: 'retail-low-stock',
    alt: 'Low stock list in Nafaa showing items that are running out and need reordering',
    url: 'https://res.cloudinary.com/dan734vj4/image/upload/v1792516526/nafaa/site/asghezzbq8xcna8xxhbx.png',
    width: 3200,
    height: 2000,
    address: 'app.nafaa.pk/low-stock',
  },
  day: {
    key: 'help-daily-sales-report',
    alt: 'Nafaa Din ka hisaab day report: net sale, money received, profit, galla, discounts, returns, udhaar and hourly sales for one day',
    url: 'https://res.cloudinary.com/dan734vj4/image/upload/v1792980440/nafaa/site/y1etfgdnusahqdevjrps.png',
    width: 3200,
    height: 2000,
    address: 'app.nafaa.pk/reports/day',
  },
  profit: {
    key: 'retail-profit-report',
    alt: 'Profit by product report in Nafaa with sale, cost, profit and margin for each item',
    url: 'https://res.cloudinary.com/dan734vj4/image/upload/v1792516532/nafaa/site/vydetjdlryj5eyredj3c.png',
    width: 3200,
    height: 2000,
    address: 'app.nafaa.pk/reports/profit',
  },
  phone: {
    key: 'retail-dashboard-phone',
    alt: 'Nafaa dashboard on an Android phone showing today\'s sale and key numbers',
    url: 'https://res.cloudinary.com/dan734vj4/image/upload/v1792516519/nafaa/site/cenqqhoq1ahtwdqn5fzp.png',
    width: 824,
    height: 1830,
    address: '',
  },
} satisfies Record<string, Shot>;

/** `focus`: the part phones zoom to when the whole box is too tall to read (defaults to the box). */
export const TOUR_STEPS: readonly { id: TourStepId; shot: Shot; box: Box; focus?: Box }[] = [
  { id: 'bill', shot: SHOTS.bill, box: [71.3, 8.6, 27, 71.8], focus: [71.3, 8.6, 27, 24] },
  { id: 'scan', shot: SHOTS.bill, box: [18.3, 15.9, 52.4, 6.4] },
  { id: 'payment', shot: SHOTS.checkout, box: [22.8, 41.6, 27.4, 15.2] },
  { id: 'udhaar', shot: SHOTS.udhaar, box: [22.6, 37.6, 27.6, 28.8] },
  { id: 'khata', shot: SHOTS.khata, box: [17.7, 8.5, 81.1, 27.2], focus: [17.7, 8.5, 40, 16] },
  { id: 'reminder', shot: SHOTS.reminder, box: [29.9, 44.6, 40.2, 32] },
  { id: 'stock', shot: SHOTS.products, box: [17.7, 30.4, 81.1, 5.9], focus: [17.7, 26, 53, 12] },
  { id: 'reorder', shot: SHOTS.lowStock, box: [64.3, 56.4, 25.4, 42.6] },
  { id: 'day', shot: SHOTS.day, box: [17.7, 8.5, 80.4, 19.2], focus: [17.7, 8.5, 46, 19.2] },
  { id: 'profit', shot: SHOTS.profit, box: [41.3, 15.6, 40.4, 7.8] },
  { id: 'phone', shot: SHOTS.phone, box: [2.6, 27.6, 94.6, 28.6], focus: [2.6, 27.6, 94.6, 28.6] },
];

/** The capture as a media row for lib/media (public id from the delivery URL). */
export function shotMedia(shot: Shot): DeliverableMedia {
  const publicId = shot.url.replace(/^.*\/upload\/(?:v\d+\/)?/, '').replace(/\.[a-z0-9]+$/i, '');
  return { publicId, url: shot.url, mimeType: 'image/png', kind: 'SCREENSHOT', width: shot.width, height: shot.height };
}
