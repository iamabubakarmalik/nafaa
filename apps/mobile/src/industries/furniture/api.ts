/** Furniture endpoints (same paths and shapes as apps/web/src/industries/furniture/api): custom orders, deliveries, carpenters, product profiles and the dashboard overview. */
import { apiClient } from '@/core/api/client';

const unwrap = <T,>(res: { data?: { data?: unknown } }): T => (res.data?.data ?? res.data) as T;

// carpenters.api.ts
export interface CarpenterPayment { id: string; expenseNumber: string; title: string; description?: string | null; amount: number; paymentMethod: string; createdAt: string }

export interface FurnitureCarpenter {
  id: string;
  employeeCode: string;
  name: string;
  phone: string;
  cnic?: string;
  address?: string;
  specializations: string[];
  materialsExpertise: string[];
  experienceYears?: number;
  workshopLocation?: string;
  workingDays: number[];
  workStartTime: string;
  workEndTime: string;
  dailyWage?: number;
  perProjectRate?: number;
  commissionPct: number;
  totalProjects: number;
  completedProjects: number;
  activeProjects: number;
  totalRevenue: number;
  avgRating?: number;
  isActive: boolean;
  photoUrl?: string;
  notes?: string;
  activeOrders?: FurnitureCustomOrder[];
  recentCompleted?: FurnitureCustomOrder[];
  payments?: CarpenterPayment[];
  paidThisMonth?: number;
  createdAt: string;
  updatedAt: string;
}

export type CarpenterInput = Pick<FurnitureCarpenter, 'employeeCode' | 'name' | 'phone'> & Partial<Pick<FurnitureCarpenter,
  'cnic' | 'address' | 'specializations' | 'experienceYears' | 'workshopLocation' | 'dailyWage' | 'perProjectRate' | 'commissionPct' | 'isActive' | 'notes'>>;

export const carpentersApi = {
  create: (data: CarpenterInput) =>
    apiClient.post('/furniture/carpenters', data).then(unwrap<FurnitureCarpenter>),

  list: (params?: { active?: boolean; search?: string }) =>
    apiClient.get('/furniture/carpenters', { params }).then(unwrap<FurnitureCarpenter[]>),

  getOne: (id: string) => apiClient.get('/furniture/carpenters/' + id).then(unwrap<FurnitureCarpenter>),

  update: (id: string, data: CarpenterInput) =>
    apiClient.patch('/furniture/carpenters/' + id, data).then(unwrap<FurnitureCarpenter>),

  pay: (id: string, data: { amount: number; paymentMethod: string; orderId?: string; note?: string }) =>
    apiClient.post('/furniture/carpenters/' + id + '/pay', data).then(unwrap<{ id: string; expenseNumber: string; amount: number }>),

  /** Switches the karigar off (nothing is deleted). */
  deactivate: (id: string) => apiClient.delete('/furniture/carpenters/' + id).then(unwrap<FurnitureCarpenter>),
};

// custom-orders.api.ts
export type FurnitureOrderStatus =
  | 'QUOTATION' | 'DEPOSIT_PAID' | 'IN_PRODUCTION' | 'READY_FOR_DELIVERY'
  | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'ASSEMBLED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';

export interface FurnitureCustomOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerCnic?: string;
  productType: string;
  description: string;
  categoryType?: string;
  material?: string;
  woodType?: string;
  colorRequested?: string;
  polishRequested?: string;
  upholsteryFabric?: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  customDimensions?: string;
  sketchUrls: string[];
  referenceImages: string[];
  designNotes?: string;
  quotedPrice: number;
  finalPrice?: number;
  depositAmount: number;
  depositPaid: boolean;
  balanceAmount: number;
  totalPaid: number;
  estimatedDays: number;
  quotationDate: string;
  approvedDate?: string;
  productionStartDate?: string;
  productionEndDate?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  status: FurnitureOrderStatus;
  carpenterId?: string;
  carpenterName?: string;
  workshopLocation?: string;
  progressPct: number;
  progressPhotos: string[];
  progressUpdates?: Array<{ at: string; pct: number; note?: string }> | null;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryArea?: string;
  requiresInstallation: boolean;
  installationCharge?: number;
  warrantyMonths: number;
  cancellationReason?: string;
  cancelledAt?: string;
  refundAmount: number;
  notes?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
  /** Bill made when the furniture left the shop. */
  sale?: { id: string; saleNumber: string; total: number; creditAmount: number } | null;
}

