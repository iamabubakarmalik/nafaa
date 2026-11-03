/**
 * When the API answers 402 (trial or plan ended) a dialog explains it and
 * leads to the plan page. It never logs anyone out.
 */

import { Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { t } from '@/core/i18n';
import { on } from '@/core/events';
import { useAuthStore } from '@/core/auth/store';
import { Button, Dialog } from '@/design';

export function SubscriptionGate() {
  const [message, setMessage] = useState<string | null>(null);
  const role = useAuthStore((s) => s.user?.role);
  useEffect(() => on('subscription:required', ({ message: m }) => setMessage(m ?? '')), []);
  if (message === null) return null;
  const owner = role === 'OWNER' || role === 'SUPER_ADMIN';
  return (
    <Dialog
      open
      onClose={() => setMessage(null)}
      icon={Sparkles}
      tone="warning"
      title={t('Aap ka plan khatam ho gaya hai')}
      message={message || (owner ? t('Kaam jaari rakhne ke liye plan lein. Aap ka sara data mehfooz hai.') : t('Dukaan ke malik se kahein ke plan renew karein. Aap ka data mehfooz hai.'))}
      actions={(
        <>
          <Button variant="secondary" onPress={() => setMessage(null)}>{t('Baad me')}</Button>
          {owner && <Button onPress={() => { setMessage(null); router.push('/plan'); }}>{t('See plans')}</Button>}
        </>
      )}
    />
  );
}
