import { apiClient } from '@core/api/client';

export type ApplianceCategoryType =
  | 'REFRIGERATOR' | 'DEEP_FREEZER'
  | 'AIR_CONDITIONER_SPLIT' | 'AIR_CONDITIONER_WINDOW' | 'AIR_CONDITIONER_PORTABLE' | 'AIR_CONDITIONER_INVERTER'
  | 'WASHING_MACHINE_TOP_LOAD' | 'WASHING_MACHINE_FRONT_LOAD' | 'WASHING_MACHINE_TWIN_TUB' | 'DRYER' | 'DISHWASHER'
  | 'LED_TV' | 'SMART_TV' | 'QLED_TV' | 'OLED_TV'
  | 'MICROWAVE_OVEN' | 'OTG_OVEN' | 'ELECTRIC_STOVE' | 'GAS_STOVE' | 'RANGE_HOOD'
  | 'WATER_DISPENSER' | 'WATER_PURIFIER' | 'GEYSER_ELECTRIC' | 'GEYSER_GAS'
  | 'AIR_COOLER' | 'AIR_PURIFIER' | 'ROOM_HEATER' | 'VACUUM_CLEANER' | 'CHIMNEY'
  | 'BLENDER' | 'JUICER' | 'IRON_STEAM' | 'IRON_DRY'
  | 'FAN_CEILING' | 'FAN_PEDESTAL' | 'UPS' | 'SOLAR_PANEL' | 'SOLAR_INVERTER' | 'BATTERY' | 'GENERATOR'
  | 'OTHER';

export type ApplianceEnergyRating = 'FIVE_STAR' | 'FOUR_STAR' | 'THREE_STAR' | 'TWO_STAR' | 'ONE_STAR' | 'NOT_RATED' | 'INVERTER';

export interface ApplianceProductProfile {
  id: string;
  productId: string;
  brandId?: string;
  categoryType?: ApplianceCategoryType;
  modelNumber?: string;
  modelYear?: number;
  colorName?: string;
  colorHex?: string;
  capacity?: string;
  powerConsumption?: string;
  voltage?: string;
  frequency?: string;
  weightKg?: number;
  dimensions?: string;
  energyRating?: ApplianceEnergyRating;
  bee_rating?: string;
  isEnergyStar: boolean;
  isInverter: boolean;
  acTonnage?: string;
  acType?: string;
  coolingCapacity?: string;
  heatingCapacity?: string;
  refrigerantType?: string;
  eer?: string;
  fridgeCapacityLiters?: number;
  refrigeratorType?: string;
  doorCount?: number;
  compressorType?: string;
  washingCapacityKg?: number;
  washingType?: string;
  rpm?: number;
  numberOfPrograms?: number;
  screenSizeInch?: number;
  displayType?: string;
  resolution?: string;
  refreshRate?: string;
  smartOS?: string;
  hdmiPorts?: number;
  usbPorts?: number;
  warrantyMonths: number;
  compressorWarrantyMonths?: number;
  motorWarrantyMonths?: number;
  warrantyType?: string;
  requiresInstallation: boolean;
  installationCharge: number;
  installationCovered: boolean;
  installationTimeHours?: number;
  requiresPlumbing: boolean;
  requiresGasConnection: boolean;
  requiresElectrician: boolean;
  requiresLargeVehicle: boolean;
  freeDelivery: boolean;
  deliveryChargePerKm?: number;
  features: string[];
  smartFeatures: string[];
  safetyFeatures: string[];
  boxContents: string[];
  mrp?: number;
  costPrice?: number;
  wholesalePrice?: number;
  retailPrice?: number;
  emiStartingFrom?: number;
  cashDiscount: number;
  requiresSerial: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  notes?: string;
  product?: any;
  brand?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const applianceProductsApi = {
  upsert: (data: Partial<ApplianceProductProfile>) =>
    apiClient.post('/appliances/products', data).then(unwrap<ApplianceProductProfile>),
  list: (params?: {
    brandId?: string; categoryType?: string; energyRating?: string;
    requiresInstallation?: boolean; featured?: boolean; bestSeller?: boolean;
    newArrival?: boolean; isInverter?: boolean; search?: string;
  }) => apiClient.get('/appliances/products', { params }).then(unwrap<ApplianceProductProfile[]>),
  byProduct: (productId: string) =>
    apiClient.get('/appliances/products/by-product/' + productId).then(unwrap<ApplianceProductProfile | null>),
  getOne: (id: string) =>
    apiClient.get('/appliances/products/' + id).then(unwrap<ApplianceProductProfile>),
  remove: (id: string) =>
    apiClient.delete('/appliances/products/' + id).then(unwrap),
};
