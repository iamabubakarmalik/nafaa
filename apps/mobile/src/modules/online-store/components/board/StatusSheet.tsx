/**
 * Status sheet: jump an order (or the picked orders) to any status on the
 * board, grouped like the tiles, with the current one marked.
 */

import { View } from 'react-native';
import { Check } from 'lucide-react-native';
import { t } from '@/core/i18n';
import { Icon, ListGroup, ListRow, Sheet, Text, useTheme } from '@/design';
import type { BoardStatus, CustomStage } from '../../api/board';
import { BOARD_GROUPS, moveTargets } from '../../lib/board';
import { entryLabel } from '../../hooks/useMoveOrder';

export function StatusSheet({ open, title, current, custom, onClose, onPick }: {
  open: boolean; title: string; current?: string; custom: CustomStage[]; onClose: () => void; onPick: (to: BoardStatus) => void;
}) {
  const th = useTheme();
  const targets = moveTargets(custom);
  return (
    <Sheet open={open} onClose={onClose} title={title} description={t('Kis status par le jayein?')}>
      <View style={{ gap: th.space(3) }}>
        {BOARD_GROUPS.map((g) => {
          const list = targets.filter((x) => x.group === g.id);
          if (!list.length) return null;
          return (
            <View key={g.id} style={{ gap: th.space(1.5) }}>
              <Text size="xs" weight="semibold" tone="muted">{t(g.label)}</Text>
              <ListGroup>
                {list.map((e) => (
                  <ListRow key={e.key} dense title={entryLabel(e, e.key)} subtitle={t(e.hint)} disabled={e.key === current}
                    leading={<View style={{ width: 30, height: 30, borderRadius: th.radius('md'), alignItems: 'center', justifyContent: 'center', backgroundColor: th.colors[e.tone].soft }}><Icon icon={e.icon} size={15} color={th.colors[e.tone].text} /></View>}
                    trailing={e.key === current ? <Icon icon={Check} size={18} color={th.colors[e.tone].text} /> : undefined}
                    onPress={() => { onClose(); setTimeout(() => onPick(e.key as BoardStatus), 250); }} />
                ))}
              </ListGroup>
            </View>
          );
        })}
      </View>
    </Sheet>
  );
}
