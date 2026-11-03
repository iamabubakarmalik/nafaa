/**
 * Alteration tickets (web AlterationsPage): due today, late and ready counts,
 * the record by view with search, swipe for the next step or money, and a
 * sheet to receive a new garment for alteration. Needs the server.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, Ruler, Wallet, AlertTriangle } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { alterationNext } from '@nafaa/core/industries/garments';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, ChipGroup, DatePicker, ListRow, MoneyInput, Row, Sheet, StatTile, StatusPill, SwipeRow, Text, TextArea, Input, toast, useTheme, type SwipeAction } from '@/design';
import { useDeskOnline } from '../../_shared/deskKit';
import { alterationsApi, type AlterationInput, type AlterationTicket, type AlterationView, type Priority } from '../api';
import { JobList } from '../components/JobList';
import { CustomerBox, TailorSelect, emptyCustomer, type CustomerValue } from '../components/kit';
import { useAlterationActions } from '../components/useJobActions';
import { ALTERATION_KEY, ALTERATION_TYPES, PRIORITIES, alterationStatus, dateISO, dueOf, opt, plusDays, refreshGarments, stepLabel, whenText } from '../meta';

const VIEWS: Array<{ value: AlterationView; label: string }> = [
  { value: 'active', label: msg('Chal rahe') }, { value: 'today', label: msg('Aaj dena hai') }, { value: 'late', label: msg('Late') },
  { value: 'ready', label: msg('Tayyar') }, { value: 'unpaid', label: msg('Paisa baqi') }, { value: 'done', label: msg('De diye / cancel') }, { value: 'all', label: msg('Sab') },
];

function NewAlterationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [garment, setGarment] = useState('');
  const [type, setType] = useState<string[]>([]);
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [due, setDue] = useState<Date | null>(plusDays(2));
  const [tailorId, setTailorId] = useState('');
  const [charges, setCharges] = useState<number | null>(null);
  const [advance, setAdvance] = useState<number | null>(null);
  const save = useMutation({
    mutationFn: () => {
      const body: AlterationInput = {
        customerId: customer.customerId || undefined, customerName: customer.name.trim() || undefined, customerPhone: opt(customer.phone),
        garmentDescription: garment.trim(), alterationType: type.map((x) => t(x)).join(', '), alterationDetails: opt(details), priority, promisedDate: dateISO(due),
        tailorId: tailorId || undefined, charges: charges ?? 0, ...((advance ?? 0) > 0 ? { advanceAmount: advance ?? 0, advanceMethod: 'CASH' } : {}),
      };
      return alterationsApi.create(body);
    },
    onSuccess: (o) => { toast.success(t('{{ticketNumber}} ban gaya', { ticketNumber: o.ticketNumber })); refreshGarments([ALTERATION_KEY], true); setGarment(''); setType([]); setDetails(''); setCharges(null); setAdvance(null); setCustomer(emptyCustomer); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Ticket save nahi hua'))),
  });
  const bad = (!customer.customerId && !customer.name.trim()) || !garment.trim() || !type.length;
  return (
    <Sheet open={open} onClose={onClose} title={t('Naya alteration')} height={0.92}
      footer={<Button fullWidth size="lg" loading={save.isPending} disabled={bad} onPress={() => save.mutate()}>{t('Ticket banayein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <CustomerBox value={customer} onChange={setCustomer} />
        <Input label={t('Kaun sa kapra')} value={garment} onChangeText={setGarment} placeholder={t('Jaise: Neela suit')} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Kya karna hai')}</Text>
        <ChipGroup multiple wrap value={type} onChange={setType} options={ALTERATION_TYPES.map((x) => ({ value: x, label: t(x) }))} />
        <TextArea label={t('Tafseel')} value={details} onChangeText={setDetails} />
        <ChipGroup wrap value={priority} onChange={setPriority} options={PRIORITIES.map((p) => ({ value: p.value, label: t(p.label) }))} />
        <DatePicker label={t('Kab dena hai')} value={due} onChange={setDue} />
        <TailorSelect value={tailorId} onChange={setTailorId} />
        <Row gap={2}>
          <MoneyInput containerStyle={{ flex: 1 }} label={t('Charges')} value={charges} onChangeValue={setCharges} />
          <MoneyInput containerStyle={{ flex: 1 }} label={t('Advance')} value={advance} onChangeValue={setAdvance} />
        </Row>
      </View>
    </Sheet>
  );
}

export function AlterationsScreen() {
  const can = usePermission();
  const act = useAlterationActions();
  const { guard } = useDeskOnline('garmentsDesk');
  const [adding, setAdding] = useState(false);
  const sum = useQuery({ queryKey: [ALTERATION_KEY, 'summary'], queryFn: () => alterationsApi.summary(), refetchInterval: 60_000 });
  const open = sum.data?.open;
  const manage = can(P.POS_USE);
  return (
    <>
      <JobList<AlterationTicket, AlterationView, Awaited<ReturnType<typeof alterationsApi.page>>>
        title={t('Alterations')} queryKey={ALTERATION_KEY} views={VIEWS.map((v) => ({ ...v, label: t(v.label) }))} defaultView="active"
        fetch={({ view, search, page }) => alterationsApi.page({ view, search, page, limit: 30 })}
        searchPlaceholder={t('Customer, phone ya ticket #')} emptyIcon={Ruler} emptyTitle={t('Koi alteration nahi')}
        onNew={manage ? () => guard(() => setAdding(true)) : undefined} newLabel={t('New')}
        line={(f) => (f.totals ? `${t('{{total}} tickets · {{sales}}', { total: f.total, sales: formatMoney(f.totals.value) })}${f.totals.due > 0 ? ` · ${t('Lena baqi {{due}}', { due: formatMoney(f.totals.due) })}` : ''}` : null)}
        tiles={(setView) => (
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Clock} tone="warning" label={t('Aaj dena hai')} loading={!open} value={String(open?.today ?? 0)} onPress={() => setView('today')} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={AlertTriangle} tone={open?.late ? 'danger' : 'neutral'} label={t('Late')} loading={!open} value={String(open?.late ?? 0)} onPress={() => setView('late')} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CheckCircle2} tone="success" label={t('Tayyar')} loading={!open} value={String(open?.ready ?? 0)} onPress={() => setView('ready')} />
          </Row>
        )}
        renderRow={(o) => {
          const st = alterationStatus(o.status);
          const next = alterationNext(o.status);
          const due = dueOf({ total: o.charges, paidAmount: o.paidAmount });
          const live = o.status !== 'DELIVERED' && o.status !== 'CANCELLED';
          const end: SwipeAction[] = manage && live ? [
            ...(next ? [{ icon: CheckCircle2, label: stepLabel(next.step, true), tone: 'success' as const, onPress: () => act.next(o) }] : []),
            ...(due > 0 ? [{ icon: Wallet, label: t('Payment'), tone: 'brand' as const, onPress: () => act.pay(o) }] : []),
          ] : [];
          return (
            <SwipeRow end={end}>
              <ListRow divider icon={Ruler} iconTone={st.tone} title={o.customerName || o.ticketNumber} overline={live ? whenText(o.promisedDate) : undefined}
                subtitle={`${o.ticketNumber} · ${o.garmentDescription} · ${o.alterationType}`}
                trailing={<Row gap={2} style={{ alignItems: 'flex-end' }}><StatusPill tone={st.tone}>{t(st.label)}</StatusPill>{due > 0 && live ? <Amount value={due} size="sm" tone="danger" /> : <Amount value={o.charges} size="sm" />}</Row>}
                onLongPress={manage && live ? () => act.cancel(o) : undefined} />
            </SwipeRow>
          );
        }}
      />
      <NewAlterationSheet open={adding} onClose={() => setAdding(false)} />
      {act.modals}
    </>
  );
}
