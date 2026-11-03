/** Small pieces repeated across the agri, dairy and meat screens: a list row card, a stat row and a reason sheet. */

import { useState, type ComponentProps, type ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, Row, Sheet, StatTile, TextArea, useTheme } from '@/design';

/** Rounded card around one list row (same look as the other industry packs). */
export function RowCard({ children, dim }: { children: ReactNode; dim?: boolean }) {
  const th = useTheme();
  return (
    <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, opacity: dim ? 0.7 : 1 }}>
      {children}
    </View>
  );
}

/** Two or three stat tiles side by side. */
type StatTileProps = ComponentProps<typeof StatTile>;

export function StatRow({ tiles }: { tiles: StatTileProps[] }) {
  return (
    <Row gap={2}>
      {tiles.map((p, i) => <StatTile key={i} {...p} style={{ flex: 1, flexBasis: 0, minWidth: 0 }} />)}
    </Row>
  );
}

/** Asks for a short reason (cancel, suspend, reject) and hands it back. */
export function ReasonSheet({ open, title, description, cta, label, required = true, danger = true, onClose, onConfirm }: {
  open: boolean; title: string; description?: string; cta: string; label?: string; required?: boolean; danger?: boolean;
  onClose: () => void; onConfirm: (reason: string) => Promise<unknown> | void;
}) {
  const th = useTheme();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const bad = required && !reason.trim();
  const run = async () => {
    setBusy(true);
    try { await onConfirm(reason.trim()); setReason(''); onClose(); } catch { /* the caller already showed the error */ } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={title} description={description}
      footer={<Button fullWidth size="lg" variant={danger ? 'danger' : 'primary'} loading={busy} disabled={bad} onPress={() => void run()}>{cta}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <TextArea label={label ?? t('Wajah')} value={reason} onChangeText={setReason} />
      </View>
    </Sheet>
  );
}
