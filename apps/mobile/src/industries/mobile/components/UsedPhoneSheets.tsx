/** Inspection sheet (web InspectionModal) and the discard sheet for a used phone. */

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { Button, ChipGroup, Input, MoneyInput, Sheet, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { usedPhonesApi, type UsedPhone } from '../api';
import { USED_KEY, refreshMobile } from '../meta';

const SCREEN = ['Bilkul saaf', 'Halki lakeerein', 'Gehri lakeerein', 'Toota hua'];
const BODY = ['Bilkul saaf', 'Halke nishan', 'Dents', 'Toota hua'];
type Check = 'cameraWorks' | 'speakerWorks' | 'microphoneWorks' | 'chargingPortWorks' | 'buttonsWork' | 'faceIdFingerprintWorks' | 'imeiUnlocked' | 'icloudUnlocked';
const CHECKS: Array<[Check, string]> = [
  ['cameraWorks', 'Camera'], ['speakerWorks', 'Speaker'], ['microphoneWorks', 'Mic'], ['chargingPortWorks', 'Charging'],
  ['buttonsWork', 'Buttons'], ['faceIdFingerprintWorks', 'Fingerprint / Face'], ['imeiUnlocked', 'SIM chalti hai'], ['icloudUnlocked', 'iCloud / Google lock nahi'],
];

/** Check of a used phone before it goes on sale; a phone that needs work goes to "Repair me". */
export function InspectionSheet({ phone, onClose }: { phone: UsedPhone | null; onClose: () => void }) {
  const th = useTheme();
  const [screen, setScreen] = useState(SCREEN[0]);
  const [body, setBody] = useState(BODY[0]);
  const [ok, setOk] = useState<Record<Check, boolean>>({ cameraWorks: true, speakerWorks: true, microphoneWorks: true, chargingPortWorks: true, buttonsWork: true, faceIdFingerprintWorks: true, imeiUnlocked: true, icloudUnlocked: true });
  const [battery, setBattery] = useState('');
  const [software, setSoftware] = useState('');
  const [needsRepair, setNeedsRepair] = useState(false);
  const [repairCost, setRepairCost] = useState<number | null>(null);
  const [advice, setAdvice] = useState('');
  const failed = CHECKS.filter(([k]) => !ok[k]).map(([, l]) => t(l));
  const save = useMutation({
    mutationFn: () => usedPhonesApi.addInspection(phone!.id, {
      screenCondition: screen, bodyCondition: body, ...ok, batteryHealth: battery ? Math.min(Number(battery), 100) : undefined, softwareIssues: software.trim() || undefined,
      needsRepair, estimatedRepairCost: needsRepair ? repairCost ?? 0 : undefined, recommendedActions: advice.trim() || undefined,
    }),
    onSuccess: () => { toast.success(needsRepair ? t('Check save — phone "Repair me" chala gaya') : t('Check save — phone bikne ko tayyar')); refreshMobile([USED_KEY]); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Check save nahi hua'))),
  });
  return (
    <Sheet open={!!phone} onClose={onClose} height={0.94} title={phone ? t('Check — {{brand}} {{model}}', { brand: phone.brand, model: phone.model }) : undefined} description={phone ? `${phone.usedPhoneCode} · IMEI ${phone.imei1}` : undefined}
      footer={<View style={{ gap: th.space(1) }}>
        {failed.length > 0 && <Text size="xs" tone="warning">{t('{{count}} cheezein kharab: {{value}}', { count: failed.length, value: failed.join(', ') })}</Text>}
        <Button fullWidth size="lg" loading={save.isPending} onPress={() => save.mutate()}>{needsRepair ? t('Save — repair me bhejein') : t('Save — bikne ko tayyar')}</Button>
      </View>}>
      <View style={{ gap: th.space(3) }}>
        <Text size="sm" weight="medium" tone="secondary">{t('Screen')}</Text>
        <ChipGroup wrap value={screen} onChange={setScreen} options={SCREEN.map((x) => ({ value: x, label: t(x) }))} />
        <Text size="sm" weight="medium" tone="secondary">{t('Body')}</Text>
        <ChipGroup wrap value={body} onChange={setBody} options={BODY.map((x) => ({ value: x, label: t(x) }))} />
        <Text size="sm" weight="medium" tone="secondary">{t('Kya theek chal raha hai (kharab par click karein)')}</Text>
        {CHECKS.map(([k, label]) => <Switch key={k} value={ok[k]} onChange={(v) => setOk((o) => ({ ...o, [k]: v }))} label={t(label)} />)}
        {!ok.icloudUnlocked && <Text size="xs" tone="danger">{t('Locked phone mat khareedein — baad me bikna mushkil hoga.')}</Text>}
        <Input label={t('Battery health %')} value={battery} onChangeText={(v) => setBattery(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" ltr />
        <TextArea label={t('Software masle')} value={software} onChangeText={setSoftware} />
        <Switch value={needsRepair} onChange={setNeedsRepair} label={t('Repair chahiye')} />
        {needsRepair && <MoneyInput label={t('Repair ka andaza (cost me judega)')} value={repairCost} onChangeValue={setRepairCost} />}
        <TextArea label={t('Salah')} value={advice} onChangeText={setAdvice} />
      </View>
    </Sheet>
  );
}

export function DiscardSheet({ phone, onClose }: { phone: UsedPhone | null; onClose: () => void }) {
  const th = useTheme();
  const [reason, setReason] = useState('');
  const discard = useMutation({
    mutationFn: () => usedPhonesApi.discard(phone!.id, reason.trim() || undefined),
    onSuccess: () => { toast.success(t('Phone hata diya')); refreshMobile([USED_KEY], true); setReason(''); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hata'))),
  });
  return (
    <Sheet open={!!phone} onClose={onClose} title={t('Phone hata dein?')} description={phone ? `${phone.brand} ${phone.model} · ${phone.usedPhoneCode}` : undefined}
      footer={<Button fullWidth size="lg" variant="danger" loading={discard.isPending} onPress={() => discard.mutate()}>{t('Hata dein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Text size="sm" tone="secondary">{t('Ye phone stock se nikal jayega. Diye hue paise wapas nahi hote.')}</Text>
        <TextArea label={t('Wajah (marzi)')} value={reason} onChangeText={setReason} />
      </View>
    </Sheet>
  );
}
