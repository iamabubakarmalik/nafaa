/** Karigar sheets (web KarigarsPage modals): add or change, give or take back gold, labour, and the full ledger. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { karigarOutstanding, r2, r3, type Purity } from '@nafaa/core/industries/jewelry';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Button, Card, FormSection, Input, ListRow, Sheet, SkeletonRows, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { MethodChips, errorText } from '@/industries/_shared/deskKit';
import { NumberInput } from '@/modules/inventory/components/fields';
import { karigarsApi, type Karigar } from '../api';
import { KEYS, day, dayTime, entryLabel, grams, purityLabel, refreshJewelry } from '../meta';
import { OrderStatusPill, PurityPicker } from './ui';

export const labourDue = (k: Karigar) => r2(Math.max(k.totalEarnings - k.paidLabour, 0));
const refresh = () => refreshJewelry([KEYS.karigars, KEYS.metal, KEYS.orders, 'metal-stock-balance', 'cash-register', 'expenses']);

export function KarigarFormSheet({ karigar, open, onClose }: { karigar: Karigar | null; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const blank = { fullName: '', phone: '', cnic: '', address: '', skillLevel: '', perGramRate: null as number | null, fixedRatePerPiece: null as number | null, yearsExperience: null as number | null, isInHouse: true, isActive: true, notes: '' };
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setF(karigar ? {
      fullName: karigar.fullName, phone: karigar.phone, cnic: karigar.cnic ?? '', address: karigar.address ?? '', skillLevel: karigar.skillLevel ?? '',
      perGramRate: karigar.perGramRate ?? null, fixedRatePerPiece: karigar.fixedRatePerPiece ?? null, yearsExperience: karigar.yearsExperience ?? null,
      isInHouse: karigar.isInHouse, isActive: karigar.isActive, notes: karigar.notes ?? '',
    } : blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, karigar]);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const save = useMutation({
    mutationFn: () => {
      const body = {
        fullName: f.fullName.trim(), phone: f.phone.trim(), cnic: f.cnic.trim() || undefined, address: f.address.trim() || undefined, skillLevel: f.skillLevel.trim() || undefined,
        perGramRate: f.perGramRate || undefined, fixedRatePerPiece: f.fixedRatePerPiece || undefined, yearsExperience: f.yearsExperience || undefined,
        isInHouse: f.isInHouse, isActive: f.isActive, notes: f.notes.trim() || undefined,
      };
      return karigar ? karigarsApi.update(karigar.id, body) : karigarsApi.create(body);
    },
    onSuccess: () => { toast.success(karigar ? t('Karigar update ho gaya') : t('Karigar ban gaya')); refresh(); onClose(); },
    onError: (e) => setErrors({ form: errorText(e, t('Save nahi hua')) }),
  });
  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.fullName.trim()) e.fullName = t('Naam likhein');
    if (!/^[\d+\-\s]{7,20}$/.test(f.phone.trim())) e.phone = t('Sahi phone number likhein');
    setErrors(e);
    if (!Object.keys(e).length) save.mutate();
  };
  return (
    <Sheet open={open} onClose={onClose} title={karigar ? karigar.fullName : t('Naya karigar')} height={0.92}
      footer={<Button fullWidth size="lg" loading={save.isPending} onPress={submit}>{t('Save karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={f.fullName} onChangeText={(v) => set({ fullName: v })} error={errors.fullName} maxLength={80} />
        <Input label={t('Phone')} value={f.phone} onChangeText={(v) => set({ phone: v })} error={errors.phone} keyboardType="phone-pad" placeholder="03xx xxxxxxx" ltr />
        <Input label={t('CNIC')} value={f.cnic} onChangeText={(v) => set({ cnic: v })} placeholder="35202-xxxxxxx-x" ltr hint={t('Sona dene se pehle zaroor')} />
        <Input label={t('Kaam / mahaarat')} value={f.skillLevel} onChangeText={(v) => set({ skillLevel: v })} placeholder={t('Kundan, choori, polish…')} />
        <NumberInput label={t('Mazdoori fi gram (Rs)')} value={f.perGramRate} onChangeValue={(v) => set({ perGramRate: v })} />
        <NumberInput label={t('Mazdoori fi piece (Rs)')} value={f.fixedRatePerPiece} onChangeValue={(v) => set({ fixedRatePerPiece: v })} />
        <NumberInput label={t('Tajurba (saal)')} value={f.yearsExperience} integer onChangeValue={(v) => set({ yearsExperience: v })} />
        <Input label={t('Pata')} value={f.address} onChangeText={(v) => set({ address: v })} maxLength={200} />
        <Switch label={t('Dukaan ke andar kaam karta hai')} value={f.isInHouse} onChange={(v) => set({ isInHouse: v })} />
        {karigar && <Switch label={t('Chalu')} description={t('Band karne se history rehti hai')} value={f.isActive} onChange={(v) => set({ isActive: v })} />}
        <TextArea label={t('Note')} value={f.notes} onChangeText={(v) => set({ notes: v })} maxLength={300} />
        {!!errors.form && <Card tone="danger"><Text size="sm">{errors.form}</Text></Card>}
      </View>
    </Sheet>
  );
}

export function KarigarMetalSheet({ k, mode, onClose }: { k: Karigar | null; mode: 'issue' | 'receive'; onClose: () => void }) {
  const th = useTheme();
  const issue = mode === 'issue';
  const [purity, setPurity] = useState<Purity>('KARAT_22');
  const [g, setG] = useState({ grams: null as number | null, piece: null as number | null, wastage: null as number | null, back: null as number | null });
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (k) { setG({ grams: null, piece: null, wastage: null, back: null }); setReference(''); setNotes(''); setError(''); } }, [k?.id, mode]);
  const settled = r3((g.piece ?? 0) + (g.wastage ?? 0) + (g.back ?? 0));
  const held = k ? karigarOutstanding(k) : 0;
  const save = useMutation({
    mutationFn: () => issue
      ? karigarsApi.issueMetal(k!.id, { grams: g.grams ?? 0, purity, reference: reference.trim() || undefined, notes: notes.trim() || undefined })
      : karigarsApi.receiveMetal(k!.id, { receivedGrams: g.piece ?? 0, wastageGrams: g.wastage ?? 0, returnedGrams: g.back ?? 0, purity, reference: reference.trim() || undefined, notes: notes.trim() || undefined }),
    onSuccess: () => { toast.success(issue ? t('Sona de diya — metal stock se nikla') : t('Wapas le liya')); refresh(); onClose(); },
    onError: (e) => setError(errorText(e, t('Save nahi hua'))),
  });
  const submit = () => {
    if (!k) return;
    if (issue && !(g.grams && g.grams > 0)) return setError(t('Kitna sona diya — grams likhein'));
    if (!issue && !(settled > 0)) return setError(t('Wapas aane wala wazan likhein'));
    if (!issue && settled > k.outstandingGrams + 0.001) return setError(t('{{name}} ke paas sirf {{held}} hai', { name: k.fullName, held: grams(k.outstandingGrams) }));
    setError('');
    save.mutate();
  };
  return (
    <Sheet open={!!k} onClose={onClose} title={k ? (issue ? t('{{name}} ko sona dein', { name: k.fullName }) : t('{{name}} se wapas lein', { name: k.fullName })) : ''}
      description={k ? t('Abhi {{name}} ke paas {{held}}', { name: k.fullName, held: grams(k.outstandingGrams) }) : undefined}
      footer={<Button fullWidth size="lg" loading={save.isPending} onPress={submit}>{issue ? t('Sona dein') : t('Wapas lein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <PurityPicker label={t('Karat')} value={purity} onChange={setPurity} />
        {issue ? <NumberInput label={t('Grams')} value={g.grams} onChangeValue={(v) => setG({ ...g, grams: v })} hint={t('Tijori se nikal kar diya')} />
          : (
            <>
              <NumberInput label={t('Bana zewar (g)')} value={g.piece} onChangeValue={(v) => setG({ ...g, piece: v })} hint={t('Tol kar')} />
              <NumberInput label={t('Wastage (g)')} value={g.wastage} onChangeValue={(v) => setG({ ...g, wastage: v })} hint={t('Jo tay hua')} />
              <NumberInput label={t('Bacha sona (g)')} value={g.back} onChangeValue={(v) => setG({ ...g, back: v })} hint={t('Tijori me wapas')} />
              {settled > 0 && k && <Card tone="info"><Text size="sm">{t('Kul {{settled}} — baad me {{name}} ke paas {{left}}', { settled: grams(settled), name: k.fullName, left: grams(Math.max(held - settled, 0)) })}</Text></Card>}
            </>
          )}
        <Input label={t('Reference')} value={reference} onChangeText={setReference} placeholder={t('Order # ya parchi')} maxLength={60} />
        <TextArea label={t('Note')} value={notes} onChangeText={setNotes} maxLength={300} />
        {!!error && <Card tone="danger"><Text size="sm">{error}</Text></Card>}
      </View>
    </Sheet>
  );
}

export function KarigarLabourSheet({ k, mode, onClose }: { k: Karigar | null; mode: 'pay' | 'earn'; onClose: () => void }) {
  const th = useTheme();
  const pay = mode === 'pay';
  const due = k ? labourDue(k) : 0;
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (k) { setAmount(pay ? due : null); setMethod('CASH'); setNote(''); setError(''); } }, [k?.id, mode]);
  const n = amount ?? 0;
  const save = useMutation({
    mutationFn: async () => {
      if (!pay) { await karigarsApi.recordLabour(k!.id, n); return null; }
      return (await karigarsApi.payLabour(k!.id, { amount: n, paymentMethod: method, note: note.trim() || undefined })).expense.expenseNumber;
    },
    onSuccess: (no) => { toast.success(no ? t('Mazdoori di — expense {{no}}', { no }) : t('Mazdoori likh di')); refresh(); onClose(); },
    onError: (e) => setError(errorText(e, t('Save nahi hua'))),
  });
  const submit = () => {
    if (!(n > 0)) return setError(t('Amount likhein'));
    if (pay && n > due + 0.01) return setError(t('Baqi sirf {{due}} hai', { due: formatMoney(due) }));
    setError('');
    save.mutate();
  };
  return (
    <Sheet open={!!k} onClose={onClose} title={k ? (pay ? t('{{name}} ko mazdoori', { name: k.fullName }) : t('{{name}} ki mazdoori likhein', { name: k.fullName })) : ''}
      description={k && pay ? t('Bani {{earned}} · di {{paid}} · baqi {{due}}', { earned: formatMoney(k.totalEarnings), paid: formatMoney(k.paidLabour), due: formatMoney(due) }) : undefined}
      footer={<Button fullWidth size="lg" loading={save.isPending} onPress={submit}>{pay ? t('Dein · {{amount}}', { amount: formatMoney(n) }) : t('Likh dein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <NumberInput label={t('Amount (Rs)')} value={amount} onChangeValue={setAmount} prefix="Rs" />
        {pay && <><Text size="sm" weight="semibold" tone="secondary">{t('Kaise di')}</Text><MethodChips value={method} onChange={setMethod} /></>}
        {pay && <Input label={t('Note')} value={note} onChangeText={setNote} maxLength={200} placeholder={t('Jaise: order JCO-0007 ki mazdoori')} />}
        {pay && <Text size="xs" tone="muted">{t('Yeh Expense me "Karigar mazdoori" ke taur par jata hai — cash ho to drawer se nikalta hai.')}</Text>}
        {!!error && <Card tone="danger"><Text size="sm">{error}</Text></Card>}
      </View>
    </Sheet>
  );
}

export function KarigarLedgerSheet({ k, onClose }: { k: Karigar | null; onClose: () => void }) {
  const th = useTheme();
  const q = useQuery({ queryKey: [KEYS.karigars, 'ledger', k?.id], queryFn: () => karigarsApi.ledger(k!.id), enabled: !!k });
  const d = q.data;
  return (
    <Sheet open={!!k} onClose={onClose} title={k ? t('{{name}} — hisaab', { name: k.fullName }) : ''} height={0.92}
      description={k ? t('Diya {{issued}} · wapas {{back}} · wastage {{waste}} · baqi {{held}}', { issued: grams(k.metalIssuedGrams), back: grams(k.metalReturnedGrams), waste: grams(k.wastageGrams), held: grams(k.outstandingGrams) }) : undefined}>
      {q.isLoading ? <SkeletonRows count={5} /> : !d ? <Text size="sm" tone="muted">{t('Hisaab load nahi hua')}</Text> : (
        <View style={{ gap: th.space(4) }}>
          <View style={{ flexDirection: 'row', gap: th.space(2) }}>
            {([[t('Mazdoori bani'), d.labour.earned, 'default'], [t('Di gayi'), d.labour.paid, 'success'], [t('Baqi'), d.labour.due, d.labour.due > 0 ? 'info' : 'muted']] as const).map(([label, v, tone]) => (
              <Card key={label} style={{ flex: 1 }}><Text size="2xs" tone="muted">{label}</Text><Amount value={v} weight="bold" tone={tone === 'default' ? undefined : tone} /></Card>
            ))}
          </View>
          <FormSection title={t('Sone ka lena dena')}>
            {!d.metal.length ? <Text size="sm" tone="muted">{t('Abhi koi entry nahi')}</Text> : (
              <Card flush>
                {d.metal.map((e, i) => (
                  <ListRow key={e.id} dense divider={i < d.metal.length - 1} title={`${entryLabel(e.entryType).label} · ${purityLabel(e.purity)}`} subtitle={[dayTime(e.entryDate), e.reference, e.notes].filter(Boolean).join(' · ')}
                    trailing={<Text weight="bold" tone={entryLabel(e.entryType).in ? 'success' : 'danger'} ltr>{entryLabel(e.entryType).in ? '+' : '−'}{r3(e.grams)}</Text>} />
                ))}
              </Card>
            )}
          </FormSection>
          <FormSection title={t('Orders')}>
            {!d.orders.length ? <Text size="sm" tone="muted">{t('Is karigar ko koi order nahi diya')}</Text> : (
              <Card flush>
                {d.orders.map((o, i) => (
                  <ListRow key={o.id} dense divider={i < d.orders.length - 1} title={`${o.orderNumber} · ${o.customerName}`} subtitle={`${t('Dena')} ${day(o.promisedDate)} · ${o.metalIssuedGrams ? `${t('Diya')} ${r3(o.metalIssuedGrams)}` : '—'}${o.metalReceivedGrams ? ` · ${t('Bana')} ${r3(o.metalReceivedGrams)}` : ''}`}
                    trailing={<OrderStatusPill status={o.status} />} />
                ))}
              </Card>
            )}
          </FormSection>
          {!!d.repairs.length && (
            <FormSection title={t('Repair')}>
              <Card flush>
                {d.repairs.map((r, i) => <ListRow key={r.id} dense divider={i < d.repairs.length - 1} title={`${r.repairNumber} · ${r.customerName ?? '—'}`} subtitle={`${r.itemDescription} · ${day(r.promisedDate)}`} trailing={<Amount value={r.charge} />} />)}
              </Card>
            </FormSection>
          )}
          <FormSection title={t('Mazdoori di')}>
            {!d.payments.length ? <Text size="sm" tone="muted">{t('Abhi koi mazdoori nahi di')}</Text> : (
              <Card flush>
                {d.payments.map((p, i) => <ListRow key={p.id} dense divider={i < d.payments.length - 1} title={p.expenseNumber} subtitle={`${dayTime(p.expenseDate)} · ${p.description ?? p.title}`} trailing={<Amount value={p.amount} weight="semibold" />} />)}
              </Card>
            )}
          </FormSection>
        </View>
      )}
    </Sheet>
  );
}
