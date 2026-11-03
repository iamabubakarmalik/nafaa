/**
 * Settings → Language & time. The app language is per person (saved to the
 * account, follows them to the web); the shop's bill language, currency and
 * time zone are business settings.
 */

import { Receipt } from 'lucide-react-native';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { LanguageCards, LANGUAGE_HEADING } from '@/core/i18n/components/LanguagePicker';
import { usePermissions } from '@/core/permissions';
import { Card, ListGroup, ListRow, Screen, Text, useTheme } from '@/design';

export function LanguageScreen() {
  const th = useTheme();
  const { isOwner } = usePermissions();
  return (
    <Screen title={t('Language & time')} narrow>
      <Card title={<Text size="md" weight="bold" ltr>{LANGUAGE_HEADING}</Text>} description={t('App ki zaban sirf aap ke liye hai. Web par bhi yahi khulegi.')}>
        <LanguageCards />
      </Card>
      <View style={{ gap: th.space(2) }}>
        <Text size="sm" tone="muted">{t('Bill aur customer messages dukaan ki zaban me jaate hain, chahe counter par koi bhi zaban ho.')}</Text>
        {isOwner && (
          <ListGroup>
            <ListRow icon={Receipt} title={t('Bill ki zaban, currency aur time zone')} subtitle={t('Poori dukaan ke liye')} chevron onPress={() => router.push('/settings/localization' as never)} />
          </ListGroup>
        )}
      </View>
    </Screen>
  );
}
