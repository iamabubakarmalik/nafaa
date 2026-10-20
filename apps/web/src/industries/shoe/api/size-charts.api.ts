import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: { data: { data?: T } | T }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

/** One row of a chart: the same foot in each system, e.g. { pk: '8', eu: '42', us: '9', cm: '26.5' }. */
export type ChartRow = Record<string, string>;

export interface ShoeSizeChart {
  id: string;
  name: string;
  gender?: string | null;
  categoryType?: string | null;
  mappings: ChartRow[];
  notes?: string | null;
  isActive: boolean;
}

export interface SizeChartInput { name: string; gender?: string; mappings: ChartRow[]; notes?: string; isActive?: boolean }

export const shoeSizeChartsApi = {
  list: () => apiClient.get('/shoe/size-charts').then(unwrap<ShoeSizeChart[]>),
  create: (data: SizeChartInput) => apiClient.post('/shoe/size-charts', data).then(unwrap<ShoeSizeChart>),
  update: (id: string, data: Partial<SizeChartInput>) => apiClient.patch('/shoe/size-charts/' + id, data).then(unwrap<ShoeSizeChart>),
  /** Hides the chart; nothing is deleted. */
  deactivate: (id: string) => apiClient.delete('/shoe/size-charts/' + id).then(unwrap<ShoeSizeChart>),
};
