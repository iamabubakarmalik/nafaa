/**
 * Small pieces shared by the stock screens: the period chips, a bar list for
 * analytics, a key-number row, the "needs internet" card and the simple
 * print / PDF share of a list.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { CloudOff } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { formatRelative } from '@/core/format';
import { useOnline } from '../../lib/shared';
import { t } from '@/core/i18n';
import { onlineNeededText, type OnlineFeature } from '@/core/offline';
import { Card, Chip, EmptyState, Icon, ProgressBar, Row, StatTile, Text, toast, useTheme, type StatusTone } from '@/design';
import { PERIODS, type PeriodPreset } from '../meta';

export function PeriodChips({ value, onChange }: { value: PeriodPreset; onChange: (v: PeriodPreset) => void }) {
  const th = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: th.space(2) }}>
      {PERIODS.map((p) => <Chip key={p.value} label={t(p.label)} selected={value === p.value} onPress={() => onChange(p.value)} />)}
    </ScrollView>
  );
}

/** Horizontal row of stat tiles that scrolls on phones. */
export function StatStrip({ items }: { items: Array<{ label: string; value: ReactNode; hint?: ReactNode; tone?: StatusTone; onPress?: () => void }> }) {
  const th = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -th.space(4) }}
      contentContainerStyle={{ gap: th.space(2), paddingHorizontal: th.space(4) }}>
      {items.map((s) => <StatTile key={s.label} label={s.label} value={s.value} hint={s.hint} tone={s.tone} onPress={s.onPress} style={{ minWidth: 150 }} />)}
    </ScrollView>
  );
}

/** A titled list of bars (analytics). `value` is formatted by the caller. */
export function Bars({ title, rows, tone = 'brand', empty }: {
  title: string;
  rows: Array<{ key: string; label: string; amount: number; value: string; hint?: string }>;
  tone?: StatusTone;
  empty?: string;
}) {
  const th = useTheme();
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.amount)));
  return (
    <Card title={title}>
      {rows.length ? (
        <View style={{ gap: th.space(3) }}>
          {rows.map((r) => (
            <View key={r.key} style={{ gap: 4 }}>
              <Row justify="between" gap={2}>
                <Text size="sm" style={{ flex: 1 }} numberOfLines={1}>{r.label}</Text>
                <Text size="sm" weight="semibold" ltr>{r.value}</Text>
              </Row>
              <ProgressBar value={Math.abs(r.amount) / max} tone={tone} />
              {r.hint ? <Text size="2xs" tone="muted">{r.hint}</Text> : null}
            </View>
          ))}
        </View>
      ) : <Text size="sm" tone="muted">{empty ?? t('Abhi kuch nahi')}</Text>}
    </Card>
  );
}

/** Shown in place of an online-only screen when there is no internet and nothing saved. */
export function OnlineOnly({ feature, updatedAt }: { feature: OnlineFeature; updatedAt?: number | null }) {
  const th = useTheme();
  const online = useOnline();
  if (online && !updatedAt) return null;
  if (updatedAt) {
    return (
      <Row gap={1.5}>
        <Icon icon={CloudOff} size={14} tone="muted" />
        <Text size="xs" tone="muted">{t('Last updated {{time}}', { time: formatRelative(updatedAt) })}</Text>
      </Row>
    );
  }
  return <EmptyState icon={CloudOff} tone="warning" title={onlineNeededText(feature)} style={{ marginTop: th.space(8) }} />;
}

export interface PrintTable { title: string; subtitle?: string; columns: string[]; rows: Array<Array<string | number>>; footer?: string }

const esc = (s: unknown) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));

function html(doc: PrintTable) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:11px;color:#0f172a;margin:24px}
h1{font-size:18px;margin:0}p{margin:4px 0 12px;color:#475569}
table{width:100%;border-collapse:collapse}th,td{padding:5px 6px;border-bottom:1px solid #e2e8f0;text-align:left}
th{background:#f1f5f9;font-size:10px;text-transform:uppercase}td.n{text-align:right}footer{margin-top:12px;color:#64748b;font-size:10px}
</style></head><body><h1>${esc(doc.title)}</h1>${doc.subtitle ? `<p>${esc(doc.subtitle)}</p>` : ''}
<table><thead><tr>${doc.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>
${doc.rows.map((r) => `<tr>${r.map((c) => `<td class="${typeof c === 'number' ? 'n' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}
</tbody></table><footer>${esc(doc.footer ?? 'Nafaa')}</footer></body></html>`;
}

/** Prints the list (A4) through the system print sheet. */
export async function printTable(doc: PrintTable) {
  try { await Print.printAsync({ html: html(doc) }); } catch { toast.error(t('Print nahi hua')); }
}

/** Makes a PDF of the list and opens the share sheet (WhatsApp, email…). */
export async function shareTable(doc: PrintTable) {
  try {
    const file = await Print.printToFileAsync({ html: html(doc) });
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: doc.title });
  } catch {
    toast.error(t('Share nahi hua'));
  }
}
