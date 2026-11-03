/**
 * Customer side of an order: the COD confirmation call (with the WhatsApp
 * confirm message), the customer with their record and risk, the shop's
 * "ask for an advance" rule, and the staff-only extras (tags, notes, fixing
 * details, blocking the number, change history).
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban, CheckCircle2, Copy, CreditCard, HandCoins, MapPin, MessageCircle, Pencil, Phone, PhoneMissed, Plus, StickyNote, Tag, X, XCircle,
} from 'lucide-react-native';
import { mapsUrl, moneyOf, orderNo, waNumber, type OnlineOrderDetail } from '@nafaa/core/online-store';
import { haptic } from '@/core/device/haptics';
import { formatDateTime, formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import {
  Badge, Button, Card, Chip, ChipGroup, Input, PressableScale, Sheet, Text, TextArea, toast, useTheme,
} from '@/design';
import { apiErrorMessage, ordersApi, paymentsApi } from '../../api/online';
import { BLOCK_REASONS, QUICK_TAGS } from '../../lib/labels';
import { KEYS } from '../../lib/online';
import { callPhone, copyText, openUrl, openWhatsApp } from '../../lib/device';
import { advanceAskText, confirmText, payLinkText, statusText, useShopLanguage } from '../../lib/messages';
import { RiskCard } from '../bits';

const msgOrder = (o: OnlineOrderDetail) => ({
  customerName: o.customerName, number: orderNo(o), total: o.total, trackingNumber: o.trackingNumber, codDue: moneyOf(o).codDue,
  items: o.lines.map((l) => `${l.name}${l.variant ? ` (${l.variant})` : ''} x${l.quantity}`).join(', '),
  address: [o.customerAddress, o.customerCity].filter(Boolean).join(', '),
});

/** COD: get a "yes" from the customer before the parcel goes. Fake orders are caught here. */
export function ConfirmCard({ order: o, canManage, onChanged, onRefused }: { order: OnlineOrderDetail; canManage: boolean; onChanged: () => void; onRefused: () => void }) {
  const th = useTheme();
  const lang = useShopLanguage();
  const set = useMutation({
    mutationFn: (result: 'CONFIRMED' | 'NO_ANSWER' | 'REFUSED') => ordersApi.setConfirmation(o.id, result),
    onSuccess: (_r, result) => {
      onChanged();
      if (result === 'CONFIRMED') { haptic('success'); toast.success(t('Customer ne confirm kar diya ✓')); }
      else if (result === 'NO_ANSWER') toast.info(t('Jawab nahi — thori der baad dobara koshish karein'));
      else { toast.info(t('Customer ne mana kiya — order cancel kar dein')); onRefused(); }
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const closed = ['CANCELLED', 'REJECTED', 'RETURNED', 'DELIVERED'].includes(o.orderStatus);
  if (!o.isCod || o.paymentStatus === 'PAID' || closed || o.dispatchedAt) return null;
  const c = o.confirmation;
  if (c?.result === 'CONFIRMED') {
    return (
      <Card tone="success">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
          <CheckCircle2 size={20} color={th.colors.success.text} />
          <View style={{ flex: 1 }}>
            <Text size="sm" weight="bold">{t('Customer ne confirm kiya')}</Text>
            <Text size="xs" tone="muted">{formatDateTime(c.at)}{c.attempts > 1 ? t(' · {{attempts}} koshish', { attempts: c.attempts }) : ''}</Text>
          </View>
        </View>
      </Card>
    );
  }
  return (
    <Card tone={c?.result === 'REFUSED' ? 'danger' : 'warning'}
      title={c?.result === 'REFUSED' ? t('Customer ne mana kiya') : t('COD — bhejne se pehle customer se confirm karein')}
      description={c?.result === 'NO_ANSWER'
        ? t('{{attempts}} dafa jawab nahi mila · aakhri {{whenText}}', { attempts: c.attempts, whenText: formatDateTime(c.at) })
        : c?.result === 'REFUSED' ? t('Order cancel kar dein — stock wapas aa jayega')
          : t('Fake ya ghalat number wala order yahin pakra jata hai — courier ka expense bachta hai')}>
      <View style={{ gap: th.space(2) }}>
        <View style={{ flexDirection: 'row', gap: th.space(2) }}>
          {waNumber(o.customerPhone) && <Button size="sm" variant="success" icon={MessageCircle} style={{ flex: 1 }} onPress={() => openWhatsApp(o.customerPhone, confirmText(lang, msgOrder(o)))}>{t('Confirm karwayein')}</Button>}
          {o.customerPhone && <Button size="sm" variant="secondary" icon={Phone} onPress={() => callPhone(o.customerPhone)}>{t('Call')}</Button>}
        </View>
        {canManage && (
          <View style={{ flexDirection: 'row', gap: th.space(2) }}>
            <Button size="sm" variant="success" icon={CheckCircle2} style={{ flex: 1 }} loading={set.isPending && set.variables === 'CONFIRMED'} onPress={() => set.mutate('CONFIRMED')}>{t('Haan, confirm')}</Button>
          </View>
        )}
        {canManage && (
          <View style={{ flexDirection: 'row', gap: th.space(2) }}>
            <Button size="sm" variant="secondary" icon={PhoneMissed} style={{ flex: 1 }} loading={set.isPending && set.variables === 'NO_ANSWER'} onPress={() => set.mutate('NO_ANSWER')}>{t('Jawab nahi')}</Button>
            <Button size="sm" variant="secondary" icon={XCircle} style={{ flex: 1 }} loading={set.isPending && set.variables === 'REFUSED'} onPress={() => set.mutate('REFUSED')}>{t('Mana kiya')}</Button>
          </View>
        )}
      </View>
    </Card>
  );
}

/** Name, phone, address, record with the shop, risk advice and quick contact buttons. */
export function CustomerCard({ order: o, canManage, onChanged }: { order: OnlineOrderDetail; canManage: boolean; onChanged: () => void }) {
  const th = useTheme();
  const lang = useShopLanguage();
  const map = mapsUrl(o);
  const kind = o.orderStatus === 'PENDING' || o.orderStatus === 'CONFIRMED' ? 'confirmed' : o.orderStatus === 'OUT_FOR_DELIVERY' ? 'onTheWay' : 'other';
  return (
    <Card title={t('Customer')}>
      <View style={{ gap: th.space(1) }}>
        <Text size="lg" weight="bold">{o.customerName}</Text>
        {o.customerPhone && <Text size="sm" weight="semibold" tone="secondary" ltr>{o.customerPhone}</Text>}
        {o.customerEmail && <Text size="xs" tone="muted" ltr>{o.customerEmail}</Text>}
        {(o.customerAddress || o.customerCity) && (
          <View style={{ flexDirection: 'row', gap: th.space(1.5), marginTop: th.space(1) }}>
            <MapPin size={16} color={th.colors.textMuted} />
            <Text size="sm" style={{ flex: 1 }}>{[o.customerAddress, o.customerCity].filter(Boolean).join(', ')}</Text>
          </View>
        )}
      </View>
      <View style={{ marginTop: th.space(3), gap: th.space(3) }}>
        <RiskCard risk={o.risk} />
        <RiskAdvice order={o} canManage={canManage} onChanged={onChanged} />
        {o.notes ? (
          <View style={{ backgroundColor: th.colors.warning.soft, borderRadius: th.radius('md'), padding: th.space(2.5) }}>
            <Text size="sm" color={th.colors.warning.text}><Text size="sm" weight="bold" color={th.colors.warning.text}>{t('Note:')}</Text> {o.notes}</Text>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          {o.customerPhone && <Button size="sm" variant="secondary" icon={Phone} onPress={() => callPhone(o.customerPhone)}>{t('Call')}</Button>}
          {waNumber(o.customerPhone) && <Button size="sm" variant="secondary" icon={MessageCircle} onPress={() => openWhatsApp(o.customerPhone, statusText(lang, kind, msgOrder(o)))}>WhatsApp</Button>}
          {map && <Button size="sm" variant="secondary" icon={MapPin} onPress={() => openUrl(map)}>{t('Map')}</Button>}
          <Button size="sm" variant="secondary" icon={Copy} onPress={() => copyText([o.customerName, o.customerPhone, o.customerAddress, o.customerCity].filter(Boolean).join('\n'), t('Address copy ho gaya'))}>{t('Address copy')}</Button>
        </View>
      </View>
    </Card>
  );
}

/** The shop asks risky COD customers for an advance: WhatsApp ask, payment link, or block. */
function RiskAdvice({ order: o, canManage, onChanged }: { order: OnlineOrderDetail; canManage: boolean; onChanged: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const lang = useShopLanguage();
  const a = o.riskAdvice;
  const gws = useQuery({ queryKey: KEYS.payments, queryFn: paymentsApi.accounts, staleTime: 5 * 60_000, enabled: !!a });
  const gateway = (gws.data ?? []).find((g) => g.connected && g.active);
  const link = useMutation({
    mutationFn: () => paymentsApi.createLink(o.id, { provider: gateway!.code, amount: a!.amount }),
    onSuccess: (r) => {
      onChanged();
      toast.success(t('Advance ka link ban gaya'));
      void openWhatsApp(o.customerPhone, payLinkText(lang, msgOrder(o), r.amount, true, r.url));
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const block = useMutation({
    mutationFn: () => ordersApi.block({ phone: o.customerPhone ?? '', name: o.customerName, reason: (o.risk?.reasons ?? [o.risk?.reason]).filter(Boolean).join(' · ').slice(0, 200) }),
    onSuccess: () => { toast.success(t('Number block ho gaya')); onChanged(); qc.invalidateQueries({ queryKey: KEYS.blocklist }); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  if (!a) return null;
  return (
    <View style={{ borderWidth: 1, borderColor: th.colors.danger.border, borderRadius: th.radius('lg'), padding: th.space(3), gap: th.space(2) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
        <HandCoins size={18} color={th.colors.danger.text} />
        <Text size="sm" weight="bold" style={{ flex: 1 }}>{t('Pehle advance maangein: {{amount}}', { amount: formatMoney(a.amount) })} ({a.pct}%)</Text>
      </View>
      <Text size="xs" tone="secondary">{t('Aap ki setting: RTO khatre wale customer se bhejne se pehle advance. Paisa aaye to "Advance likhein" me likh dein — COD utna kam ho jayega.')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
        {waNumber(o.customerPhone) && <Button size="sm" variant="success" icon={MessageCircle} onPress={() => openWhatsApp(o.customerPhone, advanceAskText(lang, msgOrder(o), a.amount))}>{t('WhatsApp par maangein')}</Button>}
        {gateway && canManage && <Button size="sm" variant="secondary" icon={CreditCard} loading={link.isPending} onPress={() => link.mutate()}>{t('Payment link')}</Button>}
        {o.customerPhone && o.risk?.level !== 'BLOCKED' && canManage && <Button size="sm" variant="critical" icon={Ban} loading={block.isPending} onPress={() => block.mutate()}>{t('Number block')}</Button>}
      </View>
    </View>
  );
}

const FIELD_LABEL: Record<string, string> = { customerName: msg('Naam'), customerPhone: msg('Phone'), customerAddress: msg('Address'), customerCity: msg('Shehar'), notes: msg('Customer note') };

/** Staff tools the customer never sees: tags, inside notes, fix details, block the number, change history. */
export function ExtrasCard({ order: o, canManage, onChanged }: { order: OnlineOrderDetail; canManage: boolean; onChanged: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [note, setNote] = useState('');
  const [tagOpen, setTagOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const tags = o.metadata?.tags ?? [];
  const notes = o.metadata?.internalNotes ?? [];
  const edits = o.metadata?.edits ?? [];
  const blocked = o.risk?.level === 'BLOCKED';
  const closed = ['CANCELLED', 'REJECTED', 'RETURNED', 'DELIVERED'].includes(o.orderStatus);
  const canEdit = canManage && !closed && !o.dispatchedAt && !o.courierBooked;

  const addNote = useMutation({
    mutationFn: () => ordersApi.addNote(o.id, note.trim()),
    onSuccess: () => { setNote(''); onChanged(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const saveTags = useMutation({
    mutationFn: (next: string[]) => ordersApi.setTags(o.id, next),
    onSuccess: () => { setTagDraft(''); setTagOpen(false); onChanged(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const unblock = useMutation({
    mutationFn: () => ordersApi.unblock(o.customerPhone ?? ''),
    onSuccess: () => { toast.success(t('Number unblock ho gaya')); onChanged(); qc.invalidateQueries({ queryKey: KEYS.orders }); qc.invalidateQueries({ queryKey: KEYS.blocklist }); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const addTag = (raw: string) => {
    const v = raw.trim();
    if (!v || tags.includes(v)) return;
    saveTags.mutate([...tags, v].slice(0, 10));
  };

  return (
    <Card title={t('Staff ke liye')} description={t('· customer ko nahi dikhta')}
      action={canEdit ? <Button size="sm" variant="ghost" icon={Pencil} onPress={() => setEditOpen(true)}>{t('Details badlein')}</Button> : undefined}>
      <View style={{ gap: th.space(3) }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: th.space(1.5) }}>
          <Tag size={14} color={th.colors.textMuted} />
          {tags.map((tg) => (
            <PressableScale key={tg} disabled={!canManage} onPress={() => saveTags.mutate(tags.filter((x) => x !== tg))} accessibilityLabel={t('{{t}} hatao', { t: tg })}>
              <Badge tone="brand" icon={canManage ? X : undefined}>{tg}</Badge>
            </PressableScale>
          ))}
          {canManage && QUICK_TAGS.filter((x) => !tags.includes(x)).slice(0, 4).map((x) => <Chip key={x} label={`+ ${x}`} onPress={() => addTag(x)} />)}
          {canManage && <Chip label={t('Naya tag…')} icon={Plus} onPress={() => setTagOpen(true)} />}
        </View>

        {notes.map((n) => (
          <View key={n.id} style={{ backgroundColor: th.colors.warning.soft, borderRadius: th.radius('md'), padding: th.space(2.5), gap: 2 }}>
            <Text size="sm" color={th.colors.warning.text}>{n.text}</Text>
            <Text size="2xs" weight="semibold" color={th.colors.warning.text} style={{ opacity: 0.75 }}>{n.byName ?? t('Staff')} · {formatDateTime(n.at)}</Text>
          </View>
        ))}
        {canManage && (
          <View style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'flex-end' }}>
            <Input containerStyle={{ flex: 1 }} value={note} onChangeText={setNote} maxLength={500} placeholder={t('Andar ka note — jaise: customer ne 5 baje ke baad bola')} />
            <Button variant="secondary" icon={StickyNote} disabled={!note.trim()} loading={addNote.isPending} onPress={() => addNote.mutate()}>{t('Note')}</Button>
          </View>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          {canManage && o.customerPhone && (blocked
            ? <Button size="sm" variant="secondary" loading={unblock.isPending} onPress={() => unblock.mutate()}>{t('Unblock')}</Button>
            : <Button size="sm" variant="critical" icon={Ban} onPress={() => setBlockOpen(true)}>{t('Number block')}</Button>)}
          {edits.length > 0 && <Button size="sm" variant="ghost" onPress={() => setHistoryOpen(true)}>{t('Badli hui details ({{count}})', { count: edits.length })}</Button>}
        </View>
      </View>

      <Sheet open={tagOpen} onClose={() => setTagOpen(false)} title={t('Naya tag')}
        footer={<Button fullWidth size="lg" disabled={!tagDraft.trim()} loading={saveTags.isPending} onPress={() => addTag(tagDraft)}>{t('Save')}</Button>}>
        <Input autoFocus value={tagDraft} onChangeText={setTagDraft} maxLength={30} placeholder={t('Naya tag…')} />
      </Sheet>
      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title={t('Badli hui details ({{count}})', { count: edits.length })}>
        <View style={{ gap: th.space(2) }}>
          {[...edits].reverse().map((e, i) => (
            <Text key={i} size="sm">
              <Text size="sm" weight="semibold">{formatDateTime(e.at)}: </Text>
              {Object.entries(e.changes).map(([k, v]) => `${FIELD_LABEL[k] ? t(FIELD_LABEL[k]) : k} "${v.from ?? '—'}" → "${v.to ?? '—'}"`).join(', ')}
            </Text>
          ))}
        </View>
      </Sheet>
      <EditDetailsSheet open={editOpen} order={o} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); onChanged(); }} />
      <BlockSheet open={blockOpen} order={o} onClose={() => setBlockOpen(false)} onDone={() => {
        setBlockOpen(false); onChanged(); qc.invalidateQueries({ queryKey: KEYS.orders }); qc.invalidateQueries({ queryKey: KEYS.blocklist });
      }} />
    </Card>
  );
}

function EditDetailsSheet({ open, order: o, onClose, onSaved }: { open: boolean; order: OnlineOrderDetail; onClose: () => void; onSaved: () => void }) {
  const th = useTheme();
  const init = () => ({ customerName: o.customerName ?? '', customerPhone: o.customerPhone ?? '', customerAddress: o.customerAddress ?? '', customerCity: o.customerCity ?? '', notes: o.notes ?? '' });
  const [v, setV] = useState(init);
  useEffect(() => { if (open) setV(init()); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = useMutation({
    mutationFn: () => ordersApi.editOrder(o.id, v),
    onSuccess: (r) => { toast.success(r.changed ? t('Details badal gayin ✓') : t('Kuch nahi badla')); onSaved(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const set = (k: keyof ReturnType<typeof init>) => (x: string) => setV((s) => ({ ...s, [k]: x }));
  return (
    <Sheet open={open} onClose={onClose} title={t('Customer details badlein')} description={t('Courier booking se pehle. Website par nahi badalta — sirf Nafaa, label aur invoice me.')}
      footer={<Button fullWidth size="lg" loading={save.isPending} disabled={!v.customerName.trim()} onPress={() => save.mutate()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={v.customerName} onChangeText={set('customerName')} maxLength={100} />
        <Input label={t('Phone')} value={v.customerPhone} onChangeText={set('customerPhone')} maxLength={20} keyboardType="phone-pad" ltr placeholder={t('03xxxxxxxxx')} />
        <TextArea label={t('Address')} value={v.customerAddress} onChangeText={set('customerAddress')} maxLength={400} />
        <Input label={t('Shehar')} value={v.customerCity} onChangeText={set('customerCity')} maxLength={80} />
        <Input label={t('Customer ka note')} value={v.notes} onChangeText={set('notes')} maxLength={500} />
      </View>
    </Sheet>
  );
}

function BlockSheet({ open, order: o, onClose, onDone }: { open: boolean; order: OnlineOrderDetail; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);
  const block = useMutation({
    mutationFn: () => ordersApi.block({ phone: o.customerPhone ?? '', name: o.customerName, reason: reason.trim() || undefined }),
    onSuccess: () => { haptic('success'); toast.success(t('Number block — is se aane wale order khud accept nahi honge')); onDone(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  return (
    <Sheet open={open} onClose={onClose} title={t('{{customerPhone}} block karein?', { customerPhone: o.customerPhone })}
      description={t('Is number se naya order aaya to khud accept nahi hoga aur ⛔ nishan lagega. Ye order waise hi rahega — chahein to cancel kar dein.')}
      footer={<Button fullWidth size="lg" variant="danger" loading={block.isPending} onPress={() => block.mutate()}>{t('Block')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <ChipGroup wrap value={reason} onChange={setReason} options={BLOCK_REASONS.map((r) => ({ value: t(r), label: t(r) }))} />
        <Input value={reason} onChangeText={setReason} maxLength={200} placeholder={t('Wajah (optional)')} />
      </View>
    </Sheet>
  );
}

