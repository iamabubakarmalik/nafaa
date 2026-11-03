/**
 * Shown once after a login is made or its password is reset: the email and
 * password to hand over, with copy, WhatsApp and the share sheet. The
 * password is not stored anywhere after this closes.
 */

import * as Clipboard from 'expo-clipboard';
import { Copy, KeyRound, MessageCircle, Share2 } from 'lucide-react-native';
import { Linking, Share, View } from 'react-native';
import { APP_URL } from '@/core/api/client';
import { t } from '@/core/i18n';
import { Button, DetailRow, Icon, Row, Sheet, Text, toast, useTheme } from '@/design';
import { cleanPhone, waLink } from '../lib/meta';

export interface LoginSlip { name: string; email: string; password: string; role: string; branch: string | null }

/** The message sent to the staff member (a customer-facing text, so it is not translated by screen language). */
function slipText(s: LoginSlip) {
  return `Assalam o alaikum ${s.name},\nNafaa me aap ka login:\nEmail: ${s.email}\nPassword: ${s.password}\n${APP_URL}/login\nPehli dafa login ke baad password badal lein.`;
}

export function LoginSlipSheet({ slip, phone, title, onClose }: { slip: LoginSlip; phone?: string | null; title: string; onClose: () => void }) {
  const th = useTheme();
  const text = slipText(slip);
  const wa = cleanPhone(phone);
  const copy = async () => { await Clipboard.setStringAsync(text); toast.success(t('Copy ho gaya')); };
  return (
    <Sheet open onClose={onClose} title={title} description={t('Yeh password sirf abhi dikh raha hai — band karne ke baad dobara nahi milega')}
      footer={<Button fullWidth onPress={onClose}>{t('Ho gaya')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <View style={{ backgroundColor: th.colors.surfaceMuted, borderRadius: th.radius('lg') }}>
          <DetailRow label={t('Naam')} value={slip.name} />
          <DetailRow label={t('Role')} value={slip.role} />
          <DetailRow label={t('Branch')} value={slip.branch ?? t('Sab branches')} />
          <DetailRow label={t('Login (email)')} value={<Text ltr weight="medium">{slip.email}</Text>} />
          <DetailRow last label={t('Password')} value={<Row gap={2}><Icon icon={KeyRound} size={16} /><Text ltr weight="bold" size="lg" style={{ fontFamily: 'Courier' }}>{slip.password}</Text></Row>} />
        </View>
        <Row gap={2} wrap>
          <Button variant="secondary" icon={Copy} onPress={() => void copy()}>{t('Copy')}</Button>
          <Button variant="secondary" icon={Share2} onPress={() => void Share.share({ message: text })}>{t('Share')}</Button>
          {wa && <Button variant="success" icon={MessageCircle} onPress={() => void Linking.openURL(waLink(wa, text))}>{t('WhatsApp par bhejein')}</Button>}
        </Row>
        <Text size="xs" tone="muted">{t('Bande ko kahein ke pehli dafa login ke baad Profile se apna password badal le.')}</Text>
      </View>
    </Sheet>
  );
}
