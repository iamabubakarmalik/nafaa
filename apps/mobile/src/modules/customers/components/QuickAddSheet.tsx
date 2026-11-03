/** Add a customer with just a name and phone (works without internet); warns when the phone already belongs to someone. */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { OfflineRuleError, useCustomerSearch } from '@/core/offline';
import { Button, Input, Sheet, Switch, Text, toast, useDebouncedValue, useTheme } from '@/design';
import { createCustomer } from '../lib/actions';
import { digitsOf, formatPhone, validPhone } from '../lib/phone';

export function QuickAddSheet({ open, onClose, onCreated, initialName = '' }: {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: { id: string; name: string; phone: string | null }) => void;
  initialName?: string;
}) {
  const th = useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vip, setVip] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setName(initialName); setPhone(''); setVip(false); } }, [open, initialName]);
  const typed = useDebouncedValue(digitsOf(phone), 300);
  const dup = useCustomerSearch({ query: typed, limit: 2 }, { enabled: open && typed.length >= 10 });
  const existing = typed.length >= 10 ? dup.data?.[0] : undefined;
  const ok = name.trim().length > 0 && validPhone(phone);

  const save = async () => {
    if (!ok) return;
    setBusy(true);
    try {
      const body = { name: name.trim(), phone: phone.trim() || undefined, isVip: vip };
      const id = await createCustomer(body);
      toast.success(t('{{name}} jor diya', { name: body.name }));
      onClose();
      onCreated({ id, name: body.name, phone: body.phone ?? null });
    } catch (e) {
      toast.error(e instanceof OfflineRuleError ? e.message : apiErrorMessage(e, t('Nahi bana')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('Naya customer')} description={t('Baqi details baad mein bhi bhar sakte hain')}
      footer={<Button fullWidth size="lg" disabled={!ok} loading={busy} onPress={() => void save()}>{t('Jor dein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={name} onChangeText={setName} placeholder={t('Jaise: Ahmed bhai')} autoFocus autoCapitalize="words" />
        <Input label={t('Phone')} value={phone} onChangeText={(v) => setPhone(formatPhone(v))} keyboardType="phone-pad" placeholder="0300-1234567"
          error={!validPhone(phone) ? t('Mobile number theek nahi (03xx-xxxxxxx)') : undefined} />
        {existing && (
          <View style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.warning.soft }}>
            <Text size="sm" tone="warning">{t('Yeh number pehle se {{name}} ka hai.', { name: existing.name })}</Text>
          </View>
        )}
        <Switch value={vip} onChange={setVip} label={t('VIP customer')} />
      </View>
    </Sheet>
  );
}
