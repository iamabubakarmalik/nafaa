/** Small building blocks shared by the distribution manager screens. */

import { useQueryClient } from '@tanstack/react-query';
import { CloudOff } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Share, View } from 'react-native';
import { businessDayKey, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { useCachedNotice } from '@/core/offline';
import { Button, Row, Sheet, StatusPill, Text, TextArea, useTheme } from '@/design';
import { DIST_KEY } from '../api/distribution.api';
import { TONE, type Tone } from '../lib/meta';

/** Status label in the kit's pill; the label is plain source text translated here. */
export function StatusChip({ meta, dot = true }: { meta: { label: string; tone: Tone }; dot?: boolean }) {
  return <StatusPill tone={TONE[meta.tone]} dot={dot}>{t(meta.label)}</StatusPill>;
}

/** "Last updated" line shown while the screen is reading saved data offline. */
export function CachedNote({ query }: { query: { dataUpdatedAt: number; isFetching?: boolean; fetchStatus?: string } }) {
  const th = useTheme();
  const c = useCachedNotice(query);
  if (!c.fromCache || !c.updatedAt) return null;
  return (
    <Row gap={1.5}>
      <CloudOff size={14} color={th.colors.textMuted} />
      <Text size="xs" tone="muted">{t('Last updated {{time}}', { time: formatRelative(c.updatedAt) })}</Text>
    </Row>
  );
}

/** Refreshes every distribution query after a change. */
export function useRefreshDistribution() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [DIST_KEY] });
}

/** Asks for a short reason (cancel, reject, bounce) in a bottom sheet. */
export function ReasonSheet({ open, title, description, placeholder, confirmLabel, tone = 'danger', busy, required, onClose, onSubmit }: {
  open: boolean; title: string; description?: string; placeholder?: string; confirmLabel: string; tone?: 'danger' | 'primary'; busy?: boolean; required?: boolean;
  onClose: () => void; onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <Sheet open={open} onClose={() => { setReason(''); onClose(); }} title={title} description={description}
      footer={<Button fullWidth variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} disabled={required && !reason.trim()}
        onPress={() => { onSubmit(reason.trim()); setReason(''); }}>{confirmLabel}</Button>}>
      <TextArea label={t('Wajah')} placeholder={placeholder ?? t('Zaroori nahi')} value={reason} onChangeText={setReason} />
    </Sheet>
  );
}

/** Label / value line for summaries inside a sheet or card. */
export function FactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
      <Text size="sm" tone="muted" style={{ flexShrink: 1 }}>{label}</Text>
      <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{typeof children === 'string' ? <Text size="sm" weight="medium">{children}</Text> : children}</View>
    </View>
  );
}

export const shareText = (message: string) => Share.share({ message });

export const todayKey = () => businessDayKey();
