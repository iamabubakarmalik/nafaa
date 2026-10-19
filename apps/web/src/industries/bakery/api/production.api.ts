import { apiClient } from '@core/api/client';

export interface ProductionItem {
  id?: string;
  productId?: string;
  productName: string;
  category?: string;
  cakeOrderId?: string;
  plannedQty: number;
  producedQty: number;
  failedQty: number;
  /** Product unit; quantities take decimals when it is a weight. */
  unit?: string | null;
  bakerId?: string;
  bakerName?: string;
  status: string;
  batchNumber?: string;
  ovenNumber?: string;
  bakingStartTime?: string;
  bakingEndTime?: string;
  bakingTempC?: number;
  bakingDurationMin?: number;
  qualityGrade?: string;
  qualityCheckBy?: string;
  qualityNotes?: string;
  ingredientsUsed?: any;
  totalCost: number;
  notes?: string;
}

export interface ProductionPlan {
  id: string;
  planNumber: string;
  planDate: string;
  shift?: string;
  headBakerId?: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  totalCost: number;
  notes?: string;
  items: ProductionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PlanItemInput {
  productId?: string;
  productName: string;
  cakeOrderId?: string;
  plannedQty: number;
  bakerName?: string;
  ovenNumber?: string;
  batchNumber?: string;
  notes?: string;
}

export interface CompleteItemInput {
  producedQty: number;
  failedQty?: number;
  qualityGrade?: string;
  qualityNotes?: string;
  /** Take the recipe's raw materials out of the store. */
  useIngredients?: boolean;
  /** Put the good pieces into the branch stock. */
  addToStock?: boolean;
  /** Hours the pieces stay fresh; a freshness batch is made when given. */
  freshHours?: number;
}

export interface SuggestRow {
  productId: string;
  name: string;
  unit: string;
  price: number;
  stock: number;
  avgDaily: number;
  weekdayAvg: number;
  expected: number;
  wasteRate: number;
  orders: number;
  orderRefs: string[];
  freshLeft: number;
  planned: number;
  suggested: number;
}

export interface BakeSuggestion {
  date: string;
  days: number;
  /** 'guess' when no product is marked as made here; best sellers are shown instead. */
  basis: 'made' | 'guess';
  rows: SuggestRow[];
  customCakes: Array<{ id: string; orderNumber: string; customerName: string; size: string; flavor: string; shape: string; neededBy: string; messageOnCake?: string | null; status: string }>;
  bulkOrders: Array<{ id: string; orderNumber: string; organizationName: string; eventDate: string }>;
  totals: { suggested: number; orders: number; planned: number };
}

interface Agg { planned: number; produced: number; failed: number }

export interface ProductionInsights {
  period: { from: string; to: string };
  totals: Agg & { plans: number; items: number; pending: number; failRate: number; doneRate: number; cost?: number };
  byProduct: Array<Agg & { name: string; productId: string | null; failRate: number; cost?: number }>;
  byDay: Array<Agg & { key: string }>;
  byShift: Array<Agg & { key: string; failRate: number }>;
  byBaker: Array<Agg & { key: string; failRate: number }>;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const productionApi = {
  createPlan: (data: any) => apiClient.post('/bakery/production/plans', data).then(unwrap<ProductionPlan>),
  listPlans: (params?: any) => apiClient.get('/bakery/production/plans', { params }).then(unwrap<ProductionPlan[]>),
  today: () => apiClient.get('/bakery/production/today').then(unwrap<ProductionPlan[]>),
  getPlan: (id: string) => apiClient.get('/bakery/production/plans/' + id).then(unwrap<ProductionPlan>),
  updatePlan: (id: string, data: any) => apiClient.patch('/bakery/production/plans/' + id, data).then(unwrap<ProductionPlan>),
  startPlan: (id: string) => apiClient.post('/bakery/production/plans/' + id + '/start').then(unwrap<ProductionPlan>),
  completePlan: (id: string) => apiClient.post('/bakery/production/plans/' + id + '/complete').then(unwrap<ProductionPlan>),
  /** What to bake on a business day (yyyy-mm-dd). */
  suggest: (date?: string, days?: number) => apiClient.get('/bakery/production/suggest', { params: { date, days } }).then(unwrap<BakeSuggestion>),
  insights: (range?: { from?: string; to?: string }) => apiClient.get('/bakery/production/insights', { params: range }).then(unwrap<ProductionInsights>),
  addItems: (planId: string, items: PlanItemInput[]) => apiClient.post('/bakery/production/plans/' + planId + '/items', { items }).then(unwrap<ProductionPlan>),
  removeItem: (itemId: string) => apiClient.delete('/bakery/production/items/' + itemId).then(unwrap<ProductionPlan>),
  updateItem: (itemId: string, data: any) => apiClient.patch('/bakery/production/items/' + itemId, data).then(unwrap<ProductionItem>),
  startBaking: (itemId: string, data: { bakingTempC?: number; ovenNumber?: string }) =>
    apiClient.post('/bakery/production/items/' + itemId + '/start-baking', data).then(unwrap<ProductionItem>),
  completeItem: (itemId: string, data: CompleteItemInput) =>
    apiClient.post('/bakery/production/items/' + itemId + '/complete', data).then(unwrap<ProductionItem & { warnings?: string[]; stockAdded?: number }>),
};
