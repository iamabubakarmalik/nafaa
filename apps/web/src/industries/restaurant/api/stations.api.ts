/**
 * Kitchen stations (/restaurant/stations): grill, tandoor, bar… Each station
 * takes whole categories, so a dish's KOT goes to the station of its
 * category; dishes on no station go to the first one.
 */

import { apiClient } from '@core/api/client';

export interface KitchenStation {
  id: string;
  name: string;
  code?: string | null;
  printerName?: string | null;
  categoryIds: string[];
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StationInput {
  name?: string;
  code?: string;
  printerName?: string;
  categoryIds?: string[];
  displayOrder?: number;
  isActive?: boolean;
}

export interface StationRouting {
  stations: Array<KitchenStation & { dishes: number }>;
  categories: Array<{ id: string; name: string; color: string; stationId: string | null; dishes: number }>;
  uncategorisedDishes: number;
  fallback: { id: string; name: string } | null;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const stationsApi = {
  create: (data: StationInput & { name: string }) =>
    apiClient.post('/restaurant/stations', data).then(unwrap<KitchenStation>),

  list: () => apiClient.get('/restaurant/stations').then(unwrap<KitchenStation[]>),

  routing: () => apiClient.get('/restaurant/stations/routing').then(unwrap<StationRouting>),

  update: (id: string, data: StationInput) =>
    apiClient.patch('/restaurant/stations/' + id, data).then(unwrap<KitchenStation>),

  remove: (id: string) => apiClient.delete('/restaurant/stations/' + id).then(unwrap),
};
