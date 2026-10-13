import { apiClient } from '@core/api/client';
import type { ReportFigure, ReportPeriod } from '@modules/reports/prefs';

export type SummaryChannel = 'app' | 'email' | 'whatsapp';
export type SummaryPart =
  | 'returns' | 'voids' | 'discount' | 'payments' | 'drawer' | 'profit' | 'expenses' | 'khata' | 'lowStock' | 'topItems' | 'topStaff' | 'branches' | 'trend';

/** Settings → Reports, as stored (defaults filled in by the server). */
export interface ReportsConfig {
  fiscalYearStartMonth: number;
  defaultPeriod: ReportPeriod;
  compareDefault: 'prev' | 'year' | 'off';
  roundOff: 'paisa' | 'rupee';
  staffFigures: ReportFigure[];
  summary: {
    channels: SummaryChannel[];
    /** null = the owner and everyone with "View Reports". */
    recipientIds: string[] | null;
    include: SummaryPart[];
  };
}

export type ReportsConfigPatch = Partial<Omit<ReportsConfig, 'summary'>> & { summary?: Partial<ReportsConfig['summary']> };

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const reportsConfigApi = {
  get: () => apiClient.get('/settings/reports-config').then((r) => unwrap<ReportsConfig>(r)),
  update: (patch: ReportsConfigPatch) => apiClient.patch('/settings/reports-config', patch).then((r) => unwrap<ReportsConfig>(r)),
};