export interface OrderSummary {
  quotation: number; deposit: number; production: number; ready: number; delivered: number; completed: number; cancelled: number; late: number;
  totalReceivable: number; totalCollected: number;
}
export interface OrderPage { items: FurnitureCustomOrder[]; total: number; page: number; limit: number }
export type OrderInput = Partial<Pick<FurnitureCustomOrder,
  'customerId' | 'customerName' | 'customerPhone' | 'customerAddress' | 'customerCnic' | 'productType' | 'description' | 'categoryType' | 'material'
  | 'woodType' | 'colorRequested' | 'polishRequested' | 'upholsteryFabric' | 'lengthCm' | 'widthCm' | 'heightCm' | 'customDimensions'
  | 'sketchUrls' | 'referenceImages' | 'designNotes' | 'quotedPrice' | 'depositAmount' | 'estimatedDays' | 'carpenterId' | 'workshopLocation'
  | 'deliveryAddress' | 'deliveryCity' | 'deliveryArea' | 'requiresInstallation' | 'installationCharge' | 'warrantyMonths' | 'notes'>>;

export const customOrdersApi = {
  create: (data: OrderInput) =>
    apiClient.post('/furniture/custom-orders', data).then(unwrap<FurnitureCustomOrder>),

  page: (params: { status?: string; carpenterId?: string; from?: string; to?: string; search?: string; page: number; limit: number }) =>
    apiClient.get('/furniture/custom-orders', { params }).then(unwrap<OrderPage>),

  summary: () => apiClient.get('/furniture/custom-orders/summary').then(unwrap<OrderSummary>),

  getOne: (id: string) => apiClient.get('/furniture/custom-orders/' + id).then(unwrap<FurnitureCustomOrder>),

  approve: (id: string, finalPrice?: number) =>
    apiClient.post('/furniture/custom-orders/' + id + '/approve', { finalPrice }).then(unwrap<FurnitureCustomOrder>),

  recordPayment: (id: string, data: { amount: number; paymentMethod?: string; isDeposit?: boolean; reference?: string }) =>
    apiClient.post('/furniture/custom-orders/' + id + '/payment', data).then(unwrap<FurnitureCustomOrder>),

  assignCarpenter: (id: string, carpenterId: string, workshopLocation?: string) =>
    apiClient.post('/furniture/custom-orders/' + id + '/assign-carpenter', { carpenterId, workshopLocation }).then(unwrap<FurnitureCustomOrder>),

  update: (id: string, data: OrderInput) =>
    apiClient.patch('/furniture/custom-orders/' + id, data).then(unwrap<FurnitureCustomOrder>),
  updateProgress: (id: string, data: { progressPct: number; progressPhotos?: string[]; updateNote?: string }) =>
    apiClient.post('/furniture/custom-orders/' + id + '/progress', data).then(unwrap<FurnitureCustomOrder>),

  updateStatus: (id: string, data: { status: FurnitureOrderStatus; cancellationReason?: string; notes?: string }) =>
    apiClient.patch('/furniture/custom-orders/' + id + '/status', data).then(unwrap<FurnitureCustomOrder>),
};

// dashboard.api.ts
export const furnitureDashboardApi = {
  overview: () => apiClient.get('/furniture/dashboard/overview').then(unwrap<unknown>),
};

// deliveries.api.ts
export type FurnitureDeliveryStatus =
  | 'PENDING' | 'SCHEDULED' | 'DISPATCHED' | 'IN_TRANSIT' | 'ARRIVED'
  | 'DELIVERED' | 'ASSEMBLED' | 'RESCHEDULED' | 'FAILED' | 'RETURNED';

export interface FurnitureDelivery {
  id: string;
  deliveryNumber: string;
  saleId?: string;
  customOrderId?: string;
  productIds: string[];
  productNames: string[];
  itemsCount: number;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  city?: string;
  area?: string;
  landmark?: string;
  floorNumber?: number;
  hasLift?: boolean;
  latitude?: number;
  longitude?: number;
  scheduledDate?: string;
  scheduledSlot?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  helpersCount: number;
  dispatchedAt?: string;
  arrivedAt?: string;
  deliveredAt?: string;
  assembledAt?: string;
  status: FurnitureDeliveryStatus;
  deliveryCharge: number;
  loadingCharge: number;
  unloadingCharge: number;
  floorCharge: number;
  assemblyCharge: number;
  totalCharge: number;
  requiresAssembly: boolean;
  assemblyIncluded: boolean;
  assemblyTimeSpent?: number;
  assemblyNotes?: string;
  receivedByName?: string;
  receivedByCnic?: string;
  signatureUrl?: string;
  photoUrls: string[];
  customerRating?: number;
  customerFeedback?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  /** Bill of the delivery charges, once made. */
  chargesBill?: { id: string; saleNumber: string; status: string; total: number; creditAmount: number } | null;
}

