/**
 * Add, take off or count the stock of one product (or variant) in a branch,
 * saved as a stock adjustment with a fixed reason, like the web stock dialog.
 * Opening stock and goods made in the shop are not counted as profit; every
 * other reason shows its profit effect. Works offline (sent when online).
 */

import { Equal, Minus, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  CORRECTION_CHOICE, quickQuantities, resolveStockChange, STOCK_CHOICES, type StockChoice, type StockMode,
} from '@nafaa/core/inventory';
import { useAuthStore } from '@/core/auth/store';
import { haptic } from '@/core/device/haptics';
import { t } from '@/core/i18n';
import { enqueueStockAdjustment, OfflineRuleError } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, Chip, Icon, Input, Row, Segmented, Sheet, Text, toast, useTheme, Amount } from '@/design';
import { CORRECTION_WARNING, EFFECT_META, qty, useRefreshInventory } from '../lib/shared';
import { BranchSelect } from './Pickers';

export interface StockTarget {
  id: string;
  name: string;
  unit: string;
  stock: number;
  price: number;
  variantId?: string | null;
  variantName?: string | null;
}

export function StockSheet({ item, open, onClose, chips, onSaved }: {
  item: StockTarget | null;
  open: boolean;
  onClose: () => void;
  chips?: number[];
  onSaved?: (next: number) => void;
}) {
  const th = useTheme();
  const can = usePermission();
  const refresh = useRefreshInventory();
  const activeShop = useAuthStore((s) => s.currentShopId);
  const [shopId, setShopId] = useState<string | null>(activeShop);
  const [mode, setMode] = useState<StockMode>('add');
  const [text, setText] = useState('');
  const [choice, setChoice] = useState<StockChoice>(STOCK_CHOICES.add[0]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setMode('add'); setText(''); setChoice(STOCK_CHOICES.add[0]); setShopId(activeShop); }
  }, [open, item?.id, item?.variantId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) return null;
  const choices = [...STOCK_CHOICES[mode], ...(can(P.STOCK_ADJUSTMENTS_CORRECT) ? [CORRECTION_CHOICE] : [])];
  const change = resolveStockChange(item.stock, mode, text, choice);
  const quick = chips ?? quickQuantities(item.unit);
  const effect = EFFECT_META[change.effect];
  const toneOf = mode === 'add' ? th.colors.success : mode === 'remove' ? th.colors.danger : th.colors.brand;

  const save = async () => {
    if (change.problem || busy) return;
    if (!shopId) { toast.error(t('Pehle branch chunein')); return; }
    setBusy(true);
    try {
      await enqueueStockAdjustment({
        productId: item.id, variantId: item.variantId ?? undefined, shopId, type: change.type, quantity: Math.abs(change.delta),
        reason: change.reason, ...(change.code ? { reasonCode: change.code } : {}),
      });
      haptic('success');
      toast.success(t('{{name}}: stock ab {{next}} {{unit}}', { name: item.variantName ? `${item.name} · ${item.variantName}` : item.name, next: qty(change.next), unit: item.unit }));
      onSaved?.(change.next);
      void refresh();
      onClose();
    } catch (e) {
      toast.error(e instanceof OfflineRuleError ? e.message : t('Stock save nahi hua'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={item.variantName ? `${item.name} · ${item.variantName}` : item.name}
      description={t('Abhi stock: {{stock}} {{unit}}', { stock: qty(item.stock), unit: item.unit })}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={onClose}>{t('Rehne dein')}</Button>
        <Button style={{ flex: 1 }} loading={busy} disabled={!!change.problem} onPress={() => void save()}>{t('Save karein')}</Button>
      </Row>}>
      <View style={{ gap: th.space(4) }}>
        {!activeShop && <BranchSelect value={shopId} onChange={setShopId} />}
        <Segmented<StockMode> value={mode} onChange={(m) => { setMode(m); setChoice(STOCK_CHOICES[m][0]); }}
          options={[{ value: 'add', label: t('Daalein') }, { value: 'remove', label: t('Nikaalein') }, { value: 'set', label: t('Ginti') }]} />
        <Row gap={2} align="end">
          <View style={{ width: 52, height: 52, borderRadius: th.radius('lg'), backgroundColor: toneOf.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon={mode === 'add' ? Plus : mode === 'remove' ? Minus : Equal} color={toneOf.text} />
          </View>
          <Input containerStyle={{ flex: 1 }} label={`${mode === 'set' ? t('Shelf par asal ginti') : t('Kitna')} (${item.unit})`} value={text}
            onChangeText={(v) => setText(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="0" autoFocus size="lg" ltr
            returnKeyType="done" onSubmitEditing={() => void save()} />
        </Row>
        {mode !== 'set' && (
          <Row gap={1.5} wrap>
            {quick.map((c) => <Chip key={c} label={`+${c}`} onPress={() => setText(String(Number(text || 0) + c))} />)}
          </Row>
        )}
        <View style={{ gap: th.space(2) }}>
          <Row gap={1.5} wrap>
            {choices.map((r) => <Chip key={r.label} label={t(r.label)} selected={choice.label === r.label} onPress={() => setChoice(r)} />)}
          </Row>
          <Row gap={1.5} wrap>
            <Badge tone={effect.tone}>{t(effect.label)}</Badge>
            <Text size="xs" tone="muted">{change.effect === 'NONE' ? t('Sirf stock badlega') : t('{{note}} (cost par)', { note: t(effect.note) })}</Text>
          </Row>
          {change.code === 'CORRECTION' && <Card tone="warning"><Text size="xs">{t(CORRECTION_WARNING)}</Text></Card>}
          {change.problem === 'opening_only_adds' && <Text size="xs" tone="danger">{t('Opening stock sirf barhata hai — kam karne ke liye reason chunein.')}</Text>}
        </View>
        <Card tone={change.next < 0 ? 'danger' : 'muted'}>
          <Row justify="between" align="center">
            <View>
              <Text size="xs" tone="muted">{t('Naya stock')}</Text>
              <Text size="xl" weight="bold" ltr>{`${qty(change.next)} ${item.unit}`}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {change.delta !== 0 && <Text weight="semibold" tone={change.delta > 0 ? 'success' : 'danger'} ltr>{`${change.delta > 0 ? '+' : ''}${qty(change.delta)}`}</Text>}
              <Row gap={1}><Text size="xs" tone="muted">{t('Bechne ki qeemat')}</Text><Amount size="xs" tone="muted" value={Math.max(0, change.next) * item.price} /></Row>
            </View>
          </Row>
        </Card>
        {mode === 'add' && <Text size="xs" tone="muted">{t('Supplier se khareeda maal? Purchase me darj karein, taake Cost aur supplier ka hisaab bane.')}</Text>}
        {change.next < 0 && <Text size="xs" tone="danger">{t('Stock zero se neeche ja raha hai — ginti dobara dekh lein.')}</Text>}
      </View>
    </Sheet>
  );
}
