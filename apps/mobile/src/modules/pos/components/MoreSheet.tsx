/**
 * Counter extras: held bills, returns, the cash register, sales history,
 * the last bill (reprint, sell the same again), the bill note, and this
 * phone's counter choices (tile size, auto print, tips).
 */

import { router } from 'expo-router';
import { History, LayoutGrid, PauseCircle, Printer, Repeat2, RotateCcw, StickyNote, Store, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { posLineId } from '@nafaa/core/pos';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { printReceipt } from '@/core/receipt';
import { ListGroup, ListRow, Row, Segmented, Sheet, Switch, Text, toast, useAppearanceStore, useTheme, type PosGridSize } from '@/design';
import { useBill } from '../engine/bill';
import { usePosPrefs } from '../engine/prefs';
import { closeAllSheets, closeSheet, openSheet, usePosUi } from '../engine/usePos';
import { useLastReceipt } from './DoneSheet';
import { useHeldBills } from './HeldSheet';

export function MoreSheet() {
  const th = useTheme();
  const open = usePosUi((s) => s.sheet === 'more');
  const can = usePermission();
  const bill = useBill();
  const last = useLastReceipt();
  const held = useHeldBills(null);
  const prefs = usePosPrefs();
  const grid = th.appearance.mobile.posGrid;
  const setPersonal = useAppearanceStore((s) => s.setPersonal);
  const [, force] = useState(0);

  const go = (href: string) => { closeAllSheets(); router.push(href as never); };
  const repeatLast = () => {
    const lines = (last?.done.lines ?? []).filter((l) => !l.serialId && !l.imeiId && !l.usedPhoneId && !l.comboSerials?.length && !l.dist?.free);
    if (!lines.length) { toast.info(t('No bill yet in this session')); return; }
    bill.setLines((prev) => [...prev, ...lines.map((l) => ({ ...l, id: posLineId() }))]);
    toast.success(t('{{count}} items of bill {{number}} added', { count: lines.length, number: last!.number }));
    closeSheet();
  };

  return (
    <Sheet open={open} onClose={closeSheet} title={t('More')}>
      <View style={{ gap: th.space(4) }}>
        <ListGroup>
          <ListRow icon={PauseCircle} title={t('Held bills')} trailing={held.data?.length ? <Text weight="bold">{held.data.length}</Text> : undefined} chevron onPress={() => openSheet('held')} />
          {can(P.RETURNS_CREATE) && <ListRow icon={RotateCcw} title={t('Return items')} chevron onPress={() => go('/pos/return')} />}
          {can(P.CASH_REGISTER_VIEW) && <ListRow icon={Wallet} title={t('Cash register')} chevron onPress={() => go('/cash-register')} />}
          {can(P.SALES_VIEW) && <ListRow icon={History} title={t('Sales history')} chevron onPress={() => go('/sales')} />}
        </ListGroup>

        {last && (
          <ListGroup>
            <ListRow icon={Printer} title={t('Reprint last bill')} subtitle={last.number} onPress={() => { closeSheet(); printReceipt(last.doc, { lang: last.lang }).catch(() => toast.error(t('Could not print. Check the printer and try again.'))); }} />
            <ListRow icon={Repeat2} title={t('Sell the last bill again')} subtitle={t('{{count}} items', { count: last.done.lines.length })} onPress={repeatLast} />
          </ListGroup>
        )}

        <ListGroup>
          <ListRow icon={StickyNote} title={t('Bill note')} subtitle={bill.note || undefined} chevron onPress={() => openSheet('note')} />
        </ListGroup>

        <View style={{ gap: th.space(3) }}>
          <Text size="xs" weight="semibold" tone="muted" uppercase>{t('On this phone')}</Text>
          <Row gap={2}><LayoutGridIcon /><Text weight="medium" style={{ flex: 1 }}>{t('Product tiles')}</Text></Row>
          <Segmented<PosGridSize> value={grid} onChange={(v) => { setPersonal({ mobilePosGrid: v }); force((x) => x + 1); }}
            options={[{ value: 'list', label: t('List') }, { value: 'small', label: t('Small') }, { value: 'medium', label: t('Medium') }, { value: 'large', label: t('Large') }]} />
          <Switch value={prefs.autoPrint} onChange={(v) => prefs.set({ autoPrint: v })} label={t('Print after every sale')} description={t('Opens the print dialog when a bill is done.')} />
          {can(P.SETTINGS_VIEW) && <ListRow icon={Store} title={t('Counter rules')} chevron onPress={() => go('/settings/pos')} />}
        </View>
      </View>
    </Sheet>
  );
}

const LayoutGridIcon = () => <LayoutGrid size={18} />;
