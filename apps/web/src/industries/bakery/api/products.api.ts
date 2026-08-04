import { apiClient } from '@core/api/client';

export type BakeryCategory =
  | 'CAKE' | 'CUPCAKE' | 'PASTRY' | 'BREAD' | 'BUN' | 'ROLL' | 'BISCUIT' | 'COOKIE'
  | 'DONUT' | 'MUFFIN' | 'CROISSANT' | 'DANISH' | 'PATTY' | 'PUFF' | 'PIZZA'
  | 'SANDWICH' | 'BURGER' | 'TART' | 'PIE' | 'CHEESECAKE' | 'DESSERT' | 'BROWNIE'
  | 'MACARON' | 'SWEETS' | 'BARFI' | 'LADDU' | 'GULAB_JAMUN' | 'RASMALAI' | 'KHEER'
  | 'CUSTOM_CAKE' | 'WEDDING_CAKE' | 'BIRTHDAY_CAKE' | 'ANNIVERSARY_CAKE'
  | 'BEVERAGE' | 'ICE_CREAM' | 'OTHER';

export type BakerySize =
  | 'MINI' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE'
  | 'HALF_POUND' | 'ONE_POUND' | 'ONE_HALF_POUND' | 'TWO_POUND' | 'THREE_POUND' | 'FIVE_POUND'
  | 'HALF_KG' | 'ONE_KG' | 'ONE_HALF_KG' | 'TWO_KG' | 'THREE_KG' | 'FIVE_KG' | 'TEN_KG'
  | 'SLICE' | 'DOZEN' | 'HALF_DOZEN' | 'TRAY' | 'BOX' | 'CUSTOM';

export type CakeShape =
  | 'ROUND' | 'SQUARE' | 'RECTANGLE' | 'HEART' | 'OVAL'
  | 'TIER_2' | 'TIER_3' | 'TIER_4' | 'TIER_5'
  | 'NUMBER' | 'LETTER' | 'CHARACTER' | 'CUSTOM_SHAPE';

export type CakeFlavor =
  | 'VANILLA' | 'CHOCOLATE' | 'STRAWBERRY' | 'BLACK_FOREST' | 'RED_VELVET'
  | 'PINEAPPLE' | 'MANGO' | 'BUTTERSCOTCH' | 'COFFEE' | 'CARAMEL'
  | 'BLUEBERRY' | 'RASPBERRY' | 'LEMON' | 'ORANGE' | 'BANANA' | 'CARROT'
  | 'FRUIT' | 'TIRAMISU' | 'OREO' | 'KITKAT' | 'FERRERO_ROCHER' | 'NUTELLA'
  | 'CHEESECAKE' | 'ICE_CREAM' | 'MIXED' | 'CUSTOM_FLAVOR';

export type CreamType =
  | 'BUTTERCREAM' | 'WHIPPED_CREAM' | 'FRESH_CREAM' | 'GANACHE' | 'FONDANT'
  | 'CREAM_CHEESE' | 'ROYAL_ICING' | 'MERINGUE' | 'MOUSSE' | 'MIRROR_GLAZE' | 'OTHER';

export interface BakeryProduct {
  id: string;
  productId: string;
  category: BakeryCategory;
  defaultSize?: BakerySize;
  defaultShape?: CakeShape;
  defaultFlavor?: CakeFlavor;
  defaultCreamType?: CreamType;
  pricePerKg?: number;
  pricePerPound?: number;
  pricePerPiece?: number;
  pricePerDozen?: number;
  pricePerSlice?: number;
  pricePerBox?: number;
  pricePerTray?: number;
  weightGrams?: number;
  servingSize?: number;
  numberOfSlices?: number;
  isCustomizable: boolean;
  isCakeCustomizable: boolean;
  allowsMessageOnCake: boolean;
  allowsPhotoOnCake: boolean;
  allowsCustomShape: boolean;
  allowsFlavorChoice: boolean;
  allowsSizeChoice: boolean;
  prepTimeHours?: number;
  advanceOrderHours?: number;
  minOrderQty: number;
  maxOrderQty?: number;
  shelfLifeHours?: number;
  shelfLifeDays?: number;
  requiresRefrigeration: boolean;
  ingredients?: any;
  allergens: string[];
  containsEgg: boolean;
  containsNuts: boolean;
  containsGluten: boolean;
  containsDairy: boolean;
  isEggless: boolean;
  isVegan: boolean;
  isSugarFree: boolean;
  isHalal: boolean;
  dietaryBadges: string[];
  nutritionInfo?: any;
  caloriesPerServing?: number;
  imageUrls: string[];
  descriptionLong?: string;
  ingredientList?: string;
  servingSuggestions?: string;
  isPopular: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isSeasonalItem: boolean;
  seasonName?: string;
  totalOrders: number;
  totalRevenue: number;
  avgRating?: number;
  product?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const bakeryProductsApi = {
  upsert: (data: Partial<BakeryProduct>) => apiClient.post('/bakery/products', data).then(unwrap<BakeryProduct>),
  list: (params?: any) => apiClient.get('/bakery/products', { params }).then(unwrap<BakeryProduct[]>),
  byCategory: () => apiClient.get('/bakery/products/by-category').then(unwrap<Record<string, BakeryProduct[]>>),
  byProduct: (productId: string) => apiClient.get('/bakery/products/by-product/' + productId).then(unwrap<BakeryProduct | null>),
  getOne: (id: string) => apiClient.get('/bakery/products/' + id).then(unwrap<BakeryProduct>),
  remove: (id: string, force = false) =>
    apiClient.delete(`/bakery/products/${id}${force ? '?force=true' : ''}`).then(unwrap),
};
