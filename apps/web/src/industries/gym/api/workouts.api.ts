import { apiClient } from '@core/api/client';

export interface WorkoutSession {
  id: string;
  memberId: string;
  sessionDate: string;
  durationMinutes?: number;
  caloriesBurned?: number;
  workoutType?: string;
  focusArea?: string;
  intensity?: string;
  exercises?: any;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  notes?: string;
  memberRating?: number;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const workoutsApi = {
  create: (data: Partial<WorkoutSession> & { memberId: string }) => apiClient.post('/gym/workouts', data).then(unwrap<WorkoutSession>),
  byMember: (memberId: string) => apiClient.get('/gym/workouts/by-member/' + memberId).then(unwrap<WorkoutSession[]>),
  summary: (memberId: string) => apiClient.get('/gym/workouts/summary/' + memberId).then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/gym/workouts/' + id).then(unwrap<WorkoutSession>),
  update: (id: string, data: any) => apiClient.patch('/gym/workouts/' + id, data).then(unwrap<WorkoutSession>),
  remove: (id: string) => apiClient.delete('/gym/workouts/' + id).then(unwrap),
};
