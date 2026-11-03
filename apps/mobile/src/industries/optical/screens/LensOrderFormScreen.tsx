/**
 * New glasses or repair order (web LensOrderFormPage): customer, prescription
 * (saved or typed), frame from stock or the customer's own, lens, lab and
 * promised date, price and advance. The advance lands in today's cash on the
 * server. Needs the server.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { advanceChips, emptyPower, labCostLooksWrong, orderTotal, powerErrors, powerOf, powerSummary, type PowerDraft } from '@nafaa/core/industries/optical';
import { REPAIR } from '@nafaa/core/industries/optical';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText, useProductSearch } from '@/core/offline';
import { Button, Card, ChipGroup, DatePicker, FormSection, FormTemplate, Input, ListRow, MoneyInput, Row, SearchBar, Select, Switch, Text, TextArea, toast, useDebouncedValue, useTheme } from '@/design';
import { lensOrdersApi, prescriptionsApi, type LensOrderInput, type PayMethod } from '../api';
import { Choices, MultiChoices, PartyFields, PowerGrid, PowerTable, emptyParty, partyErrors, powerErrorText, type PartyDraft } from '../components/parts';
import { useOpticalFacts } from '../hooks';
import { COATINGS, LENS_INDEX, LENS_MATERIAL, LENS_TYPES, OPTICAL_KEYS, PAY_METHODS, REPAIR_KINDS, asDate, dayKey, dayOnly, factLine, isoAt, optionsOf, plusDays, refreshOptical } from '../meta';

interface Frame { productId?: string; name: string; price: number | null; stock?: number | null }

export function LensOrderFormScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ rx?: string; type?: string }>();
  const repair = params.type === 'repair';
  const online = useOnlineStatus();
  const facts = useOpticalFacts();

  const [party, setParty] = useState<PartyDraft>(emptyParty);
  const [rxId, setRxId] = useState(params.rx ?? '');
  const [power, setPower] = useState<PowerDraft>(emptyPower());
  const [frame, setFrame] = useState<Frame>({ name: '', price: null });
  const [frameQ, setFrameQ] = useState('');
  const [ownFrame, setOwnFrame] = useState(repair);
  const [lensType, setLensType] = useState<string>(repair ? REPAIR : 'Single vision');
  const [lensIndex, setLensIndex] = useState('1.56');
  const [material, setMaterial] = useState('');
  const [coatings, setCoatings] = useState<string[]>(['ARC (anti-glare)']);
  const [repairKinds, setRepairKinds] = useState<string[]>([]);
  const [lensPrice, setLensPrice] = useState<number | null>(null);
  const [lensCost, setLensCost] = useState<number | null>(null);
  const [fitting, setFitting] = useState<number | null>(null);
  const [labName, setLabName] = useState('');
  const [date, setDate] = useState(plusDays(repair ? 2 : 7));
  const [advance, setAdvance] = useState<number | null>(null);
  const [method, setMethod] = useState<PayMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [tried, setTried] = useState(false);
  const [dirty, setDirty] = useState(false);
  const touch = <A extends unknown[]>(fn: (...a: A) => void) => (...a: A) => { setDirty(true); fn(...a); };

  // A prescription opened from its page brings its customer.
  const fromRx = useQuery({ queryKey: [OPTICAL_KEYS.rx, 'one', rxId], queryFn: () => prescriptionsApi.getOne(rxId), enabled: !!rxId && !party.name });
  useEffect(() => {
    const rx = fromRx.data;
    if (rx && !party.name) setParty({ customerId: rx.customerId ?? undefined, name: rx.customerName, phone: rx.customerPhone ?? '' });
  }, [fromRx.data, party.name]);

  const rxList = useQuery({ queryKey: [OPTICAL_KEYS.rx, 'customer', party.customerId], queryFn: () => prescriptionsApi.byCustomer(party.customerId!), enabled: !!party.customerId && !repair });
  const usable = (rxList.data ?? []).filter((r) => r.isActive && !r.computed?.isExpired);
  const rx = usable.find((r) => r.id === rxId) ?? (fromRx.data?.id === rxId ? fromRx.data : undefined);
  useEffect(() => { if (!rxId && usable.length && !repair) setRxId(usable[0].id); }, [usable, rxId, repair]);

  const q = useDebouncedValue(frameQ.trim(), 150);
  const frames = useProductSearch({ query: q, limit: 8 }, { enabled: q.length >= 2 && !ownFrame && !frame.productId });

  const p = powerOf(power);
  const pErr = rx ? {} : powerErrors(p);
  const pe = partyErrors(party);
  const lp = lensPrice ?? 0;
  const total = orderTotal({ framePrice: frame.price ?? 0, lensPrice: lp, fittingCharge: fitting ?? 0, ownFrame });
  const adv = advance ?? 0;

  const errors = useMemo(() => {
    const e: Record<string, string> = { ...pe };
    if (!ownFrame && !frame.name.trim()) e.frame = t('Frame chunein ya "Customer ka apna frame" lagayein');
    if (repair && !frame.name.trim()) e.frame = t('Frame ka naam likhein (jaise: kala metal frame)');
    if (!repair && !rx && !Object.keys(p).length) e.power = t('Nuskha chunein ya number likhein');
    if (Object.keys(pErr).length) e.power = powerErrorText(pErr) ?? '';
    if (!(total > 0)) e.total = repair ? t('Repair ka charge likhein') : t('Qeemat likhein');
    if (adv > total + 0.01) e.advance = t('Advance kul ({{total}}) se zyada nahi', { total: formatMoney(total) });
    return e;
  }, [pe, ownFrame, frame.name, repair, rx, p, pErr, total, adv]);

  const save = useMutation({
    mutationFn: () => {
      const body: LensOrderInput = {
        customerId: party.customerId, customerName: party.name.trim(), customerPhone: party.phone.trim(),
        prescriptionId: !repair && rx ? rx.id : undefined,
        ...(!repair && !rx ? p : {}),
        frameProductId: !ownFrame && frame.productId ? frame.productId : undefined,
        frameName: ownFrame ? (frame.name.trim() || 'Customer ka apna frame') : frame.name.trim(),
        lensType: repair ? REPAIR : lensType, lensIndex: repair ? undefined : lensIndex || undefined, lensMaterial: repair ? undefined : material || undefined,
        lensCoatings: repair ? [] : coatings,
        framePrice: ownFrame ? undefined : frame.price || undefined, lensPrice: lp || undefined, lensCost: lensCost || undefined, fittingCharge: fitting || undefined,
        labName: labName.trim() || undefined, expectedDate: date ? isoAt(date) : undefined,
        paidAmount: adv || undefined, paymentMethod: adv > 0 ? method : undefined,
        notes: [repair && repairKinds.length ? `Repair: ${repairKinds.join(', ')}` : '', notes.trim()].filter(Boolean).join('\n') || undefined,
      };
      return lensOrdersApi.create(body);
    },
    onSuccess: (o) => {
      setDirty(false);
      toast.success(t('{{orderNumber}} ban gaya{{value}}', { orderNumber: o.orderNumber, value: adv > 0 ? t(' — {{adv}} advance', { adv: formatMoney(adv) }) : '' }));
      refreshOptical([OPTICAL_KEYS.orders], adv > 0);
      router.replace(`/optical/lens-orders/${o.id}` as never);
    },
  });
  const submit = () => {
    setTried(true);
    const blocking = Object.keys(errors);
    if (blocking.length) { toast.error(errors[blocking[0]]); return; }
    if (!online) { toast.warning(onlineNeededText('opticalDesk')); return; }
    if (!save.isPending) save.mutate();
  };
  const show = (k: string) => (tried ? errors[k] : undefined);
  const wrongCost = labCostLooksWrong(lensCost ?? 0, lp);

  return (
    <FormTemplate title={repair ? t('Naya repair') : t('Naya chashma order')} subtitle={repair ? t('Customer ka frame, kya theek karna hai, charge aur date') : t('Customer, nuskha, frame, lens, lab aur advance')}
      dirty={dirty} saving={save.isPending} onSave={submit} saveLabel={adv > 0 ? t('Order + {{adv}} advance', { adv: formatMoney(adv) }) : t('Order save karein')}>
      <FormSection title={t('Customer')}>
        <PartyFields value={party} onChange={touch((v: PartyDraft) => { setParty(v); if (v.customerId !== party.customerId) setRxId(''); })} errors={tried ? pe : {}} />
      </FormSection>

      {!repair && (
        <FormSection title={t('Nuskha (number)')} description={t('Saved nuskha chunein, ya number yahan likhein')}>
          {usable.length > 0 && (
            <Card flush>
              {usable.map((r, i) => (
                <ListRow key={r.id} dense divider={i < usable.length - 1} title={`${r.prescriptionNumber} · ${dayOnly(r.prescriptionDate)}`}
                  subtitle={<Text size="xs" tone="muted" ltr>{powerSummary(r, t('Plano')) || '—'}</Text>} selected={rxId === r.id} onPress={touch(() => setRxId(rxId === r.id ? '' : r.id))} />
              ))}
            </Card>
          )}
          {rxId ? <Button variant="link" size="sm" onPress={touch(() => setRxId(''))}>{t('Naya number likhein')}</Button> : null}
          {rx ? <PowerTable p={rx} /> : (
            <>
              <PowerGrid value={power} onChange={touch(setPower)} errors={tried ? pErr : {}} />
              {show('power') && !Object.keys(pErr).length ? <Text size="xs" weight="medium" tone="danger">{show('power')}</Text> : null}
            </>
          )}
        </FormSection>
      )}

      <FormSection title={repair ? t('Frame aur kaam') : t('Frame')}>
        {!repair && (
          <Switch value={ownFrame} onChange={touch((v: boolean) => { setOwnFrame(v); setFrame({ name: '', price: null }); })} label={t('Customer ka apna frame')} description={t('Sirf lens lagane hain — frame ki qeemat nahi lagti')} />
        )}
        {!ownFrame ? (
          <>
            {frame.productId ? (
              <Card tone="brand"><Row gap={2} justify="between">
                <View style={{ flex: 1 }}>
                  <Text weight="semibold" numberOfLines={1}>{frame.name}</Text>
                  <Text size="xs" tone="secondary">{t('{{value}} · stock {{value2}}', { value: factLine(facts.get(frame.productId)) ?? t('Stock se'), value2: frame.stock ?? 0 })}</Text>
                </View>
                <Button size="sm" variant="secondary" onPress={() => setFrame({ name: '', price: null })}>{t('Badlein')}</Button>
              </Row></Card>
            ) : (
              <>
                <SearchBar value={frameQ} onChangeText={setFrameQ} placeholder={t('Brand, model, rang ya barcode')} />
                {show('frame') ? <Text size="xs" weight="medium" tone="danger">{show('frame')}</Text> : null}
                {(frames.data ?? []).length > 0 && (
                  <Card flush>
                    {frames.data!.map((pr, i) => (
                      <ListRow key={pr.id} dense divider={i < frames.data!.length - 1} title={pr.name} subtitle={factLine(facts.get(pr.id)) ?? pr.sku ?? undefined}
                        trailing={<View style={{ alignItems: 'flex-end' }}><Text size="sm" weight="semibold" ltr>{formatMoney(pr.price)}</Text><Text size="2xs" tone={(pr.stock ?? 0) > 0 ? 'muted' : 'danger'}>{t('stock {{stock}}', { stock: pr.stock ?? 0 })}</Text></View>}
                        onPress={touch(() => { setFrame({ productId: pr.id, name: pr.name, price: pr.price, stock: pr.stock }); setFrameQ(''); })} />
                    ))}
                  </Card>
                )}
                {q.length >= 2 && frames.isSuccess && !frames.data.length && (
                  <Row gap={2} wrap><Text size="sm" tone="muted">{t('Stock me nahi mila —')}</Text>
                    <Button variant="link" size="sm" onPress={touch(() => { setFrame({ name: frameQ.trim(), price: null }); setFrameQ(''); })}>{t('"{{value}}" naam se likhein', { value: frameQ.trim() })}</Button>
                    <Text size="sm" tone="muted">{t('(stock se nahi niklega)')}</Text></Row>
                )}
                {!frame.productId && frame.name ? <Input label={t('Frame (stock ke bagair)')} value={frame.name} onChangeText={touch((v: string) => setFrame({ ...frame, name: v }))} /> : null}
              </>
            )}
            <MoneyInput label={t('Frame ki qeemat')} value={frame.price} onChangeValue={touch((v: number | null) => setFrame({ ...frame, price: v }))} hint={t('Customer ko jo batayi')} />
          </>
        ) : (
          <>
            <Input label={t('Frame')} value={frame.name} onChangeText={touch((v: string) => setFrame({ ...frame, name: v }))} placeholder={repair ? t('Jaise: kala metal frame, Ray-Ban') : t('Customer ka apna frame')} error={show('frame')} maxLength={160} />
            {repair && (
              <View style={{ gap: th.space(1.5) }}>
                <Text size="sm" weight="medium" tone="secondary">{t('Kya theek karna hai')}</Text>
                <MultiChoices options={REPAIR_KINDS} value={repairKinds} onChange={touch(setRepairKinds)} />
              </View>
            )}
          </>
        )}
      </FormSection>

      {!repair && (
        <FormSection title={t('Lens')}>
          <Text size="sm" weight="medium" tone="secondary">{t('Lens type')}</Text>
          <Choices options={LENS_TYPES} value={lensType} onChange={touch(setLensType)} />
          <Text size="sm" weight="medium" tone="secondary">{t('Index (patla-mota)')}</Text>
          <ChipGroup wrap value={lensIndex} onChange={touch(setLensIndex)} options={LENS_INDEX.map((v) => ({ value: v, label: v }))} />
          <Text size="sm" weight="medium" tone="secondary">{t('Coating')}</Text>
          <MultiChoices options={COATINGS} value={coatings} onChange={touch(setCoatings)} />
          <Select label={t('Material')} value={material} onChange={touch(setMaterial)} hint={t('Marzi hai')} options={[{ value: '', label: '—' }, ...optionsOf(LENS_MATERIAL)]} />
        </FormSection>
      )}

      <FormSection title={repair ? t('Kab tayyar') : t('Lab aur date')}>
        {!repair && <Input label={t('Lab')} value={labName} onChangeText={touch(setLabName)} placeholder={t('Abhi na pata ho to baad me')} hint={t('Lab bhejte waqt bhi likh sakte hain')} maxLength={120} />}
        <DatePicker label={t('Customer ko kab dena hai')} value={asDate(date)} minimumDate={new Date()} hint={t("Is date ke baad order 'Late' dikhta hai")} onChange={touch((d: Date) => setDate(dayKey(d.toISOString())))} />
      </FormSection>

      <FormSection title={t('Hisaab')}>
        <MoneyInput label={repair ? t('Repair charge') : t('Lens ki qeemat')} value={lensPrice} onChangeValue={touch(setLensPrice)} error={show('total')} />
        <MoneyInput label={t('Lab / karigar ka kharcha')} value={lensCost} onChangeValue={touch(setLensCost)} hint={wrongCost ? t('Lab ka kharcha lens ki qeemat se zyada hai — dobara dekhein') : t('Profit sahi aane ke liye')} />
        {!repair && <MoneyInput label={t('Fitting charge')} value={fitting} onChangeValue={touch(setFitting)} hint={t('Marzi hai')} />}
        <Card tone="muted">
          {!repair && <Row justify="between"><Text size="sm" tone="secondary">{t('Frame')}</Text><Text size="sm" ltr>{formatMoney(ownFrame ? 0 : frame.price ?? 0)}</Text></Row>}
          <Row justify="between"><Text size="sm" tone="secondary">{repair ? t('Repair') : t('Lens')}</Text><Text size="sm" ltr>{formatMoney(lp)}</Text></Row>
          {(fitting ?? 0) > 0 && <Row justify="between"><Text size="sm" tone="secondary">{t('Fitting')}</Text><Text size="sm" ltr>{formatMoney(fitting ?? 0)}</Text></Row>}
          <Row justify="between"><Text weight="bold">{t('Kul')}</Text><Text weight="bold" ltr>{formatMoney(total)}</Text></Row>
        </Card>
        <MoneyInput label={t('Advance (abhi)')} value={advance} onChangeValue={touch(setAdvance)} error={show('advance') ?? (adv > total + 0.01 ? errors.advance : undefined)}
          hint={total > 0 ? t('Baqi dete waqt: {{formatPKR}}', { formatPKR: formatMoney(Math.max(total - adv, 0)) }) : undefined} />
        {total > 0 && <Row gap={2} wrap>{advanceChips(total).map((v, i) => <Button key={v} size="sm" variant="secondary" onPress={touch(() => setAdvance(v))}>{`${i === 1 ? t('Poora') : t('Aadha')} (${formatMoney(v)})`}</Button>)}</Row>}
        {adv > 0 && (
          <>
            <Text size="sm" weight="medium" tone="secondary">{t('Advance kaise mila')}</Text>
            <ChipGroup wrap value={method} onChange={touch(setMethod)} options={PAY_METHODS.map((m) => ({ value: m.id, label: t(m.label) }))} />
          </>
        )}
        <TextArea label={t('Note')} value={notes} onChangeText={touch(setNotes)} placeholder={t('Jaise: customer Friday ko aayega')} hint={t('Marzi hai')} maxLength={1000} />
      </FormSection>
    </FormTemplate>
  );
}
