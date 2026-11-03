/** An old part (core) the customer gave back: note it with its value; it comes off the next bill as a trade-in (web AddCoreModal / CoreTakeBack). */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { Button, Input, MoneyInput, Sheet, toast, useTheme } from '@/design';
import { coreReturnsApi } from '../api';
import { CORE_KEY, refreshAuto } from '../meta';

export function AddCoreSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone?: () => void }) {
  const th = useTheme();
  const [name, setName] = useState('');
  const [value, setValue] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setName(''); setValue(null); } }, [open]);
  const ok = !!name.trim() && (value ?? 0) > 0;
  const save = async () => {
    if (!ok) return;
    setBusy(true);
    try {
      await coreReturnsApi.create({ description: name.trim(), value: value ?? 0 });
      toast.success(t('Purana part likh liya — counter par Trade-in me chunein'));
      refreshAuto([CORE_KEY]);
      onDone?.();
      onClose();
    } catch (e) { toast.error(apiErrorMessage(e, t('Nahi likha'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Purana part')} description={t('Customer ne jo part wapas diya — qeemat agle bill se katti hai')}
      footer={<Button fullWidth size="lg" disabled={!ok} loading={busy} onPress={() => void save()}>{t('Likh lein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Kaunsa part')} value={name} onChangeText={setName} placeholder={t('Purani battery 12V')} />
        <MoneyInput label={t('Qeemat')} value={value} onChangeValue={setValue} placeholder="1500" hint={t('Jitna bill se kam karna hai')} />
      </View>
    </Sheet>
  );
}
