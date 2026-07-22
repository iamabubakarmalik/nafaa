import { apiClient } from '@core/api/client';

export type StationeryCategory = 'PEN_BALLPOINT' | 'PEN_GEL' | 'PEN_FOUNTAIN' | 'PEN_MARKER'
  | 'PENCIL_HB' | 'PENCIL_COLOR' | 'PENCIL_MECHANICAL' | 'HIGHLIGHTER' | 'CRAYON' | 'CHALK'
  | 'NOTEBOOK' | 'REGISTER' | 'DIARY' | 'SKETCHBOOK' | 'PAD' | 'LOOSE_PAPER' | 'GRAPH_PAPER'
  | 'ENVELOPE' | 'LETTER_HEAD' | 'CHART_PAPER' | 'CARD_PAPER' | 'STICKY_NOTES' | 'ERASER'
  | 'SHARPENER' | 'RULER' | 'SCALE' | 'COMPASS' | 'PROTRACTOR' | 'DIVIDER' | 'GEOMETRY_BOX'
  | 'CALCULATOR' | 'SCISSORS' | 'STAPLER' | 'PUNCHER' | 'CLIPBOARD' | 'GLUE' | 'GUM' | 'TAPE'
  | 'DOUBLE_TAPE' | 'MASKING_TAPE' | 'FILE_FOLDER' | 'BINDER' | 'ENVELOPE_FILE' | 'BOX_FILE'
  | 'ARCH_FILE' | 'CLIP' | 'PAPER_CLIP' | 'STAMP_PAD' | 'STAMP' | 'MARKER_PERMANENT'
  | 'MARKER_WHITEBOARD' | 'WHITEBOARD' | 'DUSTER' | 'PAPER_TRAY' | 'SCHOOL_BAG' | 'LUNCH_BOX'
  | 'WATER_BOTTLE' | 'PENCIL_POUCH' | 'BOOK_COVER' | 'BOOK_MARK' | 'BADGE' | 'ID_CARD_HOLDER' | 'OTHER';

export interface StationeryProfile {
  id: string;
  productId: string;
  category: StationeryCategory;
  subCategory?: string;
  brand?: string;
  color?: string;
  size?: string;
  weight?: number;
  dimensions?: string;
  material?: string;
  packSize?: number;
  packUnit?: string;
  itemsPerPack?: number;
  isFastMoving: boolean;
  isSchoolItem: boolean;
  isOfficeItem: boolean;
  reorderLevel: number;
  totalSold: number;
  product?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const stationeryProfilesApi = {
  upsert: (data: any) => apiClient.post('/bookstore/stationery-profiles', data).then(unwrap<StationeryProfile>),
  list: (params?: any) => apiClient.get('/bookstore/stationery-profiles', { params }).then(unwrap<StationeryProfile[]>),
  byProduct: (productId: string) => apiClient.get('/bookstore/stationery-profiles/by-product/' + productId).then(unwrap<StationeryProfile | null>),
  remove: (id: string) => apiClient.delete('/bookstore/stationery-profiles/' + id).then(unwrap),
};
