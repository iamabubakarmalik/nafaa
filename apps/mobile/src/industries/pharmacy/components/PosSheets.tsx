/**
 * Sheets the pharmacy counter opens before a medicine goes on the bill: the
 * patient and doctor of a register medicine (written on the line for the
 * narcotic register) and same-formula substitutes for an item that is out of
 * stock. Rendered by the shared counter through PosIndustryConfig.Overlay.
 */

import { useQuery } from '@tanstack/react-query';
import { ArrowRightLeft, ShieldAlert } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { cnicOk, drName, formatCnic, rxNote, type RxDetails } from '@nafaa/core/industries/pharmacy';
import { t } from '@/core/i18n';
import { Amount, Button, Card, ListRow, Sheet, Text, Input, Row, ChipGroup, useTheme } from '@/design';
import { create } from 'zustand';
import type { AddOptions } from '@/modules/pos/engine/usePos';
import { doctorsApi, type Doctor } from '../api';
import { DOCTORS_KEY } from '../meta';

export interface SubOption { id: string; name: string; price: number; stock: number; unit: string; line: string }

interface PosAsk {
  rx: { productId: string; name: string; opts: AddOptions; onDone: (note: string) => void } | null;
  sub: { productId: string; name: string; price: number; generic: string; options: SubOption[]; onPick: (o: SubOption) => void; onSellAnyway?: () => void } | null;
}

export const usePharmacyAsk = create<PosAsk>(() => ({ rx: null, sub: null }));
const close = () => usePharmacyAsk.setState({ rx: null, sub: null });
export const askRx = (rx: NonNullable<PosAsk['rx']>) => usePharmacyAsk.setState({ rx });
export const askSubstitute = (sub: NonNullable<PosAsk['sub']>) => usePharmacyAsk.setState({ sub });

export function PharmacyOverlay() {
  return (
    <>
      <RxSheet />
      <SubstituteSheet />
    </>
  );
}

function RxSheet() {
  const th = useTheme();
  const ask = usePharmacyAsk((s) => s.rx);
  const [d, setD] = useState<RxDetails>({ doctorName: '', doctorRegNumber: '', patientName: '', patientCnic: '' });
  const [tried, setTried] = useState(false);
  useEffect(() => { if (ask) { setD({ doctorName: '', doctorRegNumber: '', patientName: '', patientCnic: '' }); setTried(false); } }, [ask]);
  const { data: doctors = [] } = useQuery({ queryKey: [DOCTORS_KEY, 'active'], queryFn: () => doctorsApi.list({ isActive: true }), staleTime: 5 * 60_000, enabled: !!ask });
  const set = (k: keyof RxDetails, v: string) => setD((x) => ({ ...x, [k]: v }));
  const needle = d.doctorName.trim().toLowerCase();
  const picks = doctors.filter((x) => !needle || x.name.toLowerCase().includes(needle)).filter((x) => x.name.toLowerCase() !== needle).slice(0, 5);
  const errors = {
    doctorName: d.doctorName.trim().length < 2 ? t('Doctor ka naam likhein') : undefined,
    patientName: d.patientName.trim().length < 2 ? t('Mareez ka naam likhein') : undefined,
    patientCnic: !cnicOk(d.patientCnic) ? t('CNIC 13 hindsay ka hota hai') : undefined,
  };
  const pickDoctor = (x: Doctor) => setD((v) => ({ ...v, doctorName: x.name, doctorRegNumber: x.registrationNumber }));
  const submit = () => {
    setTried(true);
    if (Object.values(errors).some(Boolean) || !ask) return;
    const done = ask.onDone;
    close();
    done(rxNote(d));
  };
  return (
    <Sheet open={!!ask} onClose={close} title={t('Register ke liye nuskha')}
      description={ask ? t('{{medicine}} controlled dawai hai — doctor aur mareez ka naam register me likha jayega.', { medicine: ask.name }) : undefined}
      footer={<Button fullWidth icon={ShieldAlert} onPress={submit}>{t('Bill me daalein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Doctor ka naam')} value={d.doctorName} onChangeText={(v) => set('doctorName', v)} error={tried ? errors.doctorName : undefined} />
        {picks.length > 0 && <ChipGroup value="" onChange={(id) => { const x = doctors.find((y) => y.id === id); if (x) pickDoctor(x); }} options={picks.map((x) => ({ value: x.id, label: drName(x.name) }))} />}
        <Input label={t('PMDC number')} value={d.doctorRegNumber} onChangeText={(v) => set('doctorRegNumber', v)} placeholder="12345-P" ltr />
        <Input label={t('Mareez ka naam')} value={d.patientName} onChangeText={(v) => set('patientName', v)} error={tried ? errors.patientName : undefined} />
        <Input label={t('Mareez ka CNIC')} value={d.patientCnic} onChangeText={(v) => set('patientCnic', formatCnic(v))} keyboardType="number-pad" placeholder="35202-1234567-1"
          error={tried ? errors.patientCnic : undefined} hint={t('Narcotic ke liye zaroor likhein')} ltr />
        <Text size="xs" tone="muted">{t('Isi bill ki agli controlled dawai par yahi naam khud lag jayenge.')}</Text>
      </View>
    </Sheet>
  );
}

function SubstituteSheet() {
  const th = useTheme();
  const ask = usePharmacyAsk((s) => s.sub);
  return (
    <Sheet open={!!ask} onClose={close} title={ask ? t('{{name}} — stock khatam', { name: ask.name }) : ''}
      description={ask?.generic ? t('Yehi formula ({{generic}}) wali dawaiyan jo shelf par hain', { generic: ask.generic }) : t('Is dawai ka formula (salt) likha nahi — product me salt jorein to yahan substitute dikhenge')}
      footer={ask?.onSellAnyway ? <Button fullWidth variant="secondary" onPress={() => { const f = ask.onSellAnyway; close(); f?.(); }}>{t('Phir bhi bechein')}</Button> : undefined}>
      {ask && ask.options.length === 0 ? (
        <Card tone="warning"><Text size="sm">{t('Is formula ki koi aur dawai shelf par nahi. Distributor se mangwayein.')}</Text></Card>
      ) : (
        <Card flush>
          {ask?.options.map((o, i) => {
            const diff = o.price - ask.price;
            return (
              <ListRow key={o.id} divider={i < ask.options.length - 1} icon={ArrowRightLeft} title={o.name} subtitle={o.line}
                onPress={() => { const f = ask.onPick; close(); f(o); }}
                trailing={<View style={{ alignItems: 'flex-end' }}>
                  <Amount value={o.price} weight="bold" />
                  {diff !== 0 && <Row><Text size="2xs" tone={diff < 0 ? 'success' : 'warning'} ltr>{`${diff < 0 ? '-' : '+'}Rs ${Math.abs(Math.round(diff))}`}</Text></Row>}
                </View>} />
            );
          })}
        </Card>
      )}
      <View style={{ height: th.space(2) }} />
    </Sheet>
  );
}
