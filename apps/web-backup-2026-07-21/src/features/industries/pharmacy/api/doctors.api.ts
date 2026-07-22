import { apiClient } from '@/api/client';

export interface Doctor {
  id: string;
  name: string;
  registrationNumber: string;
  phone?: string;
  email?: string;
  cnic?: string;
  qualification?: string;
  specialization?: string;
  yearsOfExperience?: number;
  clinicName?: string;
  clinicAddress?: string;
  hospitalAffiliation?: string;
  consultationFee?: number;
  commissionType?: string;
  commissionValue: number;
  totalPrescriptions: number;
  totalBusiness: number;
  totalCommission: number;
  notes?: string;
  isVerified: boolean;
  isActive: boolean;
  prescriptions?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const doctorsApi = {
  create: (data: Partial<Doctor>) => apiClient.post('/pharmacy/doctors', data).then(unwrap<Doctor>),
  list: (params?: { search?: string; specialization?: string; isActive?: boolean }) =>
    apiClient.get('/pharmacy/doctors', { params }).then(unwrap<Doctor[]>),
  getOne: (id: string) => apiClient.get('/pharmacy/doctors/' + id).then(unwrap<Doctor>),
  update: (id: string, data: Partial<Doctor>) =>
    apiClient.patch('/pharmacy/doctors/' + id, data).then(unwrap<Doctor>),
  verify: (id: string) => apiClient.post('/pharmacy/doctors/' + id + '/verify').then(unwrap<Doctor>),
  remove: (id: string) => apiClient.delete('/pharmacy/doctors/' + id).then(unwrap),
};
