/**
 * Appliance counter sheets, rendered by the shared counter through
 * PosIndustryConfig.Overlay: the serial picker for a product sold by unit and
 * the after-sale step (installation, home delivery and a qist plan with a
 * guarantor) offered when a bill is saved. TradeInTake is the counter button
 * that records an old appliance handed in.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarClock, HardHat, Recycle, ShieldCheck, Truck } from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { create } from 'zustand';
import { QIST_COUNTS, addMonthsKey, categoryRule, guarantorErrors, qistSchedule } from '@nafaa/core/industries/appliances';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, Card, ChipGroup, DatePicker, Input, ListRow, MoneyInput, Row, Sheet, Skeleton, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { useBill } from '@/modules/pos/engine/bill';
import { SlotChips, dateToKey, errText, keyToDate, opt, phoneOk, todayKey, addDaysKey } from '../../_shared/trade/desk';
import { applianceSerialApi, deliveriesApi, installationsApi, qistApi, type ApplianceProfile, type CounterUnit } from '../api';
import { KEYS, refreshAppliances } from '../meta';
import { TechSelect, useApplianceProfiles } from './kit';
import { TradeInSheet } from '../screens/TradeInsScreen';

/** A unit picked for the bill; marked sold once the bill is saved. */
export interface PickedUnit { productId: string; serialId: string; serialNumber: string }
export interface AfterSaleLine { productId: string; name: string; qty: number }

interface Ask {
  units: { productId: string; name: string; taken: Set<string>; onPick: (u: CounterUnit) => void; onSkip: () => void } | null;
  after: { saleId: string; saleNumber: string; lines: AfterSaleLine[]; units: PickedUnit[]; total: number; credit: number; customer: { id: string; name: string; phone: string } | null } | null;
}
export const useApplianceAsk = create<Ask>(() => ({ units: null, after: null }));
const closeAsk = () => useApplianceAsk.setState({ units: null, after: null });
export const askUnit = (units: NonNullable<Ask['units']>) => useApplianceAsk.setState({ units });
export const askAfterSale = (after: NonNullable<Ask['after']>) => useApplianceAsk.setState({ after });

export function AppliancesOverlay() {
  return (
    <>
      <SerialPickerSheet />
      <AfterSaleSheet />
    </>
  );
}

/** Picks the exact unit (by serial) of a product being sold, from this branch's shelf. */
function SerialPickerSheet() {
  const ask = useApplianceAsk((s) => s.units);
  const [term, setTerm] = useState('');
  useEffect(() => { if (ask) setTerm(''); }, [ask]);
  const q = useQuery({ queryKey: [KEYS.serial, 'pos-units', ask?.productId], queryFn: () => applianceSerialApi.counter(ask!.productId), enabled: !!ask });
  const units = useMemo(() => {
    const low = term.trim().toLowerCase();
    return (q.data ?? []).filter((u) => !ask?.taken.has(u.id) && (!low || u.serialNumber.toLowerCase().includes(low) || (u.modelNumber ?? '').toLowerCase().includes(low)));
  }, [q.data, ask, term]);
  return (
    <Sheet open={!!ask} onClose={closeAsk} title={t('Kaunsa unit — {{name}}', { name: ask?.name ?? '' })} description={t('Jo dabba customer ko ja raha hai us par likha serial chunein')}
      footer={<Button fullWidth variant="ghost" onPress={() => { const a = ask; closeAsk(); a?.onSkip(); }}>{t('Serial ke baghair')}</Button>}>
      <View style={{ gap: 8 }}>
        <Input value={term} onChangeText={setTerm} placeholder={t('Serial dhoondein ya scan karein')} ltr autoCapitalize="characters" />
        {q.isLoading ? <Skeleton height={120} /> : units.length === 0 ? (
          <Text size="sm" tone="muted" align="center">{term ? t('Ye serial stock me nahi') : t('Is branch me is product ka koi serial stock me nahi')}</Text>
        ) : (
          units.map((u, i) => (
            <ListRow key={u.id} dense divider={i < units.length - 1} title={u.serialNumber} subtitle={[u.modelNumber, u.batchNumber].filter(Boolean).join(' · ') || undefined}
              onPress={() => { const a = ask; closeAsk(); a?.onPick(u); }} chevron />
          ))
        )}
      </View>
    </Sheet>
  );
}

