/**
 * One transfer (web TransferDetail + ReceiveModal + slip): route, status
 * steps, every line with sent and received quantity, and the actions the
 * user's branch allows: receive (full or short; short is recorded as lost
 * on the way), cancel before receiving (stock goes back), print or share the
 * slip. Needs internet.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ban, PackageCheck, Printer, Share2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDateTime, formatPKR } from '@/core/format';
import { msg, t } from '@/core/i18n';
import {
  Badge, Button, Checkbox, Chip, DetailRow, DetailSection, DetailTemplate, IconButton, Input, PageHero, Row, Sheet, Text, TextArea, toast, useTheme,
} from '@/design';
import { NumberInput } from '../../components/fields';
import { INV, qty, useCostMask, useRefreshInventory } from '../../lib/shared';
import { transfersApi, type StockTransfer, type StockTransferItem } from '../api';
import { TRANSFER_STATUS, duration } from '../meta';
import { printTable, shareTable, type PrintTable } from '../components/parts';
import { useTransferRights } from './TransfersScreen';

const isUnitLine = (i: StockTransferItem) => !!(i.imeiId || i.serialId || i.usedPhoneId || i.carpetRollId);
const lineName = (i: StockTransferItem) => (i.usedPhone ? `${i.usedPhone.brand} ${i.usedPhone.model}${i.usedPhone.storage ? ` ${i.usedPhone.storage}` : ''}` : i.product?.name ?? t('Cheez'));
const lineRef = (i: StockTransferItem) => i.imei ? `IMEI ${i.imei.imei1}` : i.serial ? `Serial ${i.serial.serialNumber}` : i.usedPhone ? `Used ${i.usedPhone.usedPhoneCode}` : i.carpetRoll ? `Roll ${i.carpetRoll.rollNumber}` : '';
const lineUnit = (i: StockTransferItem) => (i.usedPhone ? 'pcs' : i.product?.unit ?? 'pcs');

function slip(x: StockTransfer): PrintTable {
  return {
    title: `${t('Transfer')} ${x.transferNumber}`,
    subtitle: `${x.fromShop.name} → ${x.toShop.name} · ${formatDateTime(x.transferredAt ?? x.createdAt)}${x.notes ? ` · ${x.notes}` : ''}`,
    columns: [t('Cheez'), t('Bheja'), t('Aaya'), t('Qeemat')],
    rows: x.items.map((i) => [`${lineName(i)}${lineRef(i) ? ` (${lineRef(i)})` : ''}`, `${qty(i.quantity)} ${lineUnit(i)}`, x.status === 'RECEIVED' ? `${qty(i.receivedQty)} ${lineUnit(i)}` : '—', formatPKR(i.quantity * i.unitCost)]),
    footer: `${t('Kul qeemat (cost par)')}: ${formatPKR(x.value)}`,
  };
}

export function TransferDetailScreen() {
  const th = useTheme();
  const { id, receive } = useLocalSearchParams<{ id: string; receive?: string }>();
  const { cost } = useCostMask();
  const rights = useTransferRights();
  const q = useQuery({ queryKey: [INV, 'transfers', 'one', id], queryFn: () => transfersApi.getOne(id) });
  const [receiving, setReceiving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const x = q.data;
  useEffect(() => { if (receive && x && rights.canReceive(x)) setReceiving(true); }, [receive, x?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const short = x?.status === 'RECEIVED' ? x.items.reduce((s, i) => s + Math.max(0, i.quantity - (i.receivedQty ?? 0)) * (i.unitCost ?? 0), 0) : 0;

  return (
    <DetailTemplate
      title={x?.transferNumber ?? t('Transfer')}
      subtitle={x ? formatDateTime(x.createdAt) : undefined}
      loading={q.isLoading}
      error={q.error}
      onRetry={q.refetch}
      onRefresh={q.refetch}
      refreshing={q.isRefetching}
      actions={x ? <Row gap={1}>
        <IconButton icon={Share2} label={t('Share')} onPress={() => void shareTable(slip(x))} />
        <IconButton icon={Printer} label={t('Print slip')} onPress={() => void printTable(slip(x))} />
      </Row> : undefined}
      summary={x ? (
        <PageHero title={`${x.fromShop.name} → ${x.toShop.name}`} chip={t(TRANSFER_STATUS[x.status].label)}
          stats={[{ label: t('Maal ki qeemat'), value: cost(x.value) }, { label: t('Cheezein'), value: String(x.items.length) }, ...(short > 0 ? [{ label: t('Kam aaya'), value: cost(short) }] : [])]} />
      ) : undefined}
      bottomActions={x && (rights.canCancel(x) || rights.canReceive(x)) ? <>
        {rights.canCancel(x) && <Button variant="secondary" icon={Ban} style={{ flex: 1 }} onPress={() => setCancelling(true)}>{t('Cancel')}</Button>}
        {rights.canReceive(x) && <Button icon={PackageCheck} style={{ flex: 1 }} onPress={() => setReceiving(true)}>{t('Receive karein')}</Button>}
      </> : undefined}
    >
      {x && <>
        <DetailSection title={t('Halat')}>
          <DetailRow label={t('Bheja')} value={`${formatDateTime(x.transferredAt ?? x.createdAt)}${x.createdBy ? ` · ${x.createdBy.fullName}` : ''}`} />
          {x.status === 'IN_TRANSIT' && <DetailRow label={t('Raste me')} value={duration(x.transferredAt ?? x.createdAt)} />}
          {x.receivedAt && <DetailRow label={t('Receive')} value={`${formatDateTime(x.receivedAt)}${x.receivedBy ? ` · ${x.receivedBy.fullName}` : ''} (${duration(x.transferredAt ?? x.createdAt, x.receivedAt)})`} />}
          {x.cancelledAt && <DetailRow label={t('Cancel')} value={`${formatDateTime(x.cancelledAt)}${x.cancelReason ? ` · ${x.cancelReason}` : ''}`} />}
          <DetailRow label={t('Halat')} value={<Badge tone={TRANSFER_STATUS[x.status].tone}>{t(TRANSFER_STATUS[x.status].label)}</Badge>} last={!x.notes} />
          {x.notes ? <DetailRow label={t('Note')} value={x.notes} last /> : null}
        </DetailSection>
        <DetailSection title={t('Cheezein')}>
          {x.items.map((i, n) => {
            const missing = x.status === 'RECEIVED' ? i.quantity - (i.receivedQty ?? 0) : 0;
            return (
              <DetailRow key={i.id} last={n === x.items.length - 1}
                label={`${lineName(i)}${lineRef(i) ? ` · ${lineRef(i)}` : ''}`}
                value={<View style={{ alignItems: 'flex-end' }}>
                  <Text size="sm" weight="semibold" ltr>{`${qty(i.quantity)} ${lineUnit(i)}`}</Text>
                  {missing > 0 && <Text size="xs" tone="danger">{t('Kam: {{qty}} {{lineUnit}} · {{value}}', { qty: qty(missing), lineUnit: lineUnit(i), value: cost(missing * i.unitCost) })}</Text>}
                  <Text size="xs" tone="muted" ltr>{cost(i.quantity * i.unitCost)}</Text>
                </View>} />
            );
          })}
        </DetailSection>
      </>}
      {x && <ReceiveSheet open={receiving} x={x} onClose={() => setReceiving(false)} cost={cost} />}
      {x && <CancelSheet open={cancelling} x={x} onClose={() => setCancelling(false)} />}
    </DetailTemplate>
  );
}

function useAfterChange(id: string) {
  const qc = useQueryClient();
  const refresh = useRefreshInventory();
  return async () => {
    await qc.invalidateQueries({ queryKey: [INV, 'transfers'] });
    void refresh();
    void id;
  };
}

function ReceiveSheet({ open, x, onClose, cost }: { open: boolean; x: StockTransfer; onClose: () => void; cost: (n: number) => string }) {
  const th = useTheme();
  const after = useAfterChange(x.id);
  const [got, setGot] = useState<Record<string, number | null>>({});
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const recv = (i: StockTransferItem) => (got[i.id] === undefined ? i.quantity : got[i.id] ?? 0);
  const short = x.items.reduce((s, i) => s + Math.max(0, i.quantity - recv(i)) * i.unitCost, 0);
  const run = async () => {
    setBusy(true);
    try {
      const items = x.items.filter((i) => recv(i) !== i.quantity).map((i) => ({ itemId: i.id, receivedQty: recv(i) }));
      await transfersApi.receive(x.id, { notes: notes.trim() || undefined, items: items.length ? items : undefined });
      toast.success(short > 0 ? t('Receive ho gaya — {{short}} ka maal kam aaya, darj kar liya', { short: cost(short) }) : t('Receive ho gaya — maal {{name}} ke stock me', { name: x.toShop.name }));
      await after();
      onClose();
    } catch (e) {
      toast.error(apiErrorMessage(e, t('Receive nahi hua')));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Maal receive karein · {{transferNumber}}', { transferNumber: x.transferNumber })}
      description={t('Har cheez poori maani jati hai — kam aayi ho to wohi ginti likhein.')}
      footer={<Button fullWidth loading={busy} icon={PackageCheck} onPress={() => void run()}>{t('Jitna aaya, receive karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {x.items.map((i) => (
          <View key={i.id} style={{ gap: 4 }}>
            <Text size="sm" weight="semibold">{lineName(i)}{lineRef(i) ? ` · ${lineRef(i)}` : ''}</Text>
            {isUnitLine(i) ? (
              <Checkbox value={recv(i) > 0} onChange={(v) => setGot((g) => ({ ...g, [i.id]: v ? i.quantity : 0 }))} label={t('Aaya')} description={t('Ek unit — poora jata hai')} />
            ) : (
              <Row gap={2} align="end">
                <NumberInput containerStyle={{ flex: 1 }} label={t('Aaya')} value={recv(i)} onChangeValue={(v) => setGot((g) => ({ ...g, [i.id]: v }))}
                  hint={t('Bheja')} trailing={<Text tone="muted">{`/ ${qty(i.quantity)} ${lineUnit(i)}`}</Text>} />
              </Row>
            )}
          </View>
        ))}
        <Row gap={1.5} wrap><Chip label={t('Raste me gum / toota')} onPress={() => setNotes(t('Raste me gum / toota'))} /></Row>
        <TextArea label={t('Note')} value={notes} onChangeText={setNotes} placeholder={t('Misaal: 2 dabbe toote hue aaye')} />
        <Text size="sm" weight="semibold" tone={short > 0 ? 'danger' : 'success'}>{short > 0 ? t('Kam aaya {{short}}', { short: cost(short) }) : t('Koi kami nahi')}</Text>
        {short > 0 && <Text size="xs" tone="muted">{t('Jo kam aaya woh kisi stock me nahi judta — raste ka nuqsan darj hota hai, list me laal nishan aata hai aur owner ko notification jati hai.')}</Text>}
      </View>
    </Sheet>
  );
}

const CANCEL_REASONS = [msg('Ghalat branch chuni'), msg('Ghalat maal chuna'), msg('Gaari nahi gayi')];

function CancelSheet({ open, x, onClose }: { open: boolean; x: StockTransfer; onClose: () => void }) {
  const th = useTheme();
  const after = useAfterChange(x.id);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await transfersApi.cancel(x.id, reason);
      toast.success(t('Transfer cancel — maal {{name}} ke stock me wapas', { name: x.fromShop.name }));
      await after();
      onClose();
      router.back();
    } catch (e) {
      toast.error(apiErrorMessage(e, t('Cancel nahi hua')));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Transfer cancel karein?')}
      description={t('Saara maal {{name}} ke stock me wapas aa jayega. Receive ho chuka transfer cancel nahi hota.', { name: x.fromShop.name })}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={onClose}>{t('Rehne dein')}</Button>
        <Button variant="danger" style={{ flex: 1 }} loading={busy} disabled={!reason.trim()} onPress={() => void run()}>{t('Cancel karein')}</Button>
      </Row>}>
      <View style={{ gap: th.space(3) }}>
        <Row gap={1.5} wrap>{CANCEL_REASONS.map((c) => <Chip key={c} label={t(c)} selected={reason === t(c)} onPress={() => setReason(t(c))} />)}</Row>
        <Input label={t('Wajah')} value={reason} onChangeText={setReason} />
      </View>
    </Sheet>
  );
}
