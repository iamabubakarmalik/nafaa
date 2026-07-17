import { apiClient } from '@/api/client';

export type ArtSupplyCategory = 'CANVAS_ROLL' | 'CANVAS_STRETCHED' | 'CANVAS_PANEL' | 'DRAWING_PAPER'
  | 'WATERCOLOR_PAPER' | 'ACRYLIC_PAPER' | 'OIL_PAPER' | 'SKETCH_PAPER' | 'PASTEL_PAPER'
  | 'ACRYLIC_PAINT' | 'OIL_PAINT' | 'WATERCOLOR_PAINT' | 'POSTER_PAINT' | 'FABRIC_PAINT'
  | 'GLASS_PAINT' | 'GOUACHE' | 'TEMPERA' | 'SPRAY_PAINT' | 'ENAMEL_PAINT' | 'BRUSH_FLAT'
  | 'BRUSH_ROUND' | 'BRUSH_FILBERT' | 'BRUSH_FAN' | 'BRUSH_LINER' | 'BRUSH_SET' | 'PALETTE_KNIFE'
  | 'CHARCOAL' | 'PASTEL_OIL' | 'PASTEL_CHALK' | 'PASTEL_SOFT' | 'GRAPHITE' | 'CONTE'
  | 'INK_DRAWING' | 'CALLIGRAPHY_INK' | 'ACRYLIC_MEDIUM' | 'OIL_MEDIUM' | 'LINSEED_OIL'
  | 'TURPENTINE' | 'GESSO' | 'VARNISH' | 'EASEL' | 'PALETTE' | 'CANVAS_STRETCHER' | 'MAHL_STICK'
  | 'ORIGAMI_PAPER' | 'CARDBOARD' | 'FOAM_SHEET' | 'GLITTER' | 'BEADS' | 'RIBBON' | 'CLAY'
  | 'MODELING_CLAY' | 'POLYMER_CLAY' | 'PLASTER' | 'CALLIGRAPHY_PEN' | 'QALAM' | 'DAWAT'
  | 'CALLIGRAPHY_INK_BLACK' | 'OTHER';

export interface ArtSupplyProfile {
  id: string;
  productId: string;
  category: ArtSupplyCategory;
  subCategory?: string;
  brand?: string;
  color?: string;
  colorCode?: string;
  size?: string;
  grade?: string;
  weight?: number;
  volume?: string;
  dimensions?: string;
  suitableFor: string[];
  isProfessional: boolean;
  isBeginner: boolean;
  reorderLevel: number;
  totalSold: number;
  product?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const artSupplyProfilesApi = {
  upsert: (data: any) => apiClient.post('/bookstore/art-supply-profiles', data).then(unwrap<ArtSupplyProfile>),
  list: (params?: any) => apiClient.get('/bookstore/art-supply-profiles', { params }).then(unwrap<ArtSupplyProfile[]>),
  byProduct: (productId: string) => apiClient.get('/bookstore/art-supply-profiles/by-product/' + productId).then(unwrap<ArtSupplyProfile | null>),
  remove: (id: string) => apiClient.delete('/bookstore/art-supply-profiles/' + id).then(unwrap),
};
