import { apiClient } from '@core/api/client';
import type { FurnitureCustomOrder } from './custom-orders.api';

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

const unwrap = <T,>(res: { data?: { data?: unknown } }): T => (res.data?.data ?? res.data) as T;

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
