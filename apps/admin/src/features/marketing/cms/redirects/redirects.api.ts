/**
 * Redirect calls (API-CONTRACT 8.5).
 */
import type {
  AdminRedirect, CmsRedirectSource, CreateRedirectBody, Paginated, PatchRedirectBody, RedirectImportBody, RedirectImportResult, RedirectTestResult,
} from '../contract/cms-contract';
import { CMS_BASE, cleanParams, cmsHttp, unwrap } from '../dashboard/shared/cms-http';

export interface RedirectListParams {
  q?: string;
  source?: CmsRedirectSource | '';
  active?: 'true' | 'false' | '';
  pattern?: 'true' | 'false' | '';
  page?: number;
  limit?: number;
}

export const redirectsApi = {
  list: (params: RedirectListParams) => cmsHttp.get(`${CMS_BASE}/redirects`, { params: cleanParams({ ...params }) }).then((r) => unwrap<Paginated<AdminRedirect>>(r)),
  create: (body: CreateRedirectBody) => cmsHttp.post(`${CMS_BASE}/redirects`, body).then((r) => unwrap<AdminRedirect>(r)),
  update: (id: string, body: PatchRedirectBody) => cmsHttp.patch(`${CMS_BASE}/redirects/${id}`, body).then((r) => unwrap<AdminRedirect>(r)),
  remove: (id: string) => cmsHttp.delete(`${CMS_BASE}/redirects/${id}`).then(() => undefined),
  import: (body: RedirectImportBody) => cmsHttp.post(`${CMS_BASE}/redirects/import`, body).then((r) => unwrap<RedirectImportResult>(r)),
  test: (path: string) => cmsHttp.get(`${CMS_BASE}/redirects/test`, { params: { path } }).then((r) => unwrap<RedirectTestResult>(r)),
  /** CSV text. Accepts a raw CSV body or one wrapped in the { data } envelope. */
  exportCsv: () =>
    cmsHttp.get(`${CMS_BASE}/redirects/export`, { responseType: 'text', transformResponse: (d) => d }).then((r) => {
      const text = String(r.data ?? '');
      if (text.trimStart().startsWith('{')) {
        try {
          const parsed = JSON.parse(text) as { data?: unknown };
          if (typeof parsed.data === 'string') return parsed.data;
        } catch {
          /* fall through to raw text */
        }
      }
      return text;
    }),
};

/** Minimal CSV parser (quoted fields, commas, CRLF) for `from,to,status,note`. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}
