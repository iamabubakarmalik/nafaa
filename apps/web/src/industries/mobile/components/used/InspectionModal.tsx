/**
 * Check of a used phone before it goes on sale: screen, body, camera, sound,
 * charging, buttons, fingerprint/face, battery health and account locks. A
 * phone that needs work goes to "Repair me" with the repair cost added to its
 * cost; otherwise it becomes ready to sell.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input, Modal, Switch, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { usedPhonesApi, type UsedPhone } from '../../api/used-phones.api';
import { USED_KEY, apiError, digits, money } from '../meta';
import { t } from '@core/i18n';

const SCREEN = ['Bilkul saaf', 'Halki lakeerein', 'Gehri lakeerein', 'Toota hua'];
const BODY = ['Bilkul saaf', 'Halke nishan', 'Dents', 'Toota hua'];
const CHECKS: Array<[Check, string]> = [
  ['cameraWorks', t('Camera')], ['speakerWorks', t('Speaker')], ['microphoneWorks', t('Mic')], ['chargingPortWorks', t('Charging')],
  ['buttonsWork', t('Buttons')], ['faceIdFingerprintWorks', t('Fingerprint / Face')], ['imeiUnlocked', t('SIM chalti hai')], ['icloudUnlocked', t('iCloud / Google lock nahi')],
];
type Check = 'cameraWorks' | 'speakerWorks' | 'microphoneWorks' | 'chargingPortWorks' | 'buttonsWork' | 'faceIdFingerprintWorks' | 'imeiUnlocked' | 'icloudUnlocked';

export function InspectionModal({ phone, onClose }: { phone: UsedPhone; onClose: () => void }) {
  const qc = useQueryClient();
  const [screen, setScreen] = useState(SCREEN[0]);
  const [body, setBody] = useState(BODY[0]);
  const [ok, setOk] = useState<Record<Check, boolean>>({
    cameraWorks: true, speakerWorks: true, microphoneWorks: true, chargingPortWorks: true, buttonsWork: true, faceIdFingerprintWorks: true, imeiUnlocked: true, icloudUnlocked: true,
  });
  const [battery, setBattery] = useState('');
  const [software, setSoftware] = useState('');
  const [needsRepair, setNeedsRepair] = useState(false);
  const [repairCost, setRepairCost] = useState('');
  const [advice, setAdvice] = useState('');
  const failed = CHECKS.filter(([k]) => !ok[k]).map(([, l]) => l);
  const locked = !ok.icloudUnlocked;

  const save = useMutation({
    mutationFn: () => usedPhonesApi.addInspection(phone.id, {
      screenCondition: screen, bodyCondition: body, ...ok, batteryHealth: battery ? Math.min(Number(battery), 100) : undefined,
      softwareIssues: software.trim() || undefined, needsRepair, estimatedRepairCost: needsRepair ? Number(repairCost) || 0 : undefined,
      recommendedActions: advice.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success(needsRepair ? t('Check save — phone "Repair me" chala gaya') : t('Check save — phone bikne ko tayyar'));
      [USED_KEY, 'used-phones-stats', 'mobile-pos-catalog'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(apiError(e, t('Check save nahi hua'))),
  });

  const pill = (on: boolean) => cn('h-8 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1', on ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200');
  return (
    <Modal open onClose={onClose} size="lg" title={t('Check — {{brand}} {{model}}', { brand: phone.brand, model: phone.model })} description={t('{{usedPhoneCode}} · IMEI {{imei1}}', { usedPhoneCode: phone.usedPhoneCode, imei1: phone.imei1 })}
      footer={<>
        {failed.length > 0 && <span className="me-auto text-[0.8125rem] text-amber-800">{t('{{count}} cheezein kharab: {{value}}', { count: failed.length, value: failed.join(', ') })}</span>}
        <Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending}>{needsRepair ? t('Save — repair me bhejein') : t('Save — bikne ko tayyar')}</Button>
      </>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><span className="text-[0.8125rem] font-medium text-slate-700">{t('Screen')}</span><div className="mt-1.5 flex flex-wrap gap-1">{SCREEN.map((x) => <button key={x} type="button" onClick={() => setScreen(x)} className={pill(screen === x)}>{x}</button>)}</div></div>
          <div><span className="text-[0.8125rem] font-medium text-slate-700">{t('Body')}</span><div className="mt-1.5 flex flex-wrap gap-1">{BODY.map((x) => <button key={x} type="button" onClick={() => setBody(x)} className={pill(body === x)}>{x}</button>)}</div></div>
        </div>
        <div>
          <span className="text-[0.8125rem] font-medium text-slate-700">{t('Kya theek chal raha hai (kharab par click karein)')}</span>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {CHECKS.map(([k, label]) => (
              <button key={k} type="button" onClick={() => setOk((x) => ({ ...x, [k]: !x[k] }))}
                className={cn('h-9 rounded-lg px-2 text-[0.8125rem] font-medium ring-1', ok[k] ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-300')}>
                {ok[k] ? '✓' : '✗'} {label}
              </button>
            ))}
          </div>
          {locked && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] font-medium text-rose-800 ring-1 ring-rose-200">{t('Account lock wala phone aage nahi bikta — malik se khulwayein.')}</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('Battery health %')} inputMode="numeric" maxLength={3} value={battery} onChange={(e) => setBattery(digits(e.target.value))} hint={t('iPhone: Settings → Battery')} />
          <Input label={t('Software ki kharabi')} value={software} onChange={(e) => setSoftware(e.target.value)} hint={t('Marzi hai')} />
        </div>
        <Switch checked={needsRepair} onChange={(e) => setNeedsRepair(e.target.checked)} label={t('Bechne se pehle repair chahiye')} description={t('Repair ka kharcha phone ki cost me judega')} />
        {needsRepair && (
          <Input label={t('Repair ka kharcha')} inputMode="decimal" value={repairCost} onChange={(e) => setRepairCost(money(e.target.value))}
            hint={t('Nayi cost: {{formatPKR}}', { formatPKR: formatPKR(Number(phone.buybackPrice) + (Number(repairCost) || 0)) })} />
        )}
        <Textarea label={t('Mashwara')} rows={2} value={advice} onChange={(e) => setAdvice(e.target.value)} placeholder={t('Battery badlein, glass lagayein…')} maxLength={500} />
      </div>
    </Modal>
  );
}
