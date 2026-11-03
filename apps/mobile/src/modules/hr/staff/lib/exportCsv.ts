/** Writes rows to a CSV file (opens in Excel with Urdu text intact) and opens the share sheet. */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export async function shareCsv(name: string, rows: Array<Array<string | number | null | undefined>>) {
  const cell = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const uri = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, `﻿${rows.map((r) => r.map(cell).join(',')).join('\n')}`, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
}
