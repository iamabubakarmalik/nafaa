import { leopardsAdapter } from './leopards.adapter';
import { postexAdapter } from './postex.adapter';
import { CourierAdapter } from './types';

/**
 * Jin couriers ka API se "ek click" connect hai. Baqi couriers (TCS, Trax,
 * M&P…) abhi "manual" — CN khud likho, tracking link Nafaa deta hai.
 */
export const COURIER_APIS: Record<string, {
  adapter: CourierAdapter;
  /** Form ke khane */
  fields: { key: 'apiKey' | 'apiSecret'; label: string; placeholder?: string }[];
  /** Key kahan se milegi — dukandar ke liye qadam */
  portalUrl: string;
  steps: string[];
  labelKind: 'pdf' | 'link';
  autoSettlement: boolean;
}> = {
  POSTEX: {
    adapter: postexAdapter,
    fields: [{ key: 'apiKey', label: 'API token', placeholder: 'PostEx portal se copy karein' }],
    portalUrl: 'https://merchant.postex.pk',
    steps: [
      'PostEx merchant portal par login karein',
      'Settings me API / Integration wala hissa kholein (na mile to PostEx support se "API token" maangein)',
      'Token copy karke yahan paste karein — bas',
    ],
    labelKind: 'pdf',
    autoSettlement: true,
  },
  LEOPARDS: {
    adapter: leopardsAdapter,
    fields: [
      { key: 'apiKey', label: 'API key', placeholder: 'Leopards portal se' },
      { key: 'apiSecret', label: 'API password', placeholder: 'Leopards portal se' },
    ],
    portalUrl: 'https://www.leopardscourier.com',
    steps: [
      'Leopards merchant portal par login karein',
      'API wala hissa kholein (na mile to Leopards account manager se "API key aur password" maangein)',
      'API key aur API password dono copy karke yahan paste karein',
    ],
    labelKind: 'link',
    autoSettlement: false,
  },
};

export const courierApi = (code?: string | null) => (code ? COURIER_APIS[code.toUpperCase()] : undefined);
