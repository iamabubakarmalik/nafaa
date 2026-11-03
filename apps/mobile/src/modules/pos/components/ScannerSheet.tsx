/**
 * Counter scanning, continuous: every barcode that comes into view goes on
 * the bill (packs, variants, scale labels and combos too) with a haptic tick
 * and a green flash, and the running total stays on screen.
 */

import { Check } from 'lucide-react-native';
import { t } from '@/core/i18n';
import { Amount, Button, Row, Text, useTheme, withAlpha } from '@/design';
import type { PosCombo } from '../engine/catalog';
import { closeSheet, usePos, usePosUi } from '../engine/usePos';
import { Scanner } from '@/core/hardware/scanner';
import { useCartSummary } from './CartPanel';
import { useState } from 'react';
import { View } from 'react-native';

export function ScannerSheet({ combos }: { combos: PosCombo[] }) {
  const open = usePosUi((s) => s.sheet === 'scanner');
  return open ? <CounterScanner combos={combos} /> : null;
}

function CounterScanner({ combos }: { combos: PosCombo[] }) {
  const th = useTheme();
  const api = usePos();
  const summary = useCartSummary();
  const lastAdded = usePosUi((s) => s.lastAdded);
  const [miss, setMiss] = useState<string | null>(null);
  const onCam = th.colors.neutral.onSolid;
  const dim = withAlpha(onCam, 0.78);

  const onCode = async (code: string) => {
    const ok = await api.handleCode(code, { combos, quiet: true });
    setMiss(ok ? null : code);
    return ok;
  };

  return (
    <Scanner title={t('Scan items')} continuous onCode={onCode} onClose={closeSheet}
      footer={
        <>
          {miss ? <Text weight="semibold" align="center" color={th.colors.danger.border}>{t('Barcode "{{code}}" not found', { code: miss })}</Text>
            : lastAdded && Date.now() - lastAdded.at < 8000 ? <Text weight="semibold" align="center" numberOfLines={1} color={onCam}>{`✓ ${lastAdded.name}`}</Text>
              : <Text align="center" color={dim}>{t('Point the camera at a barcode. Items go on the bill one after another.')}</Text>}
          <Row justify="between">
            <View>
              <Text size="sm" color={dim}>{t('{{count}} items', { count: summary.count })}</Text>
              <Amount value={summary.total} size="2xl" weight="bold" color={onCam} />
            </View>
            <Button size="lg" variant="success" icon={Check} onPress={closeSheet}>{t('Done')}</Button>
          </Row>
        </>
      } />
  );
}
