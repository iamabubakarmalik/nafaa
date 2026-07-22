import { apiClient } from '@core/api/client';

export interface PTSession {
  id: string;
  sessionNumber: string;
  memberId: string;
  trainerId: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  durationMinutes: number;
  status: string;
  cancelledAt?: string;
  cancellationReason?: string;
  focusArea?: string;
  workoutPlan?: any;
  exercisesPerformed?: any;
  caloriesBurned?: number;
  price: number;
  paidAmount: number;
  isFromPackage: boolean;
  commissionAmount: number;
  memberRating?: number;
  memberFeedback?: string;
  trainerNotes?: string;
  trainer?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const ptApi = {
  create: (data: any) => apiClient.post('/gym/personal-training', data).then(unwrap<PTSession>),
  list: (params?: any) => apiClient.get('/gym/personal-training', { params }).then(unwrap<PTSession[]>),
  getOne: (id: string) => apiClient.get('/gym/personal-training/' + id).then(unwrap<PTSession>),
  updateStatus: (id: string, status: string, cancellationReason?: string) =>
    apiClient.post('/gym/personal-training/' + id + '/status', { status, cancellationReason }).then(unwrap<PTSession>),
  rate: (id: string, rating: number, feedback?: string) =>
    apiClient.post('/gym/personal-training/' + id + '/rate', { rating, feedback }).then(unwrap<PTSession>),
  logWorkout: (id: string, data: any) => apiClient.post('/gym/personal-training/' + id + '/workout-log', data).then(unwrap<PTSession>),
};