export interface DeliverySummary { pending: number; scheduled: number; inTransit: number; delivered: number; assembled: number; todayScheduled: number; rescheduled: number }
export interface DeliveryPage { items: FurnitureDelivery[]; total: number; page: number; limit: number }
export interface DeliveryInput {
  saleId?: string; customOrderId?: string; customerId?: string; customerName: string; customerPhone: string; deliveryAddress: string;
  city?: string; area?: string; landmark?: string; floorNumber?: number; hasLift?: boolean; scheduledDate?: string; scheduledSlot?: string;
  vehicleType?: string; vehicleNumber?: string; driverName?: string; driverPhone?: string; helpersCount?: number;
  deliveryCharge?: number; loadingCharge?: number; unloadingCharge?: number; floorCharge?: number; assemblyCharge?: number;
  requiresAssembly?: boolean; productNames?: string[]; itemsCount?: number; notes?: string;
}

export const deliveriesApi = {
  /** Deliveries made for one bill (receipt rows). */
  forSale: (saleId: string) =>
    apiClient.get('/furniture/deliveries', { params: { saleId } }).then(unwrap<FurnitureDelivery[]>),

  create: (data: DeliveryInput) =>
    apiClient.post('/furniture/deliveries', data).then(unwrap<FurnitureDelivery>),

  page: (params: { status?: string; from?: string; to?: string; search?: string; page: number; limit: number }) =>
    apiClient.get('/furniture/deliveries', { params }).then(unwrap<DeliveryPage>),

  summary: () => apiClient.get('/furniture/deliveries/summary').then(unwrap<DeliverySummary>),

  getOne: (id: string) => apiClient.get('/furniture/deliveries/' + id).then(unwrap<FurnitureDelivery>),

  assignVehicle: (id: string, data: { vehicleType?: string; vehicleNumber?: string; driverName?: string; driverPhone?: string; helpersCount?: number; scheduledDate?: string; scheduledSlot?: string }) =>
    apiClient.post('/furniture/deliveries/' + id + '/assign-vehicle', data).then(unwrap<FurnitureDelivery>),

  updateStatus: (id: string, data: { status: FurnitureDeliveryStatus; notes?: string }) =>
    apiClient.patch('/furniture/deliveries/' + id + '/status', data).then(unwrap<FurnitureDelivery>),

  confirm: (id: string, data: { receivedByName?: string; receivedByCnic?: string; customerRating?: number; customerFeedback?: string; assemblyTimeSpent?: number; assemblyNotes?: string; assembled?: boolean }) =>
    apiClient.post('/furniture/deliveries/' + id + '/confirm', data).then(unwrap<FurnitureDelivery>),

  bill: (id: string, data: { paidAmount: number; paymentMethod: string }) =>
    apiClient.post('/furniture/deliveries/' + id + '/bill', data).then(unwrap<{ id: string; saleNumber: string; total: number; creditAmount: number }>),
};

// products.api.ts
export type FurnitureCategoryType =
  | 'SOFA_SET' | 'SOFA_L_SHAPE' | 'SOFA_RECLINER' | 'SOFA_BED'
  | 'BED_SINGLE' | 'BED_DOUBLE' | 'BED_KING' | 'BED_QUEEN' | 'BED_BUNK' | 'MATTRESS'
  | 'WARDROBE' | 'DRESSING_TABLE'
  | 'DINING_TABLE' | 'DINING_CHAIR' | 'DINING_SET'
  | 'CENTER_TABLE' | 'SIDE_TABLE'
  | 'OFFICE_DESK' | 'OFFICE_CHAIR' | 'BOOKSHELF'
  | 'TV_CONSOLE' | 'ENTERTAINMENT_UNIT'
  | 'SHOE_RACK' | 'CABINET' | 'CUPBOARD'
  | 'STUDY_TABLE' | 'KIDS_FURNITURE' | 'BABY_COT'
  | 'OUTDOOR_FURNITURE' | 'GARDEN_SET'
  | 'BEAN_BAG' | 'OTTOMAN' | 'CUSTOM_FURNITURE'
  | 'CURTAINS' | 'RUG' | 'DECOR' | 'LIGHTING' | 'MIRROR' | 'OTHER';

