/**
 * New or edited team order (web TeamOrderFormPage): the team, the kit lines
 * (product, size, rate and printing per piece), the players' names / numbers /
 * sizes (typed, or pasted from WhatsApp or Excel), discount, delivery and the
 * advance. The advance goes on the team's khata. Needs the server.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ClipboardPaste, Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { parseRoster, r2, teamTotals, type RosterRow } from '@nafaa/core/industries/sports';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Button, Card, DatePicker, EmptyState, FormSection, FormTemplate, IconButton, Input, MoneyInput, Row, SkeletonRows, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { MethodChips, OfflineNote, dateToKey, errorText, keyToDate, useDeskOnline } from '@/industries/_shared/deskKit';
import { NumberInput } from '@/modules/inventory/components/fields';
import { ProductPicker, type PickedProduct } from '@/modules/inventory/components/ProductPicker';
import { sportsProductsApi, teamOrdersApi, type TeamOrderInput } from '../api';
import { META_KEY, TEAM_KEY, refreshSports } from '../meta';

interface KitLine { key: string; productId: string; variantId?: string; productName: string; quantity: number | null; unitPrice: number | null; printingPrice: number | null; size: string; color: string; note: string }
let seq = 0;
const key = () => `k${++seq}`;
const opt = (s: string) => (s.trim() ? s.trim() : undefined);

export function TeamOrderFormScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id && id !== 'new';
  const { guard } = useDeskOnline('sportsDesk');
  const [loaded, setLoaded] = useState(!isEdit);
  const [team, setTeam] = useState({ teamName: '', organization: '', contactPerson: '', contactPhone: '', city: '', address: '', poNumber: '' });
  const [lines, setLines] = useState<KitLine[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [paste, setPaste] = useState<string | null>(null);
  const [printing, setPrinting] = useState({ on: false, details: '' });
  const [money, setMoney] = useState({ discountPct: null as number | null, shippingCharge: null as number | null, advance: null as number | null, method: 'CASH' });
  const [delivery, setDelivery] = useState<Date | null>(null);
  const [notes, setNotes] = useState({ notes: '', internalNotes: '' });
  const [picking, setPicking] = useState(false);
  const [dirty, setDirty] = useState(false);
  const metaQ = useQuery({ queryKey: [META_KEY], queryFn: sportsProductsApi.meta, staleTime: 5 * 60_000 });
  const orderQ = useQuery({ queryKey: [TEAM_KEY, 'one', id], queryFn: () => teamOrdersApi.getOne(id!), enabled: isEdit });

  useEffect(() => {
    const o = orderQ.data;
    if (!o || loaded) return;
    setTeam({ teamName: o.teamName, organization: o.organization ?? '', contactPerson: o.contactPerson, contactPhone: o.contactPhone, city: o.city ?? '', address: o.address ?? '', poNumber: o.poNumber ?? '' });
    setLines(o.items.map((i) => ({ key: key(), productId: i.productId, variantId: i.variantId, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice, printingPrice: i.printingPrice || null, size: i.size ?? '', color: i.color ?? '', note: i.customizationNotes ?? '' })));
    setRoster(o.playerNames ?? []);
    setPrinting({ on: o.hasCustomJerseys, details: o.customizationDetails ?? '' });
    setMoney((m) => ({ ...m, discountPct: o.discountPct || null, shippingCharge: o.shippingCharge || null }));
    setDelivery(o.expectedDeliveryDate ? keyToDate(o.expectedDeliveryDate) : null);
    setNotes({ notes: o.notes ?? '', internalNotes: o.internalNotes ?? '' });
    setLoaded(true);
  }, [orderQ.data, loaded]);

  const addPicked = (p: PickedProduct) => {
    const m = metaQ.data?.items.find((x) => x.productId === p.product.id);
    const rate = m?.teamPrice && m.teamPrice > 0 ? m.teamPrice : p.product.price;
    setDirty(true);
    setLines((ls) => [...ls, { key: key(), productId: p.product.id, variantId: p.variantId ?? undefined, productName: p.product.name, quantity: Math.max(m?.minTeamOrder ?? 1, 1), unitPrice: rate, printingPrice: null, size: p.variantName ?? '', color: '', note: '' }]);
    setPicking(false);
  };
  const setLine = (k: string, patch: Partial<KitLine>) => { setDirty(true); setLines((ls) => ls.map((l) => (l.key === k ? { ...l, ...patch } : l))); };
  const setPlayer = (i: number, patch: Partial<RosterRow>) => { setDirty(true); setRoster((rs) => rs.map((p, n) => (n === i ? { ...p, ...patch } : p))); };

  const totals = useMemo(() => teamTotals(lines.map((l) => ({ quantity: l.quantity ?? 0, unitPrice: l.unitPrice ?? 0, printingPrice: l.printingPrice ?? 0 })), money.discountPct ?? 0, money.shippingCharge ?? 0), [lines, money.discountPct, money.shippingCharge]);
  const errors = useMemo(() => {
    const e: string[] = [];
    if (team.teamName.trim().length < 2) e.push(t('Team ya school ka naam likhein'));
    else if (team.contactPerson.trim().length < 2) e.push(t('Rabte wale ka naam likhein'));
    else if (!/^[0-9+\-\s]{7,16}$/.test(team.contactPhone.trim())) e.push(t('Phone number sahi likhein (03001234567)'));
    else if (!lines.length) e.push(t('Kam az kam ek item daalein'));
    else if (lines.some((l) => !((l.quantity ?? 0) >= 1) || !Number.isInteger(l.quantity ?? 0))) e.push(t('Har item ki ginti 1 ya zyada (poora adad)'));
    else if ((money.discountPct ?? 0) < 0 || (money.discountPct ?? 0) > 100) e.push(t('Discount 0 se 100% tak'));
    else if (!isEdit && (money.advance ?? 0) > totals.total + 0.01) e.push(t('Advance kul ({{total}}) se zyada nahi', { total: formatMoney(totals.total) }));
    return e;
  }, [team, lines, money, totals.total, isEdit]);

  const save = useMutation({
    mutationFn: () => {
      const body: TeamOrderInput = {
        teamName: team.teamName.trim(), organization: opt(team.organization), contactPerson: team.contactPerson.trim(), contactPhone: team.contactPhone.trim(), city: opt(team.city), address: opt(team.address), poNumber: opt(team.poNumber),
        items: lines.map((l) => ({ productId: l.productId, ...(l.variantId ? { variantId: l.variantId } : {}), productName: l.productName, quantity: l.quantity ?? 0, unitPrice: l.unitPrice ?? 0, printingPrice: l.printingPrice ?? 0, size: opt(l.size), color: opt(l.color), customizationNotes: opt(l.note) })),
        discountPct: money.discountPct ?? 0, shippingCharge: money.shippingCharge ?? 0, hasCustomJerseys: printing.on || roster.length > 0, customizationDetails: opt(printing.details),
        playerNames: roster.filter((p) => p.name.trim() || p.number.trim()), expectedDeliveryDate: delivery ? dateToKey(delivery) : undefined, notes: opt(notes.notes), internalNotes: opt(notes.internalNotes),
      };
      return isEdit ? teamOrdersApi.update(id!, body) : teamOrdersApi.create({ ...body, advancePaid: money.advance || undefined, paymentMethod: money.method });
    },
    onSuccess: (o) => {
      setDirty(false);
      toast.success(isEdit ? t('{{no}} save ho gaya', { no: o.orderNumber }) : t('Order {{no}} ban gaya', { no: o.orderNumber }));
      refreshSports([TEAM_KEY], true);
      router.replace('/sports/team-orders' as never);
    },
    onError: (e) => toast.error(errorText(e, t('Kuch ghalat ho gaya'))),
  });
  const submit = () => { if (errors[0]) { toast.error(errors[0]); return; } guard(() => save.mutate()); };

  if (isEdit && !loaded) return <FormTemplate title={t('Team order')} onSave={() => undefined}><SkeletonRows count={5} /></FormTemplate>;
  const closed = orderQ.data && ['DELIVERED', 'CANCELLED'].includes(orderQ.data.status);

  return (
    <>
      <FormTemplate title={isEdit ? t('Order {{no}} badlein', { no: orderQ.data?.orderNumber ?? '' }) : t('Naya team order')} subtitle={t('School, club ya team ki kit — printing ke saath')}
        dirty={dirty} saving={save.isPending} saveDisabled={!!closed} onSave={submit} saveLabel={t('Save karein')}>
        <OfflineNote feature="sportsDesk" />
        {closed && <Card tone="warning"><Text size="sm">{t('Ye order band ho chuka')} — {t('Deliver ya cancel shuda order badla nahi ja sakta.')}</Text></Card>}
        <FormSection title={t('Team')}>
          <Input label={t('Team / school ka naam')} value={team.teamName} onChangeText={(v) => { setDirty(true); setTeam({ ...team, teamName: v }); }} maxLength={80} placeholder={t('Shaheen XI')} hint={t('Bill aur khata isi naam se banta hai')} />
          <Input label={t('Idara (school / club)')} value={team.organization} onChangeText={(v) => { setDirty(true); setTeam({ ...team, organization: v }); }} maxLength={80} />
          <Input label={t('Rabte wala')} value={team.contactPerson} onChangeText={(v) => { setDirty(true); setTeam({ ...team, contactPerson: v }); }} maxLength={80} placeholder={t('Coach Imran')} />
          <Input label={t('Phone')} value={team.contactPhone} onChangeText={(v) => { setDirty(true); setTeam({ ...team, contactPhone: v }); }} keyboardType="phone-pad" ltr placeholder="03001234567" hint={t('WhatsApp isi par')} />
          <Input label={t('Shehar')} value={team.city} onChangeText={(v) => { setDirty(true); setTeam({ ...team, city: v }); }} />
          <Input label={t('PO / letter number')} value={team.poNumber} onChangeText={(v) => { setDirty(true); setTeam({ ...team, poNumber: v }); }} ltr hint={t('School ka purchase order ho to')} />
          <Input label={t('Pata (delivery)')} value={team.address} onChangeText={(v) => { setDirty(true); setTeam({ ...team, address: v }); }} />
        </FormSection>

        <FormSection title={t('Kit ka maal')} description={t('Product chunein — size wale product me size bhi')}>
          <Button variant="soft" icon={Plus} onPress={() => setPicking(true)}>{t('Product chunein')}</Button>
          {lines.length === 0 ? <EmptyState title={t('Kam az kam ek item daalein')} /> : lines.map((l) => (
            <Card key={l.key}>
              <View style={{ gap: th.space(2) }}>
                <Row justify="between">
                  <Text weight="semibold" style={{ flex: 1 }} numberOfLines={2}>{l.productName}</Text>
                  <Amount value={r2((l.quantity ?? 0) * ((l.unitPrice ?? 0) + (l.printingPrice ?? 0)))} weight="bold" />
                  <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => { setDirty(true); setLines((ls) => ls.filter((x) => x.key !== l.key)); }} />
                </Row>
                <Row gap={2} align="start">
                  <View style={{ flex: 1 }}><NumberInput label={t('Ginti')} value={l.quantity} integer onChangeValue={(v) => setLine(l.key, { quantity: v })} /></View>
                  <View style={{ flex: 1 }}><MoneyInput label={t('Rate')} value={l.unitPrice} onChangeValue={(v) => setLine(l.key, { unitPrice: v })} hint={t('Per piece')} /></View>
                </Row>
                <MoneyInput label={t('Printing')} value={l.printingPrice} onChangeValue={(v) => setLine(l.key, { printingPrice: v })} hint={t('Naam / number per piece')} />
                <Row gap={2} align="start">
                  <View style={{ flex: 1 }}><Input label={t('Size')} value={l.size} disabled={!!l.variantId} onChangeText={(v) => setLine(l.key, { size: v })} placeholder="M / 32" /></View>
                  <View style={{ flex: 1 }}><Input label={t('Rang')} value={l.color} onChangeText={(v) => setLine(l.key, { color: v })} placeholder={t('Green')} /></View>
                </Row>
                <Input label={t('Note')} value={l.note} onChangeText={(v) => setLine(l.key, { note: v })} placeholder={t('Logo seene par')} />
              </View>
            </Card>
          ))}
        </FormSection>

        <FormSection title={t('Printing list')} description={t('{{count}} players — naam, number aur size', { count: roster.length })}>
          <Switch label={t('Kit par naam / number / logo printing')} description={t('Players ki list ho to khud on')} value={printing.on || roster.length > 0} onChange={(v) => { setDirty(true); setPrinting({ ...printing, on: v }); }} />
          <Row gap={2}>
            <Button style={{ flex: 1 }} variant="soft" icon={ClipboardPaste} onPress={() => setPaste('')}>{t('List paste')}</Button>
            <Button style={{ flex: 1 }} variant="soft" icon={Plus} onPress={() => { setDirty(true); setRoster((r) => [...r, { name: '', number: '', size: '' }]); }}>{t('Player')}</Button>
          </Row>
          {paste !== null && (
            <Card>
              <TextArea label={t('Har line par ek player')} value={paste} onChangeText={setPaste} placeholder={'Ali Raza 10 M\nUsman 7 L\nHamza, 18, XL'} hint={t('Naam, number, size — space ya comma se')} />
              <Row gap={2}>
                <Button style={{ flex: 1 }} variant="ghost" onPress={() => setPaste(null)}>{t('Band')}</Button>
                <Button style={{ flex: 1 }} onPress={() => { const rows = parseRoster(paste); setDirty(true); setRoster((r) => [...r, ...rows]); setPaste(null); toast.success(t('{{count}} players jur gaye', { count: rows.length })); }}>{t('List me daalein')}</Button>
              </Row>
            </Card>
          )}
          {roster.map((p, i) => (
            <Row key={i} gap={2} align="start">
              <View style={{ width: 64 }}><Input label={i === 0 ? t('Number') : undefined} value={p.number} onChangeText={(v) => setPlayer(i, { number: v.replace(/\D/g, '').slice(0, 3) })} keyboardType="number-pad" ltr /></View>
              <View style={{ flex: 1 }}><Input label={i === 0 ? t('Naam') : undefined} value={p.name} onChangeText={(v) => setPlayer(i, { name: v })} /></View>
              <View style={{ width: 64 }}><Input label={i === 0 ? t('Size') : undefined} value={p.size} onChangeText={(v) => setPlayer(i, { size: v })} ltr /></View>
              <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => { setDirty(true); setRoster((r) => r.filter((_, n) => n !== i)); }} />
            </Row>
          ))}
          <TextArea label={t('Printing / design')} value={printing.details} onChangeText={(v) => { setDirty(true); setPrinting({ ...printing, details: v }); }} maxLength={500} placeholder={t('Logo seene par, number peeth par')} />
        </FormSection>

        <FormSection title={t('Hisaab')}>
          <NumberInput label={t('Team discount %')} value={money.discountPct} onChangeValue={(v) => { setDirty(true); setMoney({ ...money, discountPct: v }); }} />
          <MoneyInput label={t('Delivery charges')} value={money.shippingCharge} onChangeValue={(v) => { setDirty(true); setMoney({ ...money, shippingCharge: v }); }} />
          <DatePicker label={t('Delivery ki date')} value={delivery} onChange={(d) => { setDirty(true); setDelivery(d); }} minimumDate={new Date()} />
          {!isEdit && <MoneyInput label={t('Advance (Rs)')} value={money.advance} onChangeValue={(v) => { setDirty(true); setMoney({ ...money, advance: v }); }} hint={t('Team ke khate me jama hoga')} />}
          {!isEdit && (money.advance ?? 0) > 0 && <><Text size="sm" weight="semibold" tone="secondary">{t('Advance kaise mila')}</Text><MethodChips value={money.method} onChange={(m) => setMoney({ ...money, method: m })} /></>}
          <TextArea label={t('Note')} value={notes.notes} onChangeText={(v) => { setDirty(true); setNotes({ ...notes, notes: v }); }} maxLength={300} />
          <TextArea label={t('Andar ka note')} value={notes.internalNotes} onChangeText={(v) => { setDirty(true); setNotes({ ...notes, internalNotes: v }); }} maxLength={300} />
          <Card>
            <Row justify="between"><Text tone="secondary">{t('Maal ({{n}} piece)', { n: totals.pieces })}</Text><Amount value={totals.subtotal} /></Row>
            {totals.discount > 0 && <Row justify="between"><Text tone="secondary">{t('Discount {{pct}}%', { pct: money.discountPct ?? 0 })}</Text><Amount value={-totals.discount} /></Row>}
            <Row justify="between"><Text weight="bold">{t('Kul')}</Text><Amount value={totals.total} size="lg" weight="bold" /></Row>
            {!isEdit && (money.advance ?? 0) > 0 && <Row justify="between"><Text tone="secondary">{t('Baqi')}</Text><Amount value={Math.max(totals.total - (money.advance ?? 0), 0)} tone="warning" /></Row>}
          </Card>
        </FormSection>
      </FormTemplate>
      <ProductPicker open={picking} onClose={() => setPicking(false)} onPick={addPicked} title={t('Product chunein')} includeRaw={false} />
    </>
  );
}
