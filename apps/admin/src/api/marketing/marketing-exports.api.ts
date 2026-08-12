import { apiClient } from '../client';

export type ExportEntity =
  | 'subscribers'
  | 'leads'
  | 'contact-forms'
  | 'demos'
  | 'campaigns';

export const exportsApi = {
  url: (entity: ExportEntity, from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    return `/admin/marketing/exports/${entity}?${q.toString()}`;
  },

  download: async (entity: ExportEntity, from?: string, to?: string) => {
    const res = await apiClient.get(
      `/admin/marketing/exports/${entity}`,
      {
        params: { from, to },
        responseType: 'blob',
      },
    );
    return res.data as Blob;
  },
};
