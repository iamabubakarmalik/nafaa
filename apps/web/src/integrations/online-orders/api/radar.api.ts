/** Product Radar and international selling (custom storefront). */

import { apiClient } from '@core/api/client';
import { unwrap } from './online-orders.api';

export interface RadarRow {
  productId: string; name: string; sku: string | null; image: string | null;
  trend: 'rising' | 'falling' | 'new' | 'stopped' | 'steady';
  recent: number; prior: number; delta: number; changePct: number | null; revenue: number; stock: number; waiting: number;
  channels: Array<{ name: string; units: number }>; margin: number | null;
}
export interface MarginOpportunity {
  kind: 'raise_price' | 'push' | 'loss'; productId: string; name: string; price: number; cost: number; marginPct: number;
  units: number; stock: number; suggestedPrice: number | null; gain: number;
}
export interface BundleIdea {
  a: string; b: string; aName: string; bName: string; together: number; lift: number; confidence: number;
  regularPrice: number; bundlePrice: number; discountPct: number; marginPct: number | null;
}
export interface RadarData {
  days: number; generatedAt: string; seesCost: boolean; bills: number;
  summary: { rising: number; newItems: number; falling: number; stopped: number; opportunities: number; bundles: number };
  rising: RadarRow[]; falling: RadarRow[];
  margin: { medianMargin: number; list: MarginOpportunity[] } | null;
  bundles: BundleIdea[];
}

export interface IntlCurrency { code: string; rate: number; decimals: number }
export interface IntlCountry { code: string; name: string; currency: string; shippingFee: number; freeAbove: number | null }
export interface IntlSettings {
  enabled: boolean; currencies: IntlCurrency[]; countries: IntlCountry[]; defaultCountry: string | null;
  priceCounts: Record<string, number>; products: { total: number; blocked: number };
}
export interface IntlPriceLine { variantId: string | null; name: string | null; pricePkr: number; listPrice: number | null; shown: number }
export interface IntlPriceProduct { id: string; name: string; sku: string | null; image: string | null; shipsAbroad: boolean; lines: IntlPriceLine[] }
export interface IntlPriceList { country: IntlCountry; currency: IntlCurrency; page: number; pages: number; total: number; products: IntlPriceProduct[] }

export const radarApi = {
  radar: (q: { days?: number; integrationId?: string }) => apiClient.get('/online-orders/radar', { params: q }).then((r) => unwrap<RadarData>(r)),
  intl: (channelId: string) => apiClient.get(`/online-orders/international/${channelId}`).then((r) => unwrap<IntlSettings>(r)),
  saveIntl: (channelId: string, body: Partial<Pick<IntlSettings, 'enabled' | 'currencies' | 'countries' | 'defaultCountry'>>) =>
    apiClient.put(`/online-orders/international/${channelId}`, body).then((r) => unwrap<IntlSettings>(r)),
  intlPrices: (channelId: string, q: { country: string; search?: string; page?: number }) =>
    apiClient.get(`/online-orders/international/${channelId}/prices`, { params: q }).then((r) => unwrap<IntlPriceList>(r)),
  saveIntlPrices: (channelId: string, country: string, rows: Array<{ productId: string; variantId: string | null; price: number }>) =>
    apiClient.put(`/online-orders/international/${channelId}/prices/${country}`, { rows }).then((r) => unwrap<{ saved: number }>(r)),
  shipsAbroad: (ids: string[], value: boolean) =>
    apiClient.put('/online-orders/international/ships-abroad', { ids, value }).then((r) => unwrap<{ updated: number }>(r)),
};
