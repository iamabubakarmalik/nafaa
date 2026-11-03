/** Terms of service and privacy policy, one section per card. */

import { router, useLocalSearchParams } from 'expo-router';
import { FileText, HelpCircle, Lock, Shield } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Card, Icon, ListGroup, ListRow, Screen, Segmented, Text, useTheme } from '@/design';
import { LEGAL_UPDATED, PRIVACY, TERMS } from '../lib/content';

type Tab = 'terms' | 'privacy';

export function LegalScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'privacy' ? 'privacy' : 'terms');
  const sections = tab === 'terms' ? TERMS : PRIVACY;

  return (
    <Screen title={t('Terms & privacy')} subtitle={t('Aakhri tabdeeli: {{date}}', { date: LEGAL_UPDATED })} narrow>
      <Segmented value={tab} onChange={setTab} options={[
        { value: 'terms', label: t('Terms'), icon: FileText },
        { value: 'privacy', label: t('Privacy'), icon: Shield },
      ]} />
      {tab === 'privacy' && (
        <Card tone="success">
          <View style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'center' }}>
            <Icon icon={Lock} size={18} tone="success" />
            <Text size="sm" weight="medium" style={{ flex: 1 }}>{t('Aap ka karobari data aap ka hai — kabhi bhi Backup se poora download kar sakte hain.')}</Text>
          </View>
        </Card>
      )}
      {sections.map((s) => (
        <Card key={s.title} title={s.title}>
          <Text size="sm" tone="secondary">{s.content}</Text>
        </Card>
      ))}
      <ListGroup>
        <ListRow icon={HelpCircle} title={t('Help')} chevron onPress={() => router.push('/help' as never)} />
      </ListGroup>
    </Screen>
  );
}