/** Right after an appliance bill is saved: book the installation, the home delivery and, for a bill on udhaar, a monthly qist plan with a guarantor. Each part is optional. */
function AfterSaleSheet() {
  const ask = useApplianceAsk((s) => s.after);
  const profiles = useApplianceProfiles();
  if (!ask) return null;
  return <AfterSaleBody ask={ask} profiles={profiles} />;
}

function Section({ icon: Icon, on, onToggle, title, hint, children }: { icon: typeof Truck; on: boolean; onToggle: (v: boolean) => void; title: string; hint: string; children: ReactNode }) {
  const th = useTheme();
  return (
    <Card style={{ gap: th.space(3) }}>
      <Switch value={on} onChange={onToggle} label={title} description={hint} />
      {on && <View style={{ gap: th.space(3) }}>{children}</View>}
    </Card>
  );
}

function AfterSaleBody({ ask, profiles }: { ask: NonNullable<Ask['after']>; profiles: Map<string, ApplianceProfile> }) {
  const th = useTheme();
  const can = usePermission();
  const canJobs = can(P.SERVICE_JOBS_MANAGE);
  const canQist = can(P.KHATA_MANAGE);
  const fit = ask.lines.filter((l) => profiles.get(l.productId)?.requiresInstallation);
  const heavy = ask.lines.some((l) => categoryRule(profiles.get(l.productId)?.categoryType).heavy);
  const offerQist = canQist && ask.credit > 0 && !!ask.customer;
  const [name, setName] = useState(ask.customer?.name ?? '');
  const [phone, setPhone] = useState(ask.customer?.phone ?? '');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [doFit, setDoFit] = useState(canJobs && fit.length > 0);
  const [fitDate, setFitDate] = useState(addDaysKey(todayKey(), 1));
  const [fitSlot, setFitSlot] = useState('');
  const [tech, setTech] = useState('');
  const [doTrip, setDoTrip] = useState(canJobs && heavy);
  const [tripDate, setTripDate] = useState(todayKey());
  const [tripSlot, setTripSlot] = useState('');
  const [floor, setFloor] = useState<number | null>(null);
  const [lift, setLift] = useState(false);
  const [tripCharge, setTripCharge] = useState<number | null>(null);
  const [doQist, setDoQist] = useState(offerQist);
  const [count, setCount] = useState(6);
  const [start, setStart] = useState(addMonthsKey(todayKey(), 1));
  const [gName, setGName] = useState('');
  const [gPhone, setGPhone] = useState('');
  const [gCnic, setGCnic] = useState('');
  const [gAddress, setGAddress] = useState('');
  const needParty = doFit || doTrip;
  const g = guarantorErrors({ name: gName, phone: gPhone, cnic: gCnic }, ask.customer?.phone ?? '');
  const G: Record<string, string> = { name: t('Zamin ka naam likhein'), phone: t('Zamin ka sahi phone'), self: t('Zamin customer khud nahi ho sakta'), cnic: t('Zamin ka CNIC 13 hindse') };
  const problems = [
    needParty && name.trim().length < 2 ? t('Customer ka naam likhein') : '', needParty && !phoneOk(phone) ? t('Customer ka sahi phone likhein') : '', needParty && address.trim().length < 5 ? t('Poora pata likhein') : '',
    doQist && g.name ? G.name : '', doQist && g.phone ? G[g.phone] : '', doQist && g.cnic ? G.cnic : '', doQist && start < todayKey() ? t('Pehli qist aaj se pehle nahi') : '',
  ].filter(Boolean);
  const any = doFit || doTrip || doQist;
  const sched = qistSchedule(ask.credit, count, start);

  const save = useMutation({
    mutationFn: async () => {
      const party = { customerId: ask.customer?.id, customerName: name.trim(), customerPhone: phone.trim() };
      const done: string[] = [];
      let planId: string | null = null;
      if (doFit) {
        const left = [...ask.units];
        for (const l of fit) {
          const p = profiles.get(l.productId)!;
          for (let n = 0; n < Math.max(Math.floor(l.qty), 1); n++) {
            const at = left.findIndex((u) => u.productId === l.productId);
            const unit = at >= 0 ? left.splice(at, 1)[0] : undefined;
            await installationsApi.create({
              ...party, customerAddress: address.trim(), area: opt(area), saleId: ask.saleId, productId: l.productId, productName: l.name, serialNumber: unit?.serialNumber, serialTrackingId: unit?.serialId,
              serviceType: 'INSTALLATION', scheduledDate: fitDate, scheduledTimeSlot: fitSlot || undefined, technicianId: tech || undefined,
              laborCharge: p.installationCovered ? 0 : Number(p.installationCharge) || 0, covered_underWarranty: p.installationCovered,
            });
          }
        }
        done.push(t('installation'));
      }
      if (doTrip) {
        await deliveriesApi.create({
          ...party, deliveryAddress: address.trim(), area: opt(area), saleId: ask.saleId, serialTrackingIds: ask.units.map((u) => u.serialId), floorNumber: floor ?? undefined, hasLift: lift,
          scheduledDate: tripDate, scheduledSlot: tripSlot || undefined, deliveryCharge: tripCharge ?? 0, requiresInstallation: doFit,
        });
        done.push(t('delivery'));
      }
      if (doQist && ask.customer) {
        const plan = await qistApi.create({
          saleId: ask.saleId, customerId: ask.customer.id, customerName: ask.customer.name, customerPhone: ask.customer.phone || undefined, totalAmount: ask.total,
          downPayment: Math.max(ask.total - ask.credit, 0), installmentCount: count, startDate: start,
        });
        try {
          await qistApi.setGuarantor(plan.id, { guarantorName: gName.trim(), guarantorPhone: gPhone.replace(/[\s-]/g, '') || undefined, guarantorCnic: gCnic.trim(), guarantorAddress: opt(gAddress) });
        } catch (e) {
          toast.error(errText(e, t('Plan {{planNumber}} ban gaya, zamin save nahi hua — Qist plans me plan khol kar zamin likhein', { planNumber: plan.planNumber })));
        }
        planId = plan.id;
        done.push(t('qist plan'));
      }
      return { done, planId };
    },
    onSuccess: ({ done, planId }) => {
      if (done.length) toast.success(t('{{value}} book ho gaya', { value: done.join(', ') }));
      refreshAppliances([KEYS.install, KEYS.delivery, 'emi-plans', 'emi-stats']);
      closeAsk();
      // Open the new plan so the agreement can be printed and the guarantor checked.
      if (planId) router.push(`/appliances/qist/${planId}` as never);
    },
    onError: (e) => toast.error(errText(e, t('Booking nahi hui — Installations / Deliveries se dobara karein'))),
  });

  return (
    <Sheet open onClose={closeAsk} title={t('Bill {{saleNumber}} — aage kya?', { saleNumber: ask.saleNumber })} description={t('Fitting, delivery aur qist yahin book karein; zaroorat na ho to band karein.')}
      footer={<Button fullWidth size="lg" icon={CalendarClock} loading={save.isPending} disabled={!any || problems.length > 0} onPress={() => save.mutate()}>{problems.length > 0 && any ? problems[0] : t('Book karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {canJobs && (fit.length > 0 || heavy) && (
          <>
            <Input label={t('Customer')} value={name} onChangeText={setName} />
            <Input label={t('Phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" ltr placeholder="0300-1234567" />
            <Input label={t('Ghar ka pata')} value={address} onChangeText={setAddress} placeholder={t('House 12, Street 4, Johar Town')} />
            <Input label={t('Ilaqa')} value={area} onChangeText={setArea} />
          </>
        )}
        {canJobs && fit.length > 0 && (
          <Section icon={HardHat} on={doFit} onToggle={setDoFit} title={t('Installation')} hint={fit.map((l) => `${l.name}${l.qty > 1 ? ` × ${l.qty}` : ''}`).join(', ')}>
            <DatePicker label={t('Kis din')} value={keyToDate(fitDate)} minimumDate={new Date()} onChange={(d) => setFitDate(dateToKey(d))} />
            <TechSelect value={tech} onChange={setTech} />
            <SlotChips value={fitSlot} onChange={setFitSlot} />
            <Text size="xs" tone="muted">{t('{{value}} — kaam ke baad bill banega.', { value: fit.map((l) => { const p = profiles.get(l.productId)!; return p.installationCovered ? `${l.name}: ${t('free')}` : `${l.name}: ${formatMoney(Number(p.installationCharge) || 0)}`; }).join(', ') })}</Text>
          </Section>
        )}
        {canJobs && (
          <Section icon={Truck} on={doTrip} onToggle={setDoTrip} title={t('Ghar delivery')} hint={heavy ? t('Bhari saman — gaari aur helper') : t('Customer khud le ja raha ho to band rakhein')}>
            <DatePicker label={t('Kis din')} value={keyToDate(tripDate)} minimumDate={new Date()} onChange={(d) => setTripDate(dateToKey(d))} />
            <NumberInput label={t('Manzil')} integer value={floor} onChangeValue={setFloor} placeholder="0" />
            <MoneyInput label={t('Delivery charge')} value={tripCharge} onChangeValue={setTripCharge} placeholder="0" hint={t('Bill me liya ho to 0')} />
            <SlotChips value={tripSlot} onChange={setTripSlot} />
            <Switch value={lift} onChange={setLift} label={t('Lift hai')} />
          </Section>
        )}
        {offerQist && (
          <Section icon={ShieldCheck} on={doQist} onToggle={setDoQist} title={t('Qist plan')} hint={t('Udhaar {{credit}} — mahine war qistein', { credit: formatMoney(ask.credit) })}>
            <ChipGroup value={String(count)} onChange={(v) => setCount(Number(v))} options={QIST_COUNTS.map((c) => ({ value: String(c), label: String(c) }))} />
            <Text size="sm">{t('{{count}} qist × {{each}} · advance {{advance}}', { count: String(count), each: formatMoney(sched.each), advance: formatMoney(Math.max(ask.total - ask.credit, 0)) })}</Text>
            <DatePicker label={t('Pehli qist')} value={keyToDate(start)} minimumDate={new Date()} onChange={(d) => setStart(dateToKey(d))} hint={t('Har mahine isi tareekh ko')} />
            <Input label={t('Zamin (guarantor)')} value={gName} onChangeText={setGName} placeholder={t('Naam')} />
            <Input label={t('Zamin ka phone')} value={gPhone} onChangeText={setGPhone} keyboardType="phone-pad" ltr placeholder="0300-1234567" />
            <Input label={t('Zamin ka CNIC')} value={gCnic} onChangeText={setGCnic} ltr placeholder="35202-1234567-1" />
            <TextArea label={t('Zamin ka pata')} value={gAddress} onChangeText={setGAddress} placeholder={t('Ghar ya dukaan ka pata')} />
          </Section>
        )}
      </View>
    </Sheet>
  );
}

/** Counter button: records an old appliance the customer hands in. */
export function TradeInTake() {
  const [open, setOpen] = useState(false);
  const customerId = useBill((s) => s.customer?.id);
  return (
    <>
      <Row>
        <Button size="sm" variant="soft" icon={Recycle} style={{ flex: 1 }} onPress={() => setOpen(true)}>{t('Purana saman liya')}</Button>
      </Row>
      <TradeInSheet item={open ? 'new' : null} customerId={customerId} onClose={() => setOpen(false)} />
    </>
  );
}
