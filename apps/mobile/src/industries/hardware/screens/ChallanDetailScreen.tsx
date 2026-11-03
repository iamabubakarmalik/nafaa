/** One delivery challan (web DeliveryDetailPage): the vehicle, the trip (loaded, left, reached) and what actually reached the site. A short delivery puts the rest back on the bill for the next challan. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ban, CheckCircle2, MapPin, MessageCircle, PackageCheck, Share2, Truck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Share, View } from 'react-native';
import { CHALLAN_NEXT, OPEN_CHALLAN, confirmProblem, qty } from '@nafaa/core/industries/hardware';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, DatePicker, DetailTemplate, IconButton, Input, ListRow, Row, Select, Sheet, StatusPill, Text, TextArea, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { Fact, ReasonSheet, callPhone, dateToKey, errText, keyToDate, openMap, openWhatsApp, todayKey, useDeskOnline } from '../../_shared/trade/desk';
import { deliveriesApi, type Delivery } from '../api';
import { KEYS, NEXT_LABEL, UNIT_LABEL, VEHICLES, challanStatus, refreshHardware, shortDate, vehicleLabel } from '../meta';

const refresh = () => refreshHardware([KEYS.delivery, KEYS.deliveries, KEYS.billLines, KEYS.deliverySummary]);

function challanText(d: Delivery) {
  return [`${t('Challan')} ${d.deliveryNumber}`, d.customerName, d.deliveryAddress, '', ...d.items.map((i) => `• ${i.itemName} — ${qty(i.orderedQty)} ${UNIT_LABEL(i.unit)}`)].join('\n');
}

type Dialog = 'vehicle' | 'confirm' | 'cancel' | null;

export function ChallanDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const canMove = usePermission()(P.POS_USE);
  const { guard } = useDeskOnline('hardwareDesk');
  const q = useQuery({ queryKey: [KEYS.delivery, id], queryFn: () => deliveriesApi.getOne(id!), enabled: !!id });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const d = q.data;
  const st = challanStatus(d?.status);
  const open = !!d && canMove && OPEN_CHALLAN.includes(d.status);
  const next = d ? CHALLAN_NEXT[d.status] : undefined;
  const short = d ? d.items.filter((i) => i.deliveredQty < i.orderedQty) : [];
  const close = () => setDialog(null);
  const run = (fn: () => Promise<unknown>, ok: string) => async () => { await fn(); refresh(); toast.success(ok); void q.refetch(); };

  return (
    <DetailTemplate title={d?.deliveryNumber ?? t('Challan')} subtitle={d ? `${d.customerName} · ${shortDate(d.createdAt)}` : undefined}
      loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={d ? <><IconButton icon={MapPin} label={t('Map')} onPress={() => openMap(d.deliveryAddress)} /><IconButton icon={Share2} label={t('Share')} onPress={() => void Share.share({ message: challanText(d) })} />{(d.driverPhone ?? d.customerPhone) ? <IconButton icon={MessageCircle} label={t('WhatsApp')} onPress={() => openWhatsApp(d.driverPhone ?? d.customerPhone, challanText(d))} /> : null}</> : undefined}
      bottomActions={d && open ? (
        <>
          <Button variant="secondary" icon={Truck} style={{ flex: 1 }} onPress={() => setDialog('vehicle')}>{t('Gaari')}</Button>
          {next && <Button variant="secondary" loading={busy} style={{ flex: 1 }} onPress={() => guard(() => { setBusy(true); void run(() => deliveriesApi.updateStatus(d.id, next as never), challanStatus(next).label)().catch((e) => toast.error(errText(e, t('Status nahi badla')))).finally(() => setBusy(false)); })}>{t(NEXT_LABEL[next] ?? next)}</Button>}
          <Button icon={PackageCheck} style={{ flex: 1 }} onPress={() => setDialog('confirm')}>{t('Pohanch gaya')}</Button>
        </>
      ) : undefined}>
      {d && (
        <View style={{ gap: th.space(3) }}>
          <Row gap={1.5} wrap><StatusPill tone={st.tone}>{st.label}</StatusPill>{d.project && <Badge>{d.project.name}</Badge>}{d.saleNumber && <Badge tone="info">{t('Bill {{saleNumber}}', { saleNumber: d.saleNumber })}</Badge>}</Row>
          {d.status === 'PARTIALLY_DELIVERED' && short.length > 0 && d.saleId && (
            <Card tone="warning">
              <Text size="sm">{t('{{value}} nahi pohancha — bill par baqi hai', { value: short.map((i) => `${i.itemName} (${qty(i.orderedQty - i.deliveredQty)})`).join(', ') })}</Text>
              <Button size="sm" variant="soft" onPress={() => router.push(`/hardware/deliveries/new?sale=${d.saleId}` as never)}>{t('Baqi ka challan')}</Button>
            </Card>
          )}
          {d.status === 'CANCELLED' && <Card><Text size="sm">{t('Cancel: {{value}}', { value: d.cancellationReason || '—' })}</Text></Card>}
          <Card flush title={t('Maal')}>
            {d.items.map((i, n) => (
              <ListRow key={i.id ?? n} dense divider={n < d.items.length - 1} title={i.itemName} subtitle={t('Challan: {{q}} {{u}}', { q: qty(i.orderedQty), u: UNIT_LABEL(i.unit) })}
                trailing={!OPEN_CHALLAN.includes(d.status) ? <View style={{ alignItems: 'flex-end' }}><Text size="sm" weight="bold" ltr>{qty(i.deliveredQty)}</Text>{i.damagedQty ? <Text size="2xs" tone="danger">{t('Toota {{n}}', { n: qty(i.damagedQty) })}</Text> : null}</View> : undefined} />
            ))}
          </Card>
          <Card title={t('Kahan')}>
            <View style={{ gap: th.space(2) }}>
              <Fact k={t('Pata')} v={d.deliveryAddress} /><Fact k={t('Phone')} v={d.customerPhone} /><Fact k={t('Site par rabta')} v={d.siteContactPhone} />
              {d.customerPhone ? <Button size="sm" variant="ghost" onPress={() => callPhone(d.customerPhone)}>{t('Call')}</Button> : null}
            </View>
          </Card>
          <Card title={t('Gaari')}>
            <View style={{ gap: th.space(2) }}>
              <Fact k={t('Gaari')} v={[vehicleLabel(d.vehicleType), d.vehicleNumber].filter(Boolean).join(' · ')} />
              <Fact k={t('Driver')} v={[d.driverName, d.driverPhone].filter(Boolean).join(' · ')} />
              <Fact k={t('Tareekh')} v={d.scheduledDate ? `${shortDate(d.scheduledDate)} ${d.scheduledTime ?? ''}`.trim() : undefined} />
              <Fact k={t('Wusool')} v={d.receivedByName} />
              <Fact k={t('Kiraya / mazdoori')} v={d.totalCharges ? formatMoney(d.totalCharges) : undefined} />
              <Fact k={t('Hidayat')} v={d.driverInstructions} />
              {d.issueReported ? <Text size="sm" tone="danger">{t('Masla: {{issueReported}}', { issueReported: d.issueReported })}</Text> : null}
              {d.status === 'DELIVERED' && d.deliveredAt ? <Text size="sm" tone="success">{t('{{deliveredAt}} ko pohancha', { deliveredAt: shortDate(d.deliveredAt) })}</Text> : null}
            </View>
          </Card>
          {open && <Button variant="ghost" icon={Ban} onPress={() => setDialog('cancel')}>{t('Cancel karein')}</Button>}
        </View>
      )}
      {d && (
        <>
          <VehicleSheet d={d} open={dialog === 'vehicle'} onClose={close} onSave={(v) => run(() => deliveriesApi.assignVehicle(d.id, v), t('Gaari save ho gayi'))()} />
          <ConfirmSheet d={d} open={dialog === 'confirm'} onClose={close} onSave={(v) => run(() => deliveriesApi.confirmDelivery(d.id, v), t('Delivery darj ho gayi'))()} />
          <ReasonSheet open={dialog === 'cancel'} onClose={close} title={t('Challan cancel')} confirm={t('Cancel karein')} presets={[t('Customer khud le gaya'), t('Bill wapas hua'), t('Customer ne mana kar diya')]}
            onConfirm={(reason) => run(() => deliveriesApi.cancel(d.id, reason), t('Challan cancel — maal bill par baqi'))()} />
        </>
      )}
    </DetailTemplate>
  );
}

function VehicleSheet({ d, open, onClose, onSave }: { d: Delivery; open: boolean; onClose: () => void; onSave: (v: { vehicleType: Delivery['vehicleType']; vehicleNumber: string; driverName: string; driverPhone: string; scheduledDate?: string; scheduledTime: string }) => Promise<unknown> }) {
  const th = useTheme();
  const [v, setV] = useState({ vehicleType: d.vehicleType, vehicleNumber: '', driverName: '', driverPhone: '', scheduledDate: '', scheduledTime: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setV({ vehicleType: d.vehicleType, vehicleNumber: d.vehicleNumber ?? '', driverName: d.driverName ?? '', driverPhone: d.driverPhone ?? '', scheduledDate: d.scheduledDate?.slice(0, 10) ?? '', scheduledTime: d.scheduledTime ?? '' }); }, [open, d]);
  const run = async () => { setBusy(true); try { await onSave({ ...v, scheduledDate: v.scheduledDate || undefined }); onClose(); } catch (e) { toast.error(errText(e, t('Save nahi hua'))); } finally { setBusy(false); } };
  return (
    <Sheet open={open} onClose={onClose} title={t('Gaari aur driver')} footer={<Button fullWidth size="lg" loading={busy} onPress={() => void run()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Select label={t('Gaari')} value={v.vehicleType} onChange={(vehicleType) => setV({ ...v, vehicleType: vehicleType as Delivery['vehicleType'] })} options={VEHICLES.map((x) => ({ value: x.value, label: t(x.label) }))} />
        <Input label={t('Gaari number')} value={v.vehicleNumber} onChangeText={(vehicleNumber) => setV({ ...v, vehicleNumber })} autoCapitalize="characters" ltr />
        <Input label={t('Driver')} value={v.driverName} onChangeText={(driverName) => setV({ ...v, driverName })} />
        <Input label={t('Driver phone')} value={v.driverPhone} onChangeText={(driverPhone) => setV({ ...v, driverPhone })} keyboardType="phone-pad" ltr />
        <DatePicker label={t('Tareekh')} value={keyToDate(v.scheduledDate)} minimumDate={new Date(`${todayKey()}T00:00:00`)} onChange={(x) => setV({ ...v, scheduledDate: dateToKey(x) })} />
        <Input label={t('Waqt')} value={v.scheduledTime} onChangeText={(scheduledTime) => setV({ ...v, scheduledTime })} placeholder="14:00" ltr />
      </View>
    </Sheet>
  );
}

/** Site hand-over: per item what reached and what broke; a short delivery leaves the rest on the bill. */
function ConfirmSheet({ d, open, onClose, onSave }: { d: Delivery; open: boolean; onClose: () => void; onSave: (v: { receivedByName?: string; issueReported?: string; deliveredItems: Array<{ itemId: string; deliveredQty: number; damagedQty: number }> }) => Promise<unknown> }) {
  const th = useTheme();
  const [rows, setRows] = useState<Record<string, { delivered: number | null; damaged: number | null }>>({});
  const [receiver, setReceiver] = useState('');
  const [issue, setIssue] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setRows(Object.fromEntries(d.items.map((i) => [i.id!, { delivered: i.orderedQty, damaged: 0 }]))); setReceiver(''); setIssue(''); } }, [open, d]);
  const prob = confirmProblem(d.items.map((i) => ({ itemId: i.id!, ordered: i.orderedQty, delivered: rows[i.id!]?.delivered ?? 0, damaged: rows[i.id!]?.damaged ?? 0 })));
  const name = prob?.itemId ? d.items.find((i) => i.id === prob.itemId)?.itemName : '';
  const run = async () => {
    setBusy(true);
    try { await onSave({ receivedByName: receiver.trim() || undefined, issueReported: issue.trim() || undefined, deliveredItems: d.items.map((i) => ({ itemId: i.id!, deliveredQty: rows[i.id!]?.delivered ?? 0, damagedQty: rows[i.id!]?.damaged ?? 0 })) }); onClose(); }
    catch (e) { toast.error(errText(e, t('Darj nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Site par kitna pohancha?')} description={t('Jitna utra wo likhein. Kam utra to baqi bill par agle challan ke liye rehta hai.')}
      footer={<Button fullWidth size="lg" icon={CheckCircle2} loading={busy} disabled={!!prob} onPress={() => void run()}>{t('Darj karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {d.items.map((i) => (
          <Card key={i.id} style={{ gap: th.space(2) }}>
            <Text weight="semibold">{i.itemName}</Text>
            <Text size="xs" tone="muted">{t('Challan: {{orderedQty}}', { orderedQty: qty(i.orderedQty) })}</Text>
            <Row gap={2}>
              <View style={{ flex: 1 }}><NumberInput label={t('Pohancha')} value={rows[i.id!]?.delivered ?? null} onChangeValue={(v) => setRows({ ...rows, [i.id!]: { ...rows[i.id!], delivered: v } })} /></View>
              <View style={{ flex: 1 }}><NumberInput label={t('Toota')} value={rows[i.id!]?.damaged ?? null} onChangeValue={(v) => setRows({ ...rows, [i.id!]: { ...rows[i.id!], damaged: v } })} /></View>
            </Row>
          </Card>
        ))}
        {prob?.kind === 'over' && <Text size="sm" tone="danger">{t('{{itemName}}: pohancha + toota challan se zyada hai', { itemName: name })}</Text>}
        {prob?.kind === 'nothing' && <Text size="sm" tone="danger">{t('Kuch nahi pohancha to challan cancel karein')}</Text>}
        <Input label={t('Kis ne liya')} value={receiver} onChangeText={setReceiver} placeholder={t('Munshi / customer')} />
        <TextArea label={t('Koi masla')} value={issue} onChangeText={setIssue} placeholder={t('Raasta band, maal kam')} />
      </View>
    </Sheet>
  );
}
