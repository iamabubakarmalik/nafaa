import { apiClient } from './client';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export interface MaintenanceState {
  on: boolean;
  message: string;
  until?: string | null;
  startedAt?: string | null;
}

export interface SystemControls {
  maintenance: MaintenanceState;
  signupsOpen: boolean;
  aiEnabled: boolean;
  pausedJobs: string[];
}

export interface SystemJob {
  key: string;
  className: string;
  method: string;
  name: string | null;
  schedule: string;
  timeZone: string | null;
  paused: boolean;
  canRunNow: boolean;
  running: boolean;
  runs: number;
  failures: number;
  skipped: number;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastDurationMs: number | null;
  lastOk: boolean | null;
  lastError: string | null;
}

export interface ServerErrorItem {
  id: string;
  source: 'http' | 'job';
  method: string | null;
  route: string;
  status: number | null;
  message: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
  lastTenantId: string | null;
  lastTenantName: string | null;
}

export interface ServerErrorDetail extends Omit<ServerErrorItem, 'lastTenantName'> {
  fingerprint: string;
  stack: string | null;
  lastPath: string | null;
  lastUserId: string | null;
  lastTenant: { id: string; name: string } | null;
  lastUser: { id: string; fullName: string; email: string } | null;
  resolvedBy: { id: string; fullName: string } | null;
}

export interface ServerErrorList {
  items: ServerErrorItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  stats: { open: number; last24h: number; openJobErrors: number };
}

export const adminSystemApi = {
  controls: () => apiClient.get<{ data: SystemControls }>('/admin/system/controls').then(unwrap),
  setMaintenance: (dto: { on: boolean; message?: string; until?: string | null }) =>
    apiClient.patch<{ data: SystemControls }>('/admin/system/maintenance', dto).then(unwrap),
  setSignups: (open: boolean) => apiClient.patch<{ data: SystemControls }>('/admin/system/signups', { open }).then(unwrap),
  setAi: (enabled: boolean) => apiClient.patch<{ data: SystemControls }>('/admin/system/ai', { enabled }).then(unwrap),

  jobs: () => apiClient.get<{ data: SystemJob[] }>('/admin/system/jobs').then(unwrap),
  pauseJob: (key: string, paused: boolean) => apiClient.patch<{ data: SystemJob }>(`/admin/system/jobs/${encodeURIComponent(key)}`, { paused }).then(unwrap),
  runJob: (key: string) => apiClient.post<{ data: { started: boolean } }>(`/admin/system/jobs/${encodeURIComponent(key)}/run`).then(unwrap),

  errors: (params: { status?: string; source?: string; search?: string; sort?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: ServerErrorList }>('/admin/system/errors', { params }).then(unwrap),
  error: (id: string) => apiClient.get<{ data: ServerErrorDetail }>(`/admin/system/errors/${id}`).then(unwrap),
  resolveError: (id: string) => apiClient.post(`/admin/system/errors/${id}/resolve`).then(unwrap),
  reopenError: (id: string) => apiClient.post(`/admin/system/errors/${id}/reopen`).then(unwrap),
  resolveAll: () => apiClient.post<{ data: { resolved: number } }>('/admin/system/errors/resolve-all').then(unwrap),
};
