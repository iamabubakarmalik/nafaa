import { apiClient } from '@core/api/client';

export type ExportKind = 'sales' | 'products' | 'customers' | 'suppliers' | 'expenses' | 'purchases' | 'ledger' | 'stock-movements';
export type ExportFormat = 'excel' | 'pdf';

export interface ExportLogEntry {
  id: string;
  action?: string;
  description: string;
  metadata?: { kind?: string; format?: ExportFormat; rows?: number; from?: string | null; to?: string | null; counts?: Record<string, number>; bytes?: number } | null;
  createdAt: string;
  user?: { fullName: string } | null;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

/** Turns a failed blob response back into the server's message. */
async function blobError(e: unknown): Promise<never> {
  const data = (e as { response?: { data?: unknown } })?.response?.data;
  let message: string | null = null;
  if (data instanceof Blob) {
    try {
      const body = JSON.parse(await data.text());
      message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message ?? null;
    } catch { /* not JSON */ }
  }
  throw new Error(message || 'File nahi bani — internet check karein');
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const exportsApi = {
  history: () => apiClient.get<{ data: ExportLogEntry[] }>('/exports/history').then(unwrap),

  /** Downloads one file; `range` holds business-day keys, or null for all time. */
  download: async (kind: ExportKind, format: ExportFormat, range: { from: string; to: string } | null) => {
    const res = await apiClient
      .get(`/exports/${kind}/${format}`, { params: range ?? undefined, responseType: 'blob' })
      .catch(blobError);
    const blob = res.data as Blob;
    const stamp = range ? (range.from === range.to ? range.from : `${range.from}_${range.to}`) : new Date().toISOString().slice(0, 10);
    save(blob, `nafaa-${kind}-${stamp}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
    return blob.size;
  },
};
