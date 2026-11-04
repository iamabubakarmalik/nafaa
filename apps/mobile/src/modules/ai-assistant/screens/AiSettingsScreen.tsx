/** Settings -> Nafaa AI: turn data sharing for Nafaa AI on or off for this person on this device. */

import { t } from '@/core/i18n';
import { SettingSwitch, SettingsGroup, SettingsTemplate } from '@/design';
import { setAiConsent, useAiConsent } from '../lib/consent';

export function AiSettingsScreen() {
  const consent = useAiConsent();
  return (
    <SettingsTemplate title={t('Nafaa AI')}>
      <SettingsGroup footnote={t('Band karne par Nafaa AI sawal nahi bhejega. Purani chats wese hi rahengi.')}>
        <SettingSwitch
          label={t('Nafaa AI ko data bhejne dein')}
          description={t('Nafaa AI aap ke sawal aur dukaan ka zaroori data (sale, stock waghera) ek mehfooz AI service ko bhejta hai taa ke jawab ban sake. Ye data ads ya kisi aur kaam mein istemal nahi hota.')}
          value={consent === 'allowed'}
          onChange={(on) => setAiConsent(on ? 'allowed' : 'declined')}
        />
      </SettingsGroup>
    </SettingsTemplate>
  );
}
