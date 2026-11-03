/** Last screen: what is set up, what was left for later, and two preferences. */

import { CheckCircle2, CircleDashed } from 'lucide-react-native';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, Icon, ListGroup, ListRow, Switch, useTheme } from '@/design';
import type { OnboardingProgress } from '../lib/api';
import { STEPS, isStepDone, type StepId } from '../lib/steps';

export interface FinishForm { wantsTutorial: boolean; subscribedToTips: boolean }

export function FinishStep({ value, onChange, progress, onJump }: { value: FinishForm; onChange: (p: Partial<FinishForm>) => void; progress: OnboardingProgress; onJump: (id: StepId) => void }) {
  const th = useTheme();
  const summary = (id: StepId) => {
    if (id === 'products' && progress.productsAddedCount > 0) return t('{{count}} products', { count: progress.productsAddedCount });
    if (id === 'staff' && progress.teamMembersAdded > 0) return t('{{count}} staff', { count: progress.teamMembersAdded });
    return null;
  };
  return (
    <View style={{ gap: th.space(5) }}>
      <ListGroup>
        {STEPS.map((s) => {
          const done = isStepDone(s.id, progress);
          return (
            <ListRow
              key={s.id}
              leading={<Icon icon={done ? CheckCircle2 : CircleDashed} size={22} color={done ? th.colors.success.solid : th.colors.textSubtle} />}
              title={t(s.title)}
              subtitle={done ? summary(s.id) ?? t('Ho gaya') : t('Chhor diya — baad me Settings se')}
              trailing={<Button variant="link" size="sm" onPress={() => onJump(s.id)}>{done ? t('Badlein') : t('Abhi karein')}</Button>}
            />
          );
        })}
      </ListGroup>
      <View style={{ gap: th.space(2), padding: th.space(4), borderRadius: th.radius('xl'), borderWidth: 1, borderColor: th.colors.border, backgroundColor: th.colors.surface }}>
        <Switch value={value.wantsTutorial} onChange={(wantsTutorial) => onChange({ wantsTutorial })} label={t('Pehli dafa chhota sa guide dikhayein')} />
        <Switch value={value.subscribedToTips} onChange={(subscribedToTips) => onChange({ subscribedToTips })} label={t('Kaam ki tips email par bhejein')} description={t('Kabhi kabhar, aur kabhi bhi band kar sakte hain.')} />
      </View>
    </View>
  );
}
