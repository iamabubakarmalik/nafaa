/**
 * Platform default appearance (apps/api/src/modules/appearance).
 * Applies to every business and user that has not chosen their own.
 */

import { apiClient } from './client';

export type PlatformAppearance = Partial<{
  mode: 'light' | 'dark' | 'system';
  brandColor: string;
  canvasTone: 'soft' | 'white' | 'warm' | 'cool' | 'tinted';
  sidebarStyle: 'light' | 'dark' | 'brand';
  latinFont: string;
  urduFont: string;
  textScale: 'sm' | 'md' | 'lg' | 'xl';
  density: 'comfortable' | 'compact';
  radius: 'sharp' | 'default' | 'round';
  reduceMotion: boolean;
  contrast: 'normal' | 'high';
  heroStyle: 'modern' | 'simple' | 'soft' | 'dark' | 'aurora' | 'outline';
  heroPattern: 'dots' | 'grid' | 'lines' | 'none';
  heroSize: 'comfortable' | 'compact';
  heroStats: 'inline' | 'cards';
}>;

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminAppearanceApi = {
  get: () => apiClient.get<{ data: PlatformAppearance | null }>('/admin/appearance/platform').then(unwrap),
  save: (layer: PlatformAppearance) => apiClient.put<{ data: PlatformAppearance }>('/admin/appearance/platform', layer).then(unwrap),
};
