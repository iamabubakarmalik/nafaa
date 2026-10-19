import type { ProjectStatus } from '../api/projects.api';

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: string }> = {
  PLANNING: { label: 'Shuru hone wali', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  QUOTED: { label: 'Quotation de di', tone: 'bg-sky-50 text-sky-800 ring-sky-200' },
  APPROVED: { label: 'Pakki ho gayi', tone: 'bg-indigo-50 text-indigo-800 ring-indigo-200' },
  IN_PROGRESS: { label: 'Kaam chal raha', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  ON_HOLD: { label: 'Ruki hui', tone: 'bg-orange-50 text-orange-800 ring-orange-200' },
  COMPLETED: { label: 'Mukammal', tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  CANCELLED: { label: 'Band', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

/** Moves offered on a site, in working order. */
export const PROJECT_NEXT: Partial<Record<ProjectStatus, ProjectStatus[]>> = {
  PLANNING: ['QUOTED', 'IN_PROGRESS', 'CANCELLED'],
  QUOTED: ['APPROVED', 'IN_PROGRESS', 'CANCELLED'],
  APPROVED: ['IN_PROGRESS', 'ON_HOLD'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: ['IN_PROGRESS'],
  CANCELLED: ['PLANNING'],
};
