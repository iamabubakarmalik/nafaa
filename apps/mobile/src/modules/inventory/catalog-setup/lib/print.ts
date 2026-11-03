/** Print or share an HTML page as PDF (lists, combo sheets, catalogs, labels) through the system print dialog. */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { t } from '@/core/i18n';
import { toast } from '@/design';

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** A plain A4 page with a title, a subtitle and a body. */
export function page(title: string, subtitle: string, body: string, rtl = false) {
  return `<!doctype html><html dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"/><style>
    body{font-family:-apple-system,Roboto,'Noto Naskh Arabic',sans-serif;color:#0f172a;margin:24px;font-size:12px}
    h1{font-size:20px;margin:0}.sub{color:#64748b;margin:4px 0 16px}
    table{width:100%;border-collapse:collapse}th,td{padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:start}
    th{font-size:10px;text-transform:uppercase;color:#64748b}.num{text-align:end;font-variant-numeric:tabular-nums;direction:ltr}
    .card{border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:10px;break-inside:avoid}
  </style></head><body><h1>${esc(title)}</h1><div class="sub">${esc(subtitle)}</div>${body}</body></html>`;
}

export async function printHtml(html: string) {
  try { await Print.printAsync({ html }); } catch { toast.error(t('Print nahi hua')); }
}

export async function shareHtmlPdf(html: string, opts: { width?: number; height?: number } = {}) {
  try {
    const { uri } = await Print.printToFileAsync({ html, ...opts });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  } catch { toast.error(t('PDF nahi bani')); }
}
