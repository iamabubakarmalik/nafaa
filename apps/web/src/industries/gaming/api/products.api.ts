import { apiClient } from '@core/api/client';

export type GamingCategoryType =
  | 'CONSOLE_PS5' | 'CONSOLE_PS4' | 'CONSOLE_XBOX_SERIES' | 'CONSOLE_XBOX_ONE'
  | 'CONSOLE_NINTENDO_SWITCH' | 'CONSOLE_HANDHELD' | 'CONSOLE_RETRO'
  | 'GAME_DISC' | 'GAME_DIGITAL' | 'GAME_COLLECTOR_EDITION'
  | 'CONTROLLER' | 'HEADSET_GAMING' | 'KEYBOARD_GAMING' | 'MOUSE_GAMING' | 'MOUSEPAD'
  | 'CHAIR_GAMING' | 'DESK_GAMING' | 'MONITOR_GAMING'
  | 'PC_PREBUILT' | 'PC_CUSTOM_BUILD' | 'CPU' | 'GPU' | 'RAM' | 'MOTHERBOARD'
  | 'PSU' | 'STORAGE_SSD' | 'STORAGE_HDD' | 'COOLING' | 'PC_CASE' | 'RGB_ACCESSORY'
  | 'STREAMING_GEAR' | 'CAPTURE_CARD' | 'VR_HEADSET'
  | 'DIGITAL_TOPUP' | 'DIGITAL_SUBSCRIPTION' | 'GIFT_CARD' | 'MERCHANDISE' | 'OTHER';

export type GamingConditionType = 'NEW_SEALED' | 'OPEN_BOX' | 'PRE_OWNED' | 'REFURBISHED' | 'TRADE_IN';

export type GamingConsolePlatform =
  | 'PS5' | 'PS4' | 'XBOX_SERIES_X' | 'XBOX_SERIES_S' | 'XBOX_ONE'
  | 'NINTENDO_SWITCH' | 'PC' | 'STEAM_DECK' | 'MOBILE' | 'RETRO' | 'MULTI' | 'OTHER';

export interface GamingProductProfile {
  id: string;
  productId: string;
  categoryType?: GamingCategoryType;
  platform: GamingConsolePlatform;
  conditionType: GamingConditionType;

  publisher?: string;
  developer?: string;
  genre: string[];
  ageRating?: string;
  playerCount?: string;
  onlineMultiplayer: boolean;
  requiresInternet: boolean;
  gameFileSize?: string;
  releaseDate?: string;
  region?: string;
  language: string[];

  storageCapacity?: string;
  memoryRam?: string;
  processor?: string;
  graphicsCard?: string;
  displaySpec?: string;
  includedAccessories: string[];
  numberOfControllers: number;

  gpuModel?: string;
  cpuModel?: string;
  ramSpec?: string;
  formFactor?: string;
  power?: string;
  socket?: string;
  chipset?: string;

  isRentable: boolean;
  rentalPricePerHour?: number;
  rentalPricePerDay?: number;
  rentalDeposit?: number;

  mrp?: number;
  costPrice?: number;
  retailPrice?: number;
  discountedPrice?: number;
  usedPrice?: number;
  tradeInValue?: number;

  isFeatured: boolean;
  isBestSeller: boolean;
  isNewRelease: boolean;
  isPreOrder: boolean;
  preOrderReleaseDate?: string;

  totalSold: number;
  totalRented: number;
  totalRevenue: number;
  avgRating?: number;

  coverImageUrl?: string;
  trailerUrl?: string;
  screenshots: string[];
  notes?: string;

  product?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const gamingProductsApi = {
  upsert: (data: Partial<GamingProductProfile>) =>
    apiClient.post('/gaming/products', data).then(unwrap<GamingProductProfile>),

  list: (params?: {
    categoryType?: string; platform?: string; conditionType?: string;
    featured?: boolean; bestSeller?: boolean; newRelease?: boolean;
    preOrder?: boolean; rentable?: boolean; search?: string;
  }) => apiClient.get('/gaming/products', { params }).then(unwrap<GamingProductProfile[]>),

  byProduct: (productId: string) =>
    apiClient.get('/gaming/products/by-product/' + productId).then(unwrap<GamingProductProfile | null>),

  getOne: (id: string) =>
    apiClient.get('/gaming/products/' + id).then(unwrap<GamingProductProfile>),

  remove: (id: string, force = false) =>
    apiClient.delete(`/gaming/products/${id}${force ? '?force=true' : ''}`).then(unwrap),
};
