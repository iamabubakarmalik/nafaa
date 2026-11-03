/** Share a CSV or a PDF made from HTML through the phone's share sheet (WhatsApp, email, Files). */

import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { toCsv } from '@nafaa/core/online-store';

const safe = (name: string) => name.replace(/[^\w.-]+/g, '-');

export async function shareCsv(fileName: string, rows: unknown[][], dialogTitle = fileName) {
  const path = `${FileSystem.cacheDirectory}${safe(fileName)}.csv`;
  await FileSystem.writeAsStringAsync(path, toCsv(rows), { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(path, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle });
}

export async function sharePdf(fileName: string, html: string, dialogTitle = fileName) {
  const { uri } = await Print.printToFileAsync({ html });
  const path = `${FileSystem.cacheDirectory}${safe(fileName)}.pdf`;
  await FileSystem.moveAsync({ from: uri, to: path }).catch(() => undefined);
  const file = (await FileSystem.getInfoAsync(path)).exists ? path : uri;
  await Sharing.shareAsync(file, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle });
}

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
