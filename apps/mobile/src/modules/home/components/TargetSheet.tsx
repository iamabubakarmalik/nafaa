/**
 * Daily sales target (web Customize → Target). Saved in the shared layout,
 * so the ring shows the same target on the web and on every phone.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Chip, MoneyInput, Sheet, Text, toast, useTheme } from '@/design';
import { useDashboard } from '../api/dashboard';
import { useHomeContext } from '../layout/useHomeLayout';

export function TargetSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const { target, setTarget } = useHomeContext();
  const { data } = useDashboard();
  const [value, setValue] = useState<number | null>(target || null);
  useEffect(() => { if (open) setValue(target || null); }, [open, target]);

  const week = data?.salesTrend7Days ?? [];
  const avg = week.length ? week.reduce((x, p) => x + Number(p.sales || 0), 0) / week.length : 0;
  const suggestions = avg > 0 ? [1, 1.1, 1.25].map((m) => Math.ceil((avg * m) / 500) * 500) : [];
  const tags = [t('ausat'), '+10%', '+25%'];

  const save = (n: number) => {
    setTarget(n);
    toast.success(n > 0 ? t('Target lag gaya') : t('Target hat gaya'));
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('Rozana target')}
      description={t('Rozana kitni sale ka irada hai? Dashboard ke upar ring dikhayegi ke aaj kitna poora hua. Ye sirf aap ke liye hai.')}
      footer={<Button fullWidth size="lg" onPress={() => save(Math.max(0, Math.round(value ?? 0)))}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(4) }}>
        <MoneyInput label={t('Rozana target')} value={value} onChangeValue={setValue} placeholder={t('e.g. 50000')} decimals={false} autoFocus={!target} />
        {suggestions.length > 0 && (
          <View style={{ gap: th.space(2) }}>
            <Text size="xs" tone="muted">{t('Pichhle 7 din ka ausat {{avg}} — in me se chunein:', { avg: formatMoney(avg) })}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
              {suggestions.map((s, i) => (
                <Chip key={`${s}-${i}`} label={`${formatMoney(s)} · ${tags[i]}`} selected={value === s} onPress={() => setValue(s)} />
              ))}
            </View>
          </View>
        )}
        {target > 0 && <Button variant="ghost" onPress={() => save(0)}>{t('Target hatayein')}</Button>}
      </View>
    </Sheet>
  );
}
