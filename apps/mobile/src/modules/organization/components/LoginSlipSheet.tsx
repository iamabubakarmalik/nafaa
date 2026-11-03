/** The new login's details, shown once after creating it, with a share button. */

import { Copy, Share2 } from 'lucide-react-native';
import { Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { t } from '@/core/i18n';
import { Button, Card, Row, Sheet, Text, toast, useTheme } from '@/design';
import { KV } from './parts';

export interface LoginSlip { name: string; email: string; password: string; role: string; branch?: string | null }

export function LoginSlipSheet({ slip, title, onClose }: { slip: LoginSlip | null; title?: string; onClose: () => void }) {
  const th = useTheme();
  const text = slip
    ? [t('Nafaa login'), `${t('Naam')}: ${slip.name}`, `${t('Role')}: ${slip.role}`, slip.branch ? `${t('Branch')}: ${slip.branch}` : null, `Email: ${slip.email}`, `${t('Password')}: ${slip.password}`, t('Pehli dafa login karke password badal lein.')].filter(Boolean).join('\n')
    : '';
  return (
    <Sheet open={!!slip} onClose={onClose} title={title ?? t('Login ban gaya')}
      footer={(
        <Row gap={2}>
          <Button variant="secondary" icon={Copy} style={{ flex: 1 }} onPress={async () => { await Clipboard.setStringAsync(text); toast.success(t('Copy ho gaya')); }}>{t('Copy')}</Button>
          <Button icon={Share2} style={{ flex: 1 }} onPress={() => Share.share({ message: text })}>{t('Share')}</Button>
        </Row>
      )}>
      {slip && (
        <View style={{ gap: th.space(3) }}>
          <Text size="sm" tone="muted">{t('Yeh password sirf ab dikhta hai. Share kar dein — banda pehli dafa login karke badal le.')}</Text>
          <Card>
            <View style={{ gap: th.space(2) }}>
              <KV label={t('Naam')} value={slip.name} />
              <KV label={t('Role')} value={slip.role} />
              {!!slip.branch && <KV label={t('Branch')} value={slip.branch} />}
              <KV label="Email" value={<Text size="sm" weight="semibold" ltr>{slip.email}</Text>} />
              <KV label={t('Password')} value={<Text size="md" weight="bold" ltr tabular>{slip.password}</Text>} />
            </View>
          </Card>
        </View>
      )}
    </Sheet>
  );
}
