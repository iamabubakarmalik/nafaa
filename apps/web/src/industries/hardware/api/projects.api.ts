import { apiClient } from '@core/api/client';

export type ProjectStatus = 'PLANNING' | 'QUOTED' | 'APPROVED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export interface HardwareProject {
  id: string;
  projectNumber: string;
  name: string;
  description?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  contractorName?: string;
  contractorPhone?: string;
  architectName?: string;
  siteAddress: string;
  city?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  siteContactPhone?: string;
  projectType?: string;
  builtUpArea?: number;
  floors?: number;
  startDate?: string;
  expectedEndDate?: string;
  actualEndDate?: string;
  status: ProjectStatus;
  estimatedBudget?: number;
  totalQuoted: number;
  totalOrdered: number;
  totalDelivered: number;
  totalPaid: number;
  totalPending: number;
  creditLimit: number;
  creditDays: number;
  imageUrls: string[];
  documentUrls: string[];
  notes?: string;
  isActive: boolean;
  quotations?: any[];
  deliveries?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const projectsApi = {
  create: (data: Partial<HardwareProject>) => apiClient.post('/hardware/projects', data).then(unwrap<HardwareProject>),
  list: (params?: any) => apiClient.get('/hardware/projects', { params }).then(unwrap<HardwareProject[]>),
  getOne: (id: string) => apiClient.get('/hardware/projects/' + id).then(unwrap<HardwareProject>),
  update: (id: string, data: Partial<HardwareProject>) => apiClient.patch('/hardware/projects/' + id, data).then(unwrap<HardwareProject>),
  updateStatus: (id: string, status: string, notes?: string) => apiClient.patch('/hardware/projects/' + id + '/status', { status, notes }).then(unwrap<HardwareProject>),
  recalculate: (id: string) => apiClient.post('/hardware/projects/' + id + '/recalculate').then(unwrap<HardwareProject>),
  remove: (id: string) => apiClient.delete('/hardware/projects/' + id).then(unwrap),
};