export type FurnitureMaterialType =
  | 'SOLID_WOOD_TEAK' | 'SOLID_WOOD_SHEESHAM' | 'SOLID_WOOD_ROSEWOOD' | 'SOLID_WOOD_MANGO'
  | 'ENGINEERED_WOOD' | 'MDF' | 'PARTICLE_BOARD' | 'PLYWOOD'
  | 'METAL_IRON' | 'METAL_STEEL' | 'METAL_ALUMINIUM'
  | 'GLASS' | 'MARBLE' | 'GRANITE' | 'RATTAN' | 'BAMBOO'
  | 'FABRIC_COTTON' | 'FABRIC_LINEN' | 'FABRIC_VELVET'
  | 'LEATHER_GENUINE' | 'LEATHER_FAUX'
  | 'PLASTIC' | 'ACRYLIC' | 'MIXED' | 'OTHER';

export type FurnitureConditionType = 'BRAND_NEW' | 'DISPLAY_MODEL' | 'FLOOR_MODEL' | 'REFURBISHED' | 'PRE_OWNED' | 'CUSTOM_ORDER';

export interface FurnitureProductProfile {
  id: string;
  productId: string;
  categoryType?: FurnitureCategoryType;
  conditionType: FurnitureConditionType;
  primaryMaterial?: FurnitureMaterialType;
  secondaryMaterials: FurnitureMaterialType[];

  modelNumber?: string;
  collectionName?: string;
  designerName?: string;
  countryOfOrigin?: string;
  brand?: string;

  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  seatHeightCm?: number;
  weightKg?: number;

  seatingCapacity?: number;
  storageCompartments?: number;
  drawersCount?: number;
  shelvesCount?: number;

  woodType?: string;
  woodFinish?: string;
  polishType?: string;
  colorName?: string;
  colorHex?: string;
  upholsteryFabric?: string;
  cushionFilling?: string;
  cushionDensity?: string;

  requiresAssembly: boolean;
  assemblyTimeMinutes?: number;
  assemblyPartsCount?: number;
  assemblyToolsIncluded: boolean;
  assemblyInstructionsUrl?: string;
  assemblyChargeExtra?: number;

  isCustomizable: boolean;
  customizationOptions?: any;
  customLeadTimeDays?: number;

  warrantyMonths: number;
  warrantyType?: string;
  careInstructions?: string;
  isWaterResistant: boolean;
  isTermiteProof: boolean;

  requiresLargeVehicle: boolean;
  requiresMultipleHelpers: boolean;
  helpersNeeded: number;
  deliveryChargeBase?: number;
  freeDeliveryRadius?: number;

  mrp?: number;
  costPrice?: number;
  wholesalePrice?: number;
  retailPrice?: number;
  discountedPrice?: number;
  emiStartingFrom?: number;

  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isCustomMade: boolean;
  isEcoFriendly: boolean;

  totalSold: number;
  totalRevenue: number;
  avgRating?: number;
  totalReviews: number;

  showroomLocation?: string;
  showroomFloor?: string;
  displayZone?: string;

  images3d: string[];
  ar_model_url?: string;
  notes?: string;

  product?: any;
  createdAt: string;
  updatedAt: string;
}

export const furnitureProductsApi = {
  upsert: (data: Partial<FurnitureProductProfile>) =>
    apiClient.post('/furniture/products', data).then(unwrap<FurnitureProductProfile>),

  list: (params?: {
    categoryType?: string; conditionType?: string; primaryMaterial?: string;
    featured?: boolean; bestSeller?: boolean; newArrival?: boolean;
    customizable?: boolean; ecoFriendly?: boolean;
    minPrice?: number; maxPrice?: number; search?: string;
  }) => apiClient.get('/furniture/products', { params }).then(unwrap<FurnitureProductProfile[]>),

  byProduct: (productId: string) =>
    apiClient.get('/furniture/products/by-product/' + productId).then(unwrap<FurnitureProductProfile | null>),
};
