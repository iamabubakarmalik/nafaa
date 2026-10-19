/**
 * Add-on groups (/restaurant/modifiers): sizes, extras, removals, spice and
 * cooking choices offered with a dish at the counter, and which dishes
 * carry each group.
 */

import { apiClient } from '@core/api/client';

export type ModifierType = 'ADDON' | 'VARIATION' | 'REMOVAL' | 'SPICE_LEVEL' | 'COOKING_STYLE' | 'NOTE';

export interface ModifierOption {
  id?: string;
  name: string;
  priceAdjustment?: number;
  isDefault?: boolean;
  displayOrder?: number;
  isActive?: boolean;
  emoji?: string;
}

export interface ModifierGroup {
  id: string;
  name: string;
  description?: string;
  type: ModifierType;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  isActive: boolean;
  options: ModifierOption[];
  _count?: { menuItems: number };
  /** Menu items carrying this group (list endpoint). */
  menuItems?: Array<{ menuItemId: string }>;
}

export interface ModifierGroupInput {
  name: string;
  description?: string;
  type?: ModifierType;
  isRequired?: boolean;
  minSelections?: number;
  maxSelections?: number;
  displayOrder?: number;
  isActive?: boolean;
  options: ModifierOption[];
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const modifiersApi = {
  create: (data: ModifierGroupInput) =>
    apiClient.post('/restaurant/modifiers', data).then(unwrap<ModifierGroup>),

  list: () =>
    apiClient.get('/restaurant/modifiers').then(unwrap<ModifierGroup[]>),

  getOne: (id: string) =>
    apiClient.get('/restaurant/modifiers/' + id).then(unwrap<ModifierGroup>),

  update: (id: string, data: ModifierGroupInput) =>
    apiClient.patch('/restaurant/modifiers/' + id, data).then(unwrap<ModifierGroup>),

  /** Puts the group on exactly these menu items. */
  assignDishes: (id: string, menuItemIds: string[]) =>
    apiClient.post('/restaurant/modifiers/' + id + '/dishes', { menuItemIds }).then(unwrap<{ added: number; removed: number }>),

  toggle: (id: string) =>
    apiClient.post('/restaurant/modifiers/' + id + '/toggle').then(unwrap<ModifierGroup>),

  remove: (id: string) =>
    apiClient.delete('/restaurant/modifiers/' + id).then(unwrap),
};
