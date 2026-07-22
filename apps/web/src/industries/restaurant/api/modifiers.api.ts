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
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const modifiersApi = {
  create: (data: Partial<ModifierGroup>) =>
    apiClient.post('/restaurant/modifiers', data).then(unwrap<ModifierGroup>),

  list: () =>
    apiClient.get('/restaurant/modifiers').then(unwrap<ModifierGroup[]>),

  getOne: (id: string) =>
    apiClient.get('/restaurant/modifiers/' + id).then(unwrap<ModifierGroup>),

  update: (id: string, data: Partial<ModifierGroup>) =>
    apiClient.patch('/restaurant/modifiers/' + id, data).then(unwrap<ModifierGroup>),

  toggle: (id: string) =>
    apiClient.post('/restaurant/modifiers/' + id + '/toggle').then(unwrap<ModifierGroup>),

  remove: (id: string) =>
    apiClient.delete('/restaurant/modifiers/' + id).then(unwrap),
};
