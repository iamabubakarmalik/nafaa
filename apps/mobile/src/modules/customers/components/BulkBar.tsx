/** Actions for the selected customers: VIP, copy numbers, CSV, delete (customers with history are only switched off). */

import { Copy, Crown, Download, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { confirm, IconButton, Row, Text, toast, useTheme } from '@/design';
import { customersApi, type DirectoryCustomer } from '../api/customers';
import { copyText } from '../lib/contact';

export function BulkBar({ selected, canEdit, onClear, onExport, onDone }: {
  selected: DirectoryCustomer[]; canEdit: boolean; onClear: () => void; onExport: () => void; onDone: () => void;
}) {
  const th = useTheme();
  const online = useOnlineStatus();
  const [busy, setBusy] = useState(false);
  const needNet = () => { if (!online) { toast.warning(t('Is kaam ke liye internet chahiye')); return true; } return false; };

  const vip = async (on: boolean) => {
    if (needNet()) return;
    const targets = selected.filter((c) => c.isVip !== on && !c.pending);
    if (!targets.length) return toast.info(on ? t('Sab pehle se VIP hain') : t('Koi VIP nahi'));
    setBusy(true);
    const res = await Promise.allSettled(targets.map((c) => customersApi.toggleVip(c.id)));
    const bad = res.filter((r) => r.status === 'rejected').length;
    toast.success(on ? t('{{count}} VIP bana diye', { count: targets.length - bad }) : t('{{count}} aam kar diye', { count: targets.length - bad }));
    if (bad) toast.error(t('{{bad}} nahi hue', { bad }));
    setBusy(false);
    onDone();
  };
  const copy = async () => {
    const nums = selected.map((c) => c.phone).filter(Boolean) as string[];
    if (!nums.length) return toast.error(t('Kisi ka phone nahi'));
    await copyText(nums.join('\n'));
  };
  const remove = async () => {
    if (needNet()) return;
    const ok = await confirm({
      title: t('{{count}} customer mitayein?', { count: selected.length }), tone: 'danger', confirmLabel: t('Haan'),
      message: t('Jin ki kabhi sale ya khata nahi hua woh mit jayenge. Baqi sirf band honge, taake purane bill aur khata salamat rahein.'),
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await Promise.allSettled(selected.filter((c) => !c.pending).map((c) => customersApi.remove(c.id)));
      const kept = res.filter((r) => r.status === 'fulfilled' && (r.value as { softDeleted?: boolean }).softDeleted).length;
      const gone = res.filter((r) => r.status === 'fulfilled').length - kept;
      if (gone) toast.success(t('{{gone}} mita diye', { gone }));
      if (kept) toast.info(t('{{kept}} ki sale ya khata hai — mitane ki jagah band kar diye', { kept }));
      if (res.length - gone - kept) toast.error(t('{{bad}} nahi hue', { bad: res.length - gone - kept }));
    } catch (e) { toast.error(apiErrorMessage(e)); }
    setBusy(false);
    onDone();
  };

  return (
    <View style={{ position: 'absolute', start: th.space(3), end: th.space(3), bottom: th.space(3), backgroundColor: th.colors.neutral.solid, borderRadius: th.radius('xl'), padding: th.space(1.5), paddingStart: th.space(4) }}>
      <Row gap={1} justify="between">
        <Text weight="semibold" color={th.colors.neutral.onSolid}>{t('{{count}} chune', { count: selected.length })}</Text>
        <Row gap={0.5}>
          {canEdit && <IconButton icon={Crown} label={t('VIP')} color={th.colors.neutral.onSolid} disabled={busy} onPress={() => void vip(true)} />}
          <IconButton icon={Copy} label={t('Number')} color={th.colors.neutral.onSolid} onPress={() => void copy()} />
          <IconButton icon={Download} label={t('CSV')} color={th.colors.neutral.onSolid} onPress={onExport} />
          {canEdit && <IconButton icon={Trash2} label={t('Mitayein')} color={th.colors.danger.solid} disabled={busy} onPress={() => void remove()} />}
          <IconButton icon={X} label={t('Chunna khatam')} color={th.colors.neutral.onSolid} onPress={onClear} />
        </Row>
      </Row>
    </View>
  );
}
