/**
 * One-time sheet asking before Nafaa AI sends questions and shop data out to
 * build an answer. "Allow" asks the held-back question right away; the choice
 * can be changed later in Settings -> Nafaa AI.
 */

import { Ban, Settings2, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, Icon, NafaaAiMark, Sheet, Text, useTheme } from '@/design';
import { closeAiConsent, setAiConsent, useAiConsentUi } from '../lib/consent';
import { useAiStore, type AiContext } from '../store';

function Point({ icon, text }: { icon: LucideIcon; text: string }) {
  const th = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: th.space(3), alignItems: 'flex-start' }}>
      <View style={{ width: 32, height: 32, borderRadius: th.radius('md'), backgroundColor: th.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon icon={icon} size={16} color={th.colors.brand.text} />
      </View>
      <Text size="sm" style={{ flex: 1, paddingTop: th.space(1) }}>{text}</Text>
    </View>
  );
}

export function AiConsentSheet() {
  const th = useTheme();
  const open = useAiConsentUi((s) => s.sheetOpen);

  const allow = () => {
    const q = useAiConsentUi.getState().queued;
    setAiConsent('allowed');
    closeAiConsent();
    if (q) void useAiStore.getState().send(q.text, q.context as AiContext, q.via);
  };
  const notNow = () => {
    setAiConsent('declined');
    closeAiConsent();
  };

  return (
    <Sheet
      open={open}
      onClose={() => { if (useAiConsentUi.getState().sheetOpen) notNow(); }}
      hideClose
      footer={(
        <View style={{ flexDirection: 'row', gap: th.space(2) }}>
          <View style={{ flex: 1 }}><Button variant="secondary" fullWidth onPress={notNow}>{t('Not now')}</Button></View>
          <View style={{ flex: 1 }}><Button variant="primary" fullWidth onPress={allow}>{t('Allow')}</Button></View>
        </View>
      )}
    >
      <View style={{ gap: th.space(4), paddingBottom: th.space(2) }}>
        <View style={{ alignItems: 'center', gap: th.space(3), paddingTop: th.space(2) }}>
          <NafaaAiMark size={56} />
          <Text size="lg" weight="bold" align="center">{t('Nafaa AI aur aap ka data')}</Text>
          <Text size="sm" tone="muted" align="center">
            {t('Nafaa AI aap ke sawal aur dukaan ka zaroori data (sale, stock waghera) ek mehfooz AI service ko bhejta hai taa ke jawab ban sake. Ye data ads ya kisi aur kaam mein istemal nahi hota.')}
          </Text>
        </View>
        <View style={{ gap: th.space(3) }}>
          <Point icon={ShieldCheck} text={t('Sirf aap ke sawal ka jawab banane ke liye')} />
          <Point icon={Ban} text={t('Ads ya kisi aur kaam ke liye nahi')} />
          <Point icon={Settings2} text={t('Settings → Nafaa AI mein kabhi bhi band karein')} />
        </View>
      </View>
    </Sheet>
  );
}
