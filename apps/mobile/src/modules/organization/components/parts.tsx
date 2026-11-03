/** Small shared pieces of the organization screens. */

import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Row, Text } from '@/design';

/** A label on one side and a value on the other, for use inside a padded card. */
export function KV({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Row justify="between" gap={2} align="center">
      <Text size="sm" tone="muted" style={{ flexShrink: 1 }}>{label}</Text>
      <View style={{ flexShrink: 0 }}>{typeof value === 'string' ? <Text size="sm" weight="semibold">{value}</Text> : value}</View>
    </Row>
  );
}
